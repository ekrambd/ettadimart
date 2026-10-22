import React, { useState, useEffect } from 'react';
import { EcomSettings, PointRewardItem, PointFaqItem } from '../types';
import { dbService } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { Coins, Check, Save, Plus, Trash2, Edit, HelpCircle, Award, RefreshCw, X } from 'lucide-react';
import { ConfirmDialog } from './ui/ConfirmDialog';

export default function PointsManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    pointsEnabled: false,
    pointsEarnRate: 10,
    pointsRewards: [],
    pointsFaqs: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'rewards' | 'faq'>('config');

  // Reward Form State
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingReward, setEditingReward] = useState<PointRewardItem | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardPointsCost, setRewardPointsCost] = useState<number | ''>('');
  const [rewardType, setRewardType] = useState<'shipping_discount' | 'flat_discount'>('shipping_discount');
  const [rewardValue, setRewardValue] = useState<number | ''>('');

  // FAQ Form State
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<PointFaqItem | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');

  // Default FAQs configuration
  const defaultFaqs: PointFaqItem[] = [
    {
      id: 'faq-1',
      question: 'How will points be considered eligible?',
      answer: 'You can earn points by making successful orders from our website.'
    },
    {
      id: 'faq-2',
      question: 'How do I earn points?',
      answer: 'Delivery charges Except for 10Fixed at Rs AmountPoints will be earned which will be added to your account।'
    },
    {
      id: 'faq-3',
      question: 'When will the points be available after ordering?',
      answer: 'Delivered Points earned will be added to your account immediately upon completion।'
    },
    {
      id: 'faq-4',
      question: 'How do I use my earned points?',
      answer: 'By using your earned points you can collect various rewards and discount vouchers which can be used on subsequent orders.'
    }
  ];

  const defaultRewards: PointRewardItem[] = [
    { id: 'rew-1', title: '10 TK Shipping Discount', pointsCost: 100, rewardType: 'shipping_discount', value: 10 },
    { id: 'rew-2', title: '20 TK Shipping Discount', pointsCost: 200, rewardType: 'shipping_discount', value: 20 },
    { id: 'rew-3', title: '30 TK Shipping Discount', pointsCost: 300, rewardType: 'shipping_discount', value: 30 },
    { id: 'rew-4', title: '40 TK Shipping Discount', pointsCost: 400, rewardType: 'shipping_discount', value: 40 },
    { id: 'rew-5', title: '30 Tk Discount', pointsCost: 300, rewardType: 'flat_discount', value: 30 },
    { id: 'rew-6', title: '40 Tk Discount', pointsCost: 400, rewardType: 'flat_discount', value: 40 }
  ];

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await dbService.getEcomSettings();
        const initialFaqs = data.pointsFaqs && data.pointsFaqs.length > 0 ? data.pointsFaqs : defaultFaqs;
        const initialRewards = data.pointsRewards && data.pointsRewards.length > 0 ? data.pointsRewards : defaultRewards;
        setSettings({
          ...data,
          pointsEnabled: data.pointsEnabled ?? false,
          pointsEarnRate: data.pointsEarnRate ?? 10,
          pointsRewards: initialRewards,
          pointsFaqs: initialFaqs
        });
      } catch (err) {
        console.error('Failed to load points settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await dbService.saveEcomSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving points settings:', err);
      alert('There was a problem saving point settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePoints = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      pointsEnabled: checked
    }));
  };

  const handleEarnRateChange = (val: number) => {
    setSettings(prev => ({
      ...prev,
      pointsEarnRate: val
    }));
  };

  // Reward Handlers
  const handleAddOrEditReward = () => {
    if (!rewardTitle.trim() || !rewardPointsCost || !rewardValue) {
      alert('Fill all the fields correctly');
      return;
    }

    if (editingReward) {
      // Edit Mode
      setSettings(prev => {
        const updatedRewards = (prev.pointsRewards || []).map(item => 
          item.id === editingReward.id 
            ? { ...item, title: rewardTitle.trim(), pointsCost: Number(rewardPointsCost), rewardType, value: Number(rewardValue) }
            : item
        );
        const updated = { ...prev, pointsRewards: updatedRewards };
        dbService.saveEcomSettings(updated).catch(err => console.error(err));
        return updated;
      });
    } else {
      // Add Mode
      const newItem: PointRewardItem = {
        id: `REW-${Date.now()}`,
        title: rewardTitle.trim(),
        pointsCost: Number(rewardPointsCost),
        rewardType,
        value: Number(rewardValue)
      };

      setSettings(prev => {
        const updated = {
          ...prev,
          pointsRewards: [...(prev.pointsRewards || []), newItem]
        };
        dbService.saveEcomSettings(updated).catch(err => console.error(err));
        return updated;
      });
    }

    // Reset Form
    setRewardTitle('');
    setRewardPointsCost('');
    setRewardValue('');
    setEditingReward(null);
    setShowRewardForm(false);
  };

  const handleEditRewardClick = (item: PointRewardItem) => {
    setEditingReward(item);
    setRewardTitle(item.title);
    setRewardPointsCost(item.pointsCost);
    setRewardType(item.rewardType);
    setRewardValue(item.value);
    setShowRewardForm(true);
  };

  const [deleteTargetRewardId, setDeleteTargetRewardId] = useState<string | null>(null);
  const [deleteTargetFaqId, setDeleteTargetFaqId] = useState<string | null>(null);

  const handleDeleteReward = (id: string) => {
    setDeleteTargetRewardId(id);
  };

  const handleConfirmDeleteReward = () => {
    if (!deleteTargetRewardId) return;
    setSettings(prev => {
      const updated = {
        ...prev,
        pointsRewards: (prev.pointsRewards || []).filter(item => item.id !== deleteTargetRewardId)
      };
      dbService.saveEcomSettings(updated).catch(err => console.error(err));
      return updated;
    });
    setDeleteTargetRewardId(null);
  };

  // FAQ Handlers
  const handleAddOrEditFaq = () => {
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      alert('Fill all the fields correctly');
      return;
    }

    if (editingFaq) {
      // Edit FAQ
      setSettings(prev => {
        const updatedFaqs = (prev.pointsFaqs || []).map(item => 
          item.id === editingFaq.id 
            ? { ...item, question: faqQuestion.trim(), answer: faqAnswer.trim() }
            : item
        );
        const updated = { ...prev, pointsFaqs: updatedFaqs };
        dbService.saveEcomSettings(updated).catch(err => console.error(err));
        return updated;
      });
    } else {
      // Add FAQ
      const newItem: PointFaqItem = {
        id: `FAQ-${Date.now()}`,
        question: faqQuestion.trim(),
        answer: faqAnswer.trim()
      };

      setSettings(prev => {
        const updated = {
          ...prev,
          pointsFaqs: [...(prev.pointsFaqs || []), newItem]
        };
        dbService.saveEcomSettings(updated).catch(err => console.error(err));
        return updated;
      });
    }

    setFaqQuestion('');
    setFaqAnswer('');
    setEditingFaq(null);
    setShowFaqForm(false);
  };

  const handleEditFaqClick = (faq: PointFaqItem) => {
    setEditingFaq(faq);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setShowFaqForm(true);
  };

  const handleDeleteFaq = (id: string) => {
    setDeleteTargetFaqId(id);
  };

  const handleConfirmDeleteFaq = () => {
    if (!deleteTargetFaqId) return;
    setSettings(prev => {
      const updated = {
        ...prev,
        pointsFaqs: (prev.pointsFaqs || []).filter(item => item.id !== deleteTargetFaqId)
      };
      dbService.saveEcomSettings(updated).catch(err => console.error(err));
      return updated;
    });
    setDeleteTargetFaqId(null);
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading point settings..." size="md" />
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto text-xs">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-[6px] border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-[6px]">
              <Coins className="h-5 w-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              The point isTNs
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            customerPay points on purchases And Manage reward collection
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[6px] text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          ) : saveSuccess ? (
            <>
              <Check className="h-4 w-4 mr-1.5 text-emerald-300" />
              Saved successfully!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              heTSave all
            </>
          )}
        </button>
      </div>

      {/* Tab Navigation Menu */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-2.5 rounded-[6px] border shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('config')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'config'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Points launched and rated
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('rewards')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'rewards'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Rewards list (Active Rewards)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('faq')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'faq'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Questions and answers (FAQ)
        </button>
      </div>

      {/* Tab-wise Views rendering */}
      {activeSubTab === 'config' && (
        <div className="bg-white p-5 rounded-[6px] border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-200">
          <h3 className="font-bold text-slate-900 text-sm pb-2.5 border-b border-slate-100 flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-indigo-500" />
            The point isTNs
          </h3>
          
          <div className="space-y-4 max-w-md">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="points_enabled"
                checked={settings.pointsEnabled}
                onChange={(e) => handleTogglePoints(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="points_enabled" className="font-bold text-slate-800 cursor-pointer">
                Introduce point reward system
              </label>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">per point 100 Tk. in shopping *</label>
              <input
                type="number"
                placeholder="10"
                disabled={!settings.pointsEnabled}
                value={settings.pointsEarnRate}
                onChange={(e) => handleEarnRateChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[6px] font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                such as: 10 If you set 1000 rupees successful Customer in order 10Earn 0 points।
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'rewards' && (
        <div className="bg-white p-5 rounded-[6px] border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Award className="h-4 w-4 text-indigo-500" />
              Rewards list (Active Rewards)
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingReward(null);
                setRewardTitle('');
                setRewardPointsCost('');
                setRewardValue('');
                setShowRewardForm(!showRewardForm);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-[6px] font-bold cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New rewards</span>
            </button>
          </div>

          {/* Add/Edit Reward Form */}
          {showRewardForm && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-[6px] space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 text-[11px]">
                  {editingReward ? 'Edit Reward' : 'Add new rewards'}
                </h4>
                <button type="button" onClick={() => setShowRewardForm(false)}>
                  <X className="h-4 w-4 text-slate-450 hover:text-slate-650" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Title *</label>
                  <input
                    type="text"
                    placeholder="Eg: Rs.30 shipping discount"
                    value={rewardTitle}
                    onChange={(e) => setRewardTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Points Cost *</label>
                  <input
                    type="number"
                    placeholder="For example: 300"
                    value={rewardPointsCost}
                    onChange={(e) => setRewardPointsCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Type *</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="shipping_discount">Shipping Discount</option>
                    <option value="flat_discount">Flat Discount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Tk. *</label>
                  <input
                    type="number"
                    placeholder="For example: 30"
                    value={rewardValue}
                    onChange={(e) => setRewardValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRewardForm(false);
                    setEditingReward(null);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-[6px] font-bold cursor-pointer"
                >
                  canceled
                </button>
                <button
                  type="button"
                  onClick={handleAddOrEditReward}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[6px] font-bold cursor-pointer shadow-xs"
                >
                  {editingReward ? 'Update' : 'add'}
                </button>
              </div>
            </div>
          )}

          {/* Rewards List Table */}
          {settings.pointsRewards && settings.pointsRewards.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-[6px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-extrabold uppercase">
                    <th className="p-3">Title</th>
                    <th className="p-3">Points Cost</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Value BDT</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {settings.pointsRewards.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800">{item.title}</td>
                      <td className="p-3 text-indigo-650 font-extrabold">{item.pointsCost} Pts</td>
                      <td className="p-3">{item.rewardType === 'shipping_discount' ? 'shippingdiscount' : 'flatdiscount' }</td>
                      <td className="p-3 font-bold text-rose-600">Tk.{item.value}</td>
                      <td className="p-3 text-right flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditRewardClick(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[6px] cursor-pointer"
                          title="editing"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReward(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-[6px] cursor-pointer"
                          title="delete"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-6 text-slate-400 font-medium">No active rewards have been added.</p>
          )}
        </div>
      )}

      {activeSubTab === 'faq' && (
        <div className="bg-white p-5 rounded-[6px] border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-indigo-500" />
              Points related questions and answers (FAQ)
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingFaq(null);
                setFaqQuestion('');
                setFaqAnswer('');
                setShowFaqForm(!showFaqForm);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-[6px] font-bold cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>new question</span>
            </button>
          </div>

          {/* Add/Edit FAQ Form */}
          {showFaqForm && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-[6px] space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 text-[11px]">
                  {editingFaq ? 'Edit FAQ' : 'Add new questions and answers'}
                </h4>
                <button type="button" onClick={() => setShowFaqForm(false)}>
                  <X className="h-4 w-4 text-slate-450 hover:text-slate-650" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Question *</label>
                  <input
                    type="text"
                    placeholder="For example: How do I qualify for points?"
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Answer *</label>
                  <textarea
                    rows={3}
                    placeholder="Eg: You will get points after order delivery from our website..."
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowFaqForm(false);
                    setEditingFaq(null);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-[6px] font-bold cursor-pointer"
                >
                  canceled
                </button>
                <button
                  type="button"
                  onClick={handleAddOrEditFaq}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[6px] font-bold cursor-pointer shadow-xs"
                >
                  {editingFaq ? 'Update' : 'add'}
                </button>
              </div>
            </div>
          )}

          {/* FAQs List with Edit & Delete */}
          {settings.pointsFaqs && settings.pointsFaqs.length > 0 ? (
            <div className="space-y-3">
              {settings.pointsFaqs.map((faq) => (
                <div key={faq.id} className="p-4 bg-slate-50 border border-slate-200 rounded-[6px] space-y-2 relative group hover:bg-slate-100/50 transition-colors">
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => handleEditFaqClick(faq)}
                      className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-[6px] transition-colors cursor-pointer"
                      title="editing"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-[6px] transition-colors cursor-pointer"
                      title="delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h5 className="font-extrabold text-slate-900 flex items-start gap-1.5 pr-16">
                    <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{faq.question}</span>
                  </h5>
                  <p className="text-slate-650 leading-relaxed pl-5.5">{faq.answer}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-slate-400 font-medium">No FAQ questions have been added.</p>
          )}
        </div>
      )}

      {/* Confirm Delete Reward Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetRewardId}
        type="danger"
        title="Delete the reward?"
        message="Are you sure you want to permanently delete this reward?"
        confirmText="Yes, delete it"
        cancelText="canceled"
        onConfirm={handleConfirmDeleteReward}
        onClose={() => setDeleteTargetRewardId(null)}
      />

      {/* Confirm Delete FAQ Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetFaqId}
        type="danger"
        title="Delete the FAQ question?"
        message="FAQ questionT want to delete?"
        confirmText="Yes, delete it"
        cancelText="canceled"
        onConfirm={handleConfirmDeleteFaq}
        onClose={() => setDeleteTargetFaqId(null)}
      />

    </div>
  );
}
