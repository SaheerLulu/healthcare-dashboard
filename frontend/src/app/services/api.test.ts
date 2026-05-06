import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for the axios instance used across the dashboard.
 *
 * The instance is created once per import, so we re-import it in each
 * test after setting up localStorage. We verify:
 *  - baseURL is '/api'
 *  - the request interceptor injects Authorization: Bearer <token>
 *    when an access_token is present in localStorage
 *  - the request interceptor leaves the header alone when there's no
 *    token
 *  - the response interceptor logs (rather than throws) on 401
 */
describe('api axios instance', () => {
  let originalLocalStorage: Storage;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    originalConsoleWarn = console.warn;
    // Fresh in-memory localStorage per test
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      key: (i) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    } as Storage;
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
    console.warn = originalConsoleWarn;
  });

  it('creates a singleton with baseURL /api', async () => {
    const api = (await import('./api')).default;
    expect(api.defaults.baseURL).toBe('/api');
  });

  it('request interceptor injects Bearer token from localStorage', async () => {
    localStorage.setItem('access_token', 'test-jwt-abc');
    const api = (await import('./api')).default;
    // Run the request interceptor manually with a config object
    const handler = (api.interceptors.request as any).handlers[0].fulfilled;
    const cfg = await handler({ headers: {} });
    expect(cfg.headers.Authorization).toBe('Bearer test-jwt-abc');
  });

  it('request interceptor leaves headers alone when no token', async () => {
    const api = (await import('./api')).default;
    const handler = (api.interceptors.request as any).handlers[0].fulfilled;
    const cfg = await handler({ headers: {} });
    expect(cfg.headers.Authorization).toBeUndefined();
  });

  it('response interceptor logs a warning on 401 then rejects', async () => {
    const api = (await import('./api')).default;
    console.warn = vi.fn();
    const handler = (api.interceptors.response as any).handlers[0].rejected;
    await expect(handler({ response: { status: 401 } })).rejects.toBeDefined();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect((console.warn as any).mock.calls[0][0]).toMatch(/auth failed/i);
  });

  it('response interceptor passes 5xx through unchanged', async () => {
    const api = (await import('./api')).default;
    console.warn = vi.fn();
    const handler = (api.interceptors.response as any).handlers[0].rejected;
    const err = { response: { status: 500 }, message: 'boom' };
    await expect(handler(err)).rejects.toBe(err);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
