System.register(["angular", "lodash", "./heroic_query", "./lru_cache"], function (exports_1, context_1) {
    "use strict";
    var __spreadArrays = (this && this.__spreadArrays) || function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };
    var angular_1, lodash_1, heroic_query_1, lru_cache_1, MetadataClient;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
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
            }
        ],
        execute: function () {
            MetadataClient = (function () {
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
                            limit: 100,
                        };
                        var cacheKey = JSON.stringify(filter);
                        if (_this.lruKey.has(cacheKey)) {
                            return Promise.resolve(_this.lruKey.get(cacheKey));
                        }
                        return _this.datasource
                            .doRequest("/metadata/key-suggest", { method: "POST", data: filter })
                            .then(function (result) {
                            return _this.transformToSegments(true, "key")(result.data.suggestions);
                        })
                            .then(function (result) {
                            _this.lruKey.put(cacheKey, result);
                            return result;
                        });
                    };
                    this.newLockedOperator = function (operator) {
                        return _this.controller.uiSegmentSrv.newSegment({
                            value: operator,
                            type: 'operator',
                            cssClass: 'query-segment-operator',
                            custom: 'false'
                        });
                    };
                    this.tagKeyCount = function (segment, index, $query, includeRemove) {
                        var query = $query || segment.query;
                        var tagsCopy = __spreadArrays(_this.queryModel.target.tags);
                        var key;
                        var operator;
                        var value;
                        key = segment.value;
                        operator = _this.tagSegments[index + 1].value;
                        value = _this.tagSegments[index + 2].value;
                        var item = lodash_1.default.findIndex(_this.queryModel.target.tags, function (tag) {
                            return tag.operator === operator && tag.key === key && tag.value === value;
                        });
                        var filter = _this.queryModel.buildFilter(tagsCopy, _this.includeVariables, _this.includeScopes);
                        var data = {
                            filter: filter,
                            limit: 100,
                        };
                        var cache = _this.lruTagKeyCount;
                        var cacheKey = JSON.stringify(data);
                        if (cache.has(cacheKey)) {
                            return Promise.resolve(cache.get(cacheKey));
                        }
                        return _this.datasource
                            .doRequest("/metadata/tagkey-count", { method: "POST", data: data })
                            .then(function (result) {
                            var seen = new Set();
                            return result.data.suggestions;
                        }).then(_this.transformToSegments(true, "key"))
                            .then(function (results) {
                            if (segment.type === "key" && includeRemove) {
                                results.splice(0, 0, angular_1.default.copy(_this.removeTagFilterSegment));
                            }
                            cache.put(cacheKey, results);
                            return results;
                        });
                    };
                    this.getTagsOrValues = function (segment, index, $query, includeRemove) {
                        var query = $query || segment.query;
                        if (segment.type === "condition") {
                            return _this.controller.$q.when([_this.controller.uiSegmentSrv.newCondition("AND")]);
                        }
                        if (segment.type === "operator") {
                            var nextValue = _this.tagSegments[index + 1].value;
                            var operators = ["=", "!=", "^", "!^"].map(_this.newLockedOperator);
                            return _this.controller.$q.when(operators);
                        }
                        var tagsCopy = __spreadArrays(_this.queryModel.target.tags);
                        if (segment.type === "value" || (segment.type === "key")) {
                            var key_1;
                            var operator_1;
                            var value_1;
                            if (segment.type === "key") {
                                key_1 = segment.value;
                                operator_1 = _this.tagSegments[index + 1].value;
                                value_1 = _this.tagSegments[index + 2].value;
                            }
                            else {
                                key_1 = _this.tagSegments[index - 2].value;
                                operator_1 = _this.tagSegments[index - 1].value;
                                value_1 = segment.value;
                            }
                            var item = lodash_1.default.findIndex(_this.queryModel.target.tags, function (tag) {
                                return tag.operator === operator_1 && tag.key === key_1 && tag.value === value_1;
                            });
                            tagsCopy.splice(item, 1);
                        }
                        var filter = _this.queryModel.buildFilter(tagsCopy, _this.includeVariables, _this.includeScopes);
                        var data = {
                            filter: filter,
                            limit: 100,
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
                            if (key === "$key") {
                                return _this.getMeasurements(query);
                            }
                            data.key = key;
                            data["value"] = query;
                            return _this.queryTagsAndValues(data, "value", _this.lruTagValue)
                                .then(_this.transformToSegments(true, "value"));
                        }
                    };
                    this.validateCustomQuery = lodash_1.default.debounce(function (segment, index, query, includeRemove) {
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
                    }, MetadataClient.DEBOUNCE_MS, { leading: false });
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
                    this.createTagSegments();
                    this.lruTag = new lru_cache_1.LruCache();
                    this.lruTagValue = new lru_cache_1.LruCache();
                    this.lruKey = new lru_cache_1.LruCache();
                    this.lruTagKeyCount = new lru_cache_1.LruCache();
                    this.queryModel = new heroic_query_1.default(this.target, this.controller.templateSrv, this.scopedVars);
                    this.includeVariables = includeVariables;
                    this.includeScopes = includeScopes;
                    this.addCustomQuery = this.controller.uiSegmentSrv.newPlusButton();
                    this.removeTagFilterSegment = this.controller.uiSegmentSrv.newSegment({
                        fake: true,
                        value: "-- remove --",
                    });
                }
                MetadataClient.prototype.createTagSegments = function () {
                    var tagSegments = [];
                    var customTagSegments = [];
                    if (!this.controller.fakeController) {
                        var controllerTags = this.controller.getTags();
                        controllerTags.sort(function (a, b) {
                            if (a.key === "$key" && b.key === "$key") {
                                return 0;
                            }
                            else if (a.key === "$key") {
                                return -1;
                            }
                            else if (b.key === "$key") {
                                return 1;
                            }
                            return 0;
                        });
                        controllerTags.forEach(function (tag, index) {
                            if (index > 0) {
                                tag.condition = "AND";
                            }
                            else {
                                delete tag.condition;
                            }
                        });
                        for (var _i = 0, controllerTags_1 = controllerTags; _i < controllerTags_1.length; _i++) {
                            var tag = controllerTags_1[_i];
                            if (tag.type && tag.type === "custom") {
                                var newSeg = this.controller.uiSegmentSrv.newSegment({ value: tag.key, expandable: false });
                                newSeg.valid = true;
                                customTagSegments.push(newSeg);
                                continue;
                            }
                            if (!tag.operator) {
                                tag.operator = "=";
                            }
                            if (tag.condition) {
                                tagSegments.push(this.controller.uiSegmentSrv.newCondition(tag.condition));
                            }
                            tagSegments.push(this.controller.uiSegmentSrv.newKey(tag.key));
                            tagSegments.push(this.newLockedOperator(tag.operator));
                            tagSegments.push(this.controller.uiSegmentSrv.newKeyValue(tag.value));
                        }
                        this.tagSegments = tagSegments;
                        this.customTagSegments = customTagSegments;
                        this.fixTagSegments();
                    }
                };
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
                            this.tagSegments.push(this.newLockedOperator("="));
                            this.tagSegments.push(this.controller.uiSegmentSrv.newFake("select tag value", "value", "query-segment-value"));
                            this.tagSegments[this.tagSegments.length - 1].focus = true;
                            segment.type = "key";
                            segment.cssClass = "query-segment-key";
                        }
                        if (index + 1 === this.tagSegments.length) {
                            this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
                            this.tagSegments[this.tagSegments.length - 1].focus = true;
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
                MetadataClient.DEBOUNCE_MS = 1000;
                return MetadataClient;
            }());
            exports_1("MetadataClient", MetadataClient);
        }
    };
});
//# sourceMappingURL=metadata_client.js.map