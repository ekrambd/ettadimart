import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CategoryItem } from '../types';
import { dbService } from '../lib/dbService';
import { compressImage } from '../lib/imageUtils';
import { 
  Folder, Plus, Edit3, Trash2, Check, X, Search, 
  Image as ImageIcon, Layers, ArrowUpDown, Filter, ChevronRight
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface CategoryManagerProps {
  initialSubcategoryFocus?: boolean;
}

export default function CategoryManager({ initialSubcategoryFocus = false }: CategoryManagerProps) {
  // Active Tab: 'categories' or 'subcategories'
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>(
    initialSubcategoryFocus ? 'subcategories' : 'categories'
  );

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [parentFilter, setParentFilter] = useState<string>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');
  const [formOrder, setFormOrder] = useState<number | ''>(0);
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await dbService.getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Loading failed',
        message: 'Unable to load categories.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (initialSubcategoryFocus) {
      setActiveTab('subcategories');
    }
  }, [initialSubcategoryFocus]);

  // Derived lists
  const rootCategories = useMemo(() => {
    return categories
      .filter(c => !c.parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories]);

  const subCategories = useMemo(() => {
    return categories
      .filter(c => Boolean(c.parentId))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Counts
  const subcategoryCountByParent = useMemo(() => {
    const counts = new Map<string, number>();
    subCategories.forEach(sub => {
      if (sub.parentId) {
        counts.set(sub.parentId, (counts.get(sub.parentId) || 0) + 1);
      }
    });
    return counts;
  }, [subCategories]);

  // Filtered lists for table views
  const filteredRootList = useMemo(() => {
    return rootCategories.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rootCategories, searchTerm]);

  const filteredSubList = useMemo(() => {
    return subCategories.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (categoryNameMap.get(c.parentId || '') || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesParent = parentFilter === 'all' || c.parentId === parentFilter;
      return matchesSearch && matchesParent;
    });
  }, [subCategories, searchTerm, parentFilter, categoryNameMap]);

  // Handlers for Add/Edit Modal
  const handleOpenCreateCategory = () => {
    setEditingItem(null);
    setFormName('');
    setFormParentId('');
    setFormOrder(rootCategories.length + 1);
    setFormImage('');
    setFormDescription('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenCreateSubcategory = (preselectedParentId?: string) => {
    setEditingItem(null);
    setFormName('');
    setFormParentId(preselectedParentId || (rootCategories[0] ? rootCategories[0].id : ''));
    setFormOrder(subCategories.length + 1);
    setFormImage('');
    setFormDescription('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CategoryItem) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormParentId(item.parentId || '');
    setFormOrder(item.order !== undefined ? item.order : 0);
    setFormImage(item.image || '');
    setFormDescription(item.description || '');
    setFormIsActive(item.isActive !== false);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file, 800, 0.85, 300000);
      setFormImage(compressed);
    } catch (err) {
      console.error('Failed to compress category image:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter category name.'
      });
      return;
    }

    if (activeTab === 'subcategories' && !formParentId) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a parent category for this subcategory.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<CategoryItem> = {
        ...(editingItem?.id && { id: editingItem.id }),
        name: formName.trim(),
        parentId: formParentId || null,
        order: formOrder === '' ? 0 : Number(formOrder),
        image: formImage.trim(),
        description: formDescription.trim(),
        isActive: formIsActive
      };

      await dbService.saveCategory(payload);
      await loadCategories();
      setIsModalOpen(false);

      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Category Saved',
        message: `Category "${formName.trim()}" successfully saved.`
      });
    } catch (err: any) {
      console.error('Error saving category:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save category.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await dbService.deleteCategory(deleteTarget.id);
      await loadCategories();
      setDeleteTarget(null);

      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Category Deleted',
        message: `"${deleteTarget.name}" deleted successfully.`
      });
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete category.'
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Category & Sub Category Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Simple CRUD management: organize root shelves and map subcategories with one click.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'categories' ? (
            <button
              type="button"
              onClick={handleOpenCreateCategory}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenCreateSubcategory()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sub Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs (Categories vs Sub Categories) */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-t-2xl pt-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('categories');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 py-3.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Root Categories</span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
            activeTab === 'categories' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {rootCategories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('subcategories');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 py-3.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'subcategories'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sub Categories</span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
            activeTab === 'subcategories' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {subCategories.length}
          </span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-b-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'categories' ? "Search categories..." : "Search subcategories..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {activeTab === 'subcategories' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter by Parent:</span>
            <select
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Root Categories ({rootCategories.length})</option>
              {rootCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({subcategoryCountByParent.get(cat.id) || 0})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs font-semibold">
            Loading categories...
          </div>
        ) : activeTab === 'categories' ? (
          /* ROOT CATEGORIES TABLE */
          filteredRootList.length === 0 ? (
            <div className="py-16 text-center">
              <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No categories found</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Category" to create a new category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Subcategories</th>
                    <th className="py-3 px-4 text-center">Sort Order</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRootList.map((cat, idx) => {
                    const subCount = subcategoryCountByParent.get(cat.id) || 0;
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {cat.image ? (
                                <img
                                  src={cat.image}
                                  alt={cat.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <Folder className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs sm:text-sm">{cat.name}</p>
                              {cat.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">{cat.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setParentFilter(cat.id);
                              setActiveTab('subcategories');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                          >
                            <span>{subCount} Subcategories</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {cat.order || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            cat.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {cat.isActive !== false ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateSubcategory(cat.id)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Add subcategory under this category"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden md:inline text-[11px]">Add Sub</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(cat)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(cat)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* SUBCATEGORIES TABLE */
          filteredSubList.length === 0 ? (
            <div className="py-16 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No subcategories found</p>
              <p className="text-xs text-slate-400 mt-1">
                {parentFilter !== 'all' 
                  ? "No subcategories created under this parent category yet." 
                  : "Click 'Add Sub Category' to create your first subcategory."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Sub Category</th>
                    <th className="py-3 px-4">Parent Category</th>
                    <th className="py-3 px-4 text-center">Sort Order</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSubList.map((sub, idx) => {
                    const parentName = categoryNameMap.get(sub.parentId || '') || 'Unknown Category';
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {sub.image ? (
                                <img
                                  src={sub.image}
                                  alt={sub.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <Layers className="w-5 h-5 text-indigo-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs sm:text-sm">{sub.name}</p>
                              {sub.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">{sub.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Folder className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{parentName}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {sub.order || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            sub.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {sub.isActive !== false ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(sub)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors cursor-pointer"
                              title="Edit Subcategory"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(sub)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors cursor-pointer"
                              title="Delete Subcategory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT CATEGORY & SUBCATEGORY                       */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  {activeTab === 'subcategories' ? <Layers className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingItem 
                      ? `Edit ${activeTab === 'subcategories' ? 'Sub Category' : 'Category'}` 
                      : `Add New ${activeTab === 'subcategories' ? 'Sub Category' : 'Category'}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeTab === 'subcategories' 
                      ? 'Select which parent category this subcategory belongs to.' 
                      : 'Set root shelf name, image, and sort priority.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* If Subcategory: Parent Category Selector */}
              {activeTab === 'subcategories' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Parent Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="" disabled>Select parent category</option>
                    {rootCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {activeTab === 'subcategories' ? 'Sub Category Name' : 'Category Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'subcategories' ? "e.g. Wireless Earbuds" : "e.g. Smart Gadgets"}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sort Order / Priority
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formOrder}
                  onChange={(e) => setFormOrder(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Image Upload & Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Thumbnail Image
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-colors relative group"
                >
                  {formImage ? (
                    <>
                      <img src={formImage} alt="Preview" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-2">
                        <ImageIcon className="w-4 h-4" />
                        <span>Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-3">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-500">
                        {isUploading ? 'Uploading...' : 'Click to select category image'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, or SVG</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Or paste image URL (https://...)"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-3 py-2 mt-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description about this category..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Is Active Toggle */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">Show on Storefront</p>
                  <p className="text-[10px] text-slate-500">Visible to customers in menus and filters.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                    formIsActive ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      formIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.parentId ? 'Sub Category' : 'Category'}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? ${
          !deleteTarget?.parentId ? 'Any subcategories under it will also be affected.' : ''
        }`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Feedback Toast / Dialog */}
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
