from django.urls import path
from api import executive, sales, financial, inventory, procurement
from api import compliance, working_capital, location, product
from api import dispatch, loyalty, audit

urlpatterns = [
    # ─── Executive Summary ────────────────────────────────────────────
    path('executive/kpis/', executive.kpis),
    path('executive/revenue-trend/', executive.revenue_trend),
    path('executive/channel-mix/', executive.channel_mix),
    path('executive/category-revenue/', executive.category_revenue),
    path('executive/top-products/', executive.top_products),
    path('executive/inventory-alerts/', executive.inventory_alerts),
    path('executive/pending-actions/', executive.pending_actions),

    # ─── Sales Command Center ─────────────────────────────────────────
    path('sales/overview/', sales.overview),
    path('sales/hourly/', sales.hourly),
    path('sales/payment-mix/', sales.payment_mix),
    path('sales/products/', sales.products),
    path('sales/categories/', sales.categories),
    path('sales/slow-movers/', sales.slow_movers),
    path('sales/customers/', sales.customers),
    path('sales/customer-segments/', sales.customer_segments),
    path('sales/doctors/', sales.doctors),
    path('sales/doctor-specialties/', sales.doctor_specialties),
    path('sales/returns/overview/', sales.returns_overview),
    path('sales/returns/by-category/', sales.returns_by_category),
    path('sales/product-profitability/', sales.product_profitability),
    path('sales/customer-growth/', sales.customer_growth),
    path('sales/outstanding-aging/', sales.outstanding_aging),
    path('sales/doctor-prescription-trend/', sales.doctor_prescription_trend),
    path('sales/doctor-radar/', sales.doctor_radar),
    path('sales/returns/profit-impact/', sales.returns_profit_impact),
    path('sales/detail/', sales.detail),

    # ─── Financial Deep Dive ──────────────────────────────────────────
    path('financial/pnl/', financial.pnl),
    path('financial/pnl-trend/', financial.pnl_trend),
    path('financial/expense-breakdown/', financial.expense_breakdown),
    path('financial/balance-sheet/', financial.balance_sheet),
    path('financial/cash-flow/', financial.cash_flow),
    path('financial/ratios/', financial.ratios),
    path('financial/profit-bridge/', financial.profit_bridge),
    path('financial/detail/', financial.detail),
    path('expense/detail/', financial.expense_detail),

    # ─── Inventory Operations ─────────────────────────────────────────
    path('inventory/overview/', inventory.overview),
    path('inventory/by-category/', inventory.by_category),
    path('inventory/expiry/', inventory.expiry),
    path('inventory/movement-trend/', inventory.movement_trend),
    path('inventory/abc-ved/', inventory.abc_ved),
    path('inventory/dead-stock/', inventory.dead_stock),
    path('inventory/forecast/', inventory.forecast),
    path('inventory/efficiency/', inventory.efficiency),
    path('inventory/batches/', inventory.batches),
    path('inventory/investment/', inventory.investment),
    path('inventory/stock-alerts/', inventory.stock_alerts),
    path('inventory/carrying-cost/', inventory.carrying_cost),
    path('inventory/optimization/', inventory.optimization),
    path('inventory/turnover/', inventory.turnover),
    path('inventory/batch-detail/', inventory.batch_detail),
    path('inventory/investment-detail/', inventory.investment_detail),
    path('inventory/detail/', inventory.detail_view),

    # ─── Procurement Intelligence ─────────────────────────────────────
    path('procurement/overview/', procurement.overview),
    path('procurement/supplier-scorecard/', procurement.supplier_scorecard),
    path('procurement/cost-comparison/', procurement.cost_comparison),
    path('procurement/price-trend/', procurement.price_trend),
    path('procurement/payment-terms/', procurement.payment_terms),
    path('procurement/lead-time/', procurement.lead_time),
    path('procurement/returns/', procurement.returns),
    path('procurement/savings/', procurement.savings),
    path('procurement/po-status/', procurement.po_status),
    path('procurement/detail/', procurement.detail),

    # ─── GST Compliance ───────────────────────────────────────────────
    path('gst/overview/', compliance.gst_overview),
    path('gst/gstr1/', compliance.gstr1),
    path('gst/gstr3b/', compliance.gstr3b),
    path('gst/itc/', compliance.itc),
    path('gst/rcm/', compliance.rcm),
    path('gst/by-rate/', compliance.gst_by_rate),
    path('gst/compliance-status/', compliance.gst_compliance_status),
    path('gst/detail/', compliance.gst_detail),

    # ─── TDS Tracker ──────────────────────────────────────────────────
    path('tds/overview/', compliance.tds_overview),
    path('tds/deductions/', compliance.tds_deductions),
    path('tds/challans/', compliance.tds_challans),
    path('tds/by-section/', compliance.tds_by_section),
    path('tds/sections/', compliance.tds_by_section),
    path('tds/trend/', compliance.tds_trend),
    path('tds/detail/', compliance.tds_detail),

    # ─── Working Capital ──────────────────────────────────────────────
    path('working-capital/overview/', working_capital.overview),
    path('working-capital/receivables/', working_capital.receivables),
    path('working-capital/payables/', working_capital.payables),
    path('working-capital/ccc/', working_capital.ccc),

    # ─── Location Benchmarking ────────────────────────────────────────
    path('location/comparison/', location.comparison),
    path('location/trend/', location.trend),
    path('location/detail/', location.detail),

    # ─── Product Intelligence ─────────────────────────────────────────
    path('product/overview/', product.overview),
    path('product/lifecycle/', product.lifecycle),
    path('product/pricing/', product.pricing),
    path('product/detail/', product.detail),

    # ─── Dispatch & Fulfillment ───────────────────────────────────────
    path('dispatch/pipeline/', dispatch.pipeline),
    path('dispatch/courier-performance/', dispatch.courier_performance),
    path('dispatch/detail/', dispatch.detail),

    # ─── Loyalty Analytics ────────────────────────────────────────────
    path('loyalty/overview/', loyalty.overview),
    path('loyalty/tiers/', loyalty.tiers),
    path('loyalty/redemption/', loyalty.redemption),
    path('loyalty/detail/', loyalty.detail),

    # ─── Audit & Data Health ──────────────────────────────────────────
    path('audit/overview/', audit.overview),
    path('audit/data-quality/', audit.data_quality),
    path('audit/pipeline-status/', audit.pipeline_status),
    path('audit/data-freshness/', audit.data_freshness),
    path('audit/user-activity/', audit.user_activity),
    path('audit/detail/', audit.detail),
]
