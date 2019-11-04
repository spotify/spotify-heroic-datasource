import { HeroicBatchData, DataSeries, Datapoint } from "./types";
export default class HeroicSeries {
    resultData: HeroicBatchData;
    alias: string;
    annotation: any;
    templateSrv: any;
    queryResolution: any;
    constructor(options: any);
    _convertData(dataPoint: any): Datapoint[];
    getMinFromResults(results: any): number;
    getMaxFromResults(results: any): number;
    fillTimeSeries(series: any, min: any, max: any, step: any): void;
    getTimeSeries(refId: string): DataSeries[];
    getAnnotations(): any[];
    getTable(): any;
    buildScopedHelper(scoped: any, counts: any, tags: any, common: any): void;
    buildScoped(group: any, counts: any, total: any): {
        tags: {
            text: string;
        };
        fullTags: {
            text: string;
        };
    };
    buildTags(tags: any, tagCounts: any): string;
    quoteString(s: any): string;
}
