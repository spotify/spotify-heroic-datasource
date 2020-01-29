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
///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

export class HeroicConfigCtrl {
  public static templateUrl = 'partials/config.html';
  public current: any;

  constructor($scope) {
    this.current.jsonData.suggestionRules = this.current.jsonData.suggestionRules || [];
  }
  addRule() {
    this.current.jsonData.suggestionRules.unshift({ triggerFilter: null, filter: null, description: null, aggregation: null });
  }

  removeRule(index) {
    this.current.jsonData.suggestionRules.splice(index, 1);
  }
}
