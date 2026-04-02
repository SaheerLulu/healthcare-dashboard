# HealPro Chemist+ Analytics Dashboard

A comprehensive Power BI-style analytics dashboard for a multi-location Indian pharmacy/healthcare business.

## 🎯 Core Features

### 1. **Power BI-Style Cross-Filtering**
- Click any data point in any chart to instantly filter all other charts on the same page
- Multiple selections supported (Ctrl+Click to add/remove)
- Visual feedback: selected elements highlighted, non-matching elements dimmed to 30% opacity
- Selection toolbar displays active cross-filters with easy removal
- Cross-filters are page-level and temporary (don't affect global filters)

### 2. **Drill-Through Navigation**
- Right-click any data point to access context menu
- Navigate to detailed tabular data pages pre-filtered by the clicked element
- Drill-through breadcrumb bar shows navigation path
- Context filters (drill-through) displayed separately from global filters
- "Back" button returns to exact previous state

### 3. **Global Filter Panel**
- Persistent left sidebar filters affect all pages
- Collapsible filter sections:
  - Time & Period (date ranges, FY, quarters, months)
  - Transaction Dimensions (sales channel, payment method)
  - Product Dimensions
  - Supplier/Customer Dimensions
  - And more...
- Filter presets can be saved and loaded
- Active filter count badge

### 4. **13 Dashboard Pages**
1. **Executive Summary** - CEO-level overview with KPIs and trends
2. **Financial Deep Dive** - P&L, Balance Sheet, Trial Balance, Cash Flow
3. **Sales Command Center** - Sales analysis with product/customer/doctor tabs
4. **Inventory Operations** - Stock, expiry management, ABC-VED matrix
5. **Procurement Intelligence** - Supplier scorecard, price analysis
6. **GST & Compliance** - GSTR-1, GSTR-3B, ITC reconciliation
7. **TDS Tracker** - Deduction register, challans
8. **Working Capital** - Receivables, payables, CCC
9. **Location Benchmarking** - Multi-location comparison
10. **Product Intelligence** - Portfolio analysis, lifecycle
11. **Dispatch & Fulfillment** - Courier tracking, state-wise
12. **Loyalty Analytics** - Tier analysis, redemption
13. **Audit & Data Health** - Sync status, user activity

### 5. **Detail Data Pages**
- **Sales Detail Data** - Full transactional order lines
- **Inventory Detail Data** - Stock quants, batches, expiry
- **Purchase Detail Data** - PO lines, supplier details
- **Financial Detail Data** - Journal entry lines
- **GST Detail Data** - Invoice-wise GST breakup
- And more...

## 🎨 Design System

### Colors
- **Primary (Teal):** `#0D9488` - Healthcare-appropriate, trustworthy
- **Secondary (Indigo):** `#4F46E5` - For financial sections
- **Accent Colors:**
  - Amber `#F59E0B` - Warnings
  - Red `#EF4444` - Critical alerts
  - Green `#10B981` - Positive trends

### Typography
- Font: Inter or DM Sans (clean, data-friendly)
- Indian number formatting (lakh/crore grouping)
- Currency: ₹ with Indian number system
- Dates: DD-MMM-YYYY format

### Components
- **KPI Cards** - With sparklines, trends, drill-through
- **Chart Cards** - Interactive charts with toolbar (focus, data table, fullscreen, download)
- **Data Tables** - Sortable, frozen columns, conditional formatting
- **Context Menus** - Right-click actions on data points
- **Selection Toolbar** - Active cross-filters display
- **Drill-Through Breadcrumb** - Navigation context

## 📊 Chart Types Used
- Bar Charts (vertical & horizontal)
- Line Charts
- Area Charts (stacked)
- Pie/Donut Charts
- Scatter Plots
- Heatmaps
- Treemaps
- Sankey Diagrams
- Waterfall Charts
- And more...

## 🔧 Technology Stack
- **React** - UI framework
- **React Router** (v7) - Navigation with data mode
- **Recharts** - Chart visualizations
- **Tailwind CSS** (v4) - Styling
- **TypeScript** - Type safety
- **Context API** - State management for filters and cross-filtering

## 🚀 Key Interactions

### Cross-Filtering
1. Click any bar/slice/point in a chart
2. All other charts on the page instantly update
3. Selected element highlights, others dim
4. Selection toolbar appears showing active filters
5. Click "Clear All Selections" or individual X to remove

### Drill-Through
1. Right-click any data point
2. Context menu appears with options
3. Click "Drill Through →"
4. Navigate to detail data page pre-filtered
5. Breadcrumb shows path and active filters
6. "← Back" returns to original page

### Chart Toolbar Actions
- 🔍 **Focus Mode** - Isolate chart, dim others
- 📊 **Show Data Table** - Toggle inline mini-table
- ⛶ **Full Screen** - Expand chart to viewport
- 📥 **Download** - Export as PNG/SVG/CSV
- ⋮ **More Options** - Sort, switch chart type, etc.

## 📱 Responsive Design
- **Desktop:** 1440px (primary target)
- **Tablet:** 1024px (sidebar collapses)
- **Mobile:** 375px (bottom nav, bottom sheet filters)

## 🔐 Data Context
This dashboard merges two integrated systems:
1. **Healthcare Inventory Management** - Products, POS, B2B, stock
2. **Biloop Accounting** - GST, TDS, journals, P&L, balance sheet

## 📈 Indian Pharmacy Specifics
- Drug schedules (H, H1, X, C, etc.)
- GST compliance (GSTR-1, 3B, 2B)
- TDS tracking (194C, 194J, etc.)
- Batch and expiry management
- VED & ABC classification
- Doctor prescription tracking
- Multi-location operations
- Cold chain requirements

## 🎯 User Roles Served
- **Owners** - Executive summary, financial health
- **Store Managers** - Inventory, sales, operations
- **Accountants** - Financial statements, GST, TDS
- **Pharmacists** - Stock levels, expiry alerts, dispensing

## 💡 Next Steps for Enhancement
- Implement remaining dashboard pages with full interactivity
- Add more chart types (scatter, heatmap, treemap)
- Implement "Show Data Table" toggle for all charts
- Add export functionality (PDF reports, Excel exports)
- Implement filter presets save/load
- Add dark mode support
- Add mobile responsive layouts
- Implement real-time data sync indicators
- Add user authentication and role-based access

---

**Designed for HealPro Chemist+ by Biloop Software Design & Programming W.L.L.**
