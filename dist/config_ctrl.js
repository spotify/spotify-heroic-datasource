System.register([], function (exports_1, context_1) {
    "use strict";
    var HeroicConfigCtrl;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            HeroicConfigCtrl = (function () {
                function HeroicConfigCtrl($scope) {
                    this.current.jsonData.suggestionRules = this.current.jsonData.suggestionRules || [];
                }
                HeroicConfigCtrl.prototype.addRule = function () {
                    this.current.jsonData.suggestionRules.unshift({ triggerFilter: null, filter: null, description: null, aggregation: null });
                };
                HeroicConfigCtrl.prototype.removeRule = function (index) {
                    this.current.jsonData.suggestionRules.splice(index, 1);
                };
                HeroicConfigCtrl.templateUrl = "partials/config.html";
                return HeroicConfigCtrl;
            }());
            exports_1("HeroicConfigCtrl", HeroicConfigCtrl);
        }
    };
});
//# sourceMappingURL=config_ctrl.js.map