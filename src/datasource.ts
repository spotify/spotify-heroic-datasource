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
import { MetadataClient } from "./metadata_client";


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
  public queryBuilder: any;
  public fakeController: any;
  public tagAggregationChecks: any;
  public tagCollapseChecks: any;

  /** @ngInject */
  constructor(instanceSettings, private $q, private backendSrv, templateSrv, private uiSegmentSrv) {
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
    this.tagAggregationChecks = _.reduce(instanceSettings.jsonData.tagAggregationChecks, (obj, value) => {
      const kv = value.split(":");
      if (obj[kv[0]] === undefined) {
        obj[kv[0]] = [];
      }
      obj[kv[0]].push(kv[1]);
      return obj;
    }, {});
    this.tagCollapseChecks = instanceSettings.jsonData.tagCollapseChecks || [];
    this.supportAnnotations = true;
    this.supportMetrics = true;
    this.annotationModels = [[{ type: "average", categoryName: "For Each", params: [] }]];
    this.annotationModels = _.map(this.annotationModels, function(parts: any) {
      return _.map(parts, queryPart.create);
    });
    this.fakeController = true;
    this.queryBuilder = new MetadataClient(
      this,
      this,
      {},
      {},
      true,
      true
    );

  }

  public query(options) {
    const timeFilter = this.getTimeFilter(options);
    const scopedVars = options.scopedVars;
    const targets = _.cloneDeep(options.targets);
    const targetsByRef = {};
    targets.forEach(target => {
      targetsByRef[target.refId] = target;
    });
    let queryModel;
    const allQueries = _.map(targets, (target) => {
      if (target.hide) {
        return null;
      }

      scopedVars.interval = scopedVars.__interval;

      queryModel = new HeroicQuery(target, this.templateSrv, scopedVars);
      const query = queryModel.render();
      if (query.aggregators.length) {
        target.queryResolution = query.aggregators[0].each[0].sampling.value;
      } else {
        target.queryResolution = null
      }
      return {query: query, refId: target.refId};
    }).filter((queryWrapper) => {
      return queryWrapper !== null && queryWrapper.query !== null && JSON.stringify(queryWrapper.query.filter) !== "[\"true\"]";
    });

    if (!allQueries) {
      return this.$q.when({ data: [] });
    }

    allQueries.forEach((queryWrapper) => {
      const query = queryWrapper.query;
      query.range = timeFilter;
      const adhocFilters = this.templateSrv.getAdhocFilters(this.name);
      if (adhocFilters.length > 0) {
        query.filter.push(queryModel.renderAdhocFilters(adhocFilters));
      }
    });

    const output = [];
    const batchQuery = { queries: {} };
    allQueries.forEach((queryWrapper, index) => {
      const query = queryWrapper.query;
      batchQuery.queries[queryWrapper.refId] = query;
    });

    return this.doRequest("/query/batch", { method: "POST", data: batchQuery })
      .then((data) => {
        const results = data.data.results;

        // results.forEach((currentResult, resultIndex) => {})

        _.forEach(results, (resultValue, resultKey) => {
          const target = targetsByRef[resultKey];
          let alias = target.alias;
          const query = data.config.data.queries[resultKey];
          if (alias) {
            alias = this.templateSrv.replaceWithText(alias, options.scopedVars);
          } else if (query.aggregators.length) {
            const aggr = query.aggregators;
            const last = aggr[aggr.length - 1];
            if (last.of !== null && last.of.length) {
              alias = last.of.map(of => `[[tag_${of}]]`).join(" ");
            }
          }
          const heroicSeries = new HeroicSeries({ series: resultValue, alias, templateSrv: this.templateSrv, resolution: target.queryResolution });
          switch (targetsByRef[resultKey].resultFormat) {
            case "table": {
              const tableData = heroicSeries.getTable();
              tableData.refId = target.refId;
              output.push(tableData);
              break;
            }
            default: {
              heroicSeries.getTimeSeries().forEach((timeSeries) => {
                timeSeries.refId = target.refId;
                output.push(timeSeries);
              });
            }
          }
        });

        return { data: output };
      });
  }

  public annotationQuery(options) {
    const queryModel = new HeroicQuery({tags: options.annotation.tags}, this.templateSrv, {});
    const currentFilter = queryModel.buildCurrentFilter(true, false);

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

  public doRequestWithHeaders(path, options, headers) {
    options = options || {};
    options.headers = headers;
    options.url = this.url + path;
    options.inspect = { type: "heroic" };
    return this.backendSrv.datasourceRequest(options);
  }
  public doRequest(path, options) {
    const headers = { "Content-Type": "application/json;charset=UTF-8" };
    return this.doRequestWithHeaders(path, options, headers);
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

  getTagKeys() {
    const data = {
      filter: ["true"],
      limit: 100,
      key: null
    };
    return this.queryBuilder.queryTagsAndValues(data, "key", this.queryBuilder.lruTag).then(result => {
      return result.map(iresult => {
        return {value: iresult.key, text: iresult.key};
      });
    });
  }

  getTagValues(options) {
    const data = {
      filter: ["true"],
      limit: 100,
      key: options.key
    };
    return this.queryBuilder.queryTagsAndValues(data, "value", this.queryBuilder.lruTagValue).then(result => {
      return result.map(iresult => {
        return {value: iresult.value, text: iresult.value};
      });
    });
  }

  metricFindQuery(query, variableOptions) {
    // TODO: improve this. supposedly a new version of Grafana is going to consolidate query builders
    if (!(query.startsWith("tag:") || query.startsWith("tagValue:"))) {
      return [
        "ERROR"
      ];
    }
    const variableSrv = variableOptions.variable.templateSrv;
    const splitquery = query.split(":");
    const action = splitquery[0];
    let toGet;
    let cacheKey;
    let lookupKey;
    let rawRealQuery;
    if (action === "tag") {
      toGet = "key";
      cacheKey = "lruTag";
      rawRealQuery = splitquery[1];
    } else {
      toGet = "value";
      cacheKey = "lruTagValue";
      lookupKey = splitquery[1];
      rawRealQuery = splitquery[2];
    }
    const cache = this.queryBuilder[`lru`]
    const realQuery = variableSrv.replace(rawRealQuery, variableSrv.variables);
    const data = {
      filter: ["and", ["q", realQuery]],
      limit: 500,
      key: lookupKey
    };
    return this.queryBuilder.queryTagsAndValues(data, toGet, this.queryBuilder[cacheKey]).then(result => {
      return result.map(iresult => {
        return {value: iresult[toGet], text: iresult[toGet]};
      });
    });
  }

}
