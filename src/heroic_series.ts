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

import TableModel from "app/core/table_model";
import _ from "lodash";

export default class HeroicSeries {
  public series: any;
  public alias: any;
  public annotation: any;
  public templateSrv: any;
  public queryResolution: any;


  constructor(options) {
    this.series = options.series;
    this.alias = options.alias;
    this.annotation = options.annotation;
    this.templateSrv = options.templateSrv;
    this.queryResolution = options.resolution;
  }

  public _convertData(dataPoint) {
    return [dataPoint[1], dataPoint[0]];
  }

  public getMinFromResults(results) {
    return _.min(results.map(series => series.values[0][0]));
  }

  public getMaxFromResults(results) {
    return _.max(results.map(series => series.values[series.values.length -1][0]))
  }

  public fillTimeSeries(series, min, max, step) {
    const fillWith = null;
    let curr = min;
    const before = [];
    while (curr < series.values[0][0]) {
      before.push([curr, fillWith]);
      curr += step;
    }
    const after = [];
    curr = series.values[series.values.length - 1][0] + step;
    while (curr < max) {
      after.push([curr, fillWith]);
      curr += step;
    }
    let index = 0;
    const newValues = [];
    while (index < series.values.length - 1) {
      newValues.push(series.values[index]);
      let currentValue = series.values[index][0];
      let nextValue = series.values[index + 1][0];
      if ((nextValue - currentValue) === step) {
        index += 1
        continue
      } else {
        const iterations = (nextValue - currentValue) / step;
        for (let i=1; i < iterations; i+=1) {
          newValues.push([currentValue + (step * i), fillWith]);
        }
        index += 1;

      }
    }
    newValues.push(series.values[series.values.length - 1]);
    const withBefore = before.concat(newValues);
    const withAfter = withBefore.concat(after);
    series.values = withAfter;
  }

  public getTimeSeries() {
    const min = this.getMinFromResults(this.series.result);
    const max = this.getMaxFromResults(this.series.result);
    return this.series.result.map((series) => {
      if (this.queryResolution) {
        this.fillTimeSeries(series, min, max, this.queryResolution*1000);
      }
      const scoped = this.buildScoped(series);
      const name = this.templateSrv.replaceWithText(this.alias || "$tags", scoped);
      return { target: name, datapoints: series.values.map(this._convertData), scoped: scoped };
    });
  }

  public getAnnotations() {
    let list = [];
    const tagsColumnList = (this.annotation.tagsColumn || "").replace(/\s/g, "").split(",");
    _.each(this.series, (series) => {
      let titleCol = null;
      let tagsCol = [];
      let textCol = null;
      _.each(series.tags, (value, column) => {

        if (column === "sequence_number") {
          return;
        }

        if (column === this.annotation.titleColumn) {
          titleCol = column;
          return;
        }

        if (_.includes(tagsColumnList, column)) {
          tagsCol.push(column);
          return;
        }
        if (column === this.annotation.textColumn) {
          textCol = column;
          return;
        }
      });
      _.each(series.values, (value, index) => {
        let data = {
          annotation: this.annotation,
          time: +new Date(value[0]),
          title: series.tags[titleCol],
          // Remove empty values, then split in different tags for comma separated values
          tags: _.uniq(_.flatten(
            tagsCol
              .filter(function(t) {
                return series.tags[t];
              })
              .map(function(t) {
                return series.tags[t].split(",");
              })
          )),
          text: series.tags[textCol],
        };
        if (this.annotation.ranged) {
          data['regionId'] = `${series.hash}-${index}`;
          const dataCopy = Object.assign({}, data);

          switch (this.annotation.rangeType) {
            case "endTimeSeconds":
              dataCopy.time = +new Date(value[1] * 1000);
              break;
            case "durationMs":
              dataCopy.time = +new Date(value[0] + value[1]);
              break;
            case "durationSeconds":
              dataCopy.time = +new Date(value[0] + (value[1] * 1000));
              break;
            case "endTimeMs":
            default:
              dataCopy.time = +new Date(value[1]);
          }
          list.push(data);
          list.push(dataCopy);

        } else {
          list.push(data);
        }

      });
    });

    return list;
  }

  public getTable() {
    let table = new TableModel();
    if (this.series.result.length === 0) {
      return table;
    }
    table.columns = [{ text: "Time", type: "time" }, { text: "Value", type: "value" }].concat(
      Object.keys(this.series.commonTags).map((key) => {
        return { text: key, type: key };
      })
    );

    _.each(this.series.result, (series, seriesIndex) => {
      // if (seriesIndex === 0) {
      //   j = 0;
      //   // Check that the first column is indeed 'time'
      //   table.columns.push({ text: 'Time', type: 'time' });
      //
      //   _.each(_.keys(series.tags), function(key) {
      //     table.columns.push({ text: key });
      //   });
      // }
      if (series.values) {
        for (let k = 0; k < series.values.length; k++) {
          let values = series.values[k];
          let reordered = [values[0], values[1]];
          if (series.tags) {
            reordered.push.apply(reordered, table.columns
              .filter(column => column.type !== "time" && column.type !== "value")
              .map(column => series.tags[column.type]));
          }

          table.rows.push(reordered);
        }
      }
    });
    return table;
  }

  public buildScopedHelper(scoped, counts, tags, common) {
    for (let tk in counts) {
      scoped[`tag_${tk}`] = { text: "<" + counts[tk] + ">" };
      scoped[`{tag_${tk}_count`] = { text: "<" + counts[tk] + ">" };
    }

    for (let t in tags) {
      scoped[`tag_${t}`] = { text: tags[t] };
      scoped[`tag_${t}_count`] = { text: "<" + 1 + ">" };
    }

    for (let c in common) {
      if (tags[c]) {
        continue; // do not override series tags
      }
      scoped[`tag_${c}`] = { text: common[c] };
      scoped[`tag_${c}_count`] = { text: "<" + common[c].length + ">" };
    }

  }

  public buildScoped(group) {
    const scoped = {tags: {text: ""}};
    this.buildScopedHelper(scoped, group.tagCounts, group.tags, this.series.commonTags);
    this.buildScopedHelper(scoped, group.resourceCounts, group.resource, this.series.commonResource);
    const tagsString = this.buildTags(group.tags, group.tagCounts);
    const resourceString = this.buildTags(group.resource, group.resourceCounts);
    if (resourceString) {
      scoped.tags.text = [tagsString, resourceString].join(",");
    } else {
      scoped.tags.text = tagsString;
    }
    return scoped;
  }

  public buildTags(tags, tagCounts) {
    let parts = [];

    for (let k in tags) {
      parts.push(this.quoteString(k) + "=" + this.quoteString(tags[k]));
    }

    for (let tk in tagCounts) {
      parts.push(this.quoteString(tk) + "=" + `<${tagCounts[tk]}>`);
    }

    return parts.join(", ");
  }
  public quoteString(s) {
    let quoted = false;
    let result = [];

    for (let i = 0, l = s.length; i < l; i++) {
      let c = s[i];

      if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")
        || (c >= "0" && c <= "9") || c === "/" || c === ":" || c === "-") {
        result.push(c);
        continue;
      }

      switch (c) {
        case "\b":
          result.push("\\b");
          break;
        case "\t":
          result.push("\\t");
          break;
        case "\n":
          result.push("\\n");
          break;
        case "\f":
          result.push("\\f");
          break;
        case "\r":
          result.push("\\r");
          break;
        case "'":
          result.push("\\'");
          break;
        case "\\":
          result.push("\\\\");
          break;
        case "\"":
          result.push("\\\"");
          break;
        default:
          result.push(c);
          break;
      }

      quoted = true;
    }

    if (quoted) {
      return "\"" + result.join("") + "\"";
    }

    return result.join("");
  }
}
