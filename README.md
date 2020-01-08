This is a "fork" of the [Grafana InfluxDB plugin](https://github.com/grafana/grafana/tree/master/public/app/plugins/datasource/influxdb) with changes applied to function with the Heroic time-series database.

This is intended to be an improvement on the [previous Heroic datasource](https://github.com/udoprog/udoprog-heroic-datasource) that includes a query builder, table support, variable support, and annotation support.

# Development Status

Beta

# How to install

To develop locally:
- `yarn install`
- `yarn watch`

Add the following to your `grafana.ini` to deploy to your local Grafana instance:
```
[plugin.spotify-heroic-datasource]
path = /{path-to-spotify-heroic-datasource}
```

If using Docker, you can mount this repo into the Grafana plugin directory:

```
docker run -it -p 3000:3000 --name=grafana -v `pwd`:/var/lib/grafana/plugins/spotify-heroic-datasource grafana/grafana
```

Can also be installed with grafana-cli

`grafana-cli plugins install spotify-heroic-datasource`

or

`grafana-cli --pluginUrl https://github.com/spotify/spotify-heroic-datasource/archive/master.zip plugins install spotify-heroic-datasource`

# Code of Conduct

This project adheres to the [Open Code of Conduct][code-of-conduct]. By participating, you are expected to honor this code.

[code-of-conduct]: https://github.com/spotify/code-of-conduct/blob/master/code-of-conduct.md
