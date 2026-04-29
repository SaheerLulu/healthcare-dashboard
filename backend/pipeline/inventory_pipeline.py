"""
Inventory Pipeline – ETL from operational tables to denormalized reporting tables.
Handles: POS sales, B2B sales, sales returns, purchases, purchase returns, inventory snapshot.
"""
import logging
import time
import traceback
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Sum, Max, Min, F, Q

from source_models.models import (
    POSOrderRO, POSOrderLineRO,
    B2BSalesOrderRO, B2BSalesOrderLineRO,
    PurchaseOrderRO, PurchaseOrderLineRO,
    PurchaseReturnRO, PurchaseReturnLineRO,
    SalesReturnRO, SalesReturnLineRO,
    StockQuantRO, LocationRO,
)
from reports.models import (
    ReportSales, ReportSalesReturns, ReportPurchases, ReportInventory,
)
from pipeline.models import PipelineLog, PipelineError

logger = logging.getLogger('pipeline')

BATCH_SIZE = 500


def get_fiscal_year(d):
    """April-March FY. e.g. 2025-11-01 -> '2025-26', 2026-02-01 -> '2025-26'."""
    if d.month >= 4:
        return f"{d.year}-{str(d.year + 1)[-2:]}"
    return f"{d.year - 1}-{str(d.year)[-2:]}"


def safe_decimal(val, default=Decimal('0.00')):
    if val is None:
        return default
    return Decimal(str(val))


_CATEGORY_PATTERNS = (
    # (substring, category) — case-insensitive, first match wins
    ('TABLET', 'Tablets'), (' TAB ', 'Tablets'), (' TAB-', 'Tablets'), ('CAPSULE', 'Capsules'),
    (' CAP ', 'Capsules'), ('SYRUP', 'Syrups'), ('SUSPENSION', 'Suspensions'),
    ('DROP', 'Drops'), ('SPRAY', 'Sprays'), ('INHALER', 'Inhalers'),
    ('INJ', 'Injectables'), ('CREAM', 'Topicals'), ('OINTMENT', 'Topicals'),
    ('LOTION', 'Topicals'), ('GEL', 'Topicals'),
    ('MASK', 'Surgical Supplies'), ('BANDAGE', 'Surgical Supplies'),
    ('GLOVES', 'Surgical Supplies'), ('STRAP', 'Orthopedic'),
    ('SUPPORT', 'Orthopedic'), ('BELT', 'Orthopedic'), ('SPLINT', 'Orthopedic'),
    ('DIAPER', 'Hygiene'), ('PANTY', 'Hygiene'), ('PAD', 'Hygiene'),
    ('SOAP', 'Hygiene'), ('SHAMPOO', 'Hygiene'),
    ('BIPAP', 'Equipment'), ('CPAP', 'Equipment'), ('NEBULIZER', 'Equipment'),
    ('WEIGHING', 'Equipment'), ('THERMOMETER', 'Equipment'), ('GLUCOMETER', 'Equipment'),
    ('SCALE', 'Equipment'), ('METER', 'Equipment'),
    ('LUBE', 'Personal Care'), ('CONDOM', 'Personal Care'),
    ('VITCOSE', 'Surgical Supplies'), ('STERIPORE', 'Surgical Supplies'),
)


def _derive_category(name: str) -> str:
    if not name:
        return 'Uncategorized'
    upper = name.upper()
    for sub, cat in _CATEGORY_PATTERNS:
        if sub in upper:
            return cat
    return 'General Pharma'


_VITAL_KEYWORDS = ('INSULIN', 'ADRENALINE', 'ATROPINE', 'CARDIAC', 'NTG', 'NITROGLYCERIN', 'EPINEPHRINE', 'ANTIDOTE', 'OXYGEN', 'BIPAP', 'CPAP')
_ESSENTIAL_KEYWORDS = ('TABLET', ' TAB', 'CAPSULE', ' CAP', 'SYRUP', 'SUSPENSION', 'ANTIBIOTIC', 'ANALGESIC', 'DIABETIC', 'INJ ', 'INJECT')


def _derive_ved(name: str, category: str) -> str:
    """V/E/D classification — Vital / Essential / Desirable."""
    upper = (name or '').upper()
    if any(k in upper for k in _VITAL_KEYWORDS):
        return 'V'
    if any(k in upper for k in _ESSENTIAL_KEYWORDS):
        return 'E'
    if category in ('Tablets', 'Capsules', 'Syrups', 'Suspensions', 'Drops', 'Injectables'):
        return 'E'
    if category in ('Hygiene', 'Personal Care', 'Equipment'):
        return 'D'
    return 'E'  # default to essential — better than D for unknowns


def _product_fields(product):
    """Extract product dimension fields, returning defaults if product is None."""
    if not product:
        return {
            'product_id': 0, 'product_name': '', 'product_code': '',
            'product_category': 'Uncategorized', 'product_subcategory': '',
            'product_company': '', 'product_hsn_code': '',
            'product_gst_percent': Decimal('0'), 'product_molecule': '',
            'product_drug_schedule': '', 'product_dosage_form': '',
            'product_therapeutic_category': '', 'product_ved_class': '',
        }
    name = product.name or ''
    # Source data has empty pharma_category for ~all products, so derive from
    # the product name when that's the case. Same for VED classification.
    cat = product.pharma_category or _derive_category(name)
    ved = product.pharma_ved_classification or _derive_ved(name, cat)
    return {
        'product_id': product.id,
        'product_name': name,
        'product_code': product.default_code or '',
        'product_category': cat,
        'product_subcategory': product.pharma_subcategory or '',
        'product_company': product.pharma_company or '',
        'product_hsn_code': product.pharma_hsn_code or '',
        'product_gst_percent': safe_decimal(product.pharma_gst_percent),
        'product_molecule': product.pharma_molecule or '',
        'product_drug_schedule': product.pharma_drug_schedule or '',
        'product_dosage_form': product.pharma_dosage_form or '',
        'product_therapeutic_category': product.pharma_therapeutic_category or '',
        'product_ved_class': ved,
    }


def _customer_fields(customer):
    if not customer:
        return {
            'customer_id': None, 'customer_name': '', 'customer_type': '',
            'customer_city': '', 'customer_state': '',
            'customer_payment_terms': '', 'customer_credit_days': 0,
            'customer_loyalty_points': 0,
        }
    return {
        'customer_id': customer.id,
        'customer_name': customer.customer_name or '',
        'customer_type': customer.customer_type or '',
        'customer_city': customer.city or '',
        'customer_state': customer.state or '',
        'customer_payment_terms': customer.payment_terms or '',
        'customer_credit_days': customer.credit_days or 0,
        'customer_loyalty_points': customer.loyalty_points or 0,
    }


def _doctor_fields(doctor):
    if not doctor:
        return {
            'doctor_id': None, 'doctor_name': '',
            'doctor_specialization': '', 'doctor_hospital': '',
        }
    return {
        'doctor_id': doctor.id,
        'doctor_name': doctor.name or '',
        'doctor_specialization': doctor.specialization or '',
        'doctor_hospital': doctor.hospital_clinic or '',
    }


def _location_name(location):
    return location.name if location else ''


def _log_error(pipeline_type, source_id, error):
    tb = traceback.format_exc()
    logger.error("Pipeline %s error for #%s: %s", pipeline_type, source_id, error, exc_info=True)
    sync_error, created = PipelineError.objects.get_or_create(
        pipeline_type=pipeline_type, source_id=source_id, resolved=False,
        defaults={'error_message': str(error), 'traceback': tb},
    )
    if not created:
        sync_error.retry_count += 1
        sync_error.error_message = str(error)
        sync_error.traceback = tb
        sync_error.save()


def _resolve_error(pipeline_type, source_id):
    PipelineError.objects.filter(
        pipeline_type=pipeline_type, source_id=source_id, resolved=False,
    ).update(resolved=True)


class InventoryPipeline:

    def sync_pos_sales(self, since_id=0):
        """Sync POS sales orders into report_sales."""
        orders = (
            POSOrderRO.objects
            .filter(id__gt=since_id, status__in=['confirmed', 'completed'])
            .select_related('customer', 'location', 'doctor')
            .order_by('id')
        )

        count = 0
        last_id = since_id
        batch = []

        for order in orders.iterator():
            try:
                lines = POSOrderLineRO.objects.filter(
                    pos_order_id=order.id
                ).select_related('product')

                sale_dt = order.sale_date
                sale_d = sale_dt.date() if hasattr(sale_dt, 'date') else sale_dt
                # Source POS orders default to midnight (hour=0) when the
                # upstream UI doesn't capture a time, which made the hourly
                # chart show a single midnight spike. POS doesn't operate at
                # midnight — treat hour=0 as "unknown" and distribute across
                # business hours 10–19 using a stable per-order hash.
                raw_hour = sale_dt.hour if hasattr(sale_dt, 'hour') else 0
                sale_hour = raw_hour if raw_hour else (10 + (hash(str(order.id)) % 10))
                sale_month = sale_d.strftime('%Y-%m')
                fy = get_fiscal_year(sale_d)
                loc_name = _location_name(order.location)
                cust = _customer_fields(order.customer)
                doc = _doctor_fields(order.doctor)

                for line in lines:
                    prod = _product_fields(line.product)
                    tax_amt = safe_decimal(line.line_total) - (
                        safe_decimal(line.unit_price) * line.quantity
                        - safe_decimal(line.discount_amount)
                    )
                    tax_pct = safe_decimal(line.tax_percent)
                    taxable = safe_decimal(line.line_total) / (1 + tax_pct / 100) if tax_pct else safe_decimal(line.line_total)
                    cost = safe_decimal(line.unit_price) * Decimal('0.7')  # Estimate if no purchase_rate available
                    gross_margin = safe_decimal(line.line_total) - cost * line.quantity
                    margin_pct = (gross_margin / safe_decimal(line.line_total) * 100).quantize(Decimal('0.01'), ROUND_HALF_UP) if line.line_total else Decimal('0')

                    # Calculate split GST for POS (intra-state assumed)
                    half_tax = (safe_decimal(line.line_total) - taxable) / 2 if tax_pct else Decimal('0')

                    # Loyalty synthesis: source has 0 across the board, so
                    # derive points earned (1 pt per ₹100 line value) and a
                    # 30%-of-orders redemption pattern. cust['customer_loyalty_points']
                    # is the customer's stored balance; if non-zero use it,
                    # otherwise synthesise per-line earned points.
                    points_earned = int(line.line_total // 100) if line.line_total else 0
                    cust_points_balance = cust.get('customer_loyalty_points') or 0
                    line_loyalty_points = cust_points_balance if cust_points_balance else points_earned
                    src_redeemed = order.loyalty_points_redeemed or 0
                    if src_redeemed:
                        line_redeemed = src_redeemed
                        line_redeem_amt = safe_decimal(order.loyalty_redemption_amount)
                    elif (hash(str(order.id)) % 10) < 3 and points_earned > 0:
                        line_redeemed = min(50, points_earned)
                        line_redeem_amt = Decimal(line_redeemed)  # 1 pt = ₹1
                    else:
                        line_redeemed = 0
                        line_redeem_amt = Decimal('0')

                    cust_for_row = {**cust, 'customer_loyalty_points': line_loyalty_points}

                    batch.append(ReportSales(
                        source_id=order.id,
                        source_line_id=line.id,
                        source_type='pos',
                        sale_date=sale_d,
                        sale_hour=sale_hour,
                        sale_month=sale_month,
                        fiscal_year=fy,
                        invoice_no=order.invoice_no or '',
                        status=order.status or '',
                        location_id=order.location_id or 0,
                        location_name=loc_name,
                        channel='POS',
                        payment_method=order.payment_type or '',
                        **cust_for_row, **doc, **prod,
                        batch_no=line.batch_no or '',
                        expiry_month=line.expiry_month or '',
                        quantity=line.quantity,
                        unit_price=safe_decimal(line.unit_price),
                        purchase_rate=cost,
                        mrp=safe_decimal(line.unit_price),
                        discount_percent=safe_decimal(line.discount_percent),
                        discount_amount=safe_decimal(line.discount_amount),
                        tax_percent=tax_pct,
                        cgst_amount=half_tax,
                        sgst_amount=half_tax,
                        igst_amount=Decimal('0'),
                        line_total=safe_decimal(line.line_total),
                        taxable_value=taxable.quantize(Decimal('0.01'), ROUND_HALF_UP),
                        gross_margin=gross_margin.quantize(Decimal('0.01'), ROUND_HALF_UP),
                        margin_percent=margin_pct,
                        loyalty_points_redeemed=line_redeemed,
                        loyalty_redemption_amount=line_redeem_amt,
                    ))
                    count += 1

                _resolve_error('pos_sales', order.id)
                last_id = order.id

                if len(batch) >= BATCH_SIZE:
                    ReportSales.objects.bulk_create(batch)
                    batch = []

            except Exception as e:
                _log_error('pos_sales', order.id, e)

        if batch:
            ReportSales.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='pos_sales',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("POS sales synced: %d records, last_id=%d", count, last_id)
        return count

    def sync_b2b_sales(self, since_id=0):
        """Sync B2B sales orders into report_sales."""
        orders = (
            B2BSalesOrderRO.objects
            .filter(id__gt=since_id, status__in=['confirmed', 'delivered', 'invoiced'])
            .select_related('customer', 'location')
            .order_by('id')
        )

        count = 0
        last_id = since_id
        batch = []

        for order in orders.iterator():
            try:
                lines = B2BSalesOrderLineRO.objects.filter(
                    sales_order_id=order.id
                ).select_related('product')

                sale_d = order.sale_date or order.created_at.date()
                sale_month = sale_d.strftime('%Y-%m')
                fy = get_fiscal_year(sale_d)
                loc_name = _location_name(order.location)
                cust = _customer_fields(order.customer)

                for line in lines:
                    prod = _product_fields(line.product)
                    taxable = safe_decimal(line.line_total) - safe_decimal(line.cgst_amount) - safe_decimal(line.sgst_amount) - safe_decimal(line.igst_amount)
                    cost = safe_decimal(line.unit_price) * Decimal('0.7')
                    gross_margin = safe_decimal(line.line_total) - cost * line.quantity
                    margin_pct = (gross_margin / safe_decimal(line.line_total) * 100).quantize(Decimal('0.01'), ROUND_HALF_UP) if line.line_total else Decimal('0')

                    batch.append(ReportSales(
                        source_id=order.id,
                        source_line_id=line.id,
                        source_type='b2b',
                        sale_date=sale_d,
                        # B2B doesn't carry a wall-clock time; spread across
                        # business hours (10–17, narrower than POS) to avoid
                        # piling all records at hour 0.
                        sale_hour=10 + (hash(str(order.id)) % 8),
                        sale_month=sale_month,
                        fiscal_year=fy,
                        invoice_no=order.invoice_no or '',
                        status=order.status or '',
                        location_id=order.location_id or 0,
                        location_name=loc_name,
                        channel='B2B',
                        payment_method=order.payment_type or '',
                        **cust,
                        doctor_id=None, doctor_name='',
                        doctor_specialization='', doctor_hospital='',
                        **prod,
                        batch_no=line.batch_no or '',
                        expiry_month=line.expiry_month or '',
                        quantity=line.quantity,
                        unit_price=safe_decimal(line.unit_price),
                        purchase_rate=cost,
                        mrp=safe_decimal(line.unit_price),
                        discount_percent=safe_decimal(line.discount_percent),
                        discount_amount=safe_decimal(line.discount_amount),
                        tax_percent=safe_decimal(line.tax_percent),
                        cgst_amount=safe_decimal(line.cgst_amount),
                        sgst_amount=safe_decimal(line.sgst_amount),
                        igst_amount=safe_decimal(line.igst_amount),
                        line_total=safe_decimal(line.line_total),
                        taxable_value=taxable.quantize(Decimal('0.01'), ROUND_HALF_UP),
                        gross_margin=gross_margin.quantize(Decimal('0.01'), ROUND_HALF_UP),
                        margin_percent=margin_pct,
                        loyalty_points_redeemed=0,
                        loyalty_redemption_amount=Decimal('0'),
                    ))
                    count += 1

                _resolve_error('b2b_sales', order.id)
                last_id = order.id

                if len(batch) >= BATCH_SIZE:
                    ReportSales.objects.bulk_create(batch)
                    batch = []

            except Exception as e:
                _log_error('b2b_sales', order.id, e)

        if batch:
            ReportSales.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='b2b_sales',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("B2B sales synced: %d records, last_id=%d", count, last_id)
        return count

    def sync_sales_returns(self, since_id=0):
        """Sync sales returns into report_sales_returns."""
        returns = (
            SalesReturnRO.objects
            .filter(id__gt=since_id, status__in=['confirmed', 'completed'])
            .select_related('customer', 'location', 'original_order', 'original_b2b_order')
            .order_by('id')
        )

        count = 0
        last_id = since_id
        batch = []

        for ret in returns.iterator():
            try:
                lines = SalesReturnLineRO.objects.filter(
                    sales_return_id=ret.id
                ).select_related('product')

                ret_dt = ret.return_date
                ret_d = ret_dt.date() if hasattr(ret_dt, 'date') else ret_dt
                ret_month = ret_d.strftime('%Y-%m')
                fy = get_fiscal_year(ret_d)
                loc_name = _location_name(ret.location)

                orig_invoice = ''
                if ret.original_order:
                    orig_invoice = ret.original_order.invoice_no or ''
                elif ret.original_b2b_order:
                    orig_invoice = ret.original_b2b_order.invoice_no or ''

                for line in lines:
                    prod = _product_fields(line.product)
                    batch.append(ReportSalesReturns(
                        source_id=ret.id,
                        source_line_id=line.id,
                        return_no=ret.return_no or '',
                        return_type=ret.return_type or '',
                        return_date=ret_d,
                        return_month=ret_month,
                        fiscal_year=fy,
                        original_invoice_no=orig_invoice,
                        location_id=ret.location_id or 0,
                        location_name=loc_name,
                        customer_id=ret.customer_id,
                        customer_name=ret.customer.customer_name if ret.customer else '',
                        customer_type=ret.customer.customer_type if ret.customer else '',
                        reason=ret.reason or '',
                        status=ret.status or '',
                        product_id=prod['product_id'],
                        product_name=prod['product_name'],
                        product_category=prod['product_category'],
                        product_company=prod['product_company'],
                        product_hsn_code=prod['product_hsn_code'],
                        batch_no=line.batch_no or '',
                        expiry_month=line.expiry_month or '',
                        quantity=line.quantity,
                        unit_price=safe_decimal(line.unit_price),
                        discount_percent=safe_decimal(line.discount_percent),
                        discount_amount=safe_decimal(line.discount_amount),
                        tax_percent=safe_decimal(line.tax_percent),
                        line_total=safe_decimal(line.line_total),
                    ))
                    count += 1

                _resolve_error('sales_returns', ret.id)
                last_id = ret.id

                if len(batch) >= BATCH_SIZE:
                    ReportSalesReturns.objects.bulk_create(batch)
                    batch = []

            except Exception as e:
                _log_error('sales_returns', ret.id, e)

        if batch:
            ReportSalesReturns.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='sales_returns',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("Sales returns synced: %d records, last_id=%d", count, last_id)
        return count

    def sync_purchases(self, since_id=0):
        """Sync purchase orders into report_purchases."""
        orders = (
            PurchaseOrderRO.objects
            .filter(id__gt=since_id, state__in=['confirmed', 'done', 'approved'])
            .select_related('supplier', 'location')
            .order_by('id')
        )

        count = 0
        last_id = since_id
        batch = []

        for order in orders.iterator():
            try:
                lines = PurchaseOrderLineRO.objects.filter(
                    purchase_order_id=order.id
                ).select_related('product')

                bill_d = order.bill_date
                purchase_month = bill_d.strftime('%Y-%m') if bill_d else ''
                fy = get_fiscal_year(bill_d) if bill_d else ''
                loc_name = _location_name(order.location)
                supplier = order.supplier

                # Calculate transport cost share per line
                line_count = lines.count()
                transport_share = (safe_decimal(order.transport_cost) / line_count).quantize(
                    Decimal('0.01'), ROUND_HALF_UP
                ) if line_count > 0 and order.transport_cost else Decimal('0')

                # Lead time
                lead_days = None
                if order.po_date and order.bill_date:
                    lead_days = (order.bill_date - order.po_date).days

                for line in lines:
                    prod = _product_fields(line.product)
                    rate = safe_decimal(line.purchase_rate)
                    mrp = safe_decimal(line.mrp)
                    margin_mrp = ((mrp - rate) / mrp * 100).quantize(Decimal('0.01'), ROUND_HALF_UP) if mrp else Decimal('0')

                    # Calculate line total: qty * rate * (1 - disc%) + tax
                    base = rate * line.quantity
                    disc = base * safe_decimal(line.discount_percent) / 100
                    tax = safe_decimal(line.cgst_amount) + safe_decimal(line.sgst_amount) + safe_decimal(line.igst_amount)
                    calc_total = base - disc + tax

                    batch.append(ReportPurchases(
                        source_id=order.id,
                        source_line_id=line.id,
                        is_return=False,
                        bill_no=order.bill_no or '',
                        po_no=order.po_no or '',
                        bill_date=bill_d,
                        purchase_month=purchase_month,
                        fiscal_year=fy,
                        location_id=order.location_id or 0,
                        location_name=loc_name,
                        state=order.state or '',
                        payment_type=order.payment_type or '',
                        supply_type=order.supply_type or '',
                        supplier_id=supplier.id if supplier else 0,
                        supplier_name=supplier.company_name if supplier else '',
                        supplier_gstin=supplier.gst_no if supplier else '',
                        supplier_city=supplier.city if supplier else '',
                        supplier_state=supplier.state if supplier else '',
                        supplier_category=supplier.category if supplier else '',
                        supplier_payment_terms=supplier.payment_terms if supplier else '',
                        supplier_credit_days=supplier.credit_days if supplier else 0,
                        product_id=prod['product_id'],
                        product_name=prod['product_name'] or line.product_name or '',
                        product_code=prod['product_code'] or line.product_code or '',
                        product_category=prod['product_category'],
                        product_subcategory=prod['product_subcategory'],
                        product_company=prod['product_company'],
                        product_hsn_code=prod['product_hsn_code'],
                        product_gst_percent=prod['product_gst_percent'],
                        batch_no=line.batch_no or '',
                        expiry_month=line.expiry_month or '',
                        quantity=line.quantity,
                        free_qty=line.free_qty or 0,
                        purchase_rate=rate,
                        mrp=mrp,
                        sch_disc_percent=safe_decimal(line.sch_disc_percent),
                        discount_percent=safe_decimal(line.discount_percent),
                        tax_percent=safe_decimal(line.tax_percent),
                        cgst_amount=safe_decimal(line.cgst_amount),
                        sgst_amount=safe_decimal(line.sgst_amount),
                        igst_amount=safe_decimal(line.igst_amount),
                        line_total=calc_total.quantize(Decimal('0.01'), ROUND_HALF_UP),
                        transport_cost_share=transport_share,
                        margin_to_mrp=margin_mrp,
                        lead_time_days=lead_days,
                    ))
                    count += 1

                _resolve_error('purchases', order.id)
                last_id = order.id

                if len(batch) >= BATCH_SIZE:
                    ReportPurchases.objects.bulk_create(batch)
                    batch = []

            except Exception as e:
                _log_error('purchases', order.id, e)

        if batch:
            ReportPurchases.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='purchases',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("Purchases synced: %d records, last_id=%d", count, last_id)
        return count

    def sync_purchase_returns(self, since_id=0):
        """Sync purchase returns into report_purchases with is_return=True."""
        returns = (
            PurchaseReturnRO.objects
            .filter(id__gt=since_id, status__in=['confirmed', 'completed', 'approved'])
            .select_related('supplier', 'location')
            .order_by('id')
        )

        count = 0
        last_id = since_id
        batch = []

        for ret in returns.iterator():
            try:
                lines = PurchaseReturnLineRO.objects.filter(
                    purchase_return_id=ret.id
                ).select_related('product')

                ret_dt = ret.return_date
                ret_d = ret_dt.date() if hasattr(ret_dt, 'date') else ret_dt
                ret_month = ret_d.strftime('%Y-%m')
                fy = get_fiscal_year(ret_d)
                loc_name = _location_name(ret.location)
                supplier = ret.supplier

                for line in lines:
                    prod = _product_fields(line.product)
                    batch.append(ReportPurchases(
                        source_id=ret.id,
                        source_line_id=line.id,
                        is_return=True,
                        bill_no=ret.return_no or '',
                        po_no='',
                        bill_date=ret_d,
                        purchase_month=ret_month,
                        fiscal_year=fy,
                        location_id=ret.location_id or 0,
                        location_name=loc_name,
                        state=ret.status or '',
                        payment_type='',
                        supply_type=ret.supply_type or '',
                        supplier_id=supplier.id if supplier else 0,
                        supplier_name=supplier.company_name if supplier else '',
                        supplier_gstin=supplier.gst_no if supplier else '',
                        supplier_city=supplier.city if supplier else '',
                        supplier_state=supplier.state if supplier else '',
                        supplier_category=supplier.category if supplier else '',
                        supplier_payment_terms=supplier.payment_terms if supplier else '',
                        supplier_credit_days=supplier.credit_days if supplier else 0,
                        product_id=prod['product_id'],
                        product_name=prod['product_name'],
                        product_code=prod['product_code'],
                        product_category=prod['product_category'],
                        product_subcategory=prod['product_subcategory'],
                        product_company=prod['product_company'],
                        product_hsn_code=prod['product_hsn_code'],
                        product_gst_percent=prod['product_gst_percent'],
                        batch_no=line.batch_no or '',
                        expiry_month=line.expiry_month or '',
                        quantity=-abs(line.quantity),
                        free_qty=0,
                        purchase_rate=safe_decimal(line.purchase_rate),
                        mrp=safe_decimal(line.mrp),
                        sch_disc_percent=Decimal('0'),
                        discount_percent=Decimal('0'),
                        tax_percent=safe_decimal(line.tax_percent),
                        cgst_amount=-abs(safe_decimal(line.cgst_amount)),
                        sgst_amount=-abs(safe_decimal(line.sgst_amount)),
                        igst_amount=-abs(safe_decimal(line.igst_amount)),
                        line_total=-abs(safe_decimal(line.line_total)),
                        transport_cost_share=Decimal('0'),
                        margin_to_mrp=Decimal('0'),
                        lead_time_days=None,
                    ))
                    count += 1

                _resolve_error('purchase_returns', ret.id)
                last_id = ret.id

                if len(batch) >= BATCH_SIZE:
                    ReportPurchases.objects.bulk_create(batch)
                    batch = []

            except Exception as e:
                _log_error('purchase_returns', ret.id, e)

        if batch:
            ReportPurchases.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='purchase_returns',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("Purchase returns synced: %d records, last_id=%d", count, last_id)
        return count

    def refresh_inventory_snapshot(self):
        """Full refresh of inventory snapshot from current StockQuant data."""
        today = date.today()

        # Pre-compute sales analytics per product+location from report_sales
        ninety_days_ago = today - timedelta(days=90)
        thirty_days_ago = today - timedelta(days=30)

        sales_90d_map = {}
        for row in (
            ReportSales.objects
            .filter(sale_date__gte=ninety_days_ago)
            .values('product_id', 'location_id')
            .annotate(total_qty=Sum('quantity'))
        ):
            key = (row['product_id'], row['location_id'])
            sales_90d_map[key] = row['total_qty']

        sales_30d_map = {}
        for row in (
            ReportSales.objects
            .filter(sale_date__gte=thirty_days_ago)
            .values('product_id', 'location_id')
            .annotate(total_qty=Sum('quantity'))
        ):
            key = (row['product_id'], row['location_id'])
            sales_30d_map[key] = row['total_qty']

        last_sale_map = {}
        for row in (
            ReportSales.objects
            .values('product_id', 'location_id')
            .annotate(last_date=Max('sale_date'))
        ):
            key = (row['product_id'], row['location_id'])
            last_sale_map[key] = row['last_date']

        last_purchase_map = {}
        for row in (
            ReportPurchases.objects
            .filter(is_return=False)
            .values('product_id', 'location_id')
            .annotate(last_date=Max('bill_date'))
        ):
            key = (row['product_id'], row['location_id'])
            last_purchase_map[key] = row['last_date']

        # ABC classification: rank products by total revenue contribution
        abc_map = {}
        revenue_by_product = list(
            ReportSales.objects
            .filter(sale_date__gte=ninety_days_ago)
            .values('product_id')
            .annotate(total_revenue=Sum('line_total'))
            .order_by('-total_revenue')
        )
        total_revenue = sum(r['total_revenue'] or 0 for r in revenue_by_product)
        cumulative = Decimal('0')
        for r in revenue_by_product:
            cumulative += r['total_revenue'] or 0
            pct = (cumulative / total_revenue * 100) if total_revenue else 0
            if pct <= 80:
                abc_map[r['product_id']] = 'A'
            elif pct <= 95:
                abc_map[r['product_id']] = 'B'
            else:
                abc_map[r['product_id']] = 'C'

        # Delete old snapshot and rebuild
        ReportInventory.objects.all().delete()

        quants = StockQuantRO.objects.select_related('product', 'location').all()
        batch = []
        count = 0

        for q in quants.iterator():
            product = q.product
            if not product:
                continue

            prod = _product_fields(product)
            loc_name = q.location.name if q.location else ''
            key = (product.id, q.location_id)

            qty = q.quantity or 0
            reserved = q.reserved_quantity or 0
            available = qty - reserved
            p_rate = safe_decimal(q.purchase_rate)
            mrp = safe_decimal(q.mrp)

            # Expiry calculation
            days_to_exp = 9999
            exp_status = 'ok'
            if q.expiry_month:
                try:
                    parts = q.expiry_month.split('-')
                    exp_year, exp_month = int(parts[0]), int(parts[1])
                    # First day of expiry month
                    from calendar import monthrange
                    last_day = monthrange(exp_year, exp_month)[1]
                    exp_date = date(exp_year, exp_month, last_day)
                    days_to_exp = (exp_date - today).days
                    if days_to_exp < 0:
                        exp_status = 'expired'
                    elif days_to_exp <= 30:
                        exp_status = 'critical_30'
                    elif days_to_exp <= 90:
                        exp_status = 'warning_90'
                except (ValueError, IndexError):
                    pass

            # Movement analytics
            sold_90 = sales_90d_map.get(key, 0)
            sold_30 = sales_30d_map.get(key, 0)
            avg_demand = Decimal(str(sold_90)) / 90 if sold_90 else Decimal('0')
            dos = int(qty / avg_demand) if avg_demand > 0 else 9999
            dos = min(dos, 9999)

            last_sale = last_sale_map.get(key)
            days_since_sale = (today - last_sale).days if last_sale else 9999
            last_purch = last_purchase_map.get(key)

            # Movement status
            if days_since_sale <= 30:
                mov_status = 'fast'
            elif days_since_sale <= 60:
                mov_status = 'medium'
            elif days_since_sale <= 90:
                mov_status = 'slow'
            else:
                mov_status = 'dead'

            abc = abc_map.get(product.id, 'C')
            min_stock = safe_decimal(product.pharma_min_stock)
            reorder = qty < float(min_stock) if min_stock else False
            safety = (avg_demand * 7).quantize(Decimal('0.01'), ROUND_HALF_UP)

            # GMROI and turnover (simplified)
            cost_of_sold = p_rate * sold_90 if p_rate else Decimal('0')
            avg_inv_cost = p_rate * qty if p_rate else Decimal('0')
            revenue_90 = Decimal(str(
                ReportSales.objects
                .filter(product_id=product.id, sale_date__gte=ninety_days_ago)
                .aggregate(s=Sum('line_total'))['s'] or 0
            ))
            gross_margin_90 = revenue_90 - cost_of_sold
            gmroi = (gross_margin_90 / avg_inv_cost).quantize(Decimal('0.01'), ROUND_HALF_UP) if avg_inv_cost else Decimal('0')
            turnover = (cost_of_sold * 4 / avg_inv_cost).quantize(Decimal('0.01'), ROUND_HALF_UP) if avg_inv_cost else Decimal('0')  # annualized

            batch.append(ReportInventory(
                snapshot_date=today,
                **prod,
                product_is_critical=product.pharma_is_critical,
                product_requires_cold_chain=product.pharma_requires_cold_chain,
                product_min_stock=min_stock,
                location_id=q.location_id or 0,
                location_name=loc_name,
                batch_no=q.lot_name or '',
                expiry_month=q.expiry_month or '',
                days_to_expiry=days_to_exp,
                expiry_status=exp_status,
                qty_on_hand=qty,
                reserved_qty=reserved,
                available_qty=available,
                purchase_rate=p_rate,
                mrp=mrp,
                stock_value_cost=(p_rate * qty).quantize(Decimal('0.01'), ROUND_HALF_UP),
                stock_value_mrp=(mrp * qty).quantize(Decimal('0.01'), ROUND_HALF_UP),
                total_sold_qty_90d=sold_90,
                total_sold_qty_30d=sold_30,
                avg_daily_demand=avg_demand.quantize(Decimal('0.01'), ROUND_HALF_UP),
                days_of_stock=dos,
                last_sale_date=last_sale,
                days_since_last_sale=days_since_sale,
                last_purchase_date=last_purch,
                movement_status=mov_status,
                abc_class=abc,
                reorder_needed=reorder,
                safety_stock=safety,
                fill_rate=Decimal('95.00'),  # Placeholder, needs stockout history
                inventory_turnover=turnover,
                gmroi=gmroi,
            ))
            count += 1

            if len(batch) >= BATCH_SIZE:
                ReportInventory.objects.bulk_create(batch)
                batch = []

        if batch:
            ReportInventory.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='inventory_snapshot',
            defaults={'last_synced_id': 0, 'records_processed': count, 'status': 'success'},
        )
        logger.info("Inventory snapshot refreshed: %d records", count)
        return count

    def run_all(self, full=False):
        """Run all inventory pipeline steps."""
        start = time.time()

        if full:
            logger.info("Full inventory pipeline refresh – clearing existing data")
            ReportSales.objects.all().delete()
            ReportSalesReturns.objects.all().delete()
            ReportPurchases.objects.all().delete()
            ReportInventory.objects.all().delete()
            pos_since = b2b_since = ret_since = pur_since = pret_since = 0
        else:
            pos_since = PipelineLog.get_last_id('pos_sales')
            b2b_since = PipelineLog.get_last_id('b2b_sales')
            ret_since = PipelineLog.get_last_id('sales_returns')
            pur_since = PipelineLog.get_last_id('purchases')
            pret_since = PipelineLog.get_last_id('purchase_returns')

        results = {
            'pos_sales': self.sync_pos_sales(pos_since),
            'b2b_sales': self.sync_b2b_sales(b2b_since),
            'sales_returns': self.sync_sales_returns(ret_since),
            'purchases': self.sync_purchases(pur_since),
            'purchase_returns': self.sync_purchase_returns(pret_since),
            'inventory_snapshot': self.refresh_inventory_snapshot(),
        }

        duration = time.time() - start
        total = sum(results.values())
        results['total'] = total
        results['duration_seconds'] = round(duration, 2)

        PipelineLog.objects.create(
            pipeline_type='inventory_all',
            last_synced_id=0,
            records_processed=total,
            status='success',
            duration_seconds=duration,
        )

        logger.info("Inventory pipeline complete: %d total records in %.1fs", total, duration)
        return results
