import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Clock, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Package, 
  Sparkles,
  ArrowRight,
  Flame,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Product, EcomSettings, FlashSaleSettings } from '../types';
import { dbService } from '../lib/dbService';
import { DEFAULT_FLASH_SALE_SETTINGS } from '../lib/constants';

interface FlashSaleManagerProps {
  products: Product[];
  onSettingsUpdated?: () => void;
}

export default function FlashSaleManager({ products, onSettingsUpdated }: FlashSaleManagerProps) {
  const [ecomSettings, setEcomSettings] = useState<EcomSettings | null>(null);
  const [flashSale, setFlashSale] = useState<FlashSaleSettings>(DEFAULT_FLASH_SALE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live Countdown Demo State for Preview
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Load Settings from Firestore
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const settings = await dbService.getEcomSettings();
        setEcomSettings(settings);
        if (settings.flashSale) {
          setFlashSale({
            ...DEFAULT_FLASH_SALE_SETTINGS,
            ...settings.flashSale
          });
        }
      } catch (err) {
        console.error('Failed to load flash sale settings:', err);
        setErrorMsg('Failed to load settings from database.');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // Update Countdown Timer
  useEffect(() => {
    const calculateTime = () => {
      if (!flashSale.endDate) return;
      const difference = +new Date(flashSale.endDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [flashSale.endDate]);

  // Selected Target Product Details
  const selectedProduct = useMemo(() => {
    if (!flashSale.productId) return products[0] || null;
    return products.find(p => p.id === flashSale.productId) || products[0] || null;
  }, [products, flashSale.productId]);

  // Auto-fill from Product
  const handleAutoFillFromProduct = () => {
    if (!selectedProduct) return;
    setFlashSale(prev => ({
      ...prev,
      title: selectedProduct.title,
      subtitle: selectedProduct.description ? selectedProduct.description.slice(0, 160) + '...' : prev.subtitle,
      customImage: selectedProduct.coverImage || selectedProduct.image || (selectedProduct as any).images?.[0] || prev.customImage,
      originalPrice: selectedProduct.regularPrice || selectedProduct.price,
      flashPrice: selectedProduct.regularPrice ? selectedProduct.price : Math.round(selectedProduct.price * 0.8),
      badgeTag: selectedProduct.category ? `${selectedProduct.category.toUpperCase()} FLASH DEAL` : 'LIMITED FLASH SALE'
    }));
  };

  // Calculate discount percentage
  const discountPercent = useMemo(() => {
    const orig = flashSale.originalPrice || 0;
    const flash = flashSale.flashPrice || 0;
    if (orig > flash && orig > 0) {
      return Math.round(((orig - flash) / orig) * 100);
    }
    return 0;
  }, [flashSale.originalPrice, flashSale.flashPrice]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      const current = await dbService.getEcomSettings();
      const updated: EcomSettings = {
        ...current,
        flashSale: {
          ...flashSale,
          productId: flashSale.productId || (selectedProduct?.id || '')
        }
      };

      await dbService.saveEcomSettings(updated);
      setEcomSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      onSettingsUpdated?.();
    } catch (err: any) {
      console.error('Failed to save flash sale settings:', err);
      setErrorMsg(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-medium text-slate-500">Loading flash cell settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-6xl pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 ring-4 ring-orange-500/5">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Flash Sale Product Management
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 uppercase tracking-wider">
                1 Target Product
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a product and countdown end time for the storefront flash sale section.
            </p>
          </div>
        </div>

        {/* Enable / Disable Switch */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700">
            {flashSale.enabled ? 'Active' : 'Disabled'}
          </span>
          <button
            type="button"
            onClick={() => setFlashSale(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              flashSale.enabled ? 'bg-orange-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                flashSale.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Flash sale settings successfully saved and updated on store page!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        
        {/* Card 1: Select 1 Target Product */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              <h2 className="text-sm font-bold text-slate-900">Select Product</h2>
            </div>
            <button
              type="button"
              onClick={handleAutoFillFromProduct}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 cursor-pointer"
              title="Fill in the title and price from the product"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-fill Details
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Target Product:
            </label>
            <select
              value={flashSale.productId || ''}
              onChange={(e) => {
                const pid = e.target.value;
                const prod = products.find(p => p.id === pid);
                setFlashSale(prev => ({
                  ...prev,
                  productId: pid,
                  originalPrice: prod?.regularPrice || prod?.price || prev.originalPrice,
                  flashPrice: prod?.price || prev.flashPrice,
                  title: prod?.title || prev.title
                }));
              }}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all cursor-pointer"
            >
              {products.length === 0 ? (
                <option value="">No products found</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (Price: ৳{p.price.toLocaleString()})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Card 2: Price & Countdown Timer */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Clock className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-bold text-slate-900">Pricing & Countdown Timer</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Flash sale price (৳) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 text-xs font-bold">৳</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={flashSale.flashPrice || 0}
                  onChange={(e) => setFlashSale(prev => ({ ...prev, flashPrice: Number(e.target.value) }))}
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-bold focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Original / Regular price (৳)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 text-xs font-bold">৳</span>
                <input
                  type="number"
                  min="0"
                  value={flashSale.originalPrice || 0}
                  onChange={(e) => setFlashSale(prev => ({ ...prev, originalPrice: Number(e.target.value) }))}
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {discountPercent > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200/80 rounded-xl flex items-center justify-between text-xs font-bold text-orange-900">
              <span>Customer Savings Discount:</span>
              <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-[11px] font-black">
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Countdown End Date & Time */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-orange-500" />
              Flash sale end date & time:
            </label>
            <input
              type="datetime-local"
              value={flashSale.endDate ? flashSale.endDate.slice(0, 16) : ''}
              onChange={(e) => setFlashSale(prev => ({ ...prev, endDate: new Date(e.target.value).toISOString() }))}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono focus:border-orange-500 focus:outline-none cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              A live countdown timer will run on the storefront until this time.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}
