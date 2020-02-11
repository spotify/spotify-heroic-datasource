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
import { DataSeries, Target } from './types';

export class HeroicValidator {
  public target: Target;
  public tagAggregationChecks: any;
  public tagCollapseChecks: any[];

  constructor(target, tagAggregationChecks, tagCollapseChecks) {
    this.target = target;
    this.tagAggregationChecks = tagAggregationChecks;
    this.tagCollapseChecks = tagCollapseChecks;
  }

  public findUnsafeCollapses(data: DataSeries[]) {
    const collapsedKeys = _.uniq(
      _.flatMap(this.tagCollapseChecks, value => {
        return data
          .filter(({ meta }) => {
            const valueCount = meta.scoped[`tag_${value}_count`];
            return valueCount && valueCount.text !== '<0>' && valueCount.text !== '<1>';
          })
          .map(item => value);
      })
    );
    return collapsedKeys;
  }

  public findUnsafeAggregations(data: DataSeries[]) {
    const hasAggregations = this.target.select[0].filter(select => select.type !== 'min' && select.type !== 'max').length > 0;
    if (!hasAggregations) {
      return false;
    }
    const badTags = _.uniq(
      _.flatMap(this.tagAggregationChecks, (value, key) => {
        return data
          .filter(({ meta }) => {
            return meta.scoped[`tag_${key}`] !== undefined && _.includes(value, meta.scoped[`tag_${key}`].text);
          })
          .map(({ meta }) => `${key}:${meta.scoped[`tag_${key}`].text}`);
      })
    );
    return badTags;
  }

  public isMissingKey() {
    const { tags } = this.target;
    for (const tag of tags) {
      const { key } = tag;
      if (key === '$key') { return false; }
    }
    return true;
  }

  public checkForWarnings(data: DataSeries[]): string {
    const warnings = [];
    const badTags = this.findUnsafeAggregations(data);
    if (badTags.length > 0) {
      let message;
      if (badTags.length === 1) {
        message = `'${badTags[0]}'`;
      } else {
        message = `any of '${badTags.join("','")}'`;
      }
      warnings.push(`Aggregating <strong>${message}</strong> can cause misleading results.`);
    }

    if (this.isMissingKey()) {
      warnings.push('No $key filter specified. Omitting a $key filter may produce unintended results.');
    }

    const collapsedKeys = this.findUnsafeCollapses(data);
    if (collapsedKeys.length > 0) {
      let message;
      if (collapsedKeys.length === 1) {
        message = `Aggregating several <strong>\'${collapsedKeys[0]}\'</strong> is probably not what you want. Filter on a single '${collapsedKeys[0]}' or group by '${collapsedKeys[0]}' in an aggregation.`;
      } else {
        message =
          `Aggregating several of keys <strong>'${collapsedKeys.slice(0, collapsedKeys.length - 1).join("', '")}\' or \'${
          collapsedKeys[collapsedKeys.length - 1]
          }'</strong> ` + 'is probably not what you want. For each key, add a filter or group by aggregation.';
      }
      warnings.push(message);
    }

    // Errors/limits are set per query, not per series, but are included
    // on every series due to how the data list gets emitted from
    // Grafana.
    _.uniqBy(data, s => s.refId).forEach((series: DataSeries, refId: string) => {
      series.meta.limits.forEach(limit => {
        switch (limit) {
          case 'SERIES':
            warnings.push('Query would fetch too many time series. Try to add more filters.');
            break;
          case 'GROUP':
            let containsGroupBys = false;
            this.target.select[0].forEach(select => {
              containsGroupBys = containsGroupBys || select.params.length > 0;
            });
            if (containsGroupBys) {
              warnings.push(
                'Query would fetch too many time series. Try adding more filters or group by fewer tags to get fewer resulting time series'
              );
            } else {
              warnings.push(
                'Query would fetch too many time series. Try adding more filters or adding a Group aggregation to get fewer resulting time series'
              );
            }
            break;
          case 'QUOTA':
            warnings.push('Query would fetch too many metrics. Try to reduce the time range or add more filters to get fewer resulting metrics.');
            break;
          case 'AGGREGATION':
            if (this.target.select.length === 0) {
              // TODO: I think this is impossible, target.select is
              // supposed to be an array of size 1
              warnings.push('Query would aggregate too many metrics. Try add a sampling aggregation, like Average, Min, Max, or Sum');
            } else {
              warnings.push('Query would aggregate too many metrics. Try decreasing the resolution, like changing 1 minute to 1 hour');
            }
            break;
        }
      });
    });
    return warnings.join('<br>');
  }
}
