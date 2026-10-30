import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  type?: 'danger' | 'warning' | 'info';
  confirmVariant?: 'danger' | 'warning' | 'info' | string;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose?: () => void;
  onCancel?: () => void;
  isConfirming?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  type = 'danger',
  confirmVariant,
  title,
  message,
  confirmText = 'Yes, delete',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  onCancel,
  isConfirming = false
}) => {
  const actualClose = onClose || onCancel || (() => {});
  const actualType = (confirmVariant as any) || type;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        actualClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, actualClose]);

  if (!isOpen) return null;

  const defaultTitle = 
    actualType === 'danger'? 'Are you sure?' :
    actualType === 'warning'? 'Warning message' :
    'Confirmation';

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-all duration-200"
      onClick={actualClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 sm:p-8 text-center transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon Button */}
        <button
          onClick={actualClose}
          disabled={isConfirming}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon with Glowing Ring */}
        <div className="flex justify-center mb-5">
          {actualType === 'danger' && (
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center ring-8 ring-rose-50/70 shadow-inner">
              <Trash2 className="w-8 h-8 stroke-[2.2]" />
            </div>
          )}
          {actualType === 'warning' && (
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center ring-8 ring-amber-50/70 shadow-inner">
              <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
            </div>
          )}
          {actualType === 'info' && (
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center ring-8 ring-teal-50/70 shadow-inner">
              <HelpCircle className="w-8 h-8 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2.5 tracking-tight">
          {title || defaultTitle}
        </h3>

        {/* Message */}
        <p className="text-sm sm:text-base text-slate-600 mb-8 leading-relaxed whitespace-pre-line max-w-md mx-auto">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isConfirming}
            onClick={actualClose}
            className="flex-1 py-3 px-5 font-bold rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm border border-slate-200/80 disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => {
              onConfirm();
            }}
            className={`flex-1 py-3 px-5 font-bold rounded-2xl text-white shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
              actualType === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25' :
              actualType === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25' :
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
