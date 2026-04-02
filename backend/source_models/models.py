"""
Read-only proxy models for source tables in the shared SQLite database.
These models use managed=False so Django never creates/alters these tables.
Pattern matches accounting/backend/inventory_reader/models.py.
"""
from decimal import Decimal
from django.db import models


# ═══════════════════════════════════════════════════════════════════════════════
# FROM healthcare-inventory-management
# ═══════════════════════════════════════════════════════════════════════════════


class LocationRO(models.Model):
    name = models.CharField(max_length=255)
    complete_name = models.CharField(max_length=255)
    usage = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = 'product_master_location'

    def __str__(self):
        return self.name


class SupplierRO(models.Model):
    company_name = models.CharField(max_length=255)
    license_no = models.CharField(max_length=100, blank=True)
    gst_no = models.CharField(max_length=50)
    contact_person = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    payment_terms = models.CharField(max_length=50)
    credit_days = models.IntegerField(default=0)
    category = models.CharField(max_length=50)
    status = models.CharField(max_length=20)
    location = models.ForeignKey(
        LocationRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'supplier_master_supplier'

    def __str__(self):
        return self.company_name


class CustomerRO(models.Model):
    customer_name = models.CharField(max_length=255)
    customer_code = models.CharField(max_length=100, null=True, blank=True)
    license_no = models.CharField(max_length=100, blank=True)
    gst_no = models.CharField(max_length=50, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    payment_terms = models.CharField(max_length=50)
    credit_days = models.IntegerField(default=0)
    credit_limit = models.DecimalField(max_digits=10, decimal_places=2)
    customer_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20)
    loyalty_points = models.IntegerField(default=0)
    location = models.ForeignKey(
        LocationRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'customer_master_customer'

    def __str__(self):
        return self.customer_name


class DoctorRO(models.Model):
    name = models.CharField(max_length=255)
    registration_no = models.CharField(max_length=100, blank=True)
    specialization = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    hospital_clinic = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20)
    location = models.ForeignKey(
        LocationRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'doctor_master_doctor'

    def __str__(self):
        return self.name


class ProductRO(models.Model):
    name = models.CharField(max_length=255)
    default_code = models.CharField(max_length=100, blank=True)
    barcode = models.CharField(max_length=100, blank=True)
    list_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    standard_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    uom_name = models.CharField(max_length=50, default='Nos')
    active = models.BooleanField(default=True)
    pharma_company = models.CharField(max_length=255, blank=True)
    pharma_category = models.CharField(max_length=100, blank=True)
    pharma_subcategory = models.CharField(max_length=100, blank=True)
    pharma_hsn_code = models.CharField(max_length=50, blank=True)
    pharma_gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('5.00'))
    pharma_max_discount = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pharma_packing_unit = models.CharField(max_length=50, blank=True)
    pharma_qty_per_pack = models.IntegerField(default=1)
    pharma_is_critical = models.BooleanField(default=False)
    pharma_is_non_inventory = models.BooleanField(default=False)
    pharma_rack_number = models.CharField(max_length=50, blank=True)
    pharma_min_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pharma_molecule = models.CharField(max_length=500, blank=True)
    pharma_drug_schedule = models.CharField(max_length=10, blank=True)
    pharma_dosage_form = models.CharField(max_length=100, blank=True)
    pharma_ved_classification = models.CharField(max_length=1, blank=True)
    pharma_is_antibiotic = models.BooleanField(default=False)
    pharma_is_controlled = models.BooleanField(default=False)
    pharma_requires_cold_chain = models.BooleanField(default=False)
    pharma_therapeutic_category = models.CharField(max_length=255, blank=True)
    location = models.ForeignKey(
        LocationRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'product_master_product'

    def __str__(self):
        return self.name


class StockQuantRO(models.Model):
    product = models.ForeignKey(
        ProductRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    location = models.ForeignKey(
        LocationRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    quantity = models.IntegerField(default=0)
    reserved_quantity = models.IntegerField(default=0)
    lot_id = models.IntegerField(null=True, blank=True)
    lot_name = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    purchase_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    loose_quantity = models.IntegerField(default=0)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'product_master_stockquant'


class StockMovementRO(models.Model):
    product = models.ForeignKey(
        ProductRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    location = models.ForeignKey(
        LocationRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    movement_type = models.CharField(max_length=30)
    quantity = models.IntegerField()
    quantity_before = models.IntegerField(default=0)
    quantity_after = models.IntegerField(default=0)
    lot_name = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reference_type = models.CharField(max_length=50, blank=True)
    reference_id = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'inventory_stockmovement'


# ─── Orders ───────────────────────────────────────────────────────────────────

class POSOrderRO(models.Model):
    invoice_no = models.CharField(max_length=100, blank=True)
    customer = models.ForeignKey(
        CustomerRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    location = models.ForeignKey(
        LocationRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    sale_date = models.DateTimeField()
    payment_type = models.CharField(max_length=50)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20)
    doctor = models.ForeignKey(
        DoctorRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    prescribed_by = models.CharField(max_length=200, blank=True)
    remarks = models.TextField(blank=True)
    loyalty_discount_type = models.CharField(max_length=20, blank=True)
    loyalty_points_redeemed = models.IntegerField(default=0)
    loyalty_redemption_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'pos_posorder'

    def __str__(self):
        return self.invoice_no or f"POS#{self.id}"


class POSOrderLineRO(models.Model):
    pos_order = models.ForeignKey(
        POSOrderRO, on_delete=models.DO_NOTHING,
        related_name='lines', db_constraint=False,
    )
    product = models.ForeignKey(
        ProductRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_loose = models.BooleanField(default=False)
    qty_per_pack = models.IntegerField(default=1)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'pos_posorderline'


class B2BSalesOrderRO(models.Model):
    invoice_no = models.CharField(max_length=100, blank=True)
    customer = models.ForeignKey(
        CustomerRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    location = models.ForeignKey(
        LocationRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    sale_date = models.DateField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    payment_type = models.CharField(max_length=50)
    payment_terms = models.CharField(max_length=100, blank=True)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20)
    supply_type = models.CharField(max_length=10, blank=True)
    total_cgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_sgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_igst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    freight_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'b2b_sales_b2bsalesorder'

    def __str__(self):
        return self.invoice_no or f"B2B#{self.id}"


class B2BSalesOrderLineRO(models.Model):
    sales_order = models.ForeignKey(
        B2BSalesOrderRO, on_delete=models.DO_NOTHING,
        related_name='lines', db_constraint=False,
    )
    product = models.ForeignKey(
        ProductRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    is_service = models.BooleanField(default=False)
    service_description = models.CharField(max_length=255, blank=True)
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'b2b_sales_b2bsalesorderline'


# ─── Returns ──────────────────────────────────────────────────────────────────

class SalesReturnRO(models.Model):
    return_no = models.CharField(max_length=100, blank=True)
    return_type = models.CharField(max_length=10)
    customer = models.ForeignKey(
        CustomerRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    location = models.ForeignKey(
        LocationRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    original_order = models.ForeignKey(
        POSOrderRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    original_b2b_order = models.ForeignKey(
        B2BSalesOrderRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    return_date = models.DateTimeField()
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20)
    reason = models.TextField(blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sales_return_salesreturn'

    def __str__(self):
        return self.return_no or f"RET#{self.id}"


class SalesReturnLineRO(models.Model):
    sales_return = models.ForeignKey(
        SalesReturnRO, on_delete=models.DO_NOTHING,
        related_name='lines', db_constraint=False,
    )
    product = models.ForeignKey(
        ProductRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'sales_return_salesreturnline'


class PurchaseOrderRO(models.Model):
    supplier = models.ForeignKey(
        SupplierRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    bill_no = models.CharField(max_length=100)
    bill_date = models.DateField(null=True, blank=True)
    po_no = models.CharField(max_length=100, blank=True)
    po_date = models.DateField(null=True, blank=True)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_type = models.CharField(max_length=50)
    transport_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    remarks = models.TextField(blank=True)
    state = models.CharField(max_length=50)
    supply_type = models.CharField(max_length=10, blank=True)
    total_cgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_sgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_igst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    location = models.ForeignKey(
        LocationRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'purchase_entry_purchaseorder'

    def __str__(self):
        return f"{self.bill_no} ({self.state})"


class PurchaseOrderLineRO(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrderRO, on_delete=models.DO_NOTHING,
        related_name='lines', db_constraint=False,
    )
    product = models.ForeignKey(
        ProductRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    product_code = models.CharField(max_length=100, blank=True)
    product_name = models.CharField(max_length=255, blank=True)
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)
    quantity = models.IntegerField()
    free_qty = models.IntegerField(default=0)
    purchase_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sch_disc_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    qty_per_pack = models.IntegerField(default=1)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'purchase_entry_purchaseorderline'


class PurchaseReturnRO(models.Model):
    return_no = models.CharField(max_length=100, blank=True)
    supplier = models.ForeignKey(
        SupplierRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    location = models.ForeignKey(
        LocationRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    original_purchase_order = models.ForeignKey(
        PurchaseOrderRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    return_date = models.DateTimeField()
    supply_type = models.CharField(max_length=10, blank=True)
    total_cgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_sgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_igst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20)
    reason = models.TextField(blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'purchase_return_purchasereturn'

    def __str__(self):
        return self.return_no or f"PRET#{self.id}"


class PurchaseReturnLineRO(models.Model):
    purchase_return = models.ForeignKey(
        PurchaseReturnRO, on_delete=models.DO_NOTHING,
        related_name='lines', db_constraint=False,
    )
    product = models.ForeignKey(
        ProductRO, null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    batch_no = models.CharField(max_length=100, blank=True)
    expiry_month = models.CharField(max_length=7, blank=True)
    quantity = models.IntegerField()
    purchase_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'purchase_return_purchasereturnline'


# ─── Dispatch ─────────────────────────────────────────────────────────────────

class DispatchEntryRO(models.Model):
    source_type = models.CharField(max_length=20)
    source_order_id = models.IntegerField(null=True, blank=True)
    invoice_no = models.CharField(max_length=100, blank=True)
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=20, blank=True)
    delivery_address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    dispatch_mode = models.CharField(max_length=20)
    courier_partner = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=200, blank=True)
    no_of_packages = models.IntegerField(default=1)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    invoice_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    freight_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    dispatch_date = models.DateField(null=True, blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20)
    eway_bill_no = models.CharField(max_length=50, blank=True)
    location = models.ForeignKey(
        LocationRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dispatch_dispatchentry'


# ═══════════════════════════════════════════════════════════════════════════════
# FROM accounting app (same shared DB)
# ═══════════════════════════════════════════════════════════════════════════════


class ChartOfAccountRO(models.Model):
    account_code = models.CharField(max_length=10)
    account_name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20)
    account_subtype = models.CharField(max_length=30, blank=True)
    parent = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.DO_NOTHING, db_constraint=False,
    )
    is_leaf = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        managed = False
        db_table = 'core_chartofaccount'

    def __str__(self):
        return f"{self.account_code} - {self.account_name}"


class AccountingSettingsRO(models.Model):
    company_name = models.CharField(max_length=255)
    gstin = models.CharField(max_length=15, blank=True)
    tan = models.CharField(max_length=10, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    state_code = models.CharField(max_length=2, blank=True)
    financial_year_start = models.IntegerField(default=4)

    class Meta:
        managed = False
        db_table = 'core_accountingsettings'


class JournalEntryRO(models.Model):
    entry_no = models.CharField(max_length=20)
    date = models.DateField()
    narration = models.TextField(blank=True)
    voucher_type = models.CharField(max_length=20)
    reference_type = models.CharField(max_length=30, blank=True)
    reference_id = models.PositiveIntegerField(null=True, blank=True)
    is_posted = models.BooleanField(default=False)
    location_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'journals_journalentry'

    def __str__(self):
        return self.entry_no


class JournalEntryLineRO(models.Model):
    entry = models.ForeignKey(
        JournalEntryRO, on_delete=models.DO_NOTHING,
        related_name='lines', db_constraint=False,
    )
    account = models.ForeignKey(
        ChartOfAccountRO, on_delete=models.DO_NOTHING, db_constraint=False,
    )
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    narration = models.CharField(max_length=500, blank=True)
    party_type = models.CharField(max_length=10, default='None')
    party_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'journals_journalentryline'


# ─── GST Returns ──────────────────────────────────────────────────────────────

class GSTR1EntryRO(models.Model):
    period = models.CharField(max_length=7)
    location_id = models.PositiveIntegerField(null=True, blank=True)
    invoice_no = models.CharField(max_length=100, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    customer_gstin = models.CharField(max_length=20, blank=True)
    invoice_type = models.CharField(max_length=20)
    place_of_supply = models.CharField(max_length=5, blank=True)
    taxable_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cess = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    hsn_code = models.CharField(max_length=20, blank=True)
    rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    source_type = models.CharField(max_length=10, blank=True)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'gst_returns_gstr1entry'


class GSTR3BSummaryRO(models.Model):
    period = models.CharField(max_length=7)
    location_id = models.PositiveIntegerField(null=True, blank=True)
    outward_taxable = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    outward_igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    outward_cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    outward_sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    outward_zero_rated = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    itc_igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    itc_cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    itc_sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable_igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable_cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_payable_sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=10, blank=True)
    filed_date = models.DateField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'gst_returns_gstr3bsummary'


class GSTR2BEntryRO(models.Model):
    period = models.CharField(max_length=7)
    location_id = models.PositiveIntegerField(null=True, blank=True)
    supplier_gstin = models.CharField(max_length=20, blank=True)
    supplier_name = models.CharField(max_length=255, blank=True)
    invoice_no = models.CharField(max_length=100, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    taxable_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    itc_eligible = models.BooleanField(default=True)
    match_status = models.CharField(max_length=20, blank=True)
    source_po_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'gst_returns_gstr2bentry'


class ITCReconciliationRO(models.Model):
    period = models.CharField(max_length=7)
    location_id = models.PositiveIntegerField(null=True, blank=True)
    supplier_gstin = models.CharField(max_length=20, blank=True)
    books_taxable = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    books_cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    books_sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    books_igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gstr2b_taxable = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gstr2b_cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gstr2b_sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gstr2b_igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=20, blank=True)
    action_taken = models.TextField(blank=True)

    class Meta:
        managed = False
        db_table = 'gst_returns_itcreconciliation'


class RCMEntryRO(models.Model):
    period = models.CharField(max_length=7)
    location_id = models.PositiveIntegerField(null=True, blank=True)
    supplier_gstin = models.CharField(max_length=20, blank=True)
    supplier_name = models.CharField(max_length=255, blank=True)
    service_type = models.CharField(max_length=100, blank=True)
    sac_code = models.CharField(max_length=20, blank=True)
    taxable_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        managed = False
        db_table = 'gst_returns_rcmentry'


# ─── TDS ──────────────────────────────────────────────────────────────────────

class TDSDeductionRO(models.Model):
    deductee_name = models.CharField(max_length=255)
    deductee_pan = models.CharField(max_length=10, blank=True)
    section = models.CharField(max_length=10)
    deductee_type = models.CharField(max_length=20)
    nature_of_payment = models.CharField(max_length=255, blank=True)
    transaction_date = models.DateField()
    gross_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tds_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tds_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    source_type = models.CharField(max_length=20, blank=True)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20)
    challan_no = models.CharField(max_length=50, blank=True)
    challan_date = models.DateField(null=True, blank=True)
    bsr_code = models.CharField(max_length=20, blank=True)
    location_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'tds_tdsdeduction'


class TDSChallanRO(models.Model):
    challan_no = models.CharField(max_length=50)
    bsr_code = models.CharField(max_length=20, blank=True)
    deposit_date = models.DateField(null=True, blank=True)
    period = models.CharField(max_length=7, blank=True)
    section = models.CharField(max_length=10, blank=True)
    total_tds_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        managed = False
        db_table = 'tds_tdschallan'


# ─── Audit ────────────────────────────────────────────────────────────────────

class AuditLogRO(models.Model):
    timestamp = models.DateTimeField()
    user_id = models.PositiveIntegerField(null=True, blank=True)
    action = models.CharField(max_length=20)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'audit_auditlog'
