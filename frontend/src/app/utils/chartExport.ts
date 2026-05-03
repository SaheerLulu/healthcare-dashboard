import { toPng } from 'html-to-image';

export type ColumnFormat = 'number' | 'currency' | 'percent' | 'date' | 'text';

export interface ChartColumn {
  key: string;
  label: string;
  format?: ColumnFormat;
}

const csvEscape = (value: any): string => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const formatCell = (value: any, format?: ColumnFormat): string => {
  if (value === null || value === undefined) return '';
  switch (format) {
    case 'number': {
      const n = Number(value);
      return isFinite(n) ? n.toFixed(2) : String(value);
    }
    case 'currency': {
      const n = Number(value);
      return isFinite(n) ? n.toFixed(2) : String(value);
    }
    case 'percent': {
      const n = Number(value);
      return isFinite(n) ? `${n.toFixed(2)}%` : String(value);
    }
    case 'date':
    case 'text':
    default:
      return String(value);
  }
};

export const downloadCSV = (
  rows: any[],
  columns: ChartColumn[],
  filename: string
): void => {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows
    .map((row) =>
      columns.map((c) => csvEscape(formatCell(row?.[c.key], c.format))).join(',')
    )
    .join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadPNG = async (
  node: HTMLElement | null,
  filename: string
): Promise<void> => {
  if (!node) return;
  try {
    const dataUrl = await toPng(node, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('PNG export failed', err);
  }
};

const sanitize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const fileStem = (title: string): string => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${sanitize(title) || 'chart'}-${stamp}`;
};

export const inferColumnsFromRows = (rows: any[]): ChartColumn[] => {
  if (!rows.length) return [];
  const sample = rows[0];
  return Object.keys(sample)
    .filter((k) => k !== 'fill' && k !== 'payload' && !k.startsWith('_'))
    .map((k) => {
      const v = sample[k];
      let format: ColumnFormat = 'text';
      if (typeof v === 'number') format = 'number';
      return { key: k, label: k, format };
    });
};
