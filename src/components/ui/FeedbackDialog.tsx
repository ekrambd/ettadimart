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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-7 text-center transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Icon */}
        <div className="flex justify-center mb-4">
          {type === 'success' && (
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50/50">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
          )}
          {type === 'error' && (
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center ring-8 ring-rose-50/50">
              <AlertCircle className="w-8 h-8 stroke-[2.5]" />
            </div>
          )}
          {type === 'info' && (
            <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center ring-8 ring-teal-50/50">
              <Info className="w-8 h-8 stroke-[2.5]" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
          {title || defaultTitle}
        </h3>

        {/* Message */}
        <p className="text-sm text-slate-600 mb-6 leading-relaxed whitespace-pre-line">
          {message}
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-2.5 px-4 font-bold rounded-xl text-white shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer text-sm sm:text-base ${
            type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' :
            type === 'error' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' :
            'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
};
