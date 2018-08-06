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
System.register(["app/core/table_model", "lodash"], function(exports_1) {
    var table_model_1, lodash_1;
    var HeroicSeries;
    return {
        setters:[
            function (table_model_1_1) {
                table_model_1 = table_model_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }],
        execute: function() {
            HeroicSeries = (function () {
                function HeroicSeries(options) {
                    this.series = options.series;
                    this.alias = options.alias;
                    this.annotation = options.annotation;
                    this.templateSrv = options.templateSrv;
                }
                HeroicSeries.prototype._convertData = function (dataPoint) {
                    return [dataPoint[1], dataPoint[0]];
                };
                HeroicSeries.prototype.getTimeSeries = function () {
                    var _this = this;
                    return this.series.result.map(function (series) {
                        var scoped = _this.buildScoped(series, _this.series.commonTags);
                        var name = _this.templateSrv.replaceWithText(_this.alias || "$tags", scoped);
                        return { target: name, datapoints: series.values.map(_this._convertData) };
                    });
                };
                HeroicSeries.prototype.getAnnotations = function () {
                    var _this = this;
                    var list = [];
                    lodash_1.default.each(this.series, function (series) {
                        var titleCol = null;
                        var timeCol = null;
                        var tagsCol = [];
                        var textCol = null;
                        lodash_1.default.each(series.tags, function (value, column) {
                            if (column === "time") {
                                timeCol = column;
                                return;
                            }
                            if (column === "sequence_number") {
                                return;
                            }
                            if (!titleCol) {
                                titleCol = column;
                            }
                            if (column === _this.annotation.titleColumn) {
                                titleCol = column;
                                return;
                            }
                            if (lodash_1.default.includes((_this.annotation.tagsColumn || "").replace(" ", "").split(","), column)) {
                                tagsCol.push(column);
                                return;
                            }
                            if (column === _this.annotation.textColumn) {
                                textCol = column;
                                return;
                            }
                        });
                        lodash_1.default.each(series.values, function (value) {
                            var data = {
                                annotation: _this.annotation,
                                time: +new Date(value[0]),
                                title: series.tags[titleCol],
                                // Remove empty values, then split in different tags for comma separated values
                                tags: lodash_1.default.flatten(tagsCol
                                    .filter(function (t) {
                                    return series.tags[t];
                                })
                                    .map(function (t) {
                                    return series.tags[t].split(",");
                                })),
                                text: series.tags[textCol],
                            };
                            list.push(data);
                        });
                    });
                    return list;
                };
                HeroicSeries.prototype.getTable = function () {
                    var table = new table_model_1.default();
                    if (this.series.result.length === 0) {
                        return table;
                    }
                    table.columns = [{ text: "Time", type: "time" }, { text: "Value", type: "value" }].concat(Object.keys(this.series.commonTags).map(function (key) {
                        return { text: key, type: key };
                    }));
                    lodash_1.default.each(this.series.result, function (series, seriesIndex) {
                        // if (seriesIndex === 0) {
                        //   j = 0;
                        //   // Check that the first column is indeed 'time'
                        //   table.columns.push({ text: 'Time', type: 'time' });
                        //
                        //   _.each(_.keys(series.tags), function(key) {
                        //     table.columns.push({ text: key });
                        //   });
                        // }
                        if (series.values) {
                            for (var k = 0; k < series.values.length; k++) {
                                var values = series.values[k];
                                var reordered = [values[0], values[1]];
                                if (series.tags) {
                                    reordered.push.apply(reordered, table.columns
                                        .filter(function (column) { return column.type !== "time" && column.type !== "value"; })
                                        .map(function (column) { return series.tags[column.type]; }));
                                }
                                // for (j = 1; j < values.length; j++) {
                                //   reordered.push(values[j]);
                                // }
                                table.rows.push(reordered);
                            }
                        }
                    });
                    return table;
                };
                HeroicSeries.prototype.buildScoped = function (group, common) {
                    var scoped = {};
                    for (var tk in group.tagCounts) {
                        scoped[("tag_" + tk)] = { text: "<" + group.tagCounts[tk] + ">" };
                        scoped[("{tag_" + tk + "_count")] = { text: "<" + group.tagCounts[tk] + ">" };
                    }
                    for (var t in group.tags) {
                        scoped[("tag_" + t)] = { text: group.tags[t] };
                        scoped[("tag_" + t + "_count")] = { text: "<" + 1 + ">" };
                    }
                    for (var c in common) {
                        if (group.tags[c]) {
                            continue; // do not override series tags
                        }
                        scoped[("tag_" + c)] = { text: common[c] };
                        scoped[("tag_" + c + "_count")] = { text: "<" + common[c].length + ">" };
                    }
                    scoped["tags"] = { text: this.buildTags(group.tags, group.tagCounts) };
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
            })();
            exports_1("default", HeroicSeries);
        }
    }
});
//# sourceMappingURL=heroic_series.js.map