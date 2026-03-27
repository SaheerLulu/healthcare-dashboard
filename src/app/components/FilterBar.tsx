import { Search, X, Calendar } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { useFilters } from '../context/FilterContext';
import { locations } from '../data/seed/locations';
import { companies } from '../data/seed/companies';
import { categories } from '../data/computedData';

const DATE_PRESETS = [
  { label: 'Full FY 2025-26', from: '2025-04-01', to: '2026-03-31' },
  { label: 'Q1 (Apr-Jun)', from: '2025-04-01', to: '2025-06-30' },
  { label: 'Q2 (Jul-Sep)', from: '2025-07-01', to: '2025-09-30' },
  { label: 'Q3 (Oct-Dec)', from: '2025-10-01', to: '2025-12-31' },
  { label: 'Q4 (Jan-Mar)', from: '2026-01-01', to: '2026-03-31' },
  { label: 'Last 3 Months', from: '2026-01-01', to: '2026-03-31' },
  { label: 'This Month', from: '2026-03-01', to: '2026-03-31' },
];

export function FilterBar() {
  const {
    dateRange,
    setDateRange,
    selectedLocations,
    setSelectedLocations,
    selectedCategories,
    setSelectedCategories,
    selectedCompanies,
    setSelectedCompanies,
    searchQuery,
    setSearchQuery,
    clearAllFilters,
    hasActiveFilters,
  } = useFilters();

  const handleLocationChange = (value: string) => {
    if (value && !selectedLocations.includes(value)) {
      setSelectedLocations([...selectedLocations, value]);
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value && !selectedCategories.includes(value)) {
      setSelectedCategories([...selectedCategories, value]);
    }
  };

  const handleCompanyChange = (value: string) => {
    if (value && !selectedCompanies.includes(value)) {
      setSelectedCompanies([...selectedCompanies, value]);
    }
  };

  return (
    <div className="bg-white border-r h-full p-4 space-y-4">
      <div className="space-y-1 mb-4">
        <h2 className="font-semibold text-base">Filters</h2>
        <p className="text-xs text-gray-500">Filter pharmaceutical data</p>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search Products</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Date Range
          </label>
          <Select onValueChange={(value) => {
            const preset = DATE_PRESETS.find(p => p.label === value);
            if (preset) setDateRange({ from: preset.from, to: preset.to });
          }}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder="Full FY 2025-26" />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.label} value={preset.label}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <Select onValueChange={handleLocationChange}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Company</label>
          <Select onValueChange={handleCompanyChange}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.shortName || company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearAllFilters} className="w-full h-9">
            <X className="size-4 mr-2" />
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="pt-4 border-t space-y-2">
          <label className="text-sm font-medium">Active Filters</label>
          <div className="flex flex-col gap-2">
            {selectedLocations.map((locId) => {
              const loc = locations.find(l => l.id === locId);
              return (
                <Badge key={locId} variant="secondary" className="gap-1 text-xs py-1 justify-between">
                  <span>Location: {loc?.name || locId}</span>
                  <X className="size-3 cursor-pointer" onClick={() => setSelectedLocations(selectedLocations.filter(l => l !== locId))} />
                </Badge>
              );
            })}
            {selectedCategories.map((cat) => (
              <Badge key={cat} variant="secondary" className="gap-1 text-xs py-1 justify-between">
                <span>Category: {cat}</span>
                <X className="size-3 cursor-pointer" onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== cat))} />
              </Badge>
            ))}
            {selectedCompanies.map((compId) => {
              const comp = companies.find(c => c.id === compId);
              return (
                <Badge key={compId} variant="secondary" className="gap-1 text-xs py-1 justify-between">
                  <span>Company: {comp?.shortName || compId}</span>
                  <X className="size-3 cursor-pointer" onClick={() => setSelectedCompanies(selectedCompanies.filter(c => c !== compId))} />
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
