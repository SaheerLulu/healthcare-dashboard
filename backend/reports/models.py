"""
Denormalized reporting tables for the Healthcare Inventory Dashboard.
All dimensions are flattened into wide tables – no foreign keys, no JOINs needed at query time.
These tables are populated by ETL pipelines and are read-only for the API layer.
"""
from decimal import Decimal
from django.db import models


class ReportSales(models.Model):
    """Flat sales fact table – one row per order line item (POS + B2B combined)."""

    # Source identifiers
    source_id = models.IntegerField(db_index=True)
    source_line_id = models.IntegerField()
    source_type = models.CharField(max_length=10)  # 'pos' or 'b2b'

    # Time dimensions
    sale_date = models.DateField(db_index=True)
    sale_hour = models.IntegerField(default=0)
    sale_month = models.CharField(max_length=7, db_index=True)
    fiscal_year = models.CharField(max_length=7)

    # Order header
    invoice_no = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, blank=True)

    # Location dimension
    location_id = models.IntegerField(db_index=True)
    location_name = models.CharField(max_length=255, blank=True)

    # Channel & payment
    channel = models.CharField(max_length=10, db_index=True)  # POS / B2B
    payment_method = models.CharField(max_length=50, blank=True)

    # Customer dimension
    customer_id = models.IntegerField(null=True, blank=True, db_index=True)
    customer_name = models.CharField(max_length=255, blank=True)
    customer_type = models.CharField(max_length=50, blank=True)
    customer_city = models.CharField(max_length=100, blank=True)
    customer_state = models.CharField(max_length=100, blank=True)
    customer_payment_terms = models.CharField(max_length=50, blank=True)
    customer_credit_days = models.IntegerField(default=0)
    customer_loyalty_points = models.IntegerField(default=0)

    # Doctor dimension
    doctor_id = models.IntegerField(null=True, blank=True, db_index=True)
    doctor_name = models.CharField(max_length=255, blank=True)
    doctor_specialization = models.CharField(max_length=200, blank=True)
    doctor_hospital = models.CharField(max_length=255, blank=True)

    # Product dimension
    product_id = models.IntegerField(db_index=True)
    product_name = models.CharField(max_length=255, blank=True)
    product_code = models.CharField(max_length=100, blank=True)
    product_category = models.CharField(max_length=100, blank=True, db_index=True)
    product_subcategory = models.CharField(max_length=100, blank=True)
    product_company = models.CharField(max_length=255, blank=True)
    product_hsn_code = models.CharField(max_length=50, blank=True)
    product_gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    product_molecule = models.CharField(max_length=500, blank=True)
    product_drug_schedule = models.CharField(max_length=10, blank=True)
    product_dosage_form = models.CharField(max_length=100, blank=True)
    product_therapeutic_category = models.CharField(max_length=255, blank=True)
    product_ved_class = models.CharField(max_length=1, blank=True)

    # Batch dimension
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)

    # Measures / facts
    quantity = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    purchase_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taxable_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gross_margin = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Loyalty
    loyalty_points_redeemed = models.IntegerField(default=0)
    loyalty_redemption_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report_sales'
        indexes = [
            models.Index(fields=['sale_month', 'location_id']),
            models.Index(fields=['source_type', 'source_id']),
        ]


class ReportSalesReturns(models.Model):
    """Flat sales returns fact table – one row per return line item."""

    source_id = models.IntegerField(db_index=True)
    source_line_id = models.IntegerField()
    return_no = models.CharField(max_length=100, blank=True)
    return_type = models.CharField(max_length=10)  # 'pos' or 'b2b'

    # Time
    return_date = models.DateField(db_index=True)
    return_month = models.CharField(max_length=7, db_index=True)
    fiscal_year = models.CharField(max_length=7)

    # Reference
    original_invoice_no = models.CharField(max_length=100, blank=True)

    # Location
    location_id = models.IntegerField(db_index=True)
    location_name = models.CharField(max_length=255, blank=True)

    # Customer
    customer_id = models.IntegerField(null=True, blank=True)
    customer_name = models.CharField(max_length=255, blank=True)
    customer_type = models.CharField(max_length=50, blank=True)

    # Reason
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, blank=True)

    # Product
    product_id = models.IntegerField(db_index=True)
    product_name = models.CharField(max_length=255, blank=True)
    product_category = models.CharField(max_length=100, blank=True)
    product_company = models.CharField(max_length=255, blank=True)
    product_hsn_code = models.CharField(max_length=50, blank=True)

    # Batch
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)

    # Measures
    quantity = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report_sales_returns'


class ReportPurchases(models.Model):
    """Flat purchase fact table – one row per purchase order line item."""

    source_id = models.IntegerField(db_index=True)
    source_line_id = models.IntegerField()
    is_return = models.BooleanField(default=False)

    # Order header
    bill_no = models.CharField(max_length=100, blank=True)
    po_no = models.CharField(max_length=100, blank=True)

    # Time
    bill_date = models.DateField(null=True, blank=True, db_index=True)
    purchase_month = models.CharField(max_length=7, blank=True, db_index=True)
    fiscal_year = models.CharField(max_length=7, blank=True)

    # Location
    location_id = models.IntegerField(null=True, blank=True, db_index=True)
    location_name = models.CharField(max_length=255, blank=True)

    # Status
    state = models.CharField(max_length=20, blank=True)
    payment_type = models.CharField(max_length=50, blank=True)
    supply_type = models.CharField(max_length=10, blank=True)

    # Supplier dimension
    supplier_id = models.IntegerField(db_index=True)
    supplier_name = models.CharField(max_length=255, blank=True)
    supplier_gstin = models.CharField(max_length=50, blank=True)
    supplier_city = models.CharField(max_length=100, blank=True)
    supplier_state = models.CharField(max_length=100, blank=True)
    supplier_category = models.CharField(max_length=50, blank=True)
    supplier_payment_terms = models.CharField(max_length=50, blank=True)
    supplier_credit_days = models.IntegerField(default=0)

    # Product dimension
    product_id = models.IntegerField(null=True, blank=True, db_index=True)
    product_name = models.CharField(max_length=255, blank=True)
    product_code = models.CharField(max_length=100, blank=True)
    product_category = models.CharField(max_length=100, blank=True)
    product_subcategory = models.CharField(max_length=100, blank=True)
    product_company = models.CharField(max_length=255, blank=True)
    product_hsn_code = models.CharField(max_length=50, blank=True)
    product_gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Batch
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)

    # Measures
    quantity = models.IntegerField(default=0)
    free_qty = models.IntegerField(default=0)
    purchase_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sch_disc_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transport_cost_share = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    margin_to_mrp = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    lead_time_days = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report_purchases'
        indexes = [
            models.Index(fields=['purchase_month', 'location_id']),
        ]


class ReportInventory(models.Model):
    """Inventory snapshot table – full refresh each pipeline run."""

    snapshot_date = models.DateField(db_index=True)

    # Product dimension
    product_id = models.IntegerField(db_index=True)
    product_name = models.CharField(max_length=255, blank=True)
    product_code = models.CharField(max_length=100, blank=True)
    product_category = models.CharField(max_length=100, blank=True)
    product_subcategory = models.CharField(max_length=100, blank=True)
    product_company = models.CharField(max_length=255, blank=True)
    product_hsn_code = models.CharField(max_length=50, blank=True)
    product_gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    product_molecule = models.CharField(max_length=500, blank=True)
    product_drug_schedule = models.CharField(max_length=10, blank=True)
    product_dosage_form = models.CharField(max_length=100, blank=True)
    product_therapeutic_category = models.CharField(max_length=255, blank=True)
    product_ved_class = models.CharField(max_length=1, blank=True)
    product_is_critical = models.BooleanField(default=False)
    product_requires_cold_chain = models.BooleanField(default=False)
    product_min_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Location dimension
    location_id = models.IntegerField(db_index=True)
    location_name = models.CharField(max_length=255, blank=True)

    # Batch dimension
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)
    days_to_expiry = models.IntegerField(default=9999)
    expiry_status = models.CharField(max_length=20, blank=True, db_index=True)

    # Stock quantities
    qty_on_hand = models.IntegerField(default=0)
    reserved_qty = models.IntegerField(default=0)
    available_qty = models.IntegerField(default=0)

    # Valuation
    purchase_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_value_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_value_mrp = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Movement analytics
    total_sold_qty_90d = models.IntegerField(default=0)
    total_sold_qty_30d = models.IntegerField(default=0)
    avg_daily_demand = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    days_of_stock = models.IntegerField(default=9999)
    last_sale_date = models.DateField(null=True, blank=True)
    days_since_last_sale = models.IntegerField(default=9999)
    last_purchase_date = models.DateField(null=True, blank=True)

    # Classification
    movement_status = models.CharField(max_length=20, blank=True, db_index=True)
    abc_class = models.CharField(max_length=1, blank=True, db_index=True)
    reorder_needed = models.BooleanField(default=False)
    safety_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Efficiency metrics
    fill_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    inventory_turnover = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    gmroi = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report_inventory'
        indexes = [
            models.Index(fields=['snapshot_date', 'location_id']),
            models.Index(fields=['product_category', 'movement_status']),
        ]


class ReportFinancial(models.Model):
    """Flat financial journal entries – one row per journal entry line."""

    source_entry_id = models.IntegerField(db_index=True)
    source_line_id = models.IntegerField()

    # Entry header
    entry_no = models.CharField(max_length=20, blank=True)
    entry_date = models.DateField(db_index=True)
    entry_month = models.CharField(max_length=7, db_index=True)
    fiscal_year = models.CharField(max_length=7)
    voucher_type = models.CharField(max_length=20, db_index=True)
    reference_type = models.CharField(max_length=30, blank=True)
    reference_id = models.IntegerField(null=True, blank=True)
    is_posted = models.BooleanField(default=True)
    narration = models.TextField(blank=True)

    # Location
    location_id = models.IntegerField(null=True, blank=True, db_index=True)
    location_name = models.CharField(max_length=255, blank=True)

    # Account dimension
    account_code = models.CharField(max_length=10, db_index=True)
    account_name = models.CharField(max_length=255, blank=True)
    account_type = models.CharField(max_length=20, db_index=True)
    account_subtype = models.CharField(max_length=30, blank=True)
    parent_account_code = models.CharField(max_length=10, blank=True)
    parent_account_name = models.CharField(max_length=255, blank=True)

    # Measures
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Party dimension
    party_type = models.CharField(max_length=10, blank=True)
    party_id = models.IntegerField(null=True, blank=True)
    party_name = models.CharField(max_length=255, blank=True)
    line_narration = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report_financial'
        indexes = [
            models.Index(fields=['entry_month', 'account_type']),
            models.Index(fields=['party_type', 'party_id']),
        ]


class ReportGST(models.Model):
    """Combined GST reporting table – GSTR-1, GSTR-3B, GSTR-2B, ITC, RCM."""

    source_id = models.IntegerField(db_index=True)
    source_table = models.CharField(max_length=30, db_index=True)

    # Period
    period = models.CharField(max_length=7, db_index=True)
    fiscal_year = models.CharField(max_length=7)

    # Location
    location_id = models.IntegerField(null=True, blank=True)
    location_name = models.CharField(max_length=255, blank=True)

    # GSTR-1 fields
    invoice_no = models.CharField(max_length=100, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    invoice_type = models.CharField(max_length=20, blank=True)
    customer_gstin = models.CharField(max_length=20, blank=True)
    place_of_supply = models.CharField(max_length=5, blank=True)
    hsn_code = models.CharField(max_length=20, blank=True)
    taxable_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cess = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    source_type = models.CharField(max_length=10, blank=True)

    # GSTR-3B fields
    outward_taxable = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    outward_zero_rated = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    itc_igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    itc_cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    itc_sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable_igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable_cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable_sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    filing_status = models.CharField(max_length=10, blank=True)
    filed_date = models.DateField(null=True, blank=True)

    # GSTR-2B / ITC fields
    supplier_gstin = models.CharField(max_length=20, blank=True)
    supplier_name = models.CharField(max_length=255, blank=True)
    itc_eligible = models.BooleanField(default=True)
    match_status = models.CharField(max_length=20, blank=True)

    # RCM fields
    service_type = models.CharField(max_length=100, blank=True)
    sac_code = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report_gst'
        indexes = [
            models.Index(fields=['period', 'source_table']),
        ]


class ReportTDS(models.Model):
    """Flat TDS reporting table – deductions with challan info."""

    source_id = models.IntegerField(db_index=True)

    # Deductee
    deductee_name = models.CharField(max_length=255)
    deductee_pan = models.CharField(max_length=10, blank=True)
    section = models.CharField(max_length=10, db_index=True)
    deductee_type = models.CharField(max_length=20, blank=True)
    nature_of_payment = models.CharField(max_length=255, blank=True)

    # Time
    transaction_date = models.DateField(db_index=True)
    transaction_month = models.CharField(max_length=7)
    fiscal_year = models.CharField(max_length=7)

    # Measures
    gross_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tds_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tds_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Source
    source_type = models.CharField(max_length=20, blank=True)
    source_id_ref = models.IntegerField(null=True, blank=True)

    # Status
    status = models.CharField(max_length=20)

    # Challan
    challan_no = models.CharField(max_length=50, blank=True)
    challan_date = models.DateField(null=True, blank=True)
    bsr_code = models.CharField(max_length=20, blank=True)
    challan_total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    challan_deposit_date = models.DateField(null=True, blank=True)

    # Location
    location_id = models.IntegerField(null=True, blank=True)
    location_name = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'report_tds'
        indexes = [
            models.Index(fields=['transaction_month', 'section']),
        ]
