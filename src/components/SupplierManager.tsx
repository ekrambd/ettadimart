import React, { useState, useEffect, useRef } from 'react';
import { Supplier, ActiveTab } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Truck, Plus, Search, Eye, Edit3, Trash2, Phone, Mail, MapPin, 
  DollarSign, Check, X, Building, Upload, Image as ImageIcon,
  MoreVertical, SlidersHorizontal, Columns, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface SupplierManagerProps {
  initialView?: 'list' | 'create';
  onNavigateTab?: (tab: ActiveTab) => void;
}

export default function SupplierManager({ initialView = 'list', onNavigateTab }: SupplierManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create'>(initialView);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Modal / Dropdown / Action states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  // Form Fields (Matches Screenshot 2: Add Supplier)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [suppliedProducts, setSuppliedProducts] = useState('');
  const [notes, setNotes] = useState('');
  const [purchasesCount, setPurchasesCount] = useState<number | ''>(0);
  const [totalPurchasedAmount, setTotalPurchasedAmount] = useState<number | ''>(0);
  const [balance, setBalance] = useState<number | ''>(0);
  const [supplierStatus, setSupplierStatus] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback Dialog
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

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await dbService.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    const handleSync = () => loadSuppliers();
    window.addEventListener('suppliers-updated', handleSync);
    return () => window.removeEventListener('suppliers-updated', handleSync);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setProfilePhoto('');
    setCompanyName('');
    setSuppliedProducts('');
    setNotes('');
    setPurchasesCount(0);
    setTotalPurchasedAmount(0);
    setBalance(0);
    setSupplierStatus(true);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setViewMode('create');
  };

  const handleOpenEdit = (s: Supplier) => {
    setName(s.name || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    setProfilePhoto(s.profilePhoto || '');
    setCompanyName(s.companyName || '');
    setSuppliedProducts(s.suppliedProducts || '');
    setNotes(s.notes || '');
    setPurchasesCount(s.purchasesCount || 0);
    setTotalPurchasedAmount(s.totalPurchasedAmount || 0);
    setBalance(s.balance || 0);
    setSupplierStatus(typeof s.status === 'boolean' ? s.status : s.status === 'active');
    setIsEditing(true);
    setEditingId(s.id);
    setViewMode('create');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Image Too Large',
        message: 'Supplier profile photo must be less than 2MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setProfilePhoto(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    const currentStatus = typeof supplier.status === 'boolean' ? supplier.status : supplier.status === 'active';
    const newStatus = !currentStatus;
    try {
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, status: newStatus } : s));
      await dbService.saveSupplier({
        ...supplier,
        status: newStatus
      });
    } catch (err: any) {
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, status: currentStatus } : s));
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Status Update Failed',
        message: err.message || 'Could not update supplier status.'
      });
    }
  };

  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Full Name is required.'
      });
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Invalid Phone Number',
        message: 'Please provide a valid phone number.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Supplier = {
        id: isEditing && editingId ? editingId : `supp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        profilePhoto: profilePhoto || undefined,
        address: address.trim() || undefined,
        companyName: companyName.trim() || undefined,
        suppliedProducts: suppliedProducts.trim() || undefined,
        notes: notes.trim() || undefined,
        purchasesCount: Number(purchasesCount) || 0,
        totalPurchasedAmount: Number(totalPurchasedAmount) || 0,
        balance: Number(balance) || (Number(totalPurchasedAmount) || 0),
        status: supplierStatus
      };

      await dbService.saveSupplier(payload);

      setFeedback({
        isOpen: true,
        type: 'success',
        title: isEditing ? 'Supplier Updated' : 'Supplier Added',
        message: `Supplier "${name}" has been successfully ${isEditing ? 'updated' : 'created'}.`
      });

      resetForm();
      setViewMode('list');
      loadSuppliers();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save supplier. Please verify inputs.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteSupplier(deleteTarget.id);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Supplier Removed',
        message: `Supplier "${deleteTarget.name}" has been deleted.`
      });
      loadSuppliers();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete supplier.'
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  // Metrics
  const totalCount = suppliers.length;
  const activeCount = suppliers.filter(s => typeof s.status === 'boolean' ? s.status : s.status === 'active').length;
  const pausedCount = totalCount - activeCount;
  const totalOwed = suppliers.reduce((sum, s) => sum + (s.balance || s.totalPurchasedAmount || 0), 0);

  // Filtered List
  const filteredSuppliers = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(searchTerm) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.companyName || '').toLowerCase().includes(q);

    const isAct = typeof s.status === 'boolean' ? s.status : s.status === 'active';
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && isAct) ||
      (statusFilter === 'paused' && !isAct);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      {viewMode === 'list' ? (
        <div className="space-y-6">
          {/* Top Title & Subtitle Matching Screenshot 1 */}
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Suppliers</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Who this shop buys from, and what is owed to them.
            </p>
          </div>

          {/* 4 Overview Metric Cards Matching Reference Screenshot 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Card 1: Suppliers */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{totalCount}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Suppliers</p>
              </div>
            </div>

            {/* Card 2: Active */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{activeCount}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Active</p>
              </div>
            </div>

            {/* Card 3: Paused */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <span className="font-extrabold text-lg">⏸</span>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{pausedCount}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Paused</p>
              </div>
            </div>

            {/* Card 4: Owed to them */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 leading-none">
                  ৳{totalOwed.toLocaleString()}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Owed to them</p>
              </div>
            </div>
          </div>

          {/* Main Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Toolbar Matching Reference Screenshot 1 */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons: Columns, Filter, + New Supplier */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  type="button"
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Columns className="h-3.5 w-3.5" />
                  Columns
                </button>

                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border-none focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="all">Filter: All</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  New Supplier
                </button>
              </div>
            </div>

            {/* Table (Columns: SUPPLIER, CONTACT, PURCHASES, BOUGHT FROM THEM, BALANCE, ACTIVE, ACTION) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-5">SUPPLIER</th>
                    <th className="py-3 px-5">CONTACT</th>
                    <th className="py-3 px-5 text-center">PURCHASES</th>
                    <th className="py-3 px-5">BOUGHT FROM THEM</th>
                    <th className="py-3 px-5">BALANCE</th>
                    <th className="py-3 px-5 text-center">ACTIVE</th>
                    <th className="py-3 px-5 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSuppliers.map((s) => {
                    const isActive = typeof s.status === 'boolean' ? s.status : s.status === 'active';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Supplier (Avatar + Name + Email) */}
                        <td className="py-4 px-5">
                          <div className="flex items-center space-x-3">
                            {s.profilePhoto ? (
                              <img
                                src={s.profilePhoto}
                                alt={s.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center text-xs uppercase shadow-2xs">
                                {s.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                              {s.email && (
                                <div className="text-[11px] text-slate-400">{s.email}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact (Phone) */}
                        <td className="py-4 px-5 font-mono text-slate-800 text-xs">
                          {s.phone}
                        </td>

                        {/* Purchases */}
                        <td className="py-4 px-5 text-center">
                          <span className="inline-block bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-xs">
                            {s.purchasesCount ?? 0}
                          </span>
                        </td>

                        {/* Bought From Them */}
                        <td className="py-4 px-5 font-extrabold text-slate-900">
                          ৳{(s.totalPurchasedAmount ?? 0).toLocaleString()}
                        </td>

                        {/* Balance (Red as in reference screenshot) */}
                        <td className="py-4 px-5 font-extrabold text-rose-600">
                          ৳{(s.balance ?? s.totalPurchasedAmount ?? 0).toLocaleString()}
                        </td>

                        {/* Active Toggle Switch (Green Toggle matching reference) */}
                        <td className="py-4 px-5 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleToggleStatus(s)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22c55e]"></div>
                          </label>
                        </td>

                        {/* Action 3-dots Menu */}
                        <td className="py-4 px-5 text-center relative">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === s.id ? null : s.id);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeMenuId === s.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-left text-xs font-medium"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setSelectedSupplier(s);
                                  }}
                                  className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleOpenEdit(s);
                                  }}
                                  className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                                  Edit Info
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setDeleteTarget(s);
                                  }}
                                  className="w-full px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSuppliers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <Truck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                        No suppliers found matching your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Info */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing 1 to {filteredSuppliers.length} of {filteredSuppliers.length} suppliers</span>
              <span className="font-medium text-slate-600">10 / page</span>
            </div>
          </div>
        </div>
      ) : (
        /* Create / Edit Supplier View (Matches Screenshot 2) */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { resetForm(); setViewMode('list'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Suppliers
            </button>
            <h2 className="text-lg font-extrabold text-slate-900">
              {isEditing ? 'Edit Supplier' : 'Add Supplier'}
            </h2>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 max-w-3xl mx-auto">
            <form onSubmit={handleSubmitSupplier} className="space-y-6">
              {/* Profile Photo (Ratio 1:1, 500x500 box as in reference screenshot 2) */}
              <div className="space-y-2 text-center">
                <label className="block text-xs font-bold text-slate-800">
                  Profile Photo <span className="text-blue-600 font-semibold">Ratio 1:1 (500 × 500 px)</span>
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-48 h-48 mx-auto bg-slate-100 hover:bg-slate-200/80 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group relative"
                >
                  {profilePhoto ? (
                    <>
                      <img src={profilePhoto} alt="Supplier" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold">
                        <Upload className="h-6 w-6 mb-1" />
                        Change Photo
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <div className="text-3xl font-bold text-slate-400 mb-1">500 × 500</div>
                      <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                        <Upload className="h-3.5 w-3.5" />
                        Click to upload
                      </p>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <p className="text-[11px] text-slate-500">Supported formats: jpg, jpeg, png</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Phone Number & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Enter Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons (Cancel / Submit matching Screenshot 2) */}
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

      {/* Supplier Details Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Supplier Details</h3>
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {selectedSupplier.profilePhoto ? (
                <img
                  src={selectedSupplier.profilePhoto}
                  alt={selectedSupplier.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xl uppercase">
                  {selectedSupplier.name.charAt(0)}
                </div>
              )}
              <div>
                <h4 className="text-base font-extrabold text-slate-900">{selectedSupplier.name}</h4>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{selectedSupplier.phone}</div>
                {selectedSupplier.email && (
                  <div className="text-xs text-slate-400">{selectedSupplier.email}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Total Purchases:</span>
                <span className="font-bold text-slate-800">{selectedSupplier.purchasesCount ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Bought Amount:</span>
                <span className="font-bold text-slate-900">৳{(selectedSupplier.totalPurchasedAmount ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Owed Balance:</span>
                <span className="font-bold text-rose-600">৳{(selectedSupplier.balance ?? selectedSupplier.totalPurchasedAmount ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Address:</span>
                <span className="font-bold text-slate-800">{selectedSupplier.address || 'N/A'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const s = selectedSupplier;
                  setSelectedSupplier(null);
                  handleOpenEdit(s);
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Edit Info
              </button>
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
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
        title="Delete Supplier?"
        message={`Are you sure you want to delete supplier "${deleteTarget?.name}"?`}
        confirmText="Yes, Delete Supplier"
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