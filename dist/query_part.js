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
System.register(["./query_part_base/query_part"], function(exports_1) {
    var query_part_1;
    var rootAggregations, index, categories, groupByTimeFunctions;
    function createPart(part) {
        var def = index[part.categoryName][part.type];
        if (!def) {
            throw { message: "Could not find query part " + part.type };
        }
        return new query_part_1.QueryPart(part, def);
    }
    function register(options) {
        if (!options.category && options.categoryName) {
            options.category = categories[options.categoryName];
        }
        if (!index[options.categoryName]) {
            index[options.categoryName] = {};
        }
        index[options.categoryName][options.type] = new query_part_1.QueryPartDef(options);
        options.category.push(index[options.categoryName][options.type]);
    }
    function replaceAggregationAddStrategy(selectParts, partModel) {
        // look for existing aggregation
        if (partModel.def.categoryName !== "Group By") {
            for (var i = 0; i < selectParts.length; i++) {
                var part = selectParts[i];
                if (part.def === partModel.def) {
                    return;
                }
            }
        }
        selectParts.push(partModel);
    }
    function buildAggregateRenderer(ctype, of) {
        function aggregateRenderer(part, innerExpr) {
            var tagGroup = of;
            if (part.params) {
                tagGroup = part.params;
            }
            var aggregation = {
                type: "group",
                of: tagGroup,
                each: [
                    {
                        type: ctype,
                    },
                ],
            };
            if (ctype !== "delta" && ctype !== "deltaPerSecond" && ctype !== "notNegative") {
                aggregation.each[0]["sampling"] = {
                    unit: "minutes",
                    value: 30,
                };
            }
            return aggregation;
        }
        return aggregateRenderer;
    }
    function registerForEach(options) {
        options.renderer = buildAggregateRenderer(options.type, null);
        register(options);
    }
    function registerCollapse(options) {
        options.renderer = buildAggregateRenderer(options.type, []);
        register(options);
    }
    function registerGroupBy(options) {
        options.renderer = buildAggregateRenderer(options.type, []);
        register(options);
    }
    return {
        setters:[
            function (query_part_1_1) {
                query_part_1 = query_part_1_1;
            }],
        execute: function() {
            rootAggregations = [
                "abovek",
                "average",
                "belowk",
                "bottomk",
                "cardinality",
                "chain",
                "collapse",
                "count",
                "delta",
                "empty",
                "group",
                "group-unique",
                "max",
                "min",
                "opts",
                "pointsabove",
                "pointsbelow",
                "quantile",
                "spread",
                "stddev",
                "sum",
                "sum2",
                "topk",
                "tpl",
            ];
            index = {};
            categories = {
                "For Each": [],
                "Collapse": [],
                "Group By": []
            };
            groupByTimeFunctions = [];
            rootAggregations.forEach(function (aggregation) {
                registerForEach({
                    type: aggregation,
                    addStrategy: replaceAggregationAddStrategy,
                    categoryName: "For Each",
                    params: [],
                    defaultParams: [],
                });
                registerCollapse({
                    type: aggregation,
                    addStrategy: replaceAggregationAddStrategy,
                    categoryName: "Collapse",
                    params: [],
                    defaultParams: [],
                });
                registerGroupBy({
                    type: aggregation,
                    addStrategy: replaceAggregationAddStrategy,
                    categoryName: "Group By",
                    dynamicParameters: true,
                    params: [
                        {
                            name: "tag",
                            type: "string",
                            dynamicLookup: true
                        }
                    ],
                    defaultParams: [],
                });
            });
            register({
                type: "time",
                category: groupByTimeFunctions,
                params: [
                    {
                        name: "interval",
                        type: "time",
                        options: ["$__interval", "1s", "2s", "5s", "10s", "20s",
                            "30s", "1m", "2m", "5m", "10m", "20m", "30m", "1h", "3h",
                            "6h", "12h", "1d", "7d", "30d"],
                    },
                ],
                defaultParams: ["$__interval"],
                renderer: query_part_1.functionRenderer,
            });
            exports_1("default",{
                create: createPart,
                getCategories: function () {
                    return categories;
                },
            });
        }
    }
});
//# sourceMappingURL=query_part.js.map