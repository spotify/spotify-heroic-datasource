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

import angular from "angular";
import _ from "lodash";
import HeroicQuery from "./heroic_query";
import { LruCache } from "./lru_cache";

export class MetadataClient {
  public static templateUrl = "partials/query.editor.html";
  public static DEBOUNCE_MS = 500; // milliseconds to wait between keystrokes before sending queries for metadata

  public queryModel: HeroicQuery;
  public lruTag: any;
  public lruTagValue: any;
  public keyLru: any;
  public error: any;
  public addCustomQuery: any;
  public removeTagFilterSegment: any;
  public tagSegments: any[];
  public customTagSegments: any[];


  /** @ngInject **/
  constructor(
    private controller,
    private datasource,
    private scopedVars,
    private target,
    private includeVariables,
    private includeScopes
  ) {
    this.tagSegments = [];
    this.customTagSegments = [];
    if (!this.controller.fakeController) {
      for (const tag of this.controller.getTags()) {
        if (tag.type && tag.type === "custom") {
          this.customTagSegments.push(this.controller.uiSegmentSrv.newSegment({value: tag.key, valid: true, expandable: false}));
          continue;
        }
        if (!tag.operator) {
          tag.operator = "=";
        }

        if (tag.condition) {
          this.tagSegments.push(this.controller.uiSegmentSrv.newCondition(tag.condition));
        }

        this.tagSegments.push(this.controller.uiSegmentSrv.newKey(tag.key));
        this.tagSegments.push(this.controller.uiSegmentSrv.newOperator(tag.operator));
        this.tagSegments.push(this.controller.uiSegmentSrv.newKeyValue(tag.value));
      }
      this.fixTagSegments();
    }

    this.lruTag = new LruCache();
    this.lruTagValue = new LruCache();
    this.keyLru = new LruCache();
    this.queryModel = new HeroicQuery(this.target, this.controller.templateSrv, this.scopedVars);
    this.includeVariables = includeVariables;
    this.includeScopes = includeScopes;
    this.addCustomQuery = this.controller.uiSegmentSrv.newPlusButton();
    this.removeTagFilterSegment = this.controller.uiSegmentSrv.newSegment({
      fake: true,
      value: "-- remove tag filter --",
    });

  }

  public fixTagSegments() {
    const count = this.tagSegments.length;
    const lastSegment = this.tagSegments[Math.max(count - 1, 0)];

    if (!lastSegment || lastSegment.type !== "plus-button") {
      this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
    }
  }


  public getMeasurements = (measurementFilter) => {
    const filter = {
      key: measurementFilter,
      filter: this.queryModel.buildCurrentFilter(this.includeVariables, this.includeScopes),
      limit: 10,
    };
    const cacheKey = JSON.stringify(filter);
    if (this.keyLru.has(cacheKey)) {
      return Promise.resolve(this.keyLru.get(cacheKey));
    }
    return this.datasource
      .doRequest("/metadata/key-suggest", { method: "POST", data: filter })
      .then((result) => {
        return this.transformToSegments(true, "key")(result.data.suggestions);
      })
      .then((result) => {
        this.keyLru.put(cacheKey, result);
        return result;
      });
  }

  public handleQueryError(err) {
    this.error = err.message || "Failed to issue metric query";
    return [];
  }

  public transformToSegments(addTemplateVars, segmentKey) {
    return (results) => {
      const segments = _.map(results, (segment) => {
        return this.controller.uiSegmentSrv.newSegment({
          value: segment[segmentKey],
          expandable: false,
        });
      });

      if (addTemplateVars) {
        for (const variable of this.controller.templateSrv.variables) {
          segments.unshift(
            this.controller.uiSegmentSrv.newSegment({
              value: "$" + variable.name,
              expandable: false,
            })
          );
        }
      }
      return segments;
    };
  }

  public queryTagsAndValues(data, dedupe, cache) {
    const cacheKey = JSON.stringify(data);
    if (cache.has(cacheKey)) {
      return Promise.resolve(cache.get(cacheKey));
    }
    return this.datasource
      .doRequest("/metadata/tag-suggest", { method: "POST", data: data })
      .then((result) => {
        const seen = new Set();
        return result.data.suggestions
          .filter((suggestion) => {
            if (seen.has(suggestion[dedupe])) {
              return false;
            }
            seen.add(suggestion[dedupe]);
            return true;
          });
      })
      .then((result) => {
        cache.put(cacheKey, result);
        return result;
      });

  }

  public getTagsOrValues = (segment, index, query, includeRemove) => {
    if (segment.type === "condition") {
      return this.controller.$q.when([this.controller.uiSegmentSrv.newSegment("AND")]);
    }
    if (segment.type === "operator") {
      const nextValue = this.tagSegments[index + 1].value;
      return this.controller.$q.when(this.controller.uiSegmentSrv.newOperators(["=", "!=", "^", "!^"]))
    }
    let tagsCopy = [... this.queryModel.target.tags];
    if (segment.type === "value") {
      tagsCopy = tagsCopy.splice(0, tagsCopy.length - 1);
    }
    const filter = this.queryModel.buildFilter(tagsCopy, this.includeVariables, this.includeScopes); // do not include scoped variables

    const data = {
      filter: filter,
      limit: 25,
      key: null
    };
    if (segment.type === "key" || segment.type === "plus-button") {
      data.key = query;

      return this.queryTagsAndValues(data, "key", this.lruTag)
        .then(this.transformToSegments(true, "key"))
        .then((results) => {
          if (segment.type === "key" && includeRemove) {
            results.splice(0, 0, angular.copy(this.removeTagFilterSegment));
          }
          return results;
        });
    } else if (segment.type === "value") {
      const key = this.tagSegments[index - 2].value;
      if (key === "$key") return this.getMeasurements(query);

      data.key = key
      data["value"] = query;
      return this.queryTagsAndValues(data, "value", this.lruTagValue)
        .then(this.transformToSegments(true, "value"));
    }

  }

  public getTagValueOperator(tagValue, tagOperator): string {
    if (tagOperator !== "=~" && tagOperator !== "!~" && /^\/.*\/$/.test(tagValue)) {
      return "=~";
    } else if ((tagOperator === "=~" || tagOperator === "!~") && /^(?!\/.*\/$)/.test(tagValue)) {
      return "=";
    }
    return null;
  }

  public validateCustomQuery = (segment, index, query, includeRemove) => {
    segment.style= {color: "red"};
    const headers =  { "Content-Type": "text/plain;charset=UTF-8" };
    return this.datasource
      .doRequestWithHeaders("/parser/parse-filter", { method: "POST", data: query }, headers)
      .then(
        (result) => {
          segment.valid = true;
          segment.cssClass = "";
        },
        (error) => {
          segment.valid = false;
          segment.cssClass = "text-error";
          console.log(error);
        }
      );

  }
  public createCustomQuery = () => {
    this.customTagSegments.push(this.controller.uiSegmentSrv.newSegment({value: "--custom--", valid: false, expandable: false}));

  }

  public tagSegmentUpdated(segment, index) {
    this.tagSegments[index] = segment;
    // AND, Z, =, A, AND, B, =, C,  AND, D, =,  E]
    // 3  , 4, 5, 6, 7,   8, 9, 10, 11, 12, 13, 14]

    // handle remove tag condition
    if (segment.value === this.removeTagFilterSegment.value) {
      this.tagSegments.splice(index, 3);
      if (this.tagSegments.length === 0) {
        this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
      } else if (this.tagSegments.length > 2) {
        this.tagSegments.splice(Math.max(index - 1, 0), 1);
        if (this.tagSegments[this.tagSegments.length - 1].type !== "plus-button") {
          this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
        }
      }
    } else {
      if (segment.type === "plus-button") {
        if (index > 2) {
          this.tagSegments.splice(index, 0, this.controller.uiSegmentSrv.newCondition("AND"));
        }
        this.tagSegments.push(this.controller.uiSegmentSrv.newOperator("="));
        this.tagSegments.push(this.controller.uiSegmentSrv.newFake("select tag value", "value", "query-segment-value"));
        segment.type = "key";
        segment.cssClass = "query-segment-key";
      }

      if (index + 1 === this.tagSegments.length) {
        this.tagSegments.push(this.controller.uiSegmentSrv.newPlusButton());
      }
    }

    this.rebuildTargetTagConditions();
  }

  public rebuildTargetTagConditions() {
    const tags = [];
    let tagIndex = 0;
    let tagOperator = "";

    _.each(this.tagSegments, (segment2, index) => {
      if (segment2.type === "key") {
        if (tags.length === 0) {
          tags.push({});
        }
        tags[tagIndex].key = segment2.value;
      } else if (segment2.type === "value") {
        tagOperator = this.getTagValueOperator(segment2.value, tags[tagIndex].operator);
        if (tagOperator) {
          this.tagSegments[index - 1] = this.controller.uiSegmentSrv.newOperator(tagOperator);
          tags[tagIndex].operator = tagOperator;
        }
        tags[tagIndex].value = segment2.value;
      } else if (segment2.type === "condition") {
        tags.push({ condition: segment2.value });
        tagIndex += 1;
      } else if (segment2.type === "operator") {
        tags[tagIndex].operator = segment2.value;
      }
    });
    
    _.each(this.customTagSegments, (segment, index) => {
      if (segment.valid) {
        tags.push({operator: "q", type: "custom", key: segment.value});
      }
    });

    this.controller.setTags(tags);
    this.controller.refresh();
  }

}
