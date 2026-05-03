import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ChartFocusModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  fullScreen?: boolean;
  children: ReactNode;
}

export const ChartFocusModal: React.FC<ChartFocusModalProps> = ({
  open,
  title,
  onClose,
  fullScreen = false,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = fullScreen
    ? 'w-[98vw] h-[96vh]'
    : 'w-[80vw] max-w-5xl h-[78vh] max-h-[800px]';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl flex flex-col ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-5 overflow-auto">{children}</div>
      </div>
    </div>
  );
};
