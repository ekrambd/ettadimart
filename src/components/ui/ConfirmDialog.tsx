import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  type?: 'danger' | 'warning' | 'info';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  isConfirming?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  type = 'danger',
  title,
  message,
  confirmText = 'Yes, delete',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  isConfirming = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultTitle = 
    type === 'danger'? 'Are you sure?' :
    type === 'warning'? 'Warning message' :
    'Confirmation';

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-7 text-center transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          disabled={isConfirming}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon with Glowing Ring */}
        <div className="flex justify-center mb-4">
          {type === 'danger' && (
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center ring-8 ring-rose-50/70 shadow-inner">
              <Trash2 className="w-7 h-7 stroke-[2.2]" />
            </div>
          )}
          {type === 'warning' && (
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center ring-8 ring-amber-50/70 shadow-inner">
              <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
            </div>
          )}
          {type === 'info' && (
            <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center ring-8 ring-teal-50/70 shadow-inner">
              <HelpCircle className="w-7 h-7 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 tracking-tight">
          {title || defaultTitle}
        </h3>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed whitespace-pre-line">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-150 active:scale-[0.98] cursor-pointer text-xs sm:text-sm border border-slate-200/80 disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => {
              onConfirm();
            }}
            className={`flex-1 py-2.5 px-4 font-bold rounded-xl text-white shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
              type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25' :
              type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25' :
              'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
            }`}
          >
            {isConfirming ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
