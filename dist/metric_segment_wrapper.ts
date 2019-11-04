import $ from 'jquery';
import angular from 'angular';

/** @ngInject */
export function metricSegmentWrapper($compile, $sce, templateSrv) {
    const metricSegmentTemplate =
      '<metric-segment ' +
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

    link: ($scope, elem) => {
      const $baseElem = $(metricSegmentTemplate);
      $baseElem.appendTo(elem);
      $compile(elem.contents())($scope);
      const input = $($baseElem[0].childNodes[0]);
      const typeahead = input.data("typeahead");
      const oldSource = typeahead.source;
      $scope.source = (query, callback) => {
        // this is not ideal -- how can we pass query to the child getOptions
        $scope.segment.query = query;
        if ($scope.segment.type === "key") {
          callback(["-- remove --"]);
        }
        oldSource(query, callback);
      };

      typeahead.source = $scope.source;

      $scope.$$postDigest(() => {
        if ($scope.segment.focus === true) {
          $baseElem[0].childNodes.forEach(child => {
            if (child.tagName === "A") {
              child.click();
            }
          });
        }
      });
    }
  };
}

angular.module('grafana.directives').directive('metricSegmentWrapper', metricSegmentWrapper);
