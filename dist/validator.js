System.register(["lodash"], function (exports_1, context_1) {
    "use strict";
    var lodash_1, HeroicValidator;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }
        ],
        execute: function () {
            HeroicValidator = (function () {
                function HeroicValidator(target, tagAggregationChecks, tagCollapseChecks) {
                    this.target = target;
                    this.tagAggregationChecks = tagAggregationChecks;
                    this.tagCollapseChecks = tagCollapseChecks;
                }
                HeroicValidator.prototype.findUnsafeCollapses = function (data) {
                    var collapsedKeys = lodash_1.default.uniq(lodash_1.default.flatMap(this.tagCollapseChecks, function (value) {
                        return data.filter(function (_a) {
                            var meta = _a.meta;
                            var valueCount = meta.scoped["tag_" + value + "_count"];
                            return valueCount
                                && valueCount.text !== "<0>"
                                && valueCount.text !== "<1>";
                        }).map(function (item) { return value; });
                    }));
                    return collapsedKeys;
                };
                HeroicValidator.prototype.findUnsafeAggregations = function (data) {
                    var hasAggregations = this.target.select[0].filter(function (select) { return select.type !== "min" && select.type !== "max"; }).length > 0;
                    if (!hasAggregations) {
                        return false;
                    }
                    var badTags = lodash_1.default.uniq(lodash_1.default.flatMap(this.tagAggregationChecks, function (value, key) {
                        return data.filter(function (_a) {
                            var meta = _a.meta;
                            return meta.scoped["tag_" + key] !== undefined
                                && lodash_1.default.includes(value, meta.scoped["tag_" + key].text);
                        }).map(function (_a) {
                            var meta = _a.meta;
                            return key + ":" + meta.scoped["tag_" + key].text;
                        });
                    }));
                    return badTags;
                };
                HeroicValidator.prototype.checkForWarnings = function (data) {
                    var _this = this;
                    var warnings = [];
                    var badTags = this.findUnsafeAggregations(data);
                    if (badTags.length > 0) {
                        var message = void 0;
                        if (badTags.length === 1) {
                            message = "'" + badTags[0] + "'";
                        }
                        else {
                            message = "any of '" + badTags.join('\',\'') + "'";
                        }
                        warnings.push("Aggregating <strong>" + message + "</strong> can cause misleading results.");
                    }
                    var collapsedKeys = this.findUnsafeCollapses(data);
                    if (collapsedKeys.length > 0) {
                        var message = void 0;
                        if (collapsedKeys.length == 1) {
                            message = "Aggregating several <strong>'" + collapsedKeys[0] + "'</strong> is probably not what you want. Filter on a single '" + collapsedKeys[0] + "' or group by '" + collapsedKeys[0] + "' in an aggregation.";
                        }
                        else {
                            message = "Aggregating several of keys <strong>'" + collapsedKeys.slice(0, collapsedKeys.length - 1).join('\', \'') + "' or '" + collapsedKeys[collapsedKeys.length - 1] + "'</strong> " +
                                'is probably not what you want. For each key, add a filter or group by aggregation.';
                        }
                        warnings.push(message);
                    }
                    lodash_1.default.uniqBy(data, function (s) { return s.refId; }).forEach(function (series, refId) {
                        series.meta.limits.forEach(function (limit) {
                            switch (limit) {
                                case 'SERIES':
                                    warnings.push('Query would fetch too many time series. Try to add more filters.');
                                    break;
                                case 'GROUP':
                                    var containsGroupBys_1 = false;
                                    _this.target.select[0].forEach(function (select) {
                                        containsGroupBys_1 = containsGroupBys_1 || select.params.length > 0;
                                    });
                                    if (containsGroupBys_1) {
                                        warnings.push('Query would fetch too many time series. Try adding more filters or group by fewer tags to get fewer resulting time series');
                                    }
                                    else {
                                        warnings.push('Query would fetch too many time series. Try adding more filters or adding a Group aggregation to get fewer resulting time series');
                                    }
                                    break;
                                case 'QUOTA':
                                    warnings.push('Query would fetch too many metrics. Try to reduce the time range or add more filters to get fewer resulting metrics.');
                                    break;
                                case 'AGGREGATION':
                                    if (_this.target.select.length === 0) {
                                        warnings.push('Query would aggregate too many metrics. Try add a sampling aggregation, like Average, Min, Max, or Sum');
                                    }
                                    else {
                                        warnings.push('Query would aggregate too many metrics. Try decreasing the resolution, like changing 1 minute to 1 hour');
                                    }
                                    break;
                            }
                        });
                    });
                    return warnings.join("<br>");
                };
                return HeroicValidator;
            }());
            exports_1("HeroicValidator", HeroicValidator);
        }
    };
});
//# sourceMappingURL=validator.js.map