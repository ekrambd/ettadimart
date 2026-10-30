import React, { useState, useEffect } from 'react';
import { ProductUnit } from '../types';
import { dbService } from '../lib/dbService';
import { Plus, Edit3, Trash2, Check, X, RotateCcw } from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

export default function UnitsManager() {
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitName, setUnitName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ProductUnit | null>(null);

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

  const loadUnits = async () => {
    setLoading(true);
    try {
      const data = await dbService.getUnits();
      setUnits(data);
    } catch (err) {
      console.error('Failed to load units:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleOpenAdd = () => {
    setEditingUnitId(null);
    setUnitName('');
    setIsActive(true);
    setShowAddForm(true);
  };

  const handleOpenEdit = (unit: ProductUnit) => {
    setEditingUnitId(unit.id);
    setUnitName(unit.name);
    setIsActive(unit.status !== false);
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingUnitId(null);
    setUnitName('');
    setIsActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;

    setIsSubmitting(true);
    try {
      const cleanName = unitName.trim();
      const code = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '');

      await dbService.saveUnit({
        ...(editingUnitId && { id: editingUnitId }),
        name: cleanName,
        code: code || cleanName,
        status: isActive
      });

      await loadUnits();
      handleCancelForm();
      setFeedback({
        isOpen: true,
        type: 'success',
        title: editingUnitId ? 'Unit Updated' : 'Unit Created',
        message: `Unit "${cleanName}" has been saved successfully.`
      });
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not save unit.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (unit: ProductUnit) => {
    try {
      const updatedStatus = unit.status === false ? true : false;
      await dbService.saveUnit({
        id: unit.id,
        name: unit.name,
        code: unit.code,
        status: updatedStatus
      });
      setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, status: updatedStatus } : u));
    } catch (err) {
      console.error('Failed to toggle unit status:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteUnit(deleteTarget.id);
      setUnits(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Unit Deleted',
        message: 'The unit was deleted successfully.'
      });
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete unit.'
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16">
      
      {/* Top Header Card matching Screenshot 1 & 2 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Units</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">
              The units a product can be sold in — kg, litre, pack, and any you add
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showAddForm) {
                handleCancelForm();
              } else {
                handleOpenAdd();
              }
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Unit</span>
          </button>
        </div>

        {/* Inline Add / Edit Unit Form (Screenshot 1) */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            
            {/* Input field */}
            <div className="flex-1 max-w-lg">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Unit Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="kg, litre, piece, pack..."
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border-2 border-emerald-500/80 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Toggle Switch + Buttons */}
            <div className="flex items-center gap-4">
              {/* Active Toggle matching Screenshot 1 */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    isActive ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-slate-700">Active</span>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Submit'}
              </button>
            </div>

          </form>
        )}
      </div>

      {/* Units Table matching Screenshot 1 & 2 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-4 px-6 w-20">SL</th>
                <th className="py-4 px-6">NAME</th>
                <th className="py-4 px-6">STATUS</th>
                <th className="py-4 px-6 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                    Loading measurement units...
                  </td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                    No units found. Click "Add Unit" to add one.
                  </td>
                </tr>
              ) : (
                units.map((unit, index) => {
                  const isUnitActive = unit.status !== false;

                  return (
                    <tr key={unit.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* SL */}
                      <td className="py-4 px-6 font-semibold text-slate-600 text-xs">
                        {index + 1}.
                      </td>

                      {/* NAME */}
                      <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                        {unit.name}
                      </td>

                      {/* STATUS (Blue iOS Toggle matching Screenshot 1 & 2) */}
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(unit)}
                          className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                            isUnitActive ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                              isUnitActive ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* ACTION (Gray Boxed Edit & Delete Icons) */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(unit)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Unit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(unit)}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Unit"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Unit"
        message={`Are you sure you want to delete measurement unit "${deleteTarget?.name}"?`}
        confirmText="Yes, delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
