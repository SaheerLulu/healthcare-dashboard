import { useState } from 'react';
import { Outlet } from 'react-router';
import { FilterSidebar } from './FilterSidebar';
import { TopBar } from './TopBar';
import { SelectionToolbar } from './SelectionToolbar';
import { useCrossFilter } from '../contexts/CrossFilterContext';
import { useApiData } from '../hooks/useApiData';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Pull the most recent pipeline run for an honest "Last Sync" footer.
  const { data: history } = useApiData<any[]>('/pipeline/history/', [], { noFilters: true });
  const latest = Array.isArray(history) && history.length
    ? [...history].sort((a, b) => (b.last_run_at || '').localeCompare(a.last_run_at || ''))[0]
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--surface-1)' }}>
      <TopBar />

      <div className="flex flex-1">
        <FilterSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(prev => !prev)} />

        <main className={`flex-1 min-w-0 transition-[margin-left] duration-300 ease-in-out ${sidebarOpen ? 'ml-[280px]' : 'ml-0'}`}>
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
