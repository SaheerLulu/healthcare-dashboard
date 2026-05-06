"""Loyalty Analytics API endpoints."""
from django.db.models import Sum, Count, Avg
from rest_framework.decorators import api_view, permission_classes
from .permissions import DashboardPermission
from rest_framework.response import Response

from reports.models import ReportSales
from .helpers import (
    parse_filters, apply_common_filters,
    apply_common_filters_range, prior_period_range, growth_pct,
)


def _fmt_num(value):
    v = abs(value)
    if v >= 10000000:
        return f'{v / 10000000:.2f}Cr'
    if v >= 100000:
        return f'{v / 100000:.2f}L'
    if v >= 1000:
        return f'{v / 1000:.1f}K'
    return str(int(v))


@api_view(['GET'])
@permission_classes([DashboardPermission])
def overview(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(customer_id__isnull=False), f)

    total_members = qs.values('customer_id').distinct().count()
    agg = qs.aggregate(
        points_issued=Sum('customer_loyalty_points'),
        points_redeemed=Sum('loyalty_points_redeemed'),
    )
    issued = float(agg['points_issued'] or 0)
    redeemed = float(agg['points_redeemed'] or 0)
    balance = issued - redeemed
    avg_redemption = round(redeemed / issued * 100, 1) if issued else 0

    # Period-over-period deltas
    prev_start, prev_end = prior_period_range(f)
    prev_qs = apply_common_filters_range(
        ReportSales.objects.filter(customer_id__isnull=False), f, prev_start, prev_end
    )
    prev_members = prev_qs.values('customer_id').distinct().count()
    prev_agg = prev_qs.aggregate(
        pi=Sum('customer_loyalty_points'),
        pr=Sum('loyalty_points_redeemed'),
    )
    prev_issued = float(prev_agg['pi'] or 0)
    prev_redeemed = float(prev_agg['pr'] or 0)
    prev_avg_redemption = round(prev_redeemed / prev_issued * 100, 1) if prev_issued else 0
    members_d = growth_pct(total_members, prev_members)
    issued_d = growth_pct(issued, prev_issued)
    redeemed_d = growth_pct(redeemed, prev_redeemed)
    redemption_pp = round(avg_redemption - prev_avg_redemption, 1)

    def _fmt_pct(d):
        return f'{"+" if d > 0 else ""}{d}%' if d else '0%'

    return Response({
        'total_members_display': _fmt_num(total_members),
        'total_members_subtitle': 'unique customers',
        'total_members_trend': _fmt_pct(members_d),
        'points_issued_display': _fmt_num(issued),
        'points_issued_subtitle': 'total earned',
        'points_issued_trend': _fmt_pct(issued_d),
        'points_redeemed_display': _fmt_num(redeemed),
        'points_redeemed_subtitle': f'{avg_redemption}% redemption',
        'points_redeemed_trend': _fmt_pct(redeemed_d),
        'points_balance_display': _fmt_num(balance),
        'points_balance_subtitle': 'outstanding liability',
        'points_balance_trend': _fmt_pct(issued_d - redeemed_d),
        'avg_redemption_display': f'{avg_redemption}%',
        'avg_redemption_subtitle': 'redemption rate',
        'avg_redemption_trend': f'{"+" if redemption_pp > 0 else ""}{redemption_pp}pp' if redemption_pp else '0pp',
    })


@api_view(['GET'])
@permission_classes([DashboardPermission])
def tiers(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(customer_id__isnull=False), f)

    data = list(
        qs.values('customer_type')
        .annotate(
            members=Count('customer_id', distinct=True),
            revenue=Sum('line_total'),
            orders=Count('source_id', distinct=True),
            avg_order_value=Avg('line_total'),
        )
        .order_by('-revenue')
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def redemption(request):
    f = parse_filters(request)
    base_qs = apply_common_filters(ReportSales.objects.all(), f)

    # Issued + redeemed per month — chart needs both lines.
    issued_by_month = {
        r['sale_month']: r['issued']
        for r in base_qs.values('sale_month').annotate(issued=Sum('customer_loyalty_points'))
    }
    redeemed_qs = base_qs.filter(loyalty_points_redeemed__gt=0)
    trend = list(
        redeemed_qs.values('sale_month')
        .annotate(
            points_redeemed=Sum('loyalty_points_redeemed'),
            redemption_value=Sum('loyalty_redemption_amount'),
            transactions=Count('source_id', distinct=True),
        )
        .order_by('sale_month')
    )
    months = sorted(set(list(issued_by_month.keys()) + [t['sale_month'] for t in trend]))
    out = []
    redeemed_lookup = {t['sale_month']: t for t in trend}
    for m in months:
        r = redeemed_lookup.get(m, {})
        out.append({
            'sale_month': m,
            'points_issued': float(issued_by_month.get(m) or 0),
            'points_redeemed': float(r.get('points_redeemed') or 0),
            'redemption_value': float(r.get('redemption_value') or 0),
            'transactions': int(r.get('transactions') or 0),
        })
    return Response(out)


@api_view(['GET'])
@permission_classes([DashboardPermission])
def rfm(request):
    """RFM segmentation (DASH-E15-F01-US02).

    Recency  : days since last purchase
    Frequency: distinct order count in the period
    Monetary : total revenue in the period

    Each is bucketed into a 1-5 score (5 = best). Combined RFM score
    drives segment labels in line with standard CRM practice:

      Champions       : R=5, F+M >= 8
      Loyal           : F=5, otherwise
      Potential       : R=5, F<=2 (newer customers)
      At-Risk         : R<=2, F+M >= 6 (was active, drifted)
      Lost            : R=1, F+M <= 4
      Hibernating     : default fallthrough

    Buckets are computed via quintile rank to keep them robust to
    outliers; for thin data (< 5 customers per bucket) the rank still
    works because Python sort is stable.
    """
    from datetime import date as _date
    f = parse_filters(request)
    end = _date.fromisoformat(f['end_date'])

    qs = apply_common_filters(ReportSales.objects.filter(customer_id__isnull=False), f)
    customers = list(
        qs.values('customer_id', 'customer_name', 'customer_type')
        .annotate(
            last_sale=__import__('django').db.models.Max('sale_date'),
            orders=Count('source_id', distinct=True),
            revenue=Sum('line_total'),
        )
    )
    if not customers:
        return Response({
            'segments': {},
            'customers': [],
            'totals': {'count': 0},
        })

    for c in customers:
        ls = c['last_sale']
        c['recency_days'] = (end - ls).days if ls else 9999
        c['revenue'] = float(c['revenue'] or 0)
        c['orders'] = int(c['orders'] or 0)

    def quintile_rank(values, reverse=False):
        """Return a dict id→1..5 score. reverse=True means smaller is
        better (used for recency)."""
        ordered = sorted(values, key=lambda v: v[1], reverse=not reverse)
        n = len(ordered)
        if n == 0:
            return {}
        rank_map = {}
        for i, (cid, _) in enumerate(ordered):
            # Quintile: 1..5, with 5 going to the best 20%.
            score = max(1, 5 - (i * 5 // max(n, 1)))
            rank_map[cid] = score
        return rank_map

    r_map = quintile_rank([(c['customer_id'], c['recency_days']) for c in customers], reverse=True)
    f_map = quintile_rank([(c['customer_id'], c['orders']) for c in customers])
    m_map = quintile_rank([(c['customer_id'], c['revenue']) for c in customers])

    segments_count: dict = {}
    enriched = []
    for c in customers:
        r = r_map.get(c['customer_id'], 1)
        fr = f_map.get(c['customer_id'], 1)
        mn = m_map.get(c['customer_id'], 1)
        score_sum = fr + mn
        if r == 5 and score_sum >= 8:
            seg = 'Champions'
        elif fr == 5:
            seg = 'Loyal'
        elif r == 5 and fr <= 2:
            seg = 'Potential'
        elif r <= 2 and score_sum >= 6:
            seg = 'At-Risk'
        elif r == 1 and score_sum <= 4:
            seg = 'Lost'
        else:
            seg = 'Hibernating'
        segments_count[seg] = segments_count.get(seg, 0) + 1
        enriched.append({
            **c,
            'last_sale': c['last_sale'].isoformat() if c['last_sale'] else None,
            'r': r,
            'f': fr,
            'm': mn,
            'rfm_code': f'{r}{fr}{mn}',
            'segment': seg,
        })

    enriched.sort(key=lambda x: x['revenue'], reverse=True)

    # Headline totals so the frontend tile can render counts per segment.
    seg_order = ['Champions', 'Loyal', 'Potential', 'At-Risk', 'Lost', 'Hibernating']
    return Response({
        'totals': {
            'count': len(enriched),
            'period': {'start': f['start_date'], 'end': f['end_date']},
        },
        'segments': [
            {'segment': s, 'count': segments_count.get(s, 0)}
            for s in seg_order
        ],
        'customers': enriched[:int(request.query_params.get('limit') or 200)],
    })


@api_view(['GET'])
@permission_classes([DashboardPermission])
def detail(request):
    f = parse_filters(request)
    qs = apply_common_filters(ReportSales.objects.filter(customer_id__isnull=False), f)

    data = list(
        qs.values('customer_id', 'customer_name', 'customer_type', 'customer_loyalty_points')
        .annotate(
            revenue=Sum('line_total'),
            orders=Count('source_id', distinct=True),
            points_redeemed=Sum('loyalty_points_redeemed'),
        )
        .order_by('-revenue')
    )
    return Response(data)
