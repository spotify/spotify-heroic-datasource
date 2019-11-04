import { Target } from "./types";
export declare class QueryParser {
    parseInto(queryRaw: string, target: Target): void;
    private parseFiltersFromRaw;
    private parseAggregationsFromRaw;
    private samplingToParam;
}
