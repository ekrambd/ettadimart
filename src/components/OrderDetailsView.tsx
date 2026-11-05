import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Check, CheckCircle2, Copy, Edit2, ExternalLink, FileText, 
  MessageCircle, MoreVertical, Package, Phone, Printer, Send, 
  Share2, ShieldCheck, ShoppingBag, Trash2, Truck, User, X, 
  Clock, AlertCircle, Ban, CheckCircle, ChevronDown, RefreshCw,
  CreditCard, DollarSign, MapPin
} from 'lucide-react';
import { BookOrder } from '../types';
import { useAppStore } from '../store/useAppStore';
import { isOrderCod, isOrderPaid } from '../lib/orderPaymentUtils';

// Standard Code128 / Code39 authentic Barcode SVG Generator
function BarcodeSVG({ value, height = 36 }: { value: string; height?: number }) {
  const text = (value || 'ORD-1001').toUpperCase();
  // Standard Code39 pattern table for alphanumeric barcodes
  const code39Patterns: Record<string, string> = {
    '0': 'bwbwbwBwb', '1': 'BwbwbwBwb', '2': 'bwBwbwBwb', '3': 'BwBwbwbwb',
    '4': 'bwbwBwBwb', '5': 'BwbwBwbwb', '6': 'bwBwBwbwb', '7': 'bwbwbwBwB',
    '8': 'BwbwbwBwB', '9': 'bwBwbwBwB', 'A': 'BwbwbwbwB', 'B': 'bwBwbwbwB',
    'C': 'BwBwbwbwb', 'D': 'bwbwBwbwB', 'E': 'BwbwBwbwb', 'F': 'bwBwBwbwb',
    'G': 'bwbwbwBwB', 'H': 'BwbwbwBwB', 'I': 'bwBwbwBwB', 'J': 'bwbwBwBwb',
    'K': 'Bwbwbwbwb', 'L': 'bwBwbwbwb', 'M': 'BwBwbwbwb', 'N': 'bwbwBwbwb',
    'O': 'BwbwBwbwb', 'P': 'bwBwBwbwb', 'Q': 'bwbwbwBwb', 'R': 'BwbwbwBwb',
    'S': 'bwBwbwBwb', 'T': 'bwbwBwBwb', 'U': 'Bwbwbwbwb', 'V': 'bwBwbwbwb',
    'W': 'BwBwbwbwb', 'X': 'bwbwBwbwb', 'Y': 'BwbwBwbwb', 'Z': 'bwBwBwbwb',
    '-': 'bwbwbwBwb', '.': 'Bwbwbwbwb', ' ': 'bWBwbwbwb', '$': 'bwbWbWbwb',
    '/': 'bWbwbWbwb', '+': 'bWbWbwbwb', '%': 'bwbWbWbwb', '*': 'bwbwbwBwb'
  };

  const cleanChars = `*${text.replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '')}*`.split('');
  const barElements: { x: number; width: number }[] = [];
  let currentX = 4;
  const narrow = 1.2;
  const wide = 2.8;

  cleanChars.forEach((ch) => {
    const pattern = code39Patterns[ch] || code39Patterns['*'];
    for (let i = 0; i < pattern.length; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === 'B' || pattern[i] === 'W';
      const w = isWide ? wide : narrow;
      if (isBar) {
        barElements.push({ x: currentX, width: w });
      }
      currentX += w;
    }
    currentX += narrow; // inter-character gap
  });

  const totalWidth = currentX + 4;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${totalWidth} ${height}`} className="w-full h-8" preserveAspectRatio="none">
        {barElements.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#0f172a"
          />
        ))}
      </svg>
      <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold mt-0.5 select-all">
        {text}
      </span>
    </div>
  );
}

interface Props {
  order: BookOrder;
  onClose: () => void;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<void>;
  onEditOrder: (order: BookOrder) => void;
  onDeleteOrder?: (id: string) => Promise<void>;
}

const ORDER_LIFECYCLE_STEPS = [
  'Pending',
  'Placed',
  'Confirmed',
  'Packaging',
  'Shipment',
  'Shipping',
  'Delivered'
];

export function OrderDetailsView({ 
  order, 
  onClose, 
  onUpdateStatus, 
  onEditOrder,
  onDeleteOrder
}: Props) {
  const { ecomSettings, instituteInfo } = useAppStore();

  // Active top tab (Overview, Workflow, Customer, Delivery, Items, Payment, Activity)
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'customer' | 'delivery' | 'items' | 'payment' | 'activity'>('overview');
  
  // Parse items safely handling nested structures (e.g. items: [{ product: {...}, quantity: 1 }])
  const parsedItems: Array<{
    title: string;
    sku: string;
    image: string;
    quantity: number;
    price: number;
  }> = (() => {
    let rawItems = order.items;
    if (typeof rawItems === 'string') {
      try {
        rawItems = JSON.parse(rawItems);
      } catch {
        rawItems = [];
      }
    }

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      return rawItems.map((it: any) => {
        const prod = it.product || it;
        const variant = it.variant || prod.variant;
        const title = variant?.name
          ? `${prod.title || prod.productTitle || prod.name || 'Product'} (${variant.name})`
          : (prod.title || prod.productTitle || prod.name || it.title || order.productTitle || 'Product');
        const sku = prod.sku || it.sku || variant?.sku || order.sku || 'SKU-N/A';
        const image = variant?.image || prod.image || it.image || order.productImage || '';
        const quantity = Number(it.quantity || prod.quantity || 1);
        const price = Number(variant?.price ?? prod.price ?? it.price ?? order.price ?? 0);
        return { title, sku, image, quantity, price };
      });
    }

    // Fallback single product item from top-level order fields
    const defaultTitle = order.productTitle || (order as any).productName || 'Product';
    const defaultSku = order.sku || 'SKU-DEFAULT';
    const defaultImage = order.productImage || '';
    const defaultQty = Number(order.quantity || 1);
    const defaultPrice = Number(order.price || order.unitPrice || 0);
    return [{
      title: defaultTitle,
      sku: defaultSku,
      image: defaultImage,
      quantity: defaultQty,
      price: defaultPrice
    }];
  })();

  // Dynamic calculated totals based on parsed items
  const calculatedItemsSubtotal = parsedItems.reduce(
    (sum, it) => sum + (it.price * it.quantity),
    0
  );

  // If subtotal is 0 or order has top-level totalPrice/totalAmount, prioritize order value
  const itemsSubtotal = calculatedItemsSubtotal > 0
    ? calculatedItemsSubtotal
    : Number(order.totalPrice || order.totalAmount || order.price || 0);

  // Initial delivery charge default
  const initialDeliveryCharge = order.deliveryCharge !== undefined && order.deliveryCharge !== null
    ? Number(order.deliveryCharge)
    : (order.deliveryFee !== undefined && order.deliveryFee !== null ? Number(order.deliveryFee) : 0);

  // Dynamic financial adjustments
  const [deliveryCharge, setDeliveryCharge] = useState<number>(initialDeliveryCharge);
  const [discountAmount, setDiscountAmount] = useState<number>(order.couponDiscount || order.discountAmount || 0);
  const [couponCode, setCouponCode] = useState<string>(order.couponCode || '');
  const [extraDeliveryNote, setExtraDeliveryNote] = useState<string>('');

  // Customer Information In-line Edit
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState(order.customerName || (order as any).name || 'Customer');
  const [customerPhone, setCustomerPhone] = useState(order.phone || (order as any).customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(order.address || (order as any).customerAddress || '');
  const [internalNote, setInternalNote] = useState(order.notes || 'Order confirmed and ready for processing. - Admin');

  // Status & Payment Modal / Action States
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(
    isOrderPaid(order) ? (Number(order.totalAmount || order.totalPrice || 0)) : (Number(order.advancePaid || 0))
  );

  const grandTotal = Math.max(0, itemsSubtotal + Number(deliveryCharge) - Number(discountAmount));
  const dueAmount = Math.max(0, grandTotal - Number(paidAmount));

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Status step index calculation
  const getStepIndex = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver')) return 6;
    if (s.includes('shipping') || s.includes('shipped')) return 5;
    if (s.includes('shipment') || s.includes('ready')) return 4;
    if (s.includes('packag')) return 3;
    if (s.includes('confirm')) return 2;
    if (s.includes('placed')) return 1;
    return 0; // Pending
  };

  const currentStepIdx = getStepIndex(order.status);

  // Status changer
  const handleSelectStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Apply Coupon / Discount logic
  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    if (couponCode.toUpperCase() === 'FREE' || couponCode.toUpperCase() === 'FREESHIP') {
      setDeliveryCharge(0);
      alert('Coupon applied! Free delivery applied.');
    } else if (couponCode.toUpperCase() === 'SAVE100') {
      setDiscountAmount(100);
      alert('Coupon applied! ৳ 100 discount applied.');
    } else {
      setDiscountAmount(50);
      alert(`Coupon ${couponCode.toUpperCase()} applied! ৳ 50 discount.`);
    }
  };

  // WhatsApp helper
  const handleOpenWhatsApp = () => {
    const cleanPhone = (customerPhone || order.phone || '').replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const text = `Hello ${customerName || order.customerName}, your order #${order.id.replace('ORD-', '')} on Ettadi Mart is ${order.status}. Total: ৳ ${grandTotal}.`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Direct Phone Call
  const handleDirectCall = () => {
    window.location.href = `tel:${customerPhone || order.phone}`;
  };

  // Printable Invoice
  const handlePrintInvoice = () => {
    window.print();
  };

  const cleanOrderId = order.id.replace(/^ORD-/, '').replace(/^#/, '');

  return (
    <div className="flex-1 min-h-screen bg-slate-50 font-sans p-3 sm:p-5 lg:p-7 space-y-5 animate-fadeIn text-slate-800">
      
      {/* ============================================================== */}
      {/* 1. TOP HEADER & BREADCRUMB (Matching Screenshots)              */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Orders</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <span>Order #{cleanOrderId}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.id, 'orderId')}
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Copy Order ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copiedText === 'orderId' && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Copied!</span>
                )}
              </h2>
            </div>

            {/* Quick Status Subheader */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium pt-0.5">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{order.status}</span>
              </span>
              <span>•</span>
              <span className="text-slate-600 font-semibold">{order.productType || 'Web'}</span>
              <span>•</span>
              <span>
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '31 Oct 2026'}, {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '8:11 PM'}
              </span>
              <span>•</span>
              <span className="font-bold text-slate-900">{customerName}</span>
              <span>•</span>
              <span>{order.items?.length || 1} item</span>
              <span>•</span>
              <span className="font-bold text-slate-900">৳ {grandTotal.toLocaleString()}</span>
              <span>•</span>
              <span className="text-rose-600 font-semibold">Due ৳ {dueAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons: Notify, Open Desk, Collect payment */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Notify</span>
            </button>

            <button
              type="button"
              onClick={() => onEditOrder(order)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Open Desk</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCollectPaymentOpen(!isCollectPaymentOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <span>Collect payment</span>
                <span className="text-xs">→</span>
              </button>

              {isCollectPaymentOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-40 space-y-3 animate-fadeIn">
                  <h4 className="text-xs font-bold text-slate-900">Record Payment</h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500">Paid Amount (৳)</label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Remaining Due:</span>
                    <span className="font-bold text-rose-600">৳ {Math.max(0, grandTotal - paidAmount).toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCollectPaymentOpen(false);
                      alert('Payment recorded successfully!');
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Confirm Record
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Overview, Workflow, Customer, Delivery, Items, Payment, Activity) */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs">
            {(['overview', 'workflow', 'customer', 'delivery', 'items', 'payment', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab === 'items' ? `Items ${order.items?.length || 1}` : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="hidden sm:inline">Checks</span>
            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px]">
              3
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MAIN 2-COLUMN ORDER BODY GRID                               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN (8 cols): Items, Pricing Adjuster, Payment, Delivery & Invoices */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Card 1: Items List (Matching Image) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Items • {order.items?.length || 1}
              </span>
              <button
                type="button"
                onClick={() => onEditOrder(order)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3">
              {parsedItems.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/60 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                      {it.image ? (
                        <img src={it.image} alt={it.title} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">{it.title}</h4>
                      <span className="text-xs text-slate-500 font-medium">
                        {it.quantity} × ৳ {it.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-sm text-slate-900 font-mono">
                    ৳ {(it.price * it.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Items</span>
                <span className="font-mono font-bold text-slate-900">৳ {itemsSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Delivery</span>
                <span className="font-mono font-bold text-slate-900">৳ {Number(deliveryCharge).toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-semibold">
                  <span>Discount</span>
                  <span className="font-mono font-bold">- ৳ {Number(discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                <span>Total</span>
                <span className="font-mono text-base text-slate-900">৳ {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Live Financial Adjusters: Delivery charge, Discount, Coupon (Matching red box in screenshot) */}
            <div className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Delivery charge
                  </label>
                  <input
                    type="number"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value) || 0)}
                    className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Discount
                  </label>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Coupon
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FREE"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer self-end shrink-0"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Extra delivery charge note link */}
              <div className="mt-2 text-[11px] text-slate-400 font-medium">
                <span>Extra delivery charge</span>
              </div>
            </div>
          </div>

          {/* Card 2: Payment Record Card (Paid, Due & Record payment button) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment</span>
              <button
                type="button"
                onClick={() => setIsCollectPaymentOpen(true)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Paid</span>
                  <span className="text-sm font-black text-slate-900 font-mono">৳ {paidAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Due</span>
                  <span className="text-sm font-black text-rose-600 font-mono">৳ {dueAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCollectPaymentOpen(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Record payment
              </button>
            </div>
          </div>

          {/* Card 3: Delivery Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Delivery</span>
              <button
                type="button"
                onClick={() => alert('Courier sync managed')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Courier</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {order.courierName || 'Pathao (inactive) - Outside Dhaka'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Tracking</span>
                <a
                  href={`https://merchant.pathao.com/tracking?consignment_id=${order.consignmentId || 'DL311026X4UUWL'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 mt-0.5"
                >
                  <span>{order.consignmentId || 'DL311026X4UUWL'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Charge</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  ৳ {deliveryCharge.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Dynamic Invoice & Courier Slip Preview (Matching Screenshot 3 & 4) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            {/* Top Toolbar of Invoice */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="text-slate-900 font-black">Invoice</span>
                <span className="text-slate-400 cursor-pointer hover:text-slate-700">History 13</span>
                <span className="text-slate-400 cursor-pointer hover:text-slate-700">Courier record</span>
              </div>

              <div className="flex items-center gap-2">
                {/* 1/page vs 2/page switcher */}
                <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center text-[11px] font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setInvoicePageType('1page')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      invoicePageType === '1page' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                    }`}
                  >
                    1 / page
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoicePageType('2page')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      invoicePageType === '2page' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                    }`}
                  >
                    2 / page
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Visual Invoice Paper (Dark themed or white clean format matching image 3 & 4) */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm border border-slate-800">
              {/* Top Row: Store Name & Barcode */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight text-white">
                      {instituteInfo?.name || 'Ettadi Mart'}
                    </h3>
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      Customer Copy
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Bangladesh • {instituteInfo?.phone || '01886317050'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block font-bold">
                      INV #{cleanOrderId}
                    </span>
                    {(order.consignmentId || (order as any).steadfastTrackingCode || (order as any).pathaoConsignmentId) && (
                      <span className="text-[10px] font-mono text-slate-400 block">
                        TRK {order.consignmentId || (order as any).steadfastTrackingCode || (order as any).pathaoConsignmentId}
                      </span>
                    )}
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-700 shadow-2xs">
                    <BarcodeSVG value={cleanOrderId || order.id} height={28} />
                  </div>
                </div>
              </div>

              {/* Bill To & Meta Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold">Bill To:</span>
                    <span className="font-bold text-white">{customerName}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(customerName, 'cName')}
                      className="text-slate-500 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-300">{customerPhone}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(customerPhone, 'cPhone')}
                      className="text-slate-500 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {customerAddress}
                  </p>
                </div>

                <div className="space-y-1 sm:text-right text-[11px] text-slate-300">
                  <p><span className="text-slate-500">Date:</span> {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '31 Oct 26'}</p>
                  <p><span className="text-slate-500">Method:</span> {order.paymentMethod || 'Cash In Delivery'}</p>
                  <p><span className="text-slate-500">Courier:</span> {order.courierName || 'Pathao'}</p>
                  <p><span className="text-slate-500">Status:</span> <span className="font-bold text-emerald-400">{order.status}</span></p>
                </div>
              </div>

              {/* Items Table in Invoice (Mapped dynamically from parsedItems) */}
              <div className="pt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                    <tr>
                      <th className="pb-2 w-8">#</th>
                      <th className="pb-2">Item Description</th>
                      <th className="pb-2 text-right">Rate</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {parsedItems.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-mono text-slate-500">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2.5">
                          <span className="font-bold block text-white">{it.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">SKU: {it.sku}</span>
                        </td>
                        <td className="py-2.5 text-right font-mono">৳ {it.price.toFixed(2)}</td>
                        <td className="py-2.5 text-center font-mono">{it.quantity}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-white">৳ {(it.price * it.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Totals */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-end justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Share Feedback</span>
                  <p className="text-[10px] text-slate-500">আপনার মতামত আমাদের জন্য অত্যন্ত মূল্যবান।</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-1">{internalNote}</p>
                </div>

                <div className="w-48 space-y-1 text-right">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono text-white">৳ {itemsSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Delivery</span>
                    <span className="font-mono text-white">৳ {deliveryCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total</span>
                    <span className="font-mono text-white font-bold">৳ {grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-black text-sm pt-1 border-t border-slate-800">
                    <span>COD / Due</span>
                    <span className="font-mono">৳ {dueAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols): Lifecycle Stepper, Customer Card, Handled by & Danger Zone */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Card 1: Interactive Status Stepper (Matching Screenshot 1 & 5) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Status</span>
              <button
                type="button"
                onClick={() => alert(`Status is currently ${order.status}`)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Vertical List */}
            <div className="space-y-1 relative pl-2">
              <div className="absolute left-[21px] top-3 bottom-3 w-0.5 bg-slate-200"></div>

              {ORDER_LIFECYCLE_STEPS.map((step, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div
                    key={step}
                    onClick={() => handleSelectStatus(step)}
                    className="relative flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                        isPassed
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border-2 border-slate-300 text-transparent group-hover:border-slate-500'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>

                    <span
                      className={`text-xs font-bold transition-colors ${
                        isCurrent
                          ? 'text-slate-900 font-black'
                          : isPassed
                            ? 'text-slate-800'
                            : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Customer Profile & Quick Connect (Call, WhatsApp, Notes) (Matching Image 2 & 5) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Customer</span>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-slate-400 cursor-pointer hover:text-slate-700">Orders</span>
                <button
                  type="button"
                  onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                  className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  {isEditingCustomer ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>

            {isEditingCustomer ? (
              <div className="space-y-3 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold text-sm text-slate-900">{customerName}</h4>
                <p className="font-mono font-bold text-slate-700">{customerPhone}</p>
                <p className="text-slate-600 text-[11px] leading-relaxed pt-0.5">{customerAddress}</p>
                <span className="text-[10px] text-slate-400 font-semibold block pt-1">
                  Source: {order.productType || 'Web'}
                </span>
              </div>
            )}

            {/* Call & WhatsApp Quick Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDirectCall}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Note box */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Note
              </label>
              <textarea
                rows={2}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Order internal note..."
                className="w-full bg-transparent text-xs text-slate-800 font-medium outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Card 3: Handled by Staff */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Handled by</span>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Staff</label>
              <select
                defaultValue=""
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">No active staff</option>
                <option value="admin">Admin (Main Desk)</option>
                <option value="support">Support Agent</option>
              </select>
            </div>
          </div>

          {/* Card 4: Block from checkout dropdown */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-800">Block from checkout</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>

          {/* Card 5: Actions (Move to another store, Delete order) (Matching Image 3) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Actions</span>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => alert('Move order to another store location')}
                className="w-full py-2.5 px-3 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                <span>Move to another store</span>
                <span className="text-slate-400 font-bold">+</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete order #${order.id}?`)) {
                    if (onDeleteOrder) {
                      await onDeleteOrder(order.id);
                      onClose();
                    } else {
                      alert('Order marked for deletion');
                    }
                  }
                }}
                className="w-full py-2.5 px-3 flex items-center justify-between text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <span>Delete order</span>
                <span className="text-rose-400 font-bold">+</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
