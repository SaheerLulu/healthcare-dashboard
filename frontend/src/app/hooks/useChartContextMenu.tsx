import { MouseEvent, useState } from 'react';

export interface ChartMenuState {
  visible: boolean;
  x: number;
  y: number;
  drillTarget: string;
  dimension?: string;
  payload?: any;
}

const DEFAULT_STATE: ChartMenuState = {
  visible: false,
  x: 0,
  y: 0,
  drillTarget: '',
};

/**
 * Tracks "right-click on a recharts element → context menu with that element's
 * data". Recharts doesn't expose a per-bar `onContextMenu`, so we use
 * chart-level `onMouseMove` to remember the payload under the cursor, then
 * read it on right-click.
 *
 * Usage:
 *   const cm = useChartContextMenu();
 *   <div onContextMenu={(e) => cm.openMenu(e, '/detail/inventory', 'category')}>
 *     <BarChart onMouseMove={cm.trackHover} onMouseLeave={cm.clearHover}>
 *       ...
 *     </BarChart>
 *   </div>
 *   {cm.menu.visible && <ContextMenu ... payload={cm.menu.payload} dimension={cm.menu.dimension} />}
 */
export const useChartContextMenu = () => {
  const [hoverPayload, setHoverPayload] = useState<any>(null);
  const [hoverDimension, setHoverDimension] = useState<string | undefined>(undefined);
  const [menu, setMenu] = useState<ChartMenuState>(DEFAULT_STATE);

  /** Curried tracker — call as: `onMouseMove={cm.trackHover('category')}`. */
  const trackHover = (dimension: string) => (data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      setHoverPayload(data.activePayload[0].payload);
      setHoverDimension(dimension);
    }
  };

  const clearHover = () => {
    setHoverPayload(null);
    setHoverDimension(undefined);
  };

  /** For Pie chart slices: set payload + dimension directly via onMouseEnter. */
  const setHoverFromPayload = (payload: any, dimension: string) => {
    setHoverPayload(payload);
    setHoverDimension(dimension);
  };

  const openMenu = (
    e: MouseEvent,
    drillTarget: string,
    dimensionOverride?: string,
    explicitPayload?: any,
  ) => {
    e.preventDefault();
    setMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      drillTarget,
      dimension: dimensionOverride ?? hoverDimension,
      payload: explicitPayload ?? hoverPayload,
    });
  };

  const closeMenu = () => setMenu((prev) => ({ ...prev, visible: false }));

  return {
    hoverPayload,
    hoverDimension,
    trackHover,
    clearHover,
    setHoverFromPayload,
    menu,
    openMenu,
    closeMenu,
  };
};
