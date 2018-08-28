import { QueryCtrl } from "app/plugins/sdk";
import HeroicQuery from "./heroic_query";
import { MetadataClient } from "./metadata_client";
export declare class HeroicQueryCtrl extends QueryCtrl {
    private templateSrv;
    private $q;
    private uiSegmentSrv;
    static templateUrl: string;
    queryModel: HeroicQuery;
    groupBySegment: any;
    resultFormats: any[];
    orderByTime: any[];
    panelCtrl: any;
    selectMenu: any;
    target: any;
    metadataClient: MetadataClient;
    /** @ngInject **/
    constructor($scope: any, $injector: any, templateSrv: any, $q: any, uiSegmentSrv: any);
    buildSelectMenu(): void;
    addSelectPart(selectParts: any, cat: any, subitem: any): void;
    handleSelectPartEvent(selectParts: any, part: any, evt: any): any;
    refresh(): void;
    handleGroupByPartEvent(part: any, index: any, evt: any): any;
    toggleEditorMode(): void;
    getCollapsedText(): any;
    getTags(): any;
    setTags(tags: any): void;
}
