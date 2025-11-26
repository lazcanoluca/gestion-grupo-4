import { useEffect, useState } from "react";

/**
 * Minimal persistent state hook backed by localStorage.
 * Reads once on mount and writes whenever the value changes.
 */
export function usePersistentState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;

    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write failures
    }
  }, [key, value]);

  return [value, setValue] as const;
}
