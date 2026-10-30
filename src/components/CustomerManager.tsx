import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, BookOrder, Supplier, Vendor, ActiveTab } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Users, Search, Phone, MapPin, ShoppingBag, Calendar, MessageSquare, 
  UserPlus, Upload, Image as ImageIcon, Star, Truck, Store, Check, 
  Trash2, X, MoreVertical, Edit3, BadgeCheck, ShieldAlert
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface CustomerManagerProps {
  customers: Customer[];
  onNavigateTab?: (tab: ActiveTab) => void;
}

export default function CustomerManager({ customers, onNavigateTab }: CustomerManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'wholesaler'>('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Add/Edit Customer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [customerType, setCustomerType] = useState<'regular' | 'wholesaler'>('regular');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState('');
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action Dropdown & Conversion Dialogs
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [conversionTarget, setConversionTarget] = useState<{
    customer: Customer;
    action: 'wholesaler' | 'regular' | 'supplier' | 'vendor' | 'delete';
  } | null>(null);

  // Feedback Dialog State
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

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const isWholesaler = c.customerType === 'wholesaler';
      const matchesType = 
        filterType === 'all' || 
        (filterType === 'wholesaler' && isWholesaler) ||
        (filterType === 'regular' && !isWholesaler);

      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, filterType]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  // Close active menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const totalSpentAll = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const wholesalerCount = customers.filter(c => c.customerType === 'wholesaler').length;

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setDistrict('');
    setCustomerType('regular');
    setNotes('');
    setImage('');
    setTotalOrders(0);
    setTotalSpent(0);
    setIsEditing(false);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setName(c.name || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setDistrict(c.district || '');
    setCustomerType(c.customerType === 'wholesaler' ? 'wholesaler' : 'regular');
    setNotes(c.notes || '');
    setImage(c.image || '');
    setTotalOrders(c.totalOrders || 0);
    setTotalSpent(c.totalSpent || 0);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Handle local image file upload & base64 convert
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Image Too Large',
        message: 'Please choose an image under 2MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImage(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Add / Edit Customer Form
  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Customer name is required.'
      });
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Invalid Mobile Number',
        message: 'Please provide a valid mobile number.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const customerPayload: Customer = {
        id: isEditing ? `cust-${cleanPhone}` : `cust-${cleanPhone}`,
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        district: district.trim() || undefined,
        customerType: customerType,
        notes: notes.trim() || undefined,
        image: image || undefined,
        totalOrders: totalOrders,
        totalSpent: totalSpent,
        lastOrderDate: new Date().toISOString()
      };

      await dbService.saveCustomer(customerPayload);

      setFeedback({
        isOpen: true,
        type: 'success',
        title: isEditing ? 'Customer Updated' : 'Customer Added',
        message: `Customer "${name}" has been successfully ${isEditing ? 'updated' : 'added to the directory'}.`
      });

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Error Saving Customer',
        message: err.message || 'Failed to save customer. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Action / Conversion Confirmation
  const handleExecuteConversion = async () => {
    if (!conversionTarget) return;
    const { customer, action } = conversionTarget;

    try {
      if (action === 'wholesaler' || action === 'regular') {
        // Toggle Wholesaler status
        const updatedCustomer: Customer = {
          ...customer,
          customerType: action === 'wholesaler' ? 'wholesaler' : 'regular'
        };
        await dbService.saveCustomer(updatedCustomer);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: action === 'wholesaler' ? 'Marked as Wholesaler' : 'Set as Regular Customer',
          message: `Customer "${customer.name}" status updated to ${action === 'wholesaler' ? 'Wholesaler' : 'Regular'}.`
        });
      } else if (action === 'supplier') {
        // Move / promote to Supplier list
        const supplierPayload: Supplier = {
          id: `supp-${Date.now()}`,
          name: customer.name,
          companyName: `${customer.name} Trade`,
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || '',
          notes: `Promoted from customer record. Total past purchase: ৳${customer.totalSpent || 0}`,
          totalPurchasedAmount: customer.totalSpent || 0,
          status: 'active'
        };
        await dbService.saveSupplier(supplierPayload);

        // Optionally delete or mark customer
        await dbService.deleteCustomer(customer.id);

        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Moved to Suppliers',
          message: `"${customer.name}" was transferred to the Supplier Directory successfully!`
        });

        if (onNavigateTab) {
          setTimeout(() => onNavigateTab('suppliers'), 1200);
        }
      } else if (action === 'vendor') {
        // Move / promote to Vendor list
        const slug = customer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `vendor-${Date.now()}`;
        const vendorPayload: Vendor = {
          id: `vendor-${Date.now()}`,
          storeName: `${customer.name} Store`,
          slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
          ownerName: customer.name,
          phone: customer.phone,
          email: customer.email || `${slug}@ettadimart.com`,
          address: customer.address || '',
          district: customer.district || 'Dhaka',
          description: `Promoted from customer directory.`,
          commissionRate: 5,
          totalSales: customer.totalSpent || 0,
          totalOrders: customer.totalOrders || 0,
          walletBalance: 0,
          totalWithdrawn: 0,
          status: 'active',
          logo: customer.image || ''
        };
        await dbService.saveVendor(vendorPayload);

        // Remove from customer directory as they moved to vendor
        await dbService.deleteCustomer(customer.id);

        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Moved to Vendors',
          message: `"${customer.name}" was transferred to the Multi-Vendor Directory successfully!`
        });

        if (onNavigateTab) {
          setTimeout(() => onNavigateTab('vendors'), 1200);
        }
      } else if (action === 'delete') {
        await dbService.deleteCustomer(customer.id);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Customer Removed',
          message: `Customer "${customer.name}" has been removed from the directory.`
        });
      }
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not complete requested action.'
      });
    } finally {
      setConversionTarget(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {customers.length.toLocaleString()}
            </h3>
          </div>
          <div className="p-3 bg-teal-50 rounded-2xl text-teal-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Wholesalers</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
              {wholesalerCount.toLocaleString()}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Star className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-extrabold text-teal-700 mt-1">
              ৳{totalSpentAll.toLocaleString()}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Avg Order Value</p>
            <h3 className="text-2xl font-extrabold text-blue-700 mt-1">
              ৳{(customers.length ? Math.round(totalSpentAll / customers.length) : 0).toLocaleString()}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Calendar className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header Actions Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Customer Directory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-synced from orders, manual customer creations, and wholesaler management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('wholesaler')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === 'wholesaler' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <Star className="h-3 w-3 fill-current" />
                Wholesalers ({wholesalerCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('regular')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'regular' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Regular ({customers.length - wholesalerCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Add New Customer Button */}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4">Address / District</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-center">Last Active</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedCustomers.map((c) => {
                const isWholesaler = c.customerType === 'wholesaler';
                return (
                  <tr key={c.id || c.phone} className="hover:bg-slate-50/80 transition-colors">
                    {/* Customer Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                            isWholesaler ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {c.name.charAt(0) || 'C'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {isWholesaler && (
                              <span title="Wholesaler" className="inline-flex items-center text-amber-600">
                                <BadgeCheck className="h-3.5 w-3.5 fill-amber-500 text-white" />
                              </span>
                            )}
                          </div>
                          {c.email && (
                            <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">{c.email}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Customer Type Badge */}
                    <td className="py-3.5 px-4">
                      {isWholesaler ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Star className="h-3 w-3 fill-amber-500" />
                          Wholesaler
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          Regular
                        </span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono text-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <Phone className="h-3.5 w-3.5 text-teal-600" />
                        <span>{c.phone}</span>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{c.address || c.district || 'Address not specified'}</span>
                      </div>
                    </td>

                    {/* Total Orders */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-[11px]">
                        {c.totalOrders || (c.orders?.length ?? 0)} Orders
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-teal-800">
                      ৳{(c.totalSpent || 0).toLocaleString()}
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                      {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Action Dropdown Menu */}
                    <td className="py-3.5 px-4 text-center relative">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* Details Modal Trigger */}
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="View order history"
                        >
                          Details
                        </button>

                        {/* WhatsApp Shortcut */}
                        <a
                          href={`https://wa.me/88${c.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                          title="Message on WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>

                        {/* Action Context Menu Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === c.id ? null : c.id);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {/* Popover Action Menu */}
                          {activeMenuId === c.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-left text-xs font-medium"
                            >
                              {/* Edit Profile */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleOpenEditModal(c);
                                }}
                                className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                                Edit Info
                              </button>

                              {/* Toggle Wholesaler */}
                              {isWholesaler ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setConversionTarget({ customer: c, action: 'regular' });
                                  }}
                                  className="w-full px-3.5 py-2 hover:bg-amber-50 flex items-center gap-2 text-amber-700 cursor-pointer"
                                >
                                  <Users className="h-3.5 w-3.5" />
                                  Remove Wholesaler
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setConversionTarget({ customer: c, action: 'wholesaler' });
                                  }}
                                  className="w-full px-3.5 py-2 hover:bg-amber-50 flex items-center gap-2 text-amber-700 font-bold cursor-pointer"
                                >
                                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                                  Make Wholesaler
                                </button>
                              )}

                              <div className="border-t border-slate-100 my-1" />

                              {/* Move to Supplier */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setConversionTarget({ customer: c, action: 'supplier' });
                                }}
                                className="w-full px-3.5 py-2 hover:bg-blue-50 flex items-center gap-2 text-blue-700 cursor-pointer"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                Move to Supplier
                              </button>

                              {/* Move to Vendor */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setConversionTarget({ customer: c, action: 'vendor' });
                                }}
                                className="w-full px-3.5 py-2 hover:bg-purple-50 flex items-center gap-2 text-purple-700 cursor-pointer"
                              >
                                <Store className="h-3.5 w-3.5" />
                                Move to Vendor
                              </button>

                              <div className="border-t border-slate-100 my-1" />

                              {/* Delete Customer */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setConversionTarget({ customer: c, action: 'delete' });
                                }}
                                className="w-full px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Customer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    No customers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6 rounded-b-2xl">
            <div className="flex justify-between sm:hidden w-full">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium">
                  Showing <span className="font-bold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of <span className="font-bold text-slate-900">{filteredCustomers.length}</span> customers
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                  >
                    &larr;
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-bold focus:z-20 focus:outline-offset-0 cursor-pointer ${
                        currentPage === i + 1 
                        ? 'z-10 bg-teal-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600' 
                        : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                  >
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {isEditing ? 'Edit Customer Information' : 'Add New Customer'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter customer details, profile image (optional), and customer tier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="space-y-4">
              {/* Image Upload Preview (Optional) */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {image ? (
                    <img src={image} alt="Customer avatar" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-7 w-7 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Profile Image <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Browse Image
                    </button>
                    {image && (
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mahabub Rahman"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01711000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email & District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. customer@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    District / City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka, Chittagong..."
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Full Delivery Address
                </label>
                <textarea
                  rows={2}
                  placeholder="House, Road, Area, Landmark..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Customer Type / Tier */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Customer Type (Tier)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    customerType === 'regular' 
                      ? 'bg-teal-50/50 border-teal-500 text-teal-900 font-bold' 
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="customerTier"
                      value="regular"
                      checked={customerType === 'regular'}
                      onChange={() => setCustomerType('regular')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <div>Regular Retail</div>
                      <div className="text-[10px] text-slate-400 font-normal">Standard order rates</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    customerType === 'wholesaler' 
                      ? 'bg-amber-50/70 border-amber-500 text-amber-900 font-bold' 
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="customerTier"
                      value="wholesaler"
                      checked={customerType === 'wholesaler'}
                      onChange={() => setCustomerType('wholesaler')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        Wholesaler
                      </div>
                      <div className="text-[10px] text-amber-700 font-normal">Bulk buyer / dealer</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Admin Internal Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP client, preferred courier Pathao..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conversion / Action Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!conversionTarget}
        title={
          conversionTarget?.action === 'wholesaler' ? 'Mark as Wholesaler?' :
          conversionTarget?.action === 'regular' ? 'Remove Wholesaler Status?' :
          conversionTarget?.action === 'supplier' ? 'Transfer to Supplier Directory?' :
          conversionTarget?.action === 'vendor' ? 'Transfer to Multi-Vendor Directory?' :
          'Delete Customer Record?'
        }
        message={
          conversionTarget?.action === 'wholesaler' ? `Customer "${conversionTarget.customer.name}" will be flagged as a Wholesaler for bulk pricing and trade advantages.` :
          conversionTarget?.action === 'regular' ? `Customer "${conversionTarget.customer.name}" will be converted back to a Regular Retail customer.` :
          conversionTarget?.action === 'supplier' ? `Customer "${conversionTarget.customer.name}" will be converted and moved directly into your Procurement Supplier list.` :
          conversionTarget?.action === 'vendor' ? `Customer "${conversionTarget.customer.name}" will be granted a Vendor merchant profile and moved into your Vendor list.` :
          `Are you sure you want to delete "${conversionTarget?.customer.name}" from your customer directory?`
        }
        confirmText={
          conversionTarget?.action === 'wholesaler' ? 'Yes, Make Wholesaler' :
          conversionTarget?.action === 'supplier' ? 'Yes, Move to Supplier' :
          conversionTarget?.action === 'vendor' ? 'Yes, Move to Vendor' :
          conversionTarget?.action === 'delete' ? 'Delete Customer' : 'Confirm'
        }
        confirmVariant={
          conversionTarget?.action === 'delete' ? 'danger' :
          conversionTarget?.action === 'wholesaler' ? 'warning' : 'primary'
        }
        onConfirm={handleExecuteConversion}
        onCancel={() => setConversionTarget(null)}
      />

      {/* Customer Detail Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                {selectedCustomer.image ? (
                  <img
                    src={selectedCustomer.image}
                    alt={selectedCustomer.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm uppercase">
                    {selectedCustomer.name.charAt(0) || 'C'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    {selectedCustomer.name}
                    {selectedCustomer.customerType === 'wholesaler' && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold border border-amber-200">
                        Wholesaler
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                    <span>Phone: {selectedCustomer.phone}</span>
                    <span>•</span>
                    <span>Total Spent: ৳{(selectedCustomer.totalSpent || 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedCustomer.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-xs text-amber-900">
                <span className="font-bold">Internal Note:</span> {selectedCustomer.notes}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-xs">
                Order History ({selectedCustomer.orders?.length || selectedCustomer.totalOrders || 0} Orders)
              </h4>
              <div className="space-y-2">
                {(selectedCustomer.orders || []).map((ord) => (
                  <div key={ord.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{ord.id} - {ord.productTitle || ord.productName}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Date: {new Date(ord.createdAt).toLocaleDateString()} • Quantity: {ord.quantity || 1}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-teal-800">৳{(ord.totalPrice || 0).toLocaleString()}</div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                        ord.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                        ord.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                        ord.status === 'Confirmed' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))}

                {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl">
                    No individual order items recorded for this profile yet.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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