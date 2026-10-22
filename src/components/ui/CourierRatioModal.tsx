import React from 'react';
import { 
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, 
  Truck, Package, Phone, X, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { CustomerCourierRatio } from '../../lib/courierFraudService';

interface CourierRatioModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratio: CustomerCourierRatio | null;
  customerName?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const CourierRatioModal: React.FC<CourierRatioModalProps> = ({
  isOpen,
  onClose,
  ratio,
  customerName,
  isLoading,
  onRefresh
}) => {
  if (!isOpen || !ratio) return null;

  const isSafe = ratio.riskLevel === 'safe';
  const isMedium = ratio.riskLevel === 'medium';
  const isHigh = ratio.riskLevel === 'high';
  const isNew = ratio.riskLevel === 'new';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp">
        {/* Top Header */}
        <div className={`p-6 text-white relative overflow-hidden ${
          isSafe ? 'bg-gradient-to-r from-emerald-600 to-teal-700' :
          isMedium ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
          isHigh ? 'bg-gradient-to-r from-rose-600 to-red-700' :
          'bg-gradient-to-r from-slate-800 to-slate-900'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
              {isSafe && <ShieldCheck className="w-7 h-7 text-emerald-100" />}
              {isMedium && <AlertTriangle className="w-7 h-7 text-amber-100" />}
              {isHigh && <XCircle className="w-7 h-7 text-rose-100" />}
              {isNew && <Truck className="w-7 h-7 text-slate-100" />}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Courier fraud and delivery ratio
              </span>
              <h3 className="text-xl font-black">{customerName || 'customer information'}</h3>
              <p className="text-xs text-white/90 flex items-center gap-1 font-mono mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                <span>{ratio.phone}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          {/* Main Success Meter Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">Overall Delivery Success Rate</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-3xl font-black font-mono ${
                    isSafe ? 'text-emerald-600' :
                    isMedium ? 'text-amber-600' :
                    isHigh ? 'text-rose-600' : 'text-slate-700'
                  }`}>
                    {ratio.totalParcels > 0 ? `${ratio.successRatio}%` : 'N/A'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    ({ratio.riskLabel})
                  </span>
                </div>
              </div>

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
                  <span>refresh</span>
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  isSafe ? 'bg-emerald-500' :
                  isMedium ? 'bg-amber-500' :
                  isHigh ? 'bg-rose-500' : 'bg-slate-400'
                }`}
                style={{ width: `${ratio.totalParcels > 0 ? ratio.successRatio : 0}%` }}
              />
            </div>
            
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {ratio.summaryText}
            </p>
          </div>

          {/* Detailed Numbers Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            {/* Total */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 block">Total parcel</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                {ratio.totalParcels}
              </span>
            </div>

            {/* Delivered */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-emerald-800 block">Successful delivery</span>
              <span className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">
                {ratio.deliveredParcels}
              </span>
            </div>

            {/* Returned / Cancelled */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 text-center">
              <span className="text-[11px] font-bold text-rose-800 block">Return / Cancel</span>
              <span className="text-xl font-black text-rose-700 font-mono mt-0.5 block">
                {ratio.returnedParcels}
              </span>
            </div>
          </div>

          {/* In-Store History (This Store) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-teal-600" />
              <span>Your own store order history</span>
            </h4>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span>Total Order: <strong className="text-slate-900 font-mono">{ratio.storeOrdersCount}</strong> T</span>
              <span>Delivered: <strong className="text-emerald-700 font-mono">{ratio.storeDeliveredCount}</strong> T</span>
              <span>Cancel: <strong className="text-rose-700 font-mono">{ratio.storeCancelledCount}</strong> T</span>
            </div>
          </div>

          {/* Recommendation Box */}
          <div className={`rounded-2xl p-4 border flex items-start gap-3 ${
            isSafe ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' :
            isMedium ? 'bg-amber-50/70 border-amber-200 text-amber-950' :
            isHigh ? 'bg-rose-50/70 border-rose-200 text-rose-950' :
            'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-current" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold">Courier Booking Recommendations:</p>
              <p className="leading-relaxed font-medium">{ratio.recommendation}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
          >
            turn off
          </button>
        </div>
      </div>
    </div>
  );
};
