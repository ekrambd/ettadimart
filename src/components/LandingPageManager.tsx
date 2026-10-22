import React, { useState, useEffect } from 'react';
import { LandingPageData, Product } from '../types';
import { dbService, DEFAULT_LANDING_PAGE_SETTINGS, createDefaultLandingForProduct } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Save, Check, RefreshCw, ExternalLink, Image as ImageIcon, 
  Upload, BookOpen, Tag, Sparkles,
  Copy, Search, ArrowLeft, Package, Globe
} from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { getProductSlug, slugifyProductText } from '../lib/seoUtils';

export default function LandingPageManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customizedSlugs, setCustomizedSlugs] = useState<string[]>([]);
  const [landingStatusMap, setLandingStatusMap] = useState<Record<string, boolean>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [data, setData] = useState<LandingPageData>(DEFAULT_LANDING_PAGE_SETTINGS);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [prods, slugs, statusMap] = await Promise.all([
          dbService.getProducts(),
          dbService.getCustomizedLandingSlugs(),
          dbService.getLandingStatusMap()
        ]);
        if (prods) setProducts(prods);
        if (slugs) setCustomizedSlugs(slugs);
        if (statusMap) setLandingStatusMap(statusMap);
      } catch (err) {
        console.error('Error loading landing page hub:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
  }, []);

  const handleSelectProductToEdit = async (prod: Product) => {
    setIsLoading(true);
    setSelectedProduct(prod);
    try {
      const pSlug = prod.slug || getProductSlug(prod);
      const lpSettings = await dbService.getLandingPageSettings(pSlug, prod);
      const isEnabled = landingStatusMap[prod.id] !== undefined 
        ? landingStatusMap[prod.id] 
        : (lpSettings.isEnabled !== undefined ? lpSettings.isEnabled : true);
      
      // Ensure fallbacks are properly set to /placeholder-image.svg if empty
      setData({
        ...lpSettings,
        isEnabled,
        productId: prod.id,
        heroBookImage: lpSettings.heroBookImage || prod.image || '/placeholder-image.svg',
        mainBookImage: lpSettings.mainBookImage || prod.image || '/placeholder-image.svg'
      });
    } catch (err) {
      console.error('Error loading product landing settings:', err);
      setData(createDefaultLandingForProduct(prod));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToProductList = () => {
    setSelectedProduct(null);
    setSaveSuccess(false);
  };

  const handleQuickToggle = async (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    const pSlug = prod.slug || getProductSlug(prod);
    const currentStatus = landingStatusMap[prod.id] !== false;
    const newStatus = !currentStatus;

    setLandingStatusMap(prev => ({
      ...prev,
      [prod.id]: newStatus,
      [pSlug]: newStatus
    }));

    try {
      await dbService.toggleProductLandingEnabled(prod.id, pSlug, newStatus);
    } catch (err) {
      console.error('Failed to toggle landing status:', err);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const normalizedSlug = slugifyProductText(data.slug || (selectedProduct ? getProductSlug(selectedProduct) : data.bookTitle));
      const payloadToSave: LandingPageData = {
        ...data,
        slug: normalizedSlug,
        isEnabled: data.isEnabled !== false,
        productId: selectedProduct?.id || data.productId,
        productIds: selectedProduct ? [selectedProduct.id] : data.productIds
      };

      await dbService.saveLandingPageSettings(payloadToSave);
      setData(payloadToSave);
      
      if (selectedProduct) {
        setLandingStatusMap(prev => ({
          ...prev,
          [selectedProduct.id]: payloadToSave.isEnabled !== false,
          [normalizedSlug]: payloadToSave.isEnabled !== false
        }));
      }

      setCustomizedSlugs(prev => Array.from(new Set([...prev, normalizedSlug, selectedProduct?.id || ''])).filter(Boolean));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save landing page settings:', err);
      alert('There was a problem saving the landing page settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof LandingPageData) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImageKey(String(key));
    try {
      let finalDataUrl = '';
      // If file is under 800KB, use 100% original image without any compression
      if (file.size <= 800 * 1024) {
        finalDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // High-definition 2K resolution (2048px) with 95% quality
        finalDataUrl = await compressImage(file, 2048, 0.95, 850000);
      }

      if (finalDataUrl) {
        setData(prev => ({ 
          ...prev, 
          [key]: finalDataUrl,
          ...(key === 'heroBookImage' ? { mainBookImage: finalDataUrl } : {})
        }));
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingImageKey(null);
    }
  };

  const getCampaignUrl = (prodSlug?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanSlug = prodSlug || data.slug || 'product';
    return `${origin}/${cleanSlug}`;
  };

  const handleCopyLink = (prodSlug: string) => {
    const url = getCampaignUrl(prodSlug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(prodSlug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleOpenLive = (prodSlug?: string) => {
    const cleanSlug = prodSlug || data.slug || (selectedProduct ? getProductSlug(selectedProduct) : 'book');
    window.open(`/${cleanSlug}`, '_blank');
  };

  const filteredProducts = products.filter(p => {
    const query = searchTerm.toLowerCase();
    const title = (p.title || '').toLowerCase();
    const slug = (p.slug || getProductSlug(p)).toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return title.includes(query) || slug.includes(query) || cat.includes(query);
  });

  if (isLoading) {
    return (
      <div className="py-16">
        <CircularProgress label="Preparing landing page..." size="md" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: PRODUCT LIST HUB
  // =========================================================================
  if (!selectedProduct) {
    const totalEnabled = products.filter(p => landingStatusMap[p.id] !== false).length;

    return (
      <div className="space-y-6 font-sans max-w-6xl mx-auto pb-16">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-teal-800/40">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                Landing Page Manager
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                PRoDuct Landing Page and Campaign Manager
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                easily perT watchs landing page active do And Customize।
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/80 border border-teal-500/30 rounded-2xl px-4 py-3 text-center">
                <p className="text-[11px] text-slate-400 font-medium">Total product</p>
                <p className="text-xl font-extrabold text-white">{products.length}</p>
              </div>
              <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl px-4 py-3 text-center">
                <p className="text-[11px] text-emerald-400 font-medium">Active landing page</p>
                <p className="text-xl font-extrabold text-emerald-300">{totalEnabled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Counter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium shrink-0">
            showing: <span className="font-bold text-slate-800">{filteredProducts.length}</span> T PRoDuct
          </div>
        </div>

        {/* Products Table / List */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <Package className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No products found</h3>
            <p className="text-xs text-slate-400">Add new products from Product Manager</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Product Description</th>
                    <th className="py-3.5 px-4 text-center">Landing page status</th>
                    <th className="py-3.5 px-4">url</th>
                    <th className="py-3.5 px-4 text-right">action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProducts.map((prod) => {
                    const pSlug = prod.slug || getProductSlug(prod);
                    const isEnabled = landingStatusMap[prod.id] !== false;
                    const isCopied = copiedSlug === pSlug;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Product Info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={prod.image || '/placeholder-image.svg'} 
                              alt={prod.title} 
                              onError={(e) => {
                                const t = e.currentTarget;
                                if (!t.src.endsWith('/placeholder-image.svg')) t.src = '/placeholder-image.svg';
                              }}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                            />
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-bold text-slate-900 line-clamp-1 max-w-xs sm:max-w-sm" title={prod.title}>
                                {prod.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-teal-600">Tk.{prod.price}</span>
                                {prod.regularPrice && prod.regularPrice > prod.price && (
                                  <span className="text-slate-400 line-through text-[10px]">Tk.{prod.regularPrice}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleQuickToggle(e, prod)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isEnabled 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title={isEnabled ? 'Click to close the landing page' : 'Click to launch the landing page'}
                          >
                            <span className={`w-2 h-2 rounded-full mr-1.5 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {isEnabled ? 'Active' : 'Off'}
                          </button>
                        </td>

                        {/* Campaign Link */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <code className="text-[11px] font-mono text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-100 max-w-[200px] truncate">
                              /{pSlug}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(pSlug)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                              title="Copy the link"
                            >
                              {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenLive(pSlug)}
                              className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                              title="Watch the live preview"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-500" />
                              preview
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectProductToEdit(prod)}
                              className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-all shadow-xs cursor-pointer text-xs"
                              title="Edit this product's landing page"
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1" />
                              Edit page
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
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: STREAMLINED PRODUCT LANDING PAGE EDITOR
  // =========================================================================
  const activeCampaignUrl = getCampaignUrl(data.slug);

  return (
    <div className="space-y-6 font-sans w-full pb-16">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-teal-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleBackToProductList}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 hover:text-white transition-colors cursor-pointer bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-full border border-teal-500/30"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All pRoDuct the listE go back
            </button>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-400" />
              {selectedProduct.title} - Landing Page Editor
            </h2>
            <p className="text-slate-300 text-xs max-w-xl leading-relaxed">
              This is easy watchTitle, price, banner picture and variant confeegar।
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="inline-flex items-center px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-950" />
                  saved!
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  save
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleOpenLive(data.slug)}
              title="Watch the live preview"
              className="inline-flex items-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white text-xs font-bold rounded-xl border border-teal-500/30 transition-all cursor-pointer shadow-md"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Live preview
            </button>
          </div>
        </div>
      </div>

      {/* Generated Campaign Link & Status Box */}
      <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Campaign link (URL):
            </span>
            {data.isEnabled !== false ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                ✓ active (Live)
              </span>
            ) : (
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                ✕ inactive (Disabled)
              </span>
            )}
          </div>
          <p className="text-sm font-mono text-white font-black break-all">
            {activeCampaignUrl}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCopyLink(data.slug)}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              copiedSlug === data.slug
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md'
            }`}
          >
            {copiedSlug === data.slug ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                link Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                campaign Copy the link
              </>
            )}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center shadow-xs">
          <Check className="h-4 w-4 mr-2 text-emerald-600 shrink-0" />
          Landing page Saved successfully has been!
        </div>
      )}

      {/* Clean Streamlined Editor Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle Enable/Disable Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900">Enable</h3>
            <p className="text-xs text-slate-500">If on, visitors will see an attractive landing page if they enter the direct link</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={data.isEnabled !== false}
              onChange={(e) => setData({ ...data, isEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        {/* Section 1: URL Slug, Title & Pricing */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. URL, title and price settings</h3>
              <p className="text-[11px] text-slate-500">Campaign URL path, original heading and offer price</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slug */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                Campaign URL slag (URL Slug) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                  {typeof window !== 'undefined' ? window.location.host : 'watchstore.com'}/
                </span>
                <input
                  type="text"
                  value={data.slug}
                  onChange={(e) => setData({ ...data, slug: slugifyProductText(e.target.value) })}
                  required
                  placeholder="eg: casio-ae-1200whl"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-teal-700 focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setData({ ...data, slug: slugifyProductText(data.bookTitle || selectedProduct.title) })}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                  title="Create auto slag from title"
                >
                  Auto slag
                </button>
              </div>
            </div>

            {/* Product Title */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                Landing page main shiRoname (Headline) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.bookTitle}
                onChange={(e) => setData({ ...data, bookTitle: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                placeholder="For example: CASIO ROYALE AE-1200 CHAIN VERSION"
              />
            </div>

            {/* Offer Price */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Offer price (sales price Tk.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={data.offerPrice || ''}
                onChange={(e) => setData({ ...data, offerPrice: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold font-mono text-emerald-700"
                placeholder="For example: 999"
              />
            </div>

            {/* Regular Price */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Regular price (to cut price Tk.)
              </label>
              <input
                type="number"
                value={data.regularPrice || ''}
                onChange={(e) => setData({ ...data, regularPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-600"
                placeholder="For example: 1650"
              />
            </div>

            {/* WhatsApp Helpline */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                WhatsApp Helpline Number
              </label>
              <input
                type="text"
                value={data.whatsAppNumber || ''}
                onChange={(e) => setData({ ...data, whatsAppNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium font-mono"
                placeholder="Eg: 01847946163"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Subtitles or short tags
              </label>
              <input
                type="text"
                value={data.bookSubtitle || ''}
                onChange={(e) => setData({ ...data, bookSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                placeholder="For example: CASIO AE-1200 Watch"
              />
            </div>

            {/* Hero Description */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                Brief and interesting feefour
              </label>
              <textarea
                rows={3}
                value={data.heroDescription || ''}
                onChange={(e) => setData({ ...data, heroDescription: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                placeholder="World Time (48 Cities), LED Backlight, Stopwatch (1/100 sec), 5 Daily Alarms..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Section 2: Banner Image */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">2.Top Primary Image</h3>
              <p className="text-[11px] text-slate-500">Main top banner or large clock image on landing page</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary image preview and upload (HD / Original)
              </label>
              <div className="flex items-center space-x-3">
                <img 
                  src={data.heroBookImage || data.mainBookImage || '/placeholder-image.svg'} 
                  alt="Hero Preview" 
                  onError={(e) => {
                    const t = e.currentTarget;
                    if (!t.src.endsWith('/placeholder-image.svg')) t.src = '/placeholder-image.svg';
                  }}
                  className="h-20 w-20 rounded-xl object-cover border border-slate-200 bg-slate-50 p-1 shadow-xs shrink-0" 
                />
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs">
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      {uploadingImageKey === 'heroBookImage' ? 'Uploading...' : 'Upload clear HD images'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'heroBookImage')}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setData(prev => ({ ...prev, heroBookImage: '/placeholder-image.svg', mainBookImage: '/placeholder-image.svg' }))}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors border border-slate-200"
                    >
                      Reset to placeholder
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Images below 800 KB will be saved in 100% original quality without any compression</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                or pictureDirect link to / URL
              </label>
              <input
                type="text"
                value={data.heroBookImage || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setData(prev => ({
                    ...prev,
                    heroBookImage: val,
                    mainBookImage: val
                  }));
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="For example: /placeholder-image.svg or https://.../image.jpg"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Campaign & Offer Ticker */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">3. Campaign banner and offer text</h3>
              <p className="text-[11px] text-slate-500">Top golden badge and order offer/lucky draw text</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Banner Golden Badge (Top Badge)
              </label>
              <input
                type="text"
                value={data.campaignBadgeText || ''}
                onChange={(e) => setData({ ...data, campaignBadgeText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                placeholder="Ex: 🏆 Winner will get Yamaha R15 bike"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Offer ribbon / Lucky draw text
              </label>
              <input
                type="text"
                value={data.campaignTickerText || ''}
                onChange={(e) => setData({ ...data, campaignTickerText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                placeholder="Eg: Order contains lucky coupon to win Yamaha R15."
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
