System.register(["lodash", "app/core/utils/datemath", "./heroic_query", "./heroic_series", "./query_part", "./time_range", "./metadata_client"], function (exports_1, context_1) {
    "use strict";
    var lodash_1, dateMath, heroic_query_1, heroic_series_1, query_part_1, time_range_1, metadata_client_1, HeroicDatasource;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
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
            }
        ],
        execute: function () {
            HeroicDatasource = (function () {
                function HeroicDatasource(instanceSettings, $q, backendSrv, templateSrv, uiSegmentSrv) {
                    this.$q = $q;
                    this.backendSrv = backendSrv;
                    this.uiSegmentSrv = uiSegmentSrv;
                    this.type = "heroic";
                    this.settings = instanceSettings;
                    this.templateSrv = templateSrv;
                    this.tagAggregationChecks = lodash_1.default.reduce(instanceSettings.jsonData.tagAggregationChecks, function (obj, value) {
                        var kv = value.split(":");
                        if (obj[kv[0]] === undefined) {
                            obj[kv[0]] = [];
                        }
                        obj[kv[0]].push(kv[1]);
                        return obj;
                    }, {});
                    this.tagCollapseChecks = instanceSettings.jsonData.tagCollapseChecks || [];
                    this.suggestionRules = (instanceSettings.jsonData.suggestionRules || []).map(function (helper) {
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
                    this.annotationModels = lodash_1.default.map(this.annotationModels, function (parts) {
                        return lodash_1.default.map(parts, query_part_1.default.create);
                    });
                    this.fakeController = true;
                    this.queryBuilder = new metadata_client_1.MetadataClient(this, this, {}, {}, true, true);
                }
                HeroicDatasource.prototype.query = function (options) {
                    var _this = this;
                    var timeFilter = this.getTimeFilter(options);
                    var scopedVars = options.scopedVars;
                    var targets = lodash_1.default.cloneDeep(options.targets);
                    var targetsByRef = {};
                    targets.forEach(function (target) {
                        targetsByRef[target.refId] = target;
                    });
                    var queryModel;
                    var allQueries = lodash_1.default.map(targets, function (target) {
                        if (target.hide) {
                            return null;
                        }
                        scopedVars.interval = scopedVars.__interval;
                        queryModel = new heroic_query_1.default(target, _this.templateSrv, scopedVars);
                        var query = queryModel.render();
                        if (query.aggregators.length) {
                            var samplers = query.aggregators.filter(function (a) { return a.each !== undefined; })
                                .map(function (a) { return a.each[0]; })
                                .filter(function (each) { return each.sampling !== undefined; })
                                .map(function (each) { return each.sampling.value; });
                            if (samplers.length > 0) {
                                target.queryResolution = samplers[0];
                            }
                            else {
                                target.queryResolution = null;
                            }
                        }
                        else {
                            target.queryResolution = null;
                        }
                        return { query: query, refId: target.refId };
                    }).filter(function (queryWrapper) {
                        return queryWrapper !== null && queryWrapper.query !== null && JSON.stringify(queryWrapper.query.filter) !== "[\"true\"]";
                    });
                    if (!allQueries) {
                        return this.$q.when({ data: [] });
                    }
                    allQueries.forEach(function (_a) {
                        var query = _a.query;
                        query.range = timeFilter;
                        var adhocFilters = _this.templateSrv.getAdhocFilters(_this.settings.name);
                        if (adhocFilters.length > 0) {
                            query.filter.push(queryModel.renderAdhocFilters(adhocFilters));
                        }
                    });
                    var batchQuery = { queries: {} };
                    allQueries.forEach(function (_a, index) {
                        var query = _a.query, refId = _a.refId;
                        batchQuery.queries[refId] = query;
                    });
                    return this.doRequest("/query/batch", { method: "POST", data: batchQuery })
                        .then(function (data) {
                        var limits = {};
                        var errors = {};
                        var results = data.data.results;
                        var output = lodash_1.default.flatMap(results, function (resultValue, refId) {
                            limits[refId] = resultValue.limits;
                            errors[refId] = resultValue.errors;
                            var target = targetsByRef[refId];
                            var alias = target.alias;
                            var query = data.config.data.queries[refId];
                            if (alias) {
                                alias = _this.templateSrv.replaceWithText(alias, options.scopedVars);
                            }
                            var heroicSeries = new heroic_series_1.default({ series: resultValue, alias: alias, templateSrv: _this.templateSrv, resolution: target.queryResolution });
                            switch (targetsByRef[refId].resultFormat) {
                                case "table": {
                                    var tableData = heroicSeries.getTable();
                                    tableData.refId = target.refId;
                                    return tableData;
                                }
                                default: {
                                    return heroicSeries.getTimeSeries(target.refId);
                                }
                            }
                        });
                        return { data: output };
                    });
                };
                HeroicDatasource.prototype.annotationQuery = function (options) {
                    var queryModel = new heroic_query_1.default({ tags: options.annotation.tags }, this.templateSrv, {});
                    var currentFilter = queryModel.buildCurrentFilter(true, false);
                    var query = {
                        filter: currentFilter,
                        aggregators: [],
                        features: ["com.spotify.heroic.distributed_aggregations"],
                        range: {},
                    };
                    query.range = this.getTimeFilter(options);
                    return this.doRequest("/query/metrics", { method: "POST", data: query })
                        .then(function (data) {
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
                HeroicDatasource.prototype.doRequestWithHeaders = function (path, options, headers) {
                    options = options || {};
                    options.headers = headers;
                    options.url = this.settings.url + path;
                    options.inspect = { type: "heroic" };
                    return this.backendSrv.datasourceRequest(options);
                };
                HeroicDatasource.prototype.doRequest = function (path, options) {
                    var headers = { "Content-Type": "application/json;charset=UTF-8" };
                    return this.doRequestWithHeaders(path, options, headers);
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
                    if (typeof date === "string") {
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
            }());
            exports_1("default", HeroicDatasource);
        }
    };
});
//# sourceMappingURL=datasource.js.map