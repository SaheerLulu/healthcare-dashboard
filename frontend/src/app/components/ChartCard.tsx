import React, { ReactNode } from 'react';
import { Maximize2, Download, MoreVertical, Table2, Focus } from 'lucide-react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  onDrillThrough?: () => void;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  onDrillThrough,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Focus Mode"
          >
            <Focus className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Show Data Table"
          >
            <Table2 className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Full Screen"
          >
            <Maximize2 className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      
      <div className="chart-content">
        {children}
      </div>
    </div>
  );
};
