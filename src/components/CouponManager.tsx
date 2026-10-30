import React, { useState, useEffect } from 'react';
import { Coupon, ActiveTab } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Tag, Plus, Search, Eye, Edit3, Trash2, Calendar, Clock, 
  ArrowLeft, Check, X, Building, Percent, DollarSign, Store
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface CouponManagerProps {
  initialView?: 'list' | 'create';
  onNavigateTab?: (tab: ActiveTab) => void;
}

export default function CouponManager({ initialView = 'list', onNavigateTab }: CouponManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create'>(initialView);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected for Details / Deletion
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  // Form Fields (Exact match to Screenshot 2: Add New Promo Code)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shopId, setShopId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'Amount' | 'Percentage'>('Amount');
  const [discount, setDiscount] = useState<number | ''>('');
  const [minimumOrderAmount, setMinimumOrderAmount] = useState<number | ''>('');
  const [limitForSingleUser, setLimitForSingleUser] = useState<number | ''>('');
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const [expiredTime, setExpiredTime] = useState('');
  const [couponStatus, setCouponStatus] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Global Feedback
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

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await dbService.getCoupons();
      setCoupons(data);
    } catch (err) {
      console.error('Failed loading coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
    const handleSync = () => loadCoupons();
    window.addEventListener('ecom-coupons-updated', handleSync);
    return () => window.removeEventListener('ecom-coupons-updated', handleSync);
  }, []);

  const resetForm = () => {
    setShopId('');
    setCouponCode('');
    setDiscountType('Amount');
    setDiscount('');
    setMinimumOrderAmount('');
    setLimitForSingleUser('');
    setMaximumDiscountAmount('');
    setStartDate('');
    setStartTime('');
    setExpiredDate('');
    setExpiredTime('');
    setCouponStatus(true);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setViewMode('create');
  };

  const handleOpenEdit = (c: Coupon) => {
    setShopId(c.shopId || '');
    setCouponCode(c.code);
    setDiscountType(c.type === 'percentage' ? 'Percentage' : 'Amount');
    setDiscount(c.discount);
    setMinimumOrderAmount(c.minimumSpent ?? c.minSpent ?? '');
    setLimitForSingleUser(c.limitPerUser ?? c.usageLimit ?? '');
    setMaximumDiscountAmount(c.maxDiscount ?? '');
    setStartDate(c.startDate || '');
    setStartTime(c.startTime || '');
    setExpiredDate(c.expiredDate || (c.endDate ? c.endDate.split('T')[0] : ''));
    setExpiredTime(c.expiredTime || '');
    setCouponStatus(c.status === 'Active');
    setIsEditing(true);
    setEditingId(c.id);
    setViewMode('create');
  };

  // Toggle Coupon Active / Inactive Status
  const handleToggleStatus = async (coupon: Coupon) => {
    const isCurrentlyActive = coupon.status === 'Active';
    const newStatus = isCurrentlyActive ? 'Inactive' : 'Active';
    try {
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, status: newStatus } : c));
      await dbService.updateCoupon({
        ...coupon,
        status: newStatus
      });
    } catch (err: any) {
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, status: coupon.status } : c));
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Status Update Failed',
        message: err.message || 'Could not update promo code status.'
      });
    }
  };

  // Submit Create / Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) {
      setFeedback({ isOpen: true, type: 'error', title: 'Missing Field', message: 'Coupon Code is required.' });
      return;
    }

    if (discount === '' || Number(discount) <= 0) {
      setFeedback({ isOpen: true, type: 'error', title: 'Invalid Discount', message: 'Please specify a valid discount.' });
      return;
    }

    if (minimumOrderAmount === '' || Number(minimumOrderAmount) < 0) {
      setFeedback({ isOpen: true, type: 'error', title: 'Missing Field', message: 'Minimum Order Amount is required.' });
      return;
    }

    if (!startDate || !startTime || !expiredDate || !expiredTime) {
      setFeedback({ isOpen: true, type: 'error', title: 'Missing Dates', message: 'Start & Expired dates and times are required.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        code: cleanCode,
        title: cleanCode,
        discount: Number(discount),
        discountType: discountType.toLowerCase(),
        type: discountType === 'Percentage' ? 'percentage' : 'fixed',
        minimumOrderAmount: Number(minimumOrderAmount),
        minimumSpent: Number(minimumOrderAmount),
        maximumDiscountAmount: maximumDiscountAmount !== '' ? Number(maximumDiscountAmount) : undefined,
        maxDiscount: maximumDiscountAmount !== '' ? Number(maximumDiscountAmount) : undefined,
        limitForSingleUser: limitForSingleUser !== '' ? Number(limitForSingleUser) : 1,
        limitPerUser: limitForSingleUser !== '' ? Number(limitForSingleUser) : 1,
        startDate,
        startTime,
        expiredDate,
        expiredTime,
        endDate: expiredDate,
        shopId: shopId.trim() || undefined,
        status: couponStatus ? 'Active' : 'Inactive'
      };

      if (isEditing && editingId) {
        await dbService.updateCoupon({
          ...payload,
          id: editingId,
          usageCount: coupons.find(c => c.id === editingId)?.usageCount || 0,
          updatedAt: new Date().toISOString()
        });
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Promo Code Updated',
          message: `Promo code "${cleanCode}" has been updated.`
        });
      } else {
        await dbService.addCoupon({
          ...payload,
          id: `cpn-${Date.now()}`,
          usageCount: 0,
          visibility: 'Public',
          updatedAt: new Date().toISOString()
        });
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Promo Code Created',
          message: `Promo code "${cleanCode}" created successfully.`
        });
      }

      resetForm();
      setViewMode('list');
      loadCoupons();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save promo code. Please verify code uniqueness.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteCoupon(deleteTarget.id);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Promo Code Deleted',
        message: `Promo code "${deleteTarget.code}" has been removed.`
      });
      loadCoupons();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete promo code.'
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredCoupons = coupons.filter(c => {
    const q = searchTerm.toLowerCase();
    return c.code.toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 font-sans">
      {viewMode === 'list' ? (
        /* List View (Exact Match to Screenshot 1: Promo Codes) */
        <div className="space-y-6">
          {/* Header Title & Create Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Tag className="h-5 w-5 text-teal-600" />
                Promo Codes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage checkout discount codes, fixed allowances, and percentages.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search promo codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Green Create New Button (Matches Screenshot 1) */}
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                Create New
              </button>
            </div>
          </div>

          {/* Table Container (Matches Screenshot 1 Columns: Code, Discount, Min Amount, Started At, Expired At, Status, Action) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5">Code</th>
                    <th className="py-3 px-5">Discount</th>
                    <th className="py-3 px-5">Min Amount</th>
                    <th className="py-3 px-5">Started At</th>
                    <th className="py-3 px-5">Expired At</th>
                    <th className="py-3 px-5 text-center w-28">Status</th>
                    <th className="py-3 px-5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCoupons.map((c) => {
                    const isActive = c.status === 'Active';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Code */}
                        <td className="py-4 px-5 font-mono font-bold text-slate-900 text-sm">
                          <span className="px-2.5 py-1 bg-teal-50 text-teal-800 rounded-lg border border-teal-200">
                            {c.code}
                          </span>
                        </td>

                        {/* Discount */}
                        <td className="py-4 px-5 font-bold text-emerald-700">
                          {c.type === 'percentage' ? `${c.discount}%` : `৳${c.discount.toLocaleString()}`}
                          {c.maxDiscount ? (
                            <span className="text-[11px] text-slate-400 font-normal block">
                              Max: ৳{c.maxDiscount}
                            </span>
                          ) : null}
                        </td>

                        {/* Min Amount */}
                        <td className="py-4 px-5 text-slate-800 font-semibold">
                          ৳{(c.minimumSpent ?? c.minSpent ?? 0).toLocaleString()}
                        </td>

                        {/* Started At */}
                        <td className="py-4 px-5 text-slate-600">
                          {c.startDate ? (
                            <>
                              <div>{c.startDate}</div>
                              {c.startTime && <div className="text-[11px] text-slate-400">{c.startTime}</div>}
                            </>
                          ) : (
                            <span className="text-slate-400">Immediate</span>
                          )}
                        </td>

                        {/* Expired At */}
                        <td className="py-4 px-5 text-slate-600">
                          {c.expiredDate ? (
                            <>
                              <div>{c.expiredDate}</div>
                              {c.expiredTime && <div className="text-[11px] text-slate-400">{c.expiredTime}</div>}
                            </>
                          ) : c.endDate ? (
                            new Date(c.endDate).toLocaleDateString()
                          ) : (
                            <span className="text-slate-400">Never</span>
                          )}
                        </td>

                        {/* Status (Green Toggle Switch matching reference) */}
                        <td className="py-4 px-5 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleToggleStatus(c)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22c55e]"></div>
                          </label>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCoupon(c)}
                              className="p-1.5 text-slate-500 hover:text-teal-600 bg-slate-100 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCoupons.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-500 font-bold text-sm">
                        No Promo Codes Found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Create / Edit Form (Exact Match to Screenshot 2: Add New Promo Code) */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { resetForm(); setViewMode('list'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Promo Codes
            </button>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-teal-600" />
              {isEditing ? 'Edit Promo Code' : 'Add New Promo Code'}
            </h2>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Select shops */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Select shops
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Select shops (Leave blank for all shops / global)"
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Coupon Code * & Discount Type * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Coupon Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Coupon code (e.g. SAVE20)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Discount Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Amount">Amount (Fixed ৳)</option>
                    <option value="Percentage">Percentage (%)</option>
                  </select>
                </div>
              </div>

              {/* Discount * & Minimum Order Amount * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Discount <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Discount"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Minimum Order Amount <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Minimum Order Amount"
                    value={minimumOrderAmount}
                    onChange={(e) => setMinimumOrderAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Limit For Single User & Maximum Discount Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Limit For Single User
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="exm: 5"
                    value={limitForSingleUser}
                    onChange={(e) => setLimitForSingleUser(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Maximum Discount Amount
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="exm: ৳300"
                    value={maximumDiscountAmount}
                    onChange={(e) => setMaximumDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Start Date * & Start Time * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Expired Date * & Expired Time * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Expired Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expiredDate}
                    onChange={(e) => setExpiredDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Expired Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={expiredTime}
                    onChange={(e) => setExpiredTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons (Cancel & Green Submit Button matching Screenshot 2) */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { resetForm(); setViewMode('list'); }}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedCoupon && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Promo Code Details</h3>
              <button
                type="button"
                onClick={() => setSelectedCoupon(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block">Coupon Code</span>
                <span className="text-xl font-mono font-extrabold text-teal-950">{selectedCoupon.code}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block">Discount</span>
                <span className="text-xl font-extrabold text-teal-950">
                  {selectedCoupon.type === 'percentage' ? `${selectedCoupon.discount}%` : `৳${selectedCoupon.discount}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Min. Order Amount:</span>
                <span className="font-bold text-slate-800">৳{(selectedCoupon.minimumSpent ?? selectedCoupon.minSpent ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Max. Discount:</span>
                <span className="font-bold text-slate-800">
                  {selectedCoupon.maxDiscount ? `৳${selectedCoupon.maxDiscount.toLocaleString()}` : 'No cap'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Per User Limit:</span>
                <span className="font-bold text-slate-800">{selectedCoupon.limitPerUser ?? selectedCoupon.usageLimit ?? 1} time(s)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Used:</span>
                <span className="font-bold text-emerald-700">{selectedCoupon.usageCount ?? 0} time(s)</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Validity Period:</span>
                <span className="font-medium text-slate-700">
                  {selectedCoupon.startDate || 'Immediate'} → {selectedCoupon.expiredDate || (selectedCoupon.endDate ? selectedCoupon.endDate.split('T')[0] : 'Never')}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const c = selectedCoupon;
                  setSelectedCoupon(null);
                  handleOpenEdit(c);
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Edit Code
              </button>
              <button
                type="button"
                onClick={() => setSelectedCoupon(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Promo Code?"
        message={`Are you sure you want to delete promo code "${deleteTarget?.code}"?`}
        confirmText="Yes, Delete Code"
        confirmVariant="danger"
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Global Feedback Dialog */}
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