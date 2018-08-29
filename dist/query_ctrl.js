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
                    if (this.target.globalAggregation !== undefined) {
                        this.target.globalAggregation = this.target.globalAggregation;
                    }
                    else {
                        this.target.globalAggregation = true;
                    }
                    this.queryModel = new heroic_query_1.default(this.target, templateSrv, this.panel.scopedVars || {});
                    this.groupBySegment = this.uiSegmentSrv.newPlusButton();
                    this.resultFormats = [{ text: "Time series", value: "time_series" }, { text: "Table", value: "table" }];
                    this.buildSelectMenu();
                    this.metadataClient = new metadata_client_1.MetadataClient(this, this.datasource, this.panel.scopedVars, this.target, true, false);
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
                HeroicQueryCtrl.prototype.addSelectPart = function (selectParts, cat, subitem) {
                    this.queryModel.addSelectPart(selectParts, cat.text, subitem.value);
                    this.refresh();
                };
                HeroicQueryCtrl.prototype.handleSelectPartEvent = function (selectParts, part, evt) {
                    switch (evt.name) {
                        case "get-param-options": {
                            return this.metadataClient.getTagsOrValues({ type: "key" }, 0, null, true);
                        }
                        case "part-param-changed": {
                            this.refresh();
                            break;
                        }
                        case "action": {
                            this.queryModel.removeSelectPart(selectParts, part);
                            this.refresh();
                            break;
                        }
                        case "get-part-actions": {
                            return this.$q.when([{ text: "Remove", value: "remove-part" }]);
                        }
                    }
                };
                HeroicQueryCtrl.prototype.refresh = function () {
                    this.queryModel.scopedVars["interval"] = { value: this.panelCtrl.interval };
                    this.queryModel.scopedVars["__interval"] = { value: this.panelCtrl.interval };
                    this.target.query = JSON.stringify(this.queryModel.render());
                    this.panelCtrl.refresh();
                };
                HeroicQueryCtrl.prototype.handleGroupByPartEvent = function (part, index, evt) {
                    switch (evt.name) {
                        case "get-param-options": {
                            return this.metadataClient.getTagsOrValues({ type: "key" }, 0, null, false);
                        }
                        case "part-param-changed": {
                            this.refresh();
                            break;
                        }
                        case "action": {
                            this.queryModel.removeGroupByPart(part, index);
                            this.refresh();
                            break;
                        }
                        case "get-part-actions": {
                            if (part.def.type === "time") {
                                return Promise.resolve([]);
                            }
                            return this.$q.when([{ text: "Remove", value: "remove-part" }]);
                        }
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
                HeroicQueryCtrl.prototype.getCollapsedText = function () {
                    return this.target.query;
                };
                HeroicQueryCtrl.prototype.getTags = function () {
                    return this.target.tags;
                };
                HeroicQueryCtrl.prototype.setTags = function (tags) {
                    this.target.tags = tags;
                };
                HeroicQueryCtrl.templateUrl = "partials/query.editor.html";
                return HeroicQueryCtrl;
            })(sdk_1.QueryCtrl);
            exports_1("HeroicQueryCtrl", HeroicQueryCtrl);
        }
    }
});
//# sourceMappingURL=query_ctrl.js.map