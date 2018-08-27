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
                function MetadataClient(controller, datasource, scopedVars, target, includeVariables, includeScopes) {
                    var _this = this;
                    this.controller = controller;
                    this.datasource = datasource;
                    this.scopedVars = scopedVars;
                    this.target = target;
                    this.includeVariables = includeVariables;
                    this.includeScopes = includeScopes;
                    this.getMeasurements = function (measurementFilter) {
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
                    };
                    this.getTagsOrValues = function (segment, index, query, includeRemove) {
                        if (segment.type === "condition") {
                            return _this.controller.$q.when([_this.controller.uiSegmentSrv.newSegment("AND")]);
                        }
                        if (segment.type === "operator") {
                            var nextValue = _this.tagSegments[index + 1].value;
                            return _this.controller.$q.when(_this.controller.uiSegmentSrv.newOperators(["=", "!=", "^", "!^"]));
                        }
                        var tagsCopy = _this.queryModel.target.tags.slice();
                        if (segment.type === "value") {
                            tagsCopy = tagsCopy.splice(0, tagsCopy.length - 1);
                        }
                        var filter = _this.queryModel.buildFilter(tagsCopy, _this.includeVariables, _this.includeScopes); // do not include scoped variables
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
                    };
                    this.validateCustomQuery = function (segment, index, query, includeRemove) {
                        segment.style = { color: "red" };
                        var headers = { "Content-Type": "text/plain;charset=UTF-8" };
                        return _this.datasource
                            .doRequestWithHeaders("/parser/parse-filter", { method: "POST", data: query }, headers)
                            .then(function (result) {
                            segment.valid = true;
                            segment.cssClass = "";
                            _this.complexError = null;
                            return [];
                        }, function (error) {
                            segment.valid = false;
                            segment.cssClass = "text-error";
                            _this.complexError = "Complex filter contains invalid syntax. See help dropdown.";
                            return [];
                        })
                            .then(function (result) {
                            result.splice(0, 0, angular_1.default.copy(_this.removeTagFilterSegment));
                            return result;
                        });
                    };
                    this.createCustomQuery = function () {
                        _this.customTagSegments.push(_this.controller.uiSegmentSrv.newSegment({ value: "--custom--", valid: false, expandable: false }));
                    };
                    this.customFilterChanged = function (segment, index) {
                        if (segment.value === _this.removeTagFilterSegment.value) {
                            _this.customTagSegments.splice(index, 1);
                        }
                        _this.rebuildTargetTagConditions();
                    };
                    this.tagSegments = [];
                    this.customTagSegments = [];
                    if (!this.controller.fakeController) {
                        for (var _i = 0, _a = this.controller.getTags(); _i < _a.length; _i++) {
                            var tag = _a[_i];
                            if (tag.type && tag.type === "custom") {
                                var newSeg = this.controller.uiSegmentSrv.newSegment({ value: tag.key, expandable: false });
                                newSeg.valid = true;
                                this.customTagSegments.push(newSeg);
                                continue;
                            }
                            if (!tag.operator) {
                                tag.operator = "=";
                            }
                            if (tag.condition) {
                                this.tagSegments.push(this.controller.uiSegmentSrv.newCondition(tag.condition));
                            }
                            this.tagSegments.push(this.controller.uiSegmentSrv.newKey(tag.key));
                            this.tagSegments.push(this.controller.uiSegmentSrv.newOperator(tag.operator));
                            this.tagSegments.push(this.controller.uiSegmentSrv.newKeyValue(tag.value));
                        }
                        this.fixTagSegments();
                    }
                    this.lruTag = new lru_cache_1.LruCache();
                    this.lruTagValue = new lru_cache_1.LruCache();
                    this.keyLru = new lru_cache_1.LruCache();
                    this.queryModel = new heroic_query_1.default(this.target, this.controller.templateSrv, this.scopedVars);
                    this.includeVariables = includeVariables;
                    this.includeScopes = includeScopes;
                    this.addCustomQuery = this.controller.uiSegmentSrv.newPlusButton();
                    this.removeTagFilterSegment = this.controller.uiSegmentSrv.newSegment({
                        fake: true,
                        value: "-- remove --",
                    });
                }
                MetadataClient.prototype.fixTagSegments = function () {
                    var count = this.tagSegments.length;
                    var lastSegment = this.tagSegments[Math.max(count - 1, 0)];
                    if (!lastSegment || lastSegment.type !== "plus-button") {
                        this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
                    }
                };
                MetadataClient.prototype.handleQueryError = function (err) {
                    this.error = err.message || "Failed to issue metric query";
                    return [];
                };
                MetadataClient.prototype.transformToSegments = function (addTemplateVars, segmentKey) {
                    var _this = this;
                    return function (results) {
                        var segments = lodash_1.default.map(results, function (segment) {
                            return _this.controller.uiSegmentSrv.newSegment({
                                value: segment[segmentKey],
                                expandable: false,
                            });
                        });
                        if (addTemplateVars) {
                            for (var _i = 0, _a = _this.controller.templateSrv.variables; _i < _a.length; _i++) {
                                var variable = _a[_i];
                                segments.unshift(_this.controller.uiSegmentSrv.newSegment({
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
                MetadataClient.prototype.tagSegmentUpdated = function (segment, index) {
                    this.tagSegments[index] = segment;
                    // AND, Z, =, A, AND, B, =, C,  AND, D, =,  E]
                    // 3  , 4, 5, 6, 7,   8, 9, 10, 11, 12, 13, 14]
                    // handle remove tag condition
                    if (segment.value === this.removeTagFilterSegment.value) {
                        this.tagSegments.splice(index, 3);
                        if (this.tagSegments.length === 0) {
                            this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
                        }
                        else if (this.tagSegments.length > 2) {
                            this.tagSegments.splice(Math.max(index - 1, 0), 1);
                            if (this.tagSegments[this.tagSegments.length - 1].type !== "plus-button") {
                                this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
                            }
                        }
                    }
                    else {
                        if (segment.type === "plus-button") {
                            if (index > 2) {
                                this.tagSegments.splice(index, 0, this.controller.uiSegmentSrv.newCondition("AND"));
                            }
                            this.tagSegments.push(this.controller.uiSegmentSrv.newOperator("="));
                            this.tagSegments.push(this.controller.uiSegmentSrv.newFake("select tag value", "value", "query-segment-value"));
                            segment.type = "key";
                            segment.cssClass = "query-segment-key";
                        }
                        if (index + 1 === this.tagSegments.length) {
                            this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
                        }
                    }
                    this.rebuildTargetTagConditions();
                };
                MetadataClient.prototype.rebuildTargetTagConditions = function () {
                    var _this = this;
                    var tags = [];
                    var tagIndex = 0;
                    var tagOperator = "";
                    lodash_1.default.each(this.tagSegments, function (segment2, index) {
                        if (segment2.type === "key") {
                            if (tags.length === 0) {
                                tags.push({});
                            }
                            tags[tagIndex].key = segment2.value;
                        }
                        else if (segment2.type === "value") {
                            tagOperator = _this.getTagValueOperator(segment2.value, tags[tagIndex].operator);
                            if (tagOperator) {
                                _this.tagSegments[index - 1] = _this.controller.uiSegmentSrv.newOperator(tagOperator);
                                tags[tagIndex].operator = tagOperator;
                            }
                            tags[tagIndex].value = segment2.value;
                        }
                        else if (segment2.type === "condition") {
                            tags.push({ condition: segment2.value });
                            tagIndex += 1;
                        }
                        else if (segment2.type === "operator") {
                            tags[tagIndex].operator = segment2.value;
                        }
                    });
                    lodash_1.default.each(this.customTagSegments, function (segment, index) {
                        if (segment.valid) {
                            tags.push({ operator: "q", type: "custom", key: segment.value });
                        }
                    });
                    this.controller.setTags(tags);
                    this.controller.refresh();
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