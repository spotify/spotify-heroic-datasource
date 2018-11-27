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

import { QueryCtrl } from "app/plugins/sdk";
import _ from "lodash";
import HeroicQuery from "./heroic_query";
import { MetadataClient } from "./metadata_client";
import { HeroicValidator } from './validator';
import { QueryParser } from './query_parser';
import queryPart from "./query_part";


export class HeroicQueryCtrl extends QueryCtrl {
  public static templateUrl = "partials/query.editor.html";

  public queryModel: HeroicQuery;
  public groupBySegment: any;
  public resultFormats: any[];
  public orderByTime: any[];
  public panelCtrl: any;
  public selectMenu: any;
  public target: any;
  public metadataClient: MetadataClient;
  public previousQuery: any;
  public warningMessage: string;
  public validator: HeroicValidator;
  public queryParser: QueryParser;
  /** @ngInject **/
  constructor($scope, $injector, private templateSrv, private $q, private uiSegmentSrv) {
    super($scope, $injector);
    this.target.alias = this.target.alias || "";
    if (this.target.globalAggregation !== undefined) {
      this.target.globalAggregation = this.target.globalAggregation;
    } else {
      this.target.globalAggregation = true;
    }

    this.panelCtrl.events.on('data-received', this.onDataReceived.bind(this), $scope);

    this.queryModel = new HeroicQuery(this.target,
        templateSrv,
        this.panel.scopedVars || {});
    this.groupBySegment = this.uiSegmentSrv.newPlusButton();
    this.resultFormats = [{ text: "Time series", value: "time_series" }, { text: "Table", value: "table" }];
    this.previousQuery = this.target.query;
    this.buildSelectMenu();

    this.warningMessage = "";
    this.validator = new HeroicValidator(this.target,
      this.datasource.tagAggregationChecks,
      this.datasource.tagCollapseChecks);
    this.queryParser = new QueryParser();
    this.metadataClient = new MetadataClient(
      this,
      this.datasource,
      this.panel.scopedVars,
      this.target,
      true,
      false
    );

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
      function(memo, cat, key) {
        const menu = {
          text: key,
          submenu: cat.map((item) => {
            return { text: item.type, value: item.type };
          }),
        };
        memo.push(menu);
        return memo;
      },
      []
    );
  }


  public addSelectPart(selectParts, cat, subitem) {
    this.queryModel.addSelectPart(selectParts, cat.text, subitem.value);
    this.refresh();
  }

  public getAliasCompleter() {

    return {
        getCompletions: (editor, session, pos, prefix, callback) => {
          let thisScoped;
          if (this.panelCtrl.dataList === undefined) {
            // Some third party panel
            thisScoped = [];
          } else {
            thisScoped = _.uniq(
                _.flatMap(this.panelCtrl.dataList
                            .filter(data => data.refId === this.target.refId),
                          data => Object.keys(data.scoped))
            );
          }

          const predictions = thisScoped.map(scope => {
            return {name: scope, value: `[[${scope}]]`};
          });

          callback(null, predictions);
      }
    }

  }

  public handleSelectPartEvent(selectParts, part, evt) {
    switch (evt.name) {
      case "get-param-options": {
        return this.metadataClient.getTagsOrValues({type: "key"}, 0, null, true);
      }
      case "part-param-changed": {
        this.refresh();
        break;
      }
      case "action": {
        this.queryModel.removeSelectPart(selectParts, part);
        this.refresh();
        break;
      }
      case "get-part-actions": {
        return this.$q.when([{ text: "Remove", value: "remove-part" }]);
      }
    }
  }

  public refresh() {
    this.queryModel.scopedVars["interval"] = {value: this.panelCtrl.interval};
    this.queryModel.scopedVars["__interval"] = {value: this.panelCtrl.interval};
    this.target.query = JSON.stringify(this.queryModel.render());
    if (this.target.query !== this.previousQuery) {
      this.panelCtrl.refresh();
    }
    this.previousQuery = this.target.query;
  }

  public refreshRaw() {
    this.queryParser.parseInto(this.target.queryRaw, this.target);
    this.queryModel.updateProjection();
    this.metadataClient.createTagSegments();
    this.refresh();
  }

  public clearWarnings() {
    this.warningMessage = "";
  }

  public onDataReceived(dataList){
    this.warningMessage = this.validator.checkForWarnings(dataList.filter(data => data.refId === this.target.refId));
  }

  public refreshAlias() {
    if (this.panelCtrl.dataList === undefined) {
      // Some third party panel
      this.queryModel.scopedVars["interval"] = {value: this.panelCtrl.interval};
      this.queryModel.scopedVars["__interval"] = {value: this.panelCtrl.interval};
      this.panelCtrl.refresh();
      return;
    }
    this.panelCtrl.dataList.forEach(data => {
      if (data.refId === this.target.refId) {
        const alias = this.templateSrv.replaceWithText(this.target.alias || "$tags", {});
        data.target = this.templateSrv.replaceWithText(alias, data.scoped);
      }
    });
    this.panelCtrl.events.emit('data-received', this.panelCtrl.dataList);
  }

  public handleGroupByPartEvent(part, index, evt) {
    switch (evt.name) {
      case "get-param-options": {
        return this.metadataClient.getTagsOrValues({type: "key"}, 0, null, false);
      }
      case "part-param-changed": {
        this.refresh();
        break;
      }
      case "action": {
        this.queryModel.removeGroupByPart(part, index);
        this.refresh();
        break;
      }
      case "get-part-actions": {
        if (part.def.type === "time") {
          return Promise.resolve([]);
        }
        return this.$q.when([{ text: "Remove", value: "remove-part" }]);
      }
    }
  }


  public getCollapsedText() {
    return this.target.query;
  }

  public getTags() {
    return this.target.tags;
  }

  public setTags(tags) {
    this.target.tags = tags;
  }


}
