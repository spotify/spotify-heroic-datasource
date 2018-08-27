System.register(["./metadata_client"], function(exports_1) {
    var metadata_client_1;
    var HeroicAnnotationsQueryCtrl;
    return {
        setters:[
            function (metadata_client_1_1) {
                metadata_client_1 = metadata_client_1_1;
            }],
        execute: function() {
            HeroicAnnotationsQueryCtrl = (function () {
                function HeroicAnnotationsQueryCtrl($scope, $injector, templateSrv, $q, uiSegmentSrv) {
                    this.templateSrv = templateSrv;
                    this.$q = $q;
                    this.uiSegmentSrv = uiSegmentSrv;
                    this.rangeTypes = ["endTimeMs", "endTimeSeconds", "durationMs", "durationSeconds"];
                    this.annotation.rangeType = this.annotation.rangeType || this.rangeTypes[0];
                    this.annotation.range = this.annotation.range || false;
                    if (!this.annotation.tags) {
                        this.annotation.tags = [];
                    }
                    this.metadataClient = new metadata_client_1.MetadataClient(this, this.datasource, null, this.annotation, false, false);
                }
                HeroicAnnotationsQueryCtrl.prototype.getTags = function () {
                    return this.annotation.tags;
                };
                HeroicAnnotationsQueryCtrl.prototype.setTags = function (tags) {
                    this.annotation.tags = tags;
                    this.annotation.query = this.metadataClient.queryModel.buildCurrentFilter(false, false);
                };
                HeroicAnnotationsQueryCtrl.prototype.refresh = function () {
                };
                HeroicAnnotationsQueryCtrl.templateUrl = "partials/annotations.editor.html";
                return HeroicAnnotationsQueryCtrl;
            })();
            exports_1("HeroicAnnotationsQueryCtrl", HeroicAnnotationsQueryCtrl);
        }
    }
});
//# sourceMappingURL=annotation_ctrl.js.map