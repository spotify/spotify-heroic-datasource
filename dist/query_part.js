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
    var filterAggregations, rootAggregations, index, categories, groupByTimeFunctions;
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
        function aggregateRenderer(part, innerExpr, secondsInterval) {
            var tagGroup = of;
            if (part.params.length) {
                tagGroup = part.params;
            } // otherwise, use the default `of` passed in to buildAggregateRenderer
            var aggregation = {
                type: "group",
                of: tagGroup,
                each: [
                    {
                        type: ctype,
                    },
                ],
            };
            if (ctype !== "delta" && ctype !== "deltaPerSecond" && ctype !== "notNegative" && ctype !== "stddev") {
                aggregation.each.forEach(function (each) {
                    each["sampling"] = {
                        unit: "seconds",
                        value: secondsInterval,
                    };
                });
            }
            return aggregation;
        }
        return aggregateRenderer;
    }
    function buildFilterRenderer(ctype) {
        function filterRenderer(part, innerExpr, secondsInterval) {
            return {
                type: ctype,
                k: parseInt(part.params[0]),
                of: { type: "empty" }
            };
        }
        return filterRenderer;
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
            filterAggregations = [
                "abovek",
                "belowk",
                "topk",
                "bottomk"
            ];
            rootAggregations = [
                "average",
                "count",
                "delta",
                "deltaPerSecond",
                "max",
                "min",
                "notNegative",
                "stddev",
                "sum",
                "sum2",
            ];
            index = {};
            categories = {
                "For Each": [],
                "Collapse": [],
                "Group By": [],
                "Filters": []
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
            filterAggregations.forEach(function (aggregation) {
                register({
                    type: aggregation,
                    addStrategy: replaceAggregationAddStrategy,
                    renderer: buildFilterRenderer(aggregation),
                    categoryName: "Filters",
                    params: [{
                            name: "k",
                            type: "int",
                            options: []
                        }],
                    defaultParams: ["5"]
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