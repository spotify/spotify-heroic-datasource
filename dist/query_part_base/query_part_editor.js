System.register(["lodash", "jquery", "angular"], function (exports_1, context_1) {
    "use strict";
    var lodash_1, jquery_1, angular_1, template;
    var __moduleName = context_1 && context_1.id;
    function queryPartEditorLabeledDirective($compile, templateSrv) {
        var paramTemplate = '<input type="text" class="hide input-mini tight-form-func-param"></input>';
        return {
            restrict: 'E',
            template: template,
            scope: {
                part: '=',
                handleEvent: '&',
                debounce: '@',
            },
            link: function postLink($scope, elem) {
                var part = $scope.part;
                var partDef = part.def;
                var $paramsContainer = elem.find('.query-part-parameters');
                var debounceLookup = $scope.debounce;
                var currentParam = 0;
                var linkMode = true;
                $scope.partActions = [];
                function clickFuncParam(paramIndex) {
                    linkMode = false;
                    var $link = jquery_1.default(this);
                    var $input = $link.next();
                    $input.val(part.params[paramIndex]);
                    $input.css('width', $link.width() + 16 + 'px');
                    $link.hide();
                    $input.show();
                    $input.focus();
                    $input.select();
                    var typeahead = $input.data('typeahead');
                    if (typeahead) {
                        $input.val('');
                        typeahead.lookup();
                    }
                }
                function inputBlur(paramIndex) {
                    linkMode = true;
                    var $input = jquery_1.default(this);
                    var $link = $input.prev();
                    var newValue = $input.val();
                    var partDefParamIndex = paramIndex;
                    if (partDef.dynamicParameters) {
                        partDefParamIndex = 0;
                    }
                    if (newValue === "-- remove --") {
                        part.removeParam(paramIndex);
                        currentParam = 0;
                        relink();
                        $scope.$apply(function () {
                            $scope.handleEvent({ $event: { name: 'part-param-changed' } });
                        });
                    }
                    else if (newValue !== '' || part.def.params[partDefParamIndex].optional) {
                        $link.html(templateSrv.highlightVariablesAsHtml(newValue));
                        part.updateParam($input.val(), paramIndex);
                        $scope.$apply(function () {
                            $scope.handleEvent({ $event: { name: 'part-param-changed' } });
                        });
                        if (partDef.dynamicParameters && paramIndex === currentParam - 1) {
                            addParams(partDef.params[0], currentParam);
                        }
                    }
                    $input.hide();
                    $link.show();
                }
                function inputKeyPress(paramIndex, e) {
                    if (e.which === 13) {
                        inputBlur.call(this, paramIndex);
                    }
                }
                function inputKeyDown() {
                    this.style.width = (3 + this.value.length) * 8 + 'px';
                }
                function addTypeahead($input, param, paramIndex) {
                    if (!param.options && !param.dynamicLookup) {
                        return;
                    }
                    var typeaheadSource = function (query, callback) {
                        if (param.options) {
                            var options = param.options;
                            if (param.type === 'int') {
                                options = lodash_1.default.map(options, function (val) {
                                    return val.toString();
                                });
                            }
                            return options;
                        }
                        $scope.$apply(function () {
                            $scope.handleEvent({ $event: { name: 'get-param-options' } }).then(function (result) {
                                var dynamicOptions = lodash_1.default.map(result, function (op) {
                                    return op.value;
                                });
                                callback(dynamicOptions);
                            });
                        });
                    };
                    $input.attr('data-provide', 'typeahead');
                    $input.typeahead({
                        source: typeaheadSource,
                        minLength: 0,
                        items: 1000,
                        updater: function (value) {
                            setTimeout(function () {
                                inputBlur.call($input[0], paramIndex);
                            }, 0);
                            return value;
                        },
                    });
                    var typeahead = $input.data('typeahead');
                    typeahead.lookup = function () {
                        if (linkMode) {
                            return [];
                        }
                        this.query = this.$element.val() || '';
                        var items = this.source(this.query, jquery_1.default.proxy(this.process, this));
                        return items ? this.process(items) : items;
                    };
                    if (debounceLookup) {
                        typeahead.lookup = lodash_1.default.debounce(typeahead.lookup, 500, { leading: true });
                    }
                }
                $scope.showActionsMenu = function () {
                    $scope.handleEvent({ $event: { name: 'get-part-actions' } }).then(function (res) {
                        $scope.partActions = res;
                    });
                };
                $scope.triggerPartAction = function (action) {
                    $scope.handleEvent({ $event: { name: 'action', action: action } });
                };
                function addParams(param, index) {
                    if (param.optional && part.params.length <= index) {
                        return;
                    }
                    if (index > 0) {
                        jquery_1.default('<span>, </span>').appendTo($paramsContainer);
                    }
                    var paramValue = templateSrv.highlightVariablesAsHtml(part.params[index]);
                    if (!paramValue) {
                        paramValue = "&nbsp&nbsp";
                    }
                    var $paramLink = jquery_1.default('<a class="graphite-func-param-link pointer">' + paramValue + '</a>');
                    var $input = jquery_1.default(paramTemplate);
                    $paramLink.appendTo($paramsContainer);
                    $input.appendTo($paramsContainer);
                    $input.blur(lodash_1.default.partial(inputBlur, index));
                    $input.keyup(inputKeyDown);
                    $input.keypress(lodash_1.default.partial(inputKeyPress, index));
                    $paramLink.click(lodash_1.default.partial(clickFuncParam, index));
                    addTypeahead($input, param, index);
                    currentParam += 1;
                }
                function addElementsAndCompile() {
                    if (partDef.dynamicParameters) {
                        lodash_1.default.each(part.params, (function (param, index) {
                            addParams(partDef.params[0], index);
                        }));
                        addParams(partDef.params[0], currentParam);
                    }
                    else {
                        lodash_1.default.each(partDef.params, addParams);
                    }
                }
                function relink() {
                    $paramsContainer.empty();
                    addElementsAndCompile();
                }
                relink();
            },
        };
    }
    exports_1("queryPartEditorLabeledDirective", queryPartEditorLabeledDirective);
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (jquery_1_1) {
                jquery_1 = jquery_1_1;
            },
            function (angular_1_1) {
                angular_1 = angular_1_1;
            }
        ],
        execute: function () {
            template = "\n<div class=\"dropdown cascade-open\">\n<a ng-click=\"showActionsMenu()\" class=\"query-part-name pointer dropdown-toggle\" data-toggle=\"dropdown\">{{part.def.type}}</a>\n\n<span>(</span><span class=\"query-part-parameters\"></span><span>)</span>\n<sub>{{part.def.categoryName}}</sub>\n<ul class=\"dropdown-menu\">\n  <li ng-repeat=\"action in partActions\">\n    <a ng-click=\"triggerPartAction(action)\">{{action.text}}</a>\n  </li>\n</ul>\n";
            angular_1.default.module('grafana.directives').directive('queryPartEditorLabeled', queryPartEditorLabeledDirective);
        }
    };
});
//# sourceMappingURL=query_part_editor.js.map