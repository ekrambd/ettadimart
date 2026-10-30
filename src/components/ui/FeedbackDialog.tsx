import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface FeedbackDialogProps {
  isOpen: boolean;
  type?: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  confirmText?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  isOpen,
  type = 'success',
  title,
  message,
  confirmText = 'OK',
  onClose,
  autoCloseMs
}) => {
  useEffect(() => {
    if (!isOpen || !autoCloseMs) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  const defaultTitle = 
    type === 'success'? 'Successful!' :
    type === 'error'? 'There is a problem!' :
    'Notice';

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-all duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 sm:p-8 text-center transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Icon */}
        <div className="flex justify-center mb-5">
          {type === 'success' && (
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50/60 shadow-xs">
              <CheckCircle2 className="w-9 h-9 stroke-[2.4]" />
            </div>
          )}
          {type === 'error' && (
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center ring-8 ring-rose-50/60 shadow-xs">
              <AlertCircle className="w-9 h-9 stroke-[2.4]" />
            </div>
          )}
          {type === 'info' && (
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center ring-8 ring-teal-50/60 shadow-xs">
              <Info className="w-9 h-9 stroke-[2.4]" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2.5 tracking-tight">
          {title || defaultTitle}
        </h3>

        {/* Message */}
        <p className="text-sm sm:text-base text-slate-600 mb-7 leading-relaxed whitespace-pre-line max-w-sm mx-auto">
          {message}
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-3 px-5 font-bold rounded-2xl text-white shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm ${
            type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' :
            type === 'error' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30' :
            'bg-teal-600 hover:bg-teal-700 shadow-teal-600/30'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
};
