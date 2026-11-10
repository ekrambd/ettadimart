import React, { useState, useEffect, useMemo } from 'react';
import { ProductAttribute } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Tag, 
  LayoutGrid, 
  List, 
  Sparkles, 
  Droplets, 
  Scale, 
  Layers, 
  Box, 
  ArrowUpDown, 
  Copy, 
  CheckCheck,
  RotateCcw,
  Power,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

// Common default numbers suggested as clickable boxes
const DEFAULT_NUMBER_BOXES = [20, 50, 100, 200, 250, 500, 1000, 1500, 2000];

// Natural sort for numbers & units (20, 50, 100, 200)
function naturalSortValues(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const parseNum = (s: string) => {
      const match = s.match(/([0-9]+(\.[0-9]+)?)/);
      if (!match) return NaN;
      let num = parseFloat(match[1]);
      const lower = s.toLowerCase();
      if (lower.includes('kg')) num *= 1000;
      if (lower.includes('l') && !lower.includes('ml')) num *= 1000;
      return num;
    };
    const numA = parseNum(a);
    const numB = parseNum(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export default function AttributesManager() {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Status Filter: DEFAULTS TO 'inactive' AS REQUESTED BY USER
  const [statusFilter, setStatusFilter] = useState<'inactive' | 'active' | 'all'>('inactive');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<ProductAttribute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductAttribute | null>(null);

  // Form State (Default new attributes are inactive by default)
  const [name, setName] = useState('');
  const [valuesList, setValuesList] = useState<string[]>([]);
  const [status, setStatus] = useState(false);
  const [unitSuffix, setUnitSuffix] = useState<string>('');

  // Single Value Input inside Modal
  const [customInput, setCustomInput] = useState('');

  // Card Quick-Add state per attribute ID
  const [cardInputs, setCardInputs] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline edit state in modal
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

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

  const loadAttributes = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAttributes();
      setAttributes(data);
    } catch (err) {
      console.error('Failed to load attributes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttributes();
  }, []);

  const handleOpenAdd = () => {
    setEditingAttr(null);
    setName('');
    // Default 20, 50, 100, 200 boxes pre-populated
    setValuesList(['20', '50', '100', '200']);
    // By default, new attributes are Inactive
    setStatus(false);
    setUnitSuffix('');
    setCustomInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (attr: ProductAttribute) => {
    setEditingAttr(attr);
    setName(attr.name);
    setValuesList(Array.isArray(attr.values) ? [...attr.values] : []);
    setStatus(attr.status !== false);
    setUnitSuffix('');
    setCustomInput('');
    setIsModalOpen(true);
  };

  // Add a value box to the list
  const handleAddBox = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!valuesList.includes(trimmed)) {
      setValuesList(prev => [...prev, trimmed]);
    }
    setCustomInput('');
  };

  // Remove a value box
  const handleRemoveBox = (index: number) => {
    setValuesList(prev => prev.filter((_, i) => i !== index));
  };

  // Save the entire attribute to database permanently
  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Attribute Name Required',
        message: 'Please provide a name for this attribute (e.g. Pack Size, Liquid Volume).'
      });
      return;
    }

    try {
      const saved = await dbService.saveAttribute({
        ...(editingAttr?.id && { id: editingAttr.id }),
        name: name.trim(),
        values: valuesList,
        status
      });

      await loadAttributes();
      window.dispatchEvent(new CustomEvent('attributes-updated'));
      setIsModalOpen(false);

      // If user saved as active or inactive, guide them
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Saved to Database',
        message: `Attribute "${saved.name}" saved as ${status ? 'Active' : 'Inactive'}. You can find it in the ${status ? 'Active' : 'Inactive'} tab.`
      });
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save attribute to database.'
      });
    }
  };

  // Delete entire attribute from database
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteAttribute(deleteTarget.id);
      window.dispatchEvent(new CustomEvent('attributes-updated'));
      setAttributes(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Attribute Deleted',
        message: 'The attribute was permanently removed from database.'
      });
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete attribute.'
      });
    }
  };

  // Direct card action: Add new value box and save to database immediately
  const handleDirectAddBox = async (attr: ProductAttribute) => {
    const inputVal = (cardInputs[attr.id] || '').trim();
    if (!inputVal) return;

    if (attr.values && attr.values.includes(inputVal)) {
      setCardInputs(prev => ({ ...prev, [attr.id]: '' }));
      return;
    }

    const updatedValues = [...(attr.values || []), inputVal];
    try {
      await dbService.saveAttribute({
        ...attr,
        values: updatedValues
      });
      setAttributes(prev => prev.map(a => a.id === attr.id ? { ...a, values: updatedValues } : a));
      setCardInputs(prev => ({ ...prev, [attr.id]: '' }));
    } catch (err) {
      console.error('Failed to save new value box:', err);
    }
  };

  // Direct card action: Delete a value box and save to database immediately
  const handleDirectDeleteBox = async (attr: ProductAttribute, valToRemove: string) => {
    const updatedValues = (attr.values || []).filter(v => v !== valToRemove);
    try {
      await dbService.saveAttribute({
        ...attr,
        values: updatedValues
      });
      setAttributes(prev => prev.map(a => a.id === attr.id ? { ...a, values: updatedValues } : a));
    } catch (err) {
      console.error('Failed to remove value box:', err);
    }
  };

  // Direct card action: Toggle status and move to appropriate filter tab
  const handleDirectToggleStatus = async (attr: ProductAttribute) => {
    const updatedStatus = attr.status === false ? true : false;
    try {
      await dbService.saveAttribute({
        ...attr,
        status: updatedStatus
      });
      window.dispatchEvent(new CustomEvent('attributes-updated'));
      setAttributes(prev => prev.map(a => a.id === attr.id ? { ...a, status: updatedStatus } : a));

      // Helpful micro-feedback
      if (updatedStatus) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Attribute Activated',
          message: `"${attr.name}" is now Active and available for product variants. Click the "Active" tab to view it.`
        });
      } else {
        setFeedback({
          isOpen: true,
          type: 'info',
          title: 'Attribute Deactivated',
          message: `"${attr.name}" moved to the Inactive tab.`
        });
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Direct card action: Sort boxes naturally and save to database
  const handleDirectSort = async (attr: ProductAttribute) => {
    const sorted = naturalSortValues(attr.values || []);
    try {
      await dbService.saveAttribute({
        ...attr,
        values: sorted
      });
      setAttributes(prev => prev.map(a => a.id === attr.id ? { ...a, values: sorted } : a));
    } catch (err) {
      console.error('Failed to sort boxes:', err);
    }
  };

  // Copy values to clipboard
  const handleCopy = (attr: ProductAttribute) => {
    navigator.clipboard?.writeText((attr.values || []).join(', '));
    setCopiedId(attr.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Get icon by attribute name
  const getIcon = (attrName: string) => {
    const lower = attrName.toLowerCase();
    if (lower.includes('ml') || lower.includes('volum') || lower.includes('liquid') || lower.includes('bottle')) {
      return <Droplets className="w-5 h-5 text-cyan-600" />;
    }
    if (lower.includes('kg') || lower.includes('gram') || lower.includes('weight')) {
      return <Scale className="w-5 h-5 text-amber-600" />;
    }
    if (lower.includes('size') || lower.includes('cloth')) {
      return <Layers className="w-5 h-5 text-indigo-600" />;
    }
    return <Box className="w-5 h-5 text-emerald-600" />;
  };

  // Status counts for tab badges
  const inactiveCount = useMemo(() => {
    return attributes.filter(a => a.status === false).length;
  }, [attributes]);

  const activeCount = useMemo(() => {
    return attributes.filter(a => a.status !== false).length;
  }, [attributes]);

  // Filtered attributes by status filter and search term
  const filteredAttributes = attributes.filter(a => {
    const isActive = a.status !== false;
    if (statusFilter === 'inactive' && isActive) return false;
    if (statusFilter === 'active' && !isActive) return false;

    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.values && a.values.some(v => v.toLowerCase().includes(searchTerm.toLowerCase())));

    return matchesSearch;
  });

  return (
    <div className="space-y-6 text-slate-800 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Attributes</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {attributes.length} total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Inactive by default for a clean UI. Activate any attribute when you want to use its variation boxes in the store.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid Cards"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New Attribute</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          STATUS FILTER TABS (DEFAULTS TO INACTIVE) & SEARCH BAR
         ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* THE 3 STATUS FILTER TABS */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            {/* INACTIVE TAB (DEFAULT) */}
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Inactive</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                statusFilter === 'inactive' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {inactiveCount}
              </span>
            </button>

            {/* ACTIVE TAB */}
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
              <span>Active</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                statusFilter === 'active' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {activeCount}
              </span>
            </button>

            {/* ALL TAB */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                statusFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {attributes.length}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or box (e.g. 50, 100)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          {statusFilter === 'inactive' && (
            <p className="flex items-center gap-1.5 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span>Showing <strong>Inactive</strong> attributes. Click <strong>Activate</strong> on any card to move it into the Active tab.</span>
            </p>
          )}
          {statusFilter === 'active' && (
            <p className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Showing <strong>Active</strong> attributes. These variation boxes are currently live in the store.</span>
            </p>
          )}
          {statusFilter === 'all' && (
            <p className="flex items-center gap-1.5 text-slate-500">
              <span>Showing <strong>All</strong> attributes ({activeCount} active, {inactiveCount} inactive).</span>
            </p>
          )}

          <span className="font-semibold text-[11px] text-slate-400">
            {filteredAttributes.length} results
          </span>
        </div>
      </div>

      {/* GRID CARDS VIEW (BOX BY BOX DISPLAY) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded-md w-1/2"></div>
              <div className="flex gap-2">
                <div className="h-12 w-16 bg-slate-100 rounded-xl"></div>
                <div className="h-12 w-16 bg-slate-100 rounded-xl"></div>
                <div className="h-12 w-16 bg-slate-100 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAttributes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
            {statusFilter === 'active' ? <ShieldCheck className="w-7 h-7 text-emerald-600" /> : <Box className="w-7 h-7" />}
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {statusFilter === 'inactive' ? 'No Inactive Attributes' : statusFilter === 'active' ? 'No Active Attributes Yet' : 'No Attributes Found'}
          </h3>
          <p className="text-xs text-slate-500">
            {statusFilter === 'inactive' 
              ? 'All attributes are currently active. Switch to the Active tab to manage them.'
              : statusFilter === 'active'
              ? 'Switch to the Inactive tab and click Activate on any variation to make it live.'
              : 'Start by creating your first attribute with default boxes.'}
          </p>
          {statusFilter === 'active' && inactiveCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              View Inactive Attributes ({inactiveCount})
            </button>
          )}
          {statusFilter === 'inactive' && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              + Create Inactive Attribute
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID OF CARDS (BOX BOX INTERFACE) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAttributes.map((attr) => {
            const vals = attr.values || [];
            const quickInput = cardInputs[attr.id] || '';
            const isCopied = copiedId === attr.id;
            const isActive = attr.status !== false;

            return (
              <div
                key={attr.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group shadow-xs ${
                  isActive 
                    ? 'border-emerald-200/90 hover:border-emerald-400 hover:shadow-md' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className={`p-4 border-b flex items-start justify-between gap-3 ${
                  isActive ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50/60 border-slate-100'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                      {getIcon(attr.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 text-base truncate" title={attr.name}>
                        {attr.name}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-400">
                        {vals.length} {vals.length === 1 ? 'box' : 'boxes'}
                      </span>
                    </div>
                  </div>

                  {/* ACTIVE / INACTIVE TOGGLE BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleDirectToggleStatus(attr)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300'
                    }`}
                    title={isActive ? 'Click to deactivate' : 'Click to activate and move to Active tab'}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-400'}`}></span>
                    <span>{isActive ? 'Active' : 'Activate'}</span>
                  </button>
                </div>

                {/* Card Body: THE VALUE BOXES */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2.5">
                      <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">
                        Value Boxes
                      </span>
                      <div className="flex items-center gap-1">
                        {vals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDirectSort(attr)}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Sort naturally (20, 50, 100, 200)"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(attr)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Copy all values"
                        >
                          {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* BOX BOX DISPLAY */}
                    {vals.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No value boxes yet. Add one below.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                        {vals.map((val, idx) => (
                          <div
                            key={idx}
                            className="min-w-[54px] h-11 px-3 bg-white hover:bg-emerald-50/60 border-2 border-slate-200 hover:border-emerald-400 rounded-xl flex items-center justify-center font-black text-slate-800 text-xs shadow-2xs relative group/box transition-all cursor-default select-none"
                          >
                            <span>{val}</span>
                            {/* Hover Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDirectDeleteBox(attr, val)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/box:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title={`Delete box "${val}"`}
                            >
                              <X className="w-2.5 h-2.5 stroke-[3]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* QUICK INLINE ADD BOX */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Add box (e.g. 50, 100, 200)..."
                        value={quickInput}
                        onChange={(e) => setCardInputs(prev => ({ ...prev, [attr.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleDirectAddBox(attr);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleDirectAddBox(attr)}
                        disabled={!quickInput.trim()}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-600 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Add box and save to database"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Box</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(attr)}
                    className="flex-1 px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Manage Boxes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(attr)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete attribute"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                <tr>
                  <th className="py-4 px-5">Attribute Name</th>
                  <th className="py-4 px-5">Value Boxes</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttributes.map((attr) => {
                  const isActive = attr.status !== false;
                  return (
                    <tr key={attr.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-100">
                            {getIcon(attr.name)}
                          </div>
                          <div>
                            <span>{attr.name}</span>
                            <span className="block text-xs font-normal text-slate-400">
                              {attr.values?.length || 0} boxes
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1.5 max-w-lg">
                          {attr.values?.map((val, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 bg-white text-slate-800 text-xs font-bold rounded-lg border-2 border-slate-200 shadow-2xs flex items-center gap-1.5"
                            >
                              <span>{val}</span>
                              <button
                                type="button"
                                onClick={() => handleDirectDeleteBox(attr, val)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDirectToggleStatus(attr)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(attr)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(attr)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD / EDIT MODAL (BOX VALUE BUILDER)
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingAttr ? `Edit: ${editingAttr.name}` : 'New Attribute with Value Boxes'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add boxes like 20, 50, 100, 200. Saves to database so nothing is lost.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveAttribute} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Attribute Name & Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Attribute Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Size, Liquid Volume, Weight, Pack"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center h-10 px-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center justify-between w-full cursor-pointer select-none">
                    <span className="text-xs font-bold text-slate-700">Active</span>
                    <input
                      type="checkbox"
                      checked={status}
                      onChange={(e) => setStatus(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* DEFAULT VALUE BOXES (Click to add) */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Default Suggested Boxes (Click to Add):</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    <span>Unit:</span>
                    {['', 'ml', 'g', 'kg', 'pcs'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnitSuffix(u)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          unitSuffix === u ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {u || 'None'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clickable suggested boxes */}
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_NUMBER_BOXES.map((num) => {
                    const label = unitSuffix ? `${num} ${unitSuffix}` : `${num}`;
                    const isAlreadyAdded = valuesList.includes(label);

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleAddBox(label)}
                        className={`min-w-[50px] h-10 px-3 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isAlreadyAdded
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300 shadow-2xs'
                        }`}
                        title={isAlreadyAdded ? 'Already added' : `Add box ${label}`}
                      >
                        <span>{label}</span>
                        {isAlreadyAdded ? (
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        ) : (
                          <Plus className="w-3 h-3 text-slate-400 stroke-[3]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ADD CUSTOM VALUE BOX INPUT */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Or Enter Any Custom Value Box:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 20, 50, 100, 200, 500 ml, XL, Red..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBox(customInput);
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddBox(customInput)}
                    disabled={!customInput.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Add Box</span>
                  </button>
                </div>
              </div>

              {/* CURRENT ACTIVE VALUE BOXES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Current Value Boxes
                    </label>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                      {valuesList.length} boxes
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {valuesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setValuesList(naturalSortValues(valuesList))}
                        className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                        title="Sort boxes naturally (20, 50, 100, 200)"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Sort 1 &rarr; 9</span>
                      </button>
                    )}
                    {valuesList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setValuesList([])}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>
                </div>

                {valuesList.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-xs text-slate-400 font-medium">
                      No boxes added yet. Click any of the default boxes (20, 50, 100, 200) above or type a custom value.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-56 overflow-y-auto">
                    {valuesList.map((val, idx) => {
                      const isEditing = editingIndex === idx;

                      if (isEditing) {
                        return (
                          <div key={idx} className="flex items-center gap-1 bg-white p-1 rounded-xl border-2 border-emerald-500 shadow-xs">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="px-2 py-0.5 text-xs font-black text-slate-900 focus:outline-none w-20"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editingText.trim()) {
                                  setValuesList(prev => {
                                    const next = [...prev];
                                    next[idx] = editingText.trim();
                                    return next;
                                  });
                                }
                                setEditingIndex(null);
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="min-w-[56px] h-12 px-3.5 bg-white hover:bg-emerald-50/60 border-2 border-slate-200 hover:border-emerald-400 rounded-xl flex items-center justify-center font-black text-slate-800 text-xs shadow-2xs relative group transition-all"
                        >
                          <span
                            onClick={() => {
                              setEditingIndex(idx);
                              setEditingText(val);
                            }}
                            className="cursor-pointer"
                            title="Click to edit"
                          >
                            {val}
                          </span>

                          <div className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveBox(idx)}
                              className="w-4 h-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title={`Delete box "${val}"`}
                            >
                              <X className="w-2.5 h-2.5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save to Database</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Attribute"
        message={`Are you sure you want to remove "${deleteTarget?.name}"? It will be deleted from the database.`}
        confirmText="Yes, delete attribute"
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
