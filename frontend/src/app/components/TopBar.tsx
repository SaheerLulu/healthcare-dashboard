import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import {
  ChevronDown, MapPin, LogOut, Settings, User, Check,
  BarChart3, ShoppingCart, Package, DollarSign, Store, FileText, Database,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { useFilters } from '../contexts/FilterContext';
import { useApiData } from '../hooks/useApiData';

interface NavGroup {
  label: string;
  icon: LucideIcon;
  paths: string[];
  items: Array<{ label: string; path: string }> | null;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Dashboard',
    icon: BarChart3,
    paths: ['/'],
    items: null,
  },
  {
    label: 'Sales',
    icon: ShoppingCart,
    paths: ['/sales', '/dispatch', '/loyalty'],
    items: [
      { label: 'Sales Command Center', path: '/sales' },
      { label: 'Dispatch & Fulfillment', path: '/dispatch' },
      { label: 'Loyalty Analytics', path: '/loyalty' },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    paths: ['/inventory', '/procurement', '/product'],
    items: [
      { label: 'Inventory Operations', path: '/inventory' },
      { label: 'Procurement Intelligence', path: '/procurement' },
      { label: 'Product Intelligence', path: '/product' },
    ],
  },
  {
    label: 'Financial',
    icon: DollarSign,
    paths: ['/financial', '/working-capital', '/gst', '/tds'],
    items: [
      { label: 'Financial Deep Dive', path: '/financial' },
      { label: 'Working Capital', path: '/working-capital' },
      { label: 'GST Compliance', path: '/gst' },
      { label: 'TDS Tracker', path: '/tds' },
    ],
  },
  {
    label: 'Locations',
    icon: Store,
    paths: ['/location'],
    items: null,
  },
  {
    label: 'Reports',
    icon: FileText,
    paths: ['/reports/sales', '/reports/purchases', '/audit'],
    items: [
      { label: 'Sales Bills', path: '/reports/sales' },
      { label: 'Purchase Bills', path: '/reports/purchases' },
      { label: 'Audit & Data Health', path: '/audit' },
    ],
  },
  {
    label: 'Data',
    icon: Database,
    paths: [
      '/detail/sales', '/detail/sales-returns', '/detail/purchase',
      '/detail/inventory', '/detail/financial', '/detail/gst', '/detail/tds',
    ],
    items: [
      { label: 'Sales Data', path: '/detail/sales' },
      { label: 'Sales Returns', path: '/detail/sales-returns' },
      { label: 'Purchase Data', path: '/detail/purchase' },
      { label: 'Inventory Data', path: '/detail/inventory' },
      { label: 'Financial Data', path: '/detail/financial' },
      { label: 'GST Data', path: '/detail/gst' },
      { label: 'TDS Data', path: '/detail/tds' },
    ],
  },
];

const activeStyle: CSSProperties = {
  color: 'var(--brand)',
  backgroundColor: 'rgba(15, 157, 154, 0.08)',
};
const inactiveStyle: CSSProperties = {
  color: 'var(--ink-2)',
};

const ActiveIndicator = () => (
  <span
    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
    style={{ backgroundColor: 'var(--brand)' }}
  />
);

export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, updateFilters } = useFilters();
  const { data: filterOptions } = useApiData<{ locations: Array<{ id: string; name: string }> }>(
    '/executive/filter-options/',
    { locations: [] },
    { noFilters: true }
  );
  const LOCATIONS = [{ id: '', name: 'All Locations' }, ...filterOptions.locations];

  // Single source of truth for what's currently open: group label, "location", "profile", or null
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const selectedLocation = LOCATIONS.find(
    l => filters.locations.length > 0 ? filters.locations.includes(l.id) : l.id === ''
  ) || LOCATIONS[0];

  const isGroupActive = (group: NavGroup) =>
    group.paths.some(p => p === '/' ? location.pathname === '/' : location.pathname === p);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close any open dropdown when route changes
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  const handleLocationSelect = (id: string) => {
    updateFilters({ locations: id ? [id] : [] });
    setOpenDropdown(null);
  };

  const handleGroupClick = (group: NavGroup) => {
    if (!group.items) {
      navigate(group.paths[0]);
      setOpenDropdown(null);
      return;
    }
    setOpenDropdown(openDropdown === group.label ? null : group.label);
  };

  const tabClass =
    'relative flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors';

  return (
    <header
      ref={navRef}
      className="h-16 backdrop-blur-lg border-b sticky top-0 z-50 flex items-center px-4"
      style={{ backgroundColor: 'var(--color-nav-bg)', borderColor: 'var(--color-nav-border)' }}
    >
      {/* seefmed wordmark */}
      <div className="flex items-center mr-4 flex-shrink-0" aria-label="seefmed" title="seefmed">
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: 'var(--ink)',
            display: 'inline-flex',
            alignItems: 'baseline',
          }}
        >
          seef<span style={{ color: 'var(--brand)' }}>med</span>
          <span style={{ color: 'var(--brand)' }}>.</span>
        </span>
      </div>

      {/* Grouped menu strip — flex-1 so it occupies the middle of the bar.
          NOTE: overflow-x-auto would clip the dropdown popovers (CSS auto-
          promotes overflow-y to non-visible when overflow-x is set). */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {NAV_GROUPS.map((group) => {
            const active = isGroupActive(group);
            const isOpen = openDropdown === group.label;
            const hasSubs = !!group.items;

            // Single-item group → direct NavLink with active indicator
            if (!hasSubs) {
              return (
                <NavLink
                  key={group.label}
                  to={group.paths[0]}
                  end={group.paths[0] === '/'}
                  className={tabClass}
                  style={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
                >
                  {({ isActive }) => (
                    <>
                      <group.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{group.label}</span>
                      {isActive && <ActiveIndicator />}
                    </>
                  )}
                </NavLink>
              );
            }

            // Multi-item group → dropdown trigger
            return (
              <div key={group.label} className="relative">
                <button
                  onClick={() => handleGroupClick(group)}
                  className={tabClass}
                  style={active ? activeStyle : inactiveStyle}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  <group.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                  {active && <ActiveIndicator />}
                </button>

                {isOpen && group.items && (
                  <div
                    className="absolute top-full left-0 mt-1 w-56 rounded-lg shadow-lg z-50 overflow-hidden dropdown-animate"
                    style={{
                      backgroundColor: 'var(--color-dropdown-bg)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className="block px-4 py-2 text-xs transition-all"
                        style={({ isActive }) =>
                          isActive
                            ? { color: 'var(--brand)', backgroundColor: 'rgba(15, 157, 154, 0.08)', fontWeight: 500 }
                            : { color: 'var(--ink)' }
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {/* Location Selector */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
            style={
              openDropdown === 'location'
                ? {
                    color: 'var(--brand)',
                    backgroundColor: 'rgba(15, 157, 154, 0.08)',
                    borderColor: 'var(--brand)',
                  }
                : {
                    color: 'var(--ink)',
                    backgroundColor: 'var(--surface-0)',
                    borderColor: 'var(--line)',
                  }
            }
          >
            <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
            <span className="max-w-[120px] truncate">{selectedLocation.name}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'location' ? 'rotate-180' : ''}`}
              style={{ color: 'var(--ink-3)' }}
            />
          </button>

          {openDropdown === 'location' && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl overflow-hidden z-50 dropdown-animate"
              style={{
                backgroundColor: 'var(--color-dropdown-bg)',
                border: '1px solid var(--line)',
              }}
            >
              <div
                className="px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--line)', backgroundColor: 'var(--surface-1)' }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
                  Select Location
                </p>
              </div>
              <div className="py-1 max-h-64 overflow-y-auto">
                {LOCATIONS.map(loc => {
                  const active = selectedLocation.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationSelect(loc.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm transition-all"
                      style={
                        active
                          ? { color: 'var(--brand)', backgroundColor: 'rgba(15, 157, 154, 0.08)', fontWeight: 500 }
                          : { color: 'var(--ink)' }
                      }
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = '';
                      }}
                    >
                      <span>{loc.name}</span>
                      {active && <Check className="w-4 h-4" style={{ color: 'var(--brand)' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'profile' ? null : 'profile')}
            className="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-medium leading-tight" style={{ color: 'var(--ink)' }}>Admin</p>
              <p className="text-[10px] leading-tight" style={{ color: 'var(--ink-3)' }}>Administrator</p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 hidden lg:block transition-transform ${openDropdown === 'profile' ? 'rotate-180' : ''}`}
              style={{ color: 'var(--ink-3)' }}
            />
          </button>

          {openDropdown === 'profile' && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl overflow-hidden z-50 dropdown-animate"
              style={{
                backgroundColor: 'var(--color-dropdown-bg)',
                border: '1px solid var(--line)',
              }}
            >
              <div
                className="p-4"
                style={{ borderBottom: '1px solid var(--line)', backgroundColor: 'var(--surface-1)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Admin User</p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>admin@biloop.ai</p>
                <span
                  className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full"
                  style={{ backgroundColor: 'rgba(15, 157, 154, 0.12)', color: 'var(--brand-press)' }}
                >
                  Administrator
                </span>
              </div>
              <div className="py-2">
                <button
                  onClick={() => { navigate('/settings'); setOpenDropdown(null); }}
                  className="w-full px-4 py-2.5 text-left text-sm transition-all flex items-center gap-3"
                  style={{ color: 'var(--ink)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                >
                  <Settings className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
                  Settings
                </button>
              </div>
              <div style={{ borderTop: '1px solid var(--line)' }} className="py-2">
                <button
                  className="w-full px-4 py-2.5 text-left text-sm transition-all flex items-center gap-3"
                  style={{ color: 'var(--danger)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(192, 57, 43, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
