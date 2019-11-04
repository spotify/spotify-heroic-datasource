System.register(["jquery", "angular"], function (exports_1, context_1) {
    "use strict";
    var jquery_1, angular_1;
    var __moduleName = context_1 && context_1.id;
    function metricSegmentWrapper($compile, $sce, templateSrv) {
        var metricSegmentTemplate = '<metric-segment ' +
            'segment="segment"' +
            'get-options="getOptions()"' +
            'on-change="onChange()"' +
            'debounce="debounce">' +
            '</metric-segment>';
        return {
            scope: {
                segment: '=',
                getOptions: '&',
                onChange: '&',
                debounce: '@'
            },
            link: function ($scope, elem) {
                var $baseElem = jquery_1.default(metricSegmentTemplate);
                $baseElem.appendTo(elem);
                $compile(elem.contents())($scope);
                var input = jquery_1.default($baseElem[0].childNodes[0]);
                var typeahead = input.data("typeahead");
                var oldSource = typeahead.source;
                $scope.source = function (query, callback) {
                    $scope.segment.query = query;
                    if ($scope.segment.type === "key") {
                        callback(["-- remove --"]);
                    }
                    oldSource(query, callback);
                };
                typeahead.source = $scope.source;
                $scope.$$postDigest(function () {
                    if ($scope.segment.focus === true) {
                        $baseElem[0].childNodes.forEach(function (child) {
                            if (child.tagName === "A") {
                                child.click();
                            }
                        });
                    }
                });
            }
        };
    }
    exports_1("metricSegmentWrapper", metricSegmentWrapper);
    return {
        setters: [
            function (jquery_1_1) {
                jquery_1 = jquery_1_1;
            },
            function (angular_1_1) {
                angular_1 = angular_1_1;
            }
        ],
        execute: function () {
            angular_1.default.module('grafana.directives').directive('metricSegmentWrapper', metricSegmentWrapper);
        }
    };
});
//# sourceMappingURL=metric_segment_wrapper.js.map