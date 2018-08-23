import HeroicQuery from "./heroic_query";
export declare class MetadataClient {
    private controller;
    private datasource;
    private scopedVars;
    private target;
    private includeVariables;
    private includeScopes;
    static templateUrl: string;
    static DEBOUNCE_MS: number;
    queryModel: HeroicQuery;
    lruTag: any;
    lruTagValue: any;
    keyLru: any;
    error: any;
    addCustomQuery: any;
    removeTagFilterSegment: any;
    tagSegments: any[];
    customTagSegments: any[];
    /** @ngInject **/
    constructor(controller: any, datasource: any, scopedVars: any, target: any, includeVariables: any, includeScopes: any);
    fixTagSegments(): void;
    getMeasurements: (measurementFilter: any) => any;
    handleQueryError(err: any): any[];
    transformToSegments(addTemplateVars: any, segmentKey: any): (results: any) => any;
    queryTagsAndValues(data: any, dedupe: any, cache: any): any;
    getTagsOrValues: (segment: any, index: any, query: any, includeRemove: any) => any;
    getTagValueOperator(tagValue: any, tagOperator: any): string;
    validateCustomQuery: (segment: any, index: any, query: any, includeRemove: any) => any;
    createCustomQuery: () => void;
    tagSegmentUpdated(segment: any, index: any): void;
    rebuildTargetTagConditions(): void;
}
