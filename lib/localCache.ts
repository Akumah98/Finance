import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEnvelope<T = any> {
    data: T;
    timestamp: number;
    ttlMs?: number; // undefined = never expires (persistent offline)
}

const CACHE_PREFIX = 'glitch_cache_';

export const localCache = {
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

    async get<T = any>(key: string): Promise<T | null> {
        try {
            const storageKey = `${CACHE_PREFIX}${key}`;
            const raw = await AsyncStorage.getItem(storageKey);
            if (!raw) return null;

            const envelope: CacheEnvelope<T> = JSON.parse(raw);
            if (envelope.ttlMs && Date.now() - envelope.timestamp > envelope.ttlMs) {
                await AsyncStorage.removeItem(storageKey);
                return null;
            }

            return envelope.data;
        } catch (error) {
            console.error(`LocalCache get failed for key "${key}":`, error);
            return null;
        }
    },

    async getTimestamp(key: string): Promise<number | null> {
        try {
            const storageKey = `${CACHE_PREFIX}${key}`;
            const raw = await AsyncStorage.getItem(storageKey);
            if (!raw) return null;
            const envelope: CacheEnvelope = JSON.parse(raw);
            return envelope.timestamp;
        } catch {
            return null;
        }
    },

    async invalidate(key: string): Promise<void> {
        try {
            const storageKey = `${CACHE_PREFIX}${key}`;
            await AsyncStorage.removeItem(storageKey);
        } catch (error) {
            console.error(`LocalCache invalidate failed for key "${key}":`, error);
        }
    },

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
    },

    async clearUserData(userId: string): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const userKeys = keys.filter(k =>
                k.startsWith(CACHE_PREFIX) && k.includes(userId)
            );
            if (userKeys.length > 0) {
                await AsyncStorage.multiRemove(userKeys);
            }
        } catch (error) {
            console.error('LocalCache clearUserData failed:', error);
        }
    }
};
