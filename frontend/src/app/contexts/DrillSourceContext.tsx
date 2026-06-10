import React, { createContext, useContext, ReactNode } from 'react';

/**
 * Names the page a drill-through originates from, so shared components
 * (ChartCard, KPICard, ContextMenu) can stamp "Back to <page>" breadcrumbs
 * without every card repeating the page name.
 *
 * Usage: wrap a page's JSX in <DrillSource name="Sales Command Center">.
 */
const DrillSourceContext = createContext<string>('Dashboard');

export const DrillSource: React.FC<{ name: string; children: ReactNode }> = ({ name, children }) => (
  <DrillSourceContext.Provider value={name}>{children}</DrillSourceContext.Provider>
);

export const useDrillSource = () => useContext(DrillSourceContext);
