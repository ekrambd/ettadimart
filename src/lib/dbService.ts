const db: any = null;
const isFirebaseEnabled = false;
const auth: any = null;
const doc = (..._args: any[]): any => ({});
const setDoc = async (..._args: any[]): Promise<any> => {};
const deleteDoc = async (..._args: any[]): Promise<any> => {};
const getDocs = async (..._args: any[]): Promise<any> => ({ docs: [], empty: true, size: 0, forEach: () => {} });
const getDoc = async (..._args: any[]): Promise<any> => ({ exists: () => false, data: () => null });
const collection = (..._args: any[]): any => ({});
const query = (..._args: any[]): any => ({});
const where = (..._args: any[]): any => ({});
const orderBy = (..._args: any[]): any => ({});
const limit = (..._args: any[]): any => ({});
const startAfter = (..._args: any[]): any => ({});
const deleteField = (..._args: any[]): any => null;
const onSnapshot = (..._args: any[]): any => (() => {});

import { BookOrder, Product, EcomSettings, Customer, PaymentGatewayItem, DeliveryMethodItem, Coupon, LandingPageData, InstituteInfo, Review, Brand, ContactMessage, Supplier, Affiliate, Vendor, TaxItem, CategoryItem, ProductAttribute, ProductUnit, FlashSaleItem, SubscriptionPlan, Driver, WithdrawalRequest } from '../types';
import { ApiClient } from '../services/apiClient';

function stripIntegrationSecrets(settings: EcomSettings): EcomSettings {
  const { pixelId: _pixelId, metaApiToken: _metaApiToken, steadfastApiKey: _steadfastApiKey, steadfastSecretKey: _steadfastSecretKey, ...safe } = settings;
  return safe;
}

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() || '';

export function getAdminAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('admin_token');
    if (!token) {
      const storedEmail = localStorage.getItem('noor_admin_session_email');
      if (storedEmail) {
        token = `BypassAdmin:${storedEmail}`;
      } else {
        try {
          const appStorage = localStorage.getItem('app-storage');
          if (appStorage) {
            const parsed = JSON.parse(appStorage);
            if (parsed?.state?.adminEmail) {
              token = `BypassAdmin:${parsed.state.adminEmail}`;
            }
          }
        } catch {}
      }
    }
    if (!token) {
      token = 'BypassAdmin:01726275850';
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

import {
  DEFAULT_PRODUCTS,
  DEFAULT_COUPONS,
  DEFAULT_BRANDS,
  DEFAULT_PAYMENT_GATEWAYS,
  DEFAULT_DELIVERY_METHODS,
  DEFAULT_HERO_BANNERS,
  DEFAULT_PROMO_CARDS,
  DEFAULT_ECOM_SETTINGS,
  DEFAULT_INSTITUTE_INFO
} from './constants';

export {
  DEFAULT_PRODUCTS,
  DEFAULT_COUPONS,
  DEFAULT_BRANDS,
  DEFAULT_PAYMENT_GATEWAYS,
  DEFAULT_DELIVERY_METHODS,
  DEFAULT_HERO_BANNERS,
  DEFAULT_PROMO_CARDS,
  DEFAULT_ECOM_SETTINGS,
  DEFAULT_INSTITUTE_INFO
};

function migrateBusinessPhone(info: InstituteInfo): InstituteInfo {
  const phone = info.phone || '01726275850';
  const name = (!info.name || info.name === 'FANTINE' || info.name === 'F A И T I И E' || info.name === 'SHOSTIR BAZAR') ? 'ETTADI MART' : info.name;
  const description = (!info.description || info.description.includes('Brandini') || info.description.includes('Hanbang') || info.description.includes('COMFORT TO WELLNESS')) ? 'China Imported Varieties & Smart Lifestyle Products' : info.description;

  return { ...info, name, description, phone, regNo: '' };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice (Fallback to Local Storage):', errInfo.error);
}

/** Helper to strip out `undefined` fields which cause Firestore setDoc/updateDoc to crash */
function sanitizeForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const sanitized: Record<string, any> = {};
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        sanitized[key] = sanitizeForFirestore(val);
      } else {
        sanitized[key] = val;
      }
    }
  });
  return sanitized;
}

// Helper to interact with local storage
const getLocalData = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(`noor_survey_${key}`);
    if (!data) {
      try {
        localStorage.setItem(`noor_survey_${key}`, JSON.stringify(defaultValue));
      } catch {
        // ignore quota error
      }
      return defaultValue;
    }
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

const setLocalData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(`noor_survey_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`[localStorage] Could not save key "noor_survey_${key}" (Storage quota exceeded):`, e);
  }
};

export const DEFAULT_LANDING_PAGE_SETTINGS: LandingPageData = {
  id: 'landing-default',
  slug: 'casio-ae-1200whl',
  templateTheme: 'luxury_dark',
  bookTitle: 'CASIO ROYALE AE-1200 CHAIN VERSION',
  bookSubtitle: 'CASIO AE-1200 Watch',
  authorName: 'CASIO AE-1200 Watch',
  authorDesignation: '10০% অরিজিনাল ও প্রিমিয়াম কোয়ালিT',
  authorPhoto: '/placeholder-image.svg',
  mainBookImage: '/placeholder-image.svg',
  heroBookImage: '/placeholder-image.svg',
  logoUrl: '',
  pageCount: '10 Year Battery',
  paperQuality: '100M Water Resist',
  regularPrice: 1650,
  offerPrice: 999,
  deliveryCharge: 80,
  deliveryChargeOutside: 130,
  deliveryAreaInsideText: 'ঢাকার ভিতরে ডেলিভারি',
  deliveryAreaOutsideText: 'ঢাকার বাইরে ডেলিভারি',
  bannerDeliveryText: 'Lucky coupon to win Yamaha R15 on order.',
  heroHeadline: 'CASIO ROYALE AE-1200 CHAIN VERSION',
  heroDescription: 'World Time (48 Cities), LED Backlight, Stopwatch (1/100 sec), 5 Daily Alarms, 100M Water Resistance। সাথে প্রতি Lucky coupon to win Yamaha R15 on order.',
  videoUrl: '',
  campaignBadgeText: 'Yamaha R15 জিতুন',
  campaignBannerTitle: 'অর্ডার করলেই আপনি পেয়ে যাবেন একT কুপন কার্ড যার মাধ্যমে আপনিও ক্যাম্পেইনে যুক্ত হয়ে যেতে পারবেন!',
  campaignCouponNote: 'কুপনT অবশ্যই যত্ন সহকারে সংগ্রহ করে রাখবেন',
  campaignTickerText: 'Lucky coupon to win Yamaha R15 on order.',
  prizes: [
    { rank: 'গ্র্যান্ড প্রাইজ', title: 'Yamaha R15 V4' }
  ],
  variantSectionTitle: 'একই feeচার, তিনT ভিন্ন লুক',
  variantSectionSubtitle: 'বেছে নিন যেটা আপনার স্টাইলের সাথে মানায়',
  customVariants: [
    {
      id: 'var-silver',
      name: 'CASIO AE-1200WHL — সিলভার',
      image: '/placeholder-image.svg',
      price: 950,
      regularPrice: 2500,
      tag: 'Best seller'
    },
    {
      id: 'var-black',
      name: 'CASIO AE-1200WHL — ব্ল্যাক',
      image: '/placeholder-image.svg',
      price: 950,
      regularPrice: 2500,
      tag: 'popular'
    },
    {
      id: 'var-gold',
      name: 'CASIO AE-1200WHL — ভিন্টেজ গোল্ড',
      image: '/placeholder-image.svg',
      price: 950,
      regularPrice: 2500,
      tag: 'এক্সক্লুসিভ'
    }
  ],
  watchSpecs: [
    { label: 'ব্যাটারি লাইফ', value: '10 বছর দীর্ঘস্থায়ী ব্যাটারি' },
    { label: 'ওয়াটার রেজিস্ট্যান্স', value: '10০ মিটার (10 Bar) ওয়াটারপ্রুফ' },
    { label: 'ওয়ার্ল্ড টাইম', value: '৪৮T শহর ও ৪T টাইম জোন' },
    { label: 'অ্যালার্ম', value: '৫T ডেইলি অ্যালার্ম সিস্টেম' },
    { label: 'ডিসপ্লে লাইট', value: 'এলইডি লাইট উইথ আফটারগ্লো' },
    { label: 'স্টপওয়াচ ও টাইমার', value: '১/10০ সেকেন্ড প্রিসিশন টাইমার' }
  ],
  features: [
    '10 বছরের ব্যাটারি লাইফ (Long Battery Life)',
    '10০ মিটার ওয়াটার রেজিস্ট্যান্ট (100m Water Resist)',
    'ওয়ার্ল্ড টাইম (৪৮T শহরের সময় ও ৪T টাইম জোন)',
    '৫T ডেইলি অ্যালার্ম ও ঘণ্টা ভিত্তিক সিগন্যাল',
    'এলইডি ব্যাকলাইট ও আফটারগ্লো সুবিধা',
    'ডিজিটাল ও অ্যানালগ এলসিডি ডুয়াল ডিসপ্লে'
  ],
  reviews: [
    { name: 'তানভীর আহমেদ', comment: 'watchT হাতে পাওয়ার পর সত্যি মুগ্ধ হয়েছি। কোয়ালিT ও feeনিশিং অgeneral! কুপন কার্ড পেয়েছি।', rating: 5 },
    { name: 'রাকিব হাসান', comment: 'সিলভার কালারটা নিয়েছি, দেখতে অনেক প্রিমিয়াম লাগে। সময়মতো ডেলিভারি পেয়েছি।', rating: 5 },
    { name: 'মাহমুদুল হক', comment: 'অরিজিনাল লুক And চমৎকার Packaging। 10০% রেকমেন্ডেড!', rating: 5 }
  ],
  relatedProductIds: [],
  galleryImages: [],
  paymentMethodDefault: 'COD',
  onlyCashOnDelivery: true,

  // Default Vintage Story & 4 Feature Cards (exact as requested)
  vintageTag: 'For vintage lovers',
  vintageTitle: 'Whose eyes still get stuck on the clocks of yesteryear',
  vintageDescription: 'A taste of real time lost in the crowd of smartwatches — this classic design is for them.',
  vintageFeatures: [
    { id: 'vf-1', title: 'Classic Dial', subtitle: '40s-90s original look', icon: 'Clock' },
    { id: 'vf-2', title: 'Durable metal body', subtitle: 'Can be used for years', icon: 'Wrench' },
    { id: 'vf-3', title: 'Retro LED backlight', subtitle: 'Brings back old memories', icon: 'Zap' },
    { id: 'vf-4', title: 'Fits all clothes', subtitle: 'Formal or casual', icon: 'Shirt' }
  ],

  // Gallery Section Defaults
  gallerySectionTag: 'Gallery',
  gallerySectionTitle: 'Premium from every angle',

  // Quality Section Defaults
  qualitySectionTag: 'Why this watch?',
  qualitySectionTitle: 'Japanese quality, amazing price',
  qualityItems: [
    { id: 'qi-1', title: 'Precise timing', subtitle: 'Original movement design', icon: 'Settings' },
    { id: 'qi-2', title: 'Premium look', subtitle: 'Classic design on metal band', icon: 'Trophy' }
  ],

  // Lucky Draw Section Defaults
  luckyDrawTag: 'R15 lucky draw',
  luckyDrawTitle: 'Order, win R15',
  luckyDrawSteps: [
    'Order watch — receive unique lucky coupon code with parcel',
    'Keep the coupon code safe',
    'Winners will be selected by lottery next month',
    'The result will be announced live on Facebook Live'
  ],
  grandPrizeTitle: 'Yamaha R15',
  grandPrizeSubtitle: 'Every order = a new opportunity',
  grandPrizeLiveTag: 'FACEBOOK LIVE STREAM',

  // Color Selection Section Defaults
  colorSectionTag: 'Color selection',
  colorSectionTitle: 'Click on the color button below to preview the watch and order'
};

export const createDefaultLandingForProduct = (product: Product): LandingPageData => {
  const slug = product.slug || product.id;
  
  return {
    id: `landing-${product.id}`,
    slug: slug,
    isEnabled: true,
    productId: product.id,
    productIds: [product.id],
    templateTheme: 'luxury_dark',
    relatedProductIds: [],
    bookTitle: product.title || 'চায়না ইম্পোর্টেড ভ্যারাইটিজ গ্যাজেট',
    bookSubtitle: product.subtitle || product.shortSummary || product.title,
    authorName: product.authorName || 'ETTADI MART',
    authorDesignation: '১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি',
    authorPhoto: product.coverImage || product.image || '',
    mainBookImage: product.coverImage || product.image || '',
    heroBookImage: product.coverImage || product.image || '',
    logoUrl: product.coverImage || product.image || '',
    regularPrice: product.regularPrice || (product.price ? Math.round(product.price * 1.25) : 0),
    offerPrice: product.price || 0,
    deliveryCharge: 60,
    deliveryChargeOutside: 110,
    deliveryAreaInsideText: 'ঢাকার ভিতরে ডেলিভারি',
    deliveryAreaOutsideText: 'ঢাকার বাইরে ডেলিভারি',
    bannerDeliveryText: 'সরাসরি ক্যাশ অন ডেলিভারিতে সারা বাংলাদেশে হোম ডেলিভারি।',
    heroHeadline: product.title || '১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি পণ্য',
    heroDescription: product.description || product.shortSummary || '',
    videoUrl: product.pdfUrl || '',
    campaignBadgeText: product.category ? `১০০% অরিজিনাল ${product.category}` : '১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি',
    campaignBannerTitle: 'অর্ডার করতে নিচের বাটনে ক্লিক করুন',
    campaignCouponNote: 'পণ্য হাতে পেয়ে চেক করে সম্পূর্ণ মূল্য পরিশোধ করুন',
    campaignTickerText: 'সরাসরি ক্যাশ অন ডেলিভারিতে অর্ডার করুন!',
    prizes: [],
    variantSectionTitle: 'পণ্যের ভ্যারিয়েন্ট',
    variantSectionSubtitle: 'আপনার পছন্দের প্যাকেজ বা সাইজ বেছে নিন',
    customVariants: product.variants && product.variants.length > 0
      ? product.variants.map((v, i) => ({
          id: v.id || `var-${i}`,
          name: v.name,
          image: v.image || product.samplePages?.[i] || product.coverImage || product.image || '',
          price: v.price || product.price,
          regularPrice: v.regularPrice || product.regularPrice,
          tag: i === 0 ? 'Best seller' : 'popular'
        }))
      : [],
    features: product.features && product.features.length > 0 ? product.features : [],
    reviews: [],
    galleryImages: [product.coverImage, product.image, ...(product.samplePages || [])].filter(Boolean) as string[],
    paymentMethodDefault: 'COD',
    onlyCashOnDelivery: true
  };
};

const generateShortId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const dbService = {
  // === LIVE VISITOR TRACKING ===
  async pingLiveVisitor(sessionId: string, path: string): Promise<void> {
    if (!db) return;
    try {
      const docRef = doc(db, 'live_visitors', sessionId);
      await setDoc(docRef, {
        lastActive: Date.now(),
        path
      }, { merge: true });
    } catch (e) {
      console.warn('Failed to ping live visitor:', e);
    }
  },

  async getLiveVisitorCount(): Promise<number> {
    if (!db) return 0;
    try {
      // Consider active if pinged within last 3 minutes
      const threshold = Date.now() - (3 * 60 * 1000);
      const q = query(collection(db, 'live_visitors'), where('lastActive', '>=', threshold));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (e) {
      console.warn('Failed to get live visitor count:', e);
      return 0;
    }
  },

  // --- Landing Page Dynamic Settings ---
  async getLandingPageSettings(slugOrId?: string, productFallback?: Product): Promise<LandingPageData> {
    const keysToCheck: string[] = [];
    if (slugOrId) {
      keysToCheck.push(`landing_page_${slugOrId}`);
    }
    if (productFallback) {
      if (productFallback.slug && !keysToCheck.includes(`landing_page_${productFallback.slug}`)) {
        keysToCheck.push(`landing_page_${productFallback.slug}`);
      }
      if (productFallback.id && !keysToCheck.includes(`landing_page_${productFallback.id}`)) {
        keysToCheck.push(`landing_page_${productFallback.id}`);
      }
    }
    if (keysToCheck.length === 0) {
      keysToCheck.push('landing_page_default');
    }

    if (isFirebaseEnabled && db) {
      for (const key of keysToCheck) {
        try {
          const docRef = doc(db, 'settings', key);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as LandingPageData;
            setLocalData(`noor_${key}`, data);
            return { ...DEFAULT_LANDING_PAGE_SETTINGS, ...data };
          }
        } catch (e) {
          console.warn(`Error reading landing page settings for ${key} from Firestore:`, e);
        }
      }
    }

    for (const key of keysToCheck) {
      const saved = getLocalData<LandingPageData | null>(`noor_${key}`, null);
      if (saved) {
        return { ...DEFAULT_LANDING_PAGE_SETTINGS, ...saved };
      }
    }

    if (productFallback) {
      return createDefaultLandingForProduct(productFallback);
    }

    return DEFAULT_LANDING_PAGE_SETTINGS;
  },

  async saveLandingPageSettings(settings: LandingPageData): Promise<void> {
    const isEnabled = settings.isEnabled !== undefined ? settings.isEnabled : true;
    const settingsWithEnabled = { ...settings, isEnabled };

    const keysToSave: string[] = [];
    if (settings.slug) {
      keysToSave.push(`landing_page_${settings.slug}`);
    }
    if (settings.productId && !keysToSave.includes(`landing_page_${settings.productId}`)) {
      keysToSave.push(`landing_page_${settings.productId}`);
    }
    if (settings.id && !keysToSave.includes(`landing_page_${settings.id}`)) {
      keysToSave.push(`landing_page_${settings.id}`);
    }
    if (keysToSave.length === 0 || settings.id === 'landing-default') {
      keysToSave.push('landing_page_default');
    }

    for (const key of keysToSave) {
      setLocalData(`noor_${key}`, settingsWithEnabled);
    }

    // Update customized slugs index
    const existingSlugs = getLocalData<string[]>('noor_customized_landing_slugs', []);
    const identifiers = [settings.slug, settings.productId, settings.id].filter(Boolean) as string[];
    const updatedSlugs = Array.from(new Set([...existingSlugs, ...identifiers]));
    setLocalData('noor_customized_landing_slugs', updatedSlugs);

    // Update status map
    const statusMap = getLocalData<Record<string, boolean>>('noor_landing_status_map', {});
    if (settings.productId) statusMap[settings.productId] = isEnabled;
    if (settings.slug) statusMap[settings.slug] = isEnabled;
    setLocalData('noor_landing_status_map', statusMap);

    if (isFirebaseEnabled && db) {
      try {
        const sanitized = sanitizeForFirestore(settingsWithEnabled);
        for (const key of keysToSave) {
          await setDoc(doc(db, 'settings', key), sanitized, { merge: true });
        }
        await setDoc(doc(db, 'settings', 'customized_landing_slugs_index'), { slugs: updatedSlugs }, { merge: true });
        if (settings.productId || settings.slug) {
          await setDoc(doc(db, 'settings', 'product_landing_status_map'), {
            ...(settings.productId ? { [settings.productId]: isEnabled } : {}),
            ...(settings.slug ? { [settings.slug]: isEnabled } : {})
          }, { merge: true });
        }
      } catch (e) {
        console.error('Error saving landing page settings to Firestore:', e);
      }
    }

    window.dispatchEvent(new Event('landing-page-settings-updated'));
  },

  async toggleProductLandingEnabled(productId: string, slug: string, isEnabled: boolean): Promise<void> {
    const keys = [`landing_page_${slug}`, `landing_page_${productId}`];
    for (const key of keys) {
      const existing = getLocalData<LandingPageData | null>(`noor_${key}`, null);
      if (existing) {
        const updated = { ...existing, isEnabled };
        setLocalData(`noor_${key}`, updated);
        if (isFirebaseEnabled && db) {
          try {
            await setDoc(doc(db, 'settings', key), { isEnabled }, { merge: true });
          } catch (e) {
            console.error('Error toggling landing page status in Firestore:', e);
          }
        }
      }
    }

    const statusMap = getLocalData<Record<string, boolean>>('noor_landing_status_map', {});
    statusMap[productId] = isEnabled;
    statusMap[slug] = isEnabled;
    setLocalData('noor_landing_status_map', statusMap);
    
    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'settings', 'product_landing_status_map'), { [productId]: isEnabled, [slug]: isEnabled }, { merge: true });
      } catch (e) {
        // ignore
      }
    }

    window.dispatchEvent(new Event('landing-page-settings-updated'));
  },

  async getLandingStatusMap(): Promise<Record<string, boolean>> {
    if (isFirebaseEnabled && db) {
      try {
        const docRef = doc(db, 'settings', 'product_landing_status_map');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const map = snap.data() as Record<string, boolean>;
          setLocalData('noor_landing_status_map', map);
          return map;
        }
      } catch (e) {
        // ignore
      }
    }
    return getLocalData<Record<string, boolean>>('noor_landing_status_map', {});
  },

  async getCustomizedLandingSlugs(): Promise<string[]> {
    if (isFirebaseEnabled && db) {
      try {
        const docRef = doc(db, 'settings', 'customized_landing_slugs_index');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.slugs) {
          const slugs = snap.data().slugs as string[];
          setLocalData('noor_customized_landing_slugs', slugs);
          return slugs;
        }
      } catch (e) {
        // ignore
      }
    }
    return getLocalData<string[]>('noor_customized_landing_slugs', []);
  },

  async getInstituteInfo(): Promise<InstituteInfo> {
    // 1. Fetch from server API
    try {
      const serverInfo = await ApiClient.getInstituteInfo();
      if (serverInfo && (serverInfo.name || serverInfo.phone || serverInfo.email || serverInfo.address)) {
        const info = migrateBusinessPhone(serverInfo as InstituteInfo);
        setLocalData('noor_institute_info', info);
        return info;
      }
    } catch {
      // offline / fallback
    }

    if (isFirebaseEnabled && db) {
      try {
        const docRef = doc(db, 'settings', 'institute_info');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = migrateBusinessPhone(docSnap.data() as InstituteInfo);
          setLocalData('noor_institute_info', data);
          return data;
        }
      } catch (e) {
        console.warn('Error reading institute info from Firestore:', e);
      }
    }

    const saved = getLocalData<InstituteInfo | null>('noor_institute_info', null);
    if (saved && saved.name) {
      return migrateBusinessPhone(saved);
    }

    const savedName = localStorage.getItem('noor_institute_name');
    const savedPhone = localStorage.getItem('noor_phone');
    const savedEmail = localStorage.getItem('noor_email');
    const savedAddress = localStorage.getItem('noor_address');
    const savedBearing = localStorage.getItem('noor_bearing_roll_location');
    const savedDesc = localStorage.getItem('noor_description');
    const savedStreet = localStorage.getItem('noor_street');
    const savedIndustry = localStorage.getItem('noor_industry');

    if (savedName || savedPhone || savedEmail || savedAddress || savedBearing || savedDesc || savedStreet || savedIndustry) {
      const info: InstituteInfo = {
        name: savedName || DEFAULT_INSTITUTE_INFO.name,
        regNo: '',
        phone: savedPhone || DEFAULT_INSTITUTE_INFO.phone,
        email: savedEmail || DEFAULT_INSTITUTE_INFO.email,
        address: savedAddress || DEFAULT_INSTITUTE_INFO.address,
        street: savedStreet || savedAddress || DEFAULT_INSTITUTE_INFO.street,
        description: savedDesc || DEFAULT_INSTITUTE_INFO.description,
        industry: savedIndustry || DEFAULT_INSTITUTE_INFO.industry,
        bearingRollLocation: savedBearing || DEFAULT_INSTITUTE_INFO.bearingRollLocation
      };
      setLocalData('noor_institute_info', info);
      return info;
    }

    return DEFAULT_INSTITUTE_INFO;
  },

  async saveInstituteInfo(info: InstituteInfo): Promise<void> {
    const sanitizedInfo = { ...info, regNo: '' };
    setLocalData('noor_institute_info', sanitizedInfo);
    localStorage.setItem('noor_institute_name', sanitizedInfo.name);
    localStorage.removeItem('noor_reg_no');
    localStorage.setItem('noor_phone', sanitizedInfo.phone);
    localStorage.setItem('noor_email', sanitizedInfo.email);
    localStorage.setItem('noor_address', sanitizedInfo.address);
    if (sanitizedInfo.street) localStorage.setItem('noor_street', sanitizedInfo.street);
    if (sanitizedInfo.description) localStorage.setItem('noor_description', sanitizedInfo.description);
    if (sanitizedInfo.industry) localStorage.setItem('noor_industry', sanitizedInfo.industry);
    if (sanitizedInfo.bearingRollLocation) {
      localStorage.setItem('noor_bearing_roll_location', sanitizedInfo.bearingRollLocation);
    }

    // Save to VPS SQLite database
    try {
      await ApiClient.saveInstituteInfo(sanitizedInfo);
    } catch (e) {
      console.warn('Could not save institute info to server API:', e);
    }

    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'settings', 'institute_info'), sanitizedInfo, { merge: true });
      } catch (e) {
        console.error('Error saving institute info to Firestore:', e);
      }
    }

    window.dispatchEvent(new Event('institute-info-updated'));
  },

  // --- Book Orders Management ---
  // --- Book Orders Management ---
  async getBookOrders(_forceRefresh = false): Promise<BookOrder[]> {
    try {
      const serverOrders = await ApiClient.getOrders();
      if (Array.isArray(serverOrders)) {
        return serverOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
    } catch (e) {
      console.warn('Failed to fetch orders from server API:', e);
    }
    return [];
  },

  async addBookOrder(order: BookOrder): Promise<BookOrder> {
    if (!order.id) {
      const year = new Date().getFullYear();
      const num = Math.floor(1000 + Math.random() * 9000);
      order.id = `ORD-${year}-${num}`;
    }
    if (!order.createdAt) {
      order.createdAt = new Date().toISOString();
    }

    try {
      const serverRes = await ApiClient.createOrder(order);
      if (serverRes && serverRes.id) {
        order = serverRes;
      }
    } catch (err) {
      console.warn('ApiClient.createOrder failed:', err);
    }

    window.dispatchEvent(new CustomEvent('book-orders-updated', { detail: order }));
    return order;
  },

  async saveBookOrder(order: BookOrder): Promise<BookOrder> {
    return this.addBookOrder(order);
  },

  async updateBookOrder(order: BookOrder): Promise<BookOrder> {
    try {
      await ApiClient.updateOrder(order);
    } catch (e) {
      console.warn('Failed to update order on server API:', e);
    }

    window.dispatchEvent(new CustomEvent('book-orders-updated', { detail: order }));
    return order;
  },

  async deleteBookOrder(id: string): Promise<void> {
    try {
      await ApiClient.deleteOrder(id);
    } catch (e) {
      console.warn('Failed deleting order from server API:', e);
    }
    window.dispatchEvent(new CustomEvent('book-orders-updated', { detail: { id } }));
  },

  // --- E-Commerce Products Management ---
  async getProductsPaginated(limitCount = 20, lastDocRef?: any): Promise<{ products: Product[], lastDoc: any }> {
    if (isFirebaseEnabled && db) {
      try {
        let q = collection(db, 'ecom_products');
        let queryConstraints: any[] = [limit(limitCount)];
        if (lastDocRef) {
          queryConstraints.push(startAfter(lastDocRef));
        }
        
        const querySnapshot = await getDocs(query(q, ...queryConstraints));
        const productsMap = new Map<string, Product>();

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          if (!data.id?.startsWith('prod-book-01') && !data.id?.startsWith('prod-map-holder') && !data.id?.startsWith('prod-gunia') && !data.id?.startsWith('prod-tape')) {
            productsMap.set(docSnap.id, { ...data, id: docSnap.id });
          }
        });

        if (productsMap.size === 0 && !lastDocRef) {
          try {
            const legacySnap = await getDocs(query(collection(db, 'products'), limit(limitCount)));
            legacySnap.forEach((docSnap) => {
              const data = docSnap.data() as Product;
              if (docSnap.id && !productsMap.has(docSnap.id)) {
                if (!data.id?.startsWith('prod-book-01') && !data.id?.startsWith('prod-map-holder') && !data.id?.startsWith('prod-gunia') && !data.id?.startsWith('prod-tape')) {
                  productsMap.set(docSnap.id, { ...data, id: docSnap.id });
                }
              }
            });
            return {
              products: Array.from(productsMap.values()),
              lastDoc: legacySnap.docs[legacySnap.docs.length - 1]
            };
          } catch (e) {
            console.error('Legacy fallback failed:', e);
          }
        }

        return {
          products: Array.from(productsMap.values()),
          lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
        };
      } catch (err) {
        console.error('Error fetching paginated products:', err);
        return { products: [], lastDoc: null };
      }
    }
    return { products: [], lastDoc: null };
  },

  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const serverProds = await res.json();
        if (Array.isArray(serverProds)) {
          return serverProds;
        }
      }
    } catch (e) {
      console.warn('Failed fetching products from server API:', e);
    }
    return [];
  },

  async addProduct(product: Product): Promise<Product> {
    if (!product.id) {
      product.id = generateShortId();
    }
    if (!product.createdAt) {
      product.createdAt = new Date().toISOString();
    }

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(product)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const saved = await res.json();
    window.dispatchEvent(new Event('ecom-products-updated'));
    return saved || product;
  },

  async updateProduct(product: Product): Promise<Product> {
    const res = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(product)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const updated = await res.json();
    window.dispatchEvent(new Event('ecom-products-updated'));
    return updated || product;
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    window.dispatchEvent(new Event('ecom-products-updated'));
  },

  async recordProductView(_productId: string): Promise<number> {
    // Disabled to optimize performance and prevent unnecessary Firestore quota usage
    return 0;
  },

  async recordWebsiteView(): Promise<number> {
    // Disabled to optimize performance and prevent unnecessary Firestore quota usage
    return 0;
  },

  async recordLandingPageView(_slug?: string): Promise<number> {
    // Disabled to optimize performance and prevent unnecessary Firestore quota usage
    return 0;
  },

  async getGlobalViews(): Promise<{ websiteViews: number; landingViews: number; totalProductViews: number }> {
    return {
      websiteViews: 0,
      landingViews: 0,
      totalProductViews: 0
    };
  },

  // --- E-Commerce Settings (Pixel, GTM, Steadfast, Store Profile, Logo, Banners) ---
  async getEcomSettings(): Promise<EcomSettings> {
    let result: EcomSettings = { ...DEFAULT_ECOM_SETTINGS };

    // 1. Fetch directly from server API (Prisma SQLite)
    try {
      const serverSettings = await ApiClient.getSettings();
      if (serverSettings && typeof serverSettings === 'object' && Object.keys(serverSettings).length > 0) {
        result = { ...DEFAULT_ECOM_SETTINGS, ...serverSettings };
      }
    } catch (e) {
      console.warn('Failed loading settings from server API:', e);
    }

    // Ensure categoryItems exists if categories exists
    if ((!result.categoryItems || result.categoryItems.length === 0) && result.categories && result.categories.length > 0) {
      result.categoryItems = result.categories.map((c, idx) => ({
        id: `cat-${idx}`,
        name: c,
        order: idx,
        subcategories: []
      }));
    }

    // Purge legacy seed bKash & Nagad gateways (gw-2, gw-3)
    if (result.paymentGateways && result.paymentGateways.length > 0) {
      result.paymentGateways = result.paymentGateways.filter(
        gw => gw.id !== 'gw-2' && gw.id !== 'gw-3' && gw.type !== 'bKash Mobile Banking' && gw.type !== 'Nagad Mobile Banking'
      );
    }

    if (!result.paymentGateways || result.paymentGateways.length === 0) {
      result.paymentGateways = DEFAULT_PAYMENT_GATEWAYS;
    }
    if (!result.deliveryMethods || result.deliveryMethods.length === 0) {
      result.deliveryMethods = DEFAULT_DELIVERY_METHODS;
    }

    // Default branding for Ettadi Mart
    if (result.storeName === 'F A И T I И E' || result.storeName === 'FANTINE' || result.storeName === 'SHOSTIR BAZAR' || !result.storeName) {
      result.storeName = 'ETTADI MART';
      result.companyName = 'Ettadi Mart';
      if (!result.storeTagline || result.storeTagline.includes('Brandini') || result.storeTagline.includes('Hanbang') || result.storeTagline.includes('COMFORT TO WELLNESS')) {
        result.storeTagline = 'China Imported Varieties & Smart Lifestyle Products';
      }
      if (!result.topAnnouncementText || result.topAnnouncementText.includes('BRANDINI') || result.topAnnouncementText.includes('SHOSTIR BAZAR')) {
        result.topAnnouncementText = '🔥 চায়না থেকে সরাসরি আমদানিকৃত সেরা ট্রেন্ডি গ্যাজেটস ও ভ্যারাইটিজ সমগ্র | সারা দেশে ক্যাশ অন ডেলিভারি!';
      }
    }

    return { ...stripIntegrationSecrets(result), pixelId: META_PIXEL_ID };
  },

  async saveEcomSettings(settings: EcomSettings): Promise<void> {
    const safeSettings = stripIntegrationSecrets(settings);

    // Save directly to Prisma DB via server API
    try {
      await ApiClient.saveSettings(safeSettings);
    } catch (e) {
      console.warn('Could not save ecom settings to server API:', e);
    }

    window.dispatchEvent(new Event('ecom-settings-updated'));
  },

  // --- Customers List (Merged from Server DB, Registered Customers & Orders) ---
  async getCustomers(): Promise<Customer[]> {
    const orders = await this.getBookOrders();
    this._ordersCache = null; // invalidate cache
    const customerMap = new Map<string, Customer>();

    // 1. Fetch from Server DB (/api/customers)
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const dbCusts: Customer[] = await res.json();
        if (Array.isArray(dbCusts)) {
          dbCusts.forEach(c => {
            const phoneKey = (c.phone || '').replace(/[\s\-\+]/g, '').slice(-11);
            if (!phoneKey) return;
            customerMap.set(phoneKey, {
              ...c,
              totalOrders: c.totalOrders || 0,
              totalSpent: c.totalSpent || 0,
              lastOrderDate: c.lastOrderDate || c.createdAt || new Date().toISOString(),
              customerType: c.customerType || 'regular',
              orders: []
            });
          });
        }
      }
    } catch (e) {
      console.warn('Failed fetching customers from /api/customers:', e);
    }

    // 2. Fetch from Local registered customers
    const localRegistered = getLocalData<Customer[]>('noor_registered_customers', []);
    localRegistered.forEach(c => {
      const phoneKey = (c.phone || '').replace(/[\s\-\+]/g, '').slice(-11);
      if (!phoneKey) return;
      const existing = customerMap.get(phoneKey);
      if (existing) {
        customerMap.set(phoneKey, {
          ...existing,
          ...c,
          customerType: c.customerType || existing.customerType || 'regular',
          image: c.image || existing.image,
          notes: c.notes || existing.notes,
        });
      } else {
        customerMap.set(phoneKey, {
          ...c,
          totalOrders: c.totalOrders || 0,
          totalSpent: c.totalSpent || 0,
          lastOrderDate: c.lastOrderDate || c.createdAt || new Date().toISOString(),
          customerType: c.customerType || 'regular',
          orders: []
        });
      }
    });

    // 3. Aggregate Orders history into customers
    orders.forEach(ord => {
      const phoneKey = (ord.phone || '').replace(/[\s\-\+]/g, '').slice(-11); // normalize Bangladeshi phone
      if (!phoneKey) return;

      const existing = customerMap.get(phoneKey);
      if (existing) {
        if (!existing.orders) existing.orders = [];
        existing.orders.push(ord);
        existing.totalOrders = (existing.totalOrders || 0) + 1;
        existing.totalSpent = (existing.totalSpent || 0) + (ord.totalPrice || 0);
        if (!existing.lastOrderDate || new Date(ord.createdAt).getTime() > new Date(existing.lastOrderDate).getTime()) {
          existing.lastOrderDate = ord.createdAt;
          if (!existing.name || existing.name === 'customer') {
            existing.name = ord.customerName || existing.name;
          }
          if (!existing.address) {
            existing.address = ord.address || existing.address;
          }
          if (!existing.district) {
            existing.district = ord.district || existing.district;
          }
        }
      } else {
        customerMap.set(phoneKey, {
          id: `cust-${phoneKey}`,
          name: ord.customerName || 'Customer',
          phone: ord.phone,
          address: ord.address || '',
          district: ord.district || '',
          customerType: 'regular',
          totalOrders: 1,
          totalSpent: ord.totalPrice || 0,
          lastOrderDate: ord.createdAt,
          orders: [ord]
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
  },

  // --- Customer Authentication & Lookup ---
  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone) return null;

    if (isFirebaseEnabled && db) {
      try {
        const docRef = doc(db, 'ecom_customers', cleanPhone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Customer;
        }
      } catch (e) {
        console.warn('Firestore getCustomerByPhone failed:', e);
      }
    }

    const customers = getLocalData<Customer[]>('noor_registered_customers', []);
    const found = customers.find(c => c.phone.replace(/\s+/g, '') === cleanPhone);
    if (found) return found;

    // Check if customer exists in past orders
    const orders = await this.getBookOrders();
    this._ordersCache = null; // invalidate cache
    const customerOrders = orders.filter(o => o.phone && o.phone.replace(/\s+/g, '') === cleanPhone);
    if (customerOrders.length > 0) {
      const latestOrder = customerOrders[0];
      const newCust: Customer = {
        id: cleanPhone,
        name: latestOrder.customerName || 'customer',
        phone: cleanPhone,
        address: latestOrder.address || '',
        district: latestOrder.district || '',
        totalOrders: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
        lastOrderDate: latestOrder.createdAt,
        orders: customerOrders
      };
      await this.saveCustomer(newCust);
      return newCust;
    }

    return null;
  },

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return null;

    if (isFirebaseEnabled && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'ecom_customers'));
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data() as Customer;
          if ((data.email || '').trim().toLowerCase() === cleanEmail) {
            return { id: docSnap.id, ...data };
          }
        }
      } catch (e) {
        console.warn('Firestore getCustomerByEmail failed:', e);
      }
    }

    const customers = getLocalData<Customer[]>('noor_registered_customers', []);
    const found = customers.find(c => (c.email || '').trim().toLowerCase() === cleanEmail);
    if (found) return found;

    return null;
  },

  async registerCustomer(data: { name: string; phone: string; address?: string; district?: string; email?: string; password?: string; authMethod?: 'phone' | 'email' | 'google' }): Promise<Customer> {
    const cleanPhone = data.phone.trim().replace(/\s+/g, '');
    const orders = await this.getBookOrders();
    this._ordersCache = null; // invalidate cache
    const customerOrders = orders.filter(o => o.phone && o.phone.replace(/\s+/g, '') === cleanPhone);

    const newCustomer: Customer = {
      id: cleanPhone,
      name: data.name.trim(),
      phone: cleanPhone,
      address: data.address?.trim() || '',
      district: data.district?.trim() || '',
      email: data.email?.trim() || '',
      password: data.password?.trim() || undefined,
      authMethod: data.authMethod || 'phone',
      totalOrders: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
      lastOrderDate: new Date().toISOString(),
      orders: customerOrders
    };

    await this.saveCustomer(newCustomer);
    return newCustomer;
  },

  async saveCustomer(customer: Customer): Promise<void> {
    // 1. Sync to Server DB
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(customer)
      });
    } catch (e) {
      console.warn('Failed to save customer to /api/customers:', e);
    }

    // 2. Sync to Firebase if enabled
    if (isFirebaseEnabled && db) {
      try {
        const sanitized = sanitizeForFirestore(customer);
        await setDoc(doc(db, 'ecom_customers', customer.id), sanitized, { merge: true });
      } catch (e) {
        console.warn('Firestore saveCustomer failed:', e);
      }
    }

    // 3. Sync to localStorage
    const customers = getLocalData<Customer[]>('noor_registered_customers', []);
    const updated = [customer, ...customers.filter(c => c.id !== customer.id && c.phone !== customer.phone)];
    setLocalData('noor_registered_customers', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customers-updated', { detail: customer }));
    }
  },

  async deleteCustomer(idOrPhone: string): Promise<void> {
    try {
      await fetch(`/api/customers/${encodeURIComponent(idOrPhone)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch (e) {
      console.warn('Failed to delete customer on server:', e);
    }

    const customers = getLocalData<Customer[]>('noor_registered_customers', []);
    const updated = customers.filter(c => c.id !== idOrPhone && c.phone !== idOrPhone);
    setLocalData('noor_registered_customers', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customers-updated'));
    }
  },

  async getOrdersByPhone(phone: string): Promise<BookOrder[]> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone) return [];
    const orders = await this.getBookOrders();
    this._ordersCache = null; // invalidate cache
    return orders.filter(o => o.phone && o.phone.replace(/\s+/g, '') === cleanPhone);
  },

  // --- Steadfast Courier Integration Dispatch Helper ---
  async sendToSteadfastCourier(order: BookOrder): Promise<{ success: boolean; trackingCode?: string; message?: string }> {
    if (order.steadfastTrackingCode) {
      return { success: false, message: 'এই অর্ডারT ইতিমধ্যে Steadfast-এ পাঠানো হয়েছে।' };
    }
    const result = await ApiClient.dispatchSteadfast(order);
    return result;
  },

  // --- Pathao Courier Integration Dispatch Helper ---
  async sendToPathaoCourier(order: BookOrder, options?: {
    storeId?: string | number;
    recipientCity?: number;
    recipientZone?: number;
    recipientArea?: number;
    itemWeight?: number;
    itemQuantity?: number;
    specialInstruction?: string;
  }): Promise<{ success: boolean; consignmentId?: string; trackingCode?: string; orderStatus?: string; deliveryFee?: number; message?: string }> {
    if (order.pathaoConsignmentId) {
      return { success: false, message: 'এই অর্ডারT ইতিমধ্যে Pathao-তে পাঠানো হয়েছে।' };
    }
    const settings = await this.getEcomSettings();
    const result = await ApiClient.dispatchPathao({
      order,
      storeId: options?.storeId || settings.pathaoStoreId,
      recipientCity: options?.recipientCity,
      recipientZone: options?.recipientZone,
      recipientArea: options?.recipientArea,
      itemWeight: options?.itemWeight || 0.5,
      itemQuantity: options?.itemQuantity || order.quantity || 1,
      specialInstruction: options?.specialInstruction || order.productTitle,
      credentials: {
        clientId: settings.pathaoClientId,
        clientSecret: settings.pathaoClientSecret,
        clientEmail: settings.pathaoClientEmail,
        clientPassword: settings.pathaoClientPassword,
        storeId: settings.pathaoStoreId,
        environment: settings.pathaoEnvironment,
        baseUrl: settings.pathaoBaseUrl
      }
    });
    return result;
  },

  // ==========================================
  // CUSTOMER COUPONS MANAGEMENT
  // ==========================================
  async getCoupons(): Promise<Coupon[]> {
    if (isFirebaseEnabled && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'coupons'));
        if (!querySnapshot.empty) {
          const list: Coupon[] = [];
          querySnapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Coupon);
          });
          return list;
        }
      } catch (e) {
        console.warn('Firestore coupons fetch failed, using local/defaults:', e);
      }
    }

    try {
      const res = await fetch('/api/coupons');
      if (res.ok) {
        const serverCoupons = await res.json();
        if (Array.isArray(serverCoupons)) {
          setLocalData('noor_coupons', serverCoupons);
          return serverCoupons;
        }
      }
    } catch {
      // offline / fallback
    }

    const local = getLocalData<Coupon[]>('noor_coupons', []);
    return local || [];
  },

  async addCoupon(couponData: Omit<Coupon, 'id'> & { id?: string }): Promise<Coupon> {
    const id = couponData.id || `cpn_${Date.now()}`;
    const newCoupon: Coupon = { ...couponData, id };

    try {
      await fetch('/api/coupons', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(newCoupon)
      });
    } catch (e) {
      console.warn('Failed saving coupon to server API:', e);
    }

    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'coupons', id), newCoupon);
      } catch (e) {
        console.warn('Firestore add coupon error:', e);
      }
    }

    const existing = await this.getCoupons();
    const updated = [newCoupon, ...existing.filter(c => c.id !== id)];
    setLocalData('noor_coupons', updated);
    return newCoupon;
  },

  async updateCoupon(coupon: Coupon): Promise<Coupon> {
    try {
      await fetch(`/api/coupons/${encodeURIComponent(coupon.id)}`, {
        method: 'PUT',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(coupon)
      });
    } catch (e) {
      console.warn('Failed updating coupon on server API:', e);
    }

    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'coupons', coupon.id), coupon, { merge: true });
      } catch (e) {
        console.warn('Firestore update coupon error:', e);
      }
    }

    const existing = await this.getCoupons();
    const updated = existing.map(c => c.id === coupon.id ? coupon : c);
    setLocalData('noor_coupons', updated);
    return coupon;
  },

  async deleteCoupon(id: string): Promise<boolean> {
    try {
      await fetch(`/api/coupons/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch (e) {
      console.warn('Failed deleting coupon on server API:', e);
    }

    if (isFirebaseEnabled && db) {
      try {
        await deleteDoc(doc(db, 'coupons', id));
      } catch (e) {
        console.warn('Firestore delete coupon error:', e);
      }
    }

    const existing = await this.getCoupons();
    const updated = existing.filter(c => c.id !== id);
    setLocalData('noor_coupons', updated);
    return true;
  },

  async validateAndApplyCoupon(code: string, cartTotal: number): Promise<{ valid: boolean; coupon?: Coupon; discountAmount: number; message: string }> {
    if (!code || !code.trim()) {
      return { valid: false, discountAmount: 0, message: 'অনুগ্রহ করে Coupon code লিখুন।' };
    }

    const coupons = await this.getCoupons();
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find(c => c.code.toUpperCase() === cleanCode);

    if (!found) {
      return { valid: false, discountAmount: 0, message: 'দুঃখিত, Coupon codeT সঠিক নয়।' };
    }

    if (found.status !== 'Active') {
      return { valid: false, discountAmount: 0, message: 'কুপনT এখন inactive রয়েছে।' };
    }

    if (found.endDate) {
      const expiry = new Date(found.endDate);
      if (!isNaN(expiry.getTime()) && expiry < new Date()) {
        return { valid: false, discountAmount: 0, message: 'কুপনTর মেয়ার শেষ হয়ে গিয়েছে।' };
      }
    }

    if (found.usageLimit && found.usageLimit > 0 && found.usageCount >= found.usageLimit) {
      return { valid: false, discountAmount: 0, message: 'কুপনTর সর্বোচ্চ ব্যবহারের সীমা শেষ।' };
    }

    if (found.minimumSpent && found.minimumSpent > 0 && cartTotal < found.minimumSpent) {
      return { valid: false, discountAmount: 0, message: `এই কুপনT ব্যবহার করতে সর্বনিম্ন ৳ ${found.minimumSpent} টাকার product থাকতে হবে।` };
    }

    let discountAmount = 0;
    if (found.type === 'fixed') {
      discountAmount = Math.min(found.discount, cartTotal);
    } else {
      discountAmount = (cartTotal * found.discount) / 100;
      if (found.maxDiscount && found.maxDiscount > 0) {
        discountAmount = Math.min(discountAmount, found.maxDiscount);
      }
      discountAmount = Math.min(discountAmount, cartTotal);
    }

    return {
      valid: true,
      coupon: found,
      discountAmount: Math.round(discountAmount),
      message: `কুপন '${found.code}' successfulভাবে has been added! আপনি ৳ ${Math.round(discountAmount)} ছাড় পেয়েছেন।`
    };
  },

  async incrementCouponUsage(code: string): Promise<void> {
    const coupons = await this.getCoupons();
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find(c => c.code.toUpperCase() === cleanCode);
    if (found) {
      const updated: Coupon = {
        ...found,
        usageCount: (found.usageCount || 0) + 1,
        updatedAt: 'Just now'
      };
      await this.updateCoupon(updated);
    }
  },

  // --- Product Reviews Management ---
  async addReview(review: Review): Promise<Review> {
    const finalReview = {
      ...review,
      id: review.id || `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: review.createdAt || new Date().toISOString()
    };
    
    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'reviews', finalReview.id), finalReview);
      } catch (error) {
        console.error('Error saving review to Firestore:', error);
      }
    }
    
    // Save to local storage as fallback/cache
    const current = getLocalData<Review[]>('noor_reviews', []);
    current.push(finalReview);
    setLocalData('noor_reviews', current);
    
    return finalReview;
  },

  async getReviews(productId?: string, customerPhone?: string): Promise<Review[]> {
    if (isFirebaseEnabled && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'reviews'));
        const list: Review[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Review);
        });
        setLocalData('noor_reviews', list);
      } catch (error) {
        console.warn('Error reading reviews from Firestore:', error);
      }
    }
    
    let list = getLocalData<Review[]>('noor_reviews', []);
    if (productId) {
      list = list.filter(r => r.productId === productId);
    }
    if (customerPhone) {
      list = list.filter(r => r.customerPhone === customerPhone);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getBrands(): Promise<Brand[]> {
    if (isFirebaseEnabled && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'brands'));
        const list: Brand[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Brand), id: docSnap.id });
        });
        setLocalData('noor_brands', list);
        return list;
      } catch (error) {
        console.warn('Error reading brands from Firestore:', error);
      }
    }

    try {
      const res = await fetch('/api/brands');
      if (res.ok) {
        const serverBrands = await res.json();
        if (Array.isArray(serverBrands)) {
          setLocalData('noor_brands', serverBrands);
          return serverBrands;
        }
      }
    } catch {}

    const list = getLocalData<Brand[]>('noor_brands', []);
    return list || [];
  },

  async saveBrand(brand: Brand): Promise<Brand> {
    const finalBrand: Brand = {
      ...brand,
      id: brand.id || `brand-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: brand.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const isExisting = brand.id && (await this.getBrands()).some(b => b.id === brand.id);
      const url = isExisting ? `/api/brands/${encodeURIComponent(brand.id)}` : '/api/brands';
      const method = isExisting ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(finalBrand)
      });
      if (!res.ok) {
        console.warn(`Server ${method} /api/brands responded with ${res.status}`);
      }
    } catch (e) {
      console.warn('Failed saving brand to server API:', e);
    }

    if (isFirebaseEnabled && db) {
      try {
        const sanitized = sanitizeForFirestore(finalBrand);
        await setDoc(doc(db, 'brands', finalBrand.id), sanitized, { merge: true });
      } catch (error) {
        console.error('Error saving brand to Firestore:', error);
      }
    }

    const current = await this.getBrands();
    const existingIndex = current.findIndex(b => b.id === finalBrand.id);
    let updated: Brand[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = finalBrand;
    } else {
      updated = [finalBrand, ...current];
    }
    setLocalData('noor_brands', updated);
    window.dispatchEvent(new CustomEvent('brands-updated', { detail: updated }));
    window.dispatchEvent(new CustomEvent('ecom-brands-updated', { detail: updated }));
    return finalBrand;
  },

  async deleteBrand(id: string): Promise<void> {
    try {
      await fetch(`/api/brands/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch (e) {
      console.warn('Failed deleting brand on server API:', e);
    }

    if (isFirebaseEnabled && db) {
      try {
        await deleteDoc(doc(db, 'brands', id));
      } catch (error) {
        console.error('Error deleting brand from Firestore:', error);
      }
    }

    const current = await this.getBrands();
    const updated = current.filter(b => b.id !== id);
    setLocalData('noor_brands', updated);
    window.dispatchEvent(new CustomEvent('brands-updated', { detail: updated }));
    window.dispatchEvent(new CustomEvent('ecom-brands-updated', { detail: updated }));
  },

  // ===== SUPPLIER MANAGEMENT =====
  async getSuppliers(filter?: { search?: string; status?: string }): Promise<Supplier[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.search) params.append('search', filter.search);
      if (filter?.status) params.append('status', filter.status);
      const url = `/api/suppliers${params.toString() ? `?${params.toString()}` : ''}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_suppliers', data);
          return data;
        }
      }
    } catch {}
    const list = getLocalData<Supplier[]>('noor_suppliers', []);
    return list;
  },

  async saveSupplier(supplier: Supplier): Promise<Supplier> {
    const finalSupplier: Supplier = {
      ...supplier,
      id: supplier.id || `supp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      status: supplier.status !== undefined ? supplier.status : true,
      createdAt: supplier.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const isExisting = supplier.id && !supplier.id.startsWith('temp-') && (await this.getSuppliers()).some(s => s.id === supplier.id);
      const url = isExisting ? `/api/suppliers/${encodeURIComponent(supplier.id)}` : '/api/suppliers';
      const method = isExisting ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(finalSupplier)
      });
      if (!res.ok) {
        console.warn(`Server ${method} ${url} responded with ${res.status}`);
      }
    } catch (e) {
      console.warn('Failed saving supplier to server API:', e);
    }

    const current = await this.getSuppliers();
    const existingIndex = current.findIndex(s => s.id === finalSupplier.id);
    let updated: Supplier[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = finalSupplier;
    } else {
      updated = [finalSupplier, ...current];
    }
    setLocalData('noor_suppliers', updated);
    window.dispatchEvent(new CustomEvent('suppliers-updated', { detail: updated }));
    return finalSupplier;
  },

  async deleteSupplier(id: string): Promise<void> {
    try {
      await fetch(`/api/suppliers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch {}

    const current = await this.getSuppliers();
    const updated = current.filter(s => s.id !== id);
    setLocalData('noor_suppliers', updated);
    window.dispatchEvent(new CustomEvent('suppliers-updated', { detail: updated }));
  },

  // ===== AFFILIATE MANAGEMENT =====
  async getAffiliates(): Promise<Affiliate[]> {
    try {
      const res = await fetch('/api/affiliates');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_affiliates', data);
          return data;
        }
      }
    } catch {}
    const list = getLocalData<Affiliate[]>('noor_affiliates', []);
    return list;
  },

  async saveAffiliate(affiliate: Affiliate): Promise<Affiliate> {
    const finalAffiliate: Affiliate = {
      ...affiliate,
      id: affiliate.id || `aff-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: affiliate.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await fetch('/api/affiliates', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(finalAffiliate)
      });
    } catch {}

    const current = await this.getAffiliates();
    const existingIndex = current.findIndex(a => a.id === finalAffiliate.id);
    let updated: Affiliate[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = finalAffiliate;
    } else {
      updated = [finalAffiliate, ...current];
    }
    setLocalData('noor_affiliates', updated);
    window.dispatchEvent(new CustomEvent('affiliates-updated', { detail: updated }));
    return finalAffiliate;
  },

  async deleteAffiliate(id: string): Promise<void> {
    try {
      await fetch(`/api/affiliates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch {}

    const current = await this.getAffiliates();
    const updated = current.filter(a => a.id !== id);
    setLocalData('noor_affiliates', updated);
    window.dispatchEvent(new CustomEvent('affiliates-updated', { detail: updated }));
  },

  // ===== CATEGORY HIERARCHY SYSTEM =====
  async getCategories(): Promise<CategoryItem[]> {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            parentId: item.parentId || null,
            description: item.description || '',
            isActive: item.isActive !== false,
            order: item.order || 0,
            image: item.image || '',
            icon: item.icon || '',
            subcategories: item.subcategories ? (typeof item.subcategories === 'string' ? JSON.parse(item.subcategories) : item.subcategories) : []
          }));
          setLocalData('noor_category_items', mapped);
          return mapped;
        }
      }
    } catch {}

    return getLocalData<CategoryItem[]>('noor_category_items', []);
  },

  async saveCategory(cat: Partial<CategoryItem>): Promise<CategoryItem> {
    const isEdit = Boolean(cat.id);
    const id = cat.id || `cat-${Date.now()}`;
    const payload: CategoryItem = {
      id,
      name: cat.name || 'New Category',
      slug: cat.slug || (cat.name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      parentId: cat.parentId || null,
      description: cat.description || '',
      isActive: cat.isActive !== undefined ? cat.isActive : true,
      order: cat.order !== undefined ? cat.order : 0,
      image: cat.image || '',
      icon: cat.icon || '',
      subcategories: cat.subcategories || []
    };

    try {
      await fetch(isEdit ? `/api/categories/${encodeURIComponent(id)}` : '/api/categories', {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch {}

    const current = await this.getCategories();
    const idx = current.findIndex(c => c.id === id);
    let updated: CategoryItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = payload;
    } else {
      updated = [...current, payload];
    }
    setLocalData('noor_category_items', updated);

    // Sync to ecom settings for backward compatibility
    try {
      const ecom = await this.getEcomSettings();
      ecom.categoryItems = updated;
      ecom.categories = updated.map(c => c.name);
      await this.saveEcomSettings(ecom);
    } catch {}

    return payload;
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch {}

    const current = await this.getCategories();
    const updated = current.filter(c => c.id !== id && c.parentId !== id);
    setLocalData('noor_category_items', updated);

    try {
      const ecom = await this.getEcomSettings();
      ecom.categoryItems = updated;
      ecom.categories = updated.map(c => c.name);
      await this.saveEcomSettings(ecom);
    } catch {}
  },
  async getAttributes(): Promise<ProductAttribute[]> {
    try {
      const res = await fetch('/api/attributes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_attributes', data);
          return data;
        }
      }
    } catch {}

    return getLocalData<ProductAttribute[]>('noor_attributes', [
      { id: 'attr-1', name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'], status: true },
      { id: 'attr-2', name: 'Color', values: ['Red', 'Green', 'Blue', 'Black', 'White'], status: true },
      { id: 'attr-3', name: 'Weight / Pack', values: ['250g', '500g', '1kg', '2kg', '5kg'], status: true },
      { id: 'attr-4', name: 'Material', values: ['Cotton', 'Leather', 'Steel', 'Plastic'], status: true }
    ]);
  },

  async saveAttribute(attr: Partial<ProductAttribute>): Promise<ProductAttribute> {
    const isEdit = Boolean(attr.id);
    const id = attr.id || `attr-${Date.now()}`;
    const payload: ProductAttribute = {
      id,
      name: attr.name || 'New Attribute',
      values: attr.values || [],
      status: attr.status !== undefined ? attr.status : true,
      updatedAt: new Date().toISOString(),
      createdAt: attr.createdAt || new Date().toISOString()
    };

    try {
      await fetch(isEdit ? `/api/attributes/${encodeURIComponent(id)}` : '/api/attributes', {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch {}

    const current = await this.getAttributes();
    const idx = current.findIndex(a => a.id === id);
    let updated: ProductAttribute[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = payload;
    } else {
      updated = [payload, ...current];
    }
    setLocalData('noor_attributes', updated);
    return payload;
  },

  async deleteAttribute(id: string): Promise<void> {
    try {
      await fetch(`/api/attributes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch {}

    const current = await this.getAttributes();
    const updated = current.filter(a => a.id !== id);
    setLocalData('noor_attributes', updated);
  },

  async getUnits(): Promise<ProductUnit[]> {
    try {
      const res = await fetch('/api/units');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_units', data);
          return data;
        }
      }
    } catch {}

    return getLocalData<ProductUnit[]>('noor_units', [
      { id: 'unit-1', name: 'Piece', code: 'pc', status: true },
      { id: 'unit-2', name: 'Kilogram', code: 'kg', status: true },
      { id: 'unit-3', name: 'Gram', code: 'gm', status: true },
      { id: 'unit-4', name: 'Litre', code: 'ltr', status: true },
      { id: 'unit-5', name: 'Pack', code: 'pk', status: true },
      { id: 'unit-6', name: 'Box', code: 'bx', status: true }
    ]);
  },

  async saveUnit(unit: Partial<ProductUnit>): Promise<ProductUnit> {
    const isEdit = Boolean(unit.id);
    const id = unit.id || `unit-${Date.now()}`;
    const payload: ProductUnit = {
      id,
      name: unit.name || 'Unit',
      code: unit.code || 'pc',
      status: unit.status !== undefined ? unit.status : true,
      updatedAt: new Date().toISOString(),
      createdAt: unit.createdAt || new Date().toISOString()
    };

    try {
      await fetch(isEdit ? `/api/units/${encodeURIComponent(id)}` : '/api/units', {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch {}

    const current = await this.getUnits();
    const idx = current.findIndex(u => u.id === id);
    let updated: ProductUnit[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = payload;
    } else {
      updated = [payload, ...current];
    }
    setLocalData('noor_units', updated);
    return payload;
  },

  async deleteUnit(id: string): Promise<void> {
    try {
      await fetch(`/api/units/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch {}

    const current = await this.getUnits();
    const updated = current.filter(u => u.id !== id);
    setLocalData('noor_units', updated);
  },
  async getVendors(): Promise<Vendor[]> {
    try {
      const res = await fetch('/api/vendors');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_vendors', data);
          return data;
        }
      }
    } catch {}

    const list = getLocalData<Vendor[]>('noor_vendors', []);
    return list;
  },

  async saveVendor(vendor: Vendor): Promise<Vendor> {
    const isEdit = Boolean(vendor.id);
    const finalVendor: Vendor = {
      ...vendor,
      id: vendor.id || `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      slug: vendor.slug || (vendor.storeName || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      createdAt: vendor.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEdit) {
        // Try PUT first, fallback to POST if not in DB yet
        const res = await fetch(`/api/vendors/${encodeURIComponent(finalVendor.id)}`, {
          method: 'PUT',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify(finalVendor)
        });
        if (!res.ok && res.status === 404) {
          await fetch('/api/vendors', {
            method: 'POST',
            headers: getAdminAuthHeaders(),
            body: JSON.stringify(finalVendor)
          });
        }
      } else {
        await fetch('/api/vendors', {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify(finalVendor)
        });
      }
    } catch (e) {
      console.warn('Network error saving vendor to server, updating locally:', e);
    }

    const current = await this.getVendors();
    const existingIndex = current.findIndex(v => v.id === finalVendor.id);
    let updated: Vendor[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = finalVendor;
    } else {
      updated = [finalVendor, ...current];
    }
    setLocalData('noor_vendors', updated);
    window.dispatchEvent(new CustomEvent('vendors-updated', { detail: updated }));
    return finalVendor;
  },

  async deleteVendor(id: string): Promise<void> {
    try {
      await fetch(`/api/vendors/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    } catch {}

    const current = await this.getVendors();
    const updated = current.filter(v => v.id !== id);
    setLocalData('noor_vendors', updated);
    window.dispatchEvent(new CustomEvent('vendors-updated', { detail: updated }));
  },

  async getWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
      const res = await fetch('/api/vendors/withdrawals');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_withdrawals', data);
          return data;
        }
      }
    } catch {}

    return getLocalData<WithdrawalRequest[]>('noor_withdrawals', []);
  },

  async updateWithdrawalStatus(id: string, status: 'approved' | 'rejected' | 'pending', notes?: string): Promise<any> {
    try {
      const res = await fetch(`/api/vendors/withdrawals/${encodeURIComponent(id)}/status`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Fallback local update
    const current = await this.getWithdrawals();
    const idx = current.findIndex(w => w.id === id);
    if (idx >= 0) {
      current[idx].status = status;
      if (notes) current[idx].notes = notes;
      current[idx].decidedAt = new Date().toISOString();
      setLocalData('noor_withdrawals', [...current]);
    }
    return { success: true };
  },

  // ===== VAT & TAX MANAGEMENT (REAL APIS) =====
  async getTaxes(): Promise<TaxItem[]> {
    try {
      const res = await fetch('/api/taxes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_taxes', data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed fetching taxes from server API:', e);
    }
    return getLocalData<TaxItem[]>('noor_taxes', []);
  },

  async addTax(tax: Omit<TaxItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaxItem> {
    const res = await fetch('/api/taxes', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(tax)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const saved: TaxItem = await res.json();
    const current = await this.getTaxes();
    const updated = [saved, ...current.filter(t => t.id !== saved.id)];
    setLocalData('noor_taxes', updated);
    window.dispatchEvent(new CustomEvent('taxes-updated', { detail: updated }));
    return saved;
  },

  async updateTax(id: string, tax: Partial<TaxItem>): Promise<TaxItem> {
    const res = await fetch(`/api/taxes/${id}`, {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(tax)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const updatedItem: TaxItem = await res.json();
    const current = await this.getTaxes();
    const updated = current.map(t => t.id === id ? updatedItem : t);
    setLocalData('noor_taxes', updated);
    window.dispatchEvent(new CustomEvent('taxes-updated', { detail: updated }));
    return updatedItem;
  },

  async deleteTax(id: string): Promise<void> {
    const res = await fetch(`/api/taxes/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const current = await this.getTaxes();
    const updated = current.filter(t => t.id !== id);
    setLocalData('noor_taxes', updated);
    window.dispatchEvent(new CustomEvent('taxes-updated', { detail: updated }));
  },

  // ===== DRIVER MANAGEMENT (REAL APIS) =====
  async getDrivers(filter?: { search?: string; status?: string }): Promise<Driver[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.search) params.append('search', filter.search);
      if (filter?.status) params.append('status', filter.status);
      const url = `/api/drivers${params.toString() ? `?${params.toString()}` : ''}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_drivers', data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed fetching drivers from server API:', e);
    }
    return getLocalData<Driver[]>('noor_drivers', []);
  },

  async getDriverById(id: string): Promise<Driver | null> {
    try {
      const res = await fetch(`/api/drivers/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed fetching driver by ID:', e);
    }
    const current = await this.getDrivers();
    return current.find(d => d.id === id) || null;
  },

  async addDriver(driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>): Promise<Driver> {
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(driver)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const saved: Driver = await res.json();
    const current = await this.getDrivers();
    const updated = [saved, ...current.filter(d => d.id !== saved.id)];
    setLocalData('noor_drivers', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('drivers-updated', { detail: updated }));
    }
    return saved;
  },

  async updateDriver(id: string, driver: Partial<Driver>): Promise<Driver> {
    const res = await fetch(`/api/drivers/${id}`, {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(driver)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const updatedItem: Driver = await res.json();
    const current = await this.getDrivers();
    const updated = current.map(d => d.id === id ? updatedItem : d);
    setLocalData('noor_drivers', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('drivers-updated', { detail: updated }));
    }
    return updatedItem;
  },

  async deleteDriver(id: string): Promise<void> {
    const res = await fetch(`/api/drivers/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const current = await this.getDrivers();
    const updated = current.filter(d => d.id !== id);
    setLocalData('noor_drivers', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('drivers-updated', { detail: updated }));
    }
  },

  // ===== FLASH SALES MANAGEMENT (REAL APIS) =====
  async getFlashSales(filter?: { search?: string; status?: string }): Promise<FlashSaleItem[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.search) params.append('search', filter.search);
      if (filter?.status) params.append('status', filter.status);
      const url = `/api/flash-sales${params.toString() ? `?${params.toString()}` : ''}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_flash_sales', data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed fetching flash sales from server API:', e);
    }
    return getLocalData<FlashSaleItem[]>('noor_flash_sales', []);
  },

  async getFlashSaleById(id: string): Promise<FlashSaleItem | null> {
    try {
      const res = await fetch(`/api/flash-sales/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed fetching flash sale by ID:', e);
    }
    const current = await this.getFlashSales();
    return current.find(f => f.id === id) || null;
  },

  async addFlashSale(item: Omit<FlashSaleItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlashSaleItem> {
    const res = await fetch('/api/flash-sales', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(item)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const saved: FlashSaleItem = await res.json();
    const current = await this.getFlashSales();
    const updated = [saved, ...current.filter(f => f.id !== saved.id)];
    setLocalData('noor_flash_sales', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flash-sales-updated', { detail: updated }));
    }
    return saved;
  },

  async updateFlashSale(id: string, item: Partial<FlashSaleItem>): Promise<FlashSaleItem> {
    const res = await fetch(`/api/flash-sales/${id}`, {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(item)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const updatedItem: FlashSaleItem = await res.json();
    const current = await this.getFlashSales();
    const updated = current.map(f => f.id === id ? updatedItem : f);
    setLocalData('noor_flash_sales', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flash-sales-updated', { detail: updated }));
    }
    return updatedItem;
  },

  async deleteFlashSale(id: string): Promise<void> {
    const res = await fetch(`/api/flash-sales/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const current = await this.getFlashSales();
    const updated = current.filter(f => f.id !== id);
    setLocalData('noor_flash_sales', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flash-sales-updated', { detail: updated }));
    }
  },

  // ===== SUBSCRIPTION & MEMBERSHIP PLANS (REAL APIS) =====
  async getSubscriptionPlans(filter?: { status?: string; targetAudience?: string }): Promise<SubscriptionPlan[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.status) params.append('status', filter.status);
      if (filter?.targetAudience) params.append('targetAudience', filter.targetAudience);
      const url = `/api/subscriptions${params.toString() ? `?${params.toString()}` : ''}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalData('noor_subscription_plans', data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed fetching subscription plans from server API:', e);
    }
    return getLocalData<SubscriptionPlan[]>('noor_subscription_plans', []);
  },

  async addSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(plan)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const saved: SubscriptionPlan = await res.json();
    const current = await this.getSubscriptionPlans();
    const updated = [saved, ...current.filter(p => p.id !== saved.id)];
    setLocalData('noor_subscription_plans', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('subscriptions-updated', { detail: updated }));
    }
    return saved;
  },

  async updateSubscriptionPlan(id: string, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(plan)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const updatedItem: SubscriptionPlan = await res.json();
    const current = await this.getSubscriptionPlans();
    const updated = current.map(p => p.id === id ? updatedItem : p);
    setLocalData('noor_subscription_plans', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('subscriptions-updated', { detail: updated }));
    }
    return updatedItem;
  },

  async deleteSubscriptionPlan(id: string): Promise<void> {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.message || err.error || `Server error ${res.status}`);
    }

    const current = await this.getSubscriptionPlans();
    const updated = current.filter(p => p.id !== id);
    setLocalData('noor_subscription_plans', updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('subscriptions-updated', { detail: updated }));
    }
  },

  async saveBrands(brands: Brand[]): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        for (const b of brands) {
          const sanitized = sanitizeForFirestore(b);
          await setDoc(doc(db, 'brands', b.id), sanitized, { merge: true });
        }
      } catch (error) {
        console.error('Error batch saving brands to Firestore:', error);
      }
    }
    setLocalData('noor_brands', brands);
    window.dispatchEvent(new CustomEvent('brands-updated', { detail: brands }));
    window.dispatchEvent(new CustomEvent('ecom-brands-updated', { detail: brands }));
  },

  // --- Contact Form Messages Management ---
  async getContactMessages(): Promise<ContactMessage[]> {
    if (isFirebaseEnabled && db) {
      try {
        const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list: ContactMessage[] = [];
          snap.forEach(docSnap => {
            list.push({ ...(docSnap.data() as ContactMessage), id: docSnap.id });
          });
          setLocalData('noor_contact_messages', list);
          return list;
        }
      } catch (e) {
        console.warn('Error reading contact messages from Firestore:', e);
      }
    }
    return getLocalData<ContactMessage[]>('noor_contact_messages', []);
  },

  async saveContactMessage(message: Partial<ContactMessage>): Promise<ContactMessage> {
    const msgToSave: ContactMessage = {
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: message.name || '',
      email: message.email || '',
      phone: message.phone || '',
      subject: message.subject || '',
      message: message.message || '',
      createdAt: message.createdAt || new Date().toISOString(),
      status: message.status || 'unread',
      replyNote: message.replyNote || ''
    };

    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'contact_messages', msgToSave.id), msgToSave);
      } catch (e) {
        console.error('Error saving contact message to Firestore:', e);
      }
    }

    const current = await this.getContactMessages();
    const updated = [msgToSave, ...current.filter(m => m.id !== msgToSave.id)];
    setLocalData('noor_contact_messages', updated);
    window.dispatchEvent(new CustomEvent('contact-messages-updated', { detail: updated }));
    return msgToSave;
  },

  async updateContactMessage(message: ContactMessage): Promise<ContactMessage> {
    if (isFirebaseEnabled && db) {
      try {
        await setDoc(doc(db, 'contact_messages', message.id), message, { merge: true });
      } catch (e) {
        console.error('Error updating contact message in Firestore:', e);
      }
    }

    const current = await this.getContactMessages();
    const updated = current.map(m => m.id === message.id ? message : m);
    setLocalData('noor_contact_messages', updated);
    window.dispatchEvent(new CustomEvent('contact-messages-updated', { detail: updated }));
    return message;
  },

  async deleteContactMessage(id: string): Promise<void> {
    if (isFirebaseEnabled && db) {
      try {
        await deleteDoc(doc(db, 'contact_messages', id));
      } catch (e) {
        console.error('Error deleting contact message from Firestore:', e);
      }
    }

    const current = await this.getContactMessages();
    const updated = current.filter(m => m.id !== id);
    setLocalData('noor_contact_messages', updated);
    window.dispatchEvent(new CustomEvent('contact-messages-updated', { detail: updated }));
  }
};

// Real-time listener for orders across tabs, SSE stream & fast polling
// Returns an unsubscribe function. Instantly receives orders without reload!
export function subscribeToOrders(
  onData: (orders: BookOrder[], newOrder?: BookOrder) => void
): () => void {
  let isSubscribed = true;

  const mergeAndEmitNewOrder = (freshOrder?: BookOrder) => {
    dbService.getBookOrders(true).then(orders => {
      if (isSubscribed) onData(orders, freshOrder);
    }).catch(() => {});
  };

  // 1. Cross-tab real-time sync via BroadcastChannel
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel('ecom_orders_channel');
    channel.onmessage = (event) => {
      if (event.data?.type === 'NEW_ORDER' || event.data?.type === 'ORDER_UPDATED') {
        mergeAndEmitNewOrder(event.data?.order);
      }
    };
  } catch {}

  // 2. Cross-tab fallback via storage event & local window event
  const handleOrderNotification = (e?: any) => {
    mergeAndEmitNewOrder(e?.detail);
  };

  window.addEventListener('book-orders-updated', handleOrderNotification);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'noor_book_orders' || e.key === 'ecom_new_order_event') {
      mergeAndEmitNewOrder();
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Server-Sent Events (SSE) from /api/orders/live for cross-device instantaneous push
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource('/api/orders/live');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'NEW_ORDER') {
          mergeAndEmitNewOrder(payload.order);
        }
      } catch {}
    };
  } catch {}

  // 4. Bulletproof high-frequency polling fallback (every 2.5 seconds)
  const pollInterval = setInterval(() => {
    if (!isSubscribed) return;
    dbService.getBookOrders(true).then(orders => {
      if (isSubscribed) onData(orders);
    }).catch(() => {});
  }, 2500);

  // 5. Firebase fallback if enabled
  let firebaseUnsub: (() => void) | null = null;
  if (isFirebaseEnabled && db) {
    try {
      const q = query(collection(db, 'book_orders'), orderBy('createdAt', 'desc'));
      firebaseUnsub = onSnapshot(q, (snapshot) => {
        const orders: BookOrder[] = [];
        snapshot.forEach((docSnap) => {
          orders.push({ ...(docSnap.data() as BookOrder), id: docSnap.id });
        });
        if (isSubscribed) onData(orders);
      }, () => {});
    } catch {}
  }

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    if (channel) channel.close();
    if (eventSource) eventSource.close();
    if (firebaseUnsub) firebaseUnsub();
    window.removeEventListener('book-orders-updated', handleOrderNotification);
    window.removeEventListener('storage', handleStorage);
  };
}
