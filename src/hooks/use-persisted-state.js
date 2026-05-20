import { useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "globestudio:";

const readStored = (storageKey, defaultValue) => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
};

export const usePersistedState = (key, defaultValue) => {
  const storageKey = STORAGE_PREFIX + key;
  const [value, setValue] = useState(() => readStored(storageKey, defaultValue));
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // localStorage full or unavailable — ignore
    }
  }, [storageKey, value]);

  return [value, setValue];
};

export const clearPersistedState = () => {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    const toRemove = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith(STORAGE_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((key) => storage.removeItem(key));
  } catch {
    // ignore
  }
};
