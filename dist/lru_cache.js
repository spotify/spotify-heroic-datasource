System.register([], function (exports_1, context_1) {
    "use strict";
    var LruCache;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            LruCache = (function () {
                function LruCache() {
                    this.values = new Map();
                    this.maxEntries = 5;
                }
                LruCache.prototype.get = function (key) {
                    var hasKey = this.values.has(key);
                    var entry;
                    if (hasKey) {
                        entry = this.values.get(key);
                        this.values.delete(key);
                        this.values.set(key, entry);
                    }
                    return entry;
                };
                LruCache.prototype.has = function (key) {
                    return this.values.has(key);
                };
                LruCache.prototype.put = function (key, value) {
                    if (this.values.size >= this.maxEntries) {
                        var keyToDelete = this.values.keys().next().value;
                        this.values.delete(keyToDelete);
                    }
                    this.values.set(key, value);
                };
                return LruCache;
            }());
            exports_1("LruCache", LruCache);
        }
    };
});
//# sourceMappingURL=lru_cache.js.map