/**
 * Vitest test bootstrap.
 *
 * Loaded before each test file via vitest.config.ts → setupFiles.
 * Brings in jest-dom matchers (toBeInTheDocument, toHaveTextContent, …)
 * and silences a couple of noisy globals jsdom doesn't ship with.
 */
import '@testing-library/jest-dom/vitest';

// Recharts (and lucide) sometimes call ResizeObserver during render;
// jsdom doesn't implement it. Polyfill with a noop so component tests
// don't blow up.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// matchMedia is also missing under jsdom and used by tailwind's
// container queries plugin in some chart wrappers.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any;
}
