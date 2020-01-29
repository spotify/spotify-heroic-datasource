# spotify-heroic-datasource

[![Build Status](https://travis-ci.org/spotify/spotify-heroic-datasource.svg?branch=master)](https://travis-ci.org/spotify/spotify-heroic-datasource)

![heroic-datasource-screenshot](https://github.com/spotify/spotify-heroic-datasource/raw/master/heroic-datasource-screenshot.png "Heroic Datasource Plugin")

The Spotify Heroic datasource is the "offical" plugin for [Heroic](https://github.com/spotify/heroic)!

It includes:
* Query builder with suggestions for metrics.
* Table support.
* Annotation support.


This plugin is supersedes the previous [Heroic datasource](https://github.com/udoprog/udoprog-heroic-datasource).

Inspiration was taken from the [Grafana InfluxDB plugin](https://github.com/grafana/grafana/tree/master/public/app/plugins/datasource/influxdb).


# Installation

The recommened way to install the plugin is via the official cli:

`grafana-cli plugins install spotify-heroic-datasource`


The plugin can also be installed by directly pointing at a release. Useful if you want to test a feature that hasn't been released yet.

`grafana-cli --pluginUrl https://github.com/spotify/spotify-heroic-datasource/archive/master.zip plugins install spotify-heroic-datasource`


# Local Development

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
docker run -it -p 3000:3000 --name=grafana -v `pwd`/dist:/var/lib/grafana/plugins/spotify-heroic-datasource grafana/grafana
```


# Releasing


1. In a terminal, navigate to the repo, ensure you are on the master branch and then run...
1. git pull --rebase origin master
1. git log (ensure you are on the latest version)
1. git fetch --tags
1. git tag -l (this lists the previous release tags. increment the tag for your release and use semantic versioning)
1. git tag ${tag}
1. git push origin ${tag}
1. Take the commit hash made for the tag released and append it to [repo.json](https://github.com/grafana/grafana-plugin-repository/blob/master/repo.json).



# Code of Conduct

This project adheres to the [Open Code of Conduct][code-of-conduct]. By participating, you are expected to honor this code.

[code-of-conduct]: https://github.com/spotify/code-of-conduct/blob/master/code-of-conduct.md
