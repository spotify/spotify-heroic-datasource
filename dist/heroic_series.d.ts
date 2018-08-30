export default class HeroicSeries {
    series: any;
    alias: any;
    annotation: any;
    templateSrv: any;
    queryResolution: any;
    constructor(options: any);
    _convertData(dataPoint: any): any[];
    getMinFromResults(results: any): any;
    getMaxFromResults(results: any): any;
    fillTimeSeries(series: any, min: any, max: any, step: any): void;
    getTimeSeries(): any;
    getAnnotations(): any[];
    getTable(): any;
    buildScoped(group: any, common: any): {};
    buildTags(tags: any, tagCounts: any): string;
    quoteString(s: any): string;
}
