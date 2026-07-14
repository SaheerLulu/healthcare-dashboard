"""Generate the Requirements Traceability Matrix (RTM) for healthcare-dashboard.

Walks the OpenProject work-package tree (Phase epics → [FEAT] features →
USnn user stories and [TEST]/[TC] siblings) and joins it against the local
git checkout to surface code references and per-story coverage gaps.

Outputs:
- docs/RTM.csv  (machine-readable)
- docs/RTM.md   (human-readable, with red rows for stories with zero TCs)

Run from repo root:
    python3 scripts/build_rtm.py
or with a custom OpenProject host:
    OP_BASE=https://projects.example.com OP_API_KEY=... python3 scripts/build_rtm.py

Implements DASH-E00-A11. See that work package for the spec.
"""
from __future__ import annotations

import base64
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = REPO_ROOT / "docs"
DOCS_DIR.mkdir(exist_ok=True)

OP_BASE = os.environ.get("OP_BASE", "https://projects.biloop.ai")
OP_API_KEY = os.environ.get("OP_API_KEY")
PROJECT_ID = int(os.environ.get("OP_PROJECT_ID", "11"))


def _http_get(path: str) -> dict:
    if not OP_API_KEY:
        raise SystemExit(
            "OP_API_KEY env var is required. Get it from your OpenProject "
            "user profile → Access tokens."
        )
    token = base64.b64encode(f"apikey:{OP_API_KEY}".encode()).decode()
    req = urllib.request.Request(
        OP_BASE + path,
        headers={"Authorization": f"Basic {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"OpenProject GET {path} -> {e.code}\n")
        raise


def fetch_all_work_packages() -> List[dict]:
    """Fetch every work package in the project, including Closed and Rejected.

    OpenProject's default project work_packages listing hides closed items;
    pass filters=[] explicitly to include them so the RTM never silently drops
    rows that have transitioned past Open.
    """
    import urllib.parse as up

    out: List[dict] = []
    offset = 1
    while True:
        qs = up.urlencode({"pageSize": 200, "offset": offset, "filters": "[]"})
        d = _http_get(f"/api/v3/projects/{PROJECT_ID}/work_packages?{qs}")
        elements = d.get("_embedded", {}).get("elements", [])
        out.extend(elements)
        if not elements or len(out) >= d.get("total", 0):
            break
        offset += 1
    return out


PARENT_RE = re.compile(r"^(DASH-E\d+(?:-F\d+)?)")


def parent_code_from_subject(subject: str) -> str | None:
    """Extract DASH-EXX or DASH-EXX-FYY code from a subject."""
    s = subject
    # Strip prefix tags
    for tag in ("[EPIC]", "[FEAT]", "[TEST]", "[TC]"):
        if s.startswith(tag):
            s = s[len(tag):].strip()
    m = re.match(r"DASH-E\d+(-F\d+)?", s)
    return m.group(0) if m else None


def classify(subject: str) -> str:
    if subject.startswith("[EPIC]"):
        return "epic"
    if subject.startswith("[FEAT]"):
        return "feature"
    if subject.startswith("[TEST]"):
        return "test_group"
    if subject.startswith("[TC]"):
        return "test_case"
    if "-US" in subject:
        return "user_story"
    if subject.startswith("DASH-E00"):
        return "pm_artifact"
    return "other"


# Code-reference grep — naive but effective. Looks at the most likely
# sources: backend/api/, frontend/src/app/.
def grep_code_references(feature_code: str) -> List[str]:
    """Find files mentioning the feature code in identifiers, comments, paths."""
    if not feature_code:
        return []
    refs: List[str] = []
    # Map feature codes to plausible code paths via the FEATURE_HINTS table.
    hints = FEATURE_HINTS.get(feature_code, [])
    for path_glob in hints:
        for p in REPO_ROOT.glob(path_glob):
            if p.is_file():
                refs.append(str(p.relative_to(REPO_ROOT)))
    return sorted(set(refs))


# Mapping of feature code -> globs of code paths that implement it.
# Hand-maintained because filenames don't carry the DASH-EXX-FYY codes.
FEATURE_HINTS: Dict[str, List[str]] = {
    "DASH-E01-F01": ["frontend/src/app/services/api.ts", "frontend/src/app/components/Layout.tsx"],
    "DASH-E01-F02": ["frontend/src/app/pages/Settings.tsx"],
    "DASH-E02-F01": ["frontend/src/app/contexts/FilterContext.tsx", "frontend/src/app/components/FilterPanel.tsx", "frontend/src/app/components/FilterSidebar.tsx"],
    "DASH-E02-F02": ["frontend/src/app/contexts/CrossFilterContext.tsx"],
    "DASH-E03-F01": ["backend/source_models/**/*.py"],
    "DASH-E03-F02": ["backend/reports/models.py"],
    "DASH-E03-F03": ["backend/pipeline/inventory_pipeline.py", "backend/pipeline/financial_pipeline.py", "backend/pipeline/management/**/*.py"],
    "DASH-E04-F01": ["frontend/src/app/pages/ExecutiveSummary.tsx", "backend/api/executive.py"],
    "DASH-E04-F02": ["frontend/src/app/pages/ExecutiveSummary.tsx", "backend/api/executive.py"],
    "DASH-E04-F03": ["frontend/src/app/pages/ExecutiveSummary.tsx", "backend/api/executive.py"],
    "DASH-E05-F01": ["frontend/src/app/pages/SalesCommandCenter.tsx", "backend/api/sales.py"],
    "DASH-E05-F02": ["frontend/src/app/pages/SalesCommandCenter.tsx", "backend/api/sales.py"],
    "DASH-E06-F01": ["frontend/src/app/pages/FinancialDeepDive.tsx", "backend/api/financial.py"],
    "DASH-E06-F02": ["frontend/src/app/pages/FinancialDeepDive.tsx", "backend/api/financial.py"],
    "DASH-E06-F03": ["frontend/src/app/pages/FinancialDeepDive.tsx", "backend/api/financial.py"],
    "DASH-E07-F01": ["frontend/src/app/pages/InventoryOperations.tsx", "backend/api/inventory.py"],
    "DASH-E07-F02": ["frontend/src/app/pages/InventoryOperations.tsx", "backend/api/inventory.py"],
    "DASH-E07-F03": ["frontend/src/app/pages/InventoryOperations.tsx", "backend/api/inventory.py"],
    "DASH-E08-F01": ["frontend/src/app/pages/ProcurementIntelligence.tsx", "backend/api/procurement.py"],
    "DASH-E08-F02": ["frontend/src/app/pages/ProcurementIntelligence.tsx", "backend/api/procurement.py"],
    "DASH-E08-F03": ["frontend/src/app/pages/ProcurementIntelligence.tsx", "backend/api/procurement.py"],
    "DASH-E09-F01": ["frontend/src/app/pages/GSTCompliance.tsx", "backend/api/compliance.py"],
    "DASH-E09-F02": ["frontend/src/app/pages/GSTCompliance.tsx", "backend/api/compliance.py"],
    "DASH-E10-F01": ["frontend/src/app/pages/OtherPages.tsx", "backend/api/compliance.py"],
    "DASH-E11-F01": ["frontend/src/app/pages/OtherPages.tsx", "backend/api/working_capital.py"],
    "DASH-E12-F01": ["frontend/src/app/pages/OtherPages.tsx", "backend/api/location.py"],
    "DASH-E13-F01": ["frontend/src/app/pages/OtherPages.tsx", "backend/api/product.py"],
    "DASH-E14-F01": ["frontend/src/app/pages/OtherPages.tsx", "backend/api/dispatch.py"],
    "DASH-E15-F01": ["frontend/src/app/pages/OtherPages.tsx", "backend/api/loyalty.py"],
    "DASH-E16-F01": ["frontend/src/app/pages/OtherPages.tsx", "backend/api/audit.py"],
    "DASH-E17-F01": ["frontend/src/app/pages/detail/*.tsx"],
    "DASH-E18-F01": ["frontend/src/app/pages/SalesReport.tsx", "frontend/src/app/pages/PurchaseReport.tsx"],
    "DASH-E19-F01": ["backend/api/pipeline_api.py", "frontend/src/app/pages/Settings.tsx"],
    "DASH-E20-F01": ["backend/api/middleware.py"],
    "DASH-E20-F02": ["backend/api/middleware.py"],
    "DASH-E20-F03": ["backend/start.sh"],
}


def build():
    print(f"Fetching work packages from {OP_BASE}/projects/{PROJECT_ID} ...")
    wps = fetch_all_work_packages()
    print(f"  {len(wps)} work packages")

    by_id = {w["id"]: w for w in wps}
    children: Dict[int, List[int]] = {}
    for w in wps:
        p = w.get("_links", {}).get("parent", {}).get("href")
        if p:
            pid = int(p.rstrip("/").split("/")[-1])
            children.setdefault(pid, []).append(w["id"])

    # Build flat rows for the RTM
    rows = []
    user_stories = [w for w in wps if classify(w["subject"]) == "user_story"]
    user_stories.sort(key=lambda w: w["subject"])

    for us in user_stories:
        feat_code = parent_code_from_subject(us["subject"])
        epic_code = feat_code.rsplit("-F", 1)[0] if feat_code else ""
        # Find the [TEST] sibling for this feature, then count its TC children.
        feat_id = None
        feat_subject = ""
        parent_ref = us.get("_links", {}).get("parent", {}).get("href")
        if parent_ref:
            feat_id = int(parent_ref.rstrip("/").split("/")[-1])
            feat = by_id.get(feat_id)
            if feat:
                feat_subject = feat["subject"]
        # Find [TEST] grouping with same feat_code
        test_group = next(
            (
                w
                for w in wps
                if w["subject"].startswith(f"[TEST] {feat_code}")
            ),
            None,
        )
        tc_count = 0
        tc_ids: List[str] = []
        if test_group:
            for tc_id in children.get(test_group["id"], []):
                tc_ids.append(str(tc_id))
                tc_count += 1
        code_refs = grep_code_references(feat_code or "")
        rows.append(
            {
                "epic": epic_code,
                "feature_code": feat_code,
                "feature_subject": feat_subject,
                "story_id": us["id"],
                "story_subject": us["subject"],
                "status": us.get("_links", {}).get("status", {}).get("title", ""),
                "test_case_count": tc_count,
                "test_case_ids": ",".join(tc_ids),
                "code_references": "; ".join(code_refs),
                "coverage_gap": "RED — no test cases" if tc_count == 0 else "",
            }
        )

    # CSV
    csv_path = DOCS_DIR / "RTM.csv"
    with csv_path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else [])
        w.writeheader()
        w.writerows(rows)
    print(f"  wrote {csv_path}")

    # Markdown
    md_path = DOCS_DIR / "RTM.md"
    with md_path.open("w") as f:
        f.write("# Requirements Traceability Matrix — healthcare-dashboard\n\n")
        f.write(
            f"Generated from OpenProject `{OP_BASE}` project `{PROJECT_ID}` against "
            f"the working tree at `{REPO_ROOT}`. Re-run `python3 scripts/build_rtm.py` "
            "to refresh.\n\n"
        )
        gap_rows = [r for r in rows if r["coverage_gap"]]
        f.write(f"Total user stories: **{len(rows)}**\n")
        f.write(f"Stories with zero linked test cases (red): **{len(gap_rows)}**\n\n")
        f.write("| Epic | Feature | Story | Status | TCs | Code refs | Gap |\n")
        f.write("|---|---|---|---|---:|---|---|\n")
        for r in rows:
            f.write(
                "| {epic} | {feat_code} | #{sid} {ssubj} | {status} | {tcc} | {refs} | {gap} |\n".format(
                    epic=r["epic"],
                    feat_code=r["feature_code"] or "—",
                    sid=r["story_id"],
                    ssubj=r["story_subject"].replace("|", "\\|")[:80],
                    status=r["status"],
                    tcc=r["test_case_count"],
                    refs=(r["code_references"][:80] or "—").replace("|", "\\|"),
                    gap=r["coverage_gap"],
                )
            )
    print(f"  wrote {md_path}")


if __name__ == "__main__":
    build()
