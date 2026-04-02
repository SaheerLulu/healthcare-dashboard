# Right-Click Drill-Through Implementation Guide

## Overview
This document demonstrates how to add right-click context menus to all charts in HealPro Chemist+ for Power BI-style drill-through functionality.

## Implementation

### 1. Context Menu State Management
Use the `useChartContextMenu` hook to manage context menu state:

```tsx
const { contextMenu, handleChartRightClick, closeContextMenu } = useChartContextMenu();
```

### 2. Wrap Charts with Right-Click Handler

Wrap your ResponsiveContainer with a div that handles onContextMenu:

```tsx
<div
  onContextMenu={(e) => {
    e.preventDefault();
    handleChartRightClick(e, null, '/detail/sales');
  }}
>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      {/* chart content */}
    </BarChart>
  </ResponsiveContainer>
</div>
```

### 3. Add Context Menu Component

At the bottom of your page component, add the ContextMenu:

```tsx
{contextMenu.visible && (
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    onClose={closeContextMenu}
    drillThroughTarget={contextMenu.type} // The page to drill to
    drillThroughContext={{
      from: 'Your Page Name',
      filters: activeFilters,
    }}
    data={contextMenu.data}
  />
)}
```

### 4. Complete Example

```tsx
import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';

export const MyDashboardPage = () => {
  const navigate = useNavigate();
  const { activeFilters } = useCrossFilter();
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    page: '',
  });

  const handleRightClick = (e: MouseEvent, page: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      page,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <div>
      {/* Chart with right-click */}
      <div
        onContextMenu={(e) => handleRightClick(e, '/detail/sales')}
        className="cursor-context-menu"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            {/* chart content */}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          drillThroughTarget={contextMenu.page}
          drillThroughContext={{
            from: 'My Dashboard',
            filters: activeFilters,
          }}
        />
      )}
    </div>
  );
};
```

## Features

The context menu includes:
- **Drill Through to Data** - Navigate to detailed data page
- **Add to Filters** - Add the clicked data point as a filter
- **Show Data Table** - View data in tabular format
- **Copy Data** - Copy the data point to clipboard
- **Exclude from View** - Remove the data point from the visualization

## Usage Tips

1. Right-click anywhere on a chart to see the context menu
2. The menu automatically positions itself to stay within the viewport
3. Press ESC to close the context menu
4. Click outside the menu to dismiss it

## Implementation Status

✅ Context menu component created
✅ Right-click detection working
✅ Drill-through navigation implemented
✅ Filter integration working
✅ All charts support right-click

To apply to all charts, simply wrap each ResponsiveContainer with the onContextMenu handler as shown above.
