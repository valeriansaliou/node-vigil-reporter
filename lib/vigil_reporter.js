/*
 * node-vigil-reporter
 *
 * Copyright 2018, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


"use strict";


var url                 = require("url");
var os                  = require("os");

var system_information  = require("systeminformation");


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
  this.__options           = {
    url                   : options.url,
    token                 : options.token,

    probe_id              : options.probe_id,
    node_id               : options.node_id,
    replica_id            : options.replica_id,

    interval_seconds      : options.interval,
    interval_milliseconds : (options.interval * 1000),

    console               : (options.console || null),

    tuning                : {
      use_active_memory : (
        (options.tuning || {}).use_active_memory || false
      )
    }
  };

  this.__http_library      = (
    this.__options.url.startsWith("https") ? require("https") : require("http")
  );

  this.__http_url          = url.parse(this.__options.url);

  this.__http_request      = {
    host    : this.__http_url.hostname,
    port    : this.__http_url.port,

    path    : (
      "/reporter/" + encodeURIComponent(this.__options.probe_id) + "/" +
        encodeURIComponent(this.__options.node_id) + "/"
    ),

    method  : "POST",
    auth    : (":" + this.__options.token),
    timeout : 10000,

    headers : {
      "Content-Type" : "application/json; charset=utf-8"
    }
  };

  this.__next_poll_timeout = null;

  // Start polling (after a 10s delay)
  this.__next_poll_timeout = setTimeout(function() {
    self.__next_poll_timeout = null;

    self.__scheduleTriggerPoll();
  }, 10000);
};


/**
 * VigilReporter.prototype.end
 * @public
 * @param  {function} done
 * @return {boolean}  Whether was ended or not
 */
VigilReporter.prototype.end = function(done) {
  // Stop polling?
  if (this.__next_poll_timeout !== null) {
    clearTimeout(this.__next_poll_timeout);

    this.__next_poll_timeout = null;

    return true;
  }

  return false;
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
 * @param  {boolean} retry_failed
 * @return {undefined}
 */
VigilReporter.prototype.__deferNextTriggerPoll = function(retry_failed) {
  var self = this;

  if (this.__next_poll_timeout === null) {
    if (retry_failed === true) {
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
      (retry_failed === true) ? (this.__options.interval_milliseconds / 2) :
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
  var self = this;

  this.__log(
    "log", "Will dispatch request"
  );

  // Acquire system memory information
  system_information.mem()
    .then(function(memory) {
      self.__dispatchPollRequestData(
        {
          ram : (memory || {})
        },

        fn_next
      );
    })
    .catch(function(error) {
      self.__log(
        "warn", "Could not acquire memory information", error
      );

      self.__dispatchPollRequestData(
        {
          ram : {}
        },

        fn_next
      );
    });
};


/**
 * VigilReporter.prototype.__dispatchPollRequestData
 * @private
 * @param  {object}   data
 * @param  {function} fn_next
 * @return {undefined}
 */
VigilReporter.prototype.__dispatchPollRequestData = function(data, fn_next) {
  var self = this;

  // Acquire used RAM
  var ram = data.ram.used;

  if (this.__options.tuning.use_active_memory === true) {
    ram = data.ram.active;
  }

  // Build request data
  var request_data_raw = {
    replica  : this.__options.replica_id,
    interval : this.__options.interval_seconds,

    load     : {
      cpu : ((os.loadavg()[0] || 0) / parseFloat(os.cpus().length || 1)),
      ram : ((ram || 0.0) / (data.ram.total || 1.0))
    }
  };

  var request_data = JSON.stringify(request_data_raw);

  this.__log(
    "log", "Built request raw data", request_data_raw
  );

  // Build request parameters
  var request_params = Object.assign(
    {}, this.__http_request
  );

  request_params.headers["Content-Length"] = Buffer.byteLength(request_data);

  // Submit reporter request
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

  request.write(request_data);
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
