// IndexedDB im Speicher (jsdom bringt keine mit); pro Test über resetDatabase() frisch
import 'fake-indexeddb/auto';
// Zusätzliche Matcher wie toBeInTheDocument(), toHaveFocus(), toBeDisabled()
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Node ab Version 25 bringt ein eigenes (ohne --localstorage-file unbenutzbares)
// localStorage mit, das das jsdom-localStorage überdeckt. Für Tests daher bei
// Bedarf einen einfachen In-Memory-Speicher bereitstellen.
if (typeof globalThis.localStorage?.getItem !== 'function') {
  const store = new Map();
  const memoryStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    }
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true, writable: true });
}

// Ohne globale Vitest-APIs räumt Testing Library nicht selbst auf
afterEach(() => {
  cleanup();
});
