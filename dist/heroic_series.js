System.register(["app/core/table_model", "lodash"], function (exports_1, context_1) {
    "use strict";
    var table_model_1, lodash_1, HeroicSeries;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (table_model_1_1) {
                table_model_1 = table_model_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }
        ],
        execute: function () {
            HeroicSeries = (function () {
                function HeroicSeries(options) {
                    this.resultData = options.series;
                    this.alias = options.alias;
                    this.annotation = options.annotation;
                    this.templateSrv = options.templateSrv;
                    this.queryResolution = options.resolution;
                }
                HeroicSeries.prototype._convertData = function (dataPoint) {
                    return [dataPoint[1], dataPoint[0]];
                };
                HeroicSeries.prototype.getMinFromResults = function (results) {
                    return lodash_1.default.min(results.map(function (series) {
                        if (series.values.length > 0) {
                            return series.values[0][0];
                        }
                        else {
                            return null;
                        }
                    }));
                };
                HeroicSeries.prototype.getMaxFromResults = function (results) {
                    return lodash_1.default.max(results.map(function (series) {
                        if (series.values.length > 0) {
                            return series.values[series.values.length - 1][0];
                        }
                        else {
                            return null;
                        }
                    }));
                };
                HeroicSeries.prototype.fillTimeSeries = function (series, min, max, step) {
                    var fillWith = null;
                    var curr = min;
                    var before = [];
                    while (curr < series.values[0][0]) {
                        before.push([curr, fillWith]);
                        curr += step;
                    }
                    var after = [];
                    curr = series.values[series.values.length - 1][0] + step;
                    while (curr < max) {
                        after.push([curr, fillWith]);
                        curr += step;
                    }
                    var index = 0;
                    var newValues = [];
                    while (index < series.values.length - 1) {
                        newValues.push(series.values[index]);
                        var currentValue = series.values[index][0];
                        var nextValue = series.values[index + 1][0];
                        if ((nextValue - currentValue) === step) {
                            index += 1;
                            continue;
                        }
                        else {
                            var iterations = (nextValue - currentValue) / step;
                            for (var i = 1; i < iterations; i += 1) {
                                newValues.push([currentValue + (step * i), fillWith]);
                            }
                            index += 1;
                        }
                    }
                    newValues.push(series.values[series.values.length - 1]);
                    var withBefore = before.concat(newValues);
                    var withAfter = withBefore.concat(after);
                    series.values = withAfter;
                };
                HeroicSeries.prototype.getTimeSeries = function (refId) {
                    var _this = this;
                    var min = this.getMinFromResults(this.resultData.result);
                    var max = this.getMaxFromResults(this.resultData.result);
                    var _a = this.resultData, limits = _a.limits, errors = _a.errors;
                    if (this.resultData.result.length === 0) {
                        return [{
                                refId: refId,
                                target: undefined,
                                datapoints: [],
                                scoped: {},
                                limits: limits,
                                errors: errors
                            }];
                    }
                    var commonCounts = {};
                    this.resultData.result.forEach(function (series) {
                        lodash_1.default.forEach(series.tags, function (value, key) {
                            if (commonCounts[key] === undefined) {
                                commonCounts[key] = {};
                            }
                            if (commonCounts[key][value] === undefined) {
                                commonCounts[key][value] = 0;
                            }
                            commonCounts[key][value] += 1;
                        });
                    });
                    var defaultAlias = this.resultData.result.length > 1 ? "$tags" : "$fullTags";
                    return this.resultData.result.map(function (series) {
                        if (_this.queryResolution) {
                            _this.fillTimeSeries(series, min, max, _this.queryResolution * 1000);
                        }
                        var scoped = _this.buildScoped(series, commonCounts, _this.resultData.result.length);
                        var target = _this.templateSrv.replaceWithText(_this.alias || defaultAlias, scoped);
                        var datapoints = series.values.map(_this._convertData);
                        return { refId: refId, target: target, datapoints: datapoints, scoped: scoped, limits: limits, errors: errors };
                    });
                };
                HeroicSeries.prototype.getAnnotations = function () {
                    var _this = this;
                    var list = [];
                    var tagsColumnList = (this.annotation.tagsColumn || "").replace(/\s/g, "").split(",");
                    lodash_1.default.each(this.resultData, function (series) {
                        var titleCol = null;
                        var tagsCol = [];
                        var textCol = null;
                        lodash_1.default.each(series.tags, function (value, column) {
                            if (column === "sequence_number") {
                                return;
                            }
                            if (column === _this.annotation.titleColumn) {
                                titleCol = column;
                                return;
                            }
                            if (lodash_1.default.includes(tagsColumnList, column)) {
                                tagsCol.push(column);
                                return;
                            }
                            if (column === _this.annotation.textColumn) {
                                textCol = column;
                                return;
                            }
                        });
                        lodash_1.default.each(series.values, function (value, index) {
                            var data = {
                                annotation: _this.annotation,
                                time: +new Date(value[0]),
                                title: series.tags[titleCol],
                                tags: lodash_1.default.uniq(lodash_1.default.flatten(tagsCol
                                    .filter(function (t) {
                                    return series.tags[t];
                                })
                                    .map(function (t) {
                                    return series.tags[t].split(",");
                                }))),
                                text: series.tags[textCol],
                            };
                            if (_this.annotation.ranged) {
                                data['regionId'] = series.hash + "-" + index;
                                var dataCopy = Object.assign({}, data);
                                switch (_this.annotation.rangeType) {
                                    case "endTimeSeconds":
                                        dataCopy.time = +new Date(value[1] * 1000);
                                        break;
                                    case "durationMs":
                                        dataCopy.time = +new Date(value[0] + value[1]);
                                        break;
                                    case "durationSeconds":
                                        dataCopy.time = +new Date(value[0] + (value[1] * 1000));
                                        break;
                                    case "endTimeMs":
                                    default:
                                        dataCopy.time = +new Date(value[1]);
                                }
                                list.push(data);
                                list.push(dataCopy);
                            }
                            else {
                                list.push(data);
                            }
                        });
                    });
                    return list;
                };
                HeroicSeries.prototype.getTable = function () {
                    var table = new table_model_1.default();
                    if (this.resultData.result.length === 0) {
                        return table;
                    }
                    table.columns = [{ text: "Time", type: "time" }, { text: "Value", type: "value" }].concat(Object.keys(this.resultData.commonTags).map(function (key) {
                        return { text: key, type: key };
                    }));
                    lodash_1.default.each(this.resultData.result, function (series, seriesIndex) {
                        if (series.values) {
                            for (var k = 0; k < series.values.length; k++) {
                                var values = series.values[k];
                                var reordered = [values[0], values[1]];
                                if (series.tags) {
                                    reordered.push.apply(reordered, table.columns
                                        .filter(function (column) { return column.type !== "time" && column.type !== "value"; })
                                        .map(function (column) { return series.tags[column.type]; }));
                                }
                                table.rows.push(reordered);
                            }
                        }
                    });
                    return table;
                };
                HeroicSeries.prototype.buildScopedHelper = function (scoped, counts, tags, common) {
                    for (var tk in counts) {
                        scoped["tag_" + tk] = { text: "<" + counts[tk] + ">" };
                        scoped["{tag_" + tk + "_count"] = { text: "<" + counts[tk] + ">" };
                    }
                    for (var t in tags) {
                        scoped["tag_" + t] = { text: tags[t] };
                        scoped["tag_" + t + "_count"] = { text: "<" + 1 + ">" };
                    }
                    for (var c in common) {
                        if (tags[c]) {
                            continue;
                        }
                        scoped["tag_" + c] = { text: common[c] };
                        scoped["tag_" + c + "_count"] = { text: "<" + common[c].length + ">" };
                    }
                };
                HeroicSeries.prototype.buildScoped = function (group, counts, total) {
                    var scoped = { tags: { text: "" }, fullTags: { text: "" } };
                    this.buildScopedHelper(scoped, group.tagCounts, group.tags, this.resultData.commonTags);
                    this.buildScopedHelper(scoped, group.resourceCounts, group.resource, this.resultData.commonResource);
                    var reducedTags = {};
                    lodash_1.default.forEach(group.tags, function (value, key) {
                        if (counts[key][value] < total) {
                            reducedTags[key] = value;
                        }
                    });
                    var reducedTagsString = this.buildTags(reducedTags, group.tagCounts);
                    var tagsString = this.buildTags(group.tags, group.tagCounts);
                    var resourceString = this.buildTags(group.resource, group.resourceCounts);
                    if (resourceString) {
                        scoped.fullTags.text = [tagsString, resourceString].join(",");
                        scoped.tags.text = [reducedTagsString, resourceString].join(",");
                    }
                    else {
                        scoped.fullTags.text = tagsString;
                        scoped.tags.text = reducedTagsString;
                    }
                    return scoped;
                };
                HeroicSeries.prototype.buildTags = function (tags, tagCounts) {
                    var parts = [];
                    for (var k in tags) {
                        parts.push(this.quoteString(k) + "=" + this.quoteString(tags[k]));
                    }
                    for (var tk in tagCounts) {
                        parts.push(this.quoteString(tk) + "=" + ("<" + tagCounts[tk] + ">"));
                    }
                    return parts.join(", ");
                };
                HeroicSeries.prototype.quoteString = function (s) {
                    var quoted = false;
                    var result = [];
                    for (var i = 0, l = s.length; i < l; i++) {
                        var c = s[i];
                        if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")
                            || (c >= "0" && c <= "9") || c === "/" || c === ":" || c === "-") {
                            result.push(c);
                            continue;
                        }
                        switch (c) {
                            case "\b":
                                result.push("\\b");
                                break;
                            case "\t":
                                result.push("\\t");
                                break;
                            case "\n":
                                result.push("\\n");
                                break;
                            case "\f":
                                result.push("\\f");
                                break;
                            case "\r":
                                result.push("\\r");
                                break;
                            case "'":
                                result.push("\\'");
                                break;
                            case "\\":
                                result.push("\\\\");
                                break;
                            case "\"":
                                result.push("\\\"");
                                break;
                            default:
                                result.push(c);
                                break;
                        }
                        quoted = true;
                    }
                    if (quoted) {
                        return "\"" + result.join("") + "\"";
                    }
                    return result.join("");
                };
                return HeroicSeries;
            }());
            exports_1("default", HeroicSeries);
        }
    };
});
//# sourceMappingURL=heroic_series.js.map