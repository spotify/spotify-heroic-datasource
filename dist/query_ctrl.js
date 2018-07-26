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
System.register(["app/plugins/sdk", "lodash", "./heroic_query", "./metadata_client", "./query_part"], function(exports_1) {
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var sdk_1, lodash_1, heroic_query_1, metadata_client_1, query_part_1;
    var HeroicQueryCtrl;
    return {
        setters:[
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (heroic_query_1_1) {
                heroic_query_1 = heroic_query_1_1;
            },
            function (metadata_client_1_1) {
                metadata_client_1 = metadata_client_1_1;
            },
            function (query_part_1_1) {
                query_part_1 = query_part_1_1;
            }],
        execute: function() {
            HeroicQueryCtrl = (function (_super) {
                __extends(HeroicQueryCtrl, _super);
                /** @ngInject **/
                function HeroicQueryCtrl($scope, $injector, templateSrv, $q, uiSegmentSrv) {
                    _super.call(this, $scope, $injector);
                    this.templateSrv = templateSrv;
                    this.$q = $q;
                    this.uiSegmentSrv = uiSegmentSrv;
                    this.queryModel = new heroic_query_1.default(this.target, templateSrv, this.panel.scopedVars);
                    this.groupBySegment = this.uiSegmentSrv.newPlusButton();
                    this.resultFormats = [{ text: "Time series", value: "time_series" }, { text: "Table", value: "table" }];
                    this.tagSegments = [];
                    for (var _i = 0, _a = this.target.tags; _i < _a.length; _i++) {
                        var tag = _a[_i];
                        if (!tag.operator) {
                            tag.operator = "=";
                        }
                        if (tag.condition) {
                            this.tagSegments.push(uiSegmentSrv.newCondition(tag.condition));
                        }
                        this.tagSegments.push(uiSegmentSrv.newKey(tag.key));
                        this.tagSegments.push(uiSegmentSrv.newOperator(tag.operator));
                        this.tagSegments.push(uiSegmentSrv.newKeyValue(tag.value));
                    }
                    this.fixTagSegments();
                    this.buildSelectMenu();
                    this.removeTagFilterSegment = uiSegmentSrv.newSegment({
                        fake: true,
                        value: "-- remove tag filter --",
                    });
                    this.metadataClient = new metadata_client_1.MetadataClient(this.datasource, this.uiSegmentSrv, this.templateSrv, this.$q, this.panel.scopedVars, this.target, this.removeTagFilterSegment, this.tagSegments, true, false);
                }
                HeroicQueryCtrl.prototype.buildSelectMenu = function () {
                    var categories = query_part_1.default.getCategories();
                    this.selectMenu = lodash_1.default.reduce(categories, function (memo, cat, key) {
                        var menu = {
                            text: key,
                            submenu: cat.map(function (item) {
                                return { text: item.type, value: item.type };
                            }),
                        };
                        memo.push(menu);
                        return memo;
                    }, []);
                };
                HeroicQueryCtrl.prototype.getGroupByOptions = function () {
                    // TODO: Group By tags aggregates
                    var options = [];
                    options.push(this.uiSegmentSrv.newSegment({ value: "time($interval)" }));
                    return Promise.resolve(options);
                };
                HeroicQueryCtrl.prototype.groupByAction = function () {
                    this.queryModel.addGroupBy(this.groupBySegment.value);
                    var plusButton = this.uiSegmentSrv.newPlusButton();
                    this.groupBySegment.value = plusButton.value;
                    this.groupBySegment.html = plusButton.html;
                    this.panelCtrl.refresh();
                };
                HeroicQueryCtrl.prototype.addSelectPart = function (selectParts, cat, subitem) {
                    this.queryModel.addSelectPart(selectParts, cat.text, subitem.value);
                    this.panelCtrl.refresh();
                };
                HeroicQueryCtrl.prototype.handleSelectPartEvent = function (selectParts, part, evt) {
                    switch (evt.name) {
                        case "get-param-options": {
                            return this.metadataClient.getTagsOrValues({ type: "key" }, 0, null, false);
                        }
                        case "part-param-changed": {
                            this.panelCtrl.refresh();
                            break;
                        }
                        case "action": {
                            this.queryModel.removeSelectPart(selectParts, part);
                            this.panelCtrl.refresh();
                            break;
                        }
                        case "get-part-actions": {
                            return this.$q.when([{ text: "Remove", value: "remove-part" }]);
                        }
                    }
                };
                HeroicQueryCtrl.prototype.handleGroupByPartEvent = function (part, index, evt) {
                    switch (evt.name) {
                        case "get-param-options": {
                            return this.metadataClient.getTagsOrValues({ type: "key" }, 0, null, false);
                        }
                        case "part-param-changed": {
                            this.panelCtrl.refresh();
                            break;
                        }
                        case "action": {
                            this.queryModel.removeGroupByPart(part, index);
                            this.panelCtrl.refresh();
                            break;
                        }
                        case "get-part-actions": {
                            return this.$q.when([{ text: "Remove", value: "remove-part" }]);
                        }
                    }
                };
                HeroicQueryCtrl.prototype.fixTagSegments = function () {
                    var count = this.tagSegments.length;
                    var lastSegment = this.tagSegments[Math.max(count - 1, 0)];
                    if (!lastSegment || lastSegment.type !== "plus-button") {
                        this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                    }
                };
                HeroicQueryCtrl.prototype.toggleEditorMode = function () {
                    // TODO: do not render template variables when toggling to manual editor
                    try {
                        this.target.query = JSON.stringify(this.queryModel.render(), null, 2);
                    }
                    catch (err) {
                        console.log("query render error");
                    }
                    this.target.rawQuery = !this.target.rawQuery;
                };
                HeroicQueryCtrl.prototype.tagSegmentUpdated = function (segment, index) {
                    this.tagSegments[index] = segment;
                    // AND, Z, =, A, AND, B, =, C,  AND, D, =,  E]
                    // 3  , 4, 5, 6, 7,   8, 9, 10, 11, 12, 13, 14]
                    // handle remove tag condition
                    if (segment.value === this.removeTagFilterSegment.value) {
                        this.tagSegments.splice(index, 3);
                        if (this.tagSegments.length === 0) {
                            this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                        }
                        else if (this.tagSegments.length > 2) {
                            this.tagSegments.splice(Math.max(index - 1, 0), 1);
                            if (this.tagSegments[this.tagSegments.length - 1].type !== "plus-button") {
                                this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                            }
                        }
                    }
                    else {
                        if (segment.type === "plus-button") {
                            if (index > 2) {
                                this.tagSegments.splice(index, 0, this.uiSegmentSrv.newCondition("AND"));
                            }
                            this.tagSegments.push(this.uiSegmentSrv.newOperator("="));
                            this.tagSegments.push(this.uiSegmentSrv.newFake("select tag value", "value", "query-segment-value"));
                            segment.type = "key";
                            segment.cssClass = "query-segment-key";
                        }
                        if (index + 1 === this.tagSegments.length) {
                            this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                        }
                    }
                    this.rebuildTargetTagConditions();
                };
                HeroicQueryCtrl.prototype.rebuildTargetTagConditions = function () {
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
                            tagOperator = _this.metadataClient.getTagValueOperator(segment2.value, tags[tagIndex].operator);
                            if (tagOperator) {
                                _this.tagSegments[index - 1] = _this.uiSegmentSrv.newOperator(tagOperator);
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
                    this.target.tags = tags;
                    this.target.query = JSON.stringify(this.queryModel.render());
                    this.panelCtrl.refresh();
                };
                HeroicQueryCtrl.templateUrl = "partials/query.editor.html";
                return HeroicQueryCtrl;
            })(sdk_1.QueryCtrl);
            exports_1("HeroicQueryCtrl", HeroicQueryCtrl);
        }
    }
});
//# sourceMappingURL=query_ctrl.js.map