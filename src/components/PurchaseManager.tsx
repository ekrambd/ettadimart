import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Search, Plus, Filter, RotateCcw, Printer, 
  Download, CheckCircle, Package, FileText, Upload, Calendar, 
  ExternalLink, Trash2, Edit3, Eye, AlertCircle, ShoppingBag
} from 'lucide-react';
import { Product, ActiveTab } from '../types';
import { dbService, getAdminAuthHeaders } from '../lib/dbService';

interface PurchaseManagerProps {
  initialSubTab?: 'stock_report' | 'add_purchase' | 'invoices' | 'summary' | 'returns' | 'add_return';
  onNavigateTab: (tab: ActiveTab) => void;
  products: Product[];
}

export default function PurchaseManager({ 
  initialSubTab = 'stock_report', 
  onNavigateTab,
  products = []
}: PurchaseManagerProps) {
  const [subTab, setSubTab] = useState<'stock_report' | 'add_purchase' | 'invoices' | 'summary' | 'returns' | 'add_return'>(initialSubTab);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

  // Form states: Add New Purchase
  const [purchaseForm, setPurchaseForm] = useState({
    title: '',
    receivedDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    supplierName: '',
    notes: '',
    slipImage: ''
  });
  const [selectedProductsForPurchase, setSelectedProductsForPurchase] = useState<{ productId: string; productTitle: string; quantity: number; unitPrice: number; totalAmount: number }[]>([]);

  // Form states: Purchase Return Create
  const [returnForm, setReturnForm] = useState({
    invoiceOrBarcode: '',
    purchaseId: '',
    purchaseNumber: '',
    supplierId: '',
    supplierName: '',
    reason: '',
    itemsCount: 1,
    amount: 0,
    status: 'settled'
  });

  // Modal: Attach product to existing purchase invoice
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [attachForm, setAttachForm] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0
  });

  // Load purchases, returns & suppliers
  const loadData = async () => {
    setLoading(true);
    try {
      const [purRes, retRes, supList] = await Promise.all([
        fetch('/api/purchases').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/purchases/returns/list').then(r => r.ok ? r.json() : []).catch(() => []),
        dbService.getSuppliers().catch(() => [])
      ]);
      setPurchases(purRes || []);
      setReturns(retRes || []);
      setSuppliers(supList || []);
    } catch (e) {
      console.warn('Error loading purchase data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Load single purchase detail if selected
  const viewPurchaseDetails = async (pur: any) => {
    try {
      const res = await fetch(`/api/purchases/${pur.id || pur.purchaseNumber}`);
      if (res.ok) {
        const full = await res.json();
        setSelectedPurchase(full);
      } else {
        setSelectedPurchase(pur);
      }
    } catch {
      setSelectedPurchase(pur);
    }
    setSubTab('invoices');
  };

  // Mark purchase as received
  const handleMarkAsReceived = async () => {
    if (!selectedPurchase) return;
    try {
      const res = await fetch(`/api/purchases/${selectedPurchase.id}/mark-received`, {
        method: 'PUT',
        headers: getAdminAuthHeaders()
      });
      if (res.ok) {
        setSelectedPurchase((prev: any) => ({ ...prev, status: 'received' }));
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Attach product to invoice
  const handleAttachProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase || !attachForm.productId) return;
    const prod = products.find(p => p.id === attachForm.productId);
    const targetId = selectedPurchase.id || selectedPurchase.purchaseNumber;
    try {
      const res = await fetch(`/api/purchases/${targetId}/items`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          productId: attachForm.productId,
          productTitle: prod?.title || 'Product',
          quantity: attachForm.quantity,
          unitPrice: attachForm.unitPrice || prod?.price || 0
        })
      });
      if (res.ok) {
        setAttachModalOpen(false);
        setAttachForm({ productId: '', quantity: 1, unitPrice: 0 });
        await viewPurchaseDetails(selectedPurchase);
        await loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to attach product');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while attaching product');
    }
  };

  // Remove attached product from invoice
  const handleRemoveAttachedProduct = async (itemId: string) => {
    if (!selectedPurchase || !itemId) return;
    if (!confirm('Are you sure you want to remove this product from the invoice?')) return;
    const targetId = selectedPurchase.id || selectedPurchase.purchaseNumber;
    try {
      const res = await fetch(`/api/purchases/${targetId}/items/${itemId}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
      if (res.ok) {
        await viewPurchaseDetails(selectedPurchase);
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Add New Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sup = suppliers.find(s => s.id === purchaseForm.supplierId);
      
      // If user selected a product in the dropdown and forgot to click "+ Add", auto-include it
      let finalItems = [...selectedProductsForPurchase];
      const sel = document.getElementById('purchase-prod-select') as HTMLSelectElement | null;
      const qtyInp = document.getElementById('purchase-prod-qty') as HTMLInputElement | null;
      if (sel?.value) {
        const prod = products.find(p => p.id === sel.value);
        if (prod) {
          const q = Number(qtyInp?.value || 1);
          finalItems.push({
            productId: prod.id,
            productTitle: prod.title,
            quantity: q,
            unitPrice: prod.price || 0,
            totalAmount: q * (prod.price || 0)
          });
        }
      }

      const totalAmt = finalItems.reduce((sum, item) => sum + item.totalAmount, 0);

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          ...purchaseForm,
          supplierName: sup?.name || purchaseForm.supplierName || 'General Supplier',
          totalAmount: totalAmt,
          items: finalItems
        })
      });

      if (res.ok) {
        const created = await res.json();
        setPurchaseForm({
          title: '',
          receivedDate: new Date().toISOString().split('T')[0],
          supplierId: '',
          supplierName: '',
          notes: '',
          slipImage: ''
        });
        setSelectedProductsForPurchase([]);
        if (sel) sel.value = '';
        if (qtyInp) qtyInp.value = '1';
        await loadData();
        viewPurchaseDetails(created);
      }
    } catch (e) {
      console.error('Failed to create purchase:', e);
    }
  };

  // Submit Purchase Return
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchases/returns', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(returnForm)
      });
      if (res.ok) {
        setReturnForm({
          invoiceOrBarcode: '',
          purchaseId: '',
          purchaseNumber: '',
          supplierId: '',
          supplierName: '',
          reason: '',
          itemsCount: 1,
          amount: 0,
          status: 'settled'
        });
        await loadData();
        setSubTab('returns');
      }
    } catch (e) {
      console.error('Failed to create return:', e);
    }
  };

  // Stock details calculation
  const stockRows = useMemo(() => {
    return products.map((prod, idx) => {
      const purchased = (prod as any).receivedStock || (prod.stock || 0) + (prod.soldStock || 0);
      const sold = prod.soldStock || 0;
      const available = Math.max(0, (prod.stock || 0));
      return {
        sn: idx + 1,
        id: prod.id,
        name: prod.title,
        purchased,
        sold,
        available
      };
    });
  }, [products]);

  const totalPurchased = stockRows.reduce((sum, r) => sum + r.purchased, 0);
  const totalSold = stockRows.reduce((sum, r) => sum + r.sold, 0);
  const totalAvailable = stockRows.reduce((sum, r) => sum + r.available, 0);

  // Filtered Stock Rows
  const filteredStockRows = useMemo(() => {
    if (!searchTerm.trim()) return stockRows;
    return stockRows.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [stockRows, searchTerm]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Header & Tab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Purchase & Inventory Management</span>
          </h2>
          <p className="text-xs text-slate-500">Track purchase orders, receipts, lot slip photos, returns, and inventory stocks</p>
        </div>

        {/* Action pills with smooth horizontal scrolling on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <button
            type="button"
            onClick={() => setSubTab('stock_report')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              subTab === 'stock_report' 
                ? 'bg-emerald-600 text-white shadow-2xs font-bold' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Stock Report
          </button>
          <button
            type="button"
            onClick={() => { setSelectedPurchase(null); setSubTab('add_purchase'); }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              subTab === 'add_purchase' 
                ? 'bg-emerald-600 text-white shadow-2xs font-bold' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Add New Purchase
          </button>
          <button
            type="button"
            onClick={() => setSubTab('invoices')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              subTab === 'invoices' 
                ? 'bg-emerald-600 text-white shadow-2xs font-bold' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Purchase Invoices ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('returns')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              subTab === 'returns' 
                ? 'bg-emerald-600 text-white shadow-2xs font-bold' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Purchase Returns ({returns.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('add_return')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              subTab === 'add_return' 
                ? 'bg-emerald-600 text-white shadow-2xs font-bold' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            + Create Return
          </button>
        </div>
      </div>

      {/* VIEW 1: STOCK REPORT (Exact match to Screenshot 5) */}
      {subTab === 'stock_report' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          {/* Top Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search Product Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="w-full sm:w-48">
              <input
                type="date"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-600"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
              title="Print Report"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>

          {/* Stock Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                  <th rowSpan={2} className="py-3 px-4 border-r border-slate-200 w-16 text-center">SN</th>
                  <th rowSpan={2} className="py-3 px-4 border-r border-slate-200">Product Name</th>
                  <th colSpan={3} className="py-2.5 px-4 text-center border-b border-slate-200 bg-slate-100/70 font-extrabold text-slate-800">
                    Stock Details
                  </th>
                </tr>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                  <th className="py-2 px-4 text-center border-r border-slate-200">Purchased (In)</th>
                  <th className="py-2 px-4 text-center border-r border-slate-200">Sold (Out)</th>
                  <th className="py-2 px-4 text-center">Available Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStockRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 border-r border-slate-100 text-center text-slate-500 font-medium">{row.sn}</td>
                    <td className="py-3 px-4 border-r border-slate-100 font-semibold text-slate-800">{row.name}</td>
                    <td className="py-3 px-4 border-r border-slate-100 text-center font-semibold text-slate-700">{row.purchased}</td>
                    <td className="py-3 px-4 border-r border-slate-100 text-center font-semibold text-slate-700">{row.sold}</td>
                    <td className="py-3 px-4 text-center font-extrabold text-emerald-600">{row.available}</td>
                  </tr>
                ))}

                {filteredStockRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      No products found. Add products to generate stock reports.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredStockRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td colSpan={2} className="py-3 px-4 text-right pr-6">Total</td>
                    <td className="py-3 px-4 text-center border-r border-slate-200">{totalPurchased}</td>
                    <td className="py-3 px-4 text-center border-r border-slate-200">{totalSold}</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-extrabold">{totalAvailable}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: ADD NEW PURCHASE (Exact match to Screenshot 2) */}
      {subTab === 'add_purchase' && (
        <form onSubmit={handleSubmitPurchase} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Form (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Purchase Name or Title</label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={purchaseForm.title}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Received Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.receivedDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, receivedDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Supplier <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('suppliers_create')}
                      className="w-5 h-5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                      title="Add New Supplier"
                    >
                      +
                    </button>
                  </div>
                  <select
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 cursor-pointer"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.companyName || s.phone})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter short notes"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              {/* Product Attach Section */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-800 block mb-2">Attached Products</label>
                <div className="flex items-center gap-2">
                  <select
                    id="purchase-prod-select"
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
                  >
                    <option value="">Select a product to attach</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.title} (Price: ৳{p.price})</option>
                    ))}
                  </select>
                  <input
                    id="purchase-prod-qty"
                    type="number"
                    min="1"
                    defaultValue="1"
                    placeholder="Qty"
                    className="w-20 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const sel = document.getElementById('purchase-prod-select') as HTMLSelectElement;
                      const qtyInp = document.getElementById('purchase-prod-qty') as HTMLInputElement;
                      if (!sel?.value) return;
                      const prod = products.find(p => p.id === sel.value);
                      const q = Number(qtyInp.value || 1);
                      if (prod) {
                        setSelectedProductsForPurchase(prev => [
                          ...prev,
                          {
                            productId: prod.id,
                            productTitle: prod.title,
                            quantity: q,
                            unitPrice: prod.price || 0,
                            totalAmount: q * (prod.price || 0)
                          }
                        ]);
                        sel.value = '';
                        qtyInp.value = '1';
                      }
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Products Preview */}
                {selectedProductsForPurchase.length > 0 && (
                  <div className="mt-3 space-y-1.5 border border-slate-100 rounded-xl p-3 bg-slate-50">
                    {selectedProductsForPurchase.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-none">
                        <span className="font-semibold text-slate-800">{item.productTitle} x {item.quantity}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">৳{item.totalAmount}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedProductsForPurchase(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Purchase Slip Upload Box (4 cols) */}
            <div className="lg:col-span-4 space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Purchase Slip</label>
              <div className="w-full h-52 bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-4 text-center group hover:border-emerald-500 transition-colors cursor-pointer relative overflow-hidden">
                {purchaseForm.slipImage ? (
                  <img src={purchaseForm.slipImage} alt="Lot Slip" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-400 mb-2 group-hover:text-emerald-600 transition-colors" />
                    <span className="text-sm font-bold text-slate-600">Lot Slip Photo</span>
                    <span className="text-[10px] text-slate-400 mt-1">Upload supplier lot receipt / slip image</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setPurchaseForm({ ...purchaseForm, slipImage: reader.result as string });
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSubTab('stock_report')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      )}

      {/* VIEW 3: PURCHASE DETAILS / INVOICE (Exact match to Screenshot 3) */}
      {subTab === 'invoices' && selectedPurchase && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          {/* Header & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Purchase Details ({selectedPurchase.purchaseNumber || '000080'})
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAsReceived}
                disabled={selectedPurchase.status === 'received'}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                {selectedPurchase.status === 'received' ? 'Received ✓' : 'Mark as Received'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setAttachModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Attach Products
              </button>
            </div>
          </div>

          {/* Details 2-Column Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Name or Title:</span>
                <span className="text-slate-600">{selectedPurchase.title || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Received Date:</span>
                <span className="text-slate-600">{selectedPurchase.receivedDate ? new Date(selectedPurchase.receivedDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Total Amount:</span>
                <span className="text-emerald-600 font-extrabold text-sm">৳{selectedPurchase.totalAmount || 0}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Supplier:</span>
                <span className="text-slate-600">{selectedPurchase.supplierName || 'General Supplier'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-bold text-slate-700 block mb-0.5">Notes:</span>
                <span className="text-slate-500 italic">{selectedPurchase.notes || 'No notes provided'}</span>
              </div>
            </div>

            {/* Slip Image */}
            <div className="md:col-span-4 space-y-1">
              <span className="text-xs font-bold text-slate-700 block">Slip Image</span>
              <div className="w-full h-36 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center">
                {selectedPurchase.slipImage ? (
                  <img src={selectedPurchase.slipImage} alt="Slip" className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                )}
              </div>
            </div>
          </div>

          {/* Attached Product List */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Product List</h4>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-4 w-14">SL</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Quantity</th>
                    <th className="py-2.5 px-4">Total Amount</th>
                    <th className="py-2.5 px-4 w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchase.items?.map((item: any, idx: number) => (
                    <tr key={item.id || idx}>
                      <td className="py-2.5 px-4 text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{item.productTitle}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.quantity}</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-600">৳{item.totalAmount}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachedProduct(item.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!selectedPurchase.items || selectedPurchase.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No products attached yet. Click "Attach Products" above to add products to this purchase invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3B: PURCHASE INVOICES LIST TABLE */}
      {subTab === 'invoices' && !selectedPurchase && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">All Purchase Invoices</h3>
            <button
              type="button"
              onClick={() => setSubTab('add_purchase')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              + New Purchase
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{pur.purchaseNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{pur.title}</td>
                    <td className="py-3 px-4 text-slate-600">{pur.supplierName || 'General'}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(pur.receivedDate || pur.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">৳{pur.totalAmount || 0}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        pur.status === 'received' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {pur.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => viewPurchaseDetails(pur)}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No purchase invoices created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: PURCHASE RETURNS (Exact match to Screenshot 4) */}
      {subTab === 'returns' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Purchase Returns</h3>
              <p className="text-xs text-slate-400">Stock sent back to a supplier, and what it was worth.</p>
            </div>
          </div>

          {/* 5 Metric Summary Cards (Screenshot 4) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 block leading-tight">{returns.length}</span>
                <span className="text-[11px] text-slate-500 font-medium">Returns</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 block leading-tight">
                  {returns.filter(r => r.status === 'settled').length}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Settled</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 block leading-tight">
                  {returns.filter(r => r.status === 'awaiting').length}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Awaiting</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 block leading-tight">
                  {returns.reduce((sum, r) => sum + (r.itemsCount || 0), 0)}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Items sent back</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 block leading-tight">
                  ৳{returns.reduce((sum, r) => sum + (r.amount || 0), 0)}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Value returned</span>
              </div>
            </div>
          </div>

          {/* Search, Columns, Filter, New Return Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by return, invoice or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
              >
                Columns
              </button>
              <button
                type="button"
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={() => setSubTab('add_return')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Return</span>
              </button>
            </div>
          </div>

          {/* Returns Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">RETURN</th>
                  <th className="py-2.5 px-3">SUPPLIER</th>
                  <th className="py-2.5 px-3">AGAINST INVOICE</th>
                  <th className="py-2.5 px-3">ITEMS</th>
                  <th className="py-2.5 px-3">AMOUNT</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">DATE</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{ret.returnNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{ret.supplierName || 'General'}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{ret.purchaseNumber || 'N/A'}</td>
                    <td className="py-3 px-3 text-slate-600">{ret.itemsCount || 1}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">৳{ret.amount || 0}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        ret.status === 'settled' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {ret.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{new Date(ret.returnDate || ret.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-[11px] text-slate-400">View</span>
                    </td>
                  </tr>
                ))}

                {returns.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <RotateCcw className="h-6 w-6 text-slate-300 stroke-[1.5]" />
                        <span className="font-bold text-slate-700 text-sm">Nothing has been sent back</span>
                        <span className="text-xs text-slate-400">Try another date range, or raise a return.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: PURCHASE RETURN CREATE (Exact match to Screenshot 1) */}
      {subTab === 'add_return' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Purchase Return Create</h3>

          {/* Top Search Card (Screenshot 1) */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Search by invoice or barcode"
                value={returnForm.invoiceOrBarcode}
                onChange={(e) => setReturnForm({ ...returnForm, invoiceOrBarcode: e.target.value })}
                className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => {
                  const found = purchases.find(p => p.purchaseNumber === returnForm.invoiceOrBarcode || p.id === returnForm.invoiceOrBarcode);
                  if (found) {
                    setReturnForm(prev => ({
                      ...prev,
                      purchaseId: found.id,
                      purchaseNumber: found.purchaseNumber,
                      supplierId: found.supplierId,
                      supplierName: found.supplierName,
                      amount: found.totalAmount || 0
                    }));
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={() => setReturnForm({
                  invoiceOrBarcode: '',
                  purchaseId: '',
                  purchaseNumber: '',
                  supplierId: '',
                  supplierName: '',
                  reason: '',
                  itemsCount: 1,
                  amount: 0,
                  status: 'settled'
                })}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Return Form Details */}
          <form onSubmit={handleSubmitReturn} className="p-5 border border-slate-100 rounded-xl space-y-4 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Against Invoice / Purchase #</label>
                <input
                  type="text"
                  placeholder="e.g. 000080"
                  value={returnForm.purchaseNumber}
                  onChange={(e) => setReturnForm({ ...returnForm, purchaseNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Supplier</label>
                <select
                  value={returnForm.supplierId}
                  onChange={(e) => {
                    const sup = suppliers.find(s => s.id === e.target.value);
                    setReturnForm({
                      ...returnForm,
                      supplierId: e.target.value,
                      supplierName: sup?.name || ''
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Items Count Returned</label>
                <input
                  type="number"
                  min="1"
                  value={returnForm.itemsCount}
                  onChange={(e) => setReturnForm({ ...returnForm, itemsCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Return Amount (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={returnForm.amount}
                  onChange={(e) => setReturnForm({ ...returnForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Return Reason / Notes</label>
              <textarea
                rows={2}
                placeholder="Reason for returning items to supplier..."
                value={returnForm.reason}
                onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setSubTab('returns')}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Submit Return
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Attach Product Modal */}
      {attachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h4 className="text-base font-bold text-slate-900">Attach Product to Purchase</h4>
            <form onSubmit={handleAttachProduct} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Product</label>
                <select
                  required
                  value={attachForm.productId}
                  onChange={(e) => {
                    const prod = products.find(p => p.id === e.target.value);
                    setAttachForm({
                      ...attachForm,
                      productId: e.target.value,
                      unitPrice: prod?.price || 0
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="">Choose a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title} (Price: ৳{p.price})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={attachForm.quantity}
                    onChange={(e) => setAttachForm({ ...attachForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Unit Cost (৳)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={attachForm.unitPrice}
                    onChange={(e) => setAttachForm({ ...attachForm, unitPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAttachModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Attach & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
