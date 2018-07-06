/*
* -\-\-
* Spotify Heroic Grafana Datasource
* --
* Copyright (C) 2018 Spotify AB
* --
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* -/-/-
*/
System.register([], function(exports_1) {
    var LruCache;
    return {
        setters:[],
        execute: function() {
            LruCache = (function () {
                function LruCache() {
                    this.values = new Map();
                    this.maxEntries = 5;
                }
                LruCache.prototype.get = function (key) {
                    var hasKey = this.values.has(key);
                    var entry;
                    if (hasKey) {
                        // peek the entry, re-insert for LRU strategy
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
                        // least-recently used cache eviction strategy
                        var keyToDelete = this.values.keys().next().value;
                        this.values.delete(keyToDelete);
                    }
                    this.values.set(key, value);
                };
                return LruCache;
            })();
            exports_1("LruCache", LruCache);
        }
    }
});
//# sourceMappingURL=lru_cache.js.map