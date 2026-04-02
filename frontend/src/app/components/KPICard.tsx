import React, { ReactNode } from 'react';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  sparkline?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  sparkline,
  icon,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-teal-300 transition-all' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="text-xs font-medium text-gray-600">{title}</div>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
      
      <div className="flex items-end justify-between mb-2">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.direction === 'up' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      
      {subtitle && <div className="text-xs text-gray-500 mb-2">{subtitle}</div>}
      
      {sparkline && (
        <div className="h-12 mt-2">
          {sparkline}
        </div>
      )}
    </div>
  );
};