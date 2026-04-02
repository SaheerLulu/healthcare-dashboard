# Figma Design Prompt — HealPro Chemist+ Unified Analytics Dashboard

## Product Context

Design a **multi-page analytics dashboard** for a multi-location Indian pharmacy/healthcare business called **HealPro Chemist+**. This dashboard merges data from two tightly integrated systems:

1. **Healthcare Inventory Management** — products, purchases, POS sales, B2B sales, stock, returns, dispatch, indent requests
2. **Biloop Accounting** — double-entry journals, GST returns (GSTR-1, GSTR-3B, GSTR-2B), TDS, receivables/payables, trial balance, P&L, balance sheet

The dashboard must serve **owners, store managers, accountants, and pharmacists** across multiple store locations in India.

---

## ⚡ CORE INTERACTION MODEL — Power BI-Style Behavior

This dashboard must replicate the **two signature interaction patterns from Power BI** across every single page. These are not optional — they are the foundation of the entire UX.

---

### INTERACTION 1: Cross-Filtering & Cross-Highlighting (Every Page)

**Every chart and visualization on a page is interconnected.** Clicking any data point in any chart immediately filters or highlights all other visualizations on the same page. This is identical to Power BI's default cross-filter behavior.

#### How It Works

1. **User clicks a bar, slice, dot, row, or segment** in any chart on the page
2. **Every other chart on the same page instantly updates** to show only data related to that selection
3. **A selection indicator** appears on the clicked chart showing what is selected (highlighted bar, glowing slice, bold row)
4. **A floating "Clear Selection" button** appears near the clicked chart (or in a selection toolbar at the top of the content area) to deselect
5. **Multiple selections** are supported — Ctrl+Click to add/remove items from the selection. The cross-filter compounds
6. **The left sidebar global filters remain unaffected** — cross-filtering is a temporary page-level overlay on top of the global filters, not a permanent filter change

#### Visual Behavior

| Clicked Element | Other Charts Behavior |
|-----------------|----------------------|
| A bar in a bar chart | Other charts filter to show only data for that bar's dimension value. Non-matching bars in other bar charts dim to 30% opacity (cross-highlight) |
| A slice in a donut/pie chart | Other charts filter. The un-selected slices dim to 30% opacity |
| A row in a table | Other charts filter. The selected row gets a highlighted background (primary color at 10% opacity) |
| A point in a scatter plot | Other charts filter. Non-matching points dim |
| A cell in a heatmap | Other charts filter to that cell's row+column intersection |
| A segment in a stacked chart | Other charts filter. Non-matching segments dim |
| A node in a treemap | Other charts filter to that node's category |
| A cell in ABC-VED matrix | Other charts filter to products in that cell |

#### Selection State UI

- **Selected element:** Bold outline (2px primary color), slight scale-up (102%), tooltip pinned showing value
- **Non-matching elements in other charts:** 30% opacity (cross-highlight, not hidden — user still sees the full context but the relevant portion stands out)
- **Selection toolbar:** A thin bar appears below the page title showing: `"Filtered by: [Category: Tablets] [Supplier: ABC Pharma]"` with individual ✕ to remove each cross-filter and a "Clear All Selections" button at the right end
- **If no data exists** after cross-filter, show "No matching data" in the affected chart area (not an empty chart)

#### Cross-Filter Direction Rules

| Source | Filters | Does NOT filter |
|--------|---------|-----------------|
| Any chart | All other charts on the same page | KPI cards at the top (KPIs always reflect global filters only, never cross-filtered — this prevents confusing flickering of headline numbers) |
| Any table row | All charts on the same page | Other table rows (tables don't cross-filter each other — only charts) |
| KPI card click | Nothing on current page | — (KPI clicks trigger drill-through, not cross-filter — see Interaction 2) |

#### Examples on Executive Summary Page

- User clicks the "Tablets" bar in "Revenue by Category" bar chart → The "Top 5 Products" list filters to only show tablets, the "Sales Channel Mix" chart shows only tablet revenue split between POS and B2B, the "Inventory Alerts" panel shows only tablet-related alerts
- User Ctrl+Clicks "Capsules" bar additionally → Now both Tablets and Capsules are highlighted and all other charts show combined data for these two categories
- User clicks "Clear All Selections" → Everything resets to the global filter state

---

### INTERACTION 2: Drill-Through to Detail Tables (Every Page)

**Every dashboard page has a companion "Detail Data" tabular page behind it.** When a user right-clicks (or selects + clicks a drill-through button) on any data point in any chart, they can navigate to a full tabular view showing the raw transactional records that make up that data point — pre-filtered by both the clicked element AND all active global sidebar filters.

#### How Drill-Through Works — Step by Step

1. **User clicks on a data point** in any chart (e.g., clicks "Dolo 650" in the "Top Selling Products" chart)
2. **A context menu or floating action bar appears** with:
   - **"Drill Through →"** button (primary action, prominent)
   - **"Show Data Table"** button (shows inline mini-table below the chart — like Power BI's "Show as table" toggle)
   - **"Copy Value"** (copies the data point value)
   - **"Exclude"** (temporarily removes that item from the chart)
3. **User clicks "Drill Through →"**
4. **The dashboard navigates to the Detail Data page** for that section (e.g., "Sales Detail Data")
5. **The Detail Data page loads with pre-applied filters:**
   - All global sidebar filters (date range, location, etc.) are carried over
   - The drill-through context filter is added (e.g., Product = "Dolo 650")
   - A **drill-through breadcrumb** appears at the top: `"Sales Command Center > Top Selling Products > Dolo 650"` with a **"← Back to Dashboard"** button
6. **The Detail Data page shows the full raw data table** with every individual transaction row

#### Drill-Through Source → Target Mapping

Every chart on every page must have a defined drill-through target. Here is the complete mapping:

| Dashboard Page | Chart / Widget Clicked | Drill-Through Target Page | Pre-Applied Filter | Table Shows |
|----------------|----------------------|--------------------------|--------------------|----|
| **Executive Summary** | Revenue KPI card | Sales Detail Data | Date range only | All POS + B2B order lines |
| | Gross Profit KPI card | Financial Detail Data | Date range only | All journal entry lines (Revenue + Expense accounts) |
| | Cash Position KPI card | Working Capital Detail Data | Date range only | All receivable + payable journal lines |
| | GST Liability KPI card | GST Detail Data | Date range only | All GSTR-1 entries + GSTR-3B summary |
| | Revenue & Profit Trend (click a month bar) | Sales Detail Data | Month = clicked month | All order lines for that month |
| | Sales Channel Mix (click POS or B2B segment) | Sales Detail Data | Channel = POS or B2B | Order lines for that channel |
| | Top 5 Products (click a product row) | Sales Detail Data | Product = clicked product | All order lines for that product |
| | Inventory Alerts — Low Stock count | Inventory Detail Data | Stock Status = Low Stock | Products below min stock |
| | Inventory Alerts — Expiring count | Inventory Detail Data | Expiry Status = Expiring ≤30 days | Batches expiring within 30 days |
| | Pending Actions — POs pending | Purchase Detail Data | PO State = Pending Approval | POs awaiting approval |
| | Today's Sales Activity card | Sales Detail Data | Date = Today | Today's order lines |
| **Financial Deep Dive** | Any P&L row (click account) | Financial Detail Data | Account = clicked account | Journal lines for that account |
| | Balance Sheet row (click account) | Financial Detail Data | Account = clicked account | Journal lines |
| | Trial Balance row | Financial Detail Data | Account = clicked account | Journal lines |
| | Ledger entry row | Financial Detail Data | Entry No = clicked entry | All lines of that journal entry |
| **Sales Command Center** | Sales Trend (click a date point) | Sales Detail Data | Date = clicked date | Order lines for that date |
| | Revenue by Payment Method (click a slice) | Sales Detail Data | Payment Method = clicked method | Order lines with that payment |
| | Top 10 Products (click a product) | Sales Detail Data | Product = clicked product | All sales lines for that product |
| | Top 10 Customers (click a customer) | Sales Detail Data | Customer = clicked customer | All order lines for that customer |
| | Hourly Heatmap (click a cell) | Sales Detail Data | Day + Hour = clicked cell | Orders in that hour window |
| | RFM Grid (click a cell) | Customer Detail Data | RFM Segment = clicked cell | Customers in that segment |
| | Doctor table (click a doctor) | Sales Detail Data | Doctor = clicked doctor | All prescriptions by that doctor |
| | Returns table (click a return) | Returns Detail Data | Return No = clicked return | Return line items |
| **Inventory Operations** | Stock by Category treemap (click a tile) | Inventory Detail Data | Category = clicked category | Stock quants for that category |
| | Low Stock Alert table (click a product) | Inventory Detail Data | Product = clicked product | All batches of that product across locations |
| | Expiry Calendar (click a date dot) | Inventory Detail Data | Expiry Month = clicked month | Batches expiring that month |
| | Expiry Risk table (click a row) | Inventory Detail Data | Product + Batch = clicked row | That specific batch detail + movement history |
| | Movement Analysis (click a movement type) | Movement Detail Data | Movement Type = clicked type | All stock movements of that type |
| | ABC-VED Matrix (click a cell) | Inventory Detail Data | ABC Class + VED Class = clicked cell | Products in that cell |
| | Batch Fragmentation chart (click a product) | Inventory Detail Data | Product = clicked product | All active batches |
| | FIFO indicator (click a red product) | Movement Detail Data | Product = clicked product | Sale movements showing FIFO violation |
| **Procurement** | Purchase Trend (click a month) | Purchase Detail Data | Month = clicked month | PO lines for that month |
| | Top 10 Suppliers (click a supplier) | Purchase Detail Data | Supplier = clicked supplier | All PO lines from that supplier |
| | Supplier Scorecard (click a supplier row) | Purchase Detail Data | Supplier = clicked supplier | All POs from that supplier |
| | Price History chart (click a dot) | Purchase Detail Data | Product + Supplier + PO = clicked dot | That specific PO line detail |
| | Price Variance table (click a product) | Purchase Detail Data | Product = clicked product | All purchase lines for that product across suppliers |
| | Lead Time box plot (click a supplier) | Purchase Detail Data | Supplier = clicked supplier | All POs with lead time data |
| | Purchase Returns table (click a return) | Purchase Return Detail Data | Return No = clicked return | Return line items |
| **GST & Compliance** | GSTR-1 table (click an invoice row) | GST Detail Data | Invoice No = clicked invoice | Full invoice detail with line-level HSN breakup |
| | GSTR-3B summary (click a month) | GST Detail Data | Period = clicked month | All GSTR-1 entries + purchase ITC for that month |
| | GSTR-2B reconciliation table (click a supplier) | GST Detail Data | Supplier GSTIN = clicked supplier | Books vs GSTR-2B comparison per invoice |
| | ITC Utilization gauge (click) | GST Detail Data | ITC filter = all eligible | All purchase invoices with ITC details |
| | HSN Treemap (click an HSN tile) | GST Detail Data | HSN Code = clicked code | All invoices with that HSN |
| | RCM table (click an entry) | GST Detail Data | RCM entry ID | RCM entry + linked journal entry |
| **TDS Tracker** | Section-wise bar (click a section) | TDS Detail Data | Section = clicked section | All deductions under that section |
| | Deduction register row (click) | TDS Detail Data | Deduction ID | Full deduction detail + challan link |
| | Challan register row (click) | TDS Detail Data | Challan No = clicked challan | All deductions covered by that challan |
| **Working Capital** | Aging bucket bar (click a bucket) | Receivables/Payables Detail Data | Age Bucket = clicked bucket | All outstanding entries in that bucket |
| | Customer Outstanding row (click) | Receivables/Payables Detail Data | Customer = clicked customer | All open journal lines for that customer |
| | Supplier Outstanding row (click) | Receivables/Payables Detail Data | Supplier = clicked supplier | All open journal lines for that supplier |
| | CCC diagram (click a component) | Receivables/Payables Detail Data | Component = DIO/DSO/DPO | Underlying transactions driving that metric |
| **Location Benchmarking** | Any metric cell (click) | Varies by metric row | Location = clicked column's location | Relevant detail data filtered to that location |
| | Demand Mismatch row (click) | Inventory Detail Data | Product = clicked product | Stock quants across all locations |
| | Radar chart (click a location axis) | Sales Detail Data | Location = clicked location | All sales for that location |
| **Product Intelligence** | Scatter plot bubble (click) | Sales Detail Data | Product = clicked product | All sales lines for that product |
| | Category Performance row (click) | Sales Detail Data | Category = clicked category | All sales in that category |
| | Lifecycle timeline (click a product) | Product 360° Detail Data | Product = clicked product | Full product history: purchases + sales + stock + returns |
| | Substitution table (click a molecule group) | Product 360° Detail Data | Molecule = clicked molecule | All products with that molecule |
| | Antibiotic trend (click a month) | Sales Detail Data | Is Antibiotic = True, Month = clicked | Antibiotic sales that month |
| **Dispatch** | Pipeline funnel (click a stage) | Dispatch Detail Data | Status = clicked stage | All dispatch entries in that stage |
| | Courier Performance row (click) | Dispatch Detail Data | Courier = clicked courier | All shipments by that courier |
| | State heatmap (click a state) | Dispatch Detail Data | State = clicked state | All deliveries to that state |
| **Loyalty** | Tier distribution bar (click a tier) | Customer Detail Data | Loyalty Tier = clicked tier | All customers in that tier |
| | Tier progression Sankey (click a flow) | Customer Detail Data | Previous Tier + Current Tier | Customers who moved between those tiers |
| **Audit & Data Health** | Sync Error table (click a row) | Sync Error Detail Data | Error ID | Full error traceback + source record |
| | User Activity heatmap (click a cell) | Audit Detail Data | User + Date = clicked cell | All audit log entries for that user on that day |
| | Data Quality row (click a field gap) | Data Quality Detail Data | Entity Type + Missing Field | All records missing that field |
| | Audit Trail row (click) | Audit Detail Data | Log ID | Full audit entry with before/after JSON |

---

#### Drill-Through Context Bar (UI Component)

When a user lands on any Detail Data page via drill-through, a **context bar** appears at the top of the page:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back to Sales Command Center                                         │
│                                                                          │
│  DRILL-THROUGH CONTEXT:                                                  │
│  ┌──────────────────┐  ┌─────────────────────┐  ┌───────────────────┐   │
│  │ 📅 This Month    ✕│  │ 🏪 Location: Store 1 ✕│  │ 💊 Product: Dolo ✕│   │
│  └──────────────────┘  └─────────────────────┘  └───────────────────┘   │
│                                                                          │
│  Global Filters: FY 2025-26 | Mar 2026 | All Locations                   │
│  Drill-Through Filter: Product = "Dolo 650"                              │
│                                                                          │
│  [Remove Drill-Through Filter]  [Modify Filters]  [Export Table ▼]       │
└──────────────────────────────────────────────────────────────────────────┘
```

- **"← Back" button:** Returns to the exact page and scroll position they came from, with cross-filter state preserved
- **Drill-through filter chips:** Show both global filters (gray chips) and drill-through context filters (primary color chips) distinctly
- **"Remove Drill-Through Filter":** Removes only the drill-through filter, showing all data for the current global filters
- **"Modify Filters":** Opens the left sidebar filter panel with current filters pre-selected
- **"Export Table":** Download current filtered table as CSV / Excel / PDF

---

### DETAIL DATA PAGES — Complete Definitions

Each dashboard section has one or more companion Detail Data pages. These pages are **not in the main navigation** — they are only reachable via drill-through. However, they can also be accessed from a "Data Tables" submenu in the navigation if the user wants to browse raw data directly.

---

#### DETAIL PAGE: Sales Detail Data

**Reachable from:** Executive Summary, Sales Command Center, Location Benchmarking, Product Intelligence

**Table Columns:**

| Column | Source | Purpose |
|--------|--------|---------|
| Order Date | POSOrder.sale_date / B2BSalesOrder.sale_date | When the sale happened |
| Invoice No | POSOrder.invoice_no / B2BSalesOrder.invoice_no | Unique invoice identifier |
| Channel | "POS" or "B2B" | Sales channel |
| Customer Name | Customer.customer_name | Who bought |
| Customer Type | Customer.customer_type | Retail / B2B / Hospital / Clinic |
| Customer GSTIN | Customer.gst_no | For GST reporting context |
| Doctor Name | Doctor.name (POS only) | Prescribing doctor |
| Doctor Specialization | Doctor.specialization | Doctor specialty |
| Location | Location.name | Store where sale happened |
| Product Name | Product.name | What was sold |
| Product Code | Product.default_code | SKU code |
| Category | Product.pharma_category | Product category |
| Subcategory | Product.pharma_subcategory | Product subcategory |
| Therapeutic Category | Product.pharma_therapeutic_category | Therapy area |
| Molecule | Product.pharma_molecule | Salt/molecule |
| Company | CompanyMaster.name | Manufacturer |
| HSN Code | Product.pharma_hsn_code | HSN for GST |
| Batch No | POSOrderLine.batch_no | Batch sold |
| Expiry Month | POSOrderLine.expiry_month | Batch expiry |
| Quantity | POSOrderLine.quantity | Units sold |
| Unit Price | POSOrderLine.unit_price | Selling price per unit |
| Discount % | POSOrderLine.discount_percent | Discount given |
| Discount Amount | POSOrderLine.discount_amount | Discount in rupees |
| Tax % | POSOrderLine.tax_percent | GST rate |
| CGST | Computed | CGST component |
| SGST | Computed | SGST component |
| IGST | B2BSalesOrderLine.igst_amount | IGST for inter-state |
| Line Total | POSOrderLine.line_total | Line total after tax |
| Payment Method | POSOrder.payment_type / POSPayment.payment_method | How they paid |
| Order Status | POSOrder.status / B2BSalesOrder.status | Current order status |
| Supply Type | B2BSalesOrder.supply_type | Intra / Inter state |
| Loyalty Points Redeemed | POSOrder.loyalty_points_redeemed | Points used |
| Loyalty Redemption Amount | POSOrder.loyalty_redemption_amount | Rupee value of points |
| Round Off | POSOrder.round_off | Round off amount |
| Remarks | POSOrder.remarks | Any notes |

**Table Features:**
- Frozen first 3 columns (Date, Invoice, Channel) during horizontal scroll
- Conditional formatting: red text if discount > pharma_max_discount, amber if margin < 10%
- Summary row at bottom: Total Quantity, Total Revenue, Total Tax, Avg Discount %
- Group-by toggle: group rows by Date / Customer / Product / Category / Location / Doctor

---

#### DETAIL PAGE: Inventory Detail Data

**Reachable from:** Executive Summary, Inventory Operations, Location Benchmarking, Product Intelligence

**Table Columns:**

| Column | Source | Purpose |
|--------|--------|---------|
| Product Name | Product.name | Product |
| Product Code | Product.default_code | SKU |
| Barcode | Product.barcode | Barcode |
| Category | Product.pharma_category | Category |
| Subcategory | Product.pharma_subcategory | Subcategory |
| Therapeutic Category | Product.pharma_therapeutic_category | Therapy area |
| Molecule | Product.pharma_molecule | Salt |
| Company | CompanyMaster.name | Manufacturer |
| Location | Location.name | Which store |
| Batch No | StockQuant.lot_name | Batch identifier |
| Expiry Month | StockQuant.expiry_month | When it expires |
| Days to Expiry | Computed | Calendar days until expiry |
| MRP | StockQuant.mrp | Maximum retail price |
| Purchase Rate | StockQuant.purchase_rate | Cost price |
| Margin % | Computed: (MRP - Purchase Rate) / MRP × 100 | Gross margin on this batch |
| Current Qty | StockQuant.quantity | Stock in hand |
| Reserved Qty | StockQuant.reserved_quantity | Reserved for pending orders |
| Available Qty | Computed: quantity - reserved | Actually available |
| Loose Qty | StockQuant.loose_quantity | Loose tablets |
| Stock Value | Computed: quantity × purchase_rate | Inventory value at cost |
| MRP Value | Computed: quantity × MRP | Inventory value at MRP |
| Min Stock | Product.pharma_min_stock / ProductLocationMinStock.min_stock | Reorder level |
| Stock Status | Computed | In Stock / Low Stock / Out of Stock / Overstocked |
| Expiry Status | Computed | OK / Expiring Soon / Expired |
| Rack Number | Product.pharma_rack_number | Physical location |
| VED Class | Product.pharma_ved_classification | V / E / D |
| ABC Class | Computed from revenue | A / B / C |
| Is Critical | Product.pharma_is_critical | Yes / No |
| Is Cold Chain | Product.pharma_requires_cold_chain | Yes / No |
| Is Controlled | Product.pharma_is_controlled | Yes / No |
| Drug Schedule | Product.pharma_drug_schedule | Schedule type |
| Last Purchase Date | From last PurchaseOrderLine | When last purchased |
| Last Sale Date | From last POSOrderLine / B2BSalesOrderLine | When last sold |
| Avg Daily Sales | Computed over last 30 days | Sales velocity |
| Days of Stock | Computed: Current Qty / Avg Daily Sales | Runway |

**Table Features:**
- Conditional formatting: red background for expired batches, amber for expiring ≤30 days, red text for stock below min
- Summary row: Total SKUs, Total Stock Value, Total MRP Value, Items Below Min Stock, Expired Batch Count
- Group-by toggle: Product / Category / Location / Expiry Status / Stock Status / Rack / VED / ABC

---

#### DETAIL PAGE: Movement Detail Data

**Reachable from:** Inventory Operations (Movement Analysis tab)

**Table Columns:**

| Column | Source |
|--------|--------|
| Timestamp | StockMovement.created_at |
| Product Name | Product.name |
| Product Code | Product.default_code |
| Category | Product.pharma_category |
| Location | Location.name |
| Movement Type | StockMovement.movement_type |
| Quantity | StockMovement.quantity |
| Qty Before | StockMovement.quantity_before |
| Qty After | StockMovement.quantity_after |
| Batch No | StockMovement.lot_name |
| Expiry Month | StockMovement.expiry_month |
| MRP | StockMovement.mrp |
| Reference Type | StockMovement.reference_type |
| Reference ID | StockMovement.reference_id |
| Notes | StockMovement.notes |
| User | StockMovement.created_by |

**Table Features:**
- Color-coded movement type column (green for stock-in types, red for stock-out types)
- Group-by: Product / Location / Movement Type / Date / User
- Summary: Net movement (total in - total out) for filtered data

---

#### DETAIL PAGE: Purchase Detail Data

**Reachable from:** Executive Summary, Procurement Intelligence

**Table Columns:**

| Column | Source |
|--------|--------|
| PO Date | PurchaseOrder.bill_date |
| Bill No | PurchaseOrder.bill_no |
| PO No | PurchaseOrder.po_no |
| Supplier Name | Supplier.company_name |
| Supplier GSTIN | Supplier.gst_no |
| Supplier State | Supplier.state |
| Supplier Category | Supplier.category |
| Location | Location.name |
| PO State | PurchaseOrder.state |
| Supply Type | PurchaseOrder.supply_type |
| Payment Type | PurchaseOrder.payment_type |
| Product Name | Product.name |
| Product Code | Product.default_code |
| Category | Product.pharma_category |
| Molecule | Product.pharma_molecule |
| Company | CompanyMaster.name |
| HSN Code | Product.pharma_hsn_code |
| Batch No | PurchaseOrderLine.batch_no |
| Expiry Month | PurchaseOrderLine.expiry_month |
| Quantity | PurchaseOrderLine.quantity |
| Free Qty | PurchaseOrderLine.free_qty |
| Purchase Rate | PurchaseOrderLine.purchase_rate |
| MRP | PurchaseOrderLine.mrp |
| Scheme Discount % | PurchaseOrderLine.sch_disc_percent |
| Trade Discount % | PurchaseOrderLine.discount_percent |
| Effective Discount % | Computed: 1 - (1-sch/100)×(1-trade/100) |
| Tax % | PurchaseOrderLine.tax_percent |
| CGST | PurchaseOrderLine.cgst_amount |
| SGST | PurchaseOrderLine.sgst_amount |
| IGST | PurchaseOrderLine.igst_amount |
| Taxable Value | Computed |
| Line Total | Computed |
| Transport Cost | PurchaseOrder.transport_cost (header level) |
| Other Charges | PurchaseOrder.other_charges (header level) |
| Approved By | PurchaseOrder.approved_by |
| Approved At | PurchaseOrder.approved_at |
| Lead Time Days | SupplierLeadTime.lead_time_days |
| Remarks | PurchaseOrder.remarks |

**Table Features:**
- Group-by: Supplier / Product / Category / Location / Month / PO State
- Summary: Total Purchase Value, Total Tax, Avg Discount %, Total Free Qty Value, Avg Lead Time

---

#### DETAIL PAGE: Purchase Return Detail Data

**Reachable from:** Procurement Intelligence (Purchase Returns tab)

**Table Columns:**

| Column | Source |
|--------|--------|
| Return Date | PurchaseReturn.return_date |
| Return No | PurchaseReturn.return_no |
| Supplier Name | Supplier.company_name |
| Supplier GSTIN | Supplier.gst_no |
| Original PO Bill No | PurchaseOrder.bill_no |
| Location | Location.name |
| Supply Type | PurchaseReturn.supply_type |
| Status | PurchaseReturn.status |
| Product Name | Product.name |
| Category | Product.pharma_category |
| Batch No | PurchaseReturnLine.batch_no |
| Expiry Month | PurchaseReturnLine.expiry_month |
| Quantity | PurchaseReturnLine.quantity |
| Purchase Rate | PurchaseReturnLine.purchase_rate |
| MRP | PurchaseReturnLine.mrp |
| Tax % | PurchaseReturnLine.tax_percent |
| CGST | PurchaseReturnLine.cgst_amount |
| SGST | PurchaseReturnLine.sgst_amount |
| IGST | PurchaseReturnLine.igst_amount |
| Line Total | PurchaseReturnLine.line_total |
| Reason | PurchaseReturn.reason |
| Remarks | PurchaseReturn.remarks |

---

#### DETAIL PAGE: Returns Detail Data

**Reachable from:** Sales Command Center (Returns tab)

**Table Columns:**

| Column | Source |
|--------|--------|
| Return Date | SalesReturn.return_date |
| Return No | SalesReturn.return_no |
| Return Type | SalesReturn.return_type (POS / B2B) |
| Customer Name | Customer.customer_name |
| Customer Type | Customer.customer_type |
| Original Invoice No | POSOrder.invoice_no / B2BSalesOrder.invoice_no |
| Original Sale Date | From original order |
| Days Between Sale & Return | Computed |
| Location | Location.name |
| Status | SalesReturn.status |
| Product Name | Product.name |
| Category | Product.pharma_category |
| Molecule | Product.pharma_molecule |
| Batch No | SalesReturnLine.batch_no |
| Expiry Month | SalesReturnLine.expiry_month |
| Quantity | SalesReturnLine.quantity |
| Unit Price | SalesReturnLine.unit_price |
| Discount % | SalesReturnLine.discount_percent |
| Tax % | SalesReturnLine.tax_percent |
| Line Total | SalesReturnLine.line_total |
| Reason | SalesReturn.reason |
| Remarks | SalesReturn.remarks |

---

#### DETAIL PAGE: Financial Detail Data

**Reachable from:** Financial Deep Dive (all tabs)

**Table Columns:**

| Column | Source |
|--------|--------|
| Entry Date | JournalEntry.date |
| Entry No | JournalEntry.entry_no |
| Voucher Type | JournalEntry.voucher_type |
| Reference Type | JournalEntry.reference_type |
| Reference ID | JournalEntry.reference_id |
| Location | Location.name |
| Status | JournalEntry.is_posted (Posted / Draft) |
| Narration | JournalEntry.narration |
| Account Code | ChartOfAccount.account_code |
| Account Name | ChartOfAccount.account_name |
| Account Type | ChartOfAccount.account_type |
| Account Subtype | ChartOfAccount.account_subtype |
| Debit | JournalEntryLine.debit |
| Credit | JournalEntryLine.credit |
| Party Type | JournalEntryLine.party_type |
| Party Name | Customer.customer_name / Supplier.company_name |
| Line Narration | JournalEntryLine.narration |
| Created By | JournalEntry.created_by |

**Table Features:**
- Summary: Total Debits, Total Credits, Net Balance (must be zero if balanced)
- Group-by: Account / Voucher Type / Party / Location / Date
- Conditional formatting: red if Debits ≠ Credits for any entry

---

#### DETAIL PAGE: GST Detail Data

**Reachable from:** GST & Compliance Center (all tabs)

**Table Columns (GSTR-1 focus):**

| Column | Source |
|--------|--------|
| Period | GSTR1Entry.period |
| Invoice No | GSTR1Entry.invoice_no |
| Invoice Date | GSTR1Entry.invoice_date |
| Invoice Type | GSTR1Entry.invoice_type |
| Customer GSTIN | GSTR1Entry.customer_gstin |
| Place of Supply | GSTR1Entry.place_of_supply |
| Source Type | GSTR1Entry.source_type |
| HSN Code | GSTR1Entry.hsn_code |
| GST Rate | GSTR1Entry.rate |
| Taxable Value | GSTR1Entry.taxable_value |
| CGST | GSTR1Entry.cgst |
| SGST | GSTR1Entry.sgst |
| IGST | GSTR1Entry.igst |
| Cess | GSTR1Entry.cess |
| Total Tax | Computed |
| IRN | GSTR1Entry.irn |
| E-Invoice Status | GSTR1Entry.e_invoice_status |
| Original Invoice No | GSTR1Entry.original_invoice_no (for credit notes) |
| Location | Location.name |

**Additional sub-table for ITC Reconciliation:**

| Column | Source |
|--------|--------|
| Supplier GSTIN | ITCReconciliation.supplier_gstin |
| Supplier Name | Supplier.company_name |
| Books Taxable | ITCReconciliation.books_taxable |
| Books CGST/SGST/IGST | ITCReconciliation fields |
| GSTR-2B Taxable | ITCReconciliation.gstr2b_taxable |
| GSTR-2B CGST/SGST/IGST | ITCReconciliation fields |
| Difference | Computed |
| Match Status | ITCReconciliation.status |
| Action Taken | ITCReconciliation.action_taken |

---

#### DETAIL PAGE: TDS Detail Data

**Reachable from:** TDS Tracker

**Table Columns:**

| Column | Source |
|--------|--------|
| Transaction Date | TDSDeduction.transaction_date |
| Deductee Name | TDSDeduction.deductee_name |
| Deductee PAN | TDSDeduction.deductee_pan |
| Deductee Type | TDSDeduction.deductee_type |
| Section | TDSDeduction.section |
| Nature of Payment | TDSDeduction.nature_of_payment |
| Gross Amount | TDSDeduction.gross_amount |
| TDS Rate | TDSDeduction.tds_rate |
| TDS Amount | TDSDeduction.tds_amount |
| Status | TDSDeduction.status |
| Challan No | TDSDeduction.challan_no |
| Challan Date | TDSDeduction.challan_date |
| BSR Code | TDSDeduction.bsr_code |
| Source Type | TDSDeduction.source_type |
| Source PO | PurchaseOrder.bill_no |
| Location | Location.name |

---

#### DETAIL PAGE: Receivables/Payables Detail Data

**Reachable from:** Working Capital (all tabs)

**Table Columns:**

| Column | Source |
|--------|--------|
| Entry Date | JournalEntry.date |
| Entry No | JournalEntry.entry_no |
| Voucher Type | JournalEntry.voucher_type |
| Party Type | JournalEntryLine.party_type (Customer / Supplier) |
| Party Name | Customer / Supplier name |
| Party GSTIN | Customer.gst_no / Supplier.gst_no |
| Party City | Customer.city / Supplier.city |
| Party State | Customer.state / Supplier.state |
| Account Name | ChartOfAccount.account_name |
| Debit | JournalEntryLine.debit |
| Credit | JournalEntryLine.credit |
| Outstanding Amount | Computed: Debit - Credit (for receivables) |
| Age (Days) | Computed from entry date to today |
| Age Bucket | Computed: 0-30 / 31-60 / 61-90 / 91-120 / 120+ |
| Credit Limit | Customer.credit_limit |
| Credit Utilization % | Computed |
| Payment Terms | Customer.payment_terms / Supplier.payment_terms |
| Credit Days | Customer.credit_days / Supplier.credit_days |
| Due Date | Computed: Entry Date + Credit Days |
| Overdue Days | Computed: Today - Due Date (if positive) |
| Location | Location.name |
| Reference Invoice | From narration or reference_id |
| Narration | JournalEntry.narration |

---

#### DETAIL PAGE: Customer Detail Data

**Reachable from:** Sales Command Center (RFM grid, customer analysis), Loyalty Analytics

**Table Columns:**

| Column | Source |
|--------|--------|
| Customer Name | Customer.customer_name |
| Customer Code | Customer.customer_code |
| Customer Type | Customer.customer_type |
| Phone | Customer.phone |
| Email | Customer.email |
| City | Customer.city |
| State | Customer.state |
| GSTIN | Customer.gst_no |
| License No | Customer.license_no |
| Payment Terms | Customer.payment_terms |
| Credit Days | Customer.credit_days |
| Credit Limit | Customer.credit_limit |
| Loyalty Points | Customer.loyalty_points |
| Loyalty Tier | Computed from points vs tier thresholds |
| Status | Customer.status |
| Location | Location.name |
| Total Orders | Computed: POS + B2B order count |
| Total Revenue | Computed: sum of order totals |
| Avg Order Value | Computed |
| First Order Date | Computed |
| Last Order Date | Computed |
| Days Since Last Order | Computed (Recency) |
| Total Returns | Computed: return count |
| Return Rate % | Computed |
| Outstanding Balance | From journal lines |
| RFM Score | Computed |
| RFM Segment | High Value / At Risk / Churned / New / etc. |

---

#### DETAIL PAGE: Dispatch Detail Data

**Reachable from:** Dispatch & Fulfillment

**Table Columns:**

| Column | Source |
|--------|--------|
| Dispatch Date | DispatchEntry.dispatch_date |
| Invoice No | DispatchEntry.invoice_no |
| Source Type | DispatchEntry.source_type |
| Customer Name | DispatchEntry.customer_name |
| Customer Phone | DispatchEntry.customer_phone |
| Delivery Address | DispatchEntry.delivery_address |
| City | DispatchEntry.city |
| State | DispatchEntry.state |
| Pincode | DispatchEntry.pincode |
| Dispatch Mode | DispatchEntry.dispatch_mode |
| Courier Partner | DispatchEntry.courier_partner |
| Tracking Number | DispatchEntry.tracking_number |
| Tracking URL | DispatchEntry.tracking_url (clickable link) |
| Challan No | DispatchEntry.challan_no |
| Vehicle No | DispatchEntry.vehicle_no |
| Driver Name | DispatchEntry.driver_name |
| Packages | DispatchEntry.no_of_packages |
| Weight (kg) | DispatchEntry.weight_kg |
| Invoice Amount | DispatchEntry.invoice_amount |
| Freight Charge | DispatchEntry.freight_charge |
| Insurance | DispatchEntry.insurance_charge |
| COD Amount | DispatchEntry.cod_amount |
| Expected Delivery | DispatchEntry.expected_delivery_date |
| Actual Delivery | DispatchEntry.actual_delivery_date |
| Delivery Delay (Days) | Computed |
| SLA Met | Computed: Yes / No |
| Status | DispatchEntry.status |
| E-Way Bill | DispatchEntry.eway_bill_no |
| Location | Location.name |
| Created By | DispatchEntry.created_by |
| Remarks | DispatchEntry.remarks |

---

#### DETAIL PAGE: Product 360° Detail Data

**Reachable from:** Product Intelligence (Lifecycle, Substitution tabs)

**Purpose:** Complete history of a single product across all systems.

**Layout:** This is a special detail page with **4 sub-tabs** per product:

**Sub-tab 1: Purchase History**
All PurchaseOrderLine records for this product — Date, Supplier, Batch, Qty, Rate, MRP, Discounts, Total

**Sub-tab 2: Sales History**
All POSOrderLine + B2BSalesOrderLine records — Date, Channel, Customer, Batch, Qty, Price, Discount, Total

**Sub-tab 3: Current Stock**
All StockQuant records across locations — Location, Batch, Qty, MRP, Purchase Rate, Expiry, Status

**Sub-tab 4: Movement Log**
All StockMovement records — Timestamp, Type, Qty, Before, After, Reference, User

**Summary Banner at Top:**
Product Name, Category, Molecule, Company, HSN, GST%, Total Purchased (all time), Total Sold (all time), Current Stock (all locations), Avg Margin %, Days of Stock Remaining

---

#### DETAIL PAGE: Audit Detail Data

**Reachable from:** Audit & Data Health

**Table Columns:**

| Column | Source |
|--------|--------|
| Timestamp | AuditLog.timestamp |
| User | AuditLog.user |
| Action | AuditLog.action |
| Module | AuditLog.model_name |
| Object ID | AuditLog.object_id |
| Description | AuditLog.object_repr |
| Changes | AuditLog.changes (expandable JSON viewer) |
| IP Address | AuditLog.ip_address |
| Extra | AuditLog.extra (expandable) |

---

#### DETAIL PAGE: Sync Error Detail Data

**Reachable from:** Audit & Data Health (Sync Health tab)

**Table Columns:**

| Column | Source |
|--------|--------|
| Created At | SyncError.created_at |
| Sync Type | SyncError.sync_type |
| Source ID | SyncError.source_id |
| Error Message | SyncError.error_message |
| Traceback | SyncError.traceback (expandable code block) |
| Retry Count | SyncError.retry_count |
| Max Retries | SyncError.max_retries |
| Resolved | SyncError.resolved (Yes/No badge) |

---

#### DETAIL PAGE: Data Quality Detail Data

**Reachable from:** Audit & Data Health (Data Quality tab)

**Table Columns (dynamic based on entity type):**

For Products:
| Product Name | Product Code | Barcode | Category | HSN Code | Molecule | Company | (field values, with missing fields highlighted red) |

For Suppliers:
| Company Name | GSTIN | Contact Person | Phone | Email | State | (missing fields highlighted) |

For Customers:
| Customer Name | Customer Code | Phone | Email | GSTIN | City | State | (missing fields highlighted) |

---

### "Show Data Table" — Inline Mini-Table (Alternative to Full Drill-Through)

Every chart also supports a **"Show Data Table" toggle** (like Power BI's "Show as a table" at the bottom of a visual). When toggled:

- A compact table appears **directly below the chart** within the same card
- The table shows the aggregated data that the chart is visualizing (not raw transactional data — that is what drill-through is for)
- The table respects all current cross-filters
- Maximum height: 200px with scroll
- Columns: the chart's dimensions + measures
- Toggle icon: a small table icon (grid icon) in the chart's top-right toolbar

**Example:** "Revenue by Category" bar chart → Show Data Table → mini-table shows:

| Category | Revenue | Orders | Avg Price | % of Total |
|----------|---------|--------|-----------|------------|
| Tablets | ₹8,45,000 | 1,234 | ₹685 | 34.4% |
| Syrups | ₹5,12,000 | 876 | ₹585 | 20.8% |
| ... | ... | ... | ... | ... |

---

## Global Design System

### Brand & Theme
- **Primary Color:** Deep Teal (#0D9488) — trustworthy, healthcare-appropriate
- **Secondary Color:** Indigo (#4F46E5) — for financial/accounting sections
- **Accent Colors:** Amber (#F59E0B) for warnings, Red (#EF4444) for critical alerts, Green (#10B981) for positive trends
- **Cross-filter Highlight:** Primary at 100% opacity for selected, 30% opacity for non-matching
- **Drill-through Chip:** Primary color background (#0D9488) with white text for drill-through context filters; Gray (#E2E8F0) for global filter chips
- **Background:** Light gray (#F8FAFC) main area, White (#FFFFFF) for cards
- **Dark Mode Toggle:** Support dark theme variant
- **Font:** Inter or DM Sans (clean, data-friendly)
- **Border Radius:** 8px for cards, 6px for inputs
- **Shadow:** Subtle (0 1px 3px rgba(0,0,0,0.1)) for card elevation

### Layout Structure (Every Page)
```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (64px)                                              │
│  Logo | Search | Location Selector | Notifications | Avatar  │
├───────────┬─────────────────────────────────────────────────┤
│           │  SELECTION TOOLBAR (40px, appears only when      │
│  LEFT     │  cross-filter is active — shows filter chips)    │
│  SIDEBAR  ├─────────────────────────────────────────────────┤
│  (280px)  │  DRILL-THROUGH BREADCRUMB (40px, appears only   │
│           │  on Detail Data pages)                           │
│  Navigation├─────────────────────────────────────────────────┤
│  + Filters│  Page Title + Action Buttons                     │
│           ├─────────────────────────────────────────────────┤
│           │  KPI Cards Row                                   │
│           ├─────────────────────────────────────────────────┤
│           │  Charts & Tables (interactive, cross-filtered)   │
│           │                                                  │
│           │  Every chart has: hover tooltip, click to        │
│           │  cross-filter, right-click context menu with     │
│           │  "Drill Through →", "Show Data Table",           │
│           │  "Copy Value", "Exclude"                         │
│           │                                                  │
├───────────┴─────────────────────────────────────────────────┤
│  FOOTER: Version | Last Sync: 2 min ago | © Biloop Software │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints
- **Desktop:** 1440px (primary design target)
- **Tablet:** 1024px (sidebar collapses to icons)
- **Mobile:** 375px (sidebar becomes bottom nav, filters become bottom sheet, cross-filter via tap, drill-through via long-press)

---

## LEFT SIDEBAR — Navigation + Global Filters

The left sidebar has **two sections**: top navigation links and bottom collapsible filter panel. The filter panel is **persistent across all pages** — changing a filter updates every page's data.

### Navigation Menu (Top Section)

Design as icon + label nav items with active state indicator (left border accent):

```
📊  Executive Summary
💰  Financial Deep Dive
🛒  Sales Command Center
📦  Inventory Operations
🚚  Procurement Intelligence
🏛️  GST & Compliance
💳  TDS Tracker
💵  Working Capital
🏪  Location Benchmarking
📋  Product Intelligence
🚛  Dispatch & Fulfillment
⭐  Loyalty Analytics
🔍  Audit & Data Health
──────────────────────
📄  Data Tables ▸          ← Submenu expanding to all Detail Data pages
        Sales Data
        Inventory Data
        Movement Data
        Purchase Data
        Purchase Returns
        Sales Returns
        Financial Data
        GST Data
        TDS Data
        Receivables/Payables
        Customer Data
        Dispatch Data
        Audit Log
        Sync Errors
        Data Quality
──────────────────────
⚙️  Settings
```

### Global Filter Panel (Bottom Section — Collapsible)

This filter panel **sticks to every page**. Filters are collapsible accordion sections. Each filter shows the current selection as a chip/tag when collapsed. Active filters show a count badge.

**Important:** Global filters affect both dashboard visualizations AND Detail Data tables. They are the "base layer" — cross-filters and drill-through filters are additive layers on top.

---

#### FILTER SECTION 1: Time & Period

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Date Range** | Date Picker (range) | Start Date — End Date with calendar popup |
| **Quick Presets** | Chip group | Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, This Quarter, Last Quarter, This FY, Last FY, Custom |
| **Financial Year** | Dropdown | FY 2025-26, FY 2024-25, FY 2023-24 (April–March) |
| **Quarter** | Multi-select chips | Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar) |
| **Month** | Multi-select dropdown | Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec |
| **Week** | Dropdown | Week 1–52 (ISO week number) |
| **Day of Week** | Multi-select chips | Mon, Tue, Wed, Thu, Fri, Sat, Sun |
| **Hour of Day** | Range slider | 0–23 (for POS hourly analysis) |
| **Comparison Period** | Toggle + Dropdown | Compare with: Previous Period, Same Period Last Year, Custom |

---

#### FILTER SECTION 2: Location & Store

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Location** | Multi-select dropdown with search | All Locations, Location 1, Location 2, ... (from Location model) |
| **Location Usage** | Dropdown | Internal, External, All |
| **Location Group** | Multi-select | (If locations are grouped — e.g., City-wise, Zone-wise) |

---

#### FILTER SECTION 3: Product Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Product Name** | Searchable multi-select | Type-ahead search across Product.name |
| **Product Code** | Searchable input | Filter by Product.default_code |
| **Barcode** | Searchable input | Scan or type barcode |
| **Pharma Category** | Multi-select dropdown | All categories from Product.pharma_category |
| **Pharma Subcategory** | Multi-select dropdown | Cascading — filters based on selected category |
| **Therapeutic Category** | Multi-select dropdown | From Product.pharma_therapeutic_category |
| **Molecule / Salt** | Searchable multi-select | From Product.pharma_molecule |
| **Dosage Form** | Multi-select chips | Tablet, Capsule, Syrup, Injection, Ointment, Drops, etc. |
| **Drug Schedule** | Multi-select chips | H, H1, X, Schedule C, C1, G, J, OTC |
| **Company / Manufacturer** | Searchable multi-select | From CompanyMaster.name |
| **Company Type** | Multi-select chips | Manufacturer, Marketer, Group |
| **HSN Code** | Searchable input | From Product.pharma_hsn_code |
| **GST Slab** | Multi-select chips | 0%, 5%, 12%, 18%, 28% |
| **Sales Pack Type** | Multi-select dropdown | From SalesPackType.name |
| **Packing Unit** | Multi-select | From Product.pharma_packing_unit |
| **VED Classification** | Multi-select chips | V (Vital), E (Essential), D (Desirable) |
| **ABC Classification** | Multi-select chips | A (Top 80% revenue), B (Next 15%), C (Bottom 5%) |
| **Product Flags** | Toggle switches | Is Critical, Is Non-Inventory, Is Antibiotic, Is Controlled, Requires Cold Chain, Batch Tracking Enabled |
| **Rack Number** | Searchable multi-select | From Product.pharma_rack_number |
| **Active Status** | Toggle | Active Only, Inactive Only, All |

---

#### FILTER SECTION 4: Supplier Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Supplier Name** | Searchable multi-select | From Supplier.company_name |
| **Supplier GSTIN** | Searchable input | From Supplier.gst_no |
| **Supplier Category** | Multi-select chips | Distributor, Manufacturer, Wholesaler, Retailer |
| **Supplier State** | Multi-select dropdown | Indian states from Supplier.state |
| **Supplier City** | Searchable multi-select | From Supplier.city |
| **Payment Terms** | Multi-select chips | Cash, Credit, Advance, Part Payment |
| **Credit Days Range** | Range slider | 0–120 days |
| **Supplier Status** | Toggle | Active, Inactive, All |

---

#### FILTER SECTION 5: Customer Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Customer Name** | Searchable multi-select | From Customer.customer_name |
| **Customer Code** | Searchable input | From Customer.customer_code |
| **Customer GSTIN** | Searchable input | From Customer.gst_no |
| **Customer Type** | Multi-select chips | Retail, B2B, Hospital, Clinic |
| **Customer State** | Multi-select dropdown | Indian states from Customer.state |
| **Customer City** | Searchable multi-select | From Customer.city |
| **Payment Terms** | Multi-select chips | Cash, Credit, Advance, Part Payment |
| **Credit Limit Range** | Range slider | ₹0 – ₹10,00,000 |
| **Credit Days Range** | Range slider | 0–120 days |
| **Loyalty Tier** | Multi-select chips | None, Silver, Gold, Platinum, Diamond |
| **Loyalty Points Range** | Range slider | 0 – max |
| **Customer Status** | Toggle | Active, Inactive, All |

---

#### FILTER SECTION 6: Doctor Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Doctor Name** | Searchable multi-select | From Doctor.name |
| **Specialization** | Multi-select dropdown | From Doctor.specialization |
| **Hospital/Clinic** | Searchable multi-select | From Doctor.hospital_clinic |
| **Doctor City** | Searchable multi-select | From Doctor.city |
| **Doctor Status** | Toggle | Active, Inactive, All |

---

#### FILTER SECTION 7: Transaction Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Sales Channel** | Multi-select chips | POS (Retail), B2B (Wholesale), All |
| **Payment Method** | Multi-select chips | Cash, UPI, Card, Credit, Cheque |
| **Invoice Number** | Searchable input | Search across POS/B2B invoice numbers |
| **Bill Number** | Searchable input | Purchase bill number |
| **Order Status** | Multi-select chips | Draft, Confirmed, Completed, Cancelled, Delivered, Invoiced, Proforma |
| **PO Approval State** | Multi-select chips | Draft, Pending Approval, Confirmed, Done |
| **Supply Type** | Chips | Intra-State, Inter-State, All |
| **Invoice Type** | Chips | Tax Invoice, Proforma, All |
| **Batch Number** | Searchable input | Filter by specific batch |
| **Expiry Range** | Date range | Expiry month from–to |

---

#### FILTER SECTION 8: Inventory Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Stock Status** | Multi-select chips | In Stock, Low Stock, Out of Stock, Overstocked |
| **Expiry Status** | Multi-select chips | Expired, Expiring ≤30 days, 31–60 days, 61–90 days, 90+ days, No Expiry |
| **Movement Type** | Multi-select chips | Purchase In, POS Sale, B2B Sale, Sales Return, Purchase Return, Adjustment, Transfer, Expiry Write-off, Damage Write-off, Wastage Write-off, Purchase Reverse |
| **MRP Range** | Range slider | ₹0 – ₹50,000 |
| **Purchase Rate Range** | Range slider | ₹0 – ₹50,000 |
| **Quantity Range** | Range slider | 0 – max |

---

#### FILTER SECTION 9: Accounting & Compliance Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Voucher Type** | Multi-select chips | Purchase, Sale, Payment, Receipt, Contra, Journal, Credit Note, Debit Note |
| **Journal Status** | Chips | Draft, Posted, All |
| **Account Type** | Multi-select chips | Asset, Liability, Equity, Revenue, Expense |
| **Account Subtype** | Multi-select dropdown | Cash, Bank, Receivable, Payable, Input_GST, Output_GST, TDS_Receivable, TDS_Payable, Capital, Retained_Earnings, Sales, Purchases, Other_Income, Other_Expense |
| **Specific Account** | Searchable multi-select | From ChartOfAccount (account_code + account_name) |
| **GST Filing Period** | Month picker | YYYY-MM format |
| **GSTR Type** | Chips | GSTR-1, GSTR-3B, GSTR-2B |
| **GSTR-1 Invoice Type** | Multi-select chips | B2B, B2C_LARGE, B2C_SMALL, CREDIT_NOTE, DEBIT_NOTE, CDNR, CDNUR, NIL |
| **GST Filing Status** | Chips | Draft, Filed, All |
| **ITC Match Status** | Multi-select chips | Matched, Unmatched, Partial, Missing, Mismatch |
| **ITC Eligibility** | Toggle | Eligible, Ineligible, All |
| **TDS Section** | Multi-select dropdown | 194C, 194H, 194I, 194J, 194Q, etc. |
| **TDS Status** | Multi-select chips | Pending, Challan Paid, Returned |
| **Deductee Type** | Chips | Company, Individual/HUF |

---

#### FILTER SECTION 10: Dispatch Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Source Type** | Multi-select chips | B2B, E-commerce, POS, Other |
| **Dispatch Mode** | Multi-select chips | Courier, Transport, Hand Delivery, Post, Self Pickup |
| **Courier Partner** | Searchable multi-select | From DispatchEntry.courier_partner |
| **Dispatch Status** | Multi-select chips | Pending, Packed, Dispatched, In Transit, Delivered, Returned, Cancelled |
| **Destination State** | Multi-select dropdown | Indian states |
| **Destination City** | Searchable multi-select | From DispatchEntry.city |
| **E-Way Bill** | Toggle | Has E-Way Bill, No E-Way Bill, All |

---

#### FILTER SECTION 11: Indent / Transfer Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **Requesting Location** | Multi-select dropdown | Locations |
| **Source Location** | Multi-select dropdown | Locations |
| **Indent Status** | Multi-select chips | Draft, Submitted, Approved, Rejected, Transferred, Partially Fulfilled, Cancelled, Completed |
| **Priority** | Multi-select chips | Normal, Urgent, Critical |
| **Requested By** | Searchable multi-select | Users |

---

#### FILTER SECTION 12: User & Audit Dimensions

| Filter | Type | Options/Behavior |
|--------|------|------------------|
| **User** | Searchable multi-select | All system users |
| **Role** | Multi-select chips | Admin, Manager, Sales, Accountant, Pharmacist, Viewer |
| **Audit Action** | Multi-select chips | Create, Update, Delete, Approval, Login, POST, REVERSE, GENERATE, SYNC |
| **Module** | Multi-select dropdown | All system modules |

---

#### Filter Panel Footer Actions

| Action | Behavior |
|--------|----------|
| **Apply Filters** | Blue primary button — applies all selected filters |
| **Reset All** | Ghost button — clears all filters to defaults |
| **Save Filter Preset** | Icon button — save current filter combination with a name |
| **Load Preset** | Dropdown — load previously saved filter presets |
| **Active Filters Count** | Badge showing "12 filters active" |
| **Export Filtered Data** | Button — export current filtered view as Excel/PDF |

---

## DASHBOARD PAGES — Detailed Wireframe Specs

**IMPORTANT:** Every chart described below is fully interactive — it participates in cross-filtering (clicking it filters all other charts on the same page) and supports drill-through (right-click or select + button to navigate to the relevant Detail Data page). The "Show Data Table" toggle is available on every chart.

---

### PAGE 1: Executive Summary

**Purpose:** CEO/Owner-level single-screen business health overview.

**Layout:** 4-column grid of KPI cards (row 1), 2-column chart row (row 2), 3-column summary row (row 3)

#### Row 1 — KPI Cards (4 cards)

| Card | Primary Metric | Secondary | Trend | Drill-Through Target |
|------|---------------|-----------|-------|---------------------|
| **Total Revenue** | ₹24,56,890 | POS: ₹18.2L / B2B: ₹6.3L | ↑ 12% vs last period (sparkline) | → Sales Detail Data |
| **Gross Profit** | ₹4,82,310 | Margin: 19.6% | ↑ 2.1pp vs last period | → Financial Detail Data |
| **Cash Position** | ₹8,45,000 | Receivables: ₹3.2L / Payables: ₹5.1L | Mini bar showing cash + receivable - payable | → Receivables/Payables Detail Data |
| **GST Liability** | ₹1,23,400 | Output: ₹2.1L / ITC: ₹87K | Filing status indicator (green/amber/red) | → GST Detail Data |

**KPI cards do NOT participate in cross-filtering as a source or target.** They always reflect global filters only. Clicking a KPI card triggers drill-through navigation.

#### Row 2 — Charts (2 charts, 50/50 split)

| Chart | Type | Cross-Filter Behavior | Drill-Through Target |
|-------|------|----------------------|---------------------|
| **Revenue & Profit Trend** | Dual-axis: Revenue bars + Margin % line, X = months | Click a month bar → all other charts filter to that month | Click month → Sales Detail Data (month filter) |
| **Sales Channel Mix** | Stacked area chart (POS vs B2B over time) | Click a segment → other charts filter to POS or B2B | Click segment → Sales Detail Data (channel filter) |

#### Row 3 — Summary Panels (3 panels)

| Panel | Content | Cross-Filter Behavior | Drill-Through Target |
|-------|---------|----------------------|---------------------|
| **Inventory Alerts** | Low stock count, Expiring ≤30 days, Non-moving, Total value | Click a count → highlights related products in other charts | Click Low Stock → Inventory Detail Data (stock status filter) |
| **Top 5 Products** | Ranked list: name, qty sold, revenue, margin % (horizontal bar per item) | Click a product → all other charts filter to that product | Click product → Sales Detail Data (product filter) |
| **Pending Actions** | POs pending (count+value), Unpaid credit (count+value), TDS pending, GSTR due | Click an action count → navigates to relevant page | Click POs pending → Purchase Detail Data (state=pending) |

#### Row 4 — Additional Widgets

| Widget | Type | Cross-Filter | Drill-Through |
|--------|------|-------------|--------------|
| **Today's Sales Activity** | Real-time counter: orders, revenue, avg basket, vs last week | N/A (real-time display) | Click → Sales Detail Data (date=today) |
| **Weekly Order Trend** | Small bar chart: orders/day for 7 days | Click a day → other charts filter to that day | Click day → Sales Detail Data (date filter) |
| **Stock vs Sales Correlation** | Scatter: X=stock value, Y=sales velocity, dot=category | Click a dot → other charts filter to that category | Click dot → Inventory Detail Data (category filter) |

---

### PAGE 2: Financial Deep Dive

**Purpose:** Accountant-level financial statements.

#### Sub-tabs: P&L | Balance Sheet | Trial Balance | Ledger | Cash Flow

##### P&L Tab
- **Hierarchical table:** Account Name | This Period | Previous Period | YoY Change | % Change
- **Revenue section:** POS Sales, B2B Sales, Other Income → Gross Revenue → Less: Sales Returns → Net Revenue → Less: COGS → Gross Profit → Less: Expenses → Net Profit
- **Waterfall chart:** Revenue → deductions → profit flow
- **Cross-filter:** Click any P&L row → waterfall chart highlights that account's contribution
- **Drill-through:** Click any account row → Financial Detail Data (filtered to that account's journal lines)
- **Toggle:** Monthly / Quarterly / Annual view

##### Balance Sheet Tab
- **Two-column layout:** Assets (left), Liabilities + Equity (right)
- **Cross-filter:** Click an asset category → liability side highlights corresponding funded-by accounts
- **Drill-through:** Click any account → Financial Detail Data
- **Footer:** Balanced indicator (green ✓ or red ✗)

##### Trial Balance Tab
- **Table:** Account Code | Account Name | Opening DR/CR | Period DR/CR | Closing DR/CR
- **Collapsible by account_type**
- **Cross-filter:** Click an account row → other financial charts (if any) filter
- **Drill-through:** Click account → Financial Detail Data

##### Ledger Tab
- **Account selector dropdown** → shows all transactions for that account
- **Table:** Date | Entry No | Narration | Debit | Credit | Running Balance
- **Cross-filter:** Click a journal entry row → (not applicable, single-table view)
- **Drill-through:** Click entry row → Financial Detail Data (filtered to all lines of that entry)

##### Cash Flow Tab
- **Three sections:** Operating, Investing, Financing
- **KPIs:** Net cash from operations, ending balance, burn rate
- **Drill-through:** Click any line → Financial Detail Data

---

### PAGE 3: Sales Command Center

#### Sub-tabs: Overview | Product Analysis | Customer Analysis | Doctor Analysis | Returns

##### Overview Tab

**Row 1 — KPIs:** Revenue Today | Orders Today | Avg Basket Size | Avg Order Value | Return Rate
(KPIs → drill-through to Sales Detail Data)

**Row 2 — Charts:**
| **Sales Trend** (line by day/week/month) — click a point → cross-filters other charts to that date | Drill → Sales Detail Data |
| **Revenue by Payment Method** (donut) — click a slice → cross-filters | Drill → Sales Detail Data |

**Row 3 — Tables:**
| **Top 10 Products** (name, qty, revenue, margin) — click a row → cross-filters charts | Drill → Sales Detail Data (product filter) |
| **Top 10 Customers** (name, orders, revenue, outstanding) — click a row → cross-filters | Drill → Sales Detail Data (customer filter) |

**Row 4:**
| **Hourly Heatmap** (hour × day-of-week, color=revenue) — click a cell → cross-filters | Drill → Sales Detail Data (hour+day filter) |
| **POS vs B2B Comparison** (side-by-side metrics) — click channel → cross-filters | Drill → Sales Detail Data (channel filter) |

##### Product Analysis Tab
- **Scatter plot:** Units Sold (X) vs Margin % (Y), bubble size=revenue — click bubble → cross-filters table below
- **Table:** Product, category, qty, revenue, cost, margin %, stock, days of stock — click row → cross-filters scatter
- **Drill-through:** Click any product → Sales Detail Data (product filter)

##### Customer Analysis Tab
- **RFM Grid:** 3×3 matrix, color-coded — click cell → cross-filters all other charts on this tab
- **Customer Concentration:** Pie (top 5/10/20/rest) — click slice → cross-filters
- **Credit Aging:** Stacked bar by customer — click a bar → cross-filters
- **Proforma Funnel:** stages — click a stage → cross-filters
- **Drill-through:** Click customer → Sales Detail Data or Customer Detail Data
- **Drill-through:** Click RFM cell → Customer Detail Data (segment filter)

##### Doctor Analysis Tab
- **Table:** Doctor, specialization, prescriptions, patients, revenue, top molecules — click row → cross-filters chart
- **Revenue by Doctor:** Horizontal bar — click bar → cross-filters table
- **Drill-through:** Click doctor → Sales Detail Data (doctor filter)

##### Returns Tab
- **KPIs:** Total returns value, return rate %, top returned product, avg days to return
- **Returns Trend:** Line chart — click point → cross-filters table
- **Return Detail Table:** return no, invoice, customer, products, reason, amount — click row → drill-through
- **Reason Breakdown:** Donut — click slice → cross-filters table
- **Drill-through:** Click return → Returns Detail Data (return filter)

---

### PAGE 4: Inventory Operations

#### Sub-tabs: Stock Overview | Expiry Management | Movement Analysis | ABC-VED Matrix | Batch Details

##### Stock Overview Tab
**KPIs:** Total SKUs | Stock Value | Below Min | Out of Stock | Non-Moving (90d) → drill-through to Inventory Detail Data

**Charts:**
| **Stock by Category** (treemap, size=value, color=turnover) — click tile → cross-filters tables | Drill → Inventory Detail Data (category) |
| **Turnover by Location** (bar) — click bar → cross-filters | Drill → Inventory Detail Data (location) |

**Tables:**
| **Low Stock Alert** — click row → cross-filters, drill → Inventory Detail Data (product) |
| **Overstock** — click row → cross-filters, drill → Inventory Detail Data (product) |

##### Expiry Management Tab
- **Expiry Calendar:** Month-view with colored dots — click dot → cross-filters table
- **Expiry Risk Table:** click row → drill to Inventory Detail Data (product+batch)
- **Write-off History Chart:** click month → cross-filters, drill → Movement Detail Data (write-off types)

##### Movement Analysis Tab
- **Sankey:** Purchase → Stock → Sales/Returns/Write-offs — click flow → cross-filters log
- **Movement Log:** click row → drill to Movement Detail Data
- **Daily Net Change:** click point → cross-filters

##### ABC-VED Matrix Tab
- **3×3 Matrix:** click cell → cross-filters all charts — drill to Inventory Detail Data (ABC+VED filter)
- **Each cell:** product count, stock value, action label

##### Batch Details Tab
- **Batch Table:** click row → drill to Inventory Detail Data (product+batch)
- **Fragmentation Chart:** click bar → cross-filters table
- **FIFO Indicator:** click red item → drill to Movement Detail Data (showing violation evidence)

---

### PAGE 5: Procurement Intelligence

#### Sub-tabs: Overview | Supplier Scorecard | Price Analysis | Lead Time | Purchase Returns

(All charts cross-filter each other on the same tab. All drill through to Purchase Detail Data unless specified otherwise.)

##### Overview Tab
**KPIs → drill to Purchase Detail Data**
**Charts:** Purchase Trend (bar by month), Top 10 Suppliers (horizontal bar), Purchase by Category (donut), Intra vs Inter-State (pie) — all cross-filter each other

##### Supplier Scorecard Tab
- **Table per supplier:** total spend, orders, avg lead time, return rate, discount %, free goods %, rating — click row → cross-filters charts
- **Concentration Risk:** bar — click → cross-filters
- **Drill-through:** Click supplier → Purchase Detail Data (supplier filter)

##### Price Analysis Tab
- **Price History:** Line per product, dots by supplier — click dot → cross-filters, drill → Purchase Detail Data (product+supplier+PO)
- **Variance Table:** click row → cross-filters chart, drill → Purchase Detail Data (product)
- **Discount Realization:** click supplier → cross-filters

##### Lead Time Tab
- **Histogram:** click bin → cross-filters supplier table
- **Trend:** click month → cross-filters
- **Box Plot:** click supplier → cross-filters, drill → Purchase Detail Data (supplier)

##### Purchase Returns Tab
- **Return Rate by Supplier:** bar — click → cross-filters table
- **Table:** click row → drill to Purchase Return Detail Data
- **ITC Impact Chart:** click → drill to GST Detail Data

---

### PAGE 6: GST & Compliance Center

#### Sub-tabs: GSTR-1 | GSTR-3B | GSTR-2B & ITC | RCM | GST Computation | HSN Summary

All charts cross-filter within each tab. All drill through to GST Detail Data.

##### GSTR-1 Tab
- **Summary Cards → drill to GST Detail Data per type**
- **Invoice Table:** click row → cross-filters, drill to GST Detail Data (invoice)
- **HSN Summary Table at bottom:** click row → cross-filters by HSN

##### GSTR-3B Tab
- **Monthly Summary Card → drill to GST Detail Data (period)**
- **Trend Chart:** click month bar → cross-filters
- **Payment Status indicators**

##### GSTR-2B & ITC Tab
- **Reconciliation KPIs → drill to GST Detail Data**
- **Waterfall Chart:** click segment → cross-filters supplier table
- **Per-Supplier Table:** click row → drill to GST Detail Data (supplier GSTIN)
- **ITC Utilization Gauge → drill to GST Detail Data (all eligible)**

##### RCM Tab
- **RCM Table:** click row → drill to GST Detail Data (RCM entry)
- **Monthly Bar:** click → cross-filters table
- **Category Donut:** click → cross-filters table

##### GST Computation Tab
- **Worksheet layout** — Output Tax − ITC = Net Payable per IGST/CGST/SGST
- **Click any cell → drill to GST Detail Data**

##### HSN Summary Tab
- **Table:** click row → drill to GST Detail Data (HSN filter)
- **Treemap:** click tile → cross-filters table, drill to GST Detail Data

---

### PAGE 7: TDS Tracker

**KPIs:** Total Deducted | Pending Deposit | Challans Filed | Next Due → drill to TDS Detail Data

**Charts:**
| **Section-wise Bar:** click section → cross-filters tables | drill → TDS Detail Data (section) |
| **Quarterly Summary Table:** click cell → cross-filters | drill → TDS Detail Data (quarter+section) |

**Tables:**
| **Deduction Register:** click row → drill to TDS Detail Data (deduction ID) |
| **Challan Register:** click row → drill to TDS Detail Data (challan filter) |

**Alert Banner:** Overdue TDS deposits highlighted red

---

### PAGE 8: Working Capital

#### Sub-tabs: Overview | Receivables | Payables | Cash Conversion

##### Overview Tab
- **KPIs:** Net Working Capital, Current Ratio, Quick Ratio, CCC → drill to Receivables/Payables Detail Data
- **Waterfall Chart:** click segment → cross-filters, drill → relevant Detail Data
- **Trend:** click month → cross-filters

##### Receivables Tab
- **Aging Buckets Bar:** click bucket → cross-filters customer table, drill → Receivables/Payables Detail Data (age bucket)
- **Customer Outstanding Table:** click row → cross-filters, drill → Receivables/Payables Detail Data (customer)
- **Collections Priority:** click row → drill → same
- **DSO Trend:** click point → cross-filters

##### Payables Tab
- **Mirror of Receivables but for suppliers**
- **All interactions same as Receivables**

##### Cash Conversion Tab
- **CCC Diagram:** click component (DIO/DSO/DPO) → drill to Receivables/Payables Detail Data (component transactions)
- **Component Trend:** click line → cross-filters

---

### PAGE 9: Location Benchmarking

**Layout:** Locations as columns, metrics as rows

**All metric cells are clickable:**
- Click a cell → cross-filters that row's charts to that location
- Drill-through: navigates to the relevant Detail Data page filtered by that location

**Charts:**
- **Radar Chart:** click a location's polygon → cross-filters table, drill → Sales Detail Data (location)
- **Revenue Bar:** click bar → cross-filters
- **Demand Mismatch Table:** click row → drill to Inventory Detail Data (product across locations)
- **Indent Efficiency:** click row → drill to a filtered indent request view

---

### PAGE 10: Product Intelligence

#### Sub-tabs: Portfolio Overview | Lifecycle | Substitution | Pricing | Antibiotics & Controlled

All charts cross-filter within each tab.

- **Scatter Plot:** click bubble → cross-filters, drill → Sales Detail Data or Product 360° Detail Data
- **Category Table:** click row → cross-filters, drill → Sales Detail Data (category)
- **Lifecycle Timeline:** click product → drill to Product 360° Detail Data
- **Substitution Table:** click molecule group → drill to Product 360° Detail Data (molecule)
- **Pricing Scatter:** click point → cross-filters
- **Antibiotic Trend:** click month → drill to Sales Detail Data (antibiotic=true, month)
- **Controlled Register:** click row → drill to Product 360° Detail Data

---

### PAGE 11: Dispatch & Fulfillment

**KPIs → drill to Dispatch Detail Data**

**Charts:**
| **Pipeline Funnel:** click stage → cross-filters, drill → Dispatch Detail Data (status) |
| **Courier Table:** click row → cross-filters, drill → Dispatch Detail Data (courier) |
| **State Heatmap:** click state → cross-filters, drill → Dispatch Detail Data (state) |
| **Freight Analysis:** click bar → cross-filters |
| **Dispatch Log Table:** click row → drill → Dispatch Detail Data (entry) |

---

### PAGE 12: Loyalty Analytics

**KPIs → drill to Customer Detail Data**

- **Tier Distribution Bar:** click tier → cross-filters, drill → Customer Detail Data (tier filter)
- **Loyalty vs Non-Loyalty Comparison:** click segment → cross-filters
- **Tier Progression Sankey:** click flow → drill → Customer Detail Data (previous+current tier)
- **Redemption Trend:** click month → cross-filters

---

### PAGE 13: Audit & Data Health

#### Sub-tabs: Sync Health | User Activity | Data Quality | Audit Trail

- **Sync Status Cards:** click card → drill to Sync Error Detail Data (sync type)
- **Sync Error Table:** click row → drill to Sync Error Detail Data (error ID)
- **User Activity Heatmap:** click cell → drill to Audit Detail Data (user+date)
- **Data Quality Scorecard:** click row → drill to Data Quality Detail Data (entity+field)
- **Audit Trail Table:** click row → drill to Audit Detail Data (log ID)
- **All charts cross-filter within each tab**

---

## Chart Toolbar (Every Chart)

Every chart card has a toolbar in the top-right corner with these icons:

```
┌─────────────────────────────────────────────────────┐
│  Chart Title                          🔍 📊 ⛶ 📥 ⋮ │
│                                                      │
│  [chart content]                                     │
│                                                      │
└─────────────────────────────────────────────────────┘

🔍 = Focus Mode (isolate this chart, dim others — like Power BI's Focus Mode)
📊 = Show Data Table (toggle inline mini-table below chart)
⛶  = Full Screen (expand chart to full viewport)
📥 = Download (PNG / SVG / CSV of underlying data)
⋮  = More Options:
      - Sort ascending/descending
      - Switch chart type (bar ↔ line ↔ area where applicable)
      - Reset cross-filters on this chart
      - Copy as image
      - View SQL/query (for advanced users)
```

---

## Right-Click Context Menu (Every Data Point)

When user right-clicks (or long-presses on mobile) any data point in any chart:

```
┌──────────────────────────────┐
│  Drill Through →              │   ← Primary action, bold
│  ─────────────────────────── │
│  Show Data Table              │
│  Include Only                 │   ← Temporary filter: show ONLY this value
│  Exclude                      │   ← Temporary filter: hide this value
│  ─────────────────────────── │
│  Copy Value                   │
│  Copy Row Data                │
│  ─────────────────────────── │
│  Clear All Selections         │
└──────────────────────────────┘
```

- **"Include Only"** adds a temporary positive filter (like cross-filtering but more explicit)
- **"Exclude"** removes that specific value from all charts (temporary exclusion filter, shown as a strikethrough chip in the selection toolbar)

---

## Currency & Number Formatting

- **Currency:** Indian Rupee (₹) with Indian number system (lakh/crore grouping: ₹12,34,567.89)
- **Abbreviated:** ₹1.2L (lakhs), ₹3.4Cr (crores) for KPI cards
- **Percentages:** 1 decimal place (19.6%)
- **Quantities:** Whole numbers with comma separation (1,23,456)
- **Dates:** DD-MMM-YYYY (28-Mar-2026) for display, YYYY-MM-DD for data

---

## Additional Design Notes

### Empty States
- Design empty states for every widget when no data matches filters (including after cross-filter)
- Use illustration + "No data found for selected filters" + "Try adjusting your filters" CTA
- After cross-filter: "No matching data for [Category: Tablets]" with "Clear Selection" button

### Loading States
- Skeleton screens for cards and charts
- Progressive loading — KPIs load first, then charts, then tables
- During cross-filter update: subtle pulse animation on updating charts (not full skeleton — the shape stays, content updates)

### Error States
- If sync is broken, show persistent amber banner: "Data sync delayed — last successful sync: [time]"
- If any widget fails: inline error with "Retry" button

### Accessibility
- All charts have tabular data fallback (accessible to screen readers — the "Show Data Table" toggle serves double duty)
- Color blind-safe palette for all charts (avoid relying solely on red/green — use shapes, patterns, or textures as secondary indicators)
- Minimum contrast ratio 4.5:1 for all text
- Keyboard navigable: Tab to chart → Enter to select/cross-filter → Shift+F10 for context menu → Escape to clear selection
- Screen reader announces: "Bar chart, Revenue by Category, 5 items. Use arrow keys to navigate bars. Press Enter to cross-filter."

### Print / Export
- Each page has "Export as PDF" button generating printable report layout
- PDF includes company header, date range, all KPIs/charts, and any active drill-through filters
- Detail Data pages export as Excel with all columns and current filter state

### Mobile Interactions
- **Cross-filter:** Tap data point to cross-filter (same as click on desktop)
- **Drill-through:** Long-press (500ms) data point → shows context menu with "Drill Through →"
- **Clear selection:** Tap outside any chart or tap "✕ Clear" floating button
- **Detail Data tables:** Horizontal scroll with frozen first 2 columns
- **Filters:** Bottom sheet overlay instead of left sidebar

---

## Figma Deliverables Requested

1. **Component Library:** All reusable components:
   - KPI cards (with sparkline, trend indicator, drill-through affordance)
   - Chart cards (with toolbar: focus, data table, fullscreen, download, more)
   - Cross-filter selection state indicators (highlight, dim, selection chip bar)
   - Right-click context menu
   - Drill-through breadcrumb bar
   - Drill-through context filter chips (colored vs gray)
   - Data tables (with frozen columns, group-by, summary row, conditional formatting)
   - Inline mini-table (for "Show Data Table" toggle)
   - Filter components (all types: searchable multi-select, range slider, chips, toggles, date pickers)
   - Empty states, loading skeletons, error states
   - "← Back" navigation for drill-through return
2. **13 Full Dashboard Page Designs** (desktop 1440px) — one per section
3. **15 Detail Data Page Designs** (desktop 1440px) — one per detail table defined above
4. **Cross-Filter State Mockups** — for at least Executive Summary and Sales Command Center, show:
   - Default state (no selection)
   - After clicking one chart element (show dimmed/highlighted states on all other charts)
   - After clicking two elements (compound cross-filter)
   - Selection toolbar with active filter chips
5. **Drill-Through Flow Mockup** — for at least one complete flow:
   - Start page (e.g., Sales Command Center, Top Products chart)
   - Right-click context menu shown
   - Detail Data page with breadcrumb and context filters
   - "← Back" returning to original page
6. **Mobile Responsive Variants** (375px) — for Executive Summary, Sales, and one Detail Data page
7. **Dark Mode Variants** — for at least Executive Summary and one Detail Data page
8. **Interactive Prototype:** Clickable navigation between all pages, filter interactions, at least 3 working cross-filter interactions, at least 2 working drill-through flows
9. **Design Tokens:** Exported color, typography, spacing, shadow, and interaction state tokens for developer handoff

---

*Designed for HealPro Chemist+ by Biloop Software Design & Programming W.L.L.*
