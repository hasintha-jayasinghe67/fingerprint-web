"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Last successful payload for each screen, kept for this browser tab.
 * Opening a page again paints the previous result immediately, then
 * the hook refreshes it in the background.
 */
const cache = new Map<string, unknown>();

export function peekQuery<T>(key: string): T | undefined {
  return cache.has(key) ? (cache.get(key) as T) : undefined;
}

export function rememberQuery<T>(key: string, data: T): void {
  cache.set(key, data);
}

/**
 * Load JSON for a screen.
 *
 * `loading` is only true when there is nothing to show yet.
 * `refreshing` is true when a newer request is in flight behind
 * data the user can already see.
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T>) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cached = peekQuery<T>(key);
  const [data, setData] = useState<T | undefined>(cached);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(cached === undefined);

  const reload = useCallback(async () => {
    setPending(true);
    try {
      const next = await fetcherRef.current();
      rememberQuery(key, next);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPending(false);
    }
  }, [key]);

  useEffect(() => {
    const stored = peekQuery<T>(key);
    if (stored !== undefined) setData(stored);
    let cancelled = false;

    setPending(true);
    fetcherRef
      .current()
      .then((next) => {
        if (cancelled) return;
        rememberQuery(key, next);
        setData(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const hasData = data !== undefined;
  return {
    data,
    error,
    loading: pending && !hasData,
    refreshing: pending && hasData,
    reload,
  };
}
