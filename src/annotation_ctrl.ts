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
import HeroicQuery from './heroic_query';
import { MetadataClient } from './metadata_client';
import queryPart from './query_part';

export class HeroicAnnotationsQueryCtrl {
  public static templateUrl = 'partials/annotations.editor.html';

  public datasource: any;
  public annotation: any;
  public metadataClient: MetadataClient;
  public range: boolean;
  public rangeType: any;
  public rangeTypes: any;

  constructor($scope, $injector, private templateSrv, private $q, private uiSegmentSrv) {
    this.rangeTypes = ['endTimeMs', 'endTimeSeconds', 'durationMs', 'durationSeconds'];
    this.annotation.rangeType = this.annotation.rangeType || this.rangeTypes[0];
    this.annotation.range = this.annotation.range || false;
    if (!this.annotation.tags) {
      this.annotation.tags = [];
    }

    this.metadataClient = new MetadataClient(this, this.datasource, null, this.annotation, false, false);
  }

  public getTags() {
    return this.annotation.tags;
  }

  public setTags(tags) {
    this.annotation.tags = tags;
  }

  public refresh() {}
}
