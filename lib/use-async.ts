"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

// Minimal fetch-on-mount hook so pages don't repeat the same useEffect dance.
// `loading` is derived — the settled result carries the key of the request it
// answered, and we're loading whenever that key isn't the current one. That
// keeps the effect free of synchronous setState calls.
// Deliberately tiny; swap for TanStack Query if it ever earns its weight.
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [tick, setTick] = useState(0);
  const key = `${JSON.stringify(deps)}#${tick}`;
  const [settled, setSettled] = useState<Settled<T>>({ key: "", data: null, error: null });

  // Latest fn without making it an effect dependency (a fresh closure every render).
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let cancelled = false;
    fnRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ key, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) setSettled({ key, data: null, error: e instanceof Error ? e.message : "Something went wrong" });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loading = settled.key !== key;

  return {
    data: loading ? null : settled.data,
    error: loading ? null : settled.error,
    loading,
    reload,
  };
}
