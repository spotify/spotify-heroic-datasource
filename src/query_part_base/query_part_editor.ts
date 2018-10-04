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

import _ from 'lodash';
import $ from 'jquery';
import angular from 'angular';

const template = `
<div class="dropdown cascade-open">
<a ng-click="showActionsMenu()" class="query-part-name pointer dropdown-toggle" data-toggle="dropdown">{{part.def.type}}</a>

<span>(</span><span class="query-part-parameters"></span><span>)</span>
<br/>
<sub>{{part.def.categoryName}}</sub>
<ul class="dropdown-menu">
  <li ng-repeat="action in partActions">
    <a ng-click="triggerPartAction(action)">{{action.text}}</a>
  </li>
</ul>
`;

/** @ngInject */
export function queryPartEditorLabeledDirective($compile, templateSrv) {
  const paramTemplate = '<input type="text" class="hide input-mini tight-form-func-param"></input>';

  return {
    restrict: 'E',
    template: template,
    scope: {
      part: '=',
      handleEvent: '&',
      debounce: '@',
    },
    link: function postLink($scope, elem) {
      const part = $scope.part;
      const partDef = part.def;
      const $paramsContainer = elem.find('.query-part-parameters');
      const debounceLookup = $scope.debounce;
      let currentParam = 0;
      let linkMode = true;

      $scope.partActions = [];

      function clickFuncParam(paramIndex) {
        /*jshint validthis:true */
        linkMode = false;
        const $link = $(this);
        const $input = $link.next();

        $input.val(part.params[paramIndex]);
        $input.css('width', $link.width() + 16 + 'px');

        $link.hide();
        $input.show();
        $input.focus();
        $input.select();

        const typeahead = $input.data('typeahead');
        if (typeahead) {
          $input.val('');
          typeahead.lookup();
        }
      }

      function inputBlur(paramIndex) {
        /*jshint validthis:true */
        linkMode = true;
        const $input = $(this);
        const $link = $input.prev();
        const newValue = $input.val();
        let partDefParamIndex = paramIndex;
        if (partDef.dynamicParameters) {
          partDefParamIndex = 0;
        }
        if (newValue === "-- remove --") {
          part.removeParam(paramIndex);
          currentParam = 0;
          relink();
          $scope.$apply(() => {
            $scope.handleEvent({ $event: { name: 'part-param-changed' } });
          });
        } else if (newValue !== '' || part.def.params[partDefParamIndex].optional) {
          $link.html(templateSrv.highlightVariablesAsHtml(newValue));

          part.updateParam($input.val(), paramIndex);
          $scope.$apply(() => {
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
        /*jshint validthis:true */
        if (e.which === 13) {
          inputBlur.call(this, paramIndex);
        }
      }

      function inputKeyDown() {
        /*jshint validthis:true */
        this.style.width = (3 + this.value.length) * 8 + 'px';
      }

      function addTypeahead($input, param, paramIndex) {
        if (!param.options && !param.dynamicLookup) {
          return;
        }

        const typeaheadSource = function (query, callback) {
          if (param.options) {
            let options = param.options;
            if (param.type === 'int') {
              options = _.map(options, function (val) {
                return val.toString();
              });
            }
            return options;
          }

          $scope.$apply(function () {
            $scope.handleEvent({$event: {name: 'get-param-options'}}).then(function (result) {
              const dynamicOptions = _.map(result, function (op) {
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
          updater: function(value) {
            setTimeout(function() {
              inputBlur.call($input[0], paramIndex);
            }, 0);
            return value;
          },
        });

        const typeahead = $input.data('typeahead');
        typeahead.lookup = function() {
          if (linkMode) {
            return [];
          }
          this.query = this.$element.val() || '';
          const items = this.source(this.query, $.proxy(this.process, this));
          return items ? this.process(items) : items;
        };

        if (debounceLookup) {
          typeahead.lookup = _.debounce(typeahead.lookup, 500, { leading: true });
        }
      }

      $scope.showActionsMenu = function() {
        $scope.handleEvent({ $event: { name: 'get-part-actions' } }).then(res => {
          $scope.partActions = res;
        });
      };

      $scope.triggerPartAction = function(action) {
        $scope.handleEvent({ $event: { name: 'action', action: action } });
      };

      function addParams(param, index) {
        if (param.optional && part.params.length <= index) {
          return;
        }

        if (index > 0) {
          $('<span>, </span>').appendTo($paramsContainer);
        }
        let paramValue = templateSrv.highlightVariablesAsHtml(part.params[index]);
        if (!paramValue) {
          paramValue = "&nbsp&nbsp";
        }
        const $paramLink = $('<a class="graphite-func-param-link pointer">' + paramValue + '</a>');
        const $input = $(paramTemplate);

        $paramLink.appendTo($paramsContainer);
        $input.appendTo($paramsContainer);

        $input.blur(_.partial(inputBlur, index));
        $input.keyup(inputKeyDown);
        $input.keypress(_.partial(inputKeyPress, index));
        $paramLink.click(_.partial(clickFuncParam, index));

        addTypeahead($input, param, index);
        currentParam += 1;
      }

      function addElementsAndCompile() {
        if (partDef.dynamicParameters) {
          _.each(part.params, ((param, index) => {
            addParams(partDef.params[0], index)
          }));
          addParams(partDef.params[0], currentParam);

        } else {
          _.each(partDef.params, addParams);
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


angular.module('grafana.directives').directive('queryPartEditorLabeled', queryPartEditorLabeledDirective);
