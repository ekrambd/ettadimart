import React, { useState, useEffect } from 'react';
import { Affiliate } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Share2, Plus, Search, Edit3, Trash2, Phone, Mail, 
  DollarSign, Check, X, Copy, ExternalLink, Award, Users, ArrowUpRight
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

export default function AffiliateManager() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Affiliate | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [commissionRate, setCommissionRate] = useState<number | ''>(5);
  const [commissionType, setCommissionType] = useState<'percentage' | 'flat'>('percentage');
  const [totalEarnings, setTotalEarnings] = useState<number | ''>(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState<number | ''>(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number | ''>(0);
  const [payoutMethod, setPayoutMethod] = useState('bKash Personal');
  const [payoutNumber, setPayoutNumber] = useState('');
  const [status, setStatus] = useState<'active' | 'pending' | 'suspended'>('active');

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

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAffiliates();
      setAffiliates(data);
    } catch (err) {
      console.error('Failed to load affiliates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, []);

  const handleOpenAdd = () => {
    setEditingAffiliate(null);
    setName('');
    setPhone('');
    setEmail('');
    setReferralCode(`REF${Math.floor(1000 + Math.random() * 9000)}`);
    setCommissionRate(5);
    setCommissionType('percentage');
    setTotalEarnings(0);
    setTotalWithdrawn(0);
    setTotalOrdersCount(0);
    setPayoutMethod('bKash Personal');
    setPayoutNumber('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (aff: Affiliate) => {
    setEditingAffiliate(aff);
    setName(aff.name);
    setPhone(aff.phone);
    setEmail(aff.email || '');
    setReferralCode(aff.referralCode);
    setCommissionRate(aff.commissionRate);
    setCommissionType(aff.commissionType || 'percentage');
    setTotalEarnings(aff.totalEarnings ?? 0);
    setTotalWithdrawn(aff.totalWithdrawn ?? 0);
    setTotalOrdersCount(aff.totalOrdersCount ?? 0);
    setPayoutMethod(aff.payoutMethod || 'bKash Personal');
    setPayoutNumber(aff.payoutNumber || '');
    setStatus(aff.status || 'active');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !referralCode.trim()) {
      setFeedback({
        isOpen: true,
        type: 'info',
        title: 'Validation Error',
        message: 'Name, phone number, and referral code are required.'
      });
      return;
    }

    const earnings = Number(totalEarnings) || 0;
    const withdrawn = Number(totalWithdrawn) || 0;
    const balance = Math.max(0, earnings - withdrawn);

    const payload: Affiliate = {
      id: editingAffiliate?.id || '',
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      referralCode: referralCode.trim().toUpperCase(),
      commissionRate: Number(commissionRate) || 0,
      commissionType,
      totalEarnings: earnings,
      totalWithdrawn: withdrawn,
      balance,
      totalOrdersCount: Number(totalOrdersCount) || 0,
      payoutMethod: payoutMethod.trim() || undefined,
      payoutNumber: payoutNumber.trim() || undefined,
      status,
      createdAt: editingAffiliate?.createdAt,
      updatedAt: new Date().toISOString()
    };

    try {
      await dbService.saveAffiliate(payload);
      await loadAffiliates();
      setIsModalOpen(false);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Affiliate Saved',
        message: `Partner "${payload.name}" saved with code "${payload.referralCode}".`
      });
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Failed to save affiliate.'
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteAffiliate(deleteTarget.id);
      await loadAffiliates();
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Partner Removed',
        message: `Affiliate "${deleteTarget.name}" deleted.`
      });
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete affiliate.'
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCopyLink = (code: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?ref=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAffiliates = affiliates.filter(a => {
    const q = searchTerm.toLowerCase();
    return a.name.toLowerCase().includes(q) ||
      a.referralCode.toLowerCase().includes(q) ||
      a.phone.includes(q);
  });

  const totalCommissions = affiliates.reduce((sum, a) => sum + (a.totalEarnings || 0), 0);
  const totalBalanceDue = affiliates.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalOrdersReferred = affiliates.reduce((sum, a) => sum + (a.totalOrdersCount || 0), 0);

  return (
    <div className="space-y-6 font-sans w-full text-slate-800 pb-16">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Affiliate & Influencer Partnerships
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage promotional referral codes, influencer commissions, conversion orders, and bKash/Nagad payout ledgers.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Affiliate</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-semibold">Total Affiliates</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{affiliates.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-semibold">Referred Orders</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{totalOrdersReferred}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-semibold">Total Earned</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            Tk. {totalCommissions.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-semibold">Pending Payout Due</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            Tk. {totalBalanceDue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search affiliates by name, phone or referral code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading affiliates...</div>
        ) : filteredAffiliates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Affiliate / Contact</th>
                  <th className="px-4 py-3.5">Referral Code & Link</th>
                  <th className="px-4 py-3.5">Commission</th>
                  <th className="px-4 py-3.5">Orders</th>
                  <th className="px-4 py-3.5">Balance / Payout</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAffiliates.map((aff) => (
                  <tr key={aff.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{aff.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3 text-indigo-500" />
                        <span>{aff.phone}</span>
                      </div>
                      {aff.email && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{aff.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded-lg border border-indigo-200">
                          {aff.referralCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(aff.referralCode, aff.id)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                          title="Copy Referral Link"
                        >
                          {copiedId === aff.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {copiedId === aff.id ? 'Copied link to clipboard!' : '?ref=' + aff.referralCode}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800 text-xs">
                        {aff.commissionRate}{aff.commissionType === 'flat' ? ' Tk/order' : '%'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold font-mono text-slate-900 text-xs">
                      {aff.totalOrdersCount || 0}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold font-mono text-amber-600 text-xs">
                        Due: Tk. {(aff.balance || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Total: Tk. {(aff.totalEarnings || 0).toLocaleString()}
                      </div>
                      {aff.payoutMethod && (
                        <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                          {aff.payoutMethod} {aff.payoutNumber ? `(${aff.payoutNumber})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        aff.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : aff.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {aff.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(aff)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(aff)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Share2 className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No affiliate partners found</p>
            <p className="text-xs text-slate-400">Click "Add New Affiliate" to create referral partnerships.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Affiliate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Share2 className="h-5 w-5 text-indigo-600" />
                <span>{editingAffiliate ? 'Edit Affiliate Partner' : 'Add New Affiliate'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Partner / Influencer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Referral Promo Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PROMO10"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@domain.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Commission Rate ({commissionType === 'percentage' ? '%' : 'Tk.'}) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Commission Type
                  </label>
                  <select
                    value={commissionType}
                    onChange={(e) => setCommissionType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="percentage">Percentage (%) per Sale</option>
                    <option value="flat">Flat Fixed (Tk.) per Order</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Earnings (Tk.)
                  </label>
                  <input
                    type="number"
                    value={totalEarnings}
                    onChange={(e) => setTotalEarnings(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Withdrawn (Tk.)
                  </label>
                  <input
                    type="number"
                    value={totalWithdrawn}
                    onChange={(e) => setTotalWithdrawn(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Orders Referred
                  </label>
                  <input
                    type="number"
                    value={totalOrdersCount}
                    onChange={(e) => setTotalOrdersCount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payout Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="bKash Personal">bKash Personal</option>
                    <option value="Nagad Personal">Nagad Personal</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank Account">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payout Number / Details
                  </label>
                  <input
                    type="text"
                    value={payoutNumber}
                    onChange={(e) => setPayoutNumber(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="active">Active (Earning enabled)</option>
                  <option value="pending">Pending Approval</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingAffiliate ? 'Save Changes' : 'Create Affiliate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Affiliate Partner"
        message={`Are you sure you want to remove affiliate "${deleteTarget?.name}"?`}
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
