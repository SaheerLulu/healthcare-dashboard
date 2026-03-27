import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Receipt, BarChart3,
  Package, ArrowLeftRight, Truck, Users, RotateCcw, Table
} from 'lucide-react';
import { cn } from './ui/utils';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Financial',
    items: [
      { path: '/revenue-sales', label: 'Revenue & Sales', icon: TrendingUp },
      { path: '/purchases', label: 'Purchases', icon: ShoppingCart },
      { path: '/gst-analysis', label: 'GST Analysis', icon: Receipt },
      { path: '/profitability', label: 'Profitability', icon: BarChart3 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/inventory-health', label: 'Inventory Health', icon: Package },
      { path: '/stock-movement', label: 'Stock Movement', icon: ArrowLeftRight },
      { path: '/supplier-performance', label: 'Supplier Performance', icon: Truck },
      { path: '/customer-analytics', label: 'Customer Analytics', icon: Users },
      { path: '/returns-analysis', label: 'Returns & Write-offs', icon: RotateCcw },
    ],
  },
  {
    label: 'Data',
    items: [
      { path: '/data-table', label: 'Data Table', icon: Table },
    ],
  },
];

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="bg-white border-b">
      <div className="flex items-center px-4 overflow-x-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="relative group">
            {group.items.length === 1 ? (
              // Single item - render directly
              (() => {
                const SingleIcon = group.items[0].icon;
                return (
                  <Link
                    to={group.items[0].path}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors text-sm whitespace-nowrap",
                      location.pathname === group.items[0].path
                        ? "border-blue-600 text-blue-600 font-medium"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    )}
                  >
                    <SingleIcon className="size-3.5" />
                    {group.items[0].label}
                  </Link>
                );
              })()
            ) : (
              // Multiple items - dropdown
              <>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors text-sm whitespace-nowrap",
                    group.items.some(item => item.path === location.pathname)
                      ? "border-blue-600 text-blue-600 font-medium"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  )}
                >
                  {group.label}
                  <svg className="size-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 top-full z-50 hidden group-hover:block pt-0.5">
                  <div className="bg-white border rounded-lg shadow-lg py-1 min-w-[200px]">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                            location.pathname === item.path
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          <Icon className="size-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
