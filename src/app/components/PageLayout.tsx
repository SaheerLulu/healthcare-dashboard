import { type LucideIcon } from 'lucide-react';
import { cn } from './ui/utils';
import { Navigation } from './Navigation';
import { FilterBar } from './FilterBar';
import { Badge } from './ui/badge';
import { useFilters } from '../context/FilterContext';
import { type ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor?: string;
  children: ReactNode;
}

export function PageLayout({ title, subtitle, icon: Icon, iconColor = 'text-blue-600', children }: PageLayoutProps) {
  const { chartFilter } = useFilters();

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className={cn('size-7', iconColor)} />
              <div>
                <h1 className="text-xl font-bold">{title}</h1>
                <p className="text-xs text-gray-500">{subtitle}</p>
              </div>
            </div>
            {chartFilter.field && chartFilter.value && (
              <Badge variant="default" className="bg-blue-600">
                Cross-filtered: {chartFilter.field} = {chartFilter.value}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Navigation />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[280px] flex-shrink-0 overflow-auto">
          <FilterBar />
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
