import TimeRange from "./time_range";
declare namespace datasource {
    interface InstanceSettings {
        url: string;
        username: string;
        password: string;
        name: string;
        jsonData: JSONSettings;
        basicAuth: any;
        database: any;
    }
    interface JSONSettings {
        tagCollapseChecks?: any[];
        tagAggregationChecks: string[];
        suggestionRules: any[];
    }
}
export default class HeroicDatasource {
    private $q;
    private backendSrv;
    private uiSegmentSrv;
    type: string;
    settings: datasource.InstanceSettings;
    supportAnnotations: boolean;
    supportMetrics: boolean;
    templateSrv: any;
    annotationModels: any;
    queryBuilder: any;
    fakeController: any;
    tagAggregationChecks: any;
    tagCollapseChecks: any[];
    suggestionRules: any;
    constructor(instanceSettings: datasource.InstanceSettings, $q: any, backendSrv: any, templateSrv: any, uiSegmentSrv: any);
    query(options: any): any;
    annotationQuery(options: any): any;
    targetContainsTemplate(target: any): boolean;
    testDatasource(): any;
    doRequestWithHeaders(path: any, options: any, headers: any): any;
    doRequest(path: any, options: any): any;
    parseRelativeUnit(unit: string): string;
    getTimeFilter(options: any): TimeRange;
    convertRawTime(date: string | number, roundUp: boolean): string;
    getTagKeys(): any;
    getTagValues(options: any): any;
    metricFindQuery(query: any, variableOptions: any): any;
}
export {};
