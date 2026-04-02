"""
Financial Pipeline – ETL from accounting tables to denormalized reporting tables.
Handles: Journal entries, GST returns (GSTR-1/3B/2B/ITC/RCM), TDS deductions.
"""
import logging
import time
import traceback
from decimal import Decimal

from django.db.models import Sum

from source_models.models import (
    JournalEntryRO, JournalEntryLineRO, ChartOfAccountRO,
    LocationRO, CustomerRO, SupplierRO,
    GSTR1EntryRO, GSTR3BSummaryRO, GSTR2BEntryRO,
    ITCReconciliationRO, RCMEntryRO,
    TDSDeductionRO, TDSChallanRO,
)
from reports.models import ReportFinancial, ReportGST, ReportTDS
from pipeline.models import PipelineLog, PipelineError
from pipeline.inventory_pipeline import get_fiscal_year

logger = logging.getLogger('pipeline')

BATCH_SIZE = 500


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


class FinancialPipeline:

    def __init__(self):
        # Build lookup caches
        self._location_cache = {}
        self._customer_cache = {}
        self._supplier_cache = {}
        self._account_cache = {}

    def _get_location_name(self, location_id):
        if not location_id:
            return ''
        if location_id not in self._location_cache:
            try:
                loc = LocationRO.objects.get(id=location_id)
                self._location_cache[location_id] = loc.name
            except LocationRO.DoesNotExist:
                self._location_cache[location_id] = ''
        return self._location_cache[location_id]

    def _get_party_name(self, party_type, party_id):
        if not party_id or party_type == 'None':
            return ''
        if party_type == 'Customer':
            if party_id not in self._customer_cache:
                try:
                    c = CustomerRO.objects.get(id=party_id)
                    self._customer_cache[party_id] = c.customer_name
                except CustomerRO.DoesNotExist:
                    self._customer_cache[party_id] = ''
            return self._customer_cache[party_id]
        elif party_type == 'Supplier':
            if party_id not in self._supplier_cache:
                try:
                    s = SupplierRO.objects.get(id=party_id)
                    self._supplier_cache[party_id] = s.company_name
                except SupplierRO.DoesNotExist:
                    self._supplier_cache[party_id] = ''
            return self._supplier_cache[party_id]
        return ''

    def _get_account(self, account_id):
        if account_id not in self._account_cache:
            try:
                acc = ChartOfAccountRO.objects.select_related('parent').get(id=account_id)
                self._account_cache[account_id] = acc
            except ChartOfAccountRO.DoesNotExist:
                self._account_cache[account_id] = None
        return self._account_cache[account_id]

    def sync_journal_entries(self, since_id=0):
        """Sync posted journal entries into report_financial."""
        entries = (
            JournalEntryRO.objects
            .filter(id__gt=since_id, is_posted=True)
            .order_by('id')
        )

        count = 0
        last_id = since_id
        batch = []

        for entry in entries.iterator():
            try:
                lines = JournalEntryLineRO.objects.filter(entry_id=entry.id)
                entry_month = entry.date.strftime('%Y-%m')
                fy = get_fiscal_year(entry.date)
                loc_name = self._get_location_name(entry.location_id)

                for line in lines:
                    account = self._get_account(line.account_id)
                    if not account:
                        continue

                    parent_code = ''
                    parent_name = ''
                    if account.parent:
                        parent_code = account.parent.account_code or ''
                        parent_name = account.parent.account_name or ''

                    debit = Decimal(str(line.debit or 0))
                    credit = Decimal(str(line.credit or 0))
                    party_name = self._get_party_name(line.party_type, line.party_id)

                    batch.append(ReportFinancial(
                        source_entry_id=entry.id,
                        source_line_id=line.id,
                        entry_no=entry.entry_no or '',
                        entry_date=entry.date,
                        entry_month=entry_month,
                        fiscal_year=fy,
                        voucher_type=entry.voucher_type or '',
                        reference_type=entry.reference_type or '',
                        reference_id=entry.reference_id,
                        is_posted=entry.is_posted,
                        narration=entry.narration or '',
                        location_id=entry.location_id,
                        location_name=loc_name,
                        account_code=account.account_code or '',
                        account_name=account.account_name or '',
                        account_type=account.account_type or '',
                        account_subtype=account.account_subtype or '',
                        parent_account_code=parent_code,
                        parent_account_name=parent_name,
                        debit=debit,
                        credit=credit,
                        net_amount=debit - credit,
                        party_type=line.party_type or '',
                        party_id=line.party_id,
                        party_name=party_name,
                        line_narration=line.narration or '',
                    ))
                    count += 1

                _resolve_error('journal_entries', entry.id)
                last_id = entry.id

                if len(batch) >= BATCH_SIZE:
                    ReportFinancial.objects.bulk_create(batch)
                    batch = []

            except Exception as e:
                _log_error('journal_entries', entry.id, e)

        if batch:
            ReportFinancial.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='journal_entries',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("Journal entries synced: %d records, last_id=%d", count, last_id)
        return count

    def sync_gst_entries(self, since_ids=None):
        """Sync all GST-related tables into report_gst."""
        if since_ids is None:
            since_ids = {}

        total = 0
        total += self._sync_gstr1(since_ids.get('gstr1', 0))
        total += self._sync_gstr3b(since_ids.get('gstr3b', 0))
        total += self._sync_gstr2b(since_ids.get('gstr2b', 0))
        total += self._sync_itc(since_ids.get('itc', 0))
        total += self._sync_rcm(since_ids.get('rcm', 0))
        return total

    def _sync_gstr1(self, since_id=0):
        entries = (
            GSTR1EntryRO.objects
            .filter(id__gt=since_id, is_active=True)
            .order_by('id')
        )

        count = 0
        last_id = since_id
        batch = []

        for e in entries.iterator():
            try:
                fy = get_fiscal_year_from_period(e.period)
                loc_name = self._get_location_name(e.location_id)

                batch.append(ReportGST(
                    source_id=e.id,
                    source_table='gstr1',
                    period=e.period or '',
                    fiscal_year=fy,
                    location_id=e.location_id,
                    location_name=loc_name,
                    invoice_no=e.invoice_no or '',
                    invoice_date=e.invoice_date,
                    invoice_type=e.invoice_type or '',
                    customer_gstin=e.customer_gstin or '',
                    place_of_supply=e.place_of_supply or '',
                    hsn_code=e.hsn_code or '',
                    taxable_value=Decimal(str(e.taxable_value or 0)),
                    gst_rate=Decimal(str(e.rate or 0)),
                    cgst=Decimal(str(e.cgst or 0)),
                    sgst=Decimal(str(e.sgst or 0)),
                    igst=Decimal(str(e.igst or 0)),
                    cess=Decimal(str(e.cess or 0)),
                    source_type=e.source_type or '',
                ))
                count += 1
                last_id = e.id

                if len(batch) >= BATCH_SIZE:
                    ReportGST.objects.bulk_create(batch)
                    batch = []

            except Exception as ex:
                _log_error('gstr1', e.id, ex)

        if batch:
            ReportGST.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='gstr1',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("GSTR-1 synced: %d records", count)
        return count

    def _sync_gstr3b(self, since_id=0):
        entries = GSTR3BSummaryRO.objects.filter(id__gt=since_id).order_by('id')

        count = 0
        last_id = since_id
        batch = []

        for e in entries.iterator():
            try:
                fy = get_fiscal_year_from_period(e.period)
                loc_name = self._get_location_name(e.location_id)

                batch.append(ReportGST(
                    source_id=e.id,
                    source_table='gstr3b',
                    period=e.period or '',
                    fiscal_year=fy,
                    location_id=e.location_id,
                    location_name=loc_name,
                    outward_taxable=Decimal(str(e.outward_taxable or 0)),
                    outward_zero_rated=Decimal(str(e.outward_zero_rated or 0)),
                    itc_igst=Decimal(str(e.itc_igst or 0)),
                    itc_cgst=Decimal(str(e.itc_cgst or 0)),
                    itc_sgst=Decimal(str(e.itc_sgst or 0)),
                    net_payable_igst=Decimal(str(e.net_payable_igst or 0)),
                    net_payable_cgst=Decimal(str(e.net_payable_cgst or 0)),
                    net_payable_sgst=Decimal(str(e.net_payable_sgst or 0)),
                    filing_status=e.status or '',
                    filed_date=e.filed_date,
                    # GSTR-3B specific: compute total outward tax for cgst/sgst/igst
                    cgst=Decimal(str(e.outward_cgst or 0)),
                    sgst=Decimal(str(e.outward_sgst or 0)),
                    igst=Decimal(str(e.outward_igst or 0)),
                ))
                count += 1
                last_id = e.id

                if len(batch) >= BATCH_SIZE:
                    ReportGST.objects.bulk_create(batch)
                    batch = []

            except Exception as ex:
                _log_error('gstr3b', e.id, ex)

        if batch:
            ReportGST.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='gstr3b',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("GSTR-3B synced: %d records", count)
        return count

    def _sync_gstr2b(self, since_id=0):
        entries = GSTR2BEntryRO.objects.filter(id__gt=since_id).order_by('id')

        count = 0
        last_id = since_id
        batch = []

        for e in entries.iterator():
            try:
                fy = get_fiscal_year_from_period(e.period)
                loc_name = self._get_location_name(e.location_id)

                batch.append(ReportGST(
                    source_id=e.id,
                    source_table='gstr2b',
                    period=e.period or '',
                    fiscal_year=fy,
                    location_id=e.location_id,
                    location_name=loc_name,
                    invoice_no=e.invoice_no or '',
                    invoice_date=e.invoice_date,
                    supplier_gstin=e.supplier_gstin or '',
                    supplier_name=e.supplier_name or '',
                    taxable_value=Decimal(str(e.taxable_value or 0)),
                    cgst=Decimal(str(e.cgst or 0)),
                    sgst=Decimal(str(e.sgst or 0)),
                    igst=Decimal(str(e.igst or 0)),
                    itc_eligible=e.itc_eligible,
                    match_status=e.match_status or '',
                ))
                count += 1
                last_id = e.id

                if len(batch) >= BATCH_SIZE:
                    ReportGST.objects.bulk_create(batch)
                    batch = []

            except Exception as ex:
                _log_error('gstr2b', e.id, ex)

        if batch:
            ReportGST.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='gstr2b',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("GSTR-2B synced: %d records", count)
        return count

    def _sync_itc(self, since_id=0):
        entries = ITCReconciliationRO.objects.filter(id__gt=since_id).order_by('id')

        count = 0
        last_id = since_id
        batch = []

        for e in entries.iterator():
            try:
                fy = get_fiscal_year_from_period(e.period)
                loc_name = self._get_location_name(e.location_id)

                batch.append(ReportGST(
                    source_id=e.id,
                    source_table='itc',
                    period=e.period or '',
                    fiscal_year=fy,
                    location_id=e.location_id,
                    location_name=loc_name,
                    supplier_gstin=e.supplier_gstin or '',
                    taxable_value=Decimal(str(e.books_taxable or 0)),
                    cgst=Decimal(str(e.books_cgst or 0)),
                    sgst=Decimal(str(e.books_sgst or 0)),
                    igst=Decimal(str(e.books_igst or 0)),
                    match_status=e.status or '',
                    # Store GSTR-2B side in ITC-specific fields
                    itc_cgst=Decimal(str(e.gstr2b_cgst or 0)),
                    itc_sgst=Decimal(str(e.gstr2b_sgst or 0)),
                    itc_igst=Decimal(str(e.gstr2b_igst or 0)),
                ))
                count += 1
                last_id = e.id

                if len(batch) >= BATCH_SIZE:
                    ReportGST.objects.bulk_create(batch)
                    batch = []

            except Exception as ex:
                _log_error('itc', e.id, ex)

        if batch:
            ReportGST.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='itc',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("ITC reconciliation synced: %d records", count)
        return count

    def _sync_rcm(self, since_id=0):
        entries = RCMEntryRO.objects.filter(id__gt=since_id).order_by('id')

        count = 0
        last_id = since_id
        batch = []

        for e in entries.iterator():
            try:
                fy = get_fiscal_year_from_period(e.period)
                loc_name = self._get_location_name(e.location_id)

                batch.append(ReportGST(
                    source_id=e.id,
                    source_table='rcm',
                    period=e.period or '',
                    fiscal_year=fy,
                    location_id=e.location_id,
                    location_name=loc_name,
                    supplier_gstin=e.supplier_gstin or '',
                    supplier_name=e.supplier_name or '',
                    service_type=e.service_type or '',
                    sac_code=e.sac_code or '',
                    taxable_value=Decimal(str(e.taxable_value or 0)),
                    cgst=Decimal(str(e.cgst or 0)),
                    sgst=Decimal(str(e.sgst or 0)),
                    igst=Decimal(str(e.igst or 0)),
                ))
                count += 1
                last_id = e.id

                if len(batch) >= BATCH_SIZE:
                    ReportGST.objects.bulk_create(batch)
                    batch = []

            except Exception as ex:
                _log_error('rcm', e.id, ex)

        if batch:
            ReportGST.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='rcm',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("RCM synced: %d records", count)
        return count

    def sync_tds_entries(self, since_id=0):
        """Sync TDS deductions into report_tds, joining challan data."""
        deductions = TDSDeductionRO.objects.filter(id__gt=since_id).order_by('id')

        count = 0
        last_id = since_id
        batch = []

        for d in deductions.iterator():
            try:
                trans_month = d.transaction_date.strftime('%Y-%m')
                fy = get_fiscal_year(d.transaction_date)
                loc_name = self._get_location_name(d.location_id)

                # Get challan info if linked
                challan_total = Decimal('0')
                challan_deposit = None
                if d.challan_no:
                    challan = TDSChallanRO.objects.filter(challan_no=d.challan_no).first()
                    if challan:
                        challan_total = Decimal(str(challan.total_tds_amount or 0))
                        challan_deposit = challan.deposit_date

                batch.append(ReportTDS(
                    source_id=d.id,
                    deductee_name=d.deductee_name or '',
                    deductee_pan=d.deductee_pan or '',
                    section=d.section or '',
                    deductee_type=d.deductee_type or '',
                    nature_of_payment=d.nature_of_payment or '',
                    transaction_date=d.transaction_date,
                    transaction_month=trans_month,
                    fiscal_year=fy,
                    gross_amount=Decimal(str(d.gross_amount or 0)),
                    tds_rate=Decimal(str(d.tds_rate or 0)),
                    tds_amount=Decimal(str(d.tds_amount or 0)),
                    source_type=d.source_type or '',
                    source_id_ref=d.source_id,
                    status=d.status or '',
                    challan_no=d.challan_no or '',
                    challan_date=d.challan_date,
                    bsr_code=d.bsr_code or '',
                    challan_total_amount=challan_total,
                    challan_deposit_date=challan_deposit,
                    location_id=d.location_id,
                    location_name=loc_name,
                ))
                count += 1
                last_id = d.id

                if len(batch) >= BATCH_SIZE:
                    ReportTDS.objects.bulk_create(batch)
                    batch = []

            except Exception as e:
                _log_error('tds', d.id, e)

        if batch:
            ReportTDS.objects.bulk_create(batch)

        PipelineLog.objects.update_or_create(
            pipeline_type='tds',
            defaults={'last_synced_id': last_id, 'records_processed': count, 'status': 'success'},
        )
        logger.info("TDS deductions synced: %d records, last_id=%d", count, last_id)
        return count

    def run_all(self, full=False):
        """Run all financial pipeline steps."""
        start = time.time()

        if full:
            logger.info("Full financial pipeline refresh – clearing existing data")
            ReportFinancial.objects.all().delete()
            ReportGST.objects.all().delete()
            ReportTDS.objects.all().delete()
            je_since = tds_since = 0
            gst_since = {}
        else:
            je_since = PipelineLog.get_last_id('journal_entries')
            tds_since = PipelineLog.get_last_id('tds')
            gst_since = {
                'gstr1': PipelineLog.get_last_id('gstr1'),
                'gstr3b': PipelineLog.get_last_id('gstr3b'),
                'gstr2b': PipelineLog.get_last_id('gstr2b'),
                'itc': PipelineLog.get_last_id('itc'),
                'rcm': PipelineLog.get_last_id('rcm'),
            }

        results = {
            'journal_entries': self.sync_journal_entries(je_since),
            'gst_entries': self.sync_gst_entries(gst_since),
            'tds_entries': self.sync_tds_entries(tds_since),
        }

        duration = time.time() - start
        total = sum(results.values())
        results['total'] = total
        results['duration_seconds'] = round(duration, 2)

        PipelineLog.objects.create(
            pipeline_type='financial_all',
            last_synced_id=0,
            records_processed=total,
            status='success',
            duration_seconds=duration,
        )

        logger.info("Financial pipeline complete: %d total records in %.1fs", total, duration)
        return results


def get_fiscal_year_from_period(period):
    """Convert YYYY-MM period to fiscal year string."""
    if not period or len(period) < 7:
        return ''
    try:
        year = int(period[:4])
        month = int(period[5:7])
        from datetime import date
        return get_fiscal_year(date(year, month, 1))
    except (ValueError, IndexError):
        return ''
