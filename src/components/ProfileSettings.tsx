import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { 
  User, CheckCircle, Phone, Mail, MapPin, Lock, ShieldCheck,
  Building2, KeyRound, QrCode, Receipt, ChevronDown, Download,
  Image as ImageIcon, Upload, X, Palette, Store, Check, Sparkles, Share2, Globe
} from 'lucide-react';
import { dbService } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { compressImage } from '../lib/imageUtils';
import { uploadDataUrlToStorage } from '../lib/storageService';
import { FeedbackDialog } from './ui/FeedbackDialog';

interface ProfileSettingsProps {
  adminEmail: string;
}

const BRAND_COLOR_PRESETS = [
  { name: 'Rose Red (Default)', hex: '#e11d48' },
  { name: 'Teal Green', hex: '#0f766e' },
  { name: 'Emerald Green', hex: '#16a34a' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Indigo Purple', hex: '#6366f1' },
  { name: 'Deep Orange', hex: '#ea580c' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Slate Dark', hex: '#0f172a' },
];

export default function ProfileSettings({ adminEmail }: ProfileSettingsProps) {
  // Store Details state
  const [storeName, setStoreName] = useState('ETTADI MART');
  const [companyName, setCompanyName] = useState('Ettadi Mart');
  const [storeTagline, setStoreTagline] = useState('China Imported Varieties & Smart Lifestyle Products');
  const [topAnnouncementText, setTopAnnouncementText] = useState('🔥 চায়না থেকে সরাসরি আমদানিকৃত সেরা ট্রেন্ডি গ্যাজেটস ও ভ্যারাইটিজ সমগ্র | সারা দেশে ক্যাশ অন ডেলিভারি!');
  const [phone, setPhone] = useState('01726275850');
  const [email, setEmail] = useState('support@ettadimart.com');
  const [street, setStreet] = useState('Dhaka, Bangladesh');
  const [industry, setIndustry] = useState('General E-Commerce');

  // Social Media Links state
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('01700000000');
  const [hotlinePhone, setHotlinePhone] = useState('09678812525');
  const [calloutBannerText, setCalloutBannerText] = useState('Have any questions? Inquire about orders, products or delivery directly');
  const [calloutBannerSubtext, setCalloutBannerSubtext] = useState('Our customer support and WhatsApp team are always ready to assist you');
  const [showCalloutBanner, setShowCalloutBanner] = useState(true);

  // Dual Hero Banners (NaturoBD Style)
  const [heroBannerLeftImage, setHeroBannerLeftImage] = useState('');
  const [heroBannerLeftLink, setHeroBannerLeftLink] = useState('');
  const [heroBannerRightImage, setHeroBannerRightImage] = useState('');
  const [heroBannerRightLink, setHeroBannerRightLink] = useState('');
  const [isUploadingBannerLeft, setIsUploadingBannerLeft] = useState(false);
  const [isUploadingBannerRight, setIsUploadingBannerRight] = useState(false);

  // Store Identity & Branding state
  const [storeLogo, setStoreLogo] = useState('');
  const [storeFavicon, setStoreFavicon] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#93c5fd');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Additional settings
  const [bearingRollLocation, setBearingRollLocation] = useState('Dhaka');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
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

  // Active Tab state: 'store_info' | 'social_media' | 'banners' | 'security'
  const [activeTab, setActiveTab] = useState<'store_info' | 'social_media' | 'banners' | 'security'>('store_info');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [info, ecomSettings] = await Promise.all([
          dbService.getInstituteInfo(),
          dbService.getEcomSettings()
        ]);

        if (info) {
          if (info.name) setCompanyName(info.name);
          if (info.phone) setPhone(info.phone);
          if (info.email) setEmail(info.email);
          if (info.address) setStreet(info.address);
          if (info.industry) setIndustry(info.industry);
          if (info.bearingRollLocation) setBearingRollLocation(info.bearingRollLocation);
          if (info.description) setStoreTagline(info.description);
          if (info.logo) setStoreLogo(info.logo);
          if (info.favicon) setStoreFavicon(info.favicon);
        }

        if (ecomSettings) {
          if (ecomSettings.storeName) setStoreName(ecomSettings.storeName);
          if (ecomSettings.companyName) setCompanyName(ecomSettings.companyName);
          if (ecomSettings.storeLogo) setStoreLogo(ecomSettings.storeLogo);
          if (ecomSettings.storeFavicon || (ecomSettings as any).favicon) {
            setStoreFavicon(ecomSettings.storeFavicon || (ecomSettings as any).favicon);
          }
          if (ecomSettings.storeTagline) setStoreTagline(ecomSettings.storeTagline);
          if (ecomSettings.topAnnouncementText) setTopAnnouncementText(ecomSettings.topAnnouncementText);
          if (ecomSettings.contactEmail) setEmail(ecomSettings.contactEmail);
          if (ecomSettings.contactPhone) setPhone(ecomSettings.contactPhone);
          if (ecomSettings.storeAddress) setStreet(ecomSettings.storeAddress);
          if (ecomSettings.primaryColor) setPrimaryColor(ecomSettings.primaryColor);
          if (ecomSettings.maintenanceMode !== undefined) setMaintenanceMode(ecomSettings.maintenanceMode);
          if (ecomSettings.hotlinePhone) setHotlinePhone(ecomSettings.hotlinePhone);
          if (ecomSettings.whatsappNumber) setWhatsappNumber(ecomSettings.whatsappNumber);
          if (ecomSettings.calloutBannerText !== undefined) setCalloutBannerText(ecomSettings.calloutBannerText);
          if (ecomSettings.calloutBannerSubtext !== undefined) setCalloutBannerSubtext(ecomSettings.calloutBannerSubtext);
          if (ecomSettings.showCalloutBanner !== undefined) setShowCalloutBanner(ecomSettings.showCalloutBanner);
          if (ecomSettings.heroBannerLeftImage !== undefined) setHeroBannerLeftImage(ecomSettings.heroBannerLeftImage);
          if (ecomSettings.heroBannerLeftLink !== undefined) setHeroBannerLeftLink(ecomSettings.heroBannerLeftLink);
          if (ecomSettings.heroBannerRightImage !== undefined) setHeroBannerRightImage(ecomSettings.heroBannerRightImage);
          if (ecomSettings.heroBannerRightLink !== undefined) setHeroBannerRightLink(ecomSettings.heroBannerRightLink);

          if (ecomSettings.socialLinks) {
            if (ecomSettings.socialLinks.facebook !== undefined) setFacebookUrl(ecomSettings.socialLinks.facebook);
            if (ecomSettings.socialLinks.instagram !== undefined) setInstagramUrl(ecomSettings.socialLinks.instagram);
            if (ecomSettings.socialLinks.youtube !== undefined) setYoutubeUrl(ecomSettings.socialLinks.youtube);
            if (ecomSettings.socialLinks.whatsapp !== undefined) setWhatsappNumber(ecomSettings.socialLinks.whatsapp);
          }
        }

        if (typeof (window as any).auth !== 'undefined' && (window as any).auth?.currentUser) {
          setDisplayName((window as any).auth.currentUser.displayName || '');
        }

      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const updateFaviconInDoc = (faviconUrl?: string) => {
    if (typeof document === 'undefined') return;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl || '/placeholder-favicon.svg';

    let shortcut = document.head.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
    if (shortcut) {
      shortcut.href = faviconUrl || '/placeholder-favicon.svg';
    }
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const compressedFile = await compressImage(file, 500);
      const downloadUrl = await uploadDataUrlToStorage(compressedFile, `store_assets/logo_${Date.now()}.jpg`);
      setStoreLogo(downloadUrl);
      setSuccessMsg('Logo loaded successfully! Click "Update Settings" to save.');
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setErrorMsg('Logo upload failed.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFavicon(true);
      const compressedFile = await compressImage(file, 128);
      const downloadUrl = await uploadDataUrlToStorage(compressedFile, `store_assets/favicon_${Date.now()}.png`);
      setStoreFavicon(downloadUrl);
      updateFaviconInDoc(downloadUrl);
      setSuccessMsg('Favicon loaded successfully! Click "Update Settings" to save.');
    } catch (err: any) {
      console.error('Error uploading favicon:', err);
      setErrorMsg('Favicon upload failed.');
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const handleBannerLeftUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingBannerLeft(true);
      const compressed = await compressImage(file, 1200);
      const url = await uploadDataUrlToStorage(compressed, `store_assets/banner_left_${Date.now()}.jpg`);
      setHeroBannerLeftImage(url);
      setSuccessMsg('Left banner uploaded! Click "Update Settings" to save.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to upload left banner.');
    } finally {
      setIsUploadingBannerLeft(false);
    }
  };

  const handleBannerRightUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingBannerRight(true);
      const compressed = await compressImage(file, 1200);
      const url = await uploadDataUrlToStorage(compressed, `store_assets/banner_right_${Date.now()}.jpg`);
      setHeroBannerRightImage(url);
      setSuccessMsg('Right banner uploaded! Click "Update Settings" to save.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to upload right banner.');
    } finally {
      setIsUploadingBannerRight(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const oldInst = await dbService.getInstituteInfo() || {} as any;
      await dbService.saveInstituteInfo({
        ...oldInst,
        name: companyName || storeName,
        logo: storeLogo,
        favicon: storeFavicon,
        description: storeTagline,
        phone,
        email,
        address: street,
        street,
        industry,
        bearingRollLocation
      });

      const oldEcom = await dbService.getEcomSettings() || {} as any;
      await dbService.saveEcomSettings({
        ...oldEcom,
        storeName,
        companyName,
        storeLogo,
        storeFavicon,
        favicon: storeFavicon,
        storeTagline,
        topAnnouncementText,
        contactEmail: email,
        contactPhone: phone,
        storeAddress: street,
        footerDescription: storeTagline,
        primaryColor,
        maintenanceMode,
        hotlinePhone,
        whatsappNumber,
        calloutBannerText,
        calloutBannerSubtext,
        showCalloutBanner,
        heroBannerLeftImage,
        heroBannerLeftLink,
        heroBannerRightImage,
        heroBannerRightLink,
        socialLinks: {
          facebook: facebookUrl,
          instagram: instagramUrl,
          youtube: youtubeUrl,
          whatsapp: whatsappNumber
        }
      });

      // Dynamically update favicon in document head
      updateFaviconInDoc(storeFavicon || storeLogo);

      if (typeof (window as any).auth !== 'undefined' && (window as any).auth?.currentUser && displayName.trim()) {
        try {
          if (typeof (window as any).updateProfile === 'function') {
            await (window as any).updateProfile((window as any).auth.currentUser, { displayName: displayName.trim() });
          }
        } catch (profileErr) {
          console.warn('Could not update Auth displayName:', profileErr);
        }
      }

      setIsSaving(false);
      setSuccessMsg('Store profile and information have been saved successfully.');
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'Store profile, branding, and contact settings have been successfully saved.'
      });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Error saving profile settings:', err);
      const errMsg = err.message || 'Failed to save settings.';
      setErrorMsg(errMsg);
      setIsSaving(false);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: errMsg
      });
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!newPassword || newPassword.length < 6) {
      const msg = 'New password must be at least 6 characters.';
      setErrorMsg(msg);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Password Error',
        message: msg
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirmation password do not match.';
      setErrorMsg(msg);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Password Error',
        message: msg
      });
      return;
    }

    setIsChangingPass(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({ currentPassword: currentPassword || '', newPassword })
      });

      if (!res.ok) {
        let msg = 'Failed to change password';
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch {
          // fallback
        }
        throw new Error(msg);
      }

      setSuccessMsg('Password changed successfully!');
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Password Updated',
        message: 'Your admin password has been changed successfully.'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = 'Password change failed: ' + (err.message || 'Please try again.');
      setErrorMsg(msg);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Password Error',
        message: msg
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading profile settings..." size="md" />
    );
  }

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Top Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Admin Profile & Store Settings</h2>
        <p className="text-slate-500 text-xs mt-0.5">Manage your store branding, footer info, contact details and admin info</p>
      </div>

      <div className="w-full space-y-5">
        {/* Modern Tab Navigation Pills */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('store_info')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'store_info'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Store & Address</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('social_media')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'social_media'
                ? 'bg-white text-blue-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Share2 className="w-4 h-4 text-blue-600" />
            <span>Social Media & Hotline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'banners'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span>Promotional Banners</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Lock className="w-4 h-4 text-slate-700" />
            <span>Security & Password</span>
          </button>
        </div>

        {/* Tab Content Cards */}
        <form onSubmit={handleSaveSettings} noValidate className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">

          {/* ========================================================
              TAB 1: STORE & ADDRESS (First Tab: Top to Address + Logo/Favicon)
              ======================================================== */}
          {activeTab === 'store_info' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                  Store & Brand Information
                </h3>
                <p className="text-slate-500 text-xs mt-1">Changes here will immediately appear in the website header, footer, and Contact Us page.</p>
                <div className="h-px bg-slate-100 mt-4" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Store Name</label>
                  <div className="relative rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 bg-white">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Store className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-semibold"
                      placeholder="e.g. ETTADI MART"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Company Name</label>
                  <div className="relative rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 bg-white">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-semibold"
                      placeholder="e.g. Brandini Co., Ltd."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Footer & Store Tagline</label>
                <div className="relative rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 bg-white">
                  <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                    <Sparkles className="h-5 w-5 text-slate-400" />
                  </div>
                  <textarea
                    value={storeTagline}
                    onChange={(e) => setStoreTagline(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none min-h-[80px] resize-y"
                    placeholder="e.g. Authentic, pure & lab-tested quality products delivered directly to your doorstep."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Customer Care Phone</label>
                  <div className="relative rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 bg-white">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-mono"
                      placeholder="e.g. +8801700000000"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Contact Email</label>
                  <div className="relative rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 bg-white">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-mono"
                      placeholder="e.g. support@yourstore.com"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Top Bar Announcement Text</label>
                <div className="relative rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 bg-white">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Sparkles className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={topAnnouncementText}
                    onChange={(e) => setTopAnnouncementText(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-semibold uppercase tracking-wider"
                    placeholder="e.g. WELCOME TO OUR OFFICIAL STORE"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Store Address</label>
                <div className="relative rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 bg-white">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-900 focus:outline-none"
                    placeholder="e.g. House 12, Road 4, Dhanmondi, Dhaka, Bangladesh"
                  />
                </div>
              </div>

              {/* Store Logo Section */}
              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  Store Logo
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Upload your brand logo for the website header, footer, and invoices. If no logo is uploaded, a clean placeholder logo is used.
                </p>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-6">
                    {storeLogo ? (
                      <div className="relative group">
                        <img 
                          src={storeLogo} 
                          alt="Store Logo" 
                          className="h-16 w-auto max-w-[14rem] object-contain bg-slate-50 border border-slate-200 rounded-xl p-2 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setStoreLogo('')}
                          className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg transition-opacity cursor-pointer"
                          title="Delete Logo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <img 
                          src="/placeholder-logo.svg" 
                          alt="Placeholder Logo" 
                          className="h-16 w-auto max-w-[14rem] object-contain bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-sm opacity-80"
                        />
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Placeholder Logo In Use
                        </span>
                      </div>
                    )}

                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-200">
                      <Upload className="h-3.5 w-3.5 text-slate-600" />
                      <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-1 max-w-lg">
                    <label className="text-[11px] font-semibold text-slate-500">Or Direct Logo Image Link (URL / Path):</label>
                    <input
                      type="text"
                      value={storeLogo}
                      onChange={(e) => setStoreLogo(e.target.value)}
                      placeholder="/uploads/... or https://example.com/logo.png"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Store Favicon Section */}
              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  Store Favicon (Browser Tab Icon)
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Upload your store&apos;s favicon shown in browser tabs and bookmarks. If not set, a placeholder icon is used.
                </p>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-6">
                    {storeFavicon ? (
                      <div className="relative group">
                        <div className="w-14 h-14 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-sm">
                          <img 
                            src={storeFavicon} 
                            alt="Store Favicon" 
                            className="w-10 h-10 object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStoreFavicon('');
                            updateFaviconInDoc('');
                          }}
                          className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg transition-opacity cursor-pointer"
                          title="Delete Favicon"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-slate-100 border border-dashed border-slate-300 rounded-xl p-2 flex items-center justify-center shadow-xs">
                          <img 
                            src="/placeholder-favicon.svg" 
                            alt="Placeholder Favicon" 
                            className="w-10 h-10 object-contain opacity-80"
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Placeholder Favicon In Use
                        </span>
                      </div>
                    )}

                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-200">
                      <Upload className="h-3.5 w-3.5 text-slate-600" />
                      <span>{isUploadingFavicon ? 'Uploading...' : 'Upload Favicon File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFaviconUpload}
                        disabled={isUploadingFavicon}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-1 max-w-lg">
                    <label className="text-[11px] font-semibold text-slate-500">Or Direct Favicon Image Link (URL / Path):</label>
                    <input
                      type="text"
                      value={storeFavicon}
                      onChange={(e) => {
                        setStoreFavicon(e.target.value);
                        updateFaviconInDoc(e.target.value);
                      }}
                      placeholder="/uploads/... or https://example.com/favicon.png"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: SOCIAL MEDIA & HOTLINE (Second Tab)
              ======================================================== */}
          {activeTab === 'social_media' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-600" />
                  Social Media & Contact Channels
                </h3>
                <p className="text-xs text-slate-500 mt-1">These links will be directly added to the top announcement bar, header hotline, floating widgets, and footer.</p>
                <div className="h-px bg-slate-100 mt-4" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Facebook Page URL</label>
                  <input
                    type="text"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/yourbrand"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">WhatsApp Contact / Order Number</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+8801700000000 or https://wa.me/..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Customer Hotline Number</label>
                  <input
                    type="text"
                    value={hotlinePhone}
                    onChange={(e) => setHotlinePhone(e.target.value)}
                    placeholder="09678812525"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Instagram Profile URL</label>
                  <input
                    type="text"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/yourbrand"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">YouTube Channel URL</label>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/@yourbrand"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: PROMOTIONAL BANNERS
              ======================================================== */}
          {activeTab === 'banners' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Dual Hero Banners */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left Banner */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Left Hero Banner (50% width)</span>
                      {heroBannerLeftImage && (
                        <button 
                          type="button" 
                          onClick={() => setHeroBannerLeftImage('')}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {heroBannerLeftImage ? (
                      <img 
                        src={heroBannerLeftImage} 
                        alt="Left Banner Preview" 
                        className="w-full h-28 object-cover rounded-lg border border-slate-200" 
                      />
                    ) : (
                      <div className="w-full h-28 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        No banner image uploaded
                      </div>
                    )}

                    <div className="flex gap-2">
                      <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer shrink-0">
                        {isUploadingBannerLeft ? 'Uploading...' : 'Upload Image'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBannerLeftUpload} 
                          disabled={isUploadingBannerLeft} 
                          className="hidden" 
                        />
                      </label>
                      <input 
                        type="text" 
                        value={heroBannerLeftImage} 
                        onChange={(e) => setHeroBannerLeftImage(e.target.value)} 
                        placeholder="/uploads/... or paste image URL" 
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Click Link / Destination URL</label>
                      <input 
                        type="text" 
                        value={heroBannerLeftLink} 
                        onChange={(e) => setHeroBannerLeftLink(e.target.value)} 
                        placeholder="/shop or https://..." 
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" 
                      />
                    </div>
                  </div>

                  {/* Right Banner */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Right Hero Banner (50% width)</span>
                      {heroBannerRightImage && (
                        <button 
                          type="button" 
                          onClick={() => setHeroBannerRightImage('')}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {heroBannerRightImage ? (
                      <img 
                        src={heroBannerRightImage} 
                        alt="Right Banner Preview" 
                        className="w-full h-28 object-cover rounded-lg border border-slate-200" 
                      />
                    ) : (
                      <div className="w-full h-28 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        No banner image uploaded
                      </div>
                    )}

                    <div className="flex gap-2">
                      <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer shrink-0">
                        {isUploadingBannerRight ? 'Uploading...' : 'Upload Image'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBannerRightUpload} 
                          disabled={isUploadingBannerRight} 
                          className="hidden" 
                        />
                      </label>
                      <input 
                        type="text" 
                        value={heroBannerRightImage} 
                        onChange={(e) => setHeroBannerRightImage(e.target.value)} 
                        placeholder="/uploads/... or paste image URL" 
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Click Link / Destination URL</label>
                      <input 
                        type="text" 
                        value={heroBannerRightLink} 
                        onChange={(e) => setHeroBannerRightLink(e.target.value)} 
                        placeholder="/shop or https://..." 
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: SECURITY & PASSWORD
              ======================================================== */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-slate-700" />
                  Security & System Settings
                </h3>
                <p className="text-xs text-slate-500 mt-1">Manage system maintenance mode and admin password credentials.</p>
                <div className="h-px bg-slate-100 mt-4" />
              </div>

              {/* Maintenance Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    Maintenance Mode
                  </h4>
                  <p className="text-xs text-slate-500">
                    When enabled, a maintenance notice will be displayed to all customers.
                  </p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="maintenance_toggle"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <label htmlFor="maintenance_toggle" className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600 cursor-pointer" />
                </div>
              </div>

              {/* Change Password Sub-form */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-slate-700" />
                  Change Admin Password
                </h4>
                <p className="text-xs text-slate-500">Update your administrator account password securely.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPass}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isChangingPass ? 'Updating Password...' : 'Change Password'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Bottom Bar: Permanent "Update Settings" Button */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <span className="text-xs text-slate-400 font-medium">
              Active Tab: <strong className="text-slate-700">{activeTab.replace('_', ' ').toUpperCase()}</strong>
            </span>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-[#134633] hover:bg-[#0e3829] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{isSaving ? 'Updating...' : 'Update Settings'}</span>
            </button>
          </div>
        </form>
      </div>

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
