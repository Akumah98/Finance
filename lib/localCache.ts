import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEnvelope<T = any> {
    data: T;
    timestamp: number;
    ttlMs?: number; // undefined = never expires unless version changes or explicitly invalidated
    version?: string;
}

const CACHE_PREFIX = 'glitch_cache_';
const CURRENT_CACHE_VERSION = 'v2_savings_fix';

type CacheChangeListener = (changedKeyOrPrefix: string) => void;
const listeners = new Set<CacheChangeListener>();

export const localCache = {
    subscribe(listener: CacheChangeListener): () => void {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },

    emitChange(keyOrPrefix: string): void {
        listeners.forEach(listener => {
            try {
                listener(keyOrPrefix);
            } catch (err) {
                console.error(`Error in localCache listener for "${keyOrPrefix}":`, err);
            }
        });
    },

    async set<T = any>(key: string, data: T, ttlMs?: number): Promise<void> {
        try {
            const envelope: CacheEnvelope<T> = {
                data,
                timestamp: Date.now(),
                ttlMs,
                version: CURRENT_CACHE_VERSION,
            };
            const storageKey = `${CACHE_PREFIX}${key}`;
            await AsyncStorage.setItem(storageKey, JSON.stringify(envelope));
            this.emitChange(key);
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

            if (envelope.version !== CURRENT_CACHE_VERSION) {
                await AsyncStorage.removeItem(storageKey);
                return null;
            }

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
            if (envelope.version !== CURRENT_CACHE_VERSION) return null;
            return envelope.timestamp;
        } catch {
            return null;
        }
    },

    async fetchWithRevalidation<T = any>(
        key: string,
        fetcher: () => Promise<T | null>,
        onUpdate: (data: T) => void,
        ttlMs?: number
    ): Promise<T | null> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            onUpdate(cached);
        }

        try {
            const fresh = await fetcher();
            if (fresh !== null) {
                onUpdate(fresh);
                await this.set(key, fresh, ttlMs);
                return fresh;
            }
        } catch (error) {
            console.error(`Revalidation failed for key "${key}":`, error);
        }

        return cached;
    },

    async invalidate(key: string): Promise<void> {
        try {
            const storageKey = `${CACHE_PREFIX}${key}`;
            await AsyncStorage.removeItem(storageKey);
            this.emitChange(key);
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
            this.emitChange(prefix);
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
            this.emitChange(userId);
        } catch (error) {
            console.error('LocalCache clearUserData failed:', error);
        }
    }
};

