System.register([], function (exports_1, context_1) {
    "use strict";
    var QueryParser;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            QueryParser = (function () {
                function QueryParser() {
                }
                QueryParser.prototype.parseInto = function (queryRaw, target) {
                    var jsonRaw = JSON.parse(queryRaw);
                    this.parseFiltersFromRaw(jsonRaw, target);
                    this.parseAggregationsFromRaw(jsonRaw, target);
                    target.globalAggregation = jsonRaw.features !== undefined
                        && jsonRaw.features.length > 0
                        && jsonRaw.features[0] === "com.spotify.heroic.distributed_aggregations";
                };
                QueryParser.prototype.parseFiltersFromRaw = function (jsonRaw, target) {
                    var tags = [];
                    var seen = 0;
                    var keyFilter = jsonRaw.filter.filter(function (entry) { return entry[0] === "key"; });
                    if (keyFilter.length > 0) {
                        tags.push({ key: "$key", operator: "=", value: keyFilter[0][1] });
                    }
                    jsonRaw.filter
                        .filter(function (entry) { return entry[0] !== "key"; })
                        .forEach(function (entry, index) {
                        if (entry === "and") {
                            return;
                        }
                        var operator = entry[0];
                        switch (operator) {
                            case "key":
                                tags.push({ key: "$key", operator: "=", value: entry[1] });
                                seen += 1;
                                break;
                            case "q":
                                tags.push({ operator: "q", type: "custom", key: entry[1] });
                                break;
                            default:
                                var item = { key: entry[1], operator: entry[0], value: entry[2] };
                                if (seen > 0 || keyFilter.length > 0) {
                                    item["condition"] = "AND";
                                }
                                seen += 1;
                                tags.push(item);
                                break;
                        }
                    });
                    target.tags = tags;
                };
                QueryParser.prototype.parseAggregationsFromRaw = function (jsonRaw, target) {
                    var _this = this;
                    var selects = [];
                    jsonRaw.aggregators.forEach(function (aggr) {
                        if (aggr.type === "group") {
                            if (aggr.of === null) {
                                selects.push({ categoryName: "For Each", params: [], type: aggr.each[0].type });
                            }
                            else if (aggr.of.length === 0) {
                                selects.push({ categoryName: "Collapse", params: [], type: aggr.each[0].type });
                            }
                            else {
                                selects.push({ categoryName: "Group By", params: aggr.of, type: aggr.each[0].type });
                            }
                            if (aggr.each[0].sampling !== undefined && Object.keys(aggr.each[0].sampling).length > 0) {
                                var param = _this.samplingToParam(aggr.each[0].sampling);
                                target.groupBy = [
                                    {
                                        params: [param],
                                        type: "time"
                                    }
                                ];
                            }
                        }
                        else {
                            selects.push({ categoryName: "Filters", params: ["" + aggr.k], type: aggr.type });
                        }
                    });
                    target.select = [selects];
                };
                QueryParser.prototype.samplingToParam = function (sampling) {
                    switch (sampling.unit) {
                        case "seconds":
                            return sampling.value + "s";
                        case "minutes":
                            return sampling.value + "m";
                        case "hours":
                            return sampling.value + "h";
                        case "days":
                            return sampling.value + "d";
                        case "weeks":
                            return sampling.value + "w";
                        case "months":
                            return sampling.value + "M";
                        case "years":
                            return sampling.value + "y";
                        default:
                            throw Error("Poor sampling");
                    }
                };
                return QueryParser;
            }());
            exports_1("QueryParser", QueryParser);
        }
    };
});
//# sourceMappingURL=query_parser.js.map