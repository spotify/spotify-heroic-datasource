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
System.register(["angular", "lodash", "./heroic_query", "./lru_cache"], function(exports_1) {
    var angular_1, lodash_1, heroic_query_1, lru_cache_1;
    var MetadataClient;
    return {
        setters:[
            function (angular_1_1) {
                angular_1 = angular_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (heroic_query_1_1) {
                heroic_query_1 = heroic_query_1_1;
            },
            function (lru_cache_1_1) {
                lru_cache_1 = lru_cache_1_1;
            }],
        execute: function() {
            MetadataClient = (function () {
                /** @ngInject **/
                function MetadataClient(datasource, uiSegmentSrv, templateSrv, $q, scopedVars, target, removeTagFilterSegment, tagSegments, includeVariables, includeScopes) {
                    var _this = this;
                    this.datasource = datasource;
                    this.uiSegmentSrv = uiSegmentSrv;
                    this.templateSrv = templateSrv;
                    this.$q = $q;
                    this.scopedVars = scopedVars;
                    this.target = target;
                    this.removeTagFilterSegment = removeTagFilterSegment;
                    this.tagSegments = tagSegments;
                    this.includeVariables = includeVariables;
                    this.includeScopes = includeScopes;
                    this.getMeasurements = lodash_1.default.debounce((function (measurementFilter) {
                        var filter = {
                            key: measurementFilter,
                            filter: _this.queryModel.buildCurrentFilter(_this.includeVariables, _this.includeScopes),
                            limit: 10,
                        };
                        var cacheKey = JSON.stringify(filter);
                        if (_this.keyLru.has(cacheKey)) {
                            return Promise.resolve(_this.keyLru.get(cacheKey));
                        }
                        return _this.datasource
                            .doRequest("/metadata/key-suggest", { method: "POST", data: filter })
                            .then(function (result) {
                            return _this.transformToSegments(true, "key")(result.data.suggestions);
                        })
                            .then(function (result) {
                            _this.keyLru.put(cacheKey, result);
                            return result;
                        });
                    }), MetadataClient.DEBOUNCE_MS, { leading: true });
                    this.getTagsOrValues = lodash_1.default.debounce((function (segment, index, query, includeRemove) {
                        if (segment.type === "condition") {
                            return _this.$q.when([_this.uiSegmentSrv.newSegment("AND"), _this.uiSegmentSrv.newSegment("OR")]);
                        }
                        if (segment.type === "operator") {
                            var nextValue = _this.tagSegments[index + 1].value;
                            if (/^\/.*\/$/.test(nextValue)) {
                                return _this.$q.when(_this.uiSegmentSrv.newOperators(["=~", "!~"]));
                            }
                            else {
                                return _this.$q.when(_this.uiSegmentSrv.newOperators(["=", "!=", "<>", "<", ">"]));
                            }
                        }
                        var filter = _this.queryModel.buildCurrentFilter(_this.includeVariables, _this.includeScopes); // do not include scoped variables
                        var data = {
                            filter: filter,
                            limit: 25,
                            key: null
                        };
                        if (segment.type === "key" || segment.type === "plus-button") {
                            data.key = query;
                            return _this.queryTagsAndValues(data, "key", _this.lruTag)
                                .then(_this.transformToSegments(true, "key"))
                                .then(function (results) {
                                if (segment.type === "key" && includeRemove) {
                                    results.splice(0, 0, angular_1.default.copy(_this.removeTagFilterSegment));
                                }
                                return results;
                            });
                        }
                        else if (segment.type === "value") {
                            var key = _this.tagSegments[index - 2].value;
                            if (key === "$key")
                                return _this.getMeasurements(query);
                            data.key = key;
                            data["value"] = query;
                            return _this.queryTagsAndValues(data, "value", _this.lruTagValue)
                                .then(_this.transformToSegments(true, "value"));
                        }
                    }), MetadataClient.DEBOUNCE_MS, { leading: true });
                    this.lruTag = new lru_cache_1.LruCache();
                    this.lruTagValue = new lru_cache_1.LruCache();
                    this.keyLru = new lru_cache_1.LruCache();
                    this.queryModel = new heroic_query_1.default(this.target, templateSrv, this.scopedVars);
                    this.removeTagFilterSegment = removeTagFilterSegment;
                    this.includeVariables = includeVariables;
                    this.includeScopes = includeScopes;
                }
                MetadataClient.prototype.handleQueryError = function (err) {
                    this.error = err.message || "Failed to issue metric query";
                    return [];
                };
                MetadataClient.prototype.transformToSegments = function (addTemplateVars, segmentKey) {
                    var _this = this;
                    return function (results) {
                        var segments = lodash_1.default.map(results, function (segment) {
                            return _this.uiSegmentSrv.newSegment({
                                value: segment[segmentKey],
                                expandable: false,
                            });
                        });
                        if (addTemplateVars) {
                            for (var _i = 0, _a = _this.templateSrv.variables; _i < _a.length; _i++) {
                                var variable = _a[_i];
                                segments.unshift(_this.uiSegmentSrv.newSegment({
                                    type: "value",
                                    value: "$" + variable.name,
                                    expandable: false,
                                }));
                            }
                        }
                        return segments;
                    };
                };
                MetadataClient.prototype.queryTagsAndValues = function (data, dedupe, cache) {
                    var cacheKey = JSON.stringify(data);
                    if (cache.has(cacheKey)) {
                        return Promise.resolve(cache.get(cacheKey));
                    }
                    return this.datasource
                        .doRequest("/metadata/tag-suggest", { method: "POST", data: data })
                        .then(function (result) {
                        var seen = new Set();
                        return result.data.suggestions
                            .filter(function (suggestion) {
                            if (seen.has(suggestion[dedupe])) {
                                return false;
                            }
                            seen.add(suggestion[dedupe]);
                            return true;
                        });
                    })
                        .then(function (result) {
                        cache.put(cacheKey, result);
                        return result;
                    });
                };
                MetadataClient.prototype.getTagValueOperator = function (tagValue, tagOperator) {
                    if (tagOperator !== "=~" && tagOperator !== "!~" && /^\/.*\/$/.test(tagValue)) {
                        return "=~";
                    }
                    else if ((tagOperator === "=~" || tagOperator === "!~") && /^(?!\/.*\/$)/.test(tagValue)) {
                        return "=";
                    }
                    return null;
                };
                MetadataClient.templateUrl = "partials/query.editor.html";
                MetadataClient.DEBOUNCE_MS = 500; // milliseconds to wait between keystrokes before sending queries for metadata
                return MetadataClient;
            })();
            exports_1("MetadataClient", MetadataClient);
        }
    }
});
//# sourceMappingURL=metadata_client.js.map