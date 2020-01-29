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

import { HeroicAnnotationsQueryCtrl } from './annotation_ctrl';
import HeroicDatasource from './datasource';
import { HeroicQueryCtrl } from './query_ctrl';
import { queryPartEditorLabeledDirective } from './query_part_base/query_part_editor';
import { metricSegmentWrapper } from './metric_segment_wrapper';
import { HeroicConfigCtrl } from './config_ctrl';

export {
  HeroicDatasource as Datasource,
  HeroicQueryCtrl as QueryCtrl,
  HeroicConfigCtrl as ConfigCtrl,
  HeroicAnnotationsQueryCtrl as AnnotationsQueryCtrl,
  queryPartEditorLabeledDirective as NewDirective,
  metricSegmentWrapper as NewDirective2,
};
