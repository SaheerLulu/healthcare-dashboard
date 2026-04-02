import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Table2, Copy, X, Filter, ChevronRight } from 'lucide-react';
import { useCrossFilter } from '../contexts/CrossFilterContext';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  drillThroughTarget: string;
  drillThroughContext?: any;
  data?: any;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  drillThroughTarget,
  drillThroughContext,
  data,
}) => {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const { addCrossFilter } = useCrossFilter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (rect.right > viewportWidth) {
        adjustedX = x - rect.width;
      }

      if (rect.bottom > viewportHeight) {
        adjustedY = y - rect.height;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const handleDrillThrough = () => {
    navigate(drillThroughTarget, {
      state: {
        drillThrough: drillThroughContext,
      },
    });
    onClose();
  };

  const handleIncludeOnly = () => {
    if (data) {
      // Add as cross-filter
      const filterLabel = Object.entries(data)
        .filter(([key]) => key !== 'fill' && key !== 'payload')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      addCrossFilter({
        id: `filter-${Date.now()}`,
        label: filterLabel,
        value: data,
      });
    }
    onClose();
  };

  const handleCopyValue = () => {
    if (data) {
      const value = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(value);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999] min-w-[220px] animate-in fade-in duration-100"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Quick Actions
        </p>
      </div>

      <button
        onClick={handleDrillThrough}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-teal-50 hover:text-teal-700 transition-colors group"
      >
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        <span>Drill Through to Data</span>
        <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
      </button>

      <div className="border-t border-gray-200 my-1" />

      <button
        onClick={handleIncludeOnly}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Filter className="w-4 h-4" />
        <span>Add to Filters</span>
      </button>

      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <Table2 className="w-4 h-4" />
        <span>Show Data Table</span>
      </button>

      <div className="border-t border-gray-200 my-1" />

      <button
        onClick={handleCopyValue}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Copy className="w-4 h-4" />
        <span>Copy Data</span>
      </button>

      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
        <X className="w-4 h-4" />
        <span>Exclude from View</span>
      </button>
    </div>
  );
};