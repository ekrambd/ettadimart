import React, { useRef } from 'react';
import { BookOrder } from '../types';
import { Printer, MessageCircle, Copy, CheckCircle, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { isOrderCod, isOrderPaid } from '../lib/orderPaymentUtils';

interface Props {
  order: BookOrder;
}

export function InvoicePreview({ order }: Props) {
  const { ecomSettings, instituteInfo } = useAppStore();
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const windowPrint = window.open('', '', 'width=900,height=650');
    if (!windowPrint) return;
    
    windowPrint.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body class="bg-white p-8">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 500);
  };

  const handleWhatsApp = () => {
    const text = `*Invoice Details:*\nOrder ID: ${order.id}\nTotal Amount: ৳ ${order.totalAmount || order.totalPrice}\nStatus: ${order.status}`;
    const url = `https://wa.me/${order.phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        date: new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: '2-digit' }).format(d),
        time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(d)
      };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  const dt = formatDate(order.createdAt);
  const storeName = ecomSettings?.storeName || instituteInfo?.name || 'ETTADI MART';
  const storePhone = instituteInfo?.phone || ecomSettings?.supportPhone || '';
  const storeDomain = ecomSettings?.storeDomain 
    ? ecomSettings.storeDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    : (instituteInfo?.website ? instituteInfo.website.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '');

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Invoice preview</h2>
          <p className="text-xs text-slate-500 mt-1">A4 print-ready invoice layout with barcodes & item breakdown.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold border border-emerald-200 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp Invoice
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" /> Print invoice
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 overflow-x-auto">
        {/* The Print Area */}
        <div ref={printRef} className="min-w-[700px] w-full max-w-4xl mx-auto bg-white p-8 border border-slate-200 rounded-lg text-slate-900 font-sans">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              
              <div className="h-16 bg-slate-900 rounded-lg flex items-center justify-center px-4 py-2 shrink-0">
                <img 
                  src={ecomSettings?.storeLogo || instituteInfo?.logo || '/placeholder-logo.svg'} 
                  alt="Logo" 
                  className="max-h-full w-auto object-contain"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-logo.svg'; }}
                />
              </div>

              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{storeName}</h1>
                <p className="text-slate-500 text-sm mt-1">Bangladesh</p>
                {storePhone && <p className="text-slate-500 text-sm">{storePhone}</p>}
                {storeDomain && <p className="text-slate-400 text-xs">{storeDomain}</p>}
              </div>
            </div>
            
            <div className="flex gap-4">
              {/* Barcode Box */}
              <div className="border border-slate-300 rounded-lg p-4 text-center min-w-[160px]">
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2">Order Barcode</p>
                {/* Simulated Barcode */}
                <div className="w-full h-10 bg-slate-900 opacity-90 flex justify-between px-1" style={{ background: 'repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 2px, transparent 2px, transparent 4px, #0f172a 4px, #0f172a 7px, transparent 7px, transparent 9px)' }}></div>
                <div className="mt-2 text-[10px] text-slate-500 tracking-wider">ORDER ID</div>
                <div className="font-mono font-bold text-lg flex justify-center items-center gap-2 mt-1">
                  {order.id.replace('ORD-', '')} 
                  <button onClick={() => handleCopy(order.id, 'id')} className="text-slate-400 hover:text-slate-600">
                    {copiedField === 'id' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Tracking Box */}
              <div className="border border-slate-300 rounded-lg p-4 text-center min-w-[160px] bg-slate-50">
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2">Tracking ID</p>
                <div className="border border-dashed border-slate-300 rounded py-2 mt-2">
                  <p className="text-xs font-bold text-slate-400">{order.steadfastTrackingCode || order.pathaoTrackingCode || 'NOT ASSIGNED'}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 italic">by {storeDomain || storeName}</p>
              </div>
            </div>
          </div>

          {/* Details Row */}
          <div className="flex justify-between mb-8">
            <div className="w-1/2 pr-4">
              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-3">Bill To</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  {order.customerName}
                  <button onClick={() => handleCopy(order.customerName, 'name')} className="text-slate-400 hover:text-slate-600">
                    {copiedField === 'name' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  {order.phone}
                  <button onClick={() => handleCopy(order.phone, 'phone')} className="text-slate-400 hover:text-slate-600">
                    {copiedField === 'phone' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <span className="max-w-[250px]">{order.address} {order.thana ? `, ${order.thana}` : ''} {order.district ? `, ${order.district}` : ''}</span>
                  <button onClick={() => handleCopy(`${order.address} ${order.thana} ${order.district}`, 'address')} className="text-slate-400 hover:text-slate-600 mt-1">
                    {copiedField === 'address' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="w-1/2 pl-12">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 text-slate-500">Date:</td>
                    <td className="py-2 text-right font-bold text-slate-900">{dt.date}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Time:</td>
                    <td className="py-2 text-right font-bold text-slate-900">{dt.time}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Method:</td>
                    <td className="py-2 text-right font-bold text-slate-900">{isOrderCod(order.paymentMethod) ? 'Cash on Delivery' : (order.paymentMethod || 'Prepaid')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Status:</td>
                    <td className={`py-2 text-right font-bold uppercase tracking-wide ${isOrderPaid(order) ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isOrderPaid(order) ? 'PAID' : 'UNPAID'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-y-2 border-slate-900 text-[10px] uppercase tracking-widest text-slate-900">
                <th className="py-3 text-left font-bold">Item Description</th>
                <th className="py-3 text-right font-bold w-32">Price</th>
                <th className="py-3 text-center font-bold w-20">Qty</th>
                <th className="py-3 text-right font-bold w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items && order.items.length > 0 ? order.items.map((item: any, idx: number) => {
                const price = item.variant?.price || item.product?.price || item.price || 0;
                const qty = item.quantity || 1;
                return (
                  <tr key={idx}>
                    <td className="py-4">
                      <p className="font-bold text-slate-900">{item.product?.title || item.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.variant?.name || item.sku || 'default'}</p>
                    </td>
                    <td className="py-4 text-right font-mono text-slate-700">{price.toFixed(2)}</td>
                    <td className="py-4 text-center font-mono text-slate-700">{qty}</td>
                    <td className="py-4 text-right font-mono font-bold text-slate-900">{(price * qty).toFixed(2)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td className="py-4">
                    <p className="font-bold text-slate-900">{order.productTitle || 'Product'}</p>
                  </td>
                  <td className="py-4 text-right font-mono text-slate-700">{(order.price || 0).toFixed(2)}</td>
                  <td className="py-4 text-center font-mono text-slate-700">{order.quantity || 1}</td>
                  <td className="py-4 text-right font-mono font-bold text-slate-900">{((order.price || 0) * (order.quantity || 1)).toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          {(() => {
            const isPaid = isOrderPaid(order);
            const subtotal = order.totalPrice ? order.totalPrice - (order.deliveryCharge || 0) + (order.couponDiscount || order.discountAmount || 0) : ((order.price || 0) * (order.quantity || 1));
            const grandTotal = order.totalAmount || order.totalPrice || ((order.price || 0) * (order.quantity || 1) + (order.deliveryCharge || 0));
            const paidAmount = isPaid ? grandTotal : 0;
            const dueAmount = isPaid ? 0 : grandTotal;

            return (
              <div className="flex justify-end mb-10 border-t-2 border-slate-900 pt-4">
                <div className="w-80">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-mono text-slate-900">৳ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm border-b border-slate-200 mb-2">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-mono text-slate-900">৳ {(order.deliveryCharge || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 items-center">
                    <span className="font-black text-xl text-slate-900 uppercase">Grand Total</span>
                    <span className="font-mono font-black text-xl text-slate-900">৳ {grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-slate-600">Paid</span>
                    <span className="font-mono text-slate-900">৳ {paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 mt-1 bg-slate-50 px-3 rounded font-bold">
                    <span className="text-slate-900">Due Amount</span>
                    <span className="font-mono text-slate-900">৳ {dueAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })()}



          {/* Signatures */}
          <div className="flex justify-between mt-12 pt-6">
            <div>
              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4">Terms & Note</p>
              <p className="text-sm text-slate-700">-</p>
            </div>
            <div className="text-right">
              <div className="w-48 border-b-2 border-slate-300 mb-2"></div>
              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Authorized Signature</p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
