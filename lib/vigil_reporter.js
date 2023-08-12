/*
 * node-vigil-reporter
 *
 * Copyright 2018, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


"use strict";


var url  = require("url");
var os   = require("os");
var v8   = require("v8");


/**
 * VigilReporter
 * @class
 * @classdesc  Instanciates a new Vigil Reporter connector.
 * @param      {object} options
 */
var VigilReporter = function(options) {
  var self = this;

  // Sanitize options
  if (typeof options !== "object") {
    throw new Error("Invalid or missing options");
  }

  ["url", "token", "probe_id", "node_id", "replica_id"].forEach(function(type) {
    if (typeof options[type] !== "string") {
      throw new Error("Invalid or missing options." + type);
    }
  });

  // Apply defaults
  if (typeof options.interval !== "number" || !options.interval) {
    options.interval = 30;
  }

  // Storage space
  this.__options            = {
    url                   : options.url,
    token                 : options.token,

    probe_id              : options.probe_id,
    node_id               : options.node_id,
    replica_id            : options.replica_id,

    interval_seconds      : options.interval,
    interval_milliseconds : (options.interval * 1000),

    console               : (options.console || null)
  };

  this.__http_library       = (
    this.__options.url.startsWith("https") ? require("https") : require("http")
  );

  this.__http_url           = url.parse(this.__options.url);

  this.__http_url_path      = (
    this.__http_url.pathname.endsWith("/") ?
      this.__http_url.pathname.slice(0, -1) : this.__http_url.pathname
  );

  this.__http_request_poll  = {
    host    : this.__http_url.hostname,
    port    : this.__http_url.port,

    path    : (
      this.__http_url_path + "/reporter/" +
        encodeURIComponent(this.__options.probe_id) + "/" +
        encodeURIComponent(this.__options.node_id) + "/"
    ),

    method  : "POST",
    auth    : (":" + this.__options.token),
    timeout : 10000,

    headers : {
      "Content-Type" : "application/json; charset=utf-8"
    }
  };

  this.__http_request_flush = {
    host    : this.__http_url.hostname,
    port    : this.__http_url.port,

    path    : (
      this.__http_url_path + "/reporter/" +
        encodeURIComponent(this.__options.probe_id) + "/" +
        encodeURIComponent(this.__options.node_id) + "/" +
        encodeURIComponent(this.__options.replica_id) + "/"
    ),

    method  : "DELETE",
    auth    : (":" + this.__options.token),
    timeout : 5000
  };

  this.__next_poll_timeout  = null;

  // Start polling (after a 10s delay)
  this.__next_poll_timeout = setTimeout(function() {
    self.__next_poll_timeout = null;

    self.__scheduleTriggerPoll();
  }, 10000);
};


/**
 * VigilReporter.prototype.end
 * @public
 * @param  {object}  options
 * @return {boolean} Whether was ended or not
 */
VigilReporter.prototype.end = function(options) {
  // Sanitize options (to default)
  if (typeof options !== "object") {
    options = {};
  }

  // Stop polling (if needed)
  var _was_ended = false;

  if (this.__next_poll_timeout !== null) {
    clearTimeout(this.__next_poll_timeout);

    this.__next_poll_timeout = null;

    // Mark as ended
    _was_ended = true;

    // Perform a flush of the replica before tearing down?
    // Notice: this is an asynchronous process
    if (options.flush === true) {
      this.__dispatchFlushRequest(function(request_failed) {
        // Call the asynchronous 'done' callback? (if any; provide flush result)
        if (typeof options.done === "function") {
          options.done(
            (request_failed === true) ? new Error("Flush failed") : null
          );
        }
      });
    } else {
      // Call the asynchronous 'done' callback? (if any)
      if (typeof options.done === "function") {
        options.done(null);
      }
    }
  }

  // Return ended status immediately
  return _was_ended;
};


/**
 * VigilReporter.prototype.__scheduleTriggerPoll
 * @private
 * @return {undefined}
 */
VigilReporter.prototype.__scheduleTriggerPoll = function() {
  this.__log(
    "log", "Scheduled poll request trigger"
  );

  // Trigger this poll
  this.__dispatchPollRequest(this.__deferNextTriggerPoll.bind(this));
};


/**
 * VigilReporter.prototype.__deferNextTriggerPoll
 * @private
 * @param  {boolean} request_failed
 * @return {undefined}
 */
VigilReporter.prototype.__deferNextTriggerPoll = function(request_failed) {
  var self = this;

  if (this.__next_poll_timeout === null) {
    if (request_failed === true) {
      this.__log(
        "warn",
        ("Last request failed, scheduled next request sooner in " +
            (this.__options.interval_seconds / 2) + " secs")
      );
    } else {
      this.__log(
        "log",
        ("Scheduled next request in " + this.__options.interval_seconds +
            " secs")
      );
    }

    var poll_defer = (
      (request_failed === true) ? (this.__options.interval_milliseconds / 2) :
        this.__options.interval_milliseconds
    );

    this.__next_poll_timeout = setTimeout(function() {
      self.__log(
        "log",
        ("Executing next request now (after wait of " + poll_defer + " ms)")
      );

      self.__next_poll_timeout = null;

      self.__scheduleTriggerPoll();
    }, poll_defer);
  }
};


/**
 * VigilReporter.prototype.__dispatchPollRequest
 * @private
 * @param  {function} fn_next
 * @return {undefined}
 */
VigilReporter.prototype.__dispatchPollRequest = function(fn_next) {
  // Acquire heap statistics
  var heap = v8.getHeapStatistics();

  // Build request data
  var request_data_raw = {
    replica  : this.__options.replica_id,
    interval : this.__options.interval_seconds,

    load     : {
      cpu : ((os.loadavg()[0] || 0) / parseFloat(os.cpus().length || 1)),
      ram : ((heap.total_heap_size || 0.0) / (heap.heap_size_limit || 1.0))
    }
  };

  var request_data = JSON.stringify(request_data_raw);

  this.__log(
    "log", "Built request raw data", request_data_raw
  );

  // Build request parameters
  var request_params = Object.assign(
    {}, this.__http_request_poll
  );

  request_params.headers["Content-Length"] = Buffer.byteLength(request_data);

  // Submit request
  this.__dispatchGenericRequest(
    request_params, request_data, request_data_raw, fn_next
  );
};


/**
 * VigilReporter.prototype.__dispatchFlushRequest
 * @private
 * @param  {function} fn_next
 * @return {undefined}
 */
VigilReporter.prototype.__dispatchFlushRequest = function(fn_next) {
  // Submit request
  this.__dispatchGenericRequest(
    this.__http_request_flush, null, null, fn_next
  );
};


/**
 * VigilReporter.prototype.__dispatchGenericRequest
 * @private
 * @param  {object}   request_params
 * @param  {object}   request_data
 * @param  {object}   request_data_raw
 * @param  {function} fn_next
 * @return {undefined}
 */
VigilReporter.prototype.__dispatchGenericRequest = function(
  request_params, request_data, request_data_raw, fn_next
) {
  var self = this;

  this.__log(
    "log", "Will dispatch request", request_params
  );

  // Submit target request
  var request = this.__http_library.request(request_params, function(response) {
    response.setEncoding("utf8");

    if (response.statusCode !== 200) {
      self.__log(
        "error", "Failed dispatching request"
      );

      fn_next(true);
    } else {
      self.__log(
        "info", "Request succeeded", request_data_raw
      );

      fn_next(false);
    }
  });

  request.on("timeout", function() {
    self.__log(
      "warn", "Request timed out"
    );

    request.abort();
  });

  request.on("abort", function() {
    self.__log(
      "error", "Request aborted"
    );

    fn_next(true);
  });

  request.on("error", function(error) {
    self.__log(
      "error", "Request error", error
    );

    fn_next(true);
  });

  request.on("close", function() {
    self.__log(
      "log", "Request closed"
    );

    fn_next(false);
  });

  // Append request data? (if any)
  if (request_data !== null) {
    request.write(request_data);
  }

  request.end();
};


/**
 * VigilReporter.prototype.__log
 * @private
 * @param  {string} level
 * @param  {string} message
 * @param  {object} data
 * @return {undefined}
 */
VigilReporter.prototype.__log = function(level, message, data) {
  if (this.__options.console !== null && this.__options.console[level]) {
    var log_message = ("Vigil Reporter: " + message);

    if (data !== undefined) {
      this.__options.console[level](log_message, data);
    } else {
      this.__options.console[level](log_message);
    }
  }
};


exports.VigilReporter = VigilReporter;
