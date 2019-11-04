export declare class LruCache<T> {
    private values;
    private maxEntries;
    get(key: string): T;
    has(key: string): boolean;
    put(key: string, value: T): void;
}
