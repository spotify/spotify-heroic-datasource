export declare class QueryPartDef {
    type: string;
    params: any[];
    defaultParams: any[];
    renderer: any;
    category: any;
    addStrategy: any;
    categoryName: any;
    constructor(options: any);
}
export declare class QueryPart {
    part: any;
    def: QueryPartDef;
    params: any[];
    text: string;
    constructor(part: any, def: any);
    render(innerExpr: string): any;
    hasMultipleParamsInString(strValue: any, index: any): any;
    updateParam(strValue: any, index: any): void;
    updateText(): void;
}
export declare function functionRenderer(part: any, innerExpr: any): string;
