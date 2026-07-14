import React, { useEffect, useMemo, useState } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_MS = 86400000;

const parseDay = (iso: string) => new Date(`${iso}T00:00:00`);
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const addDays = (iso: string, days: number) => {
  const d = parseDay(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
const daysBetween = (a: string, b: string) =>
  Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY_MS);

const fmtShort = (iso: string) =>
  parseDay(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

interface DateRangeSliderProps {
  /** Timeline bounds (ISO dates). */
  min: string;
  max: string;
  /** Selected window (ISO dates), clamped into bounds. */
  start: string;
  end: string;
  /** Fired on commit (thumb release / nudge / keyboard). */
  onChange: (start: string, end: string) => void;
}

/**
 * Power-BI-style timeline slicer: a dual-thumb day slider with window
 * nudge buttons (◀ ▶ shift the whole window by its own width). Drag
 * updates preview labels live; the filter context is only updated on
 * commit so chart consumers don't re-render at drag frequency.
 */
export const DateRangeSlider: React.FC<DateRangeSliderProps> = ({ min, max, start, end, onChange }) => {
  const total = Math.max(1, daysBetween(min, max));

  const clampIdx = (i: number) => Math.min(total, Math.max(0, i));
  const external: [number, number] = useMemo(() => [
    clampIdx(daysBetween(min, start < min ? min : start)),
    clampIdx(daysBetween(min, end > max ? max : end)),
  ], [min, max, start, end, total]);

  const [value, setValue] = useState<[number, number]>(external);
  const [dragging, setDragging] = useState(false);

  // Follow external changes (presets, reset) unless mid-drag.
  useEffect(() => {
    if (!dragging) setValue(external);
  }, [external[0], external[1], dragging]);

  const commit = (v: number[]) => {
    setDragging(false);
    onChange(addDays(min, v[0]), addDays(min, v[1]));
  };

  const windowDays = value[1] - value[0];

  const nudge = (direction: -1 | 1) => {
    const shift = Math.max(1, windowDays) * direction;
    let lo = value[0] + shift;
    let hi = value[1] + shift;
    if (lo < 0) { hi -= lo; lo = 0; }
    if (hi > total) { lo -= hi - total; hi = total; }
    lo = clampIdx(lo); hi = clampIdx(hi);
    setValue([lo, hi]);
    onChange(addDays(min, lo), addDays(min, hi));
  };

  const previewStart = addDays(min, value[0]);
  const previewEnd = addDays(min, value[1]);

  return (
    <div className="flex items-center gap-3 w-full" data-testid="date-range-slider">
      <button
        onClick={() => nudge(-1)}
        disabled={value[0] <= 0}
        aria-label="Shift window earlier"
        title="Shift window earlier"
        className="p-1 rounded-md transition-colors disabled:opacity-30"
        style={{ color: 'var(--ink-2)', border: '1px solid var(--line)', backgroundColor: 'var(--surface-0)' }}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <span className="mono text-[11px] font-semibold whitespace-nowrap w-[76px] text-right" style={{ color: 'var(--ink)' }}>
        {fmtShort(previewStart)}
      </span>

      <SliderPrimitive.Root
        value={value}
        min={0}
        max={total}
        step={1}
        minStepsBetweenThumbs={0}
        onValueChange={(v) => { setDragging(true); setValue([v[0], v[1]] as [number, number]); }}
        onValueCommit={commit}
        aria-label="Date range"
        className="relative flex w-full touch-none items-center select-none h-5"
      >
        <SliderPrimitive.Track
          className="relative grow overflow-hidden rounded-full h-1.5"
          style={{ backgroundColor: 'var(--line)' }}
        >
          <SliderPrimitive.Range
            className="absolute h-full"
            style={{ backgroundColor: 'var(--brand)' }}
          />
        </SliderPrimitive.Track>
        {[0, 1].map(i => (
          <SliderPrimitive.Thumb
            key={i}
            aria-label={i === 0 ? 'Start date' : 'End date'}
            className="block w-3.5 h-3.5 rounded-full shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{ backgroundColor: 'var(--surface-0)', border: '2px solid var(--brand)' }}
          />
        ))}
      </SliderPrimitive.Root>

      <span className="mono text-[11px] font-semibold whitespace-nowrap w-[76px]" style={{ color: 'var(--ink)' }}>
        {fmtShort(previewEnd)}
      </span>

      <button
        onClick={() => nudge(1)}
        disabled={value[1] >= total}
        aria-label="Shift window later"
        title="Shift window later"
        className="p-1 rounded-md transition-colors disabled:opacity-30"
        style={{ color: 'var(--ink-2)', border: '1px solid var(--line)', backgroundColor: 'var(--surface-0)' }}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
