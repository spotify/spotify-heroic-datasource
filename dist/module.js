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
System.register(["./annotation_ctrl", "./datasource", "./query_ctrl", "./query_part_base/query_part_editor"], function(exports_1) {
    var annotation_ctrl_1, datasource_1, query_ctrl_1, query_part_editor_1;
    var HeroicConfigCtrl;
    return {
        setters:[
            function (annotation_ctrl_1_1) {
                annotation_ctrl_1 = annotation_ctrl_1_1;
            },
            function (datasource_1_1) {
                datasource_1 = datasource_1_1;
            },
            function (query_ctrl_1_1) {
                query_ctrl_1 = query_ctrl_1_1;
            },
            function (query_part_editor_1_1) {
                query_part_editor_1 = query_part_editor_1_1;
            }],
        execute: function() {
            HeroicConfigCtrl = (function () {
                function HeroicConfigCtrl() {
                }
                HeroicConfigCtrl.templateUrl = "partials/config.html";
                return HeroicConfigCtrl;
            })();
            exports_1("Datasource", datasource_1.default);
            exports_1("QueryCtrl", query_ctrl_1.HeroicQueryCtrl);
            exports_1("ConfigCtrl", HeroicConfigCtrl);
            exports_1("AnnotationsQueryCtrl", annotation_ctrl_1.HeroicAnnotationsQueryCtrl);
            exports_1("NewDirective", query_part_editor_1.queryPartEditorLabeledDirective);
        }
    }
});
//# sourceMappingURL=module.js.map