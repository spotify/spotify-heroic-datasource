System.register(["app/plugins/sdk", "lodash", "./heroic_query", "./metadata_client", "./validator", "./query_parser", "./query_part"], function (exports_1, context_1) {
    "use strict";
    var __extends = (this && this.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var sdk_1, lodash_1, heroic_query_1, metadata_client_1, validator_1, query_parser_1, query_part_1, HeroicQueryCtrl;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
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
            function (validator_1_1) {
                validator_1 = validator_1_1;
            },
            function (query_parser_1_1) {
                query_parser_1 = query_parser_1_1;
            },
            function (query_part_1_1) {
                query_part_1 = query_part_1_1;
            }
        ],
        execute: function () {
            HeroicQueryCtrl = (function (_super) {
                __extends(HeroicQueryCtrl, _super);
                function HeroicQueryCtrl($scope, $injector, templateSrv, $q, uiSegmentSrv) {
                    var _this = _super.call(this, $scope, $injector) || this;
                    _this.templateSrv = templateSrv;
                    _this.$q = $q;
                    _this.uiSegmentSrv = uiSegmentSrv;
                    _this.target.alias = _this.target.alias || "";
                    if (_this.target.globalAggregation !== undefined) {
                        _this.target.globalAggregation = _this.target.globalAggregation;
                    }
                    else {
                        _this.target.globalAggregation = true;
                    }
                    _this.panelCtrl.events.on('data-received', _this.onDataReceived.bind(_this), $scope);
                    _this.queryModel = new heroic_query_1.default(_this.target, templateSrv, _this.panel.scopedVars || {});
                    _this.groupBySegment = _this.uiSegmentSrv.newPlusButton();
                    _this.resultFormats = [{ text: "Time series", value: "time_series" }, { text: "Table", value: "table" }];
                    _this.previousQuery = _this.target.query;
                    _this.buildSelectMenu();
                    _this.warningMessage = "";
                    _this.validator = new validator_1.HeroicValidator(_this.target, _this.datasource.tagAggregationChecks, _this.datasource.tagCollapseChecks);
                    _this.queryParser = new query_parser_1.QueryParser();
                    _this.currentSuggestions = [];
                    _this.metadataClient = new metadata_client_1.MetadataClient(_this, _this.datasource, _this.panel.scopedVars, _this.target, true, false);
                    _this.aliasCompleterCache = [];
                    return _this;
                }
                HeroicQueryCtrl.prototype.toggleEditorMode = function () {
                    this.target.rawQuery = !this.target.rawQuery;
                    if (this.target.rawQuery) {
                        this.target.queryRaw = JSON.stringify(JSON.parse(this.target.query), null, 2);
                    }
                };
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
                HeroicQueryCtrl.prototype.addSelectPart = function (selectParts, cat, subitem, position) {
                    this.queryModel.addSelectPart(selectParts, cat.text, subitem.value, position);
                    if (cat.text === "Filters") {
                        this.target.globalAggregation = false;
                    }
                    this.refresh();
                };
                HeroicQueryCtrl.prototype.getAliasCompleter = function () {
                    var _this = this;
                    return {
                        getCompletions: function (editor, session, pos, prefix, callback) {
                            callback(null, _this.aliasCompleterCache);
                        }
                    };
                };
                HeroicQueryCtrl.prototype.handleSelectPartEvent = function (selectParts, part, evt) {
                    switch (evt.name) {
                        case "get-param-options": {
                            return this.metadataClient.tagKeyCount({ type: "key" }, 0, null, true);
                        }
                        case "part-param-changed": {
                            this.refresh();
                            break;
                        }
                        case "action": {
                            if (evt.action.value === "remove-part") {
                                this.queryModel.removeSelectPart(selectParts, part);
                                this.refresh();
                            }
                            else {
                                var category = lodash_1.default.find(this.selectMenu, function (menu) { return menu.text === evt.action.value; });
                                var newPart = lodash_1.default.find(category.submenu, function (item) { return item.value === part.part.type; });
                                var position = selectParts.indexOf(part);
                                this.queryModel.removeSelectPart(selectParts, part);
                                this.addSelectPart(selectParts, category, newPart, position);
                                this.refresh();
                            }
                            break;
                        }
                        case "get-part-actions": {
                            if (part.part.categoryName === "Filters") {
                                return this.$q.when([
                                    { text: "Remove", value: "remove-part" }
                                ]);
                            }
                            else {
                                return this.$q.when([
                                    { text: "Remove", value: "remove-part" },
                                    { text: "Convert To Collapse", value: "Collapse" },
                                    { text: "Convert To For Each", value: "For Each" },
                                    { text: "Convert To Group By", value: "Group By" }
                                ]);
                            }
                        }
                    }
                };
                HeroicQueryCtrl.prototype.refresh = function () {
                    this.queryModel.scopedVars["interval"] = { value: this.panelCtrl.interval };
                    this.queryModel.scopedVars["__interval"] = { value: this.panelCtrl.interval };
                    this.checkSuggestions();
                    this.checkGlobalAggregation();
                    var query = this.queryModel.render();
                    this.target.query = JSON.stringify(query);
                    this.previousQuery = this.target.query;
                    if (this.panelCtrl.onQueryChange) {
                        this.panelCtrl.onQueryChange();
                    }
                };
                HeroicQueryCtrl.prototype.refreshRaw = function () {
                    this.queryParser.parseInto(this.target.queryRaw, this.target);
                    this.queryModel.updateProjection();
                    this.metadataClient.createTagSegments();
                    this.refresh();
                };
                HeroicQueryCtrl.prototype.appendSuggestion = function (suggestion) {
                    this.currentSuggestions = [];
                    var queryRaw = JSON.parse(this.target.query);
                    queryRaw.filter = queryRaw.filter.concat(suggestion.filter);
                    if (suggestion.aggregation !== undefined && suggestion.aggregation !== null && queryRaw.aggregators.length === 0) {
                        queryRaw.aggregators = queryRaw.aggregators.concat(suggestion.aggregation);
                    }
                    this.target.queryRaw = JSON.stringify(queryRaw, null, 2);
                    this.refreshRaw();
                };
                HeroicQueryCtrl.prototype.checkSuggestions = function () {
                    var suggestions = [];
                    var query = this.queryModel.render();
                    this.datasource.suggestionRules.forEach(function (rule) {
                        var rule2 = lodash_1.default.cloneDeep(rule);
                        rule2.triggerFilter = rule2.triggerFilter.map(function (item) {
                            if (lodash_1.default.isArray(item) && item[item.length - 1] === "*") {
                                var key_1 = item[item.length - 2];
                                var value = lodash_1.default.first(query.filter
                                    .filter(function (item) { return lodash_1.default.isArray(item) && item[item.length - 2] === key_1; })
                                    .map(function (item) { return item[item.length - 1]; }));
                                item[item.length - 1] = value;
                            }
                            return item;
                        });
                        if (lodash_1.default.isEqual(lodash_1.default.sortBy(rule2.triggerFilter), lodash_1.default.sortBy(query.filter))) {
                            suggestions.push(rule2);
                        }
                    });
                    this.currentSuggestions = suggestions;
                };
                HeroicQueryCtrl.prototype.checkGlobalAggregation = function () {
                    var _this = this;
                    this.queryModel.selectModels.forEach(function (model) {
                        model.forEach(function (queryPart) {
                            if (_this.target.globalAggregation && queryPart.part.categoryName === "Filters") {
                                _this.warningMessage = "Filters are not compatible with Global Aggregations.";
                            }
                        });
                    });
                };
                HeroicQueryCtrl.prototype.clearWarnings = function () {
                    this.warningMessage = "";
                };
                HeroicQueryCtrl.prototype.onDataReceived = function (dataList) {
                    var _this = this;
                    this.dataList = dataList;
                    if (this.target.resultFormat === "time_series") {
                        this.warningMessage = this.validator.checkForWarnings(dataList);
                        var filtered = dataList.filter(function (data) { return data.refId === _this.target.refId; });
                        var scoped = lodash_1.default.uniq(lodash_1.default.flatMap(filtered, function (data) { return Object.keys(data.scoped); }));
                        this.aliasCompleterCache = scoped.map(function (scope) {
                            return { name: scope, value: "[[" + scope + "]]" };
                        });
                    }
                };
                HeroicQueryCtrl.prototype.refreshAlias = function () {
                    var _this = this;
                    if (this.dataList === undefined) {
                        this.queryModel.scopedVars["interval"] = { value: this.panelCtrl.interval };
                        this.queryModel.scopedVars["__interval"] = { value: this.panelCtrl.interval };
                        return;
                    }
                    this.dataList.forEach(function (data) {
                        if (data.refId === _this.target.refId) {
                            var alias = _this.templateSrv.replaceWithText(_this.target.alias || "$tags", {});
                            data.target = _this.templateSrv.replaceWithText(alias, data.scoped);
                        }
                    });
                    this.panelCtrl.events.emit('data-received', this.dataList);
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
            }(sdk_1.QueryCtrl));
            exports_1("HeroicQueryCtrl", HeroicQueryCtrl);
        }
    };
});
//# sourceMappingURL=query_ctrl.js.map