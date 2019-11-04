System.register(["lodash"], function (exports_1, context_1) {
    "use strict";
    var lodash_1, QueryPartDef, QueryPart;
    var __moduleName = context_1 && context_1.id;
    function functionRenderer(part, innerExpr) {
        var str = part.def.type + '(';
        var parameters = lodash_1.default.map(part.params, function (value, index) {
            var paramType = part.def.params[index];
            if (paramType.type === 'time') {
                if (value === 'auto') {
                    value = '$__interval';
                }
            }
            if (paramType.quote === 'single') {
                return "'" + value + "'";
            }
            else if (paramType.quote === 'double') {
                return '"' + value + '"';
            }
            return value;
        });
        if (innerExpr) {
            parameters.unshift(innerExpr);
        }
        return str + parameters.join(', ') + ')';
    }
    exports_1("functionRenderer", functionRenderer);
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            }
        ],
        execute: function () {
            QueryPartDef = (function () {
                function QueryPartDef(options) {
                    this.type = options.type;
                    this.params = options.params;
                    this.defaultParams = options.defaultParams;
                    this.renderer = options.renderer;
                    this.category = options.category;
                    this.addStrategy = options.addStrategy;
                    this.categoryName = options.categoryName;
                    this.dynamicParameters = options.dynamicParameters;
                }
                return QueryPartDef;
            }());
            exports_1("QueryPartDef", QueryPartDef);
            QueryPart = (function () {
                function QueryPart(part, def) {
                    this.part = part;
                    this.def = def;
                    if (!this.def) {
                        throw { message: 'Could not find query part ' + part.type };
                    }
                    part.params = part.params || lodash_1.default.clone(this.def.defaultParams);
                    this.params = part.params;
                    this.updateText();
                }
                QueryPart.prototype.render = function (innerExpr) {
                    return this.def.renderer(this, innerExpr);
                };
                QueryPart.prototype.hasMultipleParamsInString = function (strValue, index) {
                    if (strValue.indexOf(',') === -1) {
                        return false;
                    }
                    return this.def.params[index + 1] && this.def.params[index + 1].optional;
                };
                QueryPart.prototype.removeParam = function (index) {
                    this.params.splice(index, 1);
                    this.part.params = this.params;
                    this.updateText();
                };
                QueryPart.prototype.updateParam = function (strValue, index) {
                    var _this = this;
                    if (this.hasMultipleParamsInString(strValue, index)) {
                        lodash_1.default.each(strValue.split(','), function (partVal, idx) {
                            _this.updateParam(partVal.trim(), idx);
                        });
                        return;
                    }
                    if (strValue === '' && this.def.params[index].optional) {
                        this.params.splice(index, 1);
                    }
                    else {
                        this.params[index] = strValue;
                    }
                    this.part.params = this.params;
                    this.updateText();
                };
                QueryPart.prototype.updateText = function () {
                    if (this.params.length === 0) {
                        this.text = this.def.type + '()';
                        return;
                    }
                    var text = this.def.type + '(';
                    text += this.params.join(', ');
                    text += ')';
                    this.text = text;
                };
                return QueryPart;
            }());
            exports_1("QueryPart", QueryPart);
        }
    };
});
//# sourceMappingURL=query_part.js.map