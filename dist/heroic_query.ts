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

import kbn from "app/core/utils/kbn";
import _ from "lodash";
import queryPart from "./query_part";

export default class HeroicQuery {
  public target: any;
  public selectModels: any[];
  public groupByParts: any;
  public templateSrv: any;
  public scopedVars: any;

  /** @ngInject */
  constructor(target, templateSrv?, scopedVars?) {
    this.target = target;
    this.templateSrv = templateSrv;
    this.scopedVars = scopedVars;

    target.resultFormat = target.resultFormat || "time_series";
    target.orderByTime = target.orderByTime || "ASC";
    target.tags = target.tags || [];
    target.groupBy = target.groupBy || [{ type: "time", params: ["$__interval"] }];
    target.select = target.select || [[{ type: "average", categoryName: "For Each", params: [] }]];

    this.updateProjection();
  }

  public updateProjection() {
    this.selectModels = _.map(this.target.select, function(parts: any) {
      return _.map(parts, queryPart.create);
    });
    this.groupByParts = _.map(this.target.groupBy, queryPart.create);
  }

  public updatePersistedParts() {
    this.target.select = _.map(this.selectModels, function(selectParts) {
      return _.map(selectParts, function(part: any) {
        return { type: part.def.type, params: part.params, categoryName: part.def.categoryName };
      });
    });
  }

  public addGroupBy(value) {
    let stringParts = value.match(/^(\w+)\((.*)\)$/);
    let typePart = stringParts[1];
    let arg = stringParts[2];
    let partModel = queryPart.create({ type: typePart, params: [arg] });
    let partCount = this.target.groupBy.length;

    if (partCount === 0) {
      this.target.groupBy.push(partModel.part);
    } else if (typePart === "time") {
      this.target.groupBy.splice(0, 0, partModel.part);
    } else if (typePart === "tag") {
      if (this.target.groupBy[partCount - 1].type === "fill") {
        this.target.groupBy.splice(partCount - 1, 0, partModel.part);
      } else {
        this.target.groupBy.push(partModel.part);
      }
    } else {
      this.target.groupBy.push(partModel.part);
    }

    this.updateProjection();
  }

  public removeGroupByPart(part, index) {
    let categories = queryPart.getCategories();

    if (part.def.type === "time") {
      // remove fill
      this.target.groupBy = _.filter(this.target.groupBy, (g: any) => g.type !== "fill");
      // remove aggregations
      this.target.select = _.map(this.target.select, (s: any) => {
        return _.filter(s, (part: any) => {
          let partModel = queryPart.create(part);
          if (partModel.def.category === categories["For Each"]) {
            return false;
          }
          return true;
        });
      });
    }

    this.target.groupBy.splice(index, 1);
    this.updateProjection();
  }

  public removeSelect(index: number) {
    // TODO: remove key
  }

  public removeSelectPart(selectParts, part) {
    // if we remove the field remove the whole statement
    if (part.def.type === "field") {
      if (this.selectModels.length > 1) {
        let modelsIndex = _.indexOf(this.selectModels, selectParts);
        this.selectModels.splice(modelsIndex, 1);
      }
    } else {
      let partIndex = _.indexOf(selectParts, part);
      selectParts.splice(partIndex, 1);
    }

    this.updatePersistedParts();
  }

  public addSelectPart(selectParts, categoryName, type) {
    let partModel = queryPart.create({ type, categoryName });
    partModel.def.addStrategy(selectParts, partModel, this);
    this.updatePersistedParts();
  }

  public getKey() {
    const measurement = this.target.measurement || "measurement";
    return this.templateSrv.replace(measurement, this.scopedVars, "regex");
  }

  public renderSubFilter(tag) {
    switch (tag.type) {
      case ("custom"):
        return ["q", tag.key];
      default:
        if (tag.operator.startsWith("!")) {
          return ["not", [tag.operator.split("!")[1], tag.key, tag.value]];
        }
        return [tag.operator, tag.key, tag.value];
    }
  }

  public buildFilter(filterChoices, includeVariables, includeScopedFilter) {
    let base;
    const keyTag = _.find(filterChoices, tag => tag.key === "$key" && tag.value !== "select tag value");
    const filteredTags = filterChoices.filter(tag => tag.value !== "select tag value" && tag.key !== "$key");
    if (keyTag) {
      base = ["and", ["key", keyTag.value]];
    } else if (filteredTags.length) {
      base = ["and"];
    } else {
      return ["true"];
    }
    const filter = base.concat(filteredTags
      .map(this.renderSubFilter));

    if (includeVariables) {
      return JSON.parse(this.templateSrv.replace(JSON.stringify(filter), this.scopedVars));
    }
    return filter;
  }
  public buildCurrentFilter(includeVariables, includeScopedFilter) {
    return this.buildFilter(this.target.tags, includeVariables, includeScopedFilter);
  }

  public render() {
    let target = this.target;
    const currentFilter = this.buildCurrentFilter(true, true);

    let currentIntervalUnit = null;
    let currentIntervalValue = null;
    if (target.groupBy.length) {
      currentIntervalUnit = "seconds";
      const newGroupBy = JSON.parse(this.templateSrv.replace(JSON.stringify(target.groupBy), this.scopedVars));
      currentIntervalValue = kbn.interval_to_seconds(newGroupBy[0].params[0]);
    }

    const aggregators = this.selectModels.map((modelParts) => {
      return modelParts.map((modelPart) => {
        return modelPart.def.renderer(modelPart, undefined, currentIntervalValue);
      });
    });


    let features;
    if (this.target.globalAggregation === false) {
      features = [];
    } else {
      features = ["com.spotify.heroic.distributed_aggregations"];
    }

    return {
      filter: currentFilter,
      aggregators: aggregators[0],
      features: features,
      range: "$timeFilter",
    };


  }

  public renderAdhocFilters(filters) {
    return this.buildFilter(filters, false, false);
  }
}
