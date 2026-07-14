import { useState, MouseEvent, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ContextMenu } from '../components/ContextMenu';
import { useDrillSource } from '../contexts/DrillSourceContext';
import { DrillFilter, buildDrillSearch } from '../utils/drill';

/**
 * Page-level drill-through helper for visuals that are NOT inside a
 * ChartCard (KPI cards, list panels, table rows). ChartCard owns its own
 * context menu; this hook covers everything else with the same semantics:
 *
 *   const { drillTo, openContextMenu, contextMenuElement } = useDrillThrough();
 *   <KPICard onClick={() => drillTo('/detail/sales')} />
 *   <tr onContextMenu={(e) => openContextMenu(e, '/detail/sales', [f], row)} />
 *   ... {contextMenuElement}
 */
export function useDrillThrough() {
  const navigate = useNavigate();
  const from = useDrillSource();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    target: string;
    filters: DrillFilter[];
    datum?: any;
    filter?: DrillFilter | null;
  } | null>(null);

  const drillTo = useCallback((target: string, filters: DrillFilter[] = []) => {
    navigate(target + buildDrillSearch(filters, from), {
      state: { drillThrough: { from, filters } },
    });
  }, [navigate, from]);

  const openContextMenu = useCallback((
    e: MouseEvent,
    target: string,
    filters: DrillFilter[] = [],
    datum?: any,
  ) => {
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      target,
      filters,
      datum,
      filter: filters.length ? filters[filters.length - 1] : null,
    });
  }, []);

  const contextMenuElement: ReactNode = menu ? (
    <ContextMenu
      x={menu.x}
      y={menu.y}
      onClose={() => setMenu(null)}
      drillThroughTarget={menu.target}
      drillThroughContext={{ from, filters: menu.filters }}
      data={menu.datum}
      filter={menu.filter}
    />
  ) : null;

  return { drillTo, openContextMenu, contextMenuElement, from };
}
