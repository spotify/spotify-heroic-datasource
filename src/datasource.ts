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
import WarningsCache from './warnings_cache';
import {
  Target,
  DataSeries,
  HeroicBatchResult,
  HeroicBatchData,
  datasource,
} from "./types";
//@ts-ignore
import { PanelEvents } from '@grafana/data';

export default class HeroicDatasource {
  public type: string;
  public settings: datasource.InstanceSettings;

  public supportAnnotations: boolean;
  public supportMetrics: boolean;
  public templateSrv: any;
  public annotationModels: any;
  public queryBuilder: any;
  public fakeController: any;
  public warningsCache: WarningsCache;

  public tagAggregationChecks: any;
  public tagCollapseChecks: any[];
  public suggestionRules: any;
  public meta: any;

  static HTTP_DEFAULT_JSON_HEADERS = 'application/json;charset=UTF-8';

  /** @ngInject */
  constructor(instanceSettings: datasource.InstanceSettings,
    private $q,
    private backendSrv,
    templateSrv,
    private uiSegmentSrv) {
    this.type = "heroic";
    this.settings = instanceSettings;

    this.templateSrv = templateSrv;

    this.tagAggregationChecks = _.reduce(instanceSettings.jsonData.tagAggregationChecks, (obj, value) => {
      const kv = value.split(":");
      if (obj[kv[0]] === undefined) {
        obj[kv[0]] = [];
      }
      obj[kv[0]].push(kv[1]);
      return obj;
    }, {});
    this.tagCollapseChecks = instanceSettings.jsonData.tagCollapseChecks || [];

    this.suggestionRules = (instanceSettings.jsonData.suggestionRules || []).map(helper => {
      return {
        triggerFilter: JSON.parse(helper.triggerFilter),
        filter: JSON.parse(helper.filter),
        description: helper.description,
        aggregation: helper.aggregation ? JSON.parse(helper.aggregation) : null
      };
    });

    this.supportAnnotations = true;
    this.supportMetrics = true;
    this.annotationModels = [[{ type: "average", categoryName: "For Each", params: [] }]];
    this.annotationModels = _.map(this.annotationModels, function (parts: any) {
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

    this.warningsCache = new WarningsCache();
  }

  public query(options) {
    const timeFilter = this.getTimeFilter(options);
    const scopedVars = options.scopedVars;
    const targets: Target[] = _.cloneDeep(options.targets);
    const targetsByRef: Record<string, Target> = {};
    const clientContext = {
      dashboardId: options.dashboardId,
      panelId: options.panelId,
    };
    targets.forEach(target => {
      targetsByRef[target.refId] = target;
    });
    let queryModel;
    const allQueries = _.map(targets, (target) => {
      if (target.hide) {
        return null;
      }

      scopedVars.interval = scopedVars.__interval;
      queryModel = new HeroicQuery(target, this.templateSrv, scopedVars, clientContext);
      const query = queryModel.render();
      if (query.aggregators.length) {
        const samplers: string[] = query.aggregators.filter(a => a.each !== undefined)
          .map(a => a.each[0])
          .filter(each => each.sampling !== undefined)
          .map(each => each.sampling.value);
        if (samplers.length > 0) {
          target.queryResolution = samplers[0];
        } else {
          target.queryResolution = null;
        }
      } else {
        target.queryResolution = null;
      }
      return { query: query, refId: target.refId };
    }).filter((queryWrapper) => {
      return queryWrapper !== null && queryWrapper.query !== null && JSON.stringify(queryWrapper.query.filter) !== "[\"true\"]";
    });

    if (!allQueries.length) {
      return this.$q.when({ data: [] });
    }

    allQueries.forEach(({ query }) => {
      query.range = timeFilter;
      const adhocFilters = this.templateSrv.getAdhocFilters(this.settings.name);
      if (adhocFilters.length > 0) {
        query.filter.push(queryModel.renderAdhocFilters(adhocFilters));
      }
    });

    const batchQuery = { queries: {} };
    allQueries.forEach(({ query, refId }, index) => {
      batchQuery.queries[refId] = query;
    });

    return this.doRequest("/query/batch", { method: "POST", data: batchQuery })
      .then((data: HeroicBatchResult) => {
        const results = data.data.results;
        const output = _.flatMap(results, (resultValue: HeroicBatchData, refId: string) => {
          const target: Target = targetsByRef[refId];
          let alias: string = target.alias;
          if (alias) {
            alias = this.templateSrv.replace(alias, options.scopedVars);
          }
          const heroicSeries = new HeroicSeries({
            series: resultValue,
            alias,
            templateSrv: this.templateSrv,
            resolution: target.queryResolution
          });
          switch (targetsByRef[refId].resultFormat) {
            case "table": {
              const tableData = heroicSeries.getTable();
              tableData.refId = target.refId;
              return tableData;
            }
            default: {
              return heroicSeries.getTimeSeries({
                refId: target.refId,
                dashboardId: options.dashboardId,
                panelId: options.panelId
              });
            }
          }
        });

        _.forEach(output, target => {
          const { warningsKey } = target.meta;
          if (!this.warningsCache.hasCache(warningsKey)) {
            this.warningsCache.createCache(warningsKey);
          } else {
            this.warningsCache.removeAllWarnings(warningsKey);
          }
          target.meta.errors.forEach(error => {
            const msg = WarningsCache.formatWarning(error);
            this.warningsCache.addWarning(warningsKey, msg);
          });
        });

        return { data: output };
      });
  }

  public annotationQuery(options) {
    const queryModel = new HeroicQuery({ tags: options.annotation.tags }, this.templateSrv, {});
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

  public targetContainsTemplate(target): boolean {
    // Check aggregations for variables.
    for (const select of target.select) {
      for (const aggregation of select) {
        for (const param of aggregation.params) {
          if (this.templateSrv.variableExists(param)) {
            return true;
          }
        }
      }
    }

    // Check filters for variables.
    for (const i in target.tags) {
      if (this.templateSrv.variableExists(target.tags[i].value)) {
        return true;
      }
    }

    return false;
  }

  public testDatasource() {
    return this.doRequest("/status", {}).then(function (data) {
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
    options.url = this.settings.url + path;
    options.inspect = { type: "heroic" };
    if (options.method === 'POST' && options.headers['Content-Type'] === HeroicDatasource.HTTP_DEFAULT_JSON_HEADERS) {
      options.data = JSON.stringify(options.data);
    }
    return this.backendSrv.datasourceRequest(options);
  }

  public doRequest(path, options) {
    const headers = {
      "Content-Type": HeroicDatasource.HTTP_DEFAULT_JSON_HEADERS,
      "X-Client-Id": this.meta.id
    };
    return this.doRequestWithHeaders(path, options, headers);
  }

  public parseRelativeUnit(unit: string): string {
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

  public convertRawTime(date: string | number, roundUp: boolean): string {
    if (typeof date === "string") {
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
        return { value: iresult.key, text: iresult.key };
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
        return { value: iresult.value, text: iresult.value };
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
    const cache = this.queryBuilder[`lru`];
    const realQuery = variableSrv.replace(rawRealQuery, variableSrv.variables);
    const data = {
      filter: ["and", ["q", realQuery]],
      limit: 500,
      key: lookupKey
    };
    return this.queryBuilder.queryTagsAndValues(data, toGet, this.queryBuilder[cacheKey]).then(result => {
      return result.map(iresult => {
        return { value: iresult[toGet], text: iresult[toGet] };
      });
    });
  }

}
