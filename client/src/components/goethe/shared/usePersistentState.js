import { useEffect, useRef, useState } from 'react';

/**
 * useState that mirrors its value into sessionStorage under `key`, so a
 * refresh during a mock exam keeps answers and progress. With a null key it
 * behaves exactly like useState. `serialize` can strip bulky fields (audio);
 * `revive` maps a restored value (e.g. a transient phase back to a stable one).
 */
export function usePersistentState(key, initial, { serialize, revive } = {}) {
  const [value, setValue] = useState(() => {
    if (key) {
      try {
        const raw = sessionStorage.getItem(key);
        if (raw !== null) return revive ? revive(JSON.parse(raw)) : JSON.parse(raw);
      } catch {
        // storage unavailable or corrupt — start fresh
      }
    }
    return typeof initial === 'function' ? initial() : initial;
  });
  const serializeRef = useRef(serialize);

  useEffect(() => {
    serializeRef.current = serialize;
  }, [serialize]);

  useEffect(() => {
    if (!key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(serializeRef.current ? serializeRef.current(value) : value));
    } catch {
      // quota exceeded or storage blocked — the in-memory state still works
    }
  }, [key, value]);

  return [value, setValue];
}

/** Removes every persisted entry whose key starts with `prefix`. */
export function clearPersisted(prefix) {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // storage unavailable
  }
}
