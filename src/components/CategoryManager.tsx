import React, { useState, useEffect, useRef } from 'react';
import { EcomSettings, CategoryItem } from '../types';
import { dbService } from '../lib/dbService';
import { compressImage } from '../lib/imageUtils';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Tag, Plus, Trash2, Save, RefreshCw, Check, Edit3, X, 
  Upload 
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

export default function CategoryManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    deliveryChargeInsideDhaka: 60,
    deliveryChargeOutsideDhaka: 110,
    categories: [],
    categoryItems: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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

  // Delete confirmation
  const [deleteTargetCat, setDeleteTargetCat] = useState<CategoryItem | null>(null);

  // New Category Inputs
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [isUploadingNewCat, setIsUploadingNewCat] = useState(false);

  // Edit Category Modal
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatImage, setEditingCatImage] = useState('');
  const [isUploadingEditCat, setIsUploadingEditCat] = useState(false);

  // Hidden File Inputs
  const newCatFileRef = useRef<HTMLInputElement>(null);
  const editCatFileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getEcomSettings();
      let catItems: CategoryItem[] = data.categoryItems || [];

      // If categoryItems is empty but categories string array exists, construct categoryItems
      if ((!catItems || catItems.length === 0) && data.categories && data.categories.length > 0) {
        catItems = data.categories.map((c, idx) => ({
          id: `cat-${Date.now()}-${idx}`,
          name: c,
          order: idx,
          subcategories: []
        }));
      }

      setSettings({
        ...data,
        categories: catItems.map(c => c.name),
        categoryItems: catItems
      });
    } catch (err) {
      console.error('Failed to load category settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Image Compress
  const handleImageCompress = async (
    file: File, 
    setImage: (val: string) => void, 
    setLoading: (val: boolean) => void
  ) => {
    setLoading(true);
    try {
      const compressed = await compressImage(file, 600, 0.85);
      setImage(compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setLoading(false);
    }
  };

  const persistCategories = async (updatedItems: CategoryItem[]) => {
    try {
      const currentFullSettings = await dbService.getEcomSettings();
      const updatedCategoriesList = updatedItems.map(c => c.name);

      const newSettings = {
        ...currentFullSettings,
        categories: updatedCategoriesList,
        categoryItems: updatedItems
      };
      setSettings(newSettings);
      await dbService.saveEcomSettings(newSettings);
    } catch (err) {
      console.error('Error saving categories:', err);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await persistCategories(settings.categoryItems || []);
      setSaveSuccess(true);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Saved Successfully',
        message: 'Categories have been successfully updated.'
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving categories:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: 'There was a problem saving the categories. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add Category
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim();

    const exists = settings.categoryItems?.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setFeedback({
        isOpen: true,
        type: 'info',
        title: 'Category Already Exists',
        message: `"${name}" is already in your category list.`
      });
      return;
    }

    const newCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      name,
      image: newCatImage.trim() || undefined,
      order: (settings.categoryItems?.length || 0),
      subcategories: []
    };

    const updatedItems = [...(settings.categoryItems || []), newCat];
    persistCategories(updatedItems);

    setNewCatName('');
    setNewCatImage('');
    if (newCatFileRef.current) newCatFileRef.current.value = '';
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Category Added',
      message: `"${name}" has been added successfully.`
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCat(cat);
    setEditingCatName(cat.name);
    setEditingCatImage(cat.image || '');
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!editingCat || !editingCatName.trim()) return;
    const updatedItems = (settings.categoryItems || []).map(c => 
      c.id === editingCat.id ? { 
        ...c, 
        name: editingCatName.trim(),
        image: editingCatImage.trim() || undefined
      } : c
    );
    persistCategories(updatedItems);
    setEditingCat(null);
    setEditingCatName('');
    setEditingCatImage('');
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Category Updated',
      message: 'Category details have been saved.'
    });
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTargetCat) return;
    const updatedItems = (settings.categoryItems || []).filter(c => c.id !== deleteTargetCat.id);
    persistCategories(updatedItems);
    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Category Deleted',
      message: `"${deleteTargetCat.name}" has been removed.`
    });
    setDeleteTargetCat(null);
  };

  const categoryItems = settings.categoryItems || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <CircularProgress label="Loading categories..." size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans w-full text-slate-800 pb-16">
      {/* Header Card */}
      <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Category Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add and edit store product categories with image thumbnails.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-200">
                <Check className="h-4 w-4 text-emerald-300" />
                Saved!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Easy Add Category Form */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
          <Plus className="h-5 w-5 text-teal-600" />
          <span>Add New Category</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Category Image Upload */}
          <div className="shrink-0">
            {newCatImage ? (
              <div className="relative group">
                <img 
                  src={newCatImage} 
                  alt="Category preview" 
                  className="w-14 h-14 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1"
                />
                <button
                  type="button"
                  onClick={() => setNewCatImage('')}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-xs cursor-pointer hover:bg-rose-600"
                  title="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label 
                className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-teal-600"
                title="Upload Category Image"
              >
                <Upload className="h-5 w-5" />
                <span className="text-[9px] font-bold mt-0.5">Image</span>
                <input
                  ref={newCatFileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageCompress(file, setNewCatImage, setIsUploadingNewCat);
                  }}
                  className="hidden"
                  disabled={isUploadingNewCat}
                />
              </label>
            )}
          </div>

          {/* Category Name Input */}
          <div className="flex-1 w-full">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="Category Name (e.g. মধু, খাঁটি ঘি, সরিষার তেল)..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={!newCatName.trim() || isUploadingNewCat}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Category List Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-base">
              All Categories
            </h3>
            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold rounded-lg">
              {categoryItems.length} {categoryItems.length === 1 ? 'Category' : 'Categories'}
            </span>
          </div>
        </div>

        {categoryItems.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 w-14 text-center">SL</th>
                  <th className="px-4 py-3.5 w-20 text-center">Image</th>
                  <th className="px-4 py-3.5">Category Name</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {categoryItems.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="w-11 h-11 mx-auto rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {cat.image ? (
                          <img 
                            src={cat.image} 
                            alt={cat.name} 
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400">
                            <Tag className="h-5 w-5 opacity-40" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm sm:text-base">
                        {cat.name}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
                          title="Edit Category"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetCat(cat)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200"
                          title="Delete Category"
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
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <Tag className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No categories added yet</p>
            <p className="text-xs text-slate-400">Use the form above to add your first category.</p>
          </div>
        )}
      </div>

      {/* Edit Category Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-teal-600" />
                <span>Edit Category</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={editingCatName}
                  onChange={(e) => setEditingCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
                  placeholder="Category Name"
                  autoFocus
                />
              </div>

              {/* Category Image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category Image
                </label>
                <div className="flex items-center gap-3">
                  {editingCatImage ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={editingCatImage} 
                        alt="Preview" 
                        className="w-16 h-16 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingCatImage('')}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-xs cursor-pointer hover:bg-rose-600"
                        title="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-teal-600 shrink-0">
                      <Upload className="h-5 w-5" />
                      <span className="text-[9px] font-bold mt-0.5">Upload</span>
                      <input
                        ref={editCatFileRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageCompress(file, setEditingCatImage, setIsUploadingEditCat);
                        }}
                        className="hidden"
                        disabled={isUploadingEditCat}
                      />
                    </label>
                  )}
                  <div className="text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">Category Thumbnail</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Displays on the storefront category carousel.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editingCatName.trim() || isUploadingEditCat}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetCat)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTargetCat?.name}"? Products in this category will not be deleted.`}
        confirmText="Yes, delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTargetCat(null)}
      />

      {/* Feedback Alert Dialog */}
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
