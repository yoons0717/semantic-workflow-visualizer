"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "swv:favorite-repos";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

const getSnapshot = () => localStorage.getItem(STORAGE_KEY) ?? "[]";
const getServerSnapshot = () => "[]";

function parse(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export function useFavorites() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const favorites = useMemo(() => parse(raw), [raw]);

  const toggle = useCallback((repo: string) => {
    const current = parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const next = current.includes(repo)
      ? current.filter((r) => r !== repo)
      : [...current, repo];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  const isFavorite = useCallback(
    (repo: string) => favorites.includes(repo),
    [favorites],
  );

  return { favorites, toggle, isFavorite };
}
