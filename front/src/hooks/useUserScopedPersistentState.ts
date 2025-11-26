import { useEffect, useState } from "react";

/**
 * Persistent state scoped by userId.
 * Stores under key: `scheduler.${userId || 'anon'}.${key}`
 */
export function useUserScopedPersistentState<T>(
  userId: string | null | undefined,
  key: string,
  defaultValue: T
) {
  const [hydrated, setHydrated] = useState(false);

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined" || !userId) return defaultValue;
    try {
      const scopedKey = `scheduler.${userId}.${key}`;
      const stored = window.localStorage.getItem(scopedKey);
      if (stored === null) return defaultValue;
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  });

  // Rehidratar cuando cambia el usuario
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) {
      setValue(defaultValue);
      setHydrated(true);
      return;
    }
    try {
      const scopedKey = `scheduler.${userId}.${key}`;
      const stored = window.localStorage.getItem(scopedKey);
      if (stored === null) {
        setValue(defaultValue);
      } else {
        setValue(JSON.parse(stored) as T);
      }
      setHydrated(true);
    } catch {
      setValue(defaultValue);
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId || !hydrated) return;
    try {
      const scopedKey = `scheduler.${userId}.${key}`;
      window.localStorage.setItem(scopedKey, JSON.stringify(value));
    } catch {
      // ignore write failures
    }
  }, [userId, key, value, hydrated]);

  return [value, setValue] as const;
}
