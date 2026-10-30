import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, ActiveTab } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Sparkles, Plus, Search, Edit3, Trash2, Calendar, 
  ArrowLeft, Check, X, ShieldCheck, Crown, Users, Store, ArrowUpRight
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface SubscriptionManagerProps {
  initialView?: 'list' | 'create';
  onNavigateTab?: (tab: ActiveTab) => void;
}

export default function SubscriptionManager({ initialView = 'list', onNavigateTab }: SubscriptionManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create'>(initialView);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected for Details / Deletion
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null);

  // Form Fields (Exact match to Screenshot 2: Create New Plan)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [durationDays, setDurationDays] = useState<number | ''>(14);
  const [sellLimit, setSellLimit] = useState<number | ''>(5000);
  const [isPopular, setIsPopular] = useState<boolean>(false);
  const [targetAudience, setTargetAudience] = useState<'vendor' | 'customer'>('vendor');
  const [submitting, setSubmitting] = useState(false);

  // Feedback State
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

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await dbService.getSubscriptionPlans();
      setPlans(data);
    } catch (err) {
      console.error('Failed loading plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    const handleSync = () => loadPlans();
    window.addEventListener('subscriptions-updated', handleSync);
    return () => window.removeEventListener('subscriptions-updated', handleSync);
  }, []);

  const resetForm = () => {
    setName('');
    setShortDescription('');
    setDescription('');
    setPrice('');
    setDurationDays(14);
    setSellLimit(5000);
    setIsPopular(false);
    setTargetAudience('vendor');
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setViewMode('create');
  };

  const handleOpenEdit = (p: SubscriptionPlan) => {
    setName(p.name);
    setShortDescription(p.shortDescription || '');
    setDescription(p.description || '');
    setPrice(p.price);
    setDurationDays(p.durationDays);
    setSellLimit(p.sellLimit ?? '');
    setIsPopular(p.isPopular);
    setTargetAudience(p.targetAudience || 'vendor');
    setIsEditing(true);
    setEditingId(p.id);
    setViewMode('create');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFeedback({ isOpen: true, type: 'error', title: 'Missing Field', message: 'Plan Name is required.' });
      return;
    }

    if (price === '' || Number(price) < 0) {
      setFeedback({ isOpen: true, type: 'error', title: 'Invalid Price', message: 'Valid price (in ৳ BDT) is required.' });
      return;
    }

    if (durationDays === '' || Number(durationDays) <= 0) {
      setFeedback({ isOpen: true, type: 'error', title: 'Invalid Duration', message: 'Duration in days is required.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
        price: Number(price),
        durationDays: Number(durationDays),
        sellLimit: sellLimit !== '' ? Number(sellLimit) : undefined,
        isPopular,
        targetAudience,
        status: true
      };

      if (isEditing && editingId) {
        await dbService.updateSubscriptionPlan(editingId, payload);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Plan Updated',
          message: `Subscription plan "${name}" has been updated.`
        });
      } else {
        await dbService.addSubscriptionPlan(payload);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Plan Created',
          message: `Subscription plan "${name}" created successfully.`
        });
      }

      resetForm();
      setViewMode('list');
      loadPlans();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save subscription plan.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteSubscriptionPlan(deleteTarget.id);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Plan Deleted',
        message: `Plan "${deleteTarget.name}" deleted successfully.`
      });
      loadPlans();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete plan.'
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredPlans = plans.filter(p => {
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.shortDescription || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 font-sans">
      {viewMode === 'list' ? (
        /* List View: Matching Screenshot 1 with beautiful card styling */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />
                Subscription Plans & Memberships
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Plans for multi-vendor packages and customer VIP memberships with localized ৳ BDT pricing.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Green Create Button Matching Screenshot 1 */}
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

          {/* Subscription Cards Grid (Exact Design Matching Screenshot 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => {
              const durationWeeks = Math.round(plan.durationDays / 7) || 1;
              return (
                <div
                  key={plan.id}
                  className="relative rounded-3xl p-6 text-white shadow-xl overflow-hidden border border-slate-700/50 flex flex-col justify-between"
                  style={{
                    background: 'linear-gradient(145deg, #180512 0%, #4a0429 55%, #880e4f 100%)'
                  }}
                >
                  {/* Top Bar: Plan Name & Most Popular Badge */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-extrabold capitalize tracking-wide text-white">
                        {plan.name}
                      </h3>
                      {plan.isPopular && (
                        <span className="px-3 py-1 bg-amber-500/90 text-amber-950 font-extrabold text-[11px] rounded-full shadow-xs uppercase tracking-wider">
                          Most Popular
                        </span>
                      )}
                    </div>

                    {/* Price and Duration Text */}
                    <div className="flex items-baseline gap-2 mt-4">
                      <span className="text-4xl font-black tracking-tight text-white">
                        ৳{plan.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-white/70 font-semibold">
                        {plan.durationDays >= 30 
                          ? `${Math.round(plan.durationDays / 30)} month(s)` 
                          : `${durationWeeks} weeks`}
                      </span>
                    </div>

                    {/* Meta Stats Boxes: Sale Limit & Duration */}
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <div className="bg-black/30 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                        <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider block">
                          Sale limit
                        </span>
                        <span className="text-base font-extrabold text-white mt-0.5 block">
                          {plan.sellLimit ? plan.sellLimit.toLocaleString() : 'Unlimited'}
                        </span>
                      </div>

                      <div className="bg-black/30 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                        <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider block">
                          Duration
                        </span>
                        <span className="text-base font-extrabold text-white mt-0.5 block">
                          {plan.durationDays} days
                        </span>
                      </div>
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-white/80 mt-5 line-clamp-3 leading-relaxed">
                      {plan.shortDescription || plan.description || 'Premium subscription benefits for sellers and members.'}
                    </p>
                  </div>

                  {/* Bottom Buttons: Edit (Blue) & Delete (Red) Matching Screenshot 1 */}
                  <div className="grid grid-cols-2 gap-3 mt-7 pt-4 border-t border-white/15">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(plan)}
                      className="w-full py-2.5 bg-[#00a8ff] hover:bg-[#0097e6] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(plan)}
                      className="w-full py-2.5 bg-[#e84118] hover:bg-[#c23616] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredPlans.length === 0 && !loading && (
              <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Crown className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-800">No Subscription Plans Found</h4>
                <p className="text-xs text-slate-500 mt-1">Create vendor packages or customer loyalty memberships to get started.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Create / Edit Form (Exact Match to Screenshot 2: Create New Plan) */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { resetForm(); setViewMode('list'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Plans
            </button>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />
              {isEditing ? 'Edit Plan' : 'Create New Plan'}
            </h2>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name * */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold / VIP Member / Diamond Vendor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter short description"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed plan features, perks and benefits"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Price * in ৳ (BDT friendly) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Price (৳ BDT) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Duration (days) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Duration (days) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="14"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Sell Limit */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Sell Limit
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="5000"
                  value={sellLimit}
                  onChange={(e) => setSellLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Target Audience (Vendor Package vs Customer Loyalty Membership) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Plan Category (Bangladesh Friendly)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                    targetAudience === 'vendor' ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold' : 'bg-white border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="targetAudience"
                      checked={targetAudience === 'vendor'}
                      onChange={() => setTargetAudience('vendor')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div className="text-xs">
                      <div>Vendor Package</div>
                      <div className="text-[10px] text-slate-500 font-normal">Marketplace seller quotas</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                    targetAudience === 'customer' ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold' : 'bg-white border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="targetAudience"
                      checked={targetAudience === 'customer'}
                      onChange={() => setTargetAudience('customer')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <div>Customer Membership</div>
                      <div className="text-[10px] text-slate-500 font-normal">VIP free delivery & discounts</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Is Popular Toggle Switch (Green Toggle matching Screenshot 2) */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800">Is Popular</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22c55e]"></div>
                </label>
              </div>

              {/* Buttons: Cancel & Submit matching Screenshot 2 */}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Plan?"
        message={`Are you sure you want to delete subscription plan "${deleteTarget?.name}"?`}
        confirmText="Yes, Delete Plan"
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