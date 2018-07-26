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

  /** @ngInject **/
  constructor(private datasource, private uiSegmentSrv, private templateSrv, private $q, private scopedVars, private target, private removeTagFilterSegment, private tagSegments, private includeVariables, private includeScopes) {
    this.lruTag = new LruCache();
    this.lruTagValue = new LruCache();
    this.keyLru = new LruCache();
    this.queryModel = new HeroicQuery(this.target, templateSrv, this.scopedVars);
    this.removeTagFilterSegment = removeTagFilterSegment;
    this.includeVariables = includeVariables;
    this.includeScopes = includeScopes;
  }

  public getMeasurements = _.debounce(((measurementFilter) => {
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
  }), MetadataClient.DEBOUNCE_MS, { leading: true });

  public handleQueryError(err) {
    this.error = err.message || "Failed to issue metric query";
    return [];
  }

  public transformToSegments(addTemplateVars, segmentKey) {
    return (results) => {
      const segments = _.map(results, (segment) => {
        return this.uiSegmentSrv.newSegment({
          value: segment[segmentKey],
          expandable: false,
        });
      });

      if (addTemplateVars) {
        for (const variable of this.templateSrv.variables) {
          segments.unshift(
            this.uiSegmentSrv.newSegment({
              type: "value",
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

  public getTagsOrValues = _.debounce(((segment, index, query, includeRemove) => {
    if (segment.type === "condition") {
      return this.$q.when([this.uiSegmentSrv.newSegment("AND"), this.uiSegmentSrv.newSegment("OR")]);
    }
    if (segment.type === "operator") {
      const nextValue = this.tagSegments[index + 1].value;
      return this.$q.when(this.uiSegmentSrv.newOperators(["=", "!=", "^", "!^"]))
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

  }), MetadataClient.DEBOUNCE_MS, { leading: true });

  public getTagValueOperator(tagValue, tagOperator): string {
    if (tagOperator !== "=~" && tagOperator !== "!~" && /^\/.*\/$/.test(tagValue)) {
      return "=~";
    } else if ((tagOperator === "=~" || tagOperator === "!~") && /^(?!\/.*\/$)/.test(tagValue)) {
      return "=";
    }
    return null;
  }

}
