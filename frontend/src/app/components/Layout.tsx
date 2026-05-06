import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { FilterSidebar } from './FilterSidebar';
import { TopBar } from './TopBar';
import { SelectionToolbar } from './SelectionToolbar';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useApiData } from '../hooks/useApiData';
import { useDashboardPrefs } from '../hooks/useDashboardPrefs';

const formatAgo = (iso: string): string => {
  if (!iso) return '—';
  const ageMs = Date.now() - new Date(iso).getTime();
  if (!isFinite(ageMs) || ageMs < 0) return '—';
  const m = Math.floor(ageMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const Layout = () => {
  const { activeFilters } = useCrossFilter();
  const { prefs, updatePrefs, loaded: prefsLoaded } = useDashboardPrefs();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Hydrate sidebar_open from server-side prefs once they arrive.
  // We can't initialise useState from prefs because the hook fetches
  // asynchronously; instead, sync on first load only so the user's
  // mid-session toggle isn't clobbered by a re-fetch.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (prefsLoaded && !hydrated) {
      if (typeof prefs.sidebar_open === 'boolean') {
        setSidebarOpen(prefs.sidebar_open);
      }
      setHydrated(true);
    }
  }, [prefsLoaded, hydrated, prefs.sidebar_open]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      // Fire-and-forget; UI updates synchronously via setState.
      updatePrefs({ sidebar_open: next }).catch(() => {});
      return next;
    });
  };

  // Pull the most recent pipeline run for an honest "Last Sync" footer.
  const { data: history } = useApiData<any[]>('/pipeline/history/', [], { noFilters: true });
  const latest = Array.isArray(history) && history.length
    ? [...history].sort((a, b) => (b.last_run_at || '').localeCompare(a.last_run_at || ''))[0]
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Skip link — DASH-E00-A06 keyboard navigation requirement.
          Hidden until focused so keyboard-only users can jump past the
          sidebar/topbar nav directly to the dashboard content. */}
      <a
        href="#main-content"
        className="absolute left-2 top-2 z-[100] px-3 py-2 bg-teal-700 text-white rounded-md text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white -translate-y-16 focus:translate-y-0 transition-transform"
      >
        Skip to main content
      </a>

      <TopBar />

      <div className="flex flex-1">
        <FilterSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 min-w-0 transition-[margin-left] duration-300 ease-in-out ${sidebarOpen ? 'ml-[280px]' : 'ml-0'}`}
        >
          {activeFilters.length > 0 && <SelectionToolbar />}

          <div className="p-6">
            <Outlet />
          </div>

          <footer
            className="px-6 py-4 text-sm flex items-center justify-between"
            style={{
              backgroundColor: 'var(--surface-0)',
              borderTop: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            <div className="flex items-center gap-4">
              <span>Version 2.1.0</span>
              <span style={{ color: 'var(--ink-3)' }}>•</span>
              <span>Last Sync: {latest ? formatAgo(latest.last_run_at) : '—'}</span>
            </div>
            <span style={{ color: 'var(--ink-3)' }}>© Biloop Software Design & Programming W.L.L.</span>
          </footer>
        </main>
      </div>
    </div>
  );
};
