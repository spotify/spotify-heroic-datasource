import { MetadataClient } from "./metadata_client";
export declare class HeroicAnnotationsQueryCtrl {
    private templateSrv;
    private $q;
    private uiSegmentSrv;
    static templateUrl: string;
    datasource: any;
    annotation: any;
    metadataClient: MetadataClient;
    range: boolean;
    rangeType: any;
    rangeTypes: any;
    constructor($scope: any, $injector: any, templateSrv: any, $q: any, uiSegmentSrv: any);
    getTags(): any;
    setTags(tags: any): void;
    refresh(): void;
}
