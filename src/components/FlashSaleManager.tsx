import React, { useState, useEffect, useRef } from 'react';
import { FlashSaleItem, Product, ActiveTab } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Zap, Plus, Search, Eye, Edit3, Trash2, Calendar, Clock, 
  ArrowLeft, Upload, Image as ImageIcon, Check, X, Tag
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface FlashSaleManagerProps {
  products?: Product[];
  initialView?: 'list' | 'create';
  onNavigateTab?: (tab: ActiveTab) => void;
}

export default function FlashSaleManager({ products = [], initialView = 'list', onNavigateTab }: FlashSaleManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create'>(initialView);
  const [flashSales, setFlashSales] = useState<FlashSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected for Details / Deletion
  const [selectedSale, setSelectedSale] = useState<FlashSaleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlashSaleItem | null>(null);

  // Form Fields (Exact match to Screenshot 2: Create New FlashSale)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [minimumDiscount, setMinimumDiscount] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [saleStatus, setSaleStatus] = useState<boolean>(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadFlashSales = async () => {
    setLoading(true);
    try {
      const data = await dbService.getFlashSales();
      setFlashSales(data);
    } catch (err) {
      console.error('Failed to load flash sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashSales();
    const handleSync = () => loadFlashSales();
    window.addEventListener('flash-sales-updated', handleSync);
    return () => window.removeEventListener('flash-sales-updated', handleSync);
  }, []);

  const resetForm = () => {
    setName('');
    setMinimumDiscount('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setDescription('');
    setThumbnail('');
    setSaleStatus(true);
    setSelectedProductIds([]);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setViewMode('create');
  };

  const handleOpenEdit = (f: FlashSaleItem) => {
    setName(f.name);
    setMinimumDiscount(f.minimumDiscount);
    setStartDate(f.startDate);
    setStartTime(f.startTime);
    setEndDate(f.endDate);
    setEndTime(f.endTime);
    setDescription(f.description);
    setThumbnail(f.thumbnail || '');
    setSaleStatus(f.status);

    let pIds: string[] = [];
    if (f.productIds) {
      if (Array.isArray(f.productIds)) pIds = f.productIds;
      else {
        try { pIds = JSON.parse(f.productIds); } catch {}
      }
    }
    setSelectedProductIds(pIds);

    setIsEditing(true);
    setEditingId(f.id);
    setViewMode('create');
  };

  // 3:2 Thumbnail upload handler
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Image Too Large',
        message: 'Thumbnail image must be less than 2MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setThumbnail(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Toggle FlashSale status
  const handleToggleStatus = async (item: FlashSaleItem) => {
    const newStatus = !item.status;
    try {
      setFlashSales(prev => prev.map(f => f.id === item.id ? { ...f, status: newStatus } : f));
      await dbService.updateFlashSale(item.id, { status: newStatus });
    } catch (err: any) {
      setFlashSales(prev => prev.map(f => f.id === item.id ? { ...f, status: item.status } : f));
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Status Update Failed',
        message: err.message || 'Could not update status.'
      });
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFeedback({ isOpen: true, type: 'error', title: 'Missing Field', message: 'Name is required.' });
      return;
    }

    if (minimumDiscount === '' || Number(minimumDiscount) < 0) {
      setFeedback({ isOpen: true, type: 'error', title: 'Missing Field', message: 'Valid minimum discount is required.' });
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      setFeedback({ isOpen: true, type: 'error', title: 'Missing Dates', message: 'Please specify start & end date/time.' });
      return;
    }

    if (!description.trim()) {
      setFeedback({ isOpen: true, type: 'error', title: 'Missing Field', message: 'Description is required.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        minimumDiscount: Number(minimumDiscount),
        startDate,
        startTime,
        endDate,
        endTime,
        description: description.trim(),
        thumbnail: thumbnail || undefined,
        status: saleStatus,
        productIds: selectedProductIds
      };

      if (isEditing && editingId) {
        await dbService.updateFlashSale(editingId, payload);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Flash Sale Updated',
          message: `Flash Sale "${name}" has been updated.`
        });
      } else {
        await dbService.addFlashSale(payload);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Flash Sale Created',
          message: `Flash Sale "${name}" has been created.`
        });
      }

      resetForm();
      setViewMode('list');
      loadFlashSales();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save flash sale campaign.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteFlashSale(deleteTarget.id);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Campaign Deleted',
        message: `Flash Sale "${deleteTarget.name}" deleted successfully.`
      });
      loadFlashSales();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete flash sale.'
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredSales = flashSales.filter(f => {
    const q = searchTerm.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 font-sans">
      {viewMode === 'list' ? (
        /* View: All Flash Sales List (Matches Screenshot 1) */
        <div className="space-y-6">
          {/* Header Title & Create Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                Flash Sales
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage timed promotional campaigns and seasonal flash discounts.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search flash sales..."
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

          {/* Table Container (Matches Screenshot 1: SL, Thumbnail, Name, Start Date, End Date, Status, Description, Action) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5 w-16">SL</th>
                    <th className="py-3 px-5 w-28">Thumbnail</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Start Date</th>
                    <th className="py-3 px-5">End Date</th>
                    <th className="py-3 px-5 text-center w-24">Status</th>
                    <th className="py-3 px-5">Description</th>
                    <th className="py-3 px-5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSales.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 text-slate-500 font-semibold">{index + 1}</td>
                      <td className="py-4 px-5">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.name}
                            className="w-16 h-11 object-cover rounded-lg border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-16 h-11 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <span className="text-[11px] text-amber-600 font-semibold">
                          Min. {item.minimumDiscount}% Off
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-600">
                        <div>{item.startDate}</div>
                        <div className="text-[11px] text-slate-400">{item.startTime}</div>
                      </td>
                      <td className="py-4 px-5 text-slate-600">
                        <div>{item.endDate}</div>
                        <div className="text-[11px] text-slate-400">{item.endTime}</div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.status}
                            onChange={() => handleToggleStatus(item)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22c55e]"></div>
                        </label>
                      </td>
                      <td className="py-4 px-5 text-slate-600 max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSale(item)}
                            className="p-1.5 text-slate-500 hover:text-teal-600 bg-slate-100 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Empty State (Exact Match to Screenshot 1: "No Data Found") */}
                  {filteredSales.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-500 font-bold text-sm">
                        No Data Found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* View: Create / Edit FlashSale Form (Matches Screenshot 2) */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { resetForm(); setViewMode('list'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Flash Sales
            </button>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
              {isEditing ? 'Edit FlashSale' : 'Create New FlashSale'}
            </h2>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 2 Columns: Input Fields */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Name * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Minimum Discount * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Minimum Discount <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      placeholder="Enter discount"
                      value={minimumDiscount}
                      onChange={(e) => setMinimumDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Start Date * & Start Time * */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  {/* End Date * & End Time * */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        End Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        End Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Description * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter short description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right Column: Thumbnail Ratio 3:2 (600 × 400 px) Matching Screenshot 2 */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Thumbnail <span className="text-blue-600 font-semibold">Ratio 3:2 (600 × 400 px)</span> <span className="text-rose-500">*</span>
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[3/2] max-w-[320px] mx-auto bg-slate-100 hover:bg-slate-200/80 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group relative"
                  >
                    {thumbnail ? (
                      <>
                        <img src={thumbnail} alt="Flash Sale Thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold">
                          <Upload className="h-6 w-6 mb-1" />
                          Change Thumbnail
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 flex items-center justify-center gap-1 font-semibold">
                          <Upload className="h-3.5 w-3.5" />
                          Upload Thumbnail
                        </p>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />

                  <p className="text-[11px] text-slate-500 text-center">
                    Supported formats: jpg, jpeg, png, webp
                  </p>
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
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Flash Sale Details</h3>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedSale.thumbnail && (
              <img
                src={selectedSale.thumbnail}
                alt={selectedSale.name}
                className="w-full h-44 object-cover rounded-2xl border border-slate-200"
              />
            )}

            <div>
              <h4 className="text-base font-extrabold text-slate-900">{selectedSale.name}</h4>
              <p className="text-xs text-slate-500 mt-1">{selectedSale.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Min. Discount:</span>
                <span className="font-bold text-amber-600">{selectedSale.minimumDiscount}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <span className={`font-bold ${selectedSale.status ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {selectedSale.status ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Starts:</span>
                <span className="font-semibold text-slate-700">{selectedSale.startDate} {selectedSale.startTime}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Ends:</span>
                <span className="font-semibold text-slate-700">{selectedSale.endDate} {selectedSale.endTime}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const s = selectedSale;
                  setSelectedSale(null);
                  handleOpenEdit(s);
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Edit Campaign
              </button>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
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
        title="Delete Flash Sale?"
        message={`Are you sure you want to delete campaign "${deleteTarget?.name}"?`}
        confirmText="Yes, Delete Campaign"
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