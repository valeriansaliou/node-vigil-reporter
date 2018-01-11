/*
 * node-vigil-reporter
 *
 * Copyright 2018, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


"use strict";


/**
 * VigilReporter
 * @class
 * @classdesc  Instanciates a new Vigil Reporter connector.
 * @param      {object} options
 */
var VigilReporter = function(options) {
  // Sanitize options
  if (typeof options !== "object") {
    throw new Error("Invalid or missing options");
  }
};


exports.VigilReporter = VigilReporter;
