export default class HeroicQuery {
    target: any;
    selectModels: any[];
    groupByParts: any;
    templateSrv: any;
    scopedVars: any;
    /** @ngInject */
    constructor(target: any, templateSrv?: any, scopedVars?: any);
    updateProjection(): void;
    updatePersistedParts(): void;
    addGroupBy(value: any): void;
    removeGroupByPart(part: any, index: any): void;
    removeSelect(index: number): void;
    removeSelectPart(selectParts: any, part: any): void;
    addSelectPart(selectParts: any, categoryName: any, type: any): void;
    getKey(): any;
    getScopedFilter(): any[];
    buildCurrentFilter(includeVariables: any, includeScopedFilter: any): any;
    render(): {
        filter: any;
        aggregators: any;
        features: string[];
        range: string;
    };
    renderAdhocFilters(filters: any): void;
}
