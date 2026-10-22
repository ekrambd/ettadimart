import React, { useState, useEffect } from 'react';
import { EcomSettings, PaymentGatewayItem } from '../types';
import { dbService, DEFAULT_PAYMENT_GATEWAYS } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { 
  CreditCard, 
  Check, 
  Save, 
  RefreshCw, 
  DollarSign, 
  Smartphone, 
  Plus, 
  Trash2, 
  Edit3, 
  X
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

export default function PaymentSettingsManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    gtmId: '',
    deliveryChargeInsideDhaka: 80,
    deliveryChargeOutsideDhaka: 130,
    bkashNumber: '',
    nagadNumber: '',
    paymentGateways: DEFAULT_PAYMENT_GATEWAYS
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
  const [gatewayFilter, setGatewayFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Edit Gateway state
  const [editingGateway, setEditingGateway] = useState<PaymentGatewayItem | null>(null);
  const [isAddingGateway, setIsAddingGateway] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const data = await dbService.getEcomSettings();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load payment settings:', err);
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
        title: 'Payment settings saved!',
        message: 'The payment gateway configuration has been successfully saved to the database.'
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'There was an error saving',
        message: 'There was a problem saving payment settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const gateways = settings.paymentGateways || DEFAULT_PAYMENT_GATEWAYS;
  const filteredGateways = gateways.filter(gw => {
    if (gatewayFilter === 'active') return gw.status === 'Active';
    if (gatewayFilter === 'inactive') return gw.status === 'Inactive';
    return true;
  });

  const handleOpenAddGateway = () => {
    setEditingGateway({
      id: `gw-${Date.now()}`,
      title: 'New payment gateway',
      type: 'Manual Gateway',
      status: 'Active',
      transactionFee: 0,
      discountAmount: 0,
      priority: gateways.length + 1,
      instruction: 'TrxID write down।',
      accountNumber: '',
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
    setIsAddingGateway(true);
  };

  const handleSaveGatewayForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGateway) return;

    let updatedList: PaymentGatewayItem[];
    if (isAddingGateway) {
      updatedList = [...gateways, editingGateway];
    } else {
      updatedList = gateways.map(g => g.id === editingGateway.id ? editingGateway : g);
    }

    const newSettings = { ...settings, paymentGateways: updatedList };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);

    setEditingGateway(null);
    setIsAddingGateway(false);
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Payment method saved!',
      message: `"${editingGateway.title}" successfulway has been updated।`
    });
  };

  const handleDeleteGateway = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    const targetItem = gateways.find(g => g.id === deleteTargetId);
    const updatedList = gateways.filter(g => g.id !== deleteTargetId);
    const newSettings = { ...settings, paymentGateways: updatedList };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);
    setDeleteTargetId(null);
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Payment gateway has been deleted',
      message: `"${targetItem?.title || 'gateway'}" successfulway list from has been deleted।`
    });
  };

  const handleToggleGatewayStatus = (id: string) => {
    const updatedList = gateways.map(g => {
      if (g.id === id) {
        return {
          ...g,
          status: g.status === 'Active' ? ('Inactive' as const) : ('Active' as const),
          updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      }
      return g;
    });
    const newSettings = { ...settings, paymentGateways: updatedList };
    setSettings(newSettings);
    dbService.saveEcomSettings(newSettings);
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading payment settings..." size="md" />
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto text-slate-800 pb-16">

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Payment Gateway and method seTNs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                For customer checkout Payment options (Cash on delivery, development, cash etc) confeegar
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
            <span className="hidden sm:inline">refresh</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-200">
                <Check className="h-4 w-4 text-emerald-300" />
                saved!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                save
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Editor Modal for Payment Gateway */}
      {editingGateway && (
        <form onSubmit={handleSaveGatewayForm} className="bg-white border-2 border-teal-200 p-6 rounded-3xl shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-teal-600" />
                <span>{editingGateway.title || 'new payment gateway'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Payment Gateway details, fee, Determine the account number and instructions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingGateway(null)}
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
                value={editingGateway.title}
                onChange={(e) => setEditingGateway({ ...editingGateway, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors font-medium"
                placeholder="Eg: Bikash Mobile Banking"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Type *</label>
              <select
                value={editingGateway.type}
                onChange={(e) => setEditingGateway({ ...editingGateway, type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors font-medium cursor-pointer"
              >
                <option value="Cash on Delivery">Cash on DeliveryCash on delivery</option>
                <option value="bKash Mobile Banking">bKashBikash</option>
                <option value="Nagad Mobile Banking">Nagadcash</option>
                <option value="Rocket Mobile Banking">Rocketthe rocket</option>
                <option value="Manual Gateway">Manual / Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Transaction Fee Tk.</label>
              <input
                type="number"
                value={editingGateway.transactionFee}
                onChange={(e) => setEditingGateway({ ...editingGateway, transactionFee: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Discount Tk.</label>
              <input
                type="number"
                value={editingGateway.discountAmount}
                onChange={(e) => setEditingGateway({ ...editingGateway, discountAmount: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors font-mono"
              />
            </div>

            {editingGateway.type !== 'Cash on Delivery' && (
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Account Number / Merchant Number</label>
                <input
                  type="text"
                  value={editingGateway.accountNumber || ''}
                  onChange={(e) => setEditingGateway({ ...editingGateway, accountNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
                  placeholder="For example: 017XXXXXXXXPersonal / Merchant"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Instruction Note</label>
              <textarea
                rows={3}
                value={editingGateway.instruction}
                onChange={(e) => setEditingGateway({ ...editingGateway, instruction: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
                placeholder="Customers will see this instruction during checkout..."
              />
            </div>

            {/* Status Toggle Block */}
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Status</h4>
                <p className="text-[11px] text-slate-500">Tick to enable this gateway for the customer at checkout.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingGateway.status === 'Active'}
                  onChange={(e) => setEditingGateway({ ...editingGateway, status: e.target.checked ? 'Active' : 'Inactive' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-xs font-bold text-slate-700">
                  {editingGateway.status === 'Active'? 'Active' : 'inactive'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingGateway(null)}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
            >
              canceled
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer"
            >
              save
            </button>
          </div>
        </form>
      )}

      {/* Payment Gateways Header Action Bar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-extrabold text-slate-900">List of payment methods</h3>
              <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold rounded-lg">
                {gateways.length} T method
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              customerTo order active Payment MethodManage the
            </p>
          </div>

          <button
            onClick={handleOpenAddGateway}
            className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add new payment method</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setGatewayFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                gatewayFilter === f
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? `${gateways.length}` : f === 'active' ? `active (${gateways.filter(g => g.status === 'Active').length})` : `inactive (${gateways.filter(g => g.status === 'Inactive').length})`}
            </button>
          ))}
        </div>

        {/* Gateways Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                <th className="px-4 py-3.5">Payment Method</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">fee</th>
                <th className="px-4 py-3.5">Update</th>
                <th className="px-4 py-3.5 text-right">action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredGateways.map((gw, idx) => (
                <tr key={gw.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl border ${
                        gw.type.includes('bKash') ? 'bg-pink-50 text-pink-600 border-pink-200' :
                        gw.type.includes('Nagad') ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>
                        {gw.type.includes('bKash') || gw.type.includes('Nagad') ? <Smartphone className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">{gw.title}</div>
                        <div className="text-[11px] text-slate-500">{gw.type} {gw.type !== 'Cash on Delivery' && gw.accountNumber ? `(${gw.accountNumber})` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleToggleGatewayStatus(gw.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-transform hover:scale-105 ${
                        gw.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${gw.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                      <span>{gw.status === 'Active' ? 'active' : 'inactive' }</span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-700 font-bold">
                    Tk.{gw.transactionFee}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                    {gw.updatedAt}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => {
                          setEditingGateway(gw);
                          setIsAddingGateway(false);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 cursor-pointer"
                        title="edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGateway(gw.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer"
                        title="delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredGateways.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    any Payment Gateway not found। New Gateway add।
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
        title="Delete payment method?"
        message="Are you sure you want to permanently remove this payment method from the list?"
        confirmText="Yes, delete it"
        cancelText="canceled"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
