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
      // Prevent browser 5MB quota exhaustion for history arrays
      let valueToStore = storedValue;
      if (Array.isArray(storedValue) && storedValue.length > 50) {
        valueToStore = storedValue.slice(storedValue.length - 50); // Keep last 50 items
      }
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Please clear some data.');
      } else {
        console.warn(`Failed to save to localStorage key "${key}":`, err);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
