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
import _ from "lodash";
import HeroicQuery from "./heroic_query";
import { MetadataClient } from "./metadata_client";
import queryPart from "./query_part";

export class HeroicAnnotationsQueryCtrl {
  public static templateUrl = "partials/annotations.editor.html";

  public tagSegments: any;

  public datasource: any;
  public annotation: any;

  public removeTagFilterSegment: any;
  public selectMenu: any;
  public queryModel: any;
  public metadataClient: MetadataClient;

  constructor($scope, $injector, private templateSrv, private $q, private uiSegmentSrv) {
    this.tagSegments = [];
    this.queryModel = new HeroicQuery(this.annotation, templateSrv, null);

    if (!this.annotation.tags) {
      this.annotation.tags = [];
    }
    for (const tag of this.annotation.tags) {
      if (!tag.operator) {
        tag.operator = "=";
      }

      if (tag.condition) {
        this.tagSegments.push(uiSegmentSrv.newCondition(tag.condition));
      }

      this.tagSegments.push(uiSegmentSrv.newKey(tag.key));
      this.tagSegments.push(uiSegmentSrv.newOperator(tag.operator));
      this.tagSegments.push(uiSegmentSrv.newKeyValue(tag.value));
    }

    this.fixTagSegments();
    this.buildSelectMenu();
    this.removeTagFilterSegment = uiSegmentSrv.newSegment({
      fake: true,
      value: "-- remove tag filter --",
    });
    this.metadataClient = new MetadataClient(this.datasource, this.uiSegmentSrv, this.templateSrv, this.$q, null, this.annotation, this.removeTagFilterSegment, this.tagSegments, false, false);

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

  public fixTagSegments() {
    const count = this.tagSegments.length;
    const lastSegment = this.tagSegments[Math.max(count - 1, 0)];

    if (!lastSegment || lastSegment.type !== "plus-button") {
      this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
    }
  }

  public tagSegmentUpdated(segment, index) {
    this.tagSegments[index] = segment;
    // AND, Z, =, A, AND, B, =, C,  AND, D, =,  E]
    // 3  , 4, 5, 6, 7,   8, 9, 10, 11, 12, 13, 14]

    // handle remove tag condition
    if (segment.value === this.removeTagFilterSegment.value) {
      this.tagSegments.splice(index, 3);
      if (this.tagSegments.length === 0) {
        this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
      } else if (this.tagSegments.length > 2) {
        this.tagSegments.splice(Math.max(index - 1, 0), 1);
        if (this.tagSegments[this.tagSegments.length - 1].type !== "plus-button") {
          this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
        }
      }
    } else {
      if (segment.type === "plus-button") {
        if (index > 2) {
          this.tagSegments.splice(index, 0, this.uiSegmentSrv.newCondition("AND"));
        }
        this.tagSegments.push(this.uiSegmentSrv.newOperator("="));
        this.tagSegments.push(this.uiSegmentSrv.newFake("select tag value", "value", "query-segment-value"));
        segment.type = "key";
        segment.cssClass = "query-segment-key";
      }

      if (index + 1 === this.tagSegments.length) {
        this.tagSegments.push(this.uiSegmentSrv.newPlusButton());
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
        tagOperator = this.metadataClient.getTagValueOperator(segment2.value, tags[tagIndex].operator);
        if (tagOperator) {
          this.tagSegments[index - 1] = this.uiSegmentSrv.newOperator(tagOperator);
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

    this.annotation.tags = tags;
    this.annotation.query = this.queryModel.buildCurrentFilter(false, false);
  }
}
