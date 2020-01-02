export interface RenderedQuery {
    filter: Filter;
    aggregators: any[];
    features: string[];
    range: string;
}
export declare type Filter = (string | string[])[];
export interface Category {
    text: string;
    submenu: CategoryItem[];
}
export interface CategoryItem {
    click: string;
    text: string;
    value: string;
}
export interface QueryPart {
    $$hashkey: string;
    def: any[];
    params: string[];
    part: Part;
    text: string;
}
export interface Part {
    categoryName: string;
    type: string;
    params: string[];
}
export interface Target {
    alias: string;
    globalAggregation?: boolean;
    query: string;
    queryRaw: string;
    rawQuery: boolean;
    resultFormat?: string;
    refId: string;
    tags?: Tag[];
    queryResolution: string;
    measurement?: string;
    select?: any[];
    groupBy?: GroupBy[];
    orderByTime?: string;
}
export interface GroupBy {
    type: string;
    params: string[];
}
export interface Tag {
    key: string;
    operator: string;
    value: string;
}
export declare type Datapoint = [number, number];
export interface DataSeries {
    refId: string;
    datapoints: Datapoint[];
    target: string;
    meta: {
        scoped: {
            tags: {
                text: string;
            };
            fullTags: {
                text: string;
            };
        };
        errors: any[];
        limits: string[];
    };
}
export interface HeroicBatchResult {
    status: number;
    xhrStatus: string;
    statusText: string;
    config: any;
    data: {
        results: {
            [key: string]: HeroicBatchData;
        };
    };
}
export interface HeroicBatchData {
    cache: any;
    cached: boolean;
    commonResource: any;
    commonTags: any;
    errors: any[];
    limits: string[];
    preAggregationSampleSize: number;
    queryId: string;
    range: any;
    result: any[];
    trace: any;
}
