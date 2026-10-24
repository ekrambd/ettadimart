import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { dbService } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Search, RefreshCw, Plus, Edit2, Sliders, AlertTriangle, 
  CheckCircle, Package, ArrowUpRight, ArrowDownLeft, X, Save, Boxes, Layers, Trash2
} from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

export default function StockInventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'ledger'>('overview');

  // Quick adjust modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isQuickAdjustOpen, setIsQuickAdjustOpen] = useState(false);
  const [quickAdjustAmount, setQuickAdjustAmount] = useState<number>(0);
  const [quickAdjustType, setQuickAdjustType] = useState<'add' | 'subtract' | 'set'>('add');

  // Full Edit Modal State
  const [isDetailEditOpen, setIsDetailEditOpen] = useState(false);
  const [editSku, setEditSku] = useState('');
  const [editOpening, setEditOpening] = useState(0);
  const [editReceived, setEditReceived] = useState(0);
  const [editSold, setEditSold] = useState(0);
  const [editReturned, setEditReturned] = useState(0);
  const [editDamaged, setEditDamaged] = useState(0);
  const [editTransferred, setEditTransferred] = useState(0);
  const [editCostPrice, setEditCostPrice] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editReorderPoint, setEditReorderPoint] = useState(10);
  const [saving, setSaving] = useState(false);
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    loadProducts();
    const handleReload = () => {
      loadProducts();
    };
    window.addEventListener('ecom-products-updated', handleReload);
    return () => {
      window.removeEventListener('ecom-products-updated', handleReload);
    };
  }, []);

  const handleDeleteProduct = (id: string, title: string) => {
    setDeleteTargetProduct({ id, title });
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deleteTargetProduct) return;
    try {
      await dbService.deleteProduct(deleteTargetProduct.id);
      setProducts(prev => prev.filter(p => p.id !== deleteTargetProduct.id));
      if (selectedProduct?.id === deleteTargetProduct.id) {
        setIsDetailEditOpen(false);
        setSelectedProduct(null);
      }
    } catch (err) {
      console.error('Failed to delete product from inventory:', err);
    } finally {
      setDeleteTargetProduct(null);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const list = await dbService.getProducts();
      setProducts(list || []);
    } catch (e) {
      console.error('Failed to load products for inventory:', e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper calculation for dynamic product numbers
  const getCalculatedAvailable = (p: Product) => {
    const opening = p.openingStock ?? p.stock ?? 0;
    const received = p.receivedStock ?? 0;
    const sold = p.soldStock ?? 0;
    const returned = p.returnedStock ?? 0;
    const damaged = p.damagedStock ?? 0;
    const transferred = p.transferredStock ?? 0;

    return opening + received - sold + returned - damaged - transferred;
  };

  // Overall Statistics Metrics
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + getCalculatedAvailable(p), 0);
  const totalAvailableUnits = totalStockUnits;
  const totalReservedUnits = products.reduce((acc, p) => acc + (p.reservedStock || 0), 0);
  const lowStockCount = products.filter(p => {
    const avail = getCalculatedAvailable(p);
    return avail > 0 && avail <= (p.reorderPoint || 10);
  }).length;
  const outOfStockCount = products.filter(p => getCalculatedAvailable(p) <= 0).length;
  const mismatchesCount = 0; // standard projection match

  // Filtering
  const filteredProducts = products.filter(p => {
    const titleMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const skuMatch = (p.sku || p.id).toLowerCase().includes(searchQuery.toLowerCase());
    const queryMatch = titleMatch || skuMatch;

    if (!queryMatch) return false;

    const avail = getCalculatedAvailable(p);

    if (lowStockOnly) {
      if (avail > (p.reorderPoint || 10)) return false;
    }

    if (mismatchOnly) {
      // no mismatches
      return false;
    }

    return true;
  });

  // Open Quick Adjust
  const handleOpenQuickAdjust = (p: Product) => {
    setSelectedProduct(p);
    setQuickAdjustAmount(0);
    setQuickAdjustType('add');
    setIsQuickAdjustOpen(true);
  };

  const handleApplyQuickAdjust = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const currentAvail = getCalculatedAvailable(selectedProduct);
      let newOpening = selectedProduct.openingStock ?? selectedProduct.stock ?? 0;

      if (quickAdjustType === 'add') {
        newOpening += quickAdjustAmount;
      } else if (quickAdjustType === 'subtract') {
        newOpening = Math.max(0, newOpening - quickAdjustAmount);
      } else {
        newOpening = quickAdjustAmount;
      }

      const updatedProduct: Product = {
        ...selectedProduct,
        openingStock: newOpening,
        stock: newOpening + (selectedProduct.receivedStock || 0) - (selectedProduct.soldStock || 0) + (selectedProduct.returnedStock || 0)
      };

      await dbService.updateProduct(updatedProduct);
      await loadProducts();
      setIsQuickAdjustOpen(false);
      setSelectedProduct(null);
    } catch (e) {
      console.error('Quick adjust error:', e);
    } finally {
      setSaving(false);
    }
  };

  // Open Detail Edit
  const handleOpenDetailEdit = (p: Product) => {
    setSelectedProduct(p);
    setEditSku(p.sku || p.id.slice(0, 6));
    setEditOpening(p.openingStock ?? p.stock ?? 0);
    setEditReceived(p.receivedStock || 0);
    setEditSold(p.soldStock || 0);
    setEditReturned(p.returnedStock || 0);
    setEditDamaged(p.damagedStock || 0);
    setEditTransferred(p.transferredStock || 0);
    setEditCostPrice(p.costPrice || 0);
    setEditPrice(p.price || 0);
    setEditReorderPoint(p.reorderPoint || 10);
    setIsDetailEditOpen(true);
  };

  const handleSaveDetailEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const totalAvail = editOpening + editReceived - editSold + editReturned - editDamaged - editTransferred;

      const updatedProduct: Product = {
        ...selectedProduct,
        sku: editSku.trim(),
        openingStock: Number(editOpening) || 0,
        receivedStock: Number(editReceived) || 0,
        soldStock: Number(editSold) || 0,
        returnedStock: Number(editReturned) || 0,
        damagedStock: Number(editDamaged) || 0,
        transferredStock: Number(editTransferred) || 0,
        costPrice: Number(editCostPrice) || 0,
        price: Number(editPrice) || 0,
        reorderPoint: Number(editReorderPoint) || 10,
        stock: totalAvail
      };

      await dbService.updateProduct(updatedProduct);
      await loadProducts();
      setIsDetailEditOpen(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error('Save detail edit error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Header Matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock overview</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Current product and variant availability across your stock locations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button matching top right in screenshot 1 */}
          <button
            onClick={loadProducts}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>refresh</span>
          </button>
        </div>
      </div>

      {/* Top Search & Filter Bar matching Screenshot 1 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Floating Input style for "Name or SKU" */}
        <div className="relative flex-1 max-w-xl">
          <div className="relative rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
            <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-medium text-slate-500 z-10">
              Find product
            </span>
            <div className="flex items-center px-3.5 py-2">
              <input
                type="text"
                placeholder="Name or SKU"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Checkboxes matching Screenshot 1 */}
        <div className="flex flex-wrap items-center gap-6">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Low Stock</span>
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={mismatchOnly}
              onChange={(e) => setMismatchOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Mismatch</span>
          </label>

          {/* View Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveViewTab('overview')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === 'overview'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveViewTab('ledger')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === 'ledger'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ledger
            </button>
          </div>
        </div>
      </div>

      {/* 7 Metric Cards Grid matching Screenshot 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* PRODUCTS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">total product</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalProducts}</div>
          <p className="text-[11px] text-slate-400 font-normal truncate">0 Variant SKU · Inactive</p>
        </div>

        {/* STOCK UNITS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total stock units</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalStockUnits.toLocaleString('en-US')}</div>
          <p className="text-[11px] text-slate-400 font-normal truncate">Active stock location</p>
        </div>

        {/* AVAILABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Available</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">{totalAvailableUnits.toLocaleString('en-US')}</div>
          <p className="text-[11px] text-slate-400 font-normal truncate">Now available for sale</p>
        </div>

        {/* RESERVED */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Reserved</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalReservedUnits}</div>
          <p className="text-[11px] text-slate-400 font-normal truncate">Committed stock</p>
        </div>

        {/* LOW STOCK */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Low stock</span>
          <div className="text-xl sm:text-2xl font-bold text-amber-600">{lowStockCount}</div>
          <p className="text-[11px] text-slate-400 font-normal truncate">Stock up soon</p>
        </div>

        {/* OUT OF STOCK */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">out of stock</span>
          <div className="text-xl sm:text-2xl font-bold text-red-600">{outOfStockCount}</div>
          <p className="text-[11px] text-slate-400 font-normal truncate">Not available</p>
        </div>

        {/* MISMATCHES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">mismatch</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{mismatchesCount}</div>
          <p className="text-[11px] text-slate-400 font-normal truncate">Projection vs. Location</p>
        </div>
      </div>

      {/* Main Table: Either Overview or Ledger */}
      {activeViewTab === 'overview' ? (
        /* Overview Table matching Screenshot 1 */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[220px]">product</th>
                  <th className="py-3.5 px-4">Available</th>
                  <th className="py-3.5 px-4">stock status</th>
                  <th className="py-3.5 px-4">Variant Availability</th>
                  <th className="py-3.5 px-4">Cost / Price</th>
                  <th className="py-3.5 px-4">condition</th>
                  <th className="py-3.5 px-4 text-right">action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8">
                      <CircularProgress label="Loading stock inventory list..." size="md" />
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No data setup now
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const avail = getCalculatedAvailable(p);
                    const isLow = avail > 0 && avail <= (p.reorderPoint || 10);
                    const isOut = avail <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* PRODUCT */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 tracking-tight">{p.title}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {p.sku || p.id.slice(0, 6)} · Single stock
                          </div>
                        </td>

                        {/* AVAILABLE */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {avail.toLocaleString('en-US')}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            of {(avail + (p.reservedStock || 0)).toLocaleString('en-US')} total
                          </div>
                        </td>

                        {/* CUSTODY */}
                        <td className="py-4 px-4 text-xs">
                          <div className="text-slate-800 font-medium">
                            Reserved {p.reservedStock || 0}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            Returns {p.returnedStock || 0} · Damaged {p.damagedStock || 0}
                          </div>
                        </td>

                        {/* VARIANT AVAILABILITY */}
                        <td className="py-4 px-4 text-xs text-slate-500 font-normal">
                          No variants
                        </td>

                        {/* COST / PRICE */}
                        <td className="py-4 px-4 text-xs">
                          <div className="text-slate-800 font-medium">
                            Tk. {(p.costPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            Sell Tk. {p.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* STATE */}
                        <td className="py-4 px-4">
                          {isOut ? (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-[11px] font-bold rounded-full inline-block border border-red-200">
                              Out of stock
                            </span>
                          ) : isLow ? (
                            <span className="px-3 py-1 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-full inline-block border border-amber-200">
                              Reorder Alert (≤{p.reorderPoint || 10})
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full inline-block border border-emerald-200">
                              Available
                            </span>
                          )}
                        </td>

                        {/* ACTIONS matching Screenshot 1 */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* + Quick button */}
                            <button
                              onClick={() => handleOpenQuickAdjust(p)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Quick</span>
                            </button>

                            {/* Sliders/Adjust icon button */}
                            <button
                              onClick={() => handleOpenDetailEdit(p)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                              title="Full inventory adjustment"
                            >
                              <Sliders className="h-4 w-4" />
                            </button>

                            {/* Delete icon button */}
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.title)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Detailed Inventory Movements Ledger Table matching Screenshot 2 */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[220px]">product</th>
                  <th className="py-3.5 px-4 text-center">opening</th>
                  <th className="py-3.5 px-4 text-center">Received</th>
                  <th className="py-3.5 px-4 text-center">sale</th>
                  <th className="py-3.5 px-4 text-center">return</th>
                  <th className="py-3.5 px-4 text-center">damaged</th>
                  <th className="py-3.5 px-4 text-center">transferred</th>
                  <th className="py-3.5 px-4 text-right">Current stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredProducts.map((p) => {
                  const avail = getCalculatedAvailable(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{p.title}</div>
                        <div className="text-[11px] text-slate-400">{p.sku || p.id.slice(0, 6)}</div>
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-slate-700">
                        {(p.openingStock ?? p.stock ?? 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-emerald-700">
                        {(p.receivedStock || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-blue-700">
                        {(p.soldStock || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-purple-700">
                        {(p.returnedStock || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-red-700">
                        {(p.damagedStock || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-slate-600">
                        {(p.transferredStock || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        {avail.toLocaleString('en-US')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Adjust Modal */}
      {isQuickAdjustOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Quick stock adjustment</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedProduct.title}</p>
              </div>
              <button
                onClick={() => setIsQuickAdjustOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Adjustment mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAdjustType('add')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      quickAdjustType === 'add'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    + Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAdjustType('subtract')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      quickAdjustType === 'subtract'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    - Reduce Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAdjustType('set')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      quickAdjustType === 'set'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Set Fixed
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Amount</label>
                <input
                  type="number"
                  min="0"
                  value={quickAdjustAmount}
                  onChange={(e) => setQuickAdjustAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                <span className="text-slate-500 font-medium">Stock as per new calculations:</span>
                <span className="font-bold text-slate-900">
                  {quickAdjustType === 'add'
                    ? getCalculatedAvailable(selectedProduct) + quickAdjustAmount
                    : quickAdjustType === 'subtract'
                    ? Math.max(0, getCalculatedAvailable(selectedProduct) - quickAdjustAmount)
                    : quickAdjustAmount}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsQuickAdjustOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleApplyQuickAdjust}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Stock Ledger Adjustment Modal */}
      {isDetailEditOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Inventory breakdown and price edit</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedProduct.title}</p>
              </div>
              <button
                onClick={() => setIsDetailEditOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetailEdit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKUSKUSKU</label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                {/* Reorder Point */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Re-order alert level</label>
                  <input
                    type="number"
                    value={editReorderPoint}
                    onChange={(e) => setEditReorderPoint(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                {/* Opening */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Opening stock</label>
                  <input
                    type="number"
                    value={editOpening}
                    onChange={(e) => setEditOpening(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                {/* Received */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock received</label>
                  <input
                    type="number"
                    value={editReceived}
                    onChange={(e) => setEditReceived(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-emerald-700"
                  />
                </div>

                {/* Sold */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">units sold</label>
                  <input
                    type="number"
                    value={editSold}
                    onChange={(e) => setEditSold(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-blue-700"
                  />
                </div>

                {/* Returned */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Return unit</label>
                  <input
                    type="number"
                    value={editReturned}
                    onChange={(e) => setEditReturned(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-purple-700"
                  />
                </div>

                {/* Damaged */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">damaged unit</label>
                  <input
                    type="number"
                    value={editDamaged}
                    onChange={(e) => setEditDamaged(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-red-700"
                  />
                </div>

                {/* Transferred */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transferred units</label>
                  <input
                    type="number"
                    value={editTransferred}
                    onChange={(e) => setEditTransferred(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tk.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                <span className="font-bold text-slate-600">Accounts Payable Stock:</span>
                <span className="font-extrabold text-sm text-blue-700">
                  {(editOpening + editReceived - editSold + editReturned - editDamaged - editTransferred).toLocaleString('en-US')} units
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(selectedProduct.id, selectedProduct.title)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete the product</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDetailEditOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    canceled
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Product Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetProduct}
        type="danger"
        title="Delete the product permanently?"
        message={`Are you sure that "${deleteTargetProduct?.title || 'this product'}" Permanent database from want to delete?`}
        confirmText="Yes, delete it"
        cancelText="canceled"
        onConfirm={handleConfirmDeleteProduct}
        onClose={() => setDeleteTargetProduct(null)}
      />
    </div>
  );
}
