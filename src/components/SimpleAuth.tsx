import React, { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, AlertCircle, ArrowLeft, MessageCircle, Package, Clock, CheckCircle2, Search } from 'lucide-react';
import { BookOrder } from '../types';

interface SimpleAuthProps {
  onSuccess: (identifier: string, userData?: { name?: string; photoURL?: string }) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const WHATSAPP_HOTLINE = '8801329458568';

export default function SimpleAuth({ onSuccess, onCancel, isModal = false }: SimpleAuthProps) {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchedOrders, setSearchedOrders] = useState<BookOrder[] | null>(null);

  const formatPhone = (phone: string) => {
    let formatted = phone.trim();
    if (formatted.startsWith('01')) {
      return '+88' + formatted;
    }
    return formatted;
  };

  const handleTrackOrder = async (e: FormEvent) => {
    e.preventDefault();
    const clean = identifier.trim();
    if (!clean) {
      setError('Please enter your phone number or Order ID.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
          setSearchedOrders(data.orders);
          localStorage.setItem('customer_session_phone', clean);
          setIsLoading(false);
          return;
        }
      }
      // If no order found in current active memory, show empty list with 1-click WhatsApp button
      setSearchedOrders([]);
    } catch {
      setSearchedOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getWhatsAppTrackUrl = (orderId?: string) => {
    const text = orderId
      ? `Hello SHOSTIR BAZAR,\nI would like an update on my order #${orderId} (Phone: ${identifier.trim()}). Please let me know the status!`
      : `Hello SHOSTIR BAZAR,\nI need assistance with my order (Phone: ${identifier.trim() || 'Not Provided'}). Please assist me!`;
    return `https://wa.me/${WHATSAPP_HOTLINE}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className={`w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 ${isModal ? 'p-6' : 'p-8'}`}>
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
          <MessageCircle className="h-6 w-6 fill-emerald-600/20" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">1-Click Order Tracking & Support</h2>
        <p className="text-xs text-slate-500 mt-1">Instant delivery updates directly on WhatsApp & phone</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-xs border border-red-100">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SEARCH / TRACK INPUT */}
      {!searchedOrders ? (
        <form onSubmit={handleTrackOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Phone Number or Order ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 01XXXXXXXXX or ORD-2026-..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-medium"
                autoFocus
              />
              <Smartphone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="h-4 w-4" />
            {isLoading ? 'Checking Orders...' : 'Track My Order (Instant)'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold">Or free live support</span>
            </div>
          </div>

          {/* 1-Click WhatsApp Verification & Support */}
          <a
            href={getWhatsAppTrackUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer no-underline"
          >
            <MessageCircle className="h-4 w-4 fill-current" />
            Track on WhatsApp (1-Click)
          </a>

          {identifier.trim() && (
            <button
              type="button"
              onClick={() => onSuccess(formatPhone(identifier))}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900 pt-2 transition-colors cursor-pointer"
            >
              Log in as Customer & Continue
            </button>
          )}
        </form>
      ) : (
        /* ORDER RESULTS VIEW */
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setSearchedOrders(null)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Search
            </button>
            <span className="text-xs font-bold text-slate-600">
              {searchedOrders.length} Order(s) Found
            </span>
          </div>

          {searchedOrders.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-3 border border-slate-100">
              <Package className="h-10 w-10 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                No orders found under "{identifier}". If you just ordered, please chat with us directly!
              </p>
              <a
                href={getWhatsAppTrackUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer no-underline"
              >
                <MessageCircle className="h-4 w-4 fill-current" />
                Inquire on WhatsApp
              </a>
            </div>
          ) : (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {searchedOrders.map((order) => (
                <div key={order.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">{order.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      order.status === 'Delivered' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : order.status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status || 'Processing'}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Payable: <strong className="text-orange-600">৳{(order.totalAmount || order.totalPrice || 0).toLocaleString()}</strong></span>
                    <span className="text-[11px] text-slate-400">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <a
                    href={getWhatsAppTrackUrl(order.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-2 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-xs flex items-center justify-center gap-2 cursor-pointer no-underline transition-all"
                  >
                    <MessageCircle className="h-3.5 w-3.5 fill-current" />
                    Track via WhatsApp
                  </a>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onSuccess(formatPhone(identifier))}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Continue Shopping
          </button>
        </motion.div>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors text-center cursor-pointer"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
