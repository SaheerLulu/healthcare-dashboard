import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardPrefs } from './useDashboardPrefs';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

import api from '../services/api';

describe('useDashboardPrefs', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.patch as any).mockReset();
  });

  it('starts with empty prefs and loaded=false', () => {
    (api.get as any).mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useDashboardPrefs());
    expect(result.current.prefs).toEqual({});
    expect(result.current.loaded).toBe(false);
  });

  it('hydrates prefs from /api/prefs/ on mount', async () => {
    (api.get as any).mockResolvedValue({
      data: { prefs: { sidebar_open: false, default_quick_preset: 'This Month' } },
    });
    const { result } = renderHook(() => useDashboardPrefs());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.prefs.sidebar_open).toBe(false);
    expect(result.current.prefs.default_quick_preset).toBe('This Month');
  });

  it('marks loaded=true even when /api/prefs/ rejects (network down etc.)', async () => {
    (api.get as any).mockRejectedValue(new Error('net'));
    const { result } = renderHook(() => useDashboardPrefs());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.prefs).toEqual({});
  });

  it('updatePrefs optimistically applies and PATCHes the server', async () => {
    (api.get as any).mockResolvedValue({ data: { prefs: { sidebar_open: true } } });
    (api.patch as any).mockResolvedValue({
      data: { prefs: { sidebar_open: false, default_quick_preset: 'Today' } },
    });

    const { result } = renderHook(() => useDashboardPrefs());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.updatePrefs({ sidebar_open: false });
    });

    expect(api.patch).toHaveBeenCalledWith('/prefs/', { sidebar_open: false });
    // Server returned default_quick_preset too — should adopt the merged view.
    expect(result.current.prefs.default_quick_preset).toBe('Today');
    expect(result.current.prefs.sidebar_open).toBe(false);
  });

  it('keeps optimistic update on PATCH failure (best-effort)', async () => {
    (api.get as any).mockResolvedValue({ data: { prefs: { sidebar_open: true } } });
    (api.patch as any).mockRejectedValue(new Error('500'));

    const { result } = renderHook(() => useDashboardPrefs());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.updatePrefs({ sidebar_open: false });
    });

    // Optimistic value is retained even though the network call failed.
    expect(result.current.prefs.sidebar_open).toBe(false);
  });
});
