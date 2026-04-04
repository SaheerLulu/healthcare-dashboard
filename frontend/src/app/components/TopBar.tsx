import { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, MapPin, LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useFilters } from '../contexts/FilterContext';
import { useApiData } from '../hooks/useApiData';

export const TopBar = () => {
  const navigate = useNavigate();
  const { filters, updateFilters } = useFilters();
  const { data: filterOptions } = useApiData<{ locations: Array<{ id: string; name: string }> }>(
    '/executive/filter-options/',
    { locations: [] },
    { noFilters: true }
  );
  const LOCATIONS = [{ id: '', name: 'All Locations' }, ...filterOptions.locations];
  const [locationOpen, setLocationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const selectedLocation = LOCATIONS.find(
    l => filters.locations.length > 0 ? filters.locations.includes(l.id) : l.id === ''
  ) || LOCATIONS[0];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setLocationOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSelect = (id: string) => {
    updateFilters({ locations: id ? [id] : [] });
    setLocationOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="h-16 px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">HP</span>
            </div>
            <div>
              <div className="font-bold text-gray-900">HealPro</div>
              <div className="text-xs text-gray-500">Chemist+</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Location Selector Dropdown */}
          <div className="relative" ref={locationRef}>
            <button
              onClick={() => { setLocationOpen(!locationOpen); setProfileOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                locationOpen
                  ? 'border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-200'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="max-w-[140px] truncate">{selectedLocation.name}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
            </button>

            {locationOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Location</p>
                </div>
                <div className="py-1 max-h-64 overflow-y-auto">
                  {LOCATIONS.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationSelect(loc.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        selectedLocation.id === loc.id
                          ? 'bg-teal-50 text-teal-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        selectedLocation.id === loc.id ? 'bg-teal-500' : 'bg-gray-300'
                      }`} />
                      <span>{loc.name}</span>
                      {selectedLocation.id === loc.id && (
                        <span className="ml-auto text-teal-500 text-xs font-semibold">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setLocationOpen(false); }}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                profileOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-medium">
                A
              </div>
              <span className="text-sm font-medium text-gray-700">Admin</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">admin@healpro.in</p>
                </div>
                <div className="py-1">
                  <button onClick={() => { navigate('/settings'); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </button>
                  <button onClick={() => { navigate('/settings'); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4 text-gray-400" />
                    Profile
                  </button>
                </div>
                <div className="border-t border-gray-100">
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
