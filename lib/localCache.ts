import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEnvelope<T = any> {
    data: T;
    timestamp: number;
    ttlMs?: number;
}

const CACHE_PREFIX = 'glitch_cache_';

export const localCache = {
    /**
     * Store data in AsyncStorage with optional TTL (time-to-live in ms).
     */
    async set<T = any>(key: string, data: T, ttlMs?: number): Promise<void> {
        try {
            const envelope: CacheEnvelope<T> = {
                data,
                timestamp: Date.now(),
                ttlMs,
            };
            const storageKey = `${CACHE_PREFIX}${key}`;
            await AsyncStorage.setItem(storageKey, JSON.stringify(envelope));
        } catch (error) {
            console.error(`LocalCache set failed for key "${key}":`, error);
        }
    },

    /**
     * Retrieve cached data if present and not expired.
     */
    async get<T = any>(key: string): Promise<T | null> {
        try {
            const storageKey = `${CACHE_PREFIX}${key}`;
            const raw = await AsyncStorage.getItem(storageKey);
            if (!raw) return null;

            const envelope: CacheEnvelope<T> = JSON.parse(raw);
            if (envelope.ttlMs && Date.now() - envelope.timestamp > envelope.ttlMs) {
                // Expired — clear silently
                await AsyncStorage.removeItem(storageKey);
                return null;
            }

            return envelope.data;
        } catch (error) {
            console.error(`LocalCache get failed for key "${key}":`, error);
            return null;
        }
    },

    /**
     * Remove a single cache key.
     */
    async invalidate(key: string): Promise<void> {
        try {
            const storageKey = `${CACHE_PREFIX}${key}`;
            await AsyncStorage.removeItem(storageKey);
        } catch (error) {
            console.error(`LocalCache invalidate failed for key "${key}":`, error);
        }
    },

    /**
     * Remove all cache keys starting with a prefix or clear all glitch cache.
     */
    async invalidatePrefix(prefix: string): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const matchingKeys = keys.filter(k => k.startsWith(`${CACHE_PREFIX}${prefix}`));
            if (matchingKeys.length > 0) {
                await AsyncStorage.multiRemove(matchingKeys);
            }
        } catch (error) {
            console.error(`LocalCache invalidatePrefix failed for prefix "${prefix}":`, error);
        }
    }
};
