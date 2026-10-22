import React, { useState, useEffect } from 'react';
import { EcomSettings, DeliveryMethodItem } from '../types';
import { dbService, DEFAULT_DELIVERY_METHODS } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Truck, 
  Check, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3, 
  X,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

export default function DeliverySettingsManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    gtmId: '',
    deliveryChargeInsideDhaka: 60,
    deliveryChargeOutsideDhaka: 120,
    bkashNumber: '',
    nagadNumber: '',
    deliveryMethods: DEFAULT_DELIVERY_METHODS,
    weightBasedDeliveryEnabled: true,
    defaultBaseWeightKg: 1,
    defaultExtraPerKgInsideDhaka: 20,
    defaultExtraPerKgOutsideDhaka: 25,
    defaultProductWeightKg: 0.5
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Filter
  const [logisticsFilter, setLogisticsFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Edit Delivery state
  const [editingDelivery, setEditingDelivery] = useState<DeliveryMethodItem | null>(null);
  const [isAddingDelivery, setIsAddingDelivery] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [calcWeight, setCalcWeight] = useState<number>(2.5);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const data = await dbService.getEcomSettings();
      if (data) {
        setSettings({
          ...data,
          weightBasedDeliveryEnabled: data.weightBasedDeliveryEnabled ?? true,
          defaultBaseWeightKg: data.defaultBaseWeightKg ?? 1,
          defaultExtraPerKgInsideDhaka: data.defaultExtraPerKgInsideDhaka ?? 20,
          defaultExtraPerKgOutsideDhaka: data.defaultExtraPerKgOutsideDhaka ?? 25,
          defaultProductWeightKg: data.defaultProductWeightKg ?? 0.5
        });
      }
    } catch (err) {
      console.error('Failed to load delivery settings:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await dbService.saveEcomSettings(settings);
      setSaveSuccess(true);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Delivery Settings Saved',
        message: 'Delivery methods and shipping rates have been successfully saved.'
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving delivery settings:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: 'There was a problem saving delivery settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deliveryMethods = settings.deliveryMethods || DEFAULT_DELIVERY_METHODS;
  const filteredDelivery = deliveryMethods.filter(dm => {
    if (logisticsFilter === 'active') return dm.status === 'Active';
    if (logisticsFilter === 'inactive') return dm.status === 'Inactive';
    return true;
  });

  const handleOpenAddDelivery = () => {
    setEditingDelivery({
      id: `dm-${Date.now()}`,
      title: 'New Delivery Method',
      status: 'Active',
      mode: 'Weight based',
      type: 'Weight based',
      minimumCharge: 0,
      maximumCharge: 0,
      deliveryCharge: 60,
      baseWeightKg: 1,
      extraPerKgCharge: 20,
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
    setIsAddingDelivery(true);
  };

  const handleSaveDeliveryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelivery) return;

    let updatedList: DeliveryMethodItem[];
    if (isAddingDelivery) {
      updatedList = [...deliveryMethods, editingDelivery];
    } else {
      updatedList = deliveryMethods.map(d => d.id === editingDelivery.id ? editingDelivery : d);
    }

    // Sync legacy delivery fields if inside/outside dhaka
    let insideCharge = settings.deliveryChargeInsideDhaka;
    let outsideCharge = settings.deliveryChargeOutsideDhaka;

    const lowerTitle = editingDelivery.title.toLowerCase();
    if (lowerTitle.includes('inside') || lowerTitle.includes('dhaka') || lowerTitle.includes('city')) {
      insideCharge = editingDelivery.deliveryCharge;
    } else if (lowerTitle.includes('outside')) {
      outsideCharge = editingDelivery.deliveryCharge;
    }

    const newSettings = { 
      ...settings, 
      deliveryMethods: updatedList,
      deliveryChargeInsideDhaka: insideCharge,
      deliveryChargeOutsideDhaka: outsideCharge
    };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);

    setEditingDelivery(null);
    setIsAddingDelivery(false);
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Delivery Method Saved',
      message: `"${editingDelivery.title}" has been successfully saved.`
    });
  };

  const handleDeleteDelivery = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    const targetItem = deliveryMethods.find(d => d.id === deleteTargetId);
    const updatedList = deliveryMethods.filter(d => d.id !== deleteTargetId);
    const newSettings = { ...settings, deliveryMethods: updatedList };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);
    setDeleteTargetId(null);
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Delivery Method Deleted',
      message: `"${targetItem?.title || 'Delivery method'}" has been permanently removed.`
    });
  };

  const handleToggleDeliveryStatus = (id: string) => {
    const updatedList = deliveryMethods.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: d.status === 'Active' ? ('Inactive' as const) : ('Active' as const),
          updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      }
      return d;
    });
    const newSettings = { ...settings, deliveryMethods: updatedList };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading delivery settings..." size="md" />
    );
  }

  return (
    <div className="space-y-6 font-sans w-full text-slate-800 pb-16">

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Delivery Methods & Shipping Rates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure professional weight-based shipping, zones, and delivery rates for checkout.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save / Refresh Buttons */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            onClick={loadSettings}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-200">
                <Check className="h-4 w-4 text-emerald-300" />
                Saved!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Settings
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Editor Modal for Delivery Method */}
      {editingDelivery && (
        <form onSubmit={handleSaveDeliveryForm} className="bg-white border-2 border-teal-200 p-6 rounded-2xl shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="h-5 w-5 text-teal-600" />
                <span>{editingDelivery.title || 'New Delivery Method'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure delivery zone, rate type, base weight, and extra weight surcharge.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingDelivery(null)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Title *</label>
              <input
                type="text"
                required
                value={editingDelivery.title}
                onChange={(e) => setEditingDelivery({ ...editingDelivery, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors font-medium"
                placeholder="e.g. Inside Dhaka or Outside Dhaka"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Fee Type *</label>
              <select
                value={editingDelivery.type}
                onChange={(e) => setEditingDelivery({ ...editingDelivery, type: e.target.value, mode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors font-medium cursor-pointer"
              >
                <option value="Weight based">Weight-Based (প্রতি কেজি ভিত্তিক - Recommended)</option>
                <option value="Fixed">Fixed Rate (নির্দিষ্ট রেট)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {editingDelivery.type === 'Weight based' ? 'Base Delivery Charge (Tk) *' : 'Delivery Charge (Tk) *'}
              </label>
              <input
                type="number"
                required
                value={editingDelivery.deliveryCharge}
                onChange={(e) => setEditingDelivery({ ...editingDelivery, deliveryCharge: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {editingDelivery.type === 'Weight based'
                  ? 'Covers parcels up to base weight (e.g. 60 Tk Inside Dhaka, 120 Tk Outside Dhaka).'
                  : 'Fixed charge applied regardless of package weight.'}
              </p>
            </div>

            {editingDelivery.type === 'Weight based' ? (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Base Weight (Kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={editingDelivery.baseWeightKg ?? 1}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, baseWeightKg: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Standard courier base limit in Bangladesh (Default: 1 kg).</p>
              </div>
            ) : (
              <div />
            )}

            {editingDelivery.type === 'Weight based' && (
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Extra Charge Per Additional Kg (Tk) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingDelivery.extraPerKgCharge ?? 20}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, extraPerKgCharge: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Amount added for each additional kg over the base weight (e.g. +20 Tk for Inside Dhaka, +25 Tk for Outside Dhaka).
                </p>
              </div>
            )}

            {/* Interactive Calculator Preview for Weight-Based */}
            {editingDelivery.type === 'Weight based' && (
              <div className="md:col-span-2 p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-xs text-teal-950 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-teal-700" />
                    Live Shipping Rate Calculator Preview (লাইভ হিসাব যাচাই)
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-600 font-medium">Test Weight:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(Math.max(0.1, Number(e.target.value)))}
                      className="w-16 px-2 py-1 bg-white border border-teal-300 rounded font-mono font-bold text-center text-teal-900 text-xs"
                    />
                    <span className="font-bold text-teal-900">kg</span>
                  </div>
                </div>

                {(() => {
                  const baseWeight = editingDelivery.baseWeightKg ?? 1;
                  const extraPerKg = editingDelivery.extraPerKgCharge ?? 20;
                  const extraKg = Math.max(0, Math.ceil(calcWeight - baseWeight));
                  const extraFee = extraKg * extraPerKg;
                  const total = editingDelivery.deliveryCharge + extraFee;
                  return (
                    <div className="text-xs text-slate-700 font-medium flex flex-wrap items-center gap-2 pt-1">
                      <span>Customer orders <strong>{calcWeight} kg</strong>:</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-teal-200">
                        Base (≤ {baseWeight}kg) = <strong>Tk {editingDelivery.deliveryCharge}</strong>
                      </span>
                      <span>+</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-teal-200">
                        Extra ({extraKg} kg × Tk {extraPerKg}) = <strong>Tk {extraFee}</strong>
                      </span>
                      <span>=</span>
                      <span className="bg-teal-700 text-white font-extrabold px-3 py-1 rounded shadow-2xs">
                        Calculated Delivery: Tk {total}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Status Toggle Block */}
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Status</h4>
                <p className="text-[11px] text-slate-500">Enable this method for customers during checkout.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingDelivery.status === 'Active'}
                  onChange={(e) => setEditingDelivery({ ...editingDelivery, status: e.target.checked ? 'Active' : 'Inactive' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-xs font-bold text-slate-700">
                  {editingDelivery.status === 'Active' ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingDelivery(null)}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer"
            >
              Save Method
            </button>
          </div>
        </form>
      )}

      {/* Global Weight-Based Shipping Rule Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Weight-Based Shipping System (ওজনভিত্তিক ডেলিভারি সিস্টেম)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically increase shipping charges based on parcel weight (Professional courier standard: Steadfast, Pathao, RedX).
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.weightBasedDeliveryEnabled ?? true}
              onChange={(e) => {
                const newSettings = { ...settings, weightBasedDeliveryEnabled: e.target.checked };
                setSettings(newSettings);
                dbService.saveEcomSettings(newSettings);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            <span className="ml-3 text-xs font-bold text-slate-800">
              {settings.weightBasedDeliveryEnabled ?? true ? 'Active (চালু)' : 'Inactive (বন্ধ)'}
            </span>
          </label>
        </div>

        {settings.weightBasedDeliveryEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-slate-700 font-bold">Standard Base Weight</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={settings.defaultBaseWeightKg ?? 1}
                  onChange={(e) => {
                    const newSettings = { ...settings, defaultBaseWeightKg: Number(e.target.value) };
                    setSettings(newSettings);
                    dbService.saveEcomSettings(newSettings);
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                />
                <span className="font-bold text-slate-600">kg</span>
              </div>
              <p className="text-[10px] text-slate-500">Weight included in base charge (Standard in BD: 1 kg).</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-slate-700 font-bold">Default Product Fallback Weight</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0.05"
                  value={settings.defaultProductWeightKg ?? 0.5}
                  onChange={(e) => {
                    const newSettings = { ...settings, defaultProductWeightKg: Number(e.target.value) };
                    setSettings(newSettings);
                    dbService.saveEcomSettings(newSettings);
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                />
                <span className="font-bold text-slate-600">kg</span>
              </div>
              <p className="text-[10px] text-slate-500">Used if a product does not have an explicit weight set.</p>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
              <div className="font-bold text-amber-950 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Standard BD Courier Rates:</span>
              </div>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc list-inside">
                <li><strong>Inside Dhaka:</strong> ৳60 base (1kg) + ৳20/extra kg</li>
                <li><strong>Outside Dhaka:</strong> ৳120 base (1kg) + ৳25/extra kg</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Methods Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-extrabold text-slate-900">Delivery Methods</h3>
              <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold rounded-lg">
                {deliveryMethods.length} {deliveryMethods.length === 1 ? 'Method' : 'Methods'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage shipping zones and courier rates available at checkout.
            </p>
          </div>

          <button
            onClick={handleOpenAddDelivery}
            className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Delivery Method</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setLogisticsFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                logisticsFilter === f
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f === 'all'
                ? `All (${deliveryMethods.length})`
                : f === 'active'
                ? `Active (${deliveryMethods.filter(d => d.status === 'Active').length})`
                : `Inactive (${deliveryMethods.filter(d => d.status === 'Inactive').length})`}
            </button>
          ))}
        </div>

        {/* Delivery Methods Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">SL</th>
                <th className="px-4 py-3.5">Delivery Method</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Delivery Fee</th>
                <th className="px-4 py-3.5">Last Updated</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredDelivery.map((dm, idx) => (
                <tr key={dm.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">{dm.title}</div>
                        <div className="text-[11px] text-slate-500">{dm.mode || 'Weight based'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleToggleDeliveryStatus(dm.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-transform hover:scale-105 ${
                        dm.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${dm.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                      <span>{dm.status === 'Active' ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-900 font-bold">
                    <div>Tk {dm.deliveryCharge}</div>
                    {(dm.type === 'Weight based' || dm.mode === 'Weight based' || settings.weightBasedDeliveryEnabled) && (
                      <div className="text-[10px] text-teal-700 font-semibold mt-0.5 flex items-center gap-1 font-sans">
                        <Scale className="w-3 h-3 text-teal-600 shrink-0" />
                        <span>+ Tk {dm.extraPerKgCharge ?? (dm.title.toLowerCase().includes('inside') ? 20 : 25)}/kg (&gt; {dm.baseWeightKg ?? 1}kg)</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                    {dm.updatedAt}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => {
                          setEditingDelivery(dm);
                          setIsAddingDelivery(false);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDelivery(dm.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDelivery.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No delivery methods found. Click &quot;Add Delivery Method&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        type="danger"
        title="Delete Delivery Method?"
        message="Are you sure you want to permanently delete this delivery method from the list?"
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
