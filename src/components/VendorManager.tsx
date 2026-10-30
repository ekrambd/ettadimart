import React, { useState, useEffect, useRef } from 'react';
import { Vendor, WithdrawalRequest } from '../types';
import { dbService } from '../lib/dbService';
import { compressImage } from '../lib/imageUtils';
import { 
  Store, Plus, Search, Edit3, Trash2, Phone, Mail, MapPin, 
  DollarSign, Check, X, Star, ShieldCheck, ExternalLink, Percent, Wallet, 
  ArrowLeft, Key, User, CheckCircle2, Clock, Filter, Columns, SlidersHorizontal,
  LayoutGrid, List, AlertCircle, ShoppingBag, Box, MoreVertical, Eye,
  Upload, Image as ImageIcon
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface VendorManagerProps {
  initialView?: 'list' | 'create' | 'withdrawals';
  onNavigateTab?: (tab: any) => void;
}

export default function VendorManager({ initialView = 'list', onNavigateTab }: VendorManagerProps) {
  // Navigation tabs within Vendor module
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'detail' | 'withdrawals' | 'withdrawal_detail'>('list');

  // List data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');

  // Selected for detail / edit
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'order' | 'product' | 'review'>('overview');
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Close popup menu on clicking outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveActionMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Form Fields for New Vendor / Edit Vendor
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [ownerPhoto, setOwnerPhoto] = useState('');
  const [logo, setLogo] = useState('');
  const [banner, setBanner] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState<number | ''>(40);
  const [orderPrefix, setOrderPrefix] = useState('RC');
  const [commissionRate, setCommissionRate] = useState<number | ''>(8);

  // File Upload State & Input Refs (Pick from PC or Mobile Gallery)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const ownerPhotoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'ownerPhoto' | 'logo' | 'banner'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'ownerPhoto') setIsUploadingPhoto(true);
    if (type === 'logo') setIsUploadingLogo(true);
    if (type === 'banner') setIsUploadingBanner(true);

    try {
      const maxDim = type === 'banner' ? 1200 : 800;
      const compressed = await compressImage(file, maxDim, 0.85, 400000);
      if (type === 'ownerPhoto') setOwnerPhoto(compressed);
      if (type === 'logo') setLogo(compressed);
      if (type === 'banner') setBanner(compressed);
    } catch (err) {
      console.error('Image upload failed, fallback to data url:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          if (type === 'ownerPhoto') setOwnerPhoto(reader.result);
          if (type === 'logo') setLogo(reader.result);
          if (type === 'banner') setBanner(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      if (type === 'ownerPhoto') setIsUploadingPhoto(false);
      if (type === 'logo') setIsUploadingLogo(false);
      if (type === 'banner') setIsUploadingBanner(false);
    }
  };

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [vendorList, withdrawalList] = await Promise.all([
        dbService.getVendors(),
        dbService.getWithdrawals()
      ]);
      setVendors(vendorList);
      setWithdrawals(withdrawalList);
    } catch (err) {
      console.error('Failed to load vendors/withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialView === 'create') {
      handleOpenCreate();
    } else if (initialView === 'withdrawals') {
      setCurrentView('withdrawals');
    } else {
      setCurrentView('list');
    }
  }, [initialView]);

  const handleOpenCreate = () => {
    setEditingVendorId(null);
    setFirstName('');
    setLastName('');
    setPhone('');
    setGender('Male');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setStoreName('');
    setAddress('');
    setDescription('');
    setOwnerPhoto('');
    setLogo('');
    setBanner('');
    setDeliveryCharge(40);
    setOrderPrefix('RC');
    setCommissionRate(8);
    setCurrentView('create');
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditingVendorId(v.id);
    setFirstName(v.firstName || v.ownerName.split(' ')[0] || '');
    setLastName(v.lastName || v.ownerName.split(' ').slice(1).join(' ') || '');
    setPhone(v.phone || '');
    setGender(v.gender || 'Male');
    setEmail(v.email || '');
    setPassword('');
    setConfirmPassword('');
    setStoreName(v.storeName || '');
    setAddress(v.address || '');
    setDescription(v.description || '');
    setOwnerPhoto(v.ownerPhoto || '');
    setLogo(v.logo || '');
    setBanner(v.banner || '');
    setDeliveryCharge(v.deliveryCharge !== undefined ? v.deliveryCharge : 40);
    setOrderPrefix(v.orderPrefix || 'RC');
    setCommissionRate(v.commissionRate !== undefined ? v.commissionRate : 8);
    setCurrentView('create');
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !email.trim() || !phone.trim()) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Missing Required Fields',
        message: 'Please fill in Store Name, Email, and Phone Number.'
      });
      return;
    }

    if (password && password !== confirmPassword) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Password Mismatch',
        message: 'Password and Confirm Password do not match.'
      });
      return;
    }

    try {
      const ownerName = `${firstName} ${lastName}`.trim() || storeName;
      const existing = editingVendorId ? vendors.find(v => v.id === editingVendorId) : null;

      const payload: Vendor = {
        id: editingVendorId || '',
        storeName: storeName.trim(),
        slug: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ownerName,
        email: email.trim(),
        phone: phone.trim(),
        gender,
        password: password || existing?.password || '',
        logo: logo.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80',
        banner: banner.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
        ownerPhoto: ownerPhoto.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        description: description.trim(),
        address: address.trim(),
        district: existing?.district || 'Dhaka',
        commissionRate: commissionRate === '' ? 8 : Number(commissionRate),
        deliveryCharge: deliveryCharge === '' ? 40 : Number(deliveryCharge),
        orderPrefix: orderPrefix.trim() || 'RC',
        productsCount: existing?.productsCount ?? 0,
        ordersCount: existing?.ordersCount ?? 0,
        totalSales: existing?.totalSales ?? 0,
        totalOrders: existing?.totalOrders ?? 0,
        walletBalance: existing?.walletBalance ?? 0,
        totalWithdrawn: existing?.totalWithdrawn ?? 0,
        isOpen: existing?.isOpen ?? true,
        status: existing?.status || 'active',
        payoutMethod: existing?.payoutMethod || 'bKash Merchant',
        payoutAccount: existing?.payoutAccount || phone,
        rating: existing?.rating ?? 5.0
      };

      await dbService.saveVendor(payload);
      await loadData();

      setFeedback({
        isOpen: true,
        type: 'success',
        title: editingVendorId ? 'Vendor Updated' : 'Vendor Registered',
        message: `Store "${storeName}" has been successfully saved.`
      });

      setCurrentView('list');
      if (onNavigateTab) onNavigateTab('vendors');
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not save vendor information.'
      });
    }
  };

  const handleToggleOpen = async (v: Vendor) => {
    try {
      const updated: Vendor = {
        ...v,
        isOpen: !v.isOpen
      };
      await dbService.saveVendor(updated);
      setVendors(prev => prev.map(item => item.id === v.id ? updated : item));
    } catch (err) {
      console.error('Failed to toggle store open status:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteVendor(deleteTarget.id);
      setVendors(prev => prev.filter(v => v.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Vendor Removed',
        message: 'The vendor has been removed successfully.'
      });
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not remove vendor.'
      });
    }
  };

  const handleUpdateWithdrawalStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await dbService.updateWithdrawalStatus(id, status);
      await loadData();
      if (selectedWithdrawal && selectedWithdrawal.id === id) {
        setSelectedWithdrawal(prev => prev ? { ...prev, status, decidedAt: new Date().toISOString() } : null);
      }
      setFeedback({
        isOpen: true,
        type: 'success',
        title: `Withdrawal ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `The withdrawal request was updated.`
      });
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update status.'
      });
    }
  };

  // Metrics calculation
  const totalVendorsCount = vendors.length;
  const openVendorsCount = vendors.filter(v => v.isOpen !== false).length;
  const closedVendorsCount = vendors.filter(v => v.isOpen === false).length;
  const totalProductsListed = vendors.reduce((acc, v) => acc + (v.productsCount || 0), 0);

  const totalWithdrawalRequests = withdrawals.length;
  const waitingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved').length;
  const toPayOutAmount = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);
  const totalPaidOutAmount = withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0);

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    const q = searchTerm.toLowerCase();
    return (
      v.storeName.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      (v.address && v.address.toLowerCase().includes(q)) ||
      v.phone.includes(q)
    );
  });

  // Filter withdrawals
  const filteredWithdrawals = withdrawals.filter(w => {
    const q = withdrawalSearch.toLowerCase();
    return (
      (w.vendorName && w.vendorName.toLowerCase().includes(q)) ||
      (w.ownerName && w.ownerName.toLowerCase().includes(q)) ||
      (w.method && w.method.toLowerCase().includes(q)) ||
      (w.contactNumber && w.contactNumber.includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16">
      
      {/* ============================================================== */}
      {/* 1. ALL VENDORS LIST VIEW (Matching Screenshot 1)                */}
      {/* ============================================================== */}
      {currentView === 'list' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendors</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                The shops trading on the marketplace, and what each of them is carrying.
              </p>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{totalVendorsCount}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Vendors</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{openVendorsCount}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Open</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{closedVendorsCount}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Closed</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{totalProductsListed}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Products listed</p>
              </div>
            </div>
          </div>

          {/* Action Bar (Search, Columns, Filter, New Vendor Button) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by shop, owner, email or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <button 
                type="button"
                onClick={() => setCurrentView('withdrawals')}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <Wallet className="w-4 h-4 text-slate-500" />
                <span>Withdrawals</span>
              </button>

              <button 
                type="button"
                className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
              >
                <Columns className="w-4 h-4 text-slate-500" />
                <span>Columns</span>
              </button>

              <button 
                type="button"
                className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
              >
                <Filter className="w-4 h-4 text-slate-500" />
                <span>Filter</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Vendor</span>
              </button>
            </div>
          </div>

          {/* Vendors Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-4 px-5">Vendor</th>
                    <th className="py-4 px-5">Owner</th>
                    <th className="py-4 px-5 text-center">Products</th>
                    <th className="py-4 px-5 text-center">Orders</th>
                    <th className="py-4 px-5 text-center">Rating</th>
                    <th className="py-4 px-5 text-center">Open</th>
                    <th className="py-4 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Loading vendor partners...
                      </td>
                    </tr>
                  ) : filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No vendors found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <tr 
                        key={vendor.id} 
                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setCurrentView('detail');
                        }}
                      >
                        {/* Vendor Logo & Shop Name */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                              {vendor.logo ? (
                                <img src={vendor.logo} alt={vendor.storeName} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <Store className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {vendor.storeName}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                Prefix {vendor.orderPrefix || 'RC'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Owner & Email */}
                        <td className="py-4 px-5">
                          <div>
                            <p className="font-semibold text-slate-800">{vendor.ownerName}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{vendor.email}</p>
                          </div>
                        </td>

                        {/* Products Count */}
                        <td className="py-4 px-5 text-center font-bold text-slate-700">
                          {vendor.productsCount ?? 0}
                        </td>

                        {/* Orders Count */}
                        <td className="py-4 px-5 text-center font-bold text-slate-700">
                          {vendor.ordersCount ?? 0}
                        </td>

                        {/* Rating */}
                        <td className="py-4 px-5 text-center">
                          {vendor.rating ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs">
                              <Star className="w-3 h-3 fill-amber-500" />
                              {vendor.rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">No reviews</span>
                          )}
                        </td>

                        {/* Open Toggle */}
                        <td 
                          className="py-4 px-5 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOpen(vendor);
                          }}
                        >
                          <button
                            type="button"
                            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                              vendor.isOpen !== false ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                vendor.isOpen !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 px-5 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === `vendor-${vendor.id}` ? null : `vendor-${vendor.id}`);
                              }}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenuId === `vendor-${vendor.id}` && (
                              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setSelectedVendor(vendor);
                                    setCurrentView('detail');
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 text-emerald-600" />
                                  <span>View Profile</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleOpenEdit(vendor);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4 text-blue-600" />
                                  <span>Edit Shop</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setDeleteTarget(vendor);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100 mt-1"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-600" />
                                  <span>Delete Vendor</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer matching screenshot */}
            <div className="py-3 px-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <p>Showing 1 to {filteredVendors.length} of {vendors.length} vendors</p>
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <span>10 / page</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. NEW VENDOR / EDIT FORM (Matching Screenshot 3)               */}
      {/* ============================================================== */}
      {currentView === 'create' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('list')}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {editingVendorId ? 'Edit Vendor' : 'New Vendor'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Set up a shop and the person who will run it.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveVendor} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (2 Cols wide): Who runs it, How they sign in, The shop */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card 1: Who runs it */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Who runs it</h3>
                    <p className="text-xs text-slate-500">The person who will sign in and manage the shop.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahim"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Uddin"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 01711000111"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full sm:w-1/3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Card 2: How they sign in */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">How they sign in</h3>
                    <p className="text-xs text-slate-500">They can change the password once they are in.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@shop.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password {!editingVendorId && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="password"
                      required={!editingVendorId}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirm Password {!editingVendorId && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="password"
                      required={!editingVendorId}
                      placeholder="Type it again"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: The shop */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">The shop</h3>
                    <p className="text-xs text-slate-500">What customers will see it called, and where it is.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Shop Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Family Mart"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street, area, city"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Delivery Charge (৳)
                    </label>
                    <input
                      type="number"
                      placeholder="40"
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Order Prefix
                    </label>
                    <input
                      type="text"
                      placeholder="RC"
                      value={orderPrefix}
                      onChange={(e) => setOrderPrefix(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Marketplace Commission (%)
                    </label>
                    <input
                      type="number"
                      placeholder="8"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="About this shop..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingVendorId ? 'Save Changes' : 'Create Vendor'}</span>
                </button>
              </div>

            </div>

            {/* Right Column: Pictures (Owner photo, Shop logo, Shop banner) */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Pictures</h3>
                  <p className="text-xs text-slate-500">The face of the shop. Each has a size that suits where it is shown.</p>
                </div>

                {/* Owner photo */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Owner photo *</span>
                    <span className="text-slate-400 font-medium">Square, 500 × 500</span>
                  </div>
                  
                  {/* File picker button & upload area */}
                  <div 
                    onClick={() => ownerPhotoInputRef.current?.click()}
                    className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer transition-colors relative group"
                  >
                    {ownerPhoto ? (
                      <>
                        <img src={ownerPhoto} alt="Owner Preview" className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-2">
                          <ImageIcon className="w-4 h-4" />
                          <span>Change Photo</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-600">
                          {isUploadingPhoto ? 'Uploading...' : 'Choose from device / gallery'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Mobile gallery or PC</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={ownerPhotoInputRef}
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'ownerPhoto')}
                      className="hidden"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Or paste photo URL (https://...)"
                    value={ownerPhoto}
                    onChange={(e) => setOwnerPhoto(e.target.value)}
                    className="w-full px-3 py-2 mt-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Shop logo */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Shop logo *</span>
                    <span className="text-slate-400 font-medium">Square, 800 × 800</span>
                  </div>

                  {/* File picker button & upload area */}
                  <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer transition-colors relative group"
                  >
                    {logo ? (
                      <>
                        <img src={logo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-2">
                          <ImageIcon className="w-4 h-4" />
                          <span>Change Logo</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-600">
                          {isUploadingLogo ? 'Uploading...' : 'Choose logo from device'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Mobile gallery or PC</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo')}
                      className="hidden"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Or paste logo URL (https://...)"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="w-full px-3 py-2 mt-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Shop banner */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Shop banner *</span>
                    <span className="text-slate-400 font-medium">Wide, 1152 × 864</span>
                  </div>

                  {/* File picker button & upload area */}
                  <div 
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer transition-colors relative group"
                  >
                    {banner ? (
                      <>
                        <img src={banner} alt="Banner Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-2">
                          <ImageIcon className="w-4 h-4" />
                          <span>Change Banner</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-600">
                          {isUploadingBanner ? 'Uploading...' : 'Choose banner from device'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Mobile gallery or PC</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={bannerInputRef}
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'banner')}
                      className="hidden"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Or paste banner URL (https://...)"
                    value={banner}
                    onChange={(e) => setBanner(e.target.value)}
                    className="w-full px-3 py-2 mt-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

              </div>
            </div>

          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. VENDOR PROFILE / DETAIL VIEW (Matching Screenshot 5)         */}
      {/* ============================================================== */}
      {currentView === 'detail' && selectedVendor && (
        <div className="space-y-6">
          {/* Top back button & breadcrumbs */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedVendor.storeName}</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  A vendor on the marketplace, and what they are trading.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedVendor)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Banner & Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Banner Image */}
            <div className="w-full h-52 bg-slate-100 overflow-hidden relative">
              <img 
                src={selectedVendor.banner || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80'} 
                alt={selectedVendor.storeName}
                className="w-full h-full object-cover" 
              />
            </div>

            {/* Vendor Profile Info Bar */}
            <div className="p-6 relative flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden -mt-12 shrink-0">
                  <img 
                    src={selectedVendor.logo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80'} 
                    alt={selectedVendor.storeName}
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedVendor.storeName}</h2>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Open
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    {selectedVendor.rating ? `${selectedVendor.rating} ★ Rated` : 'No reviews yet'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View live</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Password reset link sent to ${selectedVendor.email}`)}
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Reset password</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedVendor)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Inner Sub Tabs (Shop overview, Order, Product, Review) */}
            <div className="px-6 flex items-center gap-8 border-b border-slate-100 text-sm font-bold text-slate-500">
              <button
                type="button"
                onClick={() => setDetailTab('overview')}
                className={`py-3.5 border-b-2 cursor-pointer transition-colors ${
                  detailTab === 'overview'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Shop overview
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('order')}
                className={`py-3.5 border-b-2 cursor-pointer transition-colors ${
                  detailTab === 'order'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Order ({selectedVendor.ordersCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('product')}
                className={`py-3.5 border-b-2 cursor-pointer transition-colors ${
                  detailTab === 'product'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Product ({selectedVendor.productsCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('review')}
                className={`py-3.5 border-b-2 cursor-pointer transition-colors ${
                  detailTab === 'review'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Review
              </button>
            </div>
          </div>

          {/* Metric cards inside shop overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{selectedVendor.productsCount || 0}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Products</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{selectedVendor.ordersCount || 0}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Orders</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">৳{selectedVendor.totalSales?.toLocaleString() || 0}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Taken</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">
                  {selectedVendor.rating ? selectedVendor.rating.toFixed(1) : '—'}
                </p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Rating</p>
              </div>
            </div>
          </div>

          {/* Three Info Sections (Owner, How they trade, About the shop) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Owner Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Owner</span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {selectedVendor.ownerName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedVendor.ownerName}</p>
                  <p className="text-xs text-slate-500 font-medium">{selectedVendor.email}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone</span>
                  <span className="font-bold text-emerald-600">{selectedVendor.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Joined</span>
                  <span className="font-medium text-slate-700">13 Oct 2025</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last seen</span>
                  <span className="font-medium text-slate-700">1 day ago</span>
                </div>
              </div>
            </div>

            {/* How they trade Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>How they trade</span>
              </div>
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Delivery charge</span>
                  <span className="font-bold text-slate-900">৳{selectedVendor.deliveryCharge || 40}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Order prefix</span>
                  <span className="font-bold text-slate-900">{selectedVendor.orderPrefix || 'RC'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Commission Rate</span>
                  <span className="font-bold text-slate-900">{selectedVendor.commissionRate || 8}%</span>
                </div>
              </div>
            </div>

            {/* About the shop Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>About the shop</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {selectedVendor.description || 'This shop has not written anything about itself.'}
              </p>
              {selectedVendor.address && (
                <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedVendor.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. WITHDRAWALS LIST VIEW (Matching Screenshot 2)               */}
      {/* ============================================================== */}
      {currentView === 'withdrawals' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Withdrawals</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Money the shops have asked to take out, and what you decided.
                </p>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{totalWithdrawalRequests}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Requests</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{waitingWithdrawals}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Waiting on you</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{approvedWithdrawals}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Approved</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">৳{toPayOutAmount.toLocaleString()}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">To pay out</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">৳{totalPaidOutAmount.toLocaleString()}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Paid out</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, shop, method or number..."
                value={withdrawalSearch}
                onChange={(e) => setWithdrawalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Columns className="w-4 h-4 text-slate-500" />
                <span>Columns</span>
              </button>

              <button 
                type="button"
                className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Filter className="w-4 h-4 text-slate-500" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Withdrawals Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-4 px-5">Amount</th>
                    <th className="py-4 px-5">Asked By</th>
                    <th className="py-4 px-5">Shop</th>
                    <th className="py-4 px-5">Method</th>
                    <th className="py-4 px-5">Requested</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No withdrawal requests found.
                      </td>
                    </tr>
                  ) : (
                    filteredWithdrawals.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedWithdrawal(item);
                          setCurrentView('withdrawal_detail');
                        }}
                      >
                        <td className="py-4 px-5 font-extrabold text-slate-900">
                          ৳{item.amount.toLocaleString()}
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs">
                              {(item.ownerName || 'V').charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-800">{item.ownerName || 'Vendor'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{item.vendorName || 'Marketplace Store'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-slate-500 font-medium">
                          {item.method || '—'}
                        </td>

                        <td className="py-4 px-5">
                          <p className="font-medium text-slate-800">13 Jan 2026</p>
                          <p className="text-xs text-slate-400">9 months ago</p>
                        </td>

                        <td className="py-4 px-5 text-center">
                          {item.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Approved
                            </span>
                          ) : item.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === `withdraw-${item.id}` ? null : `withdraw-${item.id}`);
                              }}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenuId === `withdraw-${item.id}` && (
                              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-30 animate-in fade-in zoom-in-95 space-y-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setSelectedWithdrawal(item);
                                    setCurrentView('withdrawal_detail');
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 text-emerald-600" />
                                  <span>View request</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    const found = vendors.find(v => v.id === item.vendorId || v.storeName === item.vendorName);
                                    if (found) {
                                      setSelectedVendor(found);
                                      setCurrentView('detail');
                                    }
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Store className="w-4 h-4 text-slate-500" />
                                  <span>Open the shop</span>
                                </button>

                                {item.status === 'pending' && (
                                  <>
                                    <div className="border-t border-slate-100 my-1"></div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleUpdateWithdrawalStatus(item.id, 'approved');
                                      }}
                                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                      <Check className="w-4 h-4 text-emerald-600" />
                                      <span>Approve Request</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleUpdateWithdrawalStatus(item.id, 'rejected');
                                      }}
                                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                      <X className="w-4 h-4 text-rose-600" />
                                      <span>Reject Request</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="py-3 px-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <p>Showing 1 to {filteredWithdrawals.length} of {withdrawals.length} requests</p>
              <span className="font-semibold text-slate-700">10 / page</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. WITHDRAWAL DETAIL VIEW (Matching Screenshot 4)               */}
      {/* ============================================================== */}
      {currentView === 'withdrawal_detail' && selectedWithdrawal && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCurrentView('withdrawals')}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to requests</span>
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Withdrawal request</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              ৳{selectedWithdrawal.amount.toLocaleString()} asked for on 13 Jan 2026
            </p>
          </div>

          {/* Amount Requested Banner Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Requested</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-slate-900">
                ৳{selectedWithdrawal.amount.toLocaleString()}
              </span>
              {selectedWithdrawal.status === 'approved' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  Approved
                </span>
              ) : selectedWithdrawal.status === 'rejected' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <X className="w-3.5 h-3.5" />
                  Rejected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Review
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <p className="text-slate-400 font-medium">METHOD</p>
                <p className="font-bold text-slate-800 mt-1">{selectedWithdrawal.method || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">CONTACT</p>
                <p className="font-bold text-slate-800 mt-1">{selectedWithdrawal.contactNumber || '8801711001102'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">REQUESTED</p>
                <p className="font-bold text-slate-800 mt-1">13 Jan 2026, 02:21 PM</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">DECIDED</p>
                <p className="font-bold text-slate-800 mt-1">13 Jan 2026, 02:34 PM</p>
              </div>
            </div>
          </div>

          {/* Bottom Two Cards: Who is asking & Which shop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Who is asking */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Who is asking</span>
              </div>
              
              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {(selectedWithdrawal.ownerName || 'F').charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedWithdrawal.ownerName || 'Farmhouse'}</p>
                  <p className="text-xs text-slate-500 font-medium">{selectedWithdrawal.vendorEmail || 'farmhousemarket@gmail.com'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone</span>
                  <span className="font-bold text-emerald-600">{selectedWithdrawal.contactNumber || '+8801711001102'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Number given</span>
                  <span className="font-medium text-slate-700">{selectedWithdrawal.accountNumber || selectedWithdrawal.contactNumber || '8801711001102'}</span>
                </div>
              </div>
            </div>

            {/* Which shop */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Which shop</span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                  <img 
                    src={selectedWithdrawal.vendorLogo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80'} 
                    alt="Shop" 
                    className="w-full h-full object-cover rounded-lg" 
                  />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedWithdrawal.vendorName || 'Farmhouse Market'}</p>
                  <p className="text-xs text-slate-500 font-medium">{selectedWithdrawal.vendorAddress || 'No address'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const found = vendors.find(v => v.id === selectedWithdrawal.vendorId || v.storeName === selectedWithdrawal.vendorName);
                    if (found) {
                      setSelectedVendor(found);
                      setCurrentView('detail');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <span>Open the shop</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Vendor Partner"
        message={`Are you sure you want to remove merchant partner "${deleteTarget?.storeName}"? All listed products and order associations will be disconnected.`}
        confirmText="Yes, remove vendor"
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
