/*
 * node-vigil-reporter
 *
 * Copyright 2018, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


"use strict";


var console        = require("console");

var VigilReporter  = require("../").VigilReporter;


// 1. Create Vigil Reporter
console.info("Creating Vigil Reporter...");

var vigilReporter = new VigilReporter({
  url        : "http://[::1]:8080",
  token      : "REPLACE_THIS_WITH_A_SECRET_KEY",
  probe_id   : "relay",
  node_id    : "socket-client",
  replica_id : "192.168.1.10",
  interval   : 30,
  console    : console
});

console.info("Created Vigil Reporter");


// 2. Schedule Vigil Reporter end
setTimeout(function() {
  console.info("Ending Vigil Reporter...");

  if (vigilReporter.end() === true) {
    console.info("Ended Vigil Reporter");
  } else {
    console.warn("Could not end Vigil Reporter");
  }
}, 80000);
