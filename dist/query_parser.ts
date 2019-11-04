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

import { Target } from "./types";

export class QueryParser {

  public parseInto(queryRaw: string, target: Target) {
    const jsonRaw = JSON.parse(queryRaw);
    this.parseFiltersFromRaw(jsonRaw, target);
    this.parseAggregationsFromRaw(jsonRaw, target);
    target.globalAggregation = jsonRaw.features !== undefined
      && jsonRaw.features.length > 0
      && jsonRaw.features[0] === "com.spotify.heroic.distributed_aggregations";
  }

  private parseFiltersFromRaw(jsonRaw, target: Target) {
    const tags = [];
    let seen = 0;
    const keyFilter = jsonRaw.filter.filter(entry => entry[0] === "key");
    if (keyFilter.length > 0) {
      tags.push({key: "$key", operator: "=", value: keyFilter[0][1]});
    }
    jsonRaw.filter
    .filter(entry => entry[0] !== "key")
    .forEach((entry, index) => {
      if (entry === "and") {
        return;
      }
      const operator = entry[0];
      switch (operator) {
        case "key":
          tags.push({key: "$key", operator: "=", value: entry[1]});
          seen += 1;
          break;
        case "q":
          tags.push({operator: "q", type: "custom", key: entry[1]});
          break
        default:
          const item = {key: entry[1], operator: entry[0], value: entry[2]};
          if (seen > 0 || keyFilter.length > 0) {
            item["condition"] = "AND";
          }
          seen += 1;
          tags.push(item);
          break;
      }
    });
    target.tags = tags;
  }

  private parseAggregationsFromRaw(jsonRaw, target: Target) {
    const selects = [];
    jsonRaw.aggregators.forEach(aggr => {
      if (aggr.type === "group") {
        if (aggr.of === null) {
          selects.push({categoryName: "For Each", params: [], type: aggr.each[0].type});
        } else if (aggr.of.length === 0) {
          selects.push({categoryName: "Collapse", params:[], type: aggr.each[0].type});
        } else {
          selects.push({categoryName: "Group By", params: aggr.of, type: aggr.each[0].type});
        }
        if (aggr.each[0].sampling !== undefined && Object.keys(aggr.each[0].sampling).length > 0) {
          const param = this.samplingToParam(aggr.each[0].sampling);
          target.groupBy = [
            {
              params: [param],
              type: "time"
            }
          ];
        }
      } else {
        selects.push({categoryName: "Filters", params: [`${aggr.k}`], type: aggr.type});
      }
    });
    target.select = [selects];
  }

  private samplingToParam(sampling) {
    switch (sampling.unit) {
      case "seconds":
        return `${sampling.value}s`;
      case "minutes":
        return `${sampling.value}m`;
      case "hours":
        return `${sampling.value}h`;
      case "days":
        return `${sampling.value}d`;
      case "weeks":
        return `${sampling.value}w`;
      case "months":
        return `${sampling.value}M`;
      case "years":
        return `${sampling.value}y`;
      default:
        throw Error("Poor sampling");
    }
  }

}
