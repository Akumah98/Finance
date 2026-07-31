const cacheStore = new Map();

// 6 hour TTL — insights only change when transactions/bills change
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

function get(userId) {
    const key = userId.toString();
    const entry = cacheStore.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > (entry.ttlMs || DEFAULT_TTL_MS)) {
        cacheStore.delete(key);
        return null;
    }

    return entry.insights;
}

function set(userId, insights, ttlMs = DEFAULT_TTL_MS) {
    const key = userId.toString();
    cacheStore.set(key, {
        insights,
        timestamp: Date.now(),
        ttlMs
    });
}

function invalidate(userId) {
    const key = userId.toString();
    cacheStore.delete(key);
}

module.exports = {
    get,
    set,
    invalidate
};
