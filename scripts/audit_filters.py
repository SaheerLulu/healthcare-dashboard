"""Per-page filter audit.

For each page in frontend/src/app/pages, scan its source for
useApiData('endpoint', ...) calls (and `noFilters: true` opt-outs),
then for every filter-aware endpoint hit it three ways:

  A. default (no filters)               → baseline
  B. Last 30 days window                → must reduce rows / amount
  C. non-existent location_ids=999999   → must return empty / zero

We compare response sizes and a few headline numeric fields to
classify each endpoint as:
  ✓ filters honoured       — A vs B differ AND C is empty
  ✗ filters ignored        — A == B and C is non-empty
  - data-too-thin          — DB has no rows in any window
  ! 5xx                    — endpoint blew up

Output is a markdown table per page plus a flat CSV at
docs/FILTER_AUDIT.{md,csv}.
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import urllib.parse as up
import urllib.request
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Tuple

REPO_ROOT = Path("/home/saheer/biloop/healthcare/healthcare-dashboard")
PAGES_DIR = REPO_ROOT / "frontend/src/app/pages"
DETAIL_DIR = PAGES_DIR / "detail"
DOCS_DIR = REPO_ROOT / "docs"
DOCS_DIR.mkdir(exist_ok=True)
BASE = "http://127.0.0.1:8002"

# 3 windows
TODAY = date.today()
W_DEFAULT = {}  # let server use 6-month default
W_30 = {"start_date": (TODAY - timedelta(days=29)).isoformat(), "end_date": TODAY.isoformat()}
W_BAD = {"location_ids": "999999"}

CALL_PATTERN = re.compile(
    r"""useApiData<[^>]*>\(\s*['"]([^'"]+)['"]\s*,[^,]*(?:,\s*\{([^}]*)\})?""",
    re.DOTALL,
)
# fallback for the other api.get / api.post style calls
GET_PATTERN = re.compile(r"""api\.get\(\s*['"]([^'"]+)['"]""")


def find_calls(src: str) -> List[Tuple[str, bool]]:
    """Return [(endpoint, noFilters)] from a tsx source."""
    out = []
    for m in CALL_PATTERN.finditer(src):
        ep = m.group(1)
        opts = (m.group(2) or "")
        no_filters = "noFilters" in opts and "true" in opts
        out.append((ep, no_filters))
    # api.get fallbacks (Settings used to use this for /pipeline/* — gone now,
    # but cheap to include).
    for m in GET_PATTERN.finditer(src):
        out.append((m.group(1), True))  # api.get is filter-less by default
    return out


def fetch(endpoint: str, params: Dict[str, str]):
    qs = up.urlencode(params)
    url = f"{BASE}{endpoint}?{qs}" if qs else f"{BASE}{endpoint}"
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            raw = resp.read().decode()
            return resp.status, raw
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="ignore")[:200]
    except Exception as e:
        return -1, str(e)


def headline(raw: str) -> Tuple[int, float]:
    """Return (rows, total). Best-effort across a few common shapes."""
    try:
        d = json.loads(raw)
    except Exception:
        return 0, 0.0
    if isinstance(d, list):
        rows = len(d)
        total = sum(float(r.get("revenue") or r.get("line_total") or r.get("value") or 0)
                    for r in d if isinstance(r, dict))
        return rows, total
    if isinstance(d, dict):
        if "results" in d and isinstance(d["results"], list):
            return len(d["results"]), float(d.get("count") or 0)
        # KPIs / overview shapes
        rev = d.get("total_revenue") or d.get("revenue") or 0
        gross = d.get("gross_profit") or 0
        return 0, float(rev or 0) + float(gross or 0)
    return 0, 0.0


def classify(default: Tuple[int, float], shifted: Tuple[int, float], bad: Tuple[int, float], status_a: int, status_b: int, status_c: int) -> str:
    if status_a >= 500 or status_b >= 500 or status_c >= 500:
        return "ERR"
    # If default and bad differ → some filtering visible
    bad_ok = bad[0] == 0 and bad[1] == 0
    differ = (default[0] != shifted[0]) or (abs(default[1] - shifted[1]) > 1.0)
    if not differ and (default[0] == 0 and default[1] == 0.0):
        return "EMPTY"
    if differ and bad_ok:
        return "OK"
    if differ and not bad_ok:
        return "PARTIAL"  # filters change result but bad-location didn't zero out
    if not differ and bad_ok:
        return "STATIC"  # 6-month vs 30-day same; bad zeros — could be legit constant data
    return "FAIL"


def audit_page(page_path: Path) -> List[Dict[str, Any]]:
    src = page_path.read_text()
    calls = find_calls(src)
    rows = []
    seen = set()
    for ep, no_filters in calls:
        # Skip non-API endpoints (none expected) and dedupe
        if not ep.startswith("/"):
            continue
        if ep.startswith("/api/"):
            ep = ep[len("/api"):]
        full = f"/api{ep}"
        if (full, no_filters) in seen:
            continue
        seen.add((full, no_filters))
        if no_filters:
            rows.append({
                "page": page_path.name,
                "endpoint": full,
                "no_filters": True,
                "status": "—",
                "verdict": "OPT-OUT",
                "default_count": "",
                "shifted_count": "",
                "bad_count": "",
            })
            continue
        a_status, a_raw = fetch(full, W_DEFAULT)
        b_status, b_raw = fetch(full, W_30)
        c_status, c_raw = fetch(full, W_BAD)
        a, b, c = headline(a_raw), headline(b_raw), headline(c_raw)
        v = classify(a, b, c, a_status, b_status, c_status)
        rows.append({
            "page": page_path.name,
            "endpoint": full,
            "no_filters": False,
            "status": f"{a_status}/{b_status}/{c_status}",
            "verdict": v,
            "default_count": f"{a[0]} rows · {a[1]:.0f}",
            "shifted_count": f"{b[0]} rows · {b[1]:.0f}",
            "bad_count": f"{c[0]} rows · {c[1]:.0f}",
        })
    return rows


def main():
    files = sorted(list(PAGES_DIR.glob("*.tsx")) + list(DETAIL_DIR.glob("*.tsx")))
    all_rows: List[Dict[str, Any]] = []
    for f in files:
        all_rows.extend(audit_page(f))

    # CSV
    csv_path = DOCS_DIR / "FILTER_AUDIT.csv"
    with csv_path.open("w", newline="") as fp:
        w = csv.DictWriter(fp, fieldnames=list(all_rows[0].keys()))
        w.writeheader()
        w.writerows(all_rows)
    print(f"wrote {csv_path}  ({len(all_rows)} rows)")

    # Markdown
    md_path = DOCS_DIR / "FILTER_AUDIT.md"
    with md_path.open("w") as fp:
        fp.write("# Per-page filter audit\n\n")
        fp.write(
            "Generated by `scripts/audit_filters.py`. For every "
            "`useApiData('/api/...')` call in a page, the auditor hits the "
            "endpoint three ways and checks whether the response actually "
            "shifts: default 6-month window, the same call narrowed to the "
            "last 30 days, then with a non-existent `location_ids=999999`.\n\n"
        )
        fp.write("Verdicts:\n\n")
        fp.write("| Verdict | Meaning |\n|---|---|\n")
        fp.write("| `OK` | default ≠ 30-day result and bad-location returns empty — filters honoured |\n")
        fp.write("| `STATIC` | default and 30-day window return the same shape but bad-location is empty (constant data, no time series) |\n")
        fp.write("| `EMPTY` | DB has no rows in either window — can't tell |\n")
        fp.write("| `PARTIAL` | default ≠ 30-day but bad-location did NOT empty — server filter incomplete |\n")
        fp.write("| `FAIL` | default == 30-day AND bad-location non-empty — filters appear ignored |\n")
        fp.write("| `OPT-OUT` | endpoint declares `noFilters: true` (e.g. /pipeline/history/ — by design) |\n")
        fp.write("| `ERR` | 5xx on at least one of the three calls |\n\n")

        # Group by page
        by_page: Dict[str, List[Dict[str, Any]]] = {}
        for r in all_rows:
            by_page.setdefault(r["page"], []).append(r)
        for page, rows in by_page.items():
            fp.write(f"## {page}\n\n")
            fp.write("| Endpoint | Status | Verdict | Default | -30d | bad-loc |\n")
            fp.write("|---|---|---|---|---|---|\n")
            for r in rows:
                fp.write(f"| `{r['endpoint']}` | {r['status']} | **{r['verdict']}** | {r['default_count']} | {r['shifted_count']} | {r['bad_count']} |\n")
            fp.write("\n")
    print(f"wrote {md_path}")

    # Summary
    counts: Dict[str, int] = {}
    for r in all_rows:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    print("\nVerdict tally:")
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
