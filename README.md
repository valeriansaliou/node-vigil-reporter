# node-vigil-reporter

[![Test and Build](https://github.com/valeriansaliou/node-vigil-reporter/workflows/Test%20and%20Build/badge.svg?branch=master)](https://github.com/valeriansaliou/node-vigil-reporter/actions?query=workflow%3A%22Test+and+Build%22) [![Build and Release](https://github.com/valeriansaliou/node-vigil-reporter/workflows/Build%20and%20Release/badge.svg)](https://github.com/valeriansaliou/node-vigil-reporter/actions?query=workflow%3A%22Build+and+Release%22) [![NPM](https://img.shields.io/npm/v/vigil-reporter.svg)](https://www.npmjs.com/package/vigil-reporter) [![Downloads](https://img.shields.io/npm/dt/vigil-reporter.svg)](https://www.npmjs.com/package/vigil-reporter) [![Buy Me A Coffee](https://img.shields.io/badge/buy%20me%20a%20coffee-donate-yellow.svg)](https://www.buymeacoffee.com/valeriansaliou)

**Vigil Reporter for Node. Used in pair with Vigil, the Microservices Status Page.**

Vigil Reporter is used to actively submit health information to Vigil from your apps. Apps are best monitored via application probes, which are able to report detailed system information such as CPU and RAM load. This lets Vigil show if an application host system is under high load.

**🇭🇺 Crafted in Budapest, Hungary.**

## Who uses it?

<table>
<tr>
<td align="center"><a href="https://crisp.chat/"><img src="https://valeriansaliou.github.io/node-vigil-reporter/images/crisp.png" width="64" /></a></td>
</tr>
<tr>
<td align="center">Crisp</td>
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

If you need to teardown an active reporter, you can use the `end(options)` method to unbind it (`options` is optional).

```javascript
vigilReporter.end({
  done  : function(error) {
    // Handle 'ended' event there (error should be 'null')
  },

  flush : false  // Whether to flush replica from Vigil upon teardown (boolean; defaults to 'false' if not set)
});
```

## What is Vigil?

ℹ️ **Wondering what Vigil is?** Check out **[valeriansaliou/vigil](https://github.com/valeriansaliou/vigil)**.
