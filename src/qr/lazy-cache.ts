import { CacheItem } from "../types";

export type LoadFn<V> = (...keys: any[]) => Promise<V>;

export class LazyCache {
    private cache: Map<string, CacheItem> = new Map<string, CacheItem>();
    private readonly DEFAULT_MAX_AGE: number = 60 * 1000;

    private getKey(...keys: any[]) {
        return JSON.stringify(keys);
    }

    get<V>(
        cacheKey: string,
        loadFn: LoadFn<V>,
        ...params: any[]
    ): Promise<V> {
        const key = this.getKey(cacheKey, params);
        const cacheValue = this.getCache<V>(key);
        if (cacheValue) {
            return Promise.resolve(cacheValue);
        }

        return loadFn(...params)
            .then(value => {
                this.set(key, value);
                return value;
            });
    }

    private set(key: string, value: any): void {
        this.cache.set(key, {
            value,
            expiry: Date.now() + this.DEFAULT_MAX_AGE
        });
    }

    private getCache<V>(key: string): V | null {
        if (this.cache.has(key)) {
            const content = this.cache.get(key);
            if (!content)
                return null;
            if (content.expiry < Date.now()) {
                this.cache.delete(key);
                return null;
            }
            return content.value as V;
        } else {
            return null;
        }
    }
}
