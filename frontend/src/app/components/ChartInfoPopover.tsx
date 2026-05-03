import React, { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

interface ChartInfoPopoverProps {
  title: string;
  text: string;
}

export const ChartInfoPopover: React.FC<ChartInfoPopoverProps> = ({ title, text }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        title="What is this?"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <Info className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute right-0 top-full mt-1 z-[1000] w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
        >
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
          <div className="space-y-2 text-xs leading-relaxed text-gray-700">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
