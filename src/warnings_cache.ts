declare namespace WarningsCache {
  type key = string;
  type warning = string;
  type CacheMap = Map<key, warning[]>;

  interface Options {
    dashboardId: string;
    panelId: number;
    refId: string;
  }
}

export default class WarningsCache {
  private cache: WarningsCache.CacheMap;

  constructor() {
    this.cache = new Map();
  }

  static createKey({ dashboardId, panelId, refId }: WarningsCache.Options) {
    return `${dashboardId}::${panelId}::${refId}`;
  }

  public hasCache(key: WarningsCache.key) {
    return this.cache.has(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public createCache(key: WarningsCache.key) {
    if (this.cache.has(key)) { return key; }
    this.cache.set(key, []);
  }

  public removeCache(key: WarningsCache.key) {
    if (!this.cache.has(key)) { return; }
    this.cache.delete(key);
  }

  public getWarnings(key: WarningsCache.key) {
    return this.cache.get(key);
  }

  public addWarning(key: WarningsCache.key, warning: WarningsCache.warning) {
    if (!this.cache.has(key)) { return; }
    const warnings = this.cache.get(key);
    if (warnings.includes(warning)) { return; }
    this.cache.set(key, warnings.concat(warning));
  }

  public removeWarning(key: WarningsCache.key, warning: WarningsCache.warning) {
    if (this.cache.has(key)) {
      const warnings = this.getWarnings(key).filter(_warning => _warning !== warning);
      this.cache.set(key, warnings);
    }
  }

  public removeAllWarnings(key: WarningsCache.key) {
    if (!this.cache.has(key)) { return; }
    this.cache.set(key, []);
  }

}
