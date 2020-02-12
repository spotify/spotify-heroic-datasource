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

import { QueryCtrl } from 'app/plugins/sdk';
import _ from 'lodash';
import HeroicQuery from './heroic_query';
import { MetadataClient } from './metadata_client';
import { HeroicValidator } from './validator';
import { QueryParser } from './query_parser';
import queryPart from './query_part';
import { DataSeries, RenderedQuery, Target, Tag, Category, CategoryItem, QueryPart, Part } from './types';
import HeroicDatasource from './datasource';
import WarningsCache from './warnings_cache';

//@ts-ignore
import { PanelEvents, AppEvents } from '@grafana/data';
//@ts-ignore
import appEvents from 'app/core/app_events';

export class HeroicQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  queryModel: HeroicQuery;
  groupBySegment: any;
  resultFormats: any[];
  panelCtrl: any;
  selectMenu: any;
  target: Target;
  metadataClient: MetadataClient;
  previousQuery: any;
  validator: HeroicValidator;
  queryParser: QueryParser;
  currentSuggestions: any[];
  aliasCompleterCache: string[];
  dataList: DataSeries[];
  warnings: string[];
  warningsKey: string;
  panel: any;
  datasource: HeroicDatasource;

  /** @ngInject **/
  constructor($scope, $injector, private templateSrv, private $q, private uiSegmentSrv) {
    super($scope, $injector);
    this.target.alias = this.target.alias || '';
    if (this.target.globalAggregation !== undefined) {
      this.target.globalAggregation = this.target.globalAggregation;
    } else {
      this.target.globalAggregation = true;
    }

    this.warningsKey = WarningsCache.createKey({
      panelId: this.panel.id,
      refId: this.target.refId,
      dashboardId: this.panelCtrl.dashboard.id,
    });
    if (this.datasource.warningsCache.hasCache(this.warningsKey)) {
      this.warnings = this.datasource.warningsCache.getWarnings(this.warningsKey);
    } else {
      this.warnings = [];
    }

    this.queryModel = new HeroicQuery(this.target, templateSrv, this.panel.scopedVars || {});
    this.groupBySegment = this.uiSegmentSrv.newPlusButton();
    this.resultFormats = [
      { text: 'Time series', value: 'time_series' },
      { text: 'Table', value: 'table' },
    ];
    this.previousQuery = this.target.query;
    this.buildSelectMenu();
    this.validator = new HeroicValidator(this.target, this.datasource.tagAggregationChecks, this.datasource.tagCollapseChecks);
    this.queryParser = new QueryParser();
    this.currentSuggestions = [];
    this.metadataClient = new MetadataClient(this, this.datasource, this.panel.scopedVars, this.target, true, false);
    this.aliasCompleterCache = [];
    this.refresh = _.debounce(this.refresh.bind(this), 500);
    this.panel.events.on(PanelEvents.dataReceived, this.onDataReceived.bind(this), $scope);
    this.panel.events.on(PanelEvents.refresh, this.onRefresh.bind(this), $scope);
  }

  public onRefresh() {
    this.datasource.warningsCache.removeCache(this.warningsKey);
  }

  public toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
    if (this.target.rawQuery) {
      this.target.queryRaw = JSON.stringify(JSON.parse(this.target.query), null, 2);
    }
  }

  public buildSelectMenu() {
    const categories = queryPart.getCategories();
    this.selectMenu = _.reduce(
      categories,
      function (memo, cat, key) {
        const menu = {
          text: key,
          submenu: cat.map(item => {
            return { text: item.type, value: item.type };
          }),
        };
        memo.push(menu);
        return memo;
      },
      []
    );
  }

  public addSelectPart(selectParts, cat: Category, subitem: CategoryItem, position) {
    this.queryModel.addSelectPart(selectParts, cat.text, subitem.value, position);
    if (cat.text === 'Filters') {
      this.target.globalAggregation = false;
    }
    this.ctrlRefresh({ shouldQueryChange: false });
  }

  public getAliasCompleter() {
    return {
      getCompletions: (editor, session, pos, prefix, callback) => {
        callback(null, this.aliasCompleterCache);
      },
    };
  }

  public handleSelectPartEvent(selectParts, part, evt) {
    switch (evt.name) {
      case 'get-param-options': {
        return this.metadataClient.tagKeyCount({ type: 'key' }, 0, null, true);
      }
      case 'part-param-changed': {
        this.ctrlRefresh({ shouldQueryChange: false });
        break;
      }
      case 'action': {
        if (evt.action.value === 'remove-part') {
          this.queryModel.removeSelectPart(selectParts, part);
          this.ctrlRefresh({ shouldQueryChange: true });
        } else {
          const category = _.find(this.selectMenu, menu => menu.text === evt.action.value);
          const newPart = _.find(category.submenu, item => item.value === part.part.type);
          const position = selectParts.indexOf(part);
          this.queryModel.removeSelectPart(selectParts, part);
          this.addSelectPart(selectParts, category, newPart, position);
          this.ctrlRefresh({ shouldQueryChange: false });
        }
        break;
      }
      case 'get-part-actions': {
        if (part.part.categoryName === 'Filters') {
          return this.$q.when([{ text: 'Remove', value: 'remove-part' }]);
        } else {
          return this.$q.when([
            { text: 'Remove', value: 'remove-part' },
            { text: 'Convert To Collapse', value: 'Collapse' },
            { text: 'Convert To For Each', value: 'For Each' },
            { text: 'Convert To Group By', value: 'Group By' },
          ]);
        }
      }
      case 'part-order-changed': {
        const { from, to } = evt.parts;
        this.queryModel.reorderSelectParts(selectParts, from, to);
        this.ctrlRefresh({ shouldQueryChange: true });
        break;
      }
      default: {
        throw new Error(`Expected valid event name. Received: ${evt.name}`);
      }
    }
  }

  public ctrlRefresh(options: { shouldQueryChange: boolean }) {
    this.queryModel.scopedVars['interval'] = { value: this.panelCtrl.interval };
    this.queryModel.scopedVars['__interval'] = { value: this.panelCtrl.interval };
    this.checkSuggestions();
    this.checkGlobalAggregation();
    const query: RenderedQuery = this.queryModel.render();
    this.target.query = JSON.stringify(query);
    this.previousQuery = this.target.query;
    if (options.shouldQueryChange) {
      this.refresh();
    }
  }

  public refreshRaw() {
    this.queryParser.parseInto(this.target.queryRaw, this.target);
    this.queryModel.updateProjection();
    this.metadataClient.createTagSegments();
    this.ctrlRefresh({ shouldQueryChange: false });
  }

  public appendSuggestion(suggestion) {
    this.currentSuggestions = [];
    const queryRaw = JSON.parse(this.target.query);
    queryRaw.filter = queryRaw.filter.concat(suggestion.filter);
    if (suggestion.aggregation !== undefined && suggestion.aggregation !== null && queryRaw.aggregators.length === 0) {
      queryRaw.aggregators = queryRaw.aggregators.concat(suggestion.aggregation);
    }
    this.target.queryRaw = JSON.stringify(queryRaw, null, 2);
    this.refreshRaw();
  }

  public checkSuggestions() {
    const suggestions = [];
    const query: RenderedQuery = this.queryModel.render();
    this.datasource.suggestionRules.forEach(rule => {
      const rule2 = _.cloneDeep(rule);
      rule2.triggerFilter = rule2.triggerFilter.map(item => {
        if (_.isArray(item) && item[item.length - 1] === '*') {
          const key = item[item.length - 2];
          const value = _.first(
            query.filter.filter(item => _.isArray(item) && item[item.length - 2] === key).map(item => item[item.length - 1])
          );
          item[item.length - 1] = value;
        }
        return item;
      });
      if (_.isEqual(_.sortBy(rule2.triggerFilter), _.sortBy(query.filter))) {
        suggestions.push(rule2);
      }
    });
    this.currentSuggestions = suggestions;
  }

  public setWarnings() {
    this.warnings = this.datasource.warningsCache.getWarnings(this.warningsKey);
  }

  public resetWarnings() {
    this.datasource.warningsCache.removeAllWarnings(this.warningsKey);
    this.setWarnings();
  }

  public clearWarning(warning) {
    this.datasource.warningsCache.removeWarning(this.warningsKey, warning);
    this.setWarnings();
  }

  public addWarning(warning) {
    this.datasource.warningsCache.addWarning(this.warningsKey, warning);
    this.setWarnings();
  }

  public checkGlobalAggregation() {
    this.queryModel.selectModels.forEach((model: QueryPart[]) => {
      for (const queryPart of model) {
        if (this.target.globalAggregation && queryPart.part.categoryName === 'Filters') {
          this.addWarning('Filters are not compatible with Global Aggregations.');
          break;
        }
      }
    });
  }

  public alert(msg) {
    appEvents.emit(AppEvents.alertError, [`Heroic Query ${this.target.refId}:`, msg]);
  }

  public onDataReceived(dataList: DataSeries[]) {
    dataList = dataList.filter(series => series.meta !== undefined && series.meta.isHeroicSeries && series.refId === this.target.refId);
    this.dataList = dataList;

    if (this.target.resultFormat === 'time_series' && this.dataList.length) {
      this.setWarnings();
      this.validator.getSuggestions(dataList).forEach(this.alert.bind(this));

      const filtered: DataSeries[] = dataList.filter(data => data.refId === this.target.refId);
      const scoped = _.uniq(_.flatMap(filtered, data => Object.keys(data.meta.scoped)));
      this.aliasCompleterCache = scoped.map(scope => {
        return { name: scope, value: `[[${scope}]]` };
      });
    }
  }

  public refreshAlias() {
    if (this.dataList === undefined) {
      // Some third party panel
      this.queryModel.scopedVars['interval'] = { value: this.panelCtrl.interval };
      this.queryModel.scopedVars['__interval'] = { value: this.panelCtrl.interval };
      return;
    }
    this.dataList.forEach(data => {
      if (data.refId === this.target.refId) {
        const alias = this.templateSrv.replaceWithText(this.target.alias || '$tags', {});
        data.target = this.templateSrv.replaceWithText(alias, data.meta.scoped);
      }
    });
    // Shortcut to re-render the existing data
    this.panelCtrl.events.emit(PanelEvents.dataReceived, this.dataList);
  }

  public handleGroupByPartEvent(part, index, evt) {
    switch (evt.name) {
      case 'get-param-options': {
        return this.metadataClient.getTagsOrValues({ type: 'key' }, 0, null, false);
      }
      case 'part-param-changed': {
        this.ctrlRefresh({ shouldQueryChange: false });
        break;
      }
      case 'action': {
        this.queryModel.removeGroupByPart(part, index);
        this.ctrlRefresh({ shouldQueryChange: false });
        break;
      }
      case 'get-part-actions': {
        if (part.def.type === 'time') {
          return Promise.resolve([]);
        }
        return this.$q.when([{ text: 'Remove', value: 'remove-part' }]);
      }
    }
  }

  public getCollapsedText() {
    return this.target.query;
  }

  public getTags(): Tag[] {
    return this.target.tags;
  }

  public setTags(tags: Tag[]) {
    this.target.tags = tags;
  }

}
