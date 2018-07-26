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
System.register(["app/core/utils/kbn", "lodash", "./query_part"], function(exports_1) {
    var kbn_1, lodash_1, query_part_1;
    var HeroicQuery;
    return {
        setters:[
            function (kbn_1_1) {
                kbn_1 = kbn_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (query_part_1_1) {
                query_part_1 = query_part_1_1;
            }],
        execute: function() {
            HeroicQuery = (function () {
                /** @ngInject */
                function HeroicQuery(target, templateSrv, scopedVars) {
                    this.target = target;
                    this.templateSrv = templateSrv;
                    this.scopedVars = scopedVars;
                    target.resultFormat = target.resultFormat || "time_series";
                    target.orderByTime = target.orderByTime || "ASC";
                    target.tags = target.tags || [];
                    target.groupBy = target.groupBy || [{ type: "time", params: ["$__interval"] }];
                    target.select = target.select || [[{ type: "average", categoryName: "For Each", params: [] }]];
                    this.updateProjection();
                }
                HeroicQuery.prototype.updateProjection = function () {
                    this.selectModels = lodash_1.default.map(this.target.select, function (parts) {
                        return lodash_1.default.map(parts, query_part_1.default.create);
                    });
                    this.groupByParts = lodash_1.default.map(this.target.groupBy, query_part_1.default.create);
                };
                HeroicQuery.prototype.updatePersistedParts = function () {
                    this.target.select = lodash_1.default.map(this.selectModels, function (selectParts) {
                        return lodash_1.default.map(selectParts, function (part) {
                            return { type: part.def.type, params: part.params, categoryName: part.def.categoryName };
                        });
                    });
                };
                HeroicQuery.prototype.addGroupBy = function (value) {
                    var stringParts = value.match(/^(\w+)\((.*)\)$/);
                    var typePart = stringParts[1];
                    var arg = stringParts[2];
                    var partModel = query_part_1.default.create({ type: typePart, params: [arg] });
                    var partCount = this.target.groupBy.length;
                    if (partCount === 0) {
                        this.target.groupBy.push(partModel.part);
                    }
                    else if (typePart === "time") {
                        this.target.groupBy.splice(0, 0, partModel.part);
                    }
                    else if (typePart === "tag") {
                        if (this.target.groupBy[partCount - 1].type === "fill") {
                            this.target.groupBy.splice(partCount - 1, 0, partModel.part);
                        }
                        else {
                            this.target.groupBy.push(partModel.part);
                        }
                    }
                    else {
                        this.target.groupBy.push(partModel.part);
                    }
                    this.updateProjection();
                };
                HeroicQuery.prototype.removeGroupByPart = function (part, index) {
                    var categories = query_part_1.default.getCategories();
                    if (part.def.type === "time") {
                        // remove fill
                        this.target.groupBy = lodash_1.default.filter(this.target.groupBy, function (g) { return g.type !== "fill"; });
                        // remove aggregations
                        this.target.select = lodash_1.default.map(this.target.select, function (s) {
                            return lodash_1.default.filter(s, function (part) {
                                var partModel = query_part_1.default.create(part);
                                if (partModel.def.category === categories["For Each"]) {
                                    return false;
                                }
                                return true;
                            });
                        });
                    }
                    this.target.groupBy.splice(index, 1);
                    this.updateProjection();
                };
                HeroicQuery.prototype.removeSelect = function (index) {
                    // TODO: remove key
                };
                HeroicQuery.prototype.removeSelectPart = function (selectParts, part) {
                    // if we remove the field remove the whole statement
                    if (part.def.type === "field") {
                        if (this.selectModels.length > 1) {
                            var modelsIndex = lodash_1.default.indexOf(this.selectModels, selectParts);
                            this.selectModels.splice(modelsIndex, 1);
                        }
                    }
                    else {
                        var partIndex = lodash_1.default.indexOf(selectParts, part);
                        selectParts.splice(partIndex, 1);
                    }
                    this.updatePersistedParts();
                };
                HeroicQuery.prototype.addSelectPart = function (selectParts, categoryName, type) {
                    var partModel = query_part_1.default.create({ type: type, categoryName: categoryName });
                    partModel.def.addStrategy(selectParts, partModel, this);
                    this.updatePersistedParts();
                };
                HeroicQuery.prototype.getKey = function () {
                    var measurement = this.target.measurement || "measurement";
                    return this.templateSrv.replace(measurement, this.scopedVars, "regex");
                };
                HeroicQuery.prototype.renderSubFilter = function (tag) {
                    switch (tag.operator) {
                        case ("="):
                            return [tag.operator, tag.key, tag.value];
                        default:
                            return ["q", (tag.key + " " + tag.operator + " " + tag.value)];
                    }
                };
                HeroicQuery.prototype.buildFilter = function (filterChoices, includeVariables, includeScopedFilter) {
                    var base;
                    var keyTag = lodash_1.default.find(filterChoices, function (tag) { return tag.key === "$key" && tag.value !== "select tag value"; });
                    var filteredTags = filterChoices.filter(function (tag) { return tag.value !== "select tag value" && tag.key !== "$key"; });
                    if (keyTag) {
                        base = ["and", ["key", keyTag.value]];
                    }
                    else if (filteredTags.length) {
                        base = ["and"];
                    }
                    else {
                        return ["true"];
                    }
                    var filter = base.concat(filteredTags
                        .map(this.renderSubFilter));
                    if (includeVariables) {
                        return JSON.parse(this.templateSrv.replace(JSON.stringify(filter), this.scopedVars));
                    }
                    return filter;
                };
                HeroicQuery.prototype.buildCurrentFilter = function (includeVariables, includeScopedFilter) {
                    return this.buildFilter(this.target.tags, includeVariables, includeScopedFilter);
                };
                HeroicQuery.prototype.render = function () {
                    var target = this.target;
                    var currentFilter = this.buildCurrentFilter(true, true);
                    var currentIntervalUnit = null;
                    var currentIntervalValue = null;
                    if (target.groupBy.length) {
                        currentIntervalUnit = "seconds";
                        var newGroupBy = JSON.parse(this.templateSrv.replace(JSON.stringify(target.groupBy), this.scopedVars));
                        currentIntervalValue = kbn_1.default.interval_to_seconds(newGroupBy[0].params[0]);
                    }
                    var aggregators = this.selectModels.map(function (modelParts) {
                        return modelParts.map(function (modelPart) {
                            var renderOption = modelPart.render();
                            if (currentIntervalUnit) {
                                renderOption.each.forEach(function (each) {
                                    each.sampling.unit = currentIntervalUnit; // TODO: fix
                                    each.sampling.value = currentIntervalValue;
                                });
                            }
                            return renderOption;
                        });
                    });
                    return {
                        filter: currentFilter,
                        aggregators: aggregators[0],
                        features: ["com.spotify.heroic.distributed_aggregations"],
                        range: "$timeFilter",
                    };
                };
                HeroicQuery.prototype.renderAdhocFilters = function (filters) {
                    return this.buildFilter(filters, false, false);
                };
                return HeroicQuery;
            })();
            exports_1("default", HeroicQuery);
        }
    }
});
//# sourceMappingURL=heroic_query.js.map