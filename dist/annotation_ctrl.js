System.register(["lodash", "./heroic_query", "./metadata_client", "./query_part"], function(exports_1) {
    var lodash_1, heroic_query_1, metadata_client_1, query_part_1;
    var HeroicAnnotationsQueryCtrl;
    return {
        setters:[
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
            HeroicAnnotationsQueryCtrl = (function () {
                function HeroicAnnotationsQueryCtrl($scope, $injector, templateSrv, $q, uiSegmentSrv) {
                    this.templateSrv = templateSrv;
                    this.$q = $q;
                    this.uiSegmentSrv = uiSegmentSrv;
                    this.tagSegments = [];
                    this.queryModel = new heroic_query_1.default(this.annotation, templateSrv, null);
                    if (!this.annotation.tags) {
                        this.annotation.tags = [];
                    }
                    for (var _i = 0, _a = this.annotation.tags; _i < _a.length; _i++) {
                        var tag = _a[_i];
                        if (!tag.operator) {
                            if (/^\/.*\/$/.test(tag.value)) {
                                tag.operator = "=~";
                            }
                            else {
                                tag.operator = "=";
                            }
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
                    this.metadataClient = new metadata_client_1.MetadataClient(this.datasource, this.uiSegmentSrv, this.templateSrv, this.$q, null, this.annotation, this.removeTagFilterSegment, this.tagSegments, false, false);
                }
                HeroicAnnotationsQueryCtrl.prototype.buildSelectMenu = function () {
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
                HeroicAnnotationsQueryCtrl.prototype.fixTagSegments = function () {
                    var count = this.tagSegments.length;
                    var lastSegment = this.tagSegments[Math.max(count - 1, 0)];
                    if (!lastSegment || lastSegment.type !== "plus-button") {
                        this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
                    }
                };
                HeroicAnnotationsQueryCtrl.prototype.tagSegmentUpdated = function (segment, index) {
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
                HeroicAnnotationsQueryCtrl.prototype.rebuildTargetTagConditions = function () {
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
                    this.annotation.tags = tags;
                    this.annotation.query = this.queryModel.buildCurrentFilter(false, false);
                };
                HeroicAnnotationsQueryCtrl.templateUrl = "partials/annotations.editor.html";
                return HeroicAnnotationsQueryCtrl;
            })();
            exports_1("HeroicAnnotationsQueryCtrl", HeroicAnnotationsQueryCtrl);
        }
    }
});
//# sourceMappingURL=annotation_ctrl.js.map