import { localCache } from "@/lib/localCache";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseCachedDataOptions<T> {
  ttlMs?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
}

export function useCachedData<T = any>(
  key: string | null | undefined,
  fetcher: () => Promise<T | null>,
  options: UseCachedDataOptions<T> = {}
) {
  const { ttlMs, enabled = true, onSuccess } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (!key || !enabled) return null;
    if (isManualRefresh) setIsRefreshing(true);

    try {
      const result = await localCache.fetchWithRevalidation<T>(
        key,
        () => fetcherRef.current(),
        (updatedData) => {
          setData(updatedData);
          if (onSuccess) onSuccess(updatedData);
        },
        ttlMs
      );
      return result;
    } catch (err) {
      console.error(`useCachedData fetch error for key "${key}":`, err);
      return null;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [key, enabled, ttlMs, onSuccess]);

  // Reactive subscription: auto-update when key or prefix changes anywhere
  useEffect(() => {
    if (!key || !enabled) return;
    loadData();

    const unsubscribe = localCache.subscribe((changedKeyOrPrefix) => {
      if (
        changedKeyOrPrefix &&
        (key === changedKeyOrPrefix ||
          key.startsWith(changedKeyOrPrefix) ||
          changedKeyOrPrefix.startsWith(key))
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [key, enabled, loadData]);

  // Screen focus revalidation for mobile (Android & iOS)
  useFocusEffect(
    useCallback(() => {
      if (key && enabled) {
        loadData();
      }
    }, [key, enabled, loadData])
  );

  return {
    data,
    isLoading,
    isRefreshing,
    refetch: () => loadData(true),
  };
}
