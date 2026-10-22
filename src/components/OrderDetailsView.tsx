import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Package, RefreshCw, ShoppingBag, Truck, Calendar, MapPin, AlertCircle, Edit3, FileText, FileSpreadsheet } from 'lucide-react';
import { BookOrder } from '../types';
import { InvoicePreview } from './InvoicePreview';
import { motion } from 'motion/react';
import { isOrderCod, isOrderPaid } from '../lib/orderPaymentUtils';

interface Props {
  order: BookOrder;
  onClose: () => void;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<void>;
  onEditOrder: (order: BookOrder) => void;
}

const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Packaging',
  'Ready for Shipment',
  'Shipped',
  'Delivered',
  'Return',
  'Cancelled'
];

export function OrderDetailsView({ order, onClose, onUpdateStatus, onEditOrder }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsUpdating(true);
    await onUpdateStatus(order.id, e.target.value);
    setIsUpdating(false);
  };

  const getStepProgress = () => {
    const s = order.status;
    if (['Cancelled', 'Return', 'Hold', 'Not Responding', 'Under Review'].includes(s)) return 0;
    if (s === 'Pending') return 1;
    if (s === 'Confirmed') return 2;
    if (s === 'Packaging' || s === 'Ready for Shipment') return 3;
    if (s === 'Shipped') return 4;
    if (s === 'Delivered') return 5;
    return 1;
  };

  const currentStep = getStepProgress();

  const steps = [
    { label: 'Confirm Order', icon: ShoppingBag, step: 2 },
    { label: 'Processing Order', icon: RefreshCw, step: 3 },
    { label: 'Product Dispatched', icon: Package, step: 4 },
    { label: 'On Delivery', icon: Truck, step: 4 }, // usually shipped is same as on delivery
    { label: 'Delivery Completed', icon: CheckCircle, step: 5 },
  ];

  const formatDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
    } catch {
      return d;
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-xs border border-slate-200 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900">Orders Details</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInvoice(!showInvoice)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold border border-indigo-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {showInvoice ? 'View Details' : 'View Invoice'}
          </button>
          <button
            onClick={() => onEditOrder(order)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-bold border border-amber-200 transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
          <a 
            href="/" 
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-bold transition-colors"
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            Visit Site
          </a>
        </div>
      </div>

      {showInvoice ? (
        <InvoicePreview order={order} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Tracker Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-8">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-semibold">Order Status :</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-md">
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-semibold">Payment :</span>
                  <span className="font-semibold text-slate-800">
                    {order.paymentMethod || 'Cash on Delivery'}
                  </span>
                  <span className={`px-2.5 py-0.5 font-bold text-xs rounded-md ${
                    isOrderPaid(order)
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isOrderPaid(order) ? 'PAID' : 'UNPAID'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={order.status}
                  onChange={handleStatusChange}
                  disabled={isUpdating}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  {ORDER_STATUSES.map(s => (
                    <option key={s} value={s}>{s} Order</option>
                  ))}
                </select>
                <button 
                  disabled={isUpdating}
                  className="px-4 py-2 bg-[#52c41a] hover:bg-[#49b017] text-white font-bold text-sm rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Change Status'}
                </button>
              </div>
            </div>

            {/* Stepper */}
            <div className="relative flex justify-between items-start px-2 sm:px-10">
              <div className="absolute top-6 left-12 right-12 h-1 bg-slate-200 rounded-full z-0"></div>
              <div 
                className="absolute top-6 left-12 h-1 bg-[#52c41a] rounded-full z-0 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, (currentStep - 2) * 25))}%` }}
              ></div>

              {steps.map((step, idx) => {
                const isActive = currentStep >= step.step;
                const Icon = step.icon;
                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center w-24">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-2xl shadow-sm transition-colors mb-3 ${
                      isActive ? 'bg-[#52c41a] text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold text-center ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 text-center">
                      {isActive ? formatDate(order.createdAt) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Products List */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black text-slate-500 uppercase">
                  <th className="pb-4 font-semibold">Product</th>
                  <th className="pb-4 font-semibold text-center">Unit Price</th>
                  <th className="pb-4 font-semibold text-center">Quantity</th>
                  <th className="pb-4 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, idx: number) => {
                    const itemTitle = item.product?.title || item.title || order.productTitle || 'Product';
                    const itemImg = item.variant?.image || item.product?.image || item.image || item.productImage;
                    const itemQty = item.quantity || 1;
                    const itemUnitPrice = item.variant?.price || item.product?.price || item.price || order.price || 0;
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                              {itemImg ? (
                                <img src={itemImg} alt={itemTitle} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 line-clamp-2">{itemTitle}</p>
                              {item.variant?.name && (
                                <span className="text-xs text-slate-500">{item.variant.name}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center font-mono text-sm text-slate-600">৳ {itemUnitPrice}</td>
                        <td className="py-4 text-center font-mono text-sm text-slate-600">{itemQty}</td>
                        <td className="py-4 text-right font-mono font-bold text-slate-800">৳ {itemUnitPrice * itemQty}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="font-bold text-sm text-slate-800 line-clamp-2">{order.productTitle}</p>
                      </div>
                    </td>
                    <td className="py-4 text-center font-mono text-sm text-slate-600">৳ {order.price}</td>
                    <td className="py-4 text-center font-mono text-sm text-slate-600">{order.quantity}</td>
                    <td className="py-4 text-right font-mono font-bold text-slate-800">৳ {(order.price || 0) * (order.quantity || 1)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Cart Totals */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-2 bg-slate-50 p-4 rounded-xl mb-2">
                <span className="font-bold text-slate-800 text-sm">Cart Totals</span>
                <span className="font-bold text-slate-800 text-sm text-right">Price</span>
              </div>
              <div className="px-4 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">Sub Total</span>
                  <span className="font-mono text-slate-800 font-bold">
                    ৳ {order.totalPrice ? order.totalPrice - (order.deliveryCharge || 0) + (order.couponDiscount || order.discountAmount || 0) : ((order.price || 0) * (order.quantity || 1))}
                  </span>
                </div>
                {order.couponDiscount && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-rose-500 font-medium">Discount</span>
                    <span className="font-mono text-rose-600 font-bold">- ৳ {order.couponDiscount || order.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pb-4 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Shipping</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {order.deliveryCharge ? `৳ ${order.deliveryCharge}` : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-slate-900">Total price</span>
                  <span className="font-mono font-black text-orange-500 text-lg">
                    ৳ {order.totalAmount || order.totalPrice || ((order.price || 0) * (order.quantity || 1) + (order.deliveryCharge || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          
          {/* Summary */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-slate-400" />
              Summary
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID</span>
                <span className="font-bold text-slate-900 font-mono">#{order.id.replace('ORD-', '')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-bold text-slate-900">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-bold font-mono text-orange-500">
                  ৳ {order.totalAmount || order.totalPrice || ((order.price || 0) * (order.quantity || 1) + (order.deliveryCharge || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-slate-400" />
              Shipping Address
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-bold text-slate-900">{order.customerName}</p>
              <p>{order.address}</p>
              {(order.thana || order.district) && (
                <p>{order.thana ? `${order.thana}, ` : ''}{order.district}</p>
              )}
              {order.email && <p>{order.email}</p>}
              <p className="font-mono pt-1">{order.phone}</p>
            </div>
          </div>

          {/* Additional Info / Note */}
          {order.notes && (
            <div className="bg-amber-50 rounded-xl shadow-xs border border-amber-200 p-6">
              <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Customer Note
              </h3>
              <p className="text-sm text-amber-800">{order.notes}</p>
            </div>
          )}

        </div>
            </div>
      )}
    </div>
  );
}
