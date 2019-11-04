import { DataSeries, Target } from "./types";
export declare class HeroicValidator {
    target: Target;
    tagAggregationChecks: any;
    tagCollapseChecks: any[];
    constructor(target: any, tagAggregationChecks: any, tagCollapseChecks: any);
    findUnsafeCollapses(data: DataSeries[]): any;
    findUnsafeAggregations(data: DataSeries[]): any;
    checkForWarnings(data: DataSeries[]): string;
}
