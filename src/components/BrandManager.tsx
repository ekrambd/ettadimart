import React, { useState, useEffect, useRef } from 'react';
import { Brand } from '../types';
import { dbService } from '../lib/dbService';
import { compressImage } from '../lib/imageUtils';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Bookmark, Plus, Trash2, Edit3, Save, RefreshCw, Check, X, Search,
  Upload, Image as ImageIcon, ShieldCheck, AlertTriangle, ArrowUpDown
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';

export default function BrandManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete confirm modal state
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback dialog
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBrands = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getBrands();
      setBrands(data || []);
    } catch (err: any) {
      console.error('Error loading brands:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Load failed',
        message: 'Unable to load brand list.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleOpenAddModal = () => {
    setEditingBrand(null);
    setName('');
    setLogo('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setName(brand.name || '');
    setLogo(brand.logo || '');
    setIsActive(brand.isActive !== false);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file, 600, 0.85, 300000);
      setLogo(compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogo(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Name is required',
        message: 'Please enter the brand name.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const brandPayload: Brand = {
        id: editingBrand ? editingBrand.id : `brand-${Date.now()}`,
        name: name.trim(),
        logo: logo.trim() || undefined,
        isActive,
        createdAt: editingBrand?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbService.saveBrand(brandPayload);
      setIsModalOpen(false);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'successful',
        message: editingBrand ? 'The brand has been successfully updated!' : 'New brand has been successfully added!'
      });
      await loadBrands();
    } catch (err: any) {
      console.error('Failed to save brand:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'has failed',
        message: err?.message || 'There was a problem saving the brand.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deletingBrand) return;
    setIsDeleting(true);
    try {
      await dbService.deleteBrand(deletingBrand.id);
      setDeletingBrand(null);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'has been deleted',
        message: 'The brand has been successfully deleted.'
      });
      await loadBrands();
    } catch (err: any) {
      console.error('Failed to delete brand:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'has failed',
        message: err?.message || 'There was a problem deleting the brand.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (brand: Brand) => {
    try {
      const updated: Brand = { ...brand, isActive: !brand.isActive, updatedAt: new Date().toISOString() };
      await dbService.saveBrand(updated);
      setBrands(prev => prev.map(b => b.id === brand.id ? updated : b));
    } catch (err: any) {
      console.error('Failed to toggle brand status:', err);
    }
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
              <Bookmark className="h-5 w-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Brand management
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            All of the stores watch And productManage brand inventory। product These brands can be selected while adding।
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadBrands}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-teal-700/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add new brands</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar & Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by brand name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Stats Pill */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-2xs">
          <span className="text-slate-500 font-medium">Total Brands:</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{brands.length}</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {brands.filter(b => b.isActive !== false).length} active
            </span>
          </div>
        </div>

      </div>

      {/* Brands List Table / Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <CircularProgress />
            <p className="text-xs text-slate-400 font-medium">Loading brand list...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Bookmark className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-slate-600">No data setup now</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {searchTerm ? 'Search did not match any brands.' : 'Click the button above to add a new brand.'}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-bold rounded-lg hover:bg-teal-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add the first brand</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Brands and logos</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredBrands.map((brand, index) => {
                  const active = brand.isActive !== false;
                  return (
                    <tr key={brand.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                        {index + 1}
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {brand.logo ? (
                            <img 
                              src={brand.logo} 
                              alt={brand.name} 
                              className="w-10 h-10 object-contain rounded-xl bg-slate-50 border border-slate-200 p-1 shrink-0" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                              {brand.name.substring(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">{brand.name}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(brand)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                            active 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{ active ? 'active' : 'inactive' }</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(brand)}
                            className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingBrand(brand)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Brand Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Bookmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingBrand ? 'Edit the brand' : 'Add new brands'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Fills in brand information and logos save
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBrand} className="space-y-4">
              
              {/* Brand Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  of the brand name (Brand Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Eg: Casio, Curren, Naviforce..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Brand Logo (Upload / URL) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brand logo / picture (Brand Logo - Optional)
                </label>
                
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  {logo ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={logo} 
                        alt="Logo preview" 
                        className="w-16 h-16 object-contain bg-white rounded-xl border border-slate-200 p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md"
                        title="Delete the logo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="h-5 w-5 mb-0.5" />
                      <span className="text-[9px] font-bold">No logo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-2xs">
                        <Upload className="h-3.5 w-3.5 text-slate-500" />
                        <span>{isUploading ? 'uploading...' : 'image upload'}</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Enter Brand Logo Image URL:', logo);
                          if (url !== null) setLogo(url.trim());
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-2xs"
                      >
                        URL link
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      PNG or transparent background images look best।
                    </p>
                  </div>
                </div>
              </div>

              {/* Status toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">Status</label>
                  <span className="text-[10px] text-slate-400">If enabled, the product will be available for creation</span>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="brand_active_toggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <label htmlFor="brand_active_toggle" className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 cursor-pointer" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  canceled
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSaving? 'Saving...' : 'Save'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Want to remove the brand?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure that <span className="font-bold text-slate-800">"{deletingBrand.name}"</span> brandT want to delete?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBrand(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                canceled
              </button>
              <button
                type="button"
                onClick={handleDeleteBrand}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
