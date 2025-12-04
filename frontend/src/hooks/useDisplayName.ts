import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "notedock_display_name";
const DEFAULT_NAME = "匿名ユーザー";

export function useDisplayName() {
  const [displayName, setDisplayNameState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_NAME;
    }
    return DEFAULT_NAME;
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDisplayNameState(stored);
    }
  }, []);

  const setDisplayName = useCallback((name: string) => {
    const trimmed = name.trim() || DEFAULT_NAME;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setDisplayNameState(trimmed);
  }, []);

  const clearDisplayName = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDisplayNameState(DEFAULT_NAME);
  }, []);

  return {
    displayName,
    setDisplayName,
    clearDisplayName,
    isDefault: displayName === DEFAULT_NAME,
  };
}
