This is a "fork" of the [Grafana InfluxDB plugin](https://github.com/grafana/grafana/tree/master/public/app/plugins/datasource/influxdb) with changes applied to function with the Heroic time-series database.

This is intended to be an improvement on the [existing Heroic datasource](https://github.com/udoprog/udoprog-heroic-datasource) that includes a query builder, table support, variable support, and annotation support.

# Development Status

Pre-Alpha

# Requirements

 - Grafana
 - grunt

# How to install

To develop locally:
 - `npm install`
 - `grunt watch`

Add the following to your `grafana.ini` to deploy to your local Grafana instance:
```
[plugin.heroic-influx-fork]
/{path-to-heroic-grafana-datasource}
```

TODO: start versioning releases

`grafana-cli --pluginUrl https://github.com/spotify/heroic-grafana-datasource/archive/master.zip plugins install heroic-grafana-datasource`

# Code of Conduct

This project adheres to the [Open Code of Conduct][code-of-conduct]. By participating, you are expected to honor this code.

[code-of-conduct]: https://github.com/spotify/code-of-conduct/blob/master/code-of-conduct.md
