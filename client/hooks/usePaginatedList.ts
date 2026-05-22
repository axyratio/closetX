// hooks/usePaginatedList.ts
import { useState, useCallback } from "react";

type FetchFn<T> = (skip: number, limit: number) => Promise<T[]>;

export function usePaginatedList<T>(fetchFn: FetchFn<T>, limit = 10) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setPage(0);
    setHasMore(true);
    try {
      const result = await fetchFn(0, limit);
      setData(result);
      if (result.length < limit) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, limit]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchFn(nextPage * limit, limit);
      setData((prev) => [...prev, ...result]);
      setPage(nextPage);
      if (result.length < limit) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, fetchFn, limit]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    try {
      const result = await fetchFn(0, limit);
      setData(result);
      if (result.length < limit) setHasMore(false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFn, limit]);

  return { data, setData, loading, loadingMore, refreshing, hasMore, load, loadMore, refresh };
}