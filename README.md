# node-vigil-reporter

[![Build Status](https://img.shields.io/travis/valeriansaliou/node-vigil-reporter/master.svg)](https://travis-ci.org/valeriansaliou/node-vigil-reporter) [![Test Coverage](https://img.shields.io/coveralls/valeriansaliou/node-vigil-reporter/master.svg)](https://coveralls.io/github/valeriansaliou/node-vigil-reporter?branch=master) [![NPM](https://img.shields.io/npm/v/vigil-reporter.svg)](https://www.npmjs.com/package/vigil-reporter) [![Downloads](https://img.shields.io/npm/dt/vigil-reporter.svg)](https://www.npmjs.com/package/vigil-reporter)

**Vigil Reporter for Node. Used in pair with Vigil, the Microservices Status Page.**

Vigil Reporter is used to actively submit health information to Vigil from your apps. Apps are best monitored via application probes, which are able to report detailed system information such as CPU and RAM load. This lets Vigil show if an application host system is under high load.

## Who uses it?

<table>
<tr>
<td align="center"><a href="https://crisp.chat/"><img src="https://valeriansaliou.github.io/node-vigil-reporter/images/crisp.png" height="64" /></a></td>
<td align="center"><a href="https://enrichdata.com/"><img src="https://valeriansaliou.github.io/node-vigil-reporter/images/enrich.png" height="64" /></a></td>
</tr>
<tr>
<td align="center">Crisp</td>
<td align="center">Enrich</td>
</tr>
</table>

_👋 You use vigil-reporter and you want to be listed there? [Contact me](https://valeriansaliou.name/)._

## How to install?

Include `vigil-reporter` in your `package.json` dependencies.

Alternatively, you can run `npm install vigil-reporter --save`.

## How to use?

### 1. Create reporter

`vigil-reporter` can be instantiated as such:

```javascript
var VigilReporter = require("vigil-reporter").VigilReporter;

var vigilReporter = new VigilReporter({
  url        : "https://status.example.com",  // `page_url` from Vigil `config.cfg`
  token      : "YOUR_TOKEN_SECRET",           // `reporter_token` from Vigil `config.cfg`
  probe_id   : "relay",                       // Probe ID containing the parent Node for Replica
  node_id    : "socket-client",               // Node ID containing Replica
  replica_id : "192.168.1.10",                // Unique Replica ID for instance (ie. your IP on the LAN)
  interval   : 30,                            // Reporting interval (in seconds; defaults to 30 seconds if not set)
  console    : require("console")             // Console instance if you need to debug issues
});
```

### 2. Teardown reporter

If you need to teardown an active reporter, you can use the `end()` method to unbind it.

```javascript
vigilReporter.end();
```

## What is Vigil?

ℹ️ **Wondering what Vigil is?** Check out **[valeriansaliou/vigil](https://github.com/valeriansaliou/vigil)**.
