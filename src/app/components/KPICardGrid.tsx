import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from './ui/utils';

export interface KPICardConfig {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;       // e.g., 'text-blue-600'
  bgColor: string;     // e.g., 'bg-blue-100'
  trend?: {
    value: string;      // e.g., '+12.5%'
    isPositive: boolean;
  };
  subtitle?: string;
}

interface KPICardGridProps {
  cards: KPICardConfig[];
}

export function KPICardGrid({ cards }: KPICardGridProps) {
  return (
    <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}>
      {cards.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
              <CardTitle className="text-xs font-medium text-gray-600">{kpi.title}</CardTitle>
              <div className={cn(kpi.bgColor, 'p-1.5 rounded-lg')}>
                <Icon className={cn('size-3.5', kpi.color)} />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold">{kpi.value}</div>
              {(kpi.trend || kpi.subtitle) && (
                <div className="flex items-center gap-1 mt-0.5">
                  {kpi.trend && (
                    <span className={cn(
                      'text-xs font-medium',
                      kpi.trend.isPositive ? 'text-green-600' : 'text-red-600'
                    )}>
                      {kpi.trend.isPositive ? '\u2191' : '\u2193'} {kpi.trend.value}
                    </span>
                  )}
                  {kpi.subtitle && (
                    <span className="text-xs text-gray-500">{kpi.subtitle}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
