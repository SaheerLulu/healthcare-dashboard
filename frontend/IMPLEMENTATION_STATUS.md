# Complete Implementation Guide: Right-Click Drill-Through for All Pages

## ✅ What's Been Implemented

### 1. Page-Specific Filters
Each page now has its own contextual filters in the left sidebar:
- **Executive Summary**: Time Period, Store Performance
- **Sales Command Center**: Sales Channel, Sales Type, Customer Type
- **Financial Deep Dive**: Account Type, Payment Status, Financial Period
- **Inventory Management**: Stock Status, Expiry Status, Movement
- **Purchase & Procurement**: PO Status, Supplier Rating, Payment Terms
- **Customer Analytics**: Customer Segment, Purchase Frequency
- **Supplier Management**: Supplier Type, Relationship
- **GST Compliance**: GST Type, Return Status

### 2. Right-Click Drill-Through
Implemented on:
- ✅ Executive Summary (2 charts)
- ✅ Sales Command Center (2 charts)

## 🔧 How to Add Drill-Through to Remaining Pages

### Step 1: Add Required Imports

```typescript
import { useState, MouseEvent } from 'react';
import { ContextMenu } from '../components/ContextMenu';
```

### Step 2: Add Context Menu State

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
```

### Step 3: Add Handler Functions

```typescript
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

### Step 4: Wrap Each Chart

```typescript
<ChartCard title="Your Chart Title">
  <div
    onContextMenu={(e) => handleChartRightClick(e, '/detail/target-page')}
    className="cursor-context-menu"
  >
    <ResponsiveContainer width="100%" height={300}>
      {/* Your chart component */}
    </ResponsiveContainer>
  </div>
</ChartCard>
```

### Step 5: Add Context Menu Component

At the end of your page component's return statement:

```typescript
{/* Context Menu */}
{contextMenu.visible && (
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    onClose={closeContextMenu}
    drillThroughTarget={contextMenu.page}
    drillThroughContext={{
      from: 'Your Page Name',
      filters: activeFilters,
    }}
  />
)}
```

## 📋 Pages That Need Drill-Through Added

### High Priority:
1. ✅ Executive Summary - DONE
2. ✅ Sales Command Center - DONE
3. ⏳ Financial Deep Dive - Multiple charts need wrapping
4. ⏳ Inventory Management - Multiple charts need wrapping
5. ⏳ Purchase & Procurement - Charts need wrapping

### Medium Priority:
6. ⏳ Customer Analytics
7. ⏳ Supplier Management
8. ⏳ Product Performance
9. ⏳ Store Comparison

### Lower Priority:
10. ⏳ GST Compliance
11. ⏳ Reports & Analytics
12. ⏳ Prescription Management
13. ⏳ Expense Tracker

## 🎯 Complete Template for Any Page

```typescript
import { useState, MouseEvent } from 'react';
import { useNavigate } from 'router';
import { ContextMenu } from '../components/ContextMenu';
import { useCrossFilter } from '../contexts/CrossFilterContext';
// ... other imports

export const YourPage = () => {
  const navigate = useNavigate();
  const { activeFilters } = useCrossFilter();
  
  // Context menu state
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

  // Handlers
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

  const handleDrillThrough = (page: string, filter?: any) => {
    navigate(page, {
      state: {
        drillThrough: {
          from: 'Your Page Name',
          filters: filter ? [filter] : activeFilters,
        },
      },
    });
  };

  return (
    <div>
      {/* Your page content */}
      
      {/* Charts with right-click */}
      <ChartCard title="Chart Title">
        <div
          onContextMenu={(e) => handleChartRightClick(e, '/detail/target')}
          className="cursor-context-menu"
        >
          <ResponsiveContainer width="100%" height={300}>
            {/* Chart component */}
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          drillThroughTarget={contextMenu.page}
          drillThroughContext={{
            from: 'Your Page Name',
            filters: activeFilters,
          }}
        />
      )}
    </div>
  );
};
```

## 🎨 Context Menu Features

When users right-click on a chart, they see:
- **Drill Through to Data** → Navigate to detailed data page
- **Add to Filters** → Add clicked data point as cross-filter
- **Show Data Table** → Display data in tabular format
- **Copy Data** → Copy data to clipboard
- **Exclude from View** → Remove data point from visualization

## 🔄 Drill-Through Flow

1. User right-clicks on any chart
2. Context menu appears at mouse position
3. User clicks "Drill Through to Data"
4. Navigation to detail page with:
   - Breadcrumb showing origin page
   - Active filters preserved
   - Drill-through context displayed

## 🎯 Next Steps

1. Apply template to Financial Deep Dive page
2. Apply template to Inventory Management page
3. Apply template to remaining 10 pages
4. Test all drill-through paths
5. Ensure all context menus work correctly
