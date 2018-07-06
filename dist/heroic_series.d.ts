export default class HeroicSeries {
    series: any;
    alias: any;
    annotation: any;
    templateSrv: any;
    constructor(options: any);
    _convertData(dataPoint: any): any[];
    getTimeSeries(): any;
    getAnnotations(): any[];
    getTable(): any;
    buildScoped(group: any, common: any): {};
    buildTags(tags: any): string;
    quoteString(s: any): string;
}
