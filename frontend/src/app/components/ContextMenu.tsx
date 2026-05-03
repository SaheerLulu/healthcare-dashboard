import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Table2, Copy, X, Filter, ChevronRight } from 'lucide-react';
import { useCrossFilter } from '../contexts/CrossFilterContext';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  /** Where to navigate on Drill Through. */
  drillThroughTarget: string;
  /** What page label to show on the destination's "Back to ..." button. */
  fromLabel?: string;
  /** Path to return to on the destination's back button (e.g. "/inventory?tab=movement"). */
  fromPath?: string;
  /** The dimension name being drilled (e.g. "category", "month"). */
  dimension?: string;
  /** The chart payload underneath the right-click (e.g. {category:"Gastro", value:123}). */
  payload?: any;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  drillThroughTarget,
  fromLabel,
  fromPath,
  dimension,
  payload,
}) => {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const { addCrossFilter, activeFilters } = useCrossFilter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const adjustedX = rect.right > window.innerWidth ? x - rect.width : x;
    const adjustedY = rect.bottom > window.innerHeight ? y - rect.height : y;
    menuRef.current.style.left = `${adjustedX}px`;
    menuRef.current.style.top = `${adjustedY}px`;
  }, [x, y]);

  const buildDrillFilter = () => {
    if (!dimension || !payload) return null;
    const value = payload[dimension] ?? payload.name ?? payload.category;
    if (value === undefined || value === null || value === '') return null;
    return {
      id: dimension,
      label: `${dimension}: ${value}`,
      value: String(value),
    };
  };

  const buildDrillContext = () => {
    const drillFilter = buildDrillFilter();
    const filters = drillFilter
      ? [...activeFilters, drillFilter]
      : [...activeFilters];
    return {
      from: fromLabel || 'previous page',
      fromPath,
      filters,
    };
  };

  const handleDrillThrough = () => {
    navigate(drillThroughTarget, {
      state: { drillThrough: buildDrillContext() },
    });
    onClose();
  };

  const handleAddFilter = () => {
    const drillFilter = buildDrillFilter();
    if (drillFilter) {
      addCrossFilter(drillFilter);
    } else if (payload) {
      const filterLabel = Object.entries(payload)
        .filter(([k]) => k !== 'fill' && k !== 'payload')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      addCrossFilter({
        id: `filter-${Date.now()}`,
        label: filterLabel,
        value: payload,
      });
    }
    onClose();
  };

  const handleShowDataTable = () => {
    navigate(drillThroughTarget, {
      state: { drillThrough: buildDrillContext() },
    });
    onClose();
  };

  const handleCopyValue = () => {
    if (payload) {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    }
    onClose();
  };

  const filterPreview = buildDrillFilter();

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999] min-w-[240px] animate-in fade-in duration-100"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Quick Actions
        </p>
        {filterPreview && (
          <p className="text-[11px] text-gray-700 mt-0.5 truncate">
            {filterPreview.label}
          </p>
        )}
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
        onClick={handleAddFilter}
        disabled={!payload}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
      >
        <Filter className="w-4 h-4" />
        <span>Add to Filters</span>
      </button>

      <button
        onClick={handleShowDataTable}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Table2 className="w-4 h-4" />
        <span>Show Data Table</span>
      </button>

      <div className="border-t border-gray-200 my-1" />

      <button
        onClick={handleCopyValue}
        disabled={!payload}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
      >
        <Copy className="w-4 h-4" />
        <span>Copy Data</span>
      </button>

      <button
        onClick={onClose}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <X className="w-4 h-4" />
        <span>Close</span>
      </button>
    </div>
  );
};
