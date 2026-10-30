import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, AlertCircle, Check, Loader2, Sparkles, SlidersHorizontal, RefreshCw
} from 'lucide-react';
import { dbService } from '../lib/dbService';
import { TaxItem } from '../types';

export default function VatTaxManager() {
  const [taxes, setTaxes] = useState<TaxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxItem | null>(null);

  // Form states
  const [taxName, setTaxName] = useState('');
  const [taxPercentage, setTaxPercentage] = useState<string>('');
  const [taxStatus, setTaxStatus] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTaxes = async () => {
    setLoading(true);
    try {
      const data = await dbService.getTaxes();
      setTaxes(data);
    } catch (err: any) {
      console.error('Error loading taxes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxes();

    const handleTaxesUpdated = (e: any) => {
      if (e.detail) setTaxes(e.detail);
      else loadTaxes();
    };

    window.addEventListener('taxes-updated', handleTaxesUpdated);
    return () => window.removeEventListener('taxes-updated', handleTaxesUpdated);
  }, []);

  const handleOpenCreateModal = () => {
    setEditingTax(null);
    setTaxName('');
    setTaxPercentage('');
    setTaxStatus(true);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tax: TaxItem) => {
    setEditingTax(tax);
    setTaxName(tax.name);
    setTaxPercentage(String(tax.percentage));
    setTaxStatus(tax.status);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (tax: TaxItem) => {
    const updatedStatus = !tax.status;
    // Optimistic UI update
    setTaxes(prev => prev.map(t => t.id === tax.id ? { ...t, status: updatedStatus } : t));
    try {
      await dbService.updateTax(tax.id, { status: updatedStatus });
    } catch (err) {
      console.error('Failed to toggle tax status:', err);
      loadTaxes();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxName.trim()) {
      setErrorMessage('Tax Name is required.');
      return;
    }
    const parsedPercent = parseFloat(taxPercentage);
    if (isNaN(parsedPercent) || parsedPercent < 0) {
      setErrorMessage('Please enter a valid percentage (0 or greater).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (editingTax) {
        await dbService.updateTax(editingTax.id, {
          name: taxName.trim(),
          percentage: parsedPercent,
          status: taxStatus
        });
      } else {
        await dbService.addTax({
          name: taxName.trim(),
          percentage: parsedPercent,
          status: taxStatus
        });
      }
      setIsModalOpen(false);
      loadTaxes();
    } catch (err: any) {
      console.error('Tax save error:', err);
      setErrorMessage(err.message || 'Failed to save tax setting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tax rate?')) return;
    setDeletingId(id);
    try {
      await dbService.deleteTax(id);
      loadTaxes();
    } catch (err) {
      console.error('Failed to delete tax:', err);
      alert('Failed to delete tax');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* =========================================================================
          IMPORTANT INFORMATION NOTICE BANNER (MATCHING IMAGE 1 & 4)
         ========================================================================= */}
      <div className="bg-[#e6f4fc] border border-[#b8e2f8] rounded-2xl p-5 text-slate-800 space-y-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg">🌟</span>
          <h3 className="font-bold text-slate-900 text-sm">Important Information</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          Just a quick note: <strong className="font-bold text-slate-800">VAT and Taxes are calculated based on your order.</strong> If you have multiple VAT and Tax rates active, your total VAT and Tax amount will be clearly displayed on the checkout page for your convenience.
        </p>
      </div>

      {/* =========================================================================
          ALL TAXES CARD CONTAINER
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
        
        {/* Top Header with 'Create New' Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">All Taxes</h2>
          
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create New</span>
          </button>
        </div>

        {/* Taxes Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-6 w-16">SL</th>
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-6">Percentage</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading taxes...</span>
                  </td>
                </tr>
              ) : taxes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-700">No Data Found</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;Create New&quot; to configure your first VAT or tax rate.</p>
                  </td>
                </tr>
              ) : (
                taxes.map((tax, idx) => (
                  <tr key={tax.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3.5 px-6 font-bold text-slate-800">{tax.name}</td>
                    <td className="py-3.5 px-6 font-bold text-slate-700 font-mono">{tax.percentage}%</td>
                    <td className="py-3.5 px-6 text-center">
                      {/* Toggle Switch matching screenshot */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(tax)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden ${
                          tax.status ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tax.status ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(tax)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors shadow-2xs"
                          title="Edit Tax"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === tax.id}
                          onClick={() => handleDelete(tax.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                          title="Delete Tax"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* =========================================================================
          MODAL: ADD / EDIT TAX (MATCHING IMAGE 2 EXACTLY)
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingTax ? 'Edit Tax' : 'Add New Tax'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tax Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="Tax Name"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Percentage(%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(e.target.value)}
                  placeholder="Percentage(%)"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono transition-all"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-700">Status</span>
                <button
                  type="button"
                  onClick={() => setTaxStatus(!taxStatus)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    taxStatus ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      taxStatus ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons: Close (Gray) & Submit (Green) matching screenshot */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer transition-colors shadow-2xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Submit</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
