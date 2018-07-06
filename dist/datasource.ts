/*
* -\-\-
* Spotify Heroic Grafana Datasource
* --
* Copyright (C) 2018 Spotify AB
* --
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* -/-/-
*/

import _ from "lodash";

import * as dateMath from "app/core/utils/datemath";
import HeroicQuery from "./heroic_query";
import HeroicSeries from "./heroic_series";
import queryPart from "./query_part";
import TimeRange from "./time_range";

export default class HeroicDatasource {
  public type: string;
  public urls: any;
  public url: string;
  public username: string;
  public password: string;
  public name: string;
  public database: any;
  public basicAuth: any;
  public withCredentials: any;
  public interval: any;
  public supportAnnotations: boolean;
  public supportMetrics: boolean;
  public templateSrv: any;
  public annotationModels: any;

  /** @ngInject */
  constructor(instanceSettings, private $q, private backendSrv, templateSrv) {
    this.type = "heroic";
    this.url = instanceSettings.url;
    this.templateSrv = templateSrv;
    this.urls = _.map(instanceSettings.url.split(","), function(url) {
      return url.trim();
    });

    this.username = instanceSettings.username;
    this.password = instanceSettings.password;
    this.name = instanceSettings.name;
    this.database = instanceSettings.database;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
    this.interval = (instanceSettings.jsonData || {}).timeInterval;
    this.supportAnnotations = true;
    this.supportMetrics = true;
    this.annotationModels = [[{ type: "average", categoryName: "For Each", params: [] }]];
    this.annotationModels = _.map(this.annotationModels, function(parts: any) {
      return _.map(parts, queryPart.create);
    });

  }
  public query(options) {
    const timeFilter = this.getTimeFilter(options);
    const scopedVars = options.scopedVars;
    const targets = _.cloneDeep(options.targets);
    const queryTargets = [];
    let queryModel;

    const allQueries = _.map(targets, (target) => {
      if (target.hide) {
        return null;
      }

      queryTargets.push(target);
      scopedVars.interval = scopedVars.__interval;

      queryModel = new HeroicQuery(target, this.templateSrv, scopedVars);
      return queryModel.render();
    }).filter((query) => query !== null);
    if (!allQueries) {
      return this.$q.when({ data: [] });
    }
    allQueries.forEach((query) => {
      query.range = timeFilter;
    });

    // TODO: add globaal ad hoc filters
    // add global adhoc filters to timeFilter
    // var adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    // if (adhocFilters.length > 0) {
    //   timeFilter += ' AND ' + queryModel.renderAdhocFilters(adhocFilters);
    // }

    const output = [];
    const batchQuery = { queries: {} };
    allQueries.forEach((query, index) => {
      batchQuery.queries[index] = query;
    });

    return this.doRequest("/query/batch", { method: "POST", data: batchQuery })
      .then((data) => {
        const results = data.data.results;

        // results.forEach((currentResult, resultIndex) => {})

        _.forEach(results, (resultValue, resultKey) => {
          const target = targets[resultKey];
          let alias = target.alias;
          if (alias) {
            alias = this.templateSrv.replaceWithText(alias, options.scopedVars);
          }
          const heroicSeries = new HeroicSeries({ series: resultValue, alias, templateSrv: this.templateSrv });
          switch (targets[resultKey].resultFormat) {
            case "table": {
              output.push(heroicSeries.getTable());
              break;
            }
            default: {
              heroicSeries.getTimeSeries().forEach((timeSeries) => {
                output.push(timeSeries);
              });
            }
          }
        });

        return { data: output };
      });
  }

  public annotationQuery(options) {

    if (!options.annotation.query) {
      return this.$q.reject({
        message: "Query missing in annotation definition",
      });
    }
    const currentFilter = options.annotation.query;
    // TODO: template vars

    const query = {
      filter: currentFilter,
      aggregators: [],
      features: ["com.spotify.heroic.distributed_aggregations"],
      range: {},
    };

    query.range = this.getTimeFilter(options);

    return this.doRequest("/query/metrics", { method: "POST", data: query })
      .then((data) => {
        // TODO: error handling throw { message: 'No results in response from Heroic' };

        return new HeroicSeries({
          series: data.data.result,
          annotation: options.annotation,
        }).getAnnotations();
      });
  }

  public targetContainsTemplate(target) {
    for (const group of target.groupBy) {
      for (const param of group.params) {
        if (this.templateSrv.variableExists(param)) {
          return true;
        }
      }
    }

    for (const i in target.tags) {
      if (this.templateSrv.variableExists(target.tags[i].value)) {
        return true;
      }
    }

    return false;
  }

  public testDatasource() {
    return this.doRequest("/status", {}).then(function(data) {
      const service = data.data.service;

      return {
        status: "success",
        message: "OK: " + JSON.stringify(service),
        title: "Success",
      };
    });
  }

  public doRequest(path, options) {
    const headers = { "Content-Type": "application/json;charset=UTF-8" };
    options = options || {};
    options.headers = headers;
    options.url = this.url + path;
    options.inspect = { type: "heroic" };
    return this.backendSrv.datasourceRequest(options);
  }

  public parseRelativeUnit(unit) {
    switch (unit) {
      case "s":
        return "SECONDS";
      case "m":
        return "MINUTES";
      case "h":
        return "HOURS";
      case "d":
        return "DAYS";
      default:
        return "SECONDS";
    }
  }

  public getTimeFilter(options) {
    const from = this.convertRawTime(options.rangeRaw.from, false);
    const until = this.convertRawTime(options.rangeRaw.to, true);
    const timeObject = new TimeRange();
    if (until === "now()" && from.startsWith("now() - ")) {
      const unit_value = from.split(" - ")[1];
      const valueRaw = unit_value.substr(0, unit_value.length - 1);
      const unitRaw = unit_value.substr(unit_value.length - 1, unit_value.length);
      const value = parseInt(valueRaw);
      const unit = this.parseRelativeUnit(unitRaw);
      timeObject.type = "relative";
      timeObject.unit = unit;
      timeObject.value = value;

    } else {
      const start = options.range.from.unix() * 1000;
      const end = options.range.to.unix() * 1000;
      timeObject.type = "absolute";
      timeObject.start = start;
      timeObject.end = end;
    }
    return timeObject;
  }

  public convertRawTime(date, roundUp) {
    if (_.isString(date)) {
      if (date === "now") {
        return "now()";
      }

      const parts = /^now-(\d+)([d|h|m|s])$/.exec(date);
      if (parts) {
        const amount = parseInt(parts[1]);
        const unit = parts[2];
        return "now() - " + amount + unit;
      }
      date = dateMath.parse(date, roundUp);
    }

    return date.valueOf() + "ms";
  }

}
