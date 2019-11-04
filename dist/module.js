System.register(["./annotation_ctrl", "./datasource", "./query_ctrl", "./query_part_base/query_part_editor", "./metric_segment_wrapper", "./config_ctrl"], function (exports_1, context_1) {
    "use strict";
    var annotation_ctrl_1, datasource_1, query_ctrl_1, query_part_editor_1, metric_segment_wrapper_1, config_ctrl_1;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
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
            },
            function (metric_segment_wrapper_1_1) {
                metric_segment_wrapper_1 = metric_segment_wrapper_1_1;
            },
            function (config_ctrl_1_1) {
                config_ctrl_1 = config_ctrl_1_1;
            }
        ],
        execute: function () {
            exports_1("AnnotationsQueryCtrl", annotation_ctrl_1.HeroicAnnotationsQueryCtrl);
            exports_1("Datasource", datasource_1.default);
            exports_1("QueryCtrl", query_ctrl_1.HeroicQueryCtrl);
            exports_1("NewDirective", query_part_editor_1.queryPartEditorLabeledDirective);
            exports_1("NewDirective2", metric_segment_wrapper_1.metricSegmentWrapper);
            exports_1("ConfigCtrl", config_ctrl_1.HeroicConfigCtrl);
        }
    };
});
//# sourceMappingURL=module.js.map