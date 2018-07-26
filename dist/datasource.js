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
System.register(["lodash", "app/core/utils/datemath", "./heroic_query", "./heroic_series", "./query_part", "./time_range", "./metadata_client"], function(exports_1) {
    var lodash_1, dateMath, heroic_query_1, heroic_series_1, query_part_1, time_range_1, metadata_client_1;
    var HeroicDatasource;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (dateMath_1) {
                dateMath = dateMath_1;
            },
            function (heroic_query_1_1) {
                heroic_query_1 = heroic_query_1_1;
            },
            function (heroic_series_1_1) {
                heroic_series_1 = heroic_series_1_1;
            },
            function (query_part_1_1) {
                query_part_1 = query_part_1_1;
            },
            function (time_range_1_1) {
                time_range_1 = time_range_1_1;
            },
            function (metadata_client_1_1) {
                metadata_client_1 = metadata_client_1_1;
            }],
        execute: function() {
            HeroicDatasource = (function () {
                /** @ngInject */
                function HeroicDatasource(instanceSettings, $q, backendSrv, templateSrv) {
                    this.$q = $q;
                    this.backendSrv = backendSrv;
                    this.type = "heroic";
                    this.url = instanceSettings.url;
                    this.templateSrv = templateSrv;
                    this.urls = lodash_1.default.map(instanceSettings.url.split(","), function (url) {
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
                    this.annotationModels = lodash_1.default.map(this.annotationModels, function (parts) {
                        return lodash_1.default.map(parts, query_part_1.default.create);
                    });
                    this.queryBuilder = new metadata_client_1.MetadataClient(this, null, this.templateSrv, this.$q, {}, {}, null, {}, true, true);
                }
                HeroicDatasource.prototype.query = function (options) {
                    var _this = this;
                    var timeFilter = this.getTimeFilter(options);
                    var scopedVars = options.scopedVars;
                    var targets = lodash_1.default.cloneDeep(options.targets);
                    var queryTargets = [];
                    var queryModel;
                    var allQueries = lodash_1.default.map(targets, function (target) {
                        if (target.hide) {
                            return null;
                        }
                        queryTargets.push(target);
                        scopedVars.interval = scopedVars.__interval;
                        queryModel = new heroic_query_1.default(target, _this.templateSrv, scopedVars);
                        return queryModel.render();
                    }).filter(function (query) { return query !== null; });
                    if (!allQueries) {
                        return this.$q.when({ data: [] });
                    }
                    allQueries.forEach(function (query) {
                        query.range = timeFilter;
                        var adhocFilters = _this.templateSrv.getAdhocFilters(_this.name);
                        if (adhocFilters.length > 0) {
                            query.filter.push(queryModel.renderAdhocFilters(adhocFilters));
                        }
                    });
                    // TODO: add globaal ad hoc filters
                    // add global adhoc filters to timeFilter
                    // var adhocFilters = this.templateSrv.getAdhocFilters(this.name);
                    // if (adhocFilters.length > 0) {
                    //   timeFilter += ' AND ' + queryModel.renderAdhocFilters(adhocFilters);
                    // }
                    var output = [];
                    var batchQuery = { queries: {} };
                    allQueries.forEach(function (query, index) {
                        batchQuery.queries[index] = query;
                    });
                    return this.doRequest("/query/batch", { method: "POST", data: batchQuery })
                        .then(function (data) {
                        var results = data.data.results;
                        // results.forEach((currentResult, resultIndex) => {})
                        lodash_1.default.forEach(results, function (resultValue, resultKey) {
                            var target = targets[resultKey];
                            var alias = target.alias;
                            if (alias) {
                                alias = _this.templateSrv.replaceWithText(alias, options.scopedVars);
                            }
                            var heroicSeries = new heroic_series_1.default({ series: resultValue, alias: alias, templateSrv: _this.templateSrv });
                            switch (targets[resultKey].resultFormat) {
                                case "table": {
                                    output.push(heroicSeries.getTable());
                                    break;
                                }
                                default: {
                                    heroicSeries.getTimeSeries().forEach(function (timeSeries) {
                                        output.push(timeSeries);
                                    });
                                }
                            }
                        });
                        return { data: output };
                    });
                };
                HeroicDatasource.prototype.annotationQuery = function (options) {
                    if (!options.annotation.query) {
                        return this.$q.reject({
                            message: "Query missing in annotation definition",
                        });
                    }
                    var currentFilter = options.annotation.query;
                    // TODO: template vars
                    var query = {
                        filter: currentFilter,
                        aggregators: [],
                        features: ["com.spotify.heroic.distributed_aggregations"],
                        range: {},
                    };
                    query.range = this.getTimeFilter(options);
                    return this.doRequest("/query/metrics", { method: "POST", data: query })
                        .then(function (data) {
                        // TODO: error handling throw { message: 'No results in response from Heroic' };
                        return new heroic_series_1.default({
                            series: data.data.result,
                            annotation: options.annotation,
                        }).getAnnotations();
                    });
                };
                HeroicDatasource.prototype.targetContainsTemplate = function (target) {
                    for (var _i = 0, _a = target.groupBy; _i < _a.length; _i++) {
                        var group = _a[_i];
                        for (var _b = 0, _c = group.params; _b < _c.length; _b++) {
                            var param = _c[_b];
                            if (this.templateSrv.variableExists(param)) {
                                return true;
                            }
                        }
                    }
                    for (var i in target.tags) {
                        if (this.templateSrv.variableExists(target.tags[i].value)) {
                            return true;
                        }
                    }
                    return false;
                };
                HeroicDatasource.prototype.testDatasource = function () {
                    return this.doRequest("/status", {}).then(function (data) {
                        var service = data.data.service;
                        return {
                            status: "success",
                            message: "OK: " + JSON.stringify(service),
                            title: "Success",
                        };
                    });
                };
                HeroicDatasource.prototype.doRequest = function (path, options) {
                    var headers = { "Content-Type": "application/json;charset=UTF-8" };
                    options = options || {};
                    options.headers = headers;
                    options.url = this.url + path;
                    options.inspect = { type: "heroic" };
                    return this.backendSrv.datasourceRequest(options);
                };
                HeroicDatasource.prototype.parseRelativeUnit = function (unit) {
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
                };
                HeroicDatasource.prototype.getTimeFilter = function (options) {
                    var from = this.convertRawTime(options.rangeRaw.from, false);
                    var until = this.convertRawTime(options.rangeRaw.to, true);
                    var timeObject = new time_range_1.default();
                    if (until === "now()" && from.startsWith("now() - ")) {
                        var unit_value = from.split(" - ")[1];
                        var valueRaw = unit_value.substr(0, unit_value.length - 1);
                        var unitRaw = unit_value.substr(unit_value.length - 1, unit_value.length);
                        var value = parseInt(valueRaw);
                        var unit = this.parseRelativeUnit(unitRaw);
                        timeObject.type = "relative";
                        timeObject.unit = unit;
                        timeObject.value = value;
                    }
                    else {
                        var start = options.range.from.unix() * 1000;
                        var end = options.range.to.unix() * 1000;
                        timeObject.type = "absolute";
                        timeObject.start = start;
                        timeObject.end = end;
                    }
                    return timeObject;
                };
                HeroicDatasource.prototype.convertRawTime = function (date, roundUp) {
                    if (lodash_1.default.isString(date)) {
                        if (date === "now") {
                            return "now()";
                        }
                        var parts = /^now-(\d+)([d|h|m|s])$/.exec(date);
                        if (parts) {
                            var amount = parseInt(parts[1]);
                            var unit = parts[2];
                            return "now() - " + amount + unit;
                        }
                        date = dateMath.parse(date, roundUp);
                    }
                    return date.valueOf() + "ms";
                };
                HeroicDatasource.prototype.getTagKeys = function () {
                    var data = {
                        filter: ["true"],
                        limit: 100,
                        key: null
                    };
                    return this.queryBuilder.queryTagsAndValues(data, "key", this.queryBuilder.lruTag).then(function (result) {
                        return result.map(function (iresult) {
                            return { value: iresult.key, text: iresult.key };
                        });
                    });
                };
                HeroicDatasource.prototype.getTagValues = function (options) {
                    var data = {
                        filter: ["true"],
                        limit: 100,
                        key: options.key
                    };
                    return this.queryBuilder.queryTagsAndValues(data, "value", this.queryBuilder.lruTagValue).then(function (result) {
                        return result.map(function (iresult) {
                            return { value: iresult.value, text: iresult.value };
                        });
                    });
                };
                HeroicDatasource.prototype.metricFindQuery = function (query, variableOptions) {
                    // TODO: improve this. supposedly a new version of Grafana is going to consolidate query builders
                    if (!(query.startsWith("tag:") || query.startsWith("tagValue:"))) {
                        return [
                            "ERROR"
                        ];
                    }
                    var variableSrv = variableOptions.variable.templateSrv;
                    var splitquery = query.split(":");
                    var action = splitquery[0];
                    var toGet;
                    var cacheKey;
                    var lookupKey;
                    var rawRealQuery;
                    if (action === "tag") {
                        toGet = "key";
                        cacheKey = "lruTag";
                        rawRealQuery = splitquery[1];
                    }
                    else {
                        toGet = "value";
                        cacheKey = "lruTagValue";
                        lookupKey = splitquery[1];
                        rawRealQuery = splitquery[2];
                    }
                    var cache = this.queryBuilder["lru"];
                    var realQuery = variableSrv.replace(rawRealQuery, variableSrv.variables);
                    var data = {
                        filter: ["and", ["q", realQuery]],
                        limit: 500,
                        key: lookupKey
                    };
                    return this.queryBuilder.queryTagsAndValues(data, toGet, this.queryBuilder[cacheKey]).then(function (result) {
                        return result.map(function (iresult) {
                            return { value: iresult[toGet], text: iresult[toGet] };
                        });
                    });
                };
                return HeroicDatasource;
            })();
            exports_1("default", HeroicDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map