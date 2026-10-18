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

const writeStored = (storageKey, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — ignore
  }
};

// A design opened from a link shows without being saved: while a hold is on,
// the keys it names aren't written, so the design saved in this browser stays
// as it was. releasePersistedState ends the hold and saves each held key as it
// stands (App.jsx calls it at the first edit). The function
// holdPersistedState returns ends the hold without saving.
let held = null;
// Each mounted hook's latest value by storage key, for the release.
const latest = new Map();

export const holdPersistedState = (keys) => {
  const hold = new Set(keys.map((key) => STORAGE_PREFIX + key));
  held = hold;
  return () => {
    if (held === hold) held = null;
  };
};

export const isPersistedStateHeld = () => held !== null;

export const releasePersistedState = () => {
  if (!held) return;
  const keys = held;
  held = null;
  latest.forEach((valueRef, storageKey) => {
    if (keys.has(storageKey)) writeStored(storageKey, valueRef.current);
  });
};

export const usePersistedState = (key, defaultValue) => {
  const storageKey = STORAGE_PREFIX + key;
  const [value, setValue] = useState(() => readStored(storageKey, defaultValue));
  const firstRender = useRef(true);
  const valueRef = useRef(value);

  useEffect(() => {
    latest.set(storageKey, valueRef);
    return () => {
      if (latest.get(storageKey) === valueRef) latest.delete(storageKey);
    };
  }, [storageKey]);

  useEffect(() => {
    valueRef.current = value;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (held?.has(storageKey)) return;
    writeStored(storageKey, value);
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
