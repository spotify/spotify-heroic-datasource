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
      // const $baseElem = $(metricSegmentTemplate);
      const $baseElem = $(metricSegmentTemplate);
      $baseElem.appendTo(elem);
      $compile(elem.contents())($scope);
      if ($scope.segment.focus === true) {
        $baseElem[0].childNodes.forEach(child => {
          if (child.tagName === "A") {
            setTimeout(function() { child.click(); }, 50);
          }
        });
      }

    }
  };
}

angular.module('grafana.directives').directive('metricSegmentWrapper', metricSegmentWrapper);
