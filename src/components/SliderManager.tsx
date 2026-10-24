import React, { useState, useEffect } from 'react';
import { EcomSettings, HeroBannerItem, Product } from '../types';
import { dbService } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Layout, Smartphone, Plus, Trash2, Save, RefreshCw, Check, Edit3, Image as ImageIcon, Upload, X, ExternalLink, ShoppingBag, ArrowUp, ArrowDown, CircleHelp, Copy, Video, Film, Play, Youtube
} from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { uploadDataUrlToStorage, uploadFileToStorage } from '../lib/storageService';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

export function extractYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

const IMAGE_ONLY_DESIGNER_GUIDELINE = `ZinniaMart — Only Image Slider Design Guideline

Recommended canvas: 1600 × 400 px (4:1 ratio)
Format: WebP or JPG
Maximum file size: 600 KB

Responsive display height:
• Mobile: 160 px
• Tablet: 224 px
• Medium desktop: 288 px
• Large desktop / 4K: 320 px

Important design rules:
• Keep the logo, main text, offer and products inside the center 50% safe area.
• Keep at least 60 px clear space at the top and bottom.
• Extend the background to every edge; the left and right sides may be cropped on mobile/tablet.
• Do not place important text or logos near the left or right edge.`;

export default function SliderManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    deliveryChargeInsideDhaka: 60,
    deliveryChargeOutsideDhaka: 110,
    heroBanners: []
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteTargetSlideId, setDeleteTargetSlideId] = useState<string | null>(null);
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

  // Edit Modal State
  const [editingBanner, setEditingBanner] = useState<HeroBannerItem | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#0f766e');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [bannerUploadTab, setBannerUploadTab] = useState<'website' | 'mobile'>('website');

  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [showImageGuideline, setShowImageGuideline] = useState(false);
  const [guidelineCopied, setGuidelineCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [ecomData, prodList] = await Promise.all([
          dbService.getEcomSettings(),
          dbService.getProducts()
        ]);
        setSettings({
          ...ecomData,
          heroBanners: ecomData.heroBanners || []
        });
        setProducts(prodList || []);
      } catch (err) {
        console.error('Failed to load slider settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveAll = async (updatedBanners?: HeroBannerItem[]) => {
    setIsSaving(true);
    setSaveSuccess(false);
    const bannersToSave = updatedBanners || settings.heroBanners || [];

    try {
      const currentFullSettings = await dbService.getEcomSettings();
      await dbService.saveEcomSettings({
        ...currentFullSettings,
        heroBanners: bannersToSave
      });
      window.dispatchEvent(new Event('ecom-settings-updated'));
      setSaveSuccess(true);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Slider has been saved!',
        message: 'Hero Slider data and banners saved successfully.'
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving slides:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'There was an error saving',
        message: 'There was a problem saving the slider banner. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewSlide = () => {
    const newSlide: HeroBannerItem = {
      id: `hb-${Date.now()}`,
      title: '',
      subtitle: '',
      badge: '',
      discountText: '',
      showDiscount: false,
      imageOnly: false,
      bgGradient: 'from-slate-900 via-rose-950 to-slate-900',
      imageUrl: '',
      link: '',
      actionType: 'external',
      productId: '',
      mediaType: 'image',
      videoType: 'youtube',
      youtubeUrl: '',
      videoUrl: ''
    };
    setShowImageGuideline(false);
    setGuidelineCopied(false);
    setEditingBanner(newSlide);
  };

  const handleEditSlide = (banner: HeroBannerItem) => {
    setShowImageGuideline(false);
    setGuidelineCopied(false);
    setEditingBanner(banner);
  };

  const handleCloseEditModal = () => {
    setShowImageGuideline(false);
    setGuidelineCopied(false);
    setEditingBanner(null);
  };

  const handleCopyImageGuideline = async () => {
    try {
      await navigator.clipboard.writeText(IMAGE_ONLY_DESIGNER_GUIDELINE);
      setGuidelineCopied(true);
      window.setTimeout(() => setGuidelineCopied(false), 2500);
    } catch (err) {
      console.error('Could not copy image guideline:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Could not be copied',
        message: 'Could not copy guideline text to clipboard. Please try again.'
      });
    }
  };

  const handleSaveModalSlide = () => {
    if (!editingBanner) return;

    const currentList = settings.heroBanners || [];
    const exists = currentList.some(b => b.id === editingBanner.id);

    let updatedList: HeroBannerItem[];
    if (exists) {
      updatedList = currentList.map(b => b.id === editingBanner.id ? editingBanner : b);
    } else {
      updatedList = [...currentList, editingBanner];
    }

    setSettings(prev => ({ ...prev, heroBanners: updatedList }));
    setEditingBanner(null);
    handleSaveAll(updatedList);
  };

  const handleRemoveSlide = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTargetSlideId(id);
  };

  const handleConfirmDeleteSlide = () => {
    if (!deleteTargetSlideId) return;
    const updatedList = (settings.heroBanners || []).filter(b => b.id !== deleteTargetSlideId);
    setSettings(prev => ({ ...prev, heroBanners: updatedList }));
    handleSaveAll(updatedList);
    setDeleteTargetSlideId(null);
  };

  const moveSlide = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const list = [...(settings.heroBanners || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setSettings(prev => ({ ...prev, heroBanners: list }));
    handleSaveAll(list);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBanner) return;

    setIsUploadingImage(true);
    try {
      // If mobile tab, compress to a narrower width, otherwise normal wide banner
      const maxWidth = bannerUploadTab === 'mobile' ? 800 : 1600;
      const compressed = await compressImage(file, maxWidth, 0.85, 600000);
      if (compressed) {
        try {
          const uploadedUrl = await uploadDataUrlToStorage(
            compressed,
            `ecom-banners/${bannerUploadTab}-${editingBanner.id}-${Date.now()}`
          );
          if (bannerUploadTab === 'mobile') {
            setEditingBanner(prev => prev ? { ...prev, mobileImageUrl: uploadedUrl, mediaType: 'image' } : null);
          } else {
            setEditingBanner(prev => prev ? { ...prev, imageUrl: uploadedUrl, mediaType: 'image' } : null);
          }
        } catch (storageError) {
          console.warn('Banner storage upload failed; using compressed fallback:', storageError);
          if (bannerUploadTab === 'mobile') {
            setEditingBanner(prev => prev ? { ...prev, mobileImageUrl: compressed, mediaType: 'image' } : null);
          } else {
            setEditingBanner(prev => prev ? { ...prev, imageUrl: compressed, mediaType: 'image' } : null);
          }
        }
      }
    } catch (err) {
      console.error('Slide image upload failed:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBanner) return;

    if (file.size > 50 * 1024 * 1024) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Video file size is large',
        message: '50MB or smaller in size MP4/WebM video file select।'
      });
      return;
    }

    setIsUploadingVideo(true);
    try {
      try {
        const videoUrl = await uploadFileToStorage(
          file,
          `ecom-banners/video-${editingBanner.id}-${Date.now()}.${file.name.split('.').pop() || 'mp4'}`
        );
        setEditingBanner(prev => prev ? { ...prev, videoUrl, mediaType: 'video', videoType: 'file' } : null);
      } catch (storageError) {
        console.warn('Video cloud storage upload failed, using local FileReader URL fallback:', storageError);
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const result = uploadEvent.target?.result as string;
          if (result) {
            setEditingBanner(prev => prev ? { ...prev, videoUrl: result, mediaType: 'video', videoType: 'file' } : null);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Video upload error:', err);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading Slider List..." size="md" />
    );
  }

  const heroBanners = settings.heroBanners || [];

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layout className="h-5 w-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Homepage slider and video banner (Hero Banners & Videos)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            See Slider List, New picture or uTUb/Video banner add And click action determine
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddNewSlide}
          className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:shadow-lg cursor-pointer gap-1.5" style={{ backgroundColor: primaryColor }}
        >
          <Plus className="h-4 w-4" />
          Add new slides/videos
        </button>
      </div>

      {/* Slider List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">
            List of current slides and videos ({heroBanners.length} T)
          </h3>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <Check className="h-4 w-4" /> has been saved!
            </span>
          )}
        </div>

        {heroBanners.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {heroBanners.map((banner, index) => {
              const linkedProduct = banner.productId ? products.find(p => p.id === banner.productId) : null;
              const isVideo = banner.mediaType === 'video';
              const ytId = isVideo && (banner.videoType === 'youtube' || !banner.videoType) ? extractYouTubeVideoId(banner.youtubeUrl) : null;

              return (
                <div
                  key={banner.id}
                  onClick={() => handleEditSlide(banner)}
                  className="p-4 sm:p-5 bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-md group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Slide Image / Video Preview */}
                    <div className="h-20 w-32 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center text-slate-400 relative">
                      {isVideo && ytId ? (
                        <div className="relative w-full h-full bg-black">
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                            alt={banner.title}
                            className="h-full w-full object-cover opacity-85"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <div className="p-1.5 bg-red-600 text-white rounded-full shadow-lg">
                              <Play className="h-4 w-4 fill-white" />
                            </div>
                          </div>
                        </div>
                      ) : isVideo && banner.videoUrl ? (
                        <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center text-white p-2">
                          <Film className="h-6 w-6 text-indigo-400 mb-1" />
                          <span className="text-[9px] font-bold text-slate-300">video file</span>
                        </div>
                      ) : banner.imageUrl ? (
                        <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-slate-500" />
                      )}

                      <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Media Type Badge */}
                        {isVideo ? (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            {banner.videoType === 'youtube'? 'YouTube video' : 'video file'}
                          </span>
                        ) : (
                          <span className="bg-sky-100 text-sky-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Image banner
                          </span>
                        )}

                        {banner.badge && (
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {banner.badge}
                          </span>
                        )}
                        {banner.discountText && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {banner.discountText}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                        {banner.title?.trim() || (isVideo ? `Video banner #${index + 1}` : `picture banner #${index + 1}`)}
                      </h4>

                      {banner.subtitle?.trim() ? (
                        <p className="text-xs text-slate-500 truncate">{banner.subtitle}</p>
                      ) : banner.imageOnly || (!banner.title?.trim() && !banner.badge?.trim()) ? (
                        <p className="text-[11px] text-slate-400 italic">Pure Media</p>
                      ) : null}

                      <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                        {banner.actionType === 'product' || banner.productId ? (
                          <span className="inline-flex items-center text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            <ShoppingBag className="h-3 w-3 mr-1" />
                            PRoDuct open: {linkedProduct ? linkedProduct.title : (banner.productId || 'Product link')}
                          </span>
                        ) : banner.link ? (
                          <span className="inline-flex items-center text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 max-w-xs truncate">
                            <ExternalLink className="h-3 w-3 mr-1 shrink-0" />
                            {banner.link}
                          </span>
                        ) : isVideo && banner.youtubeUrl ? (
                          <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 max-w-xs truncate">
                            <Youtube className="h-3 w-3 mr-1 shrink-0" />
                            {banner.youtubeUrl}
                          </span>
                        ) : (
                          <span className="text-slate-400">There are no action links attached</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => moveSlide(index, 'up', e)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl border border-slate-200/80 disabled:opacity-30 cursor-pointer"
                      title="move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === heroBanners.length - 1}
                      onClick={(e) => moveSlide(index, 'down', e)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl border border-slate-200/80 disabled:opacity-30 cursor-pointer"
                      title="move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditSlide(banner)}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      edit
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveSlide(banner.id, e)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-100 cursor-pointer"
                      title="Remove the slide"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <Layout className="h-10 w-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">There are currently no sliders or video banners added</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              'Add new slides/videos' First banner or video slider by clicking the buttonT create।
            </p>
            <button
              type="button"
              onClick={handleAddNewSlide}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              First slide add
            </button>
          </div>
        )}
      </div>

      {/* Slide Edit Modal */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center space-x-2">
                <Layout className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Sliders and video banners editing (Edit Slide / Video)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="p-6 space-y-5 text-xs font-sans max-h-[80vh] overflow-y-auto">

              {/* 1. MEDIA TYPE SELECTION CHIP (Image vs Video) */}
              {/* 1. MEDIA TYPE SELECTION CHIP (Image vs Video) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <label className="block font-bold text-slate-900 text-xs">
                  Select the media type (Media Type):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBanner({ ...editingBanner, mediaType: 'image' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      (editingBanner.mediaType || 'image') === 'image'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingBanner({
                      ...editingBanner,
                      mediaType: 'video',
                      videoType: editingBanner.videoType || 'youtube',
                      youtubeUrl: editingBanner.youtubeUrl || 'https://youtu.be/KkAAlMOrzaA?si=h_WJSRTJn-f_SBTLv'
                    })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      editingBanner.mediaType === 'video'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Video className="h-4 w-4" />
                    <span>Video / YouTube</span>
                  </button>
                </div>
              </div>

              {/* 2. IF IMAGE: Image Upload & Preview */}
              {(editingBanner.mediaType || 'image') === 'image' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setBannerUploadTab('website')}
                      className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition-colors cursor-pointer ${
                        bannerUploadTab === 'website' 
                          ? 'bg-white text-slate-900 border-t-2 border-t-indigo-600 border-r border-r-slate-200' 
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-t-2 border-t-transparent'
                      }`}
                    >
                      <Layout className="w-4 h-4" />
                      Website
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerUploadTab('mobile')}
                      className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition-colors cursor-pointer ${
                        bannerUploadTab === 'mobile' 
                          ? 'bg-white text-slate-900 border-t-2 border-t-indigo-600 border-r border-r-slate-200 border-l border-l-slate-200' 
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-t-2 border-t-transparent'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      Mobile
                    </button>
                  </div>

                  <div className="p-5">
                    {/* Upload Area */}
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#52c41a] bg-slate-50 hover:bg-emerald-50/50 rounded-xl cursor-pointer transition-colors group mb-4">
                      <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-slate-600 text-center mb-1 font-medium">
                        <span className="text-[#52c41a] font-bold">{isUploadingImage ? 'Uploading...' : 'Upload an image'}</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 font-bold mb-2">PNG, JPG</p>
                      <p className="text-xs text-slate-400">
                        {bannerUploadTab === 'website' ? '1920 x 600' : '800 x 800'}
                      </p>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
                    </label>
                    
                    {/* OR Link */}
                    <div className="mb-4">
                      <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                        Or provide Image URL directly:
                      </label>
                      <input
                        type="text"
                        placeholder={`https://example.com/banner-${bannerUploadTab}.jpg`}
                        value={bannerUploadTab === 'mobile' ? (editingBanner.mobileImageUrl || '') : (editingBanner.imageUrl || '')}
                        onChange={(e) => {
                          if (bannerUploadTab === 'mobile') {
                            setEditingBanner({ ...editingBanner, mobileImageUrl: e.target.value });
                          } else {
                            setEditingBanner({ ...editingBanner, imageUrl: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Preview Area */}
                    {((bannerUploadTab === 'mobile' && editingBanner.mobileImageUrl) || (bannerUploadTab === 'website' && editingBanner.imageUrl)) && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-1">
                        <img
                          src={bannerUploadTab === 'mobile' ? editingBanner.mobileImageUrl : editingBanner.imageUrl}
                          alt={`${bannerUploadTab} Banner Preview`}
                          className={bannerUploadTab === 'mobile' ? "w-full max-w-[300px] h-auto rounded-lg shadow-sm" : "w-full h-auto max-h-48 object-cover rounded-lg"}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (bannerUploadTab === 'mobile') {
                              setEditingBanner({ ...editingBanner, mobileImageUrl: '' });
                            } else {
                              setEditingBanner({ ...editingBanner, imageUrl: '' });
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-rose-500 rounded-full shadow-md transition-colors"
                          title="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. IF VIDEO: Video Source Options (YouTube Link vs Upload Video File) */}
              {editingBanner.mediaType === 'video' && (
                <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-4">
                  <div>
                    <label className="block font-bold text-slate-900 text-xs mb-1.5">
                      Choose the video source (Video Source):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        (editingBanner.videoType || 'youtube') === 'youtube'
                          ? 'bg-white border-rose-600 ring-2 ring-rose-500/20 shadow-2xs'
                          : 'bg-white/60 border-slate-200 hover:border-slate-300'
                      }`}>
                        <input
                          type="radio"
                          name="videoSourceType"
                          checked={(editingBanner.videoType || 'youtube') === 'youtube'}
                          onChange={() => setEditingBanner({ ...editingBanner, videoType: 'youtube' })}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">YouTube Link</span>
                          <span className="text-[10px] text-slate-500">Paste the YouTube URL</span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        editingBanner.videoType === 'file'
                          ? 'bg-white border-rose-600 ring-2 ring-rose-500/20 shadow-2xs'
                          : 'bg-white/60 border-slate-200 hover:border-slate-300'
                      }`}>
                        <input
                          type="radio"
                          name="videoSourceType"
                          checked={editingBanner.videoType === 'file'}
                          onChange={() => setEditingBanner({ ...editingBanner, videoType: 'file' })}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">Upload File</span>
                          <span className="text-[10px] text-slate-500">MP4 / WebM file or link</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* YouTube Link Input Area */}
                  {(editingBanner.videoType || 'youtube') === 'youtube' && (
                    <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs">
                      <label className="block font-bold text-slate-800 text-xs">
                        YouTube Paste the video link (YouTube URL):*
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Eg: https://youtu.be/KkAAlMOrzaA?si=h_WJSRTJn-f_SBTLv"
                          value={editingBanner.youtubeUrl || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, youtubeUrl: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        UTAny Uber video or shorts link here will automatically autoplay and loop in the background of the homepage।
                      </p>

                      {/* YouTube Live Embed Preview */}
                      {editingBanner.youtubeUrl && extractYouTubeVideoId(editingBanner.youtubeUrl) ? (
                        <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Play className="h-3.5 w-3.5 text-rose-600 fill-rose-600" /> Live preview (YouTube Embed Preview):
                          </span>
                          <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-slate-300 shadow-inner">
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${extractYouTubeVideoId(editingBanner.youtubeUrl)}?autoplay=0&controls=1&rel=0`}
                              title="YouTube video preview"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      ) : editingBanner.youtubeUrl ? (
                        <p className="text-xs text-rose-600 font-medium">⚠️such as: https://youtu.be/KkAAlMOrzaA</p>
                      ) : null}
                    </div>
                  )}

                  {/* Video File Upload Area */}
                  {editingBanner.videoType === 'file' && (
                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs">
                      <label className="block font-bold text-slate-800 text-xs">
                        MP4 / WebM video file Select or upload:
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <label className="cursor-pointer inline-flex items-center px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 shadow-2xs transition-colors">
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploadingVideo ? 'Uploading video...' : 'Upload the video file'}
                          <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} className="hidden" />
                        </label>
                        <span className="text-[11px] text-slate-400">
                          (Maximum size: 50MB, format: MP4 / WebM)
                        </span>
                      </div>

                      {/* Or Hosted Video URL */}
                      <div className="pt-2 border-t border-slate-100">
                        <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                          or hosted video fileof URL write down:
                        </label>
                        <input
                          type="text"
                          placeholder="/uploads/... or https://assets.mixkit.co/videos/.../video.mp4"
                          value={editingBanner.videoUrl || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, videoUrl: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      {/* Video Player Preview */}
                      {editingBanner.videoUrl && (
                        <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                              <Film className="h-3.5 w-3.5 text-rose-600" /> Uploaded video preview:
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingBanner({ ...editingBanner, videoUrl: '' })}
                              className="text-xs text-rose-600 hover:underline cursor-pointer font-bold"
                            >
                              video delete
                            </button>
                          </div>
                          <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-slate-300">
                            <video
                              controls
                              src={editingBanner.videoUrl}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. BANNER TEXT & OVERLAY SETTINGS (Optional / Clearable) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div>
                    <label className="block font-bold text-slate-900 text-xs">
                      Banner text and title (Banner Text Overlay - Optional)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      video or pictureIf you don't want any text on downLeave the boxes blank or 'Media only' Keep it on।
                    </p>
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs hover:border-indigo-400">
                    <input
                      type="checkbox"
                      checked={!!editingBanner.imageOnly}
                      onChange={(e) => setEditingBanner({ ...editingBanner, imageOnly: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-[11px] font-bold text-slate-700">Hide Text Overlay</span>
                  </label>
                </div>

                {!editingBanner.imageOnly && (
                  <div className="space-y-3 pt-1">
                    {/* Badge / Tag */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700 text-xs">
                          the badge / tag (Badge - Optional):
                        </label>
                        {editingBanner.badge && (
                          <button
                            type="button"
                            onClick={() => setEditingBanner({ ...editingBanner, badge: '' })}
                            className="text-[10px] text-rose-600 hover:underline font-bold"
                          >
                            delete
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="such as: Special offers or NEW ARRIVALYou can leave it blank"
                        value={editingBanner.badge || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    {/* Banner Title */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700 text-xs">
                          Banner ShiRoname (Title - Optional):
                        </label>
                        {editingBanner.title && (
                          <button
                            type="button"
                            onClick={() => setEditingBanner({ ...editingBanner, title: '' })}
                            className="text-[10px] text-rose-600 hover:underline font-bold"
                          >
                            delete
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Leave blank if not desired"
                        value={editingBanner.title || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    {/* Banner Subtitle */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700 text-xs">
                          the endRoname / details (Subtitle - Optional):
                        </label>
                        {editingBanner.subtitle && (
                          <button
                            type="button"
                            onClick={() => setEditingBanner({ ...editingBanner, subtitle: '' })}
                            className="text-[10px] text-rose-600 hover:underline font-bold"
                          >
                            delete
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Leave blank if not desired"
                        value={editingBanner.subtitle || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      />
                    </div>

                    {/* Button Text */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700 text-xs">
                          button text (Button Text - Optional):
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="For example: VIEW DETAILS or ORDER NOW"
                        value={editingBanner.buttonText || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, buttonText: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Click Action / Link Options */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <label className="block font-bold text-slate-900 text-xs">
                  Click on the slider key action will be? (Click Action)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    editingBanner.actionType === 'product'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/60 border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="actionType"
                      checked={editingBanner.actionType === 'product'}
                      onChange={() => setEditingBanner({ ...editingBanner, actionType: 'product' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-teal-600" />
                      <span className="font-bold text-slate-800">Specific product open</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    editingBanner.actionType !== 'product'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/60 border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="actionType"
                      checked={editingBanner.actionType !== 'product'}
                      onChange={() => setEditingBanner({ ...editingBanner, actionType: 'external' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-slate-800">Custom URL</span>
                    </div>
                  </label>
                </div>

                {/* Conditional Field 1: Select Product */}
                {editingBanner.actionType === 'product' ? (
                  <div className="pt-2">
                    <label className="block font-bold text-slate-700 mb-1">Select a store product:*</label>
                    <select
                      value={editingBanner.productId || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, productId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} (Tk.{(p as any).offerPrice || p.price || p.regularPrice})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Conditional Field 2: Custom External Link */
                  <div className="pt-2">
                    <label className="block font-bold text-slate-700 mb-1">Web link or URLExternal Link:</label>
                    <input
                      type="text"
                      placeholder="For example: /shop or https://example.com/special-offer"
                      value={editingBanner.link || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, link: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                canceled do
              </button>
              <button
                type="button"
                onClick={handleSaveModalSlide}
                className="px-6 py-2 hover:opacity-90 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5" style={{ backgroundColor: primaryColor }}
              >
                <Save className="h-4 w-4" />
                Save the slide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Centered Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Confirm Delete Slide Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetSlideId}
        type="danger"
        title="Delete the slide?"
        message="Are you sure you want to delete this banner slide?"
        confirmText="Yes, delete it"
        cancelText="canceled"
        onConfirm={handleConfirmDeleteSlide}
        onClose={() => setDeleteTargetSlideId(null)}
      />
    </div>
  );
}
