import { useState } from 'react';
import { NavLink } from 'react-router';
import {
  BarChart3,
  DollarSign,
  ShoppingCart,
  Package,
  Truck,
  Building2,
  Receipt,
  Wallet,
  Store,
  ClipboardList,
  Send,
  Star,
  Shield,
  FileText,
  ChevronDown,
  Settings,
} from 'lucide-react';

const navItems = [
  { icon: BarChart3, label: 'Executive Summary', path: '/' },
  { icon: DollarSign, label: 'Financial', path: '/financial' },
  { icon: ShoppingCart, label: 'Sales', path: '/sales' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: Truck, label: 'Procurement', path: '/procurement' },
  { icon: Building2, label: 'GST', path: '/gst' },
  { icon: Receipt, label: 'TDS', path: '/tds' },
  { icon: Wallet, label: 'Working Capital', path: '/working-capital' },
  { icon: Store, label: 'Locations', path: '/location' },
  { icon: ClipboardList, label: 'Products', path: '/product' },
  { icon: Send, label: 'Dispatch', path: '/dispatch' },
  { icon: Star, label: 'Loyalty', path: '/loyalty' },
  { icon: Shield, label: 'Audit', path: '/audit' },
];

const dataTableItems = [
  { label: 'Sales Data', path: '/detail/sales' },
  { label: 'Inventory Data', path: '/detail/inventory' },
  { label: 'Purchase Data', path: '/detail/purchase' },
  { label: 'Financial Data', path: '/detail/financial' },
  { label: 'GST Data', path: '/detail/gst' },
];

export const NavigationBar = () => {
  const [isDataTablesOpen, setIsDataTablesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="px-4 overflow-x-auto overflow-y-visible">
        <div className="flex items-center gap-1 h-12">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600 -mb-px'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-teal-600'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Data Tables Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDataTablesOpen(!isDataTablesOpen)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg whitespace-nowrap transition-colors"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>Data Tables</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {isDataTablesOpen && (
              <>
                <div
                  className="fixed inset-0 z-[99]"
                  onClick={() => setIsDataTablesOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] py-1">
                  {dataTableItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsDataTablesOpen(false)}
                      className={({ isActive }) =>
                        `block px-4 py-2 text-xs ${
                          isActive
                            ? 'text-teal-700 bg-teal-50 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};