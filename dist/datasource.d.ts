import TimeRange from "./time_range";
export default class HeroicDatasource {
    private $q;
    private backendSrv;
    type: string;
    urls: any;
    url: string;
    username: string;
    password: string;
    name: string;
    database: any;
    basicAuth: any;
    withCredentials: any;
    interval: any;
    supportAnnotations: boolean;
    supportMetrics: boolean;
    templateSrv: any;
    annotationModels: any;
    /** @ngInject */
    constructor(instanceSettings: any, $q: any, backendSrv: any, templateSrv: any);
    query(options: any): any;
    annotationQuery(options: any): any;
    targetContainsTemplate(target: any): boolean;
    testDatasource(): any;
    doRequest(path: any, options: any): any;
    parseRelativeUnit(unit: any): string;
    getTimeFilter(options: any): TimeRange;
    convertRawTime(date: any, roundUp: any): string;
}
