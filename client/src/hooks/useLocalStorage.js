import { useState, useEffect } from 'react';

/**
 * Custom hook for localStorage persistence with JSON serialization.
 * @param {string} key - localStorage key
 * @param {*} initialValue - Default value if key doesn't exist
 */
export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (err) {
      console.warn(`Failed to save to localStorage key "${key}":`, err);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
