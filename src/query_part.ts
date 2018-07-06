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

import { functionRenderer, QueryPart, QueryPartDef} from "./query_part_base/query_part";
const rootAggregations = [
  "abovek",
  "average",
  "belowk",
  "bottomk",
  "cardinality",
  "chain",
  "collapse",
  "count",
  "delta",
  "empty",
  "group",
  "group-unique",
  "max",
  "min",
  "opts",
  "pointsabove",
  "pointsbelow",
  "quantile",
  "spread",
  "stddev",
  "sum",
  "sum2",
  "topk",
  "tpl",
];
let index = {};
let categories = {
  "For Each": [],
  "Collapse": [],
  "Group By": [],
  "Selectors": [],
  "Transformations": [],
  "Predictors": [],
  "Math": [],
  "Aliasing": [],
  "Fields": [],
};

function createPart(part): any {
  let def = index[part.categoryName][part.type];
  if (!def) {
    throw { message: "Could not find query part " + part.type };
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

function replaceAggregationAddStrategy(selectParts, partModel) {
  // look for existing aggregation
  // for (var i = 0; i < selectParts.length; i++) {
  //   var part = selectParts[i];
  //   if (part.def.category === categories["For Each"]) {
  //     selectParts[i] = partModel;
  //     return;
  //   }
  //   if (part.def.category === categories.Selectors) {
  //     selectParts[i] = partModel;
  //     return;
  //   }
  // }

  selectParts.splice(1, 0, partModel);
}

function buildAggregateRenderer(ctype, of) {
  function aggregateRenderer(part, innerExpr) {
    const aggregation = {
      type: "group",
      of,
      each: [
        {
          type: ctype,
        },
      ],
    };
    if (ctype !== "delta" && ctype !== "deltaPerSecond" && ctype !== "notNegative") {
      aggregation.each[0]["sampling"] = {
        unit: "minutes",
        value: 30,
      };
    }
    return aggregation;
  }
  return aggregateRenderer;
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
// registerForEach({
//   type: 'average',
//   addStrategy: replaceAggregationAddStrategy,
//   category: categories["For Each"],
//   params: [],
//   defaultParams: [],
// });

rootAggregations.forEach((aggregation) => {
  registerForEach({
    type: aggregation,
    addStrategy: replaceAggregationAddStrategy,
    categoryName: "For Each",
    params: [],
    defaultParams: [],
  });
  registerCollapse({
    type: aggregation,
    addStrategy: replaceAggregationAddStrategy,
    categoryName: "Collapse",
    params: [],
    defaultParams: [],
  });
  // TODO: figure out tag arguments
  registerGroupBy({
    type: aggregation,
    addStrategy: replaceAggregationAddStrategy,
    categoryName: "Group By",
    params: [[]],
    defaultParams: [],
  });
});

// register({
//   type: 'derivative',
//   addStrategy: addTransformationStrategy,
//   category: categories.Transformations,
//   params: [
//     {
//       name: 'duration',
//       type: 'interval',
//       options: ['1s', '10s', '1m', '5m', '10m', '15m', '1h'],
//     },
//   ],
//   defaultParams: ['10s'],
//   renderer: functionRenderer,
// });
//
//
// register({
//   type: 'non_negative_derivative',
//   addStrategy: addTransformationStrategy,
//   category: categories.Transformations,
//   params: [
//     {
//       name: 'duration',
//       type: 'interval',
//       options: ['1s', '10s', '1m', '5m', '10m', '15m', '1h'],
//     },
//   ],
//   defaultParams: ['10s'],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'difference',
//   addStrategy: addTransformationStrategy,
//   category: categories.Transformations,
//   params: [],
//   defaultParams: [],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'non_negative_difference',
//   addStrategy: addTransformationStrategy,
//   category: categories.Transformations,
//   params: [],
//   defaultParams: [],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'moving_average',
//   addStrategy: addTransformationStrategy,
//   category: categories.Transformations,
//   params: [{ name: 'window', type: 'int', options: [5, 10, 20, 30, 40] }],
//   defaultParams: [10],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'cumulative_sum',
//   addStrategy: addTransformationStrategy,
//   category: categories.Transformations,
//   params: [],
//   defaultParams: [],
//   renderer: functionRenderer,
// });
//
//
register({
  type: "time",
  category: groupByTimeFunctions,
  params: [
    {
      name: "interval",
      type: "time",
      options: ["$__interval", "1s", "2s", "5s", "10s", "20s",
      "30s", "1m", "2m", "5m", "10m", "20m", "30m", "1h", "3h",
      "6h", "12h", "1d", "7d", "30d"],
    },
  ],
  defaultParams: ["$__interval"],
  renderer: functionRenderer,
});
//
register({
  type: "fill",
  category: groupByTimeFunctions,
  params: [
    {
      name: "fill",
      type: "string",
      options: ["none", "null", "0", "previous", "linear"],
    },
  ],
  defaultParams: ["null"],
  renderer: functionRenderer,
});
//
// register({
//   type: 'elapsed',
//   addStrategy: addTransformationStrategy,
//   category: categories.Transformations,
//   params: [
//     {
//       name: 'duration',
//       type: 'interval',
//       options: ['1s', '10s', '1m', '5m', '10m', '15m', '1h'],
//     },
//   ],
//   defaultParams: ['10s'],
//   renderer: functionRenderer,
// });
//
// // predictions
// register({
//   type: 'holt_winters',
//   addStrategy: addTransformationStrategy,
//   category: categories.Predictors,
//   params: [
//     { name: 'number', type: 'int', options: [5, 10, 20, 30, 40] },
//     { name: 'season', type: 'int', options: [0, 1, 2, 5, 10] },
//   ],
//   defaultParams: [10, 2],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'holt_winters_with_fit',
//   addStrategy: addTransformationStrategy,
//   category: categories.Predictors,
//   params: [
//     { name: 'number', type: 'int', options: [5, 10, 20, 30, 40] },
//     { name: 'season', type: 'int', options: [0, 1, 2, 5, 10] },
//   ],
//   defaultParams: [10, 2],
//   renderer: functionRenderer,
// });
//
// // Selectors
// register({
//   type: 'bottom',
//   addStrategy: replaceAggregationAddStrategy,
//   category: categories.Selectors,
//   params: [{ name: 'count', type: 'int' }],
//   defaultParams: [3],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'first',
//   addStrategy: replaceAggregationAddStrategy,
//   category: categories.Selectors,
//   params: [],
//   defaultParams: [],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'last',
//   addStrategy: replaceAggregationAddStrategy,
//   category: categories.Selectors,
//   params: [],
//   defaultParams: [],
//   renderer: functionRenderer,
// });
//
//
//
// register({
//   type: 'percentile',
//   addStrategy: replaceAggregationAddStrategy,
//   category: categories.Selectors,
//   params: [{ name: 'nth', type: 'int' }],
//   defaultParams: [95],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'top',
//   addStrategy: replaceAggregationAddStrategy,
//   category: categories.Selectors,
//   params: [{ name: 'count', type: 'int' }],
//   defaultParams: [3],
//   renderer: functionRenderer,
// });
//
// register({
//   type: 'tag',
//   category: groupByTimeFunctions,
//   params: [{ name: 'tag', type: 'string', dynamicLookup: true }],
//   defaultParams: ['tag'],
//   renderer: fieldRenderer,
// });
//
// register({
//   type: 'math',
//   addStrategy: addMathStrategy,
//   category: categories.Math,
//   params: [{ name: 'expr', type: 'string' }],
//   defaultParams: [' / 100'],
//   renderer: suffixRenderer,
// });
//

export default {
  create: createPart,
  getCategories() {
    return categories;
  },
};
