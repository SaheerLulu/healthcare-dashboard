import { useState } from 'react';
import { Outlet } from 'react-router';
import { FilterSidebar } from './FilterSidebar';
import { TopBar } from './TopBar';
import { NavigationBar } from './NavigationBar';
import { SelectionToolbar } from './SelectionToolbar';
import { useCrossFilter } from '../contexts/CrossFilterContext';

export const Layout = () => {
  const { activeFilters } = useCrossFilter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar />
      <NavigationBar />

      <div className="flex flex-1">
        <FilterSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(prev => !prev)} />

        <main className={`flex-1 transition-[margin-left] duration-300 ease-in-out ${sidebarOpen ? 'ml-[280px]' : 'ml-0'}`}>
          {activeFilters.length > 0 && <SelectionToolbar />}

          <div className="p-6">
            <Outlet />
          </div>

          <footer className="bg-white border-t border-gray-200 px-6 py-4 text-sm text-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Version 2.1.0</span>
              <span>•</span>
              <span>Last Sync: 2 min ago</span>
            </div>
            <span>© Biloop Software Design & Programming W.L.L.</span>
          </footer>
        </main>
      </div>
    </div>
  );
};