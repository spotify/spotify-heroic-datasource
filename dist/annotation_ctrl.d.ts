import { MetadataClient } from "./metadata_client";
export declare class HeroicAnnotationsQueryCtrl {
    private templateSrv;
    private $q;
    private uiSegmentSrv;
    static templateUrl: string;
    tagSegments: any;
    datasource: any;
    annotation: any;
    removeTagFilterSegment: any;
    selectMenu: any;
    queryModel: any;
    metadataClient: MetadataClient;
    constructor($scope: any, $injector: any, templateSrv: any, $q: any, uiSegmentSrv: any);
    buildSelectMenu(): void;
    fixTagSegments(): void;
    tagSegmentUpdated(segment: any, index: any): void;
    rebuildTargetTagConditions(): void;
}
