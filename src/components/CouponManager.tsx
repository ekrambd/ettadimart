import React, { useState, useEffect } from 'react';
import { Coupon } from '../types';
import { dbService } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { Search, Plus, Edit2, Trash2, X, Check, Tag, Filter, ShieldCheck } from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [primaryColor, setPrimaryColor] = useState('#0f766e');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Active' | 'Inactive' | 'Public' | 'Private'>('All');

  // Edit/Create drawer state
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTargetCouponId, setDeleteTargetCouponId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formMaxDiscount, setFormMaxDiscount] = useState<number>(0);
  const [formMinSpent, setFormMinSpent] = useState<number>(0);
  const [formUsageLimit, setFormUsageLimit] = useState<number>(0);
  const [formEndDate, setFormEndDate] = useState('');
  const [formType, setFormType] = useState<'fixed' | 'percentage'>('fixed');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formOncePerCustomer, setFormOncePerCustomer] = useState(false);
  const [formDescription, setFormDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const list = await dbService.getCoupons();
      setCoupons(list);
      const settings = await dbService.getEcomSettings();
      if (settings && settings.primaryColor) {
        setPrimaryColor(settings.primaryColor);
      }
    } catch (e) {
      console.error('Error loading coupons:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setIsCreating(true);
    setFormTitle('');
    setFormCode('');
    setFormDiscount(0);
    setFormMaxDiscount(0);
    setFormMinSpent(0);
    setFormUsageLimit(100);
    setFormEndDate('');
    setFormType('fixed');
    setFormIsActive(true);
    setFormIsPublic(false);
    setFormOncePerCustomer(false);
    setFormDescription('');
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setIsCreating(false);
    setEditingCoupon(coupon);
    setFormTitle(coupon.title || '');
    setFormCode(coupon.code || '');
    setFormDiscount(coupon.discount || 0);
    setFormMaxDiscount(coupon.maxDiscount || 0);
    setFormMinSpent(coupon.minimumSpent || 0);
    setFormUsageLimit(coupon.usageLimit || 0);
    setFormEndDate(coupon.endDate || '');
    setFormType(coupon.type || 'fixed');
    setFormIsActive(coupon.status === 'Active');
    setFormIsPublic(coupon.visibility === 'Public');
    setFormOncePerCustomer(coupon.oncePerCustomer || false);
    setFormDescription(coupon.description || '');
  };

  const handleCloseForm = () => {
    setEditingCoupon(null);
    setIsCreating(false);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      alert('Must give coupon code!');
      return;
    }

    setSaving(true);
    try {
      const couponPayload = {
        code: formCode.trim().toUpperCase(),
        title: formTitle.trim() || formCode.trim(),
        discount: Number(formDiscount) || 0,
        maxDiscount: Number(formMaxDiscount) || 0,
        minimumSpent: Number(formMinSpent) || 0,
        usageLimit: Number(formUsageLimit) || 0,
        usageCount: editingCoupon ? editingCoupon.usageCount : 0,
        endDate: formEndDate,
        type: formType,
        status: (formIsActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
        visibility: (formIsPublic ? 'Public' : 'Private') as 'Public' | 'Private',
        oncePerCustomer: formOncePerCustomer,
        description: formDescription,
        updatedAt: 'Just now'
      };

      if (isCreating) {
        await dbService.addCoupon(couponPayload);
        setMsg('The new coupon has been created successfully!');
      } else if (editingCoupon) {
        await dbService.updateCoupon({
          ...couponPayload,
          id: editingCoupon.id
        });
        setMsg('Coupon update was successful!');
      }

      await loadCoupons();
      handleCloseForm();
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      alert('There was a problem saving the coupon: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = (id: string) => {
    setDeleteTargetCouponId(id);
  };

  const handleConfirmDeleteCoupon = async () => {
    if (!deleteTargetCouponId) return;
    const targetId = deleteTargetCouponId;
    setDeleteTargetCouponId(null);
    try {
      await dbService.deleteCoupon(targetId);
      await loadCoupons();
      if (editingCoupon?.id === targetId) {
        handleCloseForm();
      }
      setMsg('Coupon has been successfully deleted!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error('Delete coupon failed:', e);
      alert('Failed to delete coupon. Try again.');
    }
  };

  // Filtered coupons
  const filteredCoupons = coupons.filter(coupon => {
    // Search query
    const matchesSearch = 
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupon.title.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'Active') return coupon.status === 'Active';
    if (filterTab === 'Inactive') return coupon.status === 'Inactive';
    if (filterTab === 'Public') return coupon.visibility === 'Public';
    if (filterTab === 'Private') return coupon.visibility === 'Private';

    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Coupon management</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Create and manage coupon codes and discount offers for customers.</p>
        </div>
        <div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>new coupon</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Filter and Search Bar matching Screenshot 1 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(['All', 'Active', 'Inactive', 'Public', 'Private'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              style={filterTab === tab ? { backgroundColor: primaryColor } : undefined}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] md:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code or title"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Inline Form Modal Drawer for Editing/Creating Coupon (Matching Screenshot 2) */}
      {(isCreating || editingCoupon) && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 sm:p-7 shadow-lg space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isCreating ? 'Create new coupons' : `Edit coupons: ${editingCoupon?.code}`}
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Here are all the couponsTNs Update And save can do।
              </p>
            </div>
            <button
              onClick={handleCloseForm}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSaveCoupon} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Title */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-xs font-medium text-slate-600 z-10">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-transparent outline-none rounded-xl"
                />
              </div>

              {/* Code */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-xs font-medium text-slate-600 z-10">
                  Code
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DIS2000"
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-transparent outline-none rounded-xl font-mono uppercase font-bold"
                />
              </div>

              {/* Discount */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-xs font-medium text-slate-600 z-10">
                  Discount Amount / %
                </label>
                <input
                  type="number"
                  required
                  value={formDiscount}
                  onChange={(e) => setFormDiscount(Number(e.target.value))}
                  placeholder="2500"
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-transparent outline-none rounded-xl font-semibold"
                />
              </div>

              {/* Max discount */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-xs font-medium text-slate-600 z-10">
                  Max discount (0 for unlimited)
                </label>
                <input
                  type="number"
                  value={formMaxDiscount}
                  onChange={(e) => setFormMaxDiscount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-transparent outline-none rounded-xl"
                />
              </div>

              {/* Minimum spent */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-xs font-medium text-slate-600 z-10">
                  Minimum spent
                </label>
                <input
                  type="number"
                  value={formMinSpent}
                  onChange={(e) => setFormMinSpent(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-transparent outline-none rounded-xl"
                />
              </div>

              {/* Usage limit */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-xs font-medium text-slate-600 z-10">
                  Usage limit
                </label>
                <input
                  type="number"
                  value={formUsageLimit}
                  onChange={(e) => setFormUsageLimit(Number(e.target.value))}
                  placeholder="10000"
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-transparent outline-none rounded-xl"
                />
              </div>

              {/* End date */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-xs font-medium text-slate-600 z-10">
                  End date
                </label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-transparent outline-none rounded-xl"
                />
              </div>

              {/* Type */}
              <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 bg-white">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-xs font-medium text-slate-600 z-10">
                  Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'fixed' | 'percentage')}
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-transparent outline-none rounded-xl cursor-pointer"
                >
                  <option value="fixed">Tk.</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>

            {/* Checkboxes matching Screenshot 2 */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>active</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPublic}
                  onChange={(e) => setFormIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>public</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formOncePerCustomer}
                  onChange={(e) => setFormOncePerCustomer(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Usable 1 time per customer</span>
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional details or coupon terms"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Save / Delete actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {editingCoupon ? (
                <button
                  type="button"
                  onClick={() => handleDeleteCoupon(editingCoupon.id)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete the coupon</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50" style={{ backgroundColor: primaryColor }}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Coupons Table matching Screenshot 1 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12">sequential</th>
                <th className="py-3.5 px-4">Coupon code</th>
                <th className="py-3.5 px-4">Discount amount</th>
                <th className="py-3.5 px-4">number of uses</th>
                <th className="py-3.5 px-4">condition</th>
                <th className="py-3.5 px-4">has been updated</th>
                <th className="py-3.5 px-4 text-right">action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <CircularProgress label="Loading coupon list..." size="md" />
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No data setup now
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon, idx) => (
                  <tr key={coupon.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 tracking-tight">{coupon.code}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{coupon.title || coupon.code}</div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-800">
                      {coupon.type === 'fixed'? `Tk. ${coupon.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `${coupon.discount}%`}
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700">
                      {coupon.usageCount} / {coupon.usageLimit || '∞'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          coupon.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {coupon.status}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          coupon.visibility === 'Public'
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-slate-300 bg-white text-slate-700'
                        }`}>
                          {coupon.visibility}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">{coupon.updatedAt || 'Recently'}</td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(coupon)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar matching Screenshot 1 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Ro</span>
            <select className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold">
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="50">50</option>
            </select>
            <span>1-{filteredCoupons.length} of {filteredCoupons.length}</span>
          </div>

          <div className="flex items-center gap-1">
            <button disabled className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed">
              Prev
            </button>
            <button className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-xs">
              1
            </button>
            <button disabled className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetCouponId}
        type="danger"
        title="Delete the coupon?"
        message="Are you sure you want to permanently delete this coupon from the database?"
        confirmText="Yes, delete it"
        cancelText="canceled"
        onConfirm={handleConfirmDeleteCoupon}
        onClose={() => setDeleteTargetCouponId(null)}
      />
    </div>
  );
}
