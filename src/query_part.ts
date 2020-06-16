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

import { functionRenderer, QueryPart, QueryPartDef } from './query_part_base/query_part';

const pointsAggregations = ['pointsabove', 'pointsbelow'];
const filterAggregations = ['abovek', 'belowk', 'topk', 'bottomk'];
const rootAggregations = ['average', 'count', 'delta', 'deltaPerSecond', 'ratePerSecond', 'max', 'min', 'notNegative', 'stddev', 'sum', 'sum2'];

let index = {};
let categories = {
  'For Each': [],
  Collapse: [],
  'Group By': [],
  Filters: [],
  Points: [],
};

function createPart(part): any {
  let def = index[part.categoryName][part.type];
  if (!def) {
    throw { message: 'Could not find query part ' + part.type };
  }
  return new QueryPart(part, def);
}

function register(options: any) {
  if (!options.category && options.categoryName) {
    options.category = categories[options.categoryName];
  }
  if (!index[options.categoryName]) {
    index[options.categoryName] = {};
  }
  index[options.categoryName][options.type] = new QueryPartDef(options);
  options.category.push(index[options.categoryName][options.type]);
}

let groupByTimeFunctions = [];

function replaceAggregationAddStrategy(selectParts, partModel, position) {
  selectParts.splice(position, 0, partModel);
}

function buildAggregateRenderer(ctype, of) {
  function aggregateRenderer(part, innerExpr, secondsInterval) {
    let tagGroup = of;
    if (part.params.length) {
      // if the part def has any params, use those
      tagGroup = part.params;
    } // otherwise, use the default `of` passed in to buildAggregateRenderer

    const aggregation = {
      type: 'group',
      of: tagGroup,
      each: [
        {
          type: ctype,
        },
      ],
    };
    if (ctype !== 'delta' && ctype !== 'deltaPerSecond' && ctype !== 'notNegative' && ctype !== 'stddev') {
      aggregation.each.forEach(each => {
        each['sampling'] = {
          unit: 'seconds',
          value: secondsInterval,
        };
      });
    }
    return aggregation;
  }
  return aggregateRenderer;
}
function buildFilterRenderer(ctype) {
  function filterRenderer(part, innerExpr, secondsInterval) {
    return {
      type: ctype,
      k: parseInt(part.params[0]),
      of: { type: 'empty' },
    };
  }
  return filterRenderer;
}
function buildPointsRenderer(ctype) {
  function pointsRenderer(part, innerExpr, secondsInterval) {
    return {
      type: ctype,
      threshold: parseInt(part.params[0]),
    };
  }
  return pointsRenderer;
}

function registerForEach(options: any) {
  options.renderer = buildAggregateRenderer(options.type, null);
  register(options);
}

function registerCollapse(options: any) {
  options.renderer = buildAggregateRenderer(options.type, []);
  register(options);
}

function registerGroupBy(options: any) {
  options.renderer = buildAggregateRenderer(options.type, []);
  register(options);
}

rootAggregations.forEach(aggregation => {
  registerForEach({
    type: aggregation,
    addStrategy: replaceAggregationAddStrategy,
    categoryName: 'For Each',
    params: [],
    defaultParams: [],
  });
  registerCollapse({
    type: aggregation,
    addStrategy: replaceAggregationAddStrategy,
    categoryName: 'Collapse',
    params: [],
    defaultParams: [],
  });

  registerGroupBy({
    type: aggregation,
    addStrategy: replaceAggregationAddStrategy,
    categoryName: 'Group By',
    dynamicParameters: true,
    params: [
      {
        name: 'tag',
        type: 'string',
        dynamicLookup: true,
      },
    ],
    defaultParams: [],
  });
});

filterAggregations.forEach(aggregation => {
  register({
    type: aggregation,
    addStrategy: replaceAggregationAddStrategy,
    renderer: buildFilterRenderer(aggregation),
    categoryName: 'Filters',
    params: [
      {
        name: 'k',
        type: 'int',
        options: [],
      },
    ],
    defaultParams: ['5'],
  });
});

pointsAggregations.forEach(aggregation => {
  register({
    type: aggregation,
    addStrategy: replaceAggregationAddStrategy,
    renderer: buildPointsRenderer(aggregation),
    categoryName: 'Points',
    params: [
      {
        name: 'threshold',
        type: 'int',
        options: [],
      },
    ],
    defaultParams: ['1'],
  });
});

register({
  type: 'time',
  category: groupByTimeFunctions,
  params: [
    {
      name: 'interval',
      type: 'time',
      options: [
        '$__interval',
        '1s',
        '2s',
        '5s',
        '10s',
        '20s',
        '30s',
        '1m',
        '2m',
        '5m',
        '10m',
        '20m',
        '30m',
        '1h',
        '3h',
        '6h',
        '12h',
        '1d',
        '7d',
        '30d',
      ],
    },
  ],
  defaultParams: ['1m'],
  renderer: functionRenderer,
});

export default {
  create: createPart,
  getCategories() {
    return categories;
  },
};
