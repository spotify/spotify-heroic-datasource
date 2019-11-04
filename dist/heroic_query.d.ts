import { RenderedQuery, Filter } from "./types";
export default class HeroicQuery {
    target: any;
    selectModels: any[];
    groupByParts: any;
    templateSrv: any;
    scopedVars: any;
    constructor(target: any, templateSrv?: any, scopedVars?: any);
    updateProjection(): void;
    updatePersistedParts(): void;
    addGroupBy(value: any): void;
    removeGroupByPart(part: any, index: any): void;
    removeSelect(index: number): void;
    removeSelectPart(selectParts: any, part: any): void;
    addSelectPart(selectParts: any, categoryName: any, type: any, position: any): void;
    getKey(): any;
    renderSubFilter(tag: any): any[];
    buildFilter(filterChoices: any, includeVariables: any, includeScopedFilter: any): Filter;
    buildCurrentFilter(includeVariables: any, includeScopedFilter: any): (string | string[])[];
    render(): RenderedQuery;
    renderAdhocFilters(filters: any): (string | string[])[];
}
