# Quick Script: Add Right-Click Drill-Through to All Pages

## Pages That Need Updates:

### Already Done ✅:
1. Executive Summary
2. Sales Command Center  
3. Financial Deep Dive (partially - need to wrap remaining charts)

### Need To Do:
4. Inventory Operations
5. Procurement Intelligence
6. GST Compliance
7. OtherPages.tsx (contains multiple page components)

## Quick Update Pattern:

For each page component, apply these 3 steps:

### Step 1: Add imports
```typescript
import { useState, MouseEvent } from 'react';
import { ContextMenu } from '../components/ContextMenu';
```

### Step 2: Add state and handlers inside component
```typescript
const [contextMenu, setContextMenu] = useState<{
  visible: boolean;
  x: number;
  y: number;
  page: string;
}>({
  visible: false,
  x: 0,
  y: 0,
  page: '',
});

const handleChartRightClick = (e: MouseEvent, page: string) => {
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
```

### Step 3: Wrap EVERY chart AND add context menu at end
```typescript
// Wrap each ResponsiveContainer:
<ChartCard title="Chart Title">
  <div
    onContextMenu={(e) => handleChartRightClick(e, '/detail/targetpage')}
    className="cursor-context-menu"
  >
    <ResponsiveContainer width="100%" height={300}>
      {/* existing chart code */}
    </ResponsiveContainer>
  </div>
</ChartCard>

// At the END of the component return:
{contextMenu.visible && (
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    onClose={closeContextMenu}
    drillThroughTarget={contextMenu.page}
    drillThroughContext={{
      from: 'Page Name',
      filters: activeFilters,
    }}
  />
)}
```

## Target Pages to Update:

### InventoryOperations.tsx
- Charts: Stock Level Trends, ABC Analysis, Expiry Timeline, etc.
- Target drill-through: '/detail/inventory'

### ProcurementIntelligence.tsx  
- Charts: Purchase Order Trends, Supplier Performance, etc.
- Target drill-through: '/detail/procurement'

### GSTCompliance.tsx
- Charts: GST Returns, Input vs Output Tax, etc.
- Target drill-through: '/detail/gst'

### OtherPages.tsx Components:
- TDSTracker → '/detail/tds'
- WorkingCapitalTracker → '/detail/working-capital'
- LocationBenchmarking → '/detail/location'
- ProductIntelligence → '/detail/product'
- PrescriptionAnalytics → '/detail/prescription'
- ExpenseBreakdown → '/detail/expense'

## Auto-wrap Script Logic:

For each `<ResponsiveContainer>` instance:
1. Find the parent `<ChartCard>`
2. Wrap `<ResponsiveContainer>` with right-click div
3. Add `className="cursor-context-menu"`
4. Set appropriate drill-through target page

This ensures ALL charts in ALL 13 pages have right-click drill-through functionality!
