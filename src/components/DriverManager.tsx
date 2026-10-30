import React, { useState, useEffect, useRef } from 'react';
import { Driver, ActiveTab } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Truck, Plus, Search, Eye, Edit3, Trash2, Phone, Mail, 
  Calendar, Check, X, Upload, Image as ImageIcon, ArrowLeft,
  ShieldCheck, Car, Key, User, CheckCircle2, AlertCircle
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface DriverManagerProps {
  initialView?: 'list' | 'create';
  onNavigateTab?: (tab: ActiveTab) => void;
}

export default function DriverManager({ initialView = 'list', onNavigateTab }: DriverManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create'>(initialView);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected driver for details modal
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  // Form fields for Create / Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [driverStatus, setDriverStatus] = useState<boolean>(true);
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

  // Sync initial view mode when prop changes
  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await dbService.getDrivers();
      setDrivers(data);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    const handleSync = () => loadDrivers();
    window.addEventListener('drivers-updated', handleSync);
    return () => window.removeEventListener('drivers-updated', handleSync);
  }, []);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setGender('Male');
    setDateOfBirth('');
    setDrivingLicense('');
    setVehicleType('');
    setPassword('');
    setConfirmPassword('');
    setProfilePhoto('');
    setDriverStatus(true);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setViewMode('create');
  };

  const handleOpenEdit = (d: Driver) => {
    setFirstName(d.firstName || '');
    setLastName(d.lastName || '');
    setPhone(d.phone || '');
    setEmail(d.email || '');
    setGender(d.gender || 'Male');
    setDateOfBirth(d.dateOfBirth || '');
    setDrivingLicense(d.drivingLicense || '');
    setVehicleType(d.vehicleType || '');
    setPassword('');
    setConfirmPassword('');
    setProfilePhoto(d.profilePhoto || '');
    setDriverStatus(d.status);
    setIsEditing(true);
    setEditingId(d.id);
    setViewMode('create');
  };

  // Image Upload Handling
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Image Too Large',
        message: 'Driver profile photo must be less than 2MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setProfilePhoto(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Toggle Driver Active / Inactive Status
  const handleToggleStatus = async (driver: Driver) => {
    const newStatus = !driver.status;
    try {
      // Optimistic update
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, status: newStatus } : d));
      await dbService.updateDriver(driver.id, { status: newStatus });
    } catch (err: any) {
      // Revert on failure
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, status: driver.status } : d));
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Status Update Failed',
        message: err.message || 'Could not update driver status.'
      });
    }
  };

  // Submit Driver Form
  const handleSubmitDriver = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Missing Required Field',
        message: 'First Name is required.'
      });
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Invalid Phone Number',
        message: 'Please provide a valid driver phone number.'
      });
      return;
    }

    if (!isEditing) {
      if (!profilePhoto) {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Profile Photo Required',
          message: 'Please upload a 1:1 profile photo for the driver.'
        });
        return;
      }

      if (!password) {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Password Required',
          message: 'Please specify an initial driver login password.'
        });
        return;
      }
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

    setSubmitting(true);
    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: cleanPhone,
        email: email.trim() || undefined,
        profilePhoto: profilePhoto || undefined,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        drivingLicense: drivingLicense.trim() || undefined,
        vehicleType: vehicleType.trim() || undefined,
        status: driverStatus
      };

      if (password) {
        payload.password = password;
      }

      if (isEditing && editingId) {
        await dbService.updateDriver(editingId, payload);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Driver Updated',
          message: `Driver "${firstName} ${lastName || ''}" updated successfully.`
        });
      } else {
        await dbService.addDriver(payload);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Driver Created',
          message: `New driver "${firstName} ${lastName || ''}" created successfully.`
        });
      }

      resetForm();
      setViewMode('list');
      loadDrivers();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save driver. Please check inputs.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Driver
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteDriver(deleteTarget.id);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Driver Removed',
        message: `Driver "${deleteTarget.firstName} ${deleteTarget.lastName || ''}" has been deleted.`
      });
      loadDrivers();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete driver.'
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filtered drivers list
  const filteredDrivers = drivers.filter(d => {
    const fullName = `${d.firstName} ${d.lastName || ''}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm) ||
      (d.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.vehicleType || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && d.status) ||
      (statusFilter === 'inactive' && !d.status);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* View: All Drivers List */}
      {viewMode === 'list' ? (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header Toolbar */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-teal-600" />
                  All Drivers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage delivery fleet drivers, vehicles, licenses, and availability.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Status Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Create New Driver Button (Matches Reference Screenshot) */}
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create New
                </button>
              </div>
            </div>

            {/* Drivers Table (Reference Columns: SL, Profile, Name, Phone, Status, Action) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5 w-16">SL.</th>
                    <th className="py-3 px-5 w-24">Profile</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Phone</th>
                    <th className="py-3 px-5 text-center w-28">Status</th>
                    <th className="py-3 px-5 text-center w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDrivers.map((d, index) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* SL */}
                      <td className="py-4 px-5 text-slate-500 font-semibold">
                        {index + 1}
                      </td>

                      {/* Profile Photo */}
                      <td className="py-4 px-5">
                        {d.profilePhoto ? (
                          <img
                            src={d.profilePhoto}
                            alt={`${d.firstName} avatar`}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center text-xs uppercase shadow-2xs">
                            {d.firstName.charAt(0)}
                          </div>
                        )}
                      </td>

                      {/* Name & Vehicle Type */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-sm">
                          {d.firstName} {d.lastName || ''}
                        </div>
                        {d.vehicleType && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Car className="h-3 w-3" />
                            {d.vehicleType}
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-5 font-mono text-slate-800 text-xs">
                        {d.phone}
                      </td>

                      {/* Status Toggle Switch (Green Toggle matching reference) */}
                      <td className="py-4 px-5 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={d.status}
                            onChange={() => handleToggleStatus(d)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22c55e]"></div>
                        </label>
                      </td>

                      {/* Actions (View Details & Edit / Delete) */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setSelectedDriver(d)}
                            className="p-1.5 text-slate-500 hover:text-teal-600 bg-slate-100 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="View Driver Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit driver */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(d)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Driver"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {/* Delete driver */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(d)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Driver"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredDrivers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Truck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                        No drivers found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* View: Create / Edit Driver Form (Matching Screenshot 2) */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { resetForm(); setViewMode('list'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Drivers
            </button>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-teal-600" />
              {isEditing ? 'Edit Driver' : 'Create New Driver'}
            </h2>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <form onSubmit={handleSubmitDriver} className="space-y-8">
              {/* Top Section: User Information */}
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 mb-6">
                  <User className="h-4 w-4 text-teal-600" />
                  User Information
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left 2 Columns: Form Input Fields */}
                  <div className="lg:col-span-2 space-y-5">
                    {/* First Name & Last Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          First Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter first name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Last Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
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

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="Enter Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    {/* Gender & Date of Birth */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Gender
                        </label>
                        <select
                          value={gender}
                          onChange={(e: any) => setGender(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Driving License & Vehicle Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Driving License
                        </label>
                        <input
                          type="text"
                          placeholder="Enter License"
                          value={drivingLicense}
                          onChange={(e) => setDrivingLicense(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Vehicle Type <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Vehicle Type (e.g. Motorcycle, Van, Bicycle)"
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Password {isEditing ? <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span> : <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="password"
                          required={!isEditing}
                          placeholder="Enter Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Confirm Password {isEditing ? '' : <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="password"
                          required={!isEditing}
                          placeholder="Enter Confirm Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Profile Photo Upload (Exact 500x500 box as in reference screenshot) */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      Profile Photo <span className="text-blue-600 font-semibold">Ratio 1:1 (500 × 500 px)</span> {!isEditing && <span className="text-rose-500">*</span>}
                    </label>

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-square max-w-[280px] mx-auto bg-slate-100 hover:bg-slate-200/80 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group relative"
                    >
                      {profilePhoto ? (
                        <>
                          <img
                            src={profilePhoto}
                            alt="Driver Preview"
                            className="w-full h-full object-cover"
                          />
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

                    <p className="text-[11px] text-slate-500 text-center">
                      Supported formats: jpg, jpeg, png
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Submit Button (Green Submit Button matching reference) */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { resetForm(); setViewMode('list'); }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Driver Profile Details</h3>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {selectedDriver.profilePhoto ? (
                <img
                  src={selectedDriver.profilePhoto}
                  alt={selectedDriver.firstName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xl uppercase">
                  {selectedDriver.firstName.charAt(0)}
                </div>
              )}
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  {selectedDriver.firstName} {selectedDriver.lastName || ''}
                </h4>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-mono">{selectedDriver.phone}</span>
                  <span>•</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedDriver.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedDriver.status ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Email:</span>
                <span className="font-semibold text-slate-800">{selectedDriver.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gender:</span>
                <span className="font-semibold text-slate-800">{selectedDriver.gender || 'Male'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date of Birth:</span>
                <span className="font-semibold text-slate-800">{selectedDriver.dateOfBirth || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Vehicle:</span>
                <span className="font-semibold text-slate-800">{selectedDriver.vehicleType || 'Not specified'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Driving License:</span>
                <span className="font-semibold text-slate-800 font-mono">{selectedDriver.drivingLicense || 'N/A'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const d = selectedDriver;
                  setSelectedDriver(null);
                  handleOpenEdit(d);
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
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
        title="Delete Driver?"
        message={`Are you sure you want to remove driver "${deleteTarget?.firstName} ${deleteTarget?.lastName || ''}"? They will lose access to orders and driver dispatching.`}
        confirmText="Yes, Delete Driver"
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