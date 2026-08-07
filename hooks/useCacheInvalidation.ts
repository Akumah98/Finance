import { localCache } from "@/lib/localCache";
import { useCallback } from "react";

export function useCacheInvalidation() {
  const invalidateKey = useCallback((key: string) => {
    return localCache.invalidate(key);
  }, []);

  const invalidatePrefix = useCallback((prefix: string) => {
    return localCache.invalidatePrefix(prefix);
  }, []);

  const invalidateTransactions = useCallback((userId?: string) => {
    localCache.invalidatePrefix("transactions_");
    localCache.invalidatePrefix("healthscore_");
    localCache.invalidatePrefix("userstats_");
    if (userId) {
      localCache.invalidate(`transactions_${userId}`);
    }
  }, []);

  const invalidateCategories = useCallback((userId?: string) => {
    localCache.invalidatePrefix("categories_");
    localCache.invalidatePrefix("budgets_");
    if (userId) {
      localCache.invalidate(`categories_${userId}`);
    }
  }, []);

  const invalidateGoals = useCallback((userId?: string) => {
    localCache.invalidatePrefix("goals_");
    localCache.invalidatePrefix("healthscore_");
    localCache.invalidatePrefix("userstats_");
    if (userId) {
      localCache.invalidate(`goals_${userId}`);
    }
  }, []);

  const invalidateBills = useCallback((userId?: string) => {
    localCache.invalidatePrefix("bills_");
    localCache.invalidatePrefix("healthscore_");
    if (userId) {
      localCache.invalidate(`bills_${userId}`);
    }
  }, []);

  return {
    invalidateKey,
    invalidatePrefix,
    invalidateTransactions,
    invalidateCategories,
    invalidateGoals,
    invalidateBills,
  };
}
