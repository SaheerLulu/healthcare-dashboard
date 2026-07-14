/** Shared CSV export used by chart data tables and detail pages. */

export interface CsvColumn {
  key: string;
  label: string;
  /** Optional display formatter; CSV uses the RAW value unless csvRaw=false. */
  format?: (value: any, row?: any) => string;
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(columns: CsvColumn[], rows: any[]): string {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const lines = rows.map(row =>
    columns.map(c => csvEscape(row?.[c.key])).join(',')
  );
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename: string, columns: CsvColumn[], rows: any[]): void {
  const csv = buildCsv(columns, rows);
  // BOM so Excel opens ₹ and other UTF-8 glyphs correctly.
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Derive table columns from the first row when a page doesn't specify any. */
export function inferColumns(rows: any[]): CsvColumn[] {
  if (!rows.length || typeof rows[0] !== 'object') return [];
  return Object.keys(rows[0])
    .filter(k => !['fill', 'stroke', 'payload', 'color'].includes(k))
    .map(k => ({
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }));
}
