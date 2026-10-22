import { dbService } from "../lib/dbService";
//fix pixel event 2

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ShoppingBag, User, Search, ChevronDown, ChevronLeft, ChevronRight,
  ArrowRight, ArrowLeft, Heart, Star, Check, Sparkles, X, Plus, Minus,
  ShieldCheck, Truck, RefreshCw, Send, HelpCircle, Eye, Share2, Award,
  Phone, Mail, Globe, Droplet, Sun, Moon, Zap, Flame, Layers, MessageCircle, MessageSquare, ArrowUp, MapPin, ZoomIn, Clock,
  Building2, BookOpen, Microscope, Quote, Sprout, FlaskConical, CreditCard, Smartphone, Copy, Tag,
  Play, Pause, Volume2, VolumeX, Menu, Package, Layout, Trash2
} from 'lucide-react';
import { trackEvent, createEventId } from '../lib/pixelGtmService';
import { Product, BookOrder, EcomSettings, InstituteInfo, AboutPageSettings, DeliveryMethodItem, PaymentGatewayItem, Coupon, CategoryItem } from '../types';
import { publicStoreService, optimizeImageUrl } from '../lib/publicStoreService';
import { DEFAULT_ABOUT_SETTINGS, DEFAULT_DELIVERY_METHODS, DEFAULT_PAYMENT_GATEWAYS } from '../lib/constants';
import { ProductSearchEngine, HANBANG_INGREDIENT_DATABASE, IngredientMeta } from '../lib/searchIndex';
import { useAppStore } from '../store/useAppStore';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { updateMetaTags, updateProductSchema, updateBreadcrumbSchema, getProductSlug } from '../lib/seoUtils';
import ResponsiveImage from './ResponsiveImage';
import CheckoutPage from './CheckoutPage';
import { SkinQuizView } from './SkinQuizView';
import { playOrderSuccessVibe } from '../lib/soundUtils';
import { validateBDPhone, validateDeliveryAddress } from '../lib/validationUtils';
import { calculateDeliveryCharge } from '../lib/deliveryUtils';

const FantineFooter = React.lazy(() => import('./FantineFooter'));

interface FantineStorePageProps {
  onGoToLogin?: () => void;
  onGoToLanding?: () => void;
}

export interface FantineProductItem extends Product {
  series: string;
  isSet?: boolean;
  benefitsHighlights?: string;
  howToUse?: string;
}


// Clean product catalog - zero fake seed data
const FANTINE_PRODUCTS: FantineProductItem[] = [];

export const DEFAULT_FANTINE_FALLBACK_IMAGE = '/placeholder-image.svg';

export const FANTINE_CURATED_IMAGES: string[] = [];

export const getSafeSkincareImage = (rawImg?: any, _indexOrSeed?: number | string): string => {
  if (!rawImg || typeof rawImg !== 'string' || !rawImg.trim()) {
    return DEFAULT_FANTINE_FALLBACK_IMAGE;
  }
  const trimmed = rawImg.trim();
  // Filter out broken placeholder / legacy bookstore URLs
  if (
    trimmed.includes('photo-1544716278-ca5e3f4abd8c') ||
    trimmed.includes('/watch.jpg') ||
    trimmed.includes('/book.png') ||
    trimmed.includes('file-1791830') ||
    trimmed.includes('file-179182') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return DEFAULT_FANTINE_FALLBACK_IMAGE;
  }
  return trimmed;
};

export const normalizeFantineProduct = (p: Product, index: number = 0): FantineProductItem => {
  const price = typeof p.price === 'number' ? p.price : (Number(p.price) || 0);
  const regularPrice = p.regularPrice ? (typeof p.regularPrice === 'number' ? p.regularPrice : Number(p.regularPrice)) : undefined;
  const discountPercentage = p.discountPercentage || (regularPrice && regularPrice > price ? Math.round(((regularPrice - price) / regularPrice) * 100) : undefined);
  
  const rawCover = (p as any).coverImage || p.image || (p as any).imageUrl || ((p as any).images && (p as any).images[0]) || ((p as any).samplePages && (p as any).samplePages[0]);
  const coverImage = getSafeSkincareImage(rawCover, index);
  
  const rawAdditional = (p as any).additionalImages || (p as any).images || (p as any).samplePages;
  const additionalImages = Array.isArray(rawAdditional) && rawAdditional.length > 0 
    ? rawAdditional.map((img: string, i: number) => getSafeSkincareImage(img, i))
    : [coverImage];

  return {
    ...p,
    id: p.id || `prod_${Date.now()}_${index}`,
    title: p.title || 'Product',
    author: (p as any).author || p.brand || '',
    regularPrice,
    price,
    discountPercentage,
    stockQuantity: p.stockQuantity ?? p.stock ?? 0,
    category: p.category || '',
    series: (p as any).series || p.category || '',
    coverImage,
    additionalImages,
    description: p.description || p.shortSummary || '',
    benefitsHighlights: (p as any).benefitsHighlights || p.shortSummary || '',
    howToUse: (p as any).howToUse || '',
    badge: (p as any).badge || (p.isFeatured ? 'Featured' : undefined),
    rating: p.rating || 5,
    reviewsCount: p.reviewsCount || 0,
    isFeatured: p.isFeatured ?? false
  };
};

const DEFAULT_SHOP_CATEGORIES: string[] = [];



function extractYouTubeVideoId(url?: string): string | null {
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

interface PahariyaProductCardProps {
  product: FantineProductItem;
  displayStoreLogo?: string;
  onOpenDetail: (product: FantineProductItem) => void;
  onAddToCart: (product: FantineProductItem, quantity?: number, variant?: import('../types').ProductVariant) => void;
  onBuyNow: (product: FantineProductItem, variant?: import('../types').ProductVariant) => void;
  formatPrice: (priceVal: number) => string;
}

function PahariyaProductCard({
  product,
  displayStoreLogo,
  onOpenDetail,
  onAddToCart,
  onBuyNow,
  formatPrice,
}: PahariyaProductCardProps) {
  const variants = product.variants && product.variants.length > 0 ? product.variants : [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || '');

  const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants[0] || null;

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const regularPrice = selectedVariant ? (selectedVariant.regularPrice || product.regularPrice) : product.regularPrice;
  const hasDiscount = Boolean(regularPrice && regularPrice > currentPrice);
  const discountPercent = hasDiscount 
    ? Math.round(((regularPrice! - currentPrice) / regularPrice!) * 100) 
    : (product.discountPercentage || 0);

  const cardImage = selectedVariant?.image || product.coverImage || product.image || DEFAULT_FANTINE_FALLBACK_IMAGE;

  const variantLabel = variants.some(v => /size|s|m|l|xl|xxl/i.test(v.name) && !/gm|kg|g|l|ml/i.test(v.name))
    ? 'সাইজ'
    : 'ওজন';

  return (
    <div className="group flex flex-col bg-white rounded-[6px] border border-slate-200/90 hover:shadow-lg transition-all duration-300 p-2.5 sm:p-3 overflow-hidden justify-between">
      <div>
        {/* Product Image Area */}
        <div 
          className="relative aspect-square w-full bg-slate-50 rounded-[4px] overflow-hidden mb-2.5 cursor-pointer" 
          onClick={() => onOpenDetail(product)}
        >
          <img 
            loading="lazy" 
            decoding="async"
            src={optimizeImageUrl(cardImage, 400)} 
            alt={product.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
            }}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />

          {/* Top Left Brand / Store Logo Badge (Pahariya style) */}
          {displayStoreLogo && (
            <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-sm bg-white/90 p-0.5 shadow-xs flex items-center justify-center">
              <img src={displayStoreLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}

          {/* Top Right Discount Badge */}
          {hasDiscount && discountPercent > 0 && (
            <span className="absolute top-2 right-2 bg-[#e53935] text-white text-[10px] font-bold px-2 py-0.5 rounded-[3px] shadow-xs">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 
          onClick={() => onOpenDetail(product)}
          className="text-xs sm:text-sm text-slate-900 hover:text-emerald-800 transition-colors cursor-pointer font-bold text-center line-clamp-2 min-h-[2.5rem]"
        >
          {product.title}
        </h3>
        
        {/* Price Row */}
        <div className="flex items-center justify-center gap-2 pt-1 pb-1">
          <span className="text-sm sm:text-base font-bold text-slate-900">
            {formatPrice(currentPrice)}
          </span>
          {regularPrice && regularPrice > currentPrice && (
            <span className="text-xs text-slate-400 line-through">
              {formatPrice(regularPrice)}
            </span>
          )}
        </div>

        {/* Size / Weight Variant Selector */}
        {variants.length > 0 && (
          <div className="pt-1.5 pb-2 text-center">
            <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
              {variantLabel}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {variants.map((v) => {
                const isSelected = selectedVariant?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariantId(v.id);
                    }}
                    className={`px-3 py-1 rounded-[4px] text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#FDD305] text-slate-950 border-[#FDD305] shadow-xs ring-1 ring-amber-400'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Two Stacked Action Buttons (Pahariya Style: Forest Green Add to cart + Orange Buy Now) */}
      <div className="space-y-1.5 pt-2 mt-auto">
        <button
          type="button"
          onClick={() => onAddToCart(product, 1, selectedVariant || undefined)}
          className="w-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-xs py-2 px-3 rounded-[4px] shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-white" />
          <span>Add to cart</span>
        </button>
        <button
          type="button"
          onClick={() => onBuyNow(product, selectedVariant || undefined)}
          className="w-full bg-[#FDD305] hover:bg-[#e6be02] active:scale-95 text-slate-950 font-bold text-xs py-2 px-3 rounded-[4px] shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Buy Now</span>
        </button>

      </div>
    </div>
  );
}

interface PahariyaFlashSaleSectionProps {
  product: FantineProductItem;
  flashSaleConfig: any;
  timeLeft: { days: number; hours: number; minutes: number; seconds: number };
  displayStoreLogo?: string;
  formatPrice: (priceVal: number) => string;
  onAddToCart: (product: FantineProductItem, quantity?: number, variant?: import('../types').ProductVariant) => void;
  onBuyNow: (product: FantineProductItem, variant?: import('../types').ProductVariant) => void;
  onOpenDetail: (product: FantineProductItem) => void;
}

function PahariyaFlashSaleSection({
  product,
  flashSaleConfig,
  timeLeft,
  displayStoreLogo,
  formatPrice,
  onAddToCart,
  onBuyNow,
  onOpenDetail,
}: PahariyaFlashSaleSectionProps) {
  const variants = product.variants && product.variants.length > 0 ? product.variants : [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || '');

  const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants[0] || null;

  const currentPrice = selectedVariant
    ? selectedVariant.price
    : (flashSaleConfig?.flashPrice ?? product.price);

  const regularPrice = selectedVariant
    ? (selectedVariant.regularPrice || product.regularPrice)
    : (flashSaleConfig?.originalPrice ?? product.regularPrice);

  const hasDiscount = Boolean(regularPrice && regularPrice > currentPrice);
  const discountPercent = hasDiscount && regularPrice
    ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
    : (product.discountPercentage || 0);

  const cardImage = selectedVariant?.image || product.coverImage || product.image || DEFAULT_FANTINE_FALLBACK_IMAGE;

  const variantLabel = variants.some(v => /size|s|m|l|xl|xxl/i.test(v.name) && !/gm|kg|g|l|ml/i.test(v.name))
    ? 'সাইজ'
    : 'ওজন';

  return (
    <section className="bg-white pt-2 sm:pt-4 pb-8 sm:pb-12 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Flash Sale Header Banner with Countdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-red-600 to-orange-500 text-white px-5 sm:px-8 py-3.5 rounded-t-[8px] shadow-xs">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
              FLASH SALE
            </span>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-1.5 sm:gap-2 select-none">
            <div className="flex items-center justify-center bg-white/20 backdrop-blur-xs px-2 sm:px-2.5 py-1 rounded-[4px] min-w-[2.4rem] text-center">
              <span className="font-mono text-xs sm:text-sm font-bold">
                {String(timeLeft.days).padStart(2, '0')}d
              </span>
            </div>
            <span className="font-bold text-xs">:</span>
            <div className="flex items-center justify-center bg-white/20 backdrop-blur-xs px-2 sm:px-2.5 py-1 rounded-[4px] min-w-[2.4rem] text-center">
              <span className="font-mono text-xs sm:text-sm font-bold">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
            </div>
            <span className="font-bold text-xs">:</span>
            <div className="flex items-center justify-center bg-white/20 backdrop-blur-xs px-2 sm:px-2.5 py-1 rounded-[4px] min-w-[2.4rem] text-center">
              <span className="font-mono text-xs sm:text-sm font-bold">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
            </div>
            <span className="font-bold text-xs">:</span>
            <div className="flex items-center justify-center bg-white text-rose-600 px-2 sm:px-2.5 py-1 rounded-[4px] min-w-[2.4rem] text-center shadow-xs">
              <span className="font-mono text-xs sm:text-sm font-bold animate-pulse">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>

        {/* Clean White Product Card Container */}
        <div className="bg-white border-x border-b border-slate-200 rounded-b-[8px] p-5 sm:p-8 md:p-10 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 lg:gap-12 items-center">
            
            {/* Product Image */}
            <div 
              className="md:col-span-5 relative aspect-square w-full max-w-[340px] sm:max-w-[400px] mx-auto bg-slate-50 rounded-[6px] overflow-hidden cursor-pointer border border-slate-100 group"
              onClick={() => onOpenDetail(product)}
            >
              <img
                loading="lazy"
                decoding="async"
                src={optimizeImageUrl(cardImage, 600)}
                alt={product.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                }}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />

              {displayStoreLogo && (
                <div className="absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-sm bg-white/90 p-0.5 shadow-xs flex items-center justify-center">
                  <img src={displayStoreLogo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}

              {hasDiscount && discountPercent > 0 && (
                <span className="absolute top-2.5 right-2.5 bg-[#e53935] text-white text-xs font-bold px-2.5 py-1 rounded-[4px] shadow-xs">
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Product Details & Actions */}
            <div className="md:col-span-7 flex flex-col justify-center space-y-4 text-center md:text-left">
              
              {/* Product Title */}
              <h3 
                onClick={() => onOpenDetail(product)}
                className="text-lg sm:text-2xl font-bold text-slate-900 hover:text-emerald-800 transition-colors cursor-pointer leading-snug line-clamp-2"
              >
                {product.title}
              </h3>

              {/* Price Row */}
              <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {formatPrice(currentPrice)}
                </span>
                {regularPrice && regularPrice > currentPrice && (
                  <span className="text-sm sm:text-base text-slate-400 line-through">
                    {formatPrice(regularPrice)}
                  </span>
                )}
                {hasDiscount && discountPercent > 0 && (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-[4px]">
                    সেভ {discountPercent}%
                  </span>
                )}
              </div>

              {/* Variant Selector */}
              {variants.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-700 block">
                    {variantLabel}:
                  </span>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVariantId(v.id);
                          }}
                          className={`px-3.5 py-1.5 rounded-[4px] text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#FDD305] text-slate-950 border-[#FDD305] shadow-xs ring-1 ring-amber-400'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400 hover:bg-amber-50/20'
                          }`}
                        >
                          {v.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 max-w-lg">
                <button
                  type="button"
                  onClick={() => onAddToCart(product, 1, selectedVariant || undefined)}
                  className="w-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-xs sm:text-sm py-3 px-4 rounded-[4px] shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <span>কার্ট-এ যোগ করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => onBuyNow(product, selectedVariant || undefined)}
                  className="w-full bg-[#FDD305] hover:bg-[#e6be02] active:scale-95 text-slate-950 font-bold text-xs sm:text-sm py-3 px-4 rounded-[4px] shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>অর্ডার করুন</span>
                </button>

              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default function FantineStorePage({ onGoToLogin, onGoToLanding }: FantineStorePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: routeSlug, id: routeId } = useParams<{ slug?: string; id?: string }>();

  // Navigation View: 'home' | 'shop' | 'about' | 'contact' | 'product_detail' | 'checkout' | 'quiz'
  const [activeNav, setActiveNav] = useState<'home' | 'shop' | 'about' | 'contact' | 'product_detail' | 'checkout' | 'quiz'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/product')) return 'product_detail';
      if (p.startsWith('/shop')) return 'shop';
      if (p.startsWith('/about')) return 'about';
      if (p.startsWith('/contact')) return 'contact';
      if (p.startsWith('/quiz')) return 'quiz';
      if (p.startsWith('/checkout')) return 'checkout';
    }
    return 'home';
  });
  const [selectedCategoryCheckbox, setSelectedCategoryCheckbox] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<number>(50000); // Max range default
  const [quizPrompt, setQuizPrompt] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Dynamic Ecom Settings for Hero Banners & Videos
  const [ecomSettings, setEcomSettings] = useState<EcomSettings | null>(null);
  const [instituteInfo, setInstituteInfo] = useState<InstituteInfo | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // Dynamic Product State from Admin / DB (No Seed Data Overwriting)
  const [products, setProducts] = useState<FantineProductItem[]>(() => {
    try {
      const cached = localStorage.getItem('noor_ecom_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => normalizeFantineProduct(p, idx));
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Helper to find matching product from URL path or router params (supports /product/:slug and legacy /product/:slug/:id)
  const findProductFromPath = useCallback((path: string, slugParam?: string, idParam?: string, productList: FantineProductItem[] = products) => {
    if (!productList || productList.length === 0) return null;
    const targetSlug = decodeURIComponent(slugParam || '').trim().toLowerCase();
    const targetId = decodeURIComponent(idParam || '').trim().toLowerCase();
    const cleanPath = decodeURIComponent(path || '').toLowerCase();

    // 1. Direct match by slugParam
    if (targetSlug) {
      const slugMatch = productList.find(p => {
        const pSlug = (p.slug || getProductSlug(p)).toLowerCase();
        return pSlug === targetSlug || p.id.toLowerCase() === targetSlug;
      });
      if (slugMatch) return slugMatch;
    }

    // 2. Direct match by idParam (for legacy /product/:slug/:id)
    if (targetId) {
      const idMatch = productList.find(p => {
        const pSlug = (p.slug || getProductSlug(p)).toLowerCase();
        return p.id.toLowerCase() === targetId || pSlug === targetId;
      });
      if (idMatch) return idMatch;
    }

    // 3. Extract product segment from path like /product/:slug
    const segMatch = cleanPath.match(/\/product\/([^/?#]+)/);
    if (segMatch && segMatch[1]) {
      const seg = segMatch[1].trim();
      const direct = productList.find(p => {
        const pSlug = (p.slug || getProductSlug(p)).toLowerCase();
        return pSlug === seg || p.id.toLowerCase() === seg;
      });
      if (direct) return direct;
    }

    // 4. Substring search in path
    const fallback = productList.find(p => {
      const pSlug = (p.slug || getProductSlug(p)).toLowerCase();
      return (pSlug.length > 2 && cleanPath.includes(pSlug)) || cleanPath.includes(p.id.toLowerCase());
    });
    if (fallback) return fallback;

    return null;
  }, [products]);

  // Active Selected Product for Detail Page (Deep link aware on initial load)
  const [activeProductDetail, setActiveProductDetail] = useState<FantineProductItem | null>(() => {
    try {
      const cached = localStorage.getItem('noor_ecom_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const initialList = parsed.map((p, idx) => normalizeFantineProduct(p, idx));
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product')) {
            const p = decodeURIComponent(window.location.pathname).toLowerCase();
            const segMatch = p.match(/\/product\/([^/?#]+)/);
            const target = segMatch ? segMatch[1].trim() : '';
            const found = initialList.find(prod => {
              const slug = (prod.slug || getProductSlug(prod)).toLowerCase();
              return (target && (slug === target || prod.id.toLowerCase() === target)) ||
                     (slug.length > 2 && p.includes(slug)) ||
                     p.includes(prod.id.toLowerCase());
            });
            if (found) return found;
          }
          return initialList[0] || null;
        }
      }
    } catch {
      // fallback
    }
    return null;
  });
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [isHoverZooming, setIsHoverZooming] = useState<boolean>(false);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [detailQuantity, setDetailQuantity] = useState<number>(1);


  // Sync Live Settings from dbService & publicStoreService
  const loadLiveSettings = async () => {
    try {
      const [settings, info] = await Promise.all([
        (await import('../lib/dbService')).dbService.getEcomSettings().catch(() => null),
        (await import('../lib/dbService')).dbService.getInstituteInfo().catch(() => null)
      ]);
      if (settings) setEcomSettings(settings);
      if (info) setInstituteInfo(info);
    } catch {
      // ignore
    }

    try {
      const [pubSettings, pubInfo] = await Promise.all([
        publicStoreService.getEcomSettings().catch(() => null),
        publicStoreService.getInstituteInfo().catch(() => null)
      ]);
      if (pubSettings) {
        setEcomSettings(prev => prev || pubSettings);
      }
      if (pubInfo) {
        setInstituteInfo(prev => prev || pubInfo);
      }
    } catch {
      // ignore
    }
  };

  // Sync Live Products from dbService & publicStoreService
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadLiveProducts = async () => {
    try {
      const dbProds = await dbService.getProducts();
      if (dbProds && dbProds.length > 0) {
        const normalized = dbProds.map((p, idx) => normalizeFantineProduct(p, idx));
        setProducts(normalized);
        setActiveProductDetail(prev => {
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product')) {
            const urlMatch = findProductFromPath(window.location.pathname, routeSlug, routeId, normalized);
            if (urlMatch) return urlMatch;
          }
          const match = normalized.find(p => p.id === prev?.id);
          return match || normalized[0];
        });
        return;
      }
    } catch (err) {
      console.warn('Failed loading from dbService:', err);
    }

    try {
      const pubProds = await publicStoreService.getProducts();
      if (pubProds && pubProds.length > 0) {
        const normalized = pubProds.map((p, idx) => normalizeFantineProduct(p, idx));
        setProducts(normalized);
        setActiveProductDetail(prev => {
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product')) {
            const urlMatch = findProductFromPath(window.location.pathname, routeSlug, routeId, normalized);
            if (urlMatch) return urlMatch;
          }
          const match = normalized.find(p => p.id === prev?.id);
          return match || normalized[0];
        });
      }
    } catch (err) {
      console.warn('Failed loading from publicStoreService:', err);
    }
  };



  useEffect(() => {
    loadLiveProducts();
    loadLiveSettings();

    const handleProductUpdate = () => {
      loadLiveProducts();
    };
    const handleSettingsUpdate = () => {
      loadLiveSettings();
    };

    window.addEventListener('ecom-products-updated', handleProductUpdate);
    window.addEventListener('ecom-settings-updated', handleSettingsUpdate);
    window.addEventListener('institute-info-updated', handleSettingsUpdate);
    window.addEventListener('storage', handleProductUpdate);
    return () => {
      window.removeEventListener('ecom-products-updated', handleProductUpdate);
      window.removeEventListener('ecom-settings-updated', handleSettingsUpdate);
      window.removeEventListener('institute-info-updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleProductUpdate);
    };
  }, []);

  // General States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [currency] = useState<'BDT'>('BDT');
  
  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [orderTrackQuery, setOrderTrackQuery] = useState('');
  const [orderTrackResults, setOrderTrackResults] = useState<any[]>([]);
  const [orderTrackLoading, setOrderTrackLoading] = useState(false);
  const [orderTrackSearched, setOrderTrackSearched] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });
  // Recently Viewed Products tracking
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('surokkha_recently_viewed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (activeProductDetail?.id) {
      setRecentlyViewedIds(prev => {
        const filtered = prev.filter(id => id !== activeProductDetail.id);
        const updated = [activeProductDetail.id, ...filtered].slice(0, 10);
        try {
          localStorage.setItem('surokkha_recently_viewed', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [activeProductDetail?.id]);

  const relatedProducts = useMemo(() => {
    if (!activeProductDetail) return [];
    const sameCategory = products.filter(p => 
      p.id !== activeProductDetail.id && 
      ((activeProductDetail.series && p.series && p.series.toLowerCase() === activeProductDetail.series.toLowerCase()) ||
       (activeProductDetail.category && p.category && p.category.toLowerCase() === activeProductDetail.category.toLowerCase()))
    );
    if (sameCategory.length >= 4) {
      return sameCategory.slice(0, 4);
    }
    const remaining = products.filter(p => p.id !== activeProductDetail.id && !sameCategory.some(sc => sc.id === p.id));
    return [...sameCategory, ...remaining].slice(0, 4);
  }, [activeProductDetail, products]);

  const recentlyViewedProducts = useMemo(() => {
    if (!activeProductDetail) return [];
    return recentlyViewedIds
      .filter(id => id !== activeProductDetail.id)
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as FantineProductItem[];
  }, [recentlyViewedIds, activeProductDetail, products]);

  // 10-Minute Cart Reservation Hold State
  const [reservationSeconds, setReservationSeconds] = useState<number>(600); // 10 mins

  // In-Memory Fast Search Index Instance
  const searchEngine = useMemo(() => new ProductSearchEngine(products), [products]);
  const searchOutput = useMemo(() => searchEngine.search(searchTerm), [searchEngine, searchTerm]);

  // Cart State (Zustand Global Store)
  const cart = useAppStore(state => state.cart);
  const addToCartAction = useAppStore(state => state.addToCart);
  const removeFromCartAction = useAppStore(state => state.removeFromCart);
  const updateQuantityAction = useAppStore(state => state.updateQuantity);
  const clearCartAction = useAppStore(state => state.clearCart);


  // Reservation Timer Countdown
  useEffect(() => {
    if (cart.length === 0) {
      setReservationSeconds(600);
      return;
    }

    const interval = setInterval(() => {
      setReservationSeconds(prev => {
        if (prev <= 1) {
          return 600; // auto-refresh hold
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cart.length]);

  // Dynamic Store & Footer Brand Details (From Admin Profile / Store Setup)
  const displayStoreName = ecomSettings?.storeName || instituteInfo?.name || 'SHOSTIR BAZAR';
  const displayStoreLogo = ecomSettings?.storeLogo || ecomSettings?.logoUrl || instituteInfo?.logo || '/uploads/file-1792215004226-886642061.jpg';
  const displayStoreFavicon = ecomSettings?.storeFavicon || ecomSettings?.favicon || instituteInfo?.favicon || instituteInfo?.storeFavicon || '/placeholder-favicon.svg';
  const displayCompanyName = ecomSettings?.companyName || instituteInfo?.name || displayStoreName;
  const displayTagline = ecomSettings?.storeTagline || ecomSettings?.footerDescription || instituteInfo?.description || 'Quality Products & Reliable Delivery.';
  const displayEmail = ecomSettings?.contactEmail || instituteInfo?.email || '';
  const displayPhone = ecomSettings?.contactPhone || instituteInfo?.phone || '';
  const displayAddress = ecomSettings?.storeAddress || instituteInfo?.address || '';
  const displayAnnouncement = ecomSettings?.topAnnouncementText || `WELCOME TO ${displayStoreName.toUpperCase()}`;
  const socialLinks = ecomSettings?.socialLinks;
  const aboutSettings: AboutPageSettings = ecomSettings?.aboutSettings || DEFAULT_ABOUT_SETTINGS;

  // Dynamic Flash Sale Countdown Hook
  const flashSaleConfig = ecomSettings?.flashSale;
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTime = () => {
      const endDateStr = flashSaleConfig?.endDate;
      if (!endDateStr) {
        setFlashSaleTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const diff = +new Date(endDateStr) - +new Date();
      if (diff > 0) {
        setFlashSaleTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        });
      } else {
        setFlashSaleTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [flashSaleConfig?.endDate]);

  // Dynamic Favicon and Document Title Sync
  useEffect(() => {
    if (displayStoreFavicon) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = displayStoreFavicon;
    }
    if (displayStoreName) {
      const homeTitle = ecomSettings?.storeTagline?.trim()
        ? `${displayStoreName} - ${ecomSettings.storeTagline.trim()}`
        : `${displayStoreName} - COMFORT TO WELLNESS`;
      const homeDesc = ecomSettings?.storeTagline?.trim() || aboutSettings?.description || 'SHOSTIR BAZAR - COMFORT TO WELLNESS. Discover premium quality products for your health, comfort, and daily wellness.';
      updateMetaTags(
        homeTitle, 
        homeDesc, 
        displayStoreLogo,
        window.location.href
      );
    }
  }, [displayStoreLogo, displayStoreName, ecomSettings?.storeTagline, aboutSettings?.description]);

  // Dynamic SEO based on active view
  useEffect(() => {
    if (activeNav === 'product_detail' && activeProductDetail) {
      updateMetaTags(
        `${activeProductDetail.title} | ${displayStoreName}`,
        activeProductDetail.subtitle || activeProductDetail.description || 'View product details and clinical formulation.',
        activeProductDetail.coverImage || activeProductDetail.image,
        window.location.href
      );
      updateProductSchema(activeProductDetail, window.location.href, displayStoreName);
      updateBreadcrumbSchema([
        { name: 'Home', url: window.location.origin },
        { name: 'Shop', url: `${window.location.origin}/shop` },
        ...(activeProductDetail.series ? [{ name: activeProductDetail.series, url: `${window.location.origin}/shop` }] : []),
        { name: activeProductDetail.title, url: window.location.href }
      ]);

      // Track ViewContent for Meta Pixel & GTM
      const eventId = createEventId('view');
      trackEvent('ViewContent', {
        content_name: activeProductDetail.title,
        content_ids: [activeProductDetail.id],
        content_type: 'product',
        value: activeProductDetail.price,
        currency: 'BDT'
      }, eventId);
    } else if (activeNav === 'shop') {
      updateMetaTags(
        `Shop All Products | ${displayStoreName}`,
        aboutSettings?.description || `Browse our complete catalog of quality products at ${displayStoreName}.`,
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
      updateBreadcrumbSchema([
        { name: 'Home', url: window.location.origin },
        { name: 'Shop', url: window.location.href }
      ]);
    } else if (activeNav === 'about') {
      updateMetaTags(
        `About Us | ${displayStoreName}`,
        aboutSettings?.subtitle || aboutSettings?.description || `Learn about our story and mission at ${displayStoreName}.`,
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
      updateBreadcrumbSchema([]);
    } else if (activeNav === 'contact') {
      updateMetaTags(
        `Contact Us & Customer Support | ${displayStoreName}`,
        'Get in touch with our customer care team via WhatsApp, phone, or email.',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
      updateBreadcrumbSchema([]);
    } else if (activeNav === 'quiz') {
      updateMetaTags(
        `Product Finder Quiz | ${displayStoreName}`,
        'Find your custom recommendations tailored to your needs.',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
      updateBreadcrumbSchema([]);
    } else if (activeNav === 'checkout') {
      updateMetaTags(
        `Secure Checkout | ${displayStoreName}`,
        'Complete your order with Fast Delivery & Cash on Delivery across Bangladesh.',
        displayStoreLogo,
        window.location.href
      );
      updateProductSchema(null, window.location.href, displayStoreName);
      updateBreadcrumbSchema([]);
    } else if (activeNav === 'home') {
      const homeTitle = `${displayStoreName} - COMFORT TO WELLNESS | স্বস্তির বাজার Official Store`;
      const homeDesc = `${displayStoreName} (স্বস্তির বাজার) - COMFORT TO WELLNESS. Discover premium organic dates, fresh dry fruits, raw nuts, seeds, and healthy lifestyle products delivered across Bangladesh.`;
      updateMetaTags(
        homeTitle,
        homeDesc,
        displayStoreLogo,
        window.location.origin
      );
      updateProductSchema(null, window.location.origin, displayStoreName);
      updateBreadcrumbSchema([]);
    }
  }, [activeNav, activeProductDetail, displayStoreName, displayStoreLogo, ecomSettings?.storeTagline, aboutSettings?.description, aboutSettings?.subtitle]);

  // Track Search event on search query input (debounced)
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q || q.length < 2) return;
    const timer = setTimeout(() => {
      trackEvent('Search', { search_string: q });
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Transparent Header on initial top view, solid white on scroll
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isTransparentHeader = (activeNav === 'home' || activeNav === 'about') && !isScrolled;

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Central Router Navigation Helper (Syncs Browser URL with SPA Views)
  const navigateTo = useCallback((section: 'home' | 'shop' | 'about' | 'contact' | 'checkout' | 'quiz') => {
    setIsMobileMenuOpen(false);
    const targetPath = section === 'home' ? '/' : `/${section}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
    setActiveNav(section);
    scrollToTop();
  }, [location.pathname, navigate, scrollToTop]);

  // Sync React Router pathname with active store view & product
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/product')) {
      const found = findProductFromPath(path, routeSlug, routeId, products);
      if (found) {
        setActiveProductDetail(found);
        setActiveNav('product_detail');
      } else if (products.length > 0) {
        setActiveProductDetail(products[0]);
        setActiveNav('product_detail');
      }
    } else if (path.startsWith('/shop')) {
      setActiveNav('shop');
    } else if (path.startsWith('/about')) {
      setActiveNav('about');
    } else if (path.startsWith('/contact')) {
      setActiveNav('contact');
    } else if (path.startsWith('/quiz')) {
      setActiveNav('quiz');
    } else if (path.startsWith('/checkout')) {
      setActiveNav('checkout');
    } else if (path === '/' || path === '') {
      setActiveNav('home');
    }
  }, [location.pathname, routeSlug, routeId, products, findProductFromPath]);

  // Bangladeshi Taka BDT Currency Formatter (Clean & Professional)
  const formatPrice = (priceVal: number) => {
    if (!priceVal && priceVal !== 0) return '৳0';
    const num = Number(priceVal) || 0;
    const isWhole = num % 1 === 0;
    return `৳${num.toLocaleString('en-US', { minimumFractionDigits: isWhole ? 0 : 2, maximumFractionDigits: 2 })}`;
  };


  // Add to Cart Helper
  const handleAddToCart = useCallback((product: Product, quantity = 1, variant?: import('../types').ProductVariant) => {
    const eventId = createEventId('cart');
    const effectivePrice = variant?.price ?? product.price ?? 0;
    trackEvent('AddToCart', {
      content_name: variant?.name ? `${product.title} (${variant.name})` : product.title,
      content_ids: [product.id],
      content_type: 'product',
      value: effectivePrice * quantity,
      currency: 'BDT',
      num_items: quantity,
      contents: [{
        id: product.id,
        name: variant?.name ? `${product.title} (${variant.name})` : product.title,
        quantity: quantity,
        item_price: effectivePrice
      }]
    }, eventId);
    addToCartAction({ product, quantity, variant });
    setShowNotificationToast({ show: true, msg: `Added ${product.title}${variant?.name ? ` (${variant.name})` : ''} to your bag.` });
    setTimeout(() => setShowNotificationToast({ show: false, msg: '' }), 3500);
  }, [addToCartAction]);

  const handleRemoveFromCart = useCallback((productId: string, variantId?: string) => {
    removeFromCartAction(productId, variantId);
  }, [removeFromCartAction]);

  const handleUpdateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCartAction(productId, variantId);
      return;
    }
    updateQuantityAction(productId, quantity, variantId);
  }, [removeFromCartAction, updateQuantityAction]);

  // Open Full Product Detail Page with dynamic SEO deep-link URL
  const openProductDetail = useCallback((product: FantineProductItem) => {
    setActiveProductDetail(product);
    setActiveImageIndex(0);
    setDetailQuantity(1);
    if (product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
    setActiveNav('product_detail');
    const slug = getProductSlug(product);
    navigate(`/product/${encodeURIComponent(slug)}`);
    scrollToTop();
  }, [navigate, scrollToTop]);

  // Home Click Handler - Always refreshes on click
  const handleHomeClick = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setSearchTerm('');
    setSelectedCategoryCheckbox('All');
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.location.reload();
    } else {
      window.location.href = '/';
    }
  }, []);

  // Quick Autocomplete Suggestions for Search Bar
  const searchSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [products, searchTerm]);

  // Execute Search: navigates to shop view and applies search query
  const handleExecuteSearch = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchDropdownOpen(false);
    setSelectedCategoryCheckbox('All');
    setCurrentPage(1);
    if (activeNav !== 'shop') {
      navigateTo('shop');
    }
    setTimeout(() => {
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }, 150);
  }, [activeNav, navigateTo]);

  // Public 1-Click Order Tracking
  const handleSearchOrderTracking = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = orderTrackQuery.trim();
    if (!q) return;
    setOrderTrackLoading(true);
    setOrderTrackSearched(true);
    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.orders)) {
        setOrderTrackResults(data.orders);
      } else {
        setOrderTrackResults([]);
      }
    } catch (err) {
      console.error('Order tracking fetch error:', err);
      setOrderTrackResults([]);
    } finally {
      setOrderTrackLoading(false);
    }
  }, [orderTrackQuery]);


  // Cart Subtotal
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + ((item.variant?.price ?? item.product.price) * item.quantity), 0);
  }, [cart]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Filtered & Sorted Catalog for Shop Page
  const filteredCatalog = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm.trim() || 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategoryCheckbox === 'All' || (() => {
        const cat = selectedCategoryCheckbox.toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const pSeries = (p.series || '').toLowerCase();
        const pTitle = (p.title || '').toLowerCase();

        if (pCat === cat || pSeries === cat) return true;
        
        // Smart keyword fallbacks for wellness/organic e-commerce
        if (cat === 'honey') return pCat.includes('honey') || pTitle.includes('honey') || pTitle.includes('মধু');
        if (cat === 'ghee') return pCat.includes('ghee') || pTitle.includes('ghee') || pTitle.includes('ঘি');
        if (cat === 'nuts') return pCat.includes('nut') || pTitle.includes('nut') || pTitle.includes('বাদাম');
        if (cat === 'oil') return pCat.includes('oil') || pTitle.includes('oil') || pTitle.includes('তেল');
        if (cat === 'super food') return pCat.includes('super') || pTitle.includes('super') || pTitle.includes('ফুড');
        if (cat === 'combo') return pCat.includes('combo') || pTitle.includes('combo') || pTitle.includes('কম্বো');
        if (cat === 'wellness') return pCat.includes('well') || pTitle.includes('well') || pTitle.includes('স্বাস্থ্য');
        if (cat === 'mango') return pCat.includes('mango') || pTitle.includes('mango') || pTitle.includes('আম');
        if (cat === 'herbs') return pCat.includes('herb') || pTitle.includes('herb') || pTitle.includes('ভেষজ');
        if (cat === 'popular') return Boolean(p.isFeatured || (p.rating && p.rating >= 4.5) || pTitle.includes('popular'));

        return pCat.includes(cat) || pSeries.includes(cat) || pTitle.includes(cat);
      })();
        
      const matchesBrand = selectedBrand === 'All' || 
        p.brand === selectedBrand;
        
      const matchesPrice = p.price <= priceRange;

      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });
  }, [products, searchTerm, selectedCategoryCheckbox, selectedBrand, priceRange, sortBy]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCatalog.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCatalog, currentPage]);

  const shopCategories = useMemo(() => {
    const set = new Set<string>();
    if (ecomSettings?.categories && Array.isArray(ecomSettings.categories)) {
      ecomSettings.categories.forEach(c => {
        if (typeof c === 'string' && c.trim()) set.add(c.trim());
        else if (typeof c === 'object' && (c as any).name) set.add((c as any).name.trim());
      });
    }
    products.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
      if (p.series && p.series.trim()) set.add(p.series.trim());
    });
    const custom = Array.from(set);
    return custom.length > 0 ? ['All', ...custom] : ['All'];
  }, [products, ecomSettings?.categories]);

  // Dynamic Categories strictly from Admin Panel and Live Catalog (Not Static)
  const headerCategories = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addCat = (rawName?: string) => {
      if (!rawName || typeof rawName !== 'string') return;
      const trimmed = rawName.trim();
      if (!trimmed || trimmed.toLowerCase() === 'all') return;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(trimmed);
      }
    };

    // 1. Categories configured in Admin Panel CategoryManager (categoryItems)
    if (Array.isArray(ecomSettings?.categoryItems) && ecomSettings.categoryItems.length > 0) {
      const sorted = [...ecomSettings.categoryItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      sorted.forEach(c => addCat(c.name));
    }

    // 2. Categories string array from Admin Panel (ecomSettings.categories)
    if (Array.isArray(ecomSettings?.categories)) {
      ecomSettings.categories.forEach(c => {
        if (typeof c === 'string') addCat(c);
        else if (c && typeof c === 'object' && (c as any).name) addCat((c as any).name);
      });
    }

    // 3. Any categories assigned to active store products
    if (Array.isArray(products)) {
      products.forEach(p => {
        if (p.category) addCat(p.category);
        if (p.series && p.series !== 'Default') addCat(p.series);
      });
    }

    return list;
  }, [ecomSettings?.categoryItems, ecomSettings?.categories, products]);



  const shopBrands = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.brand).filter(Boolean)))];
  }, [products]);

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const displayCategories = useMemo(() => {
    // 6 Specific categories matching the reference screenshot:
    // Date, Ghee, Super Food, Popular, Nuts, Honey
    const primaryCategories = [
      {
        id: 'date',
        name: 'Date',
        targetCategory: 'Date',
        fallbackImage: '/uploads/file-1792008302322-954151091.jpg',
        matcher: (p: any) => p.title?.includes('আজুয়া') || p.category?.toLowerCase() === 'date'
      },
      {
        id: 'ghee',
        name: 'Ghee',
        targetCategory: 'Ghee',
        fallbackImage: '/uploads/file-1792005519018-520389445.jpg',
        matcher: (p: any) => p.title?.includes('ঘি') || p.category?.toLowerCase() === 'ghee'
      },
      {
        id: 'super-food',
        name: 'Super Food',
        targetCategory: 'Super Food',
        fallbackImage: '/uploads/file-1792008102063-753198725.jpg',
        matcher: (p: any) => p.title?.includes('কিসমিস') || p.category?.toLowerCase() === 'super food'
      },
      {
        id: 'popular',
        name: 'Popular',
        targetCategory: 'Date',
        fallbackImage: '/uploads/file-1792008232986-551579138.jpg',
        matcher: (p: any) => p.title?.includes('সুক্কারী')
      },
      {
        id: 'nuts',
        name: 'Nuts',
        targetCategory: 'Nuts',
        fallbackImage: '/uploads/file-1792008679391-28565173.jpg',
        matcher: (p: any) => p.title?.includes('কাঠ বাদাম') || p.category?.toLowerCase() === 'nuts'
      },
      {
        id: 'honey',
        name: 'Honey',
        targetCategory: 'Honey',
        fallbackImage: '/uploads/file-1792007998814-75550648.jpg',
        matcher: (p: any) => p.title?.includes('মধু') || p.category?.toLowerCase() === 'honey'
      }
    ];

    if (ecomSettings?.categoryItems && Array.isArray(ecomSettings.categoryItems) && ecomSettings.categoryItems.length >= 4) {
      return ecomSettings.categoryItems.map(item => ({
        id: item.id || item.name,
        name: item.name,
        targetCategory: item.name,
        image: item.image || products.find(p => p.category?.toLowerCase() === item.name.toLowerCase())?.image || DEFAULT_FANTINE_FALLBACK_IMAGE
      }));
    }

    return primaryCategories.map(cat => {
      const matched = products.find(cat.matcher);
      const img = matched?.image || (matched as any)?.coverImage || cat.fallbackImage;
      return {
        id: cat.id,
        name: cat.name,
        targetCategory: cat.targetCategory,
        image: img
      };
    });
  }, [ecomSettings?.categoryItems, products]);

  // Deterministic daily category selection (Changes once every 24 hours at midnight)
  const dailyCategoryData = useMemo(() => {
    if (!products || products.length === 0) return null;

    // 1. Group products by non-empty category
    const catMap = new Map<string, FantineProductItem[]>();
    products.forEach(p => {
      const cat = (p.category || (p as any).series || '').trim();
      if (cat) {
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(p);
      }
    });

    const availableCategories = Array.from(catMap.keys()).sort();

    if (availableCategories.length === 0) {
      return {
        categoryName: 'আজকের নির্বাচিত পণ্য',
        products: products.slice(0, 4)
      };
    }

    // 2. Deterministic day seed from local calendar date (e.g. 20261015)
    // Same day will ALWAYS yield the exact same category
    // Next day (midnight) will automatically shift to the next category
    const now = new Date();
    const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

    const selectedIndex = Math.abs(daySeed) % availableCategories.length;
    const selectedCategoryName = availableCategories[selectedIndex];
    const categoryProducts = catMap.get(selectedCategoryName) || [];

    // Up to 4 products from this category (padded with other products if category has fewer)
    let displayProducts = categoryProducts.slice(0, 4);
    if (displayProducts.length < 4 && products.length >= 4) {
      const remaining = products.filter(p => !displayProducts.some(dp => dp.id === p.id));
      displayProducts = [...displayProducts, ...remaining.slice(0, 4 - displayProducts.length)];
    }

    return {
      categoryName: selectedCategoryName,
      products: displayProducts
    };
  }, [products]);

  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage) || 1;

  // Active Delivery Methods from Admin Settings
  const activeDeliveryMethods = useMemo<DeliveryMethodItem[]>(() => {
    const list = ecomSettings?.deliveryMethods || DEFAULT_DELIVERY_METHODS;
    const active = list.filter(m => m.status === 'Active');
    return active.length > 0 ? active : list;
  }, [ecomSettings?.deliveryMethods]);

  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] = useState<string>('');

  useEffect(() => {
    if (activeDeliveryMethods.length > 0) {
      if (!selectedDeliveryMethodId || !activeDeliveryMethods.some(m => m.id === selectedDeliveryMethodId)) {
        setSelectedDeliveryMethodId(activeDeliveryMethods[0].id);
      }
    }
  }, [activeDeliveryMethods, selectedDeliveryMethodId]);

  const selectedDeliveryMethod = useMemo(() => {
    return activeDeliveryMethods.find(m => m.id === selectedDeliveryMethodId) || activeDeliveryMethods[0];
  }, [activeDeliveryMethods, selectedDeliveryMethodId]);

  const deliveryCalc = useMemo(() => {
    return calculateDeliveryCharge({
      items: cart,
      method: selectedDeliveryMethod,
      settings: ecomSettings
    });
  }, [cart, selectedDeliveryMethod, ecomSettings]);

  const deliveryCharge = deliveryCalc.totalCharge;

  // Active Payment Gateways from Admin Settings
  const activePaymentGateways = useMemo<PaymentGatewayItem[]>(() => {
    let gateways = ecomSettings?.paymentGateways;
    if (!gateways || gateways.length === 0) {
      gateways = DEFAULT_PAYMENT_GATEWAYS;
    }
    const active = gateways.filter(g => g.status === 'Active');
    return active.length > 0 ? active : gateways;
  }, [ecomSettings?.paymentGateways]);

  const [selectedPaymentGatewayId, setSelectedPaymentGatewayId] = useState<string>('');
  const [trxId, setTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [copiedAccNo, setCopiedAccNo] = useState(false);

  useEffect(() => {
    if (activePaymentGateways.length > 0) {
      if (!selectedPaymentGatewayId || !activePaymentGateways.some(g => g.id === selectedPaymentGatewayId)) {
        setSelectedPaymentGatewayId(activePaymentGateways[0].id);
      }
    }
  }, [activePaymentGateways, selectedPaymentGatewayId]);

  const selectedPaymentGateway = useMemo(() => {
    return activePaymentGateways.find(g => g.id === selectedPaymentGatewayId) || activePaymentGateways[0];
  }, [activePaymentGateways, selectedPaymentGatewayId]);

  const isOnlinePayment = selectedPaymentGateway && 
    selectedPaymentGateway.type !== 'Cash on Delivery' && 
    selectedPaymentGateway.type !== 'COD' &&
    !selectedPaymentGateway.title.toLowerCase().includes('cash on delivery') &&
    !selectedPaymentGateway.title.toLowerCase().includes('Cash on');

  // Coupon State & Calculation
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const coupons = await dbService.getCoupons();
      const match = coupons.find(c => c.code.toLowerCase() === couponCodeInput.trim().toLowerCase() && c.status === 'Active');
      if (!match) {
        setCouponError('Invalid or expired coupon code');
        return;
      }
      if (match.minSpent && cartSubtotal < match.minSpent) {
        setCouponError(`Minimum to use this coupon ${formatPrice(match.minSpent)} Must order money`);
        return;
      }
      setAppliedCoupon(match);
      setCouponSuccess(`coupon "${match.code}" successfulhas been applied!`);
      setCouponCodeInput('');
    } catch {
      setCouponError('There was a problem validating the coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  };

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percent') {
      const disc = Math.round((cartSubtotal * appliedCoupon.discount) / 100);
      return appliedCoupon.maxDiscount ? Math.min(disc, appliedCoupon.maxDiscount) : disc;
    }
    return Math.min(appliedCoupon.discount, cartSubtotal);
  }, [appliedCoupon, cartSubtotal]);

  const gatewayDiscount = selectedPaymentGateway?.discountAmount ? Number(selectedPaymentGateway.discountAmount) : 0;
  const gatewayFee = selectedPaymentGateway?.transactionFee ? Number(selectedPaymentGateway.transactionFee) : 0;
  const cartGrandTotal = Math.max(0, cartSubtotal + deliveryCharge + gatewayFee - gatewayDiscount - couponDiscountAmount);

  // Checkout Form
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<BookOrder | null>(null);

  const handleCopyAccountNumber = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedAccNo(true);
    setTimeout(() => setCopiedAccNo(false), 2000);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutName.trim()) {
      alert('অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }

    const phoneVal = validateBDPhone(checkoutPhone);
    if (!phoneVal.isValid) {
      alert(phoneVal.error || 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।');
      return;
    }

    const addrVal = validateDeliveryAddress(checkoutAddress);
    if (!addrVal.isValid) {
      alert(addrVal.error || 'অনুগ্রহ করে সম্পূর্ণ বিস্তারিত ঠিকানা লিখুন।');
      return;
    }

    if (cart.length === 0) {
      alert('Your shopping bag is empty.');
      return;
    }

    if (isOnlinePayment && (!senderPhone.trim() || !trxId.trim())) {
      alert(`please ${selectedPaymentGateway?.title || 'Payment'}-sender of mobile number and Transaction ID (TrxID) day।`);
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderPayload: BookOrder = {
        id: orderId,
        customerName: checkoutName.trim(),
        name: checkoutName.trim(),
        phone: phoneVal.cleanedPhone,
        address: addrVal.cleanedAddress,
        deliveryArea: selectedDeliveryMethod?.title || 'Inside Dhaka',
        deliveryZone: selectedDeliveryMethod?.title || 'Inside Dhaka',
        district: selectedDeliveryMethod?.title || 'Inside Dhaka',
        deliveryCharge: deliveryCharge,
        price: cartSubtotal,
        unitPrice: cart.length === 1 ? cart[0].product.price : cartSubtotal,
        totalAmount: cartGrandTotal,
        totalPrice: cartGrandTotal,
        productName: cart.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
        productTitle: cart.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
        status: 'Pending',
        orderType: 'storefront',
        paymentMethod: selectedPaymentGateway?.title || 'COD',
        paymentGateway: selectedPaymentGateway?.title || 'COD',
        senderPhone: isOnlinePayment ? senderPhone.trim() : undefined,
        trxId: isOnlinePayment ? trxId.trim() : undefined,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscountAmount > 0 ? couponDiscountAmount : undefined,
        quantity: cart.reduce((acc, i) => acc + i.quantity, 0),
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        items: cart.map(i => ({
          product: {
            id: i.product.id,
            title: i.product.title,
            price: i.product.price,
            regularPrice: i.product.regularPrice,
            image: i.product.coverImage,
            category: i.product.category,
            stock: i.product.stock || 100,
            isAvailable: true
          },
          quantity: i.quantity
        }))
      };

      // 1. Try Authoritative Server-Side Atomic Checkout first
      let confirmedOrder: BookOrder = orderPayload;
      let orderCreatedViaServer = false;

      try {
        const response = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: checkoutName.trim(),
            phone: checkoutPhone.trim(),
            address: checkoutAddress.trim(),
            deliveryZone: selectedDeliveryMethod?.title || 'Inside Dhaka',
            paymentMethod: selectedPaymentGateway?.title || 'Cash on Delivery',
            senderPhone: isOnlinePayment ? senderPhone.trim() : undefined,
            trxId: isOnlinePayment ? trxId.trim() : undefined,
            couponCode: appliedCoupon?.code,
            items: cart.map(i => ({
              productId: i.product.id,
              quantity: i.quantity,
              price: i.product.price,
              regularPrice: i.product.regularPrice,
              title: i.product.title
            }))
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData?.order) {
            confirmedOrder = resData.order;
            orderCreatedViaServer = true;
          }
        }
      } catch {
        // Fallback to direct client DB service if offline/standalone
      }

      // 2. Fallback / Sync to Local & Firestore DB
      if (!orderCreatedViaServer) {
        await dbService.addBookOrder(orderPayload);
      } else {
        await dbService.saveBookOrder(confirmedOrder);
      }

      // Track Purchase event before clearing cart
      const purchaseEventId = createEventId('purchase');
      const totalItemsPurchased = cart.reduce((acc, item) => acc + item.quantity, 0);
      trackEvent('Purchase', {
        content_name: cart.map(i => i.product.title).join(', '),
        content_ids: cart.map(i => i.product.id),
        content_type: 'product',
        value: cartGrandTotal || cartSubtotal,
        currency: 'BDT',
        num_items: totalItemsPurchased,
        contents: cart.map(item => ({
          id: item.product.id,
          name: item.product.title,
          quantity: item.quantity,
          item_price: item.product.price
        }))
      }, purchaseEventId);

      playOrderSuccessVibe();
      setOrderSuccess(confirmedOrder);
      clearCartAction();
      setIsCartOpen(false);
      setCheckoutName('');
      setCheckoutPhone('');
      setCheckoutAddress('');
      setTrxId('');
      setSenderPhone('');
      setAppliedCoupon(null);
    } catch (err) {
      console.error('Order error:', err);
      alert('There was a problem processing the order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const currentProductImages = useMemo(() => {
    if (!activeProductDetail) return ['/placeholder-image.svg'];
    const imgs: string[] = [];
    if (activeProductDetail.coverImage) imgs.push(activeProductDetail.coverImage);
    if (Array.isArray(activeProductDetail.additionalImages)) {
      activeProductDetail.additionalImages.forEach(img => {
        if (img && !imgs.includes(img)) imgs.push(img);
      });
    }
    if (imgs.length === 0 && activeProductDetail.image) {
      imgs.push(activeProductDetail.image);
    }
    return imgs.length > 0 ? imgs : ['/placeholder-image.svg'];
  }, [activeProductDetail]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans relative selection:bg-rose-100 selection:text-rose-900">
      
      {/* Toast Notification */}
      {showNotificationToast.show && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium">{showNotificationToast.msg}</span>
        </div>
      )}

      {/* ============================================================
          PRIMARY #FDD305 TOP HEADER APPBAR & DYNAMIC CATEGORY BAR
          ============================================================ */}
      <header className="sticky top-0 z-40 bg-[#FDD305] text-slate-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Left: Brand Logo (Always refreshes to home on click) */}
          <div className="flex items-center shrink-0">
            <button 
              type="button"
              className="flex items-center cursor-pointer group shrink-0 border-0 bg-transparent p-0 transition-transform active:scale-95" 
              onClick={handleHomeClick}
              title={`${displayStoreName} - হোম`}
            >
              <div className="bg-white rounded-lg px-2 py-1 shadow-2xs border border-amber-300/60 flex items-center justify-center">
                <img 
                  src={displayStoreLogo} 
                  alt={displayStoreName} 
                  className="h-8 sm:h-9 md:h-10 w-auto max-w-[140px] sm:max-w-[180px] md:max-w-[200px] object-contain" 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/uploads/file-1792215004226-886642061.jpg';
                  }}
                />
              </div>
            </button>
          </div>

          {/* Center: Full-Width Responsive Search Bar */}
          <div className="relative flex-1 min-w-0 max-w-xl mx-1 sm:mx-3">
            <form 
              onSubmit={handleExecuteSearch}
              className="relative flex items-center bg-white rounded-md overflow-hidden shadow-xs border border-amber-300 focus-within:border-slate-900 transition-all w-full"
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  setIsSearchDropdownOpen(Boolean(val.trim()));
                  setCurrentPage(1);
                  if (val.trim() && activeNav !== 'shop') {
                    navigateTo('shop');
                  }
                }}
                onFocus={() => {
                  if (searchTerm.trim()) setIsSearchDropdownOpen(true);
                }}
                onBlur={() => {
                  setTimeout(() => setIsSearchDropdownOpen(false), 250);
                }}
                placeholder={`Search in ${displayStoreName}...`}
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none"
              />

              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setIsSearchDropdownOpen(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors mr-1 cursor-pointer"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              <button
                type="submit"
                className="bg-slate-950 hover:bg-slate-800 active:bg-black text-white px-3.5 sm:px-5 py-2 sm:py-2.5 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                title="Search"
              >
                <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </form>

            {/* Quick Live Autocomplete Dropdown */}
            {isSearchDropdownOpen && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-md shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto text-slate-900">
                <div className="p-2.5 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider flex justify-between items-center">
                  <span className="text-slate-800">অনুসন্ধান ফলাফল ({searchSuggestions.length})</span>
                  <span className="text-[10px] font-normal text-slate-400">এন্টার চাপুন বা ক্লিক করুন</span>
                </div>
                {searchSuggestions.map((prod) => (
                  <div
                    key={prod.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsSearchDropdownOpen(false);
                      openProductDetail(prod);
                    }}
                    className="flex items-center gap-3 p-2.5 hover:bg-amber-50/80 transition-colors cursor-pointer"
                  >
                    <img 
                      src={prod.image || '/placeholder-product.svg'} 
                      alt={prod.title} 
                      className="w-10 h-10 object-contain rounded bg-white border border-slate-100 shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{prod.title}</p>
                      <p className="text-xs text-slate-950 font-bold">
                        {currency} {prod.price.toLocaleString('bn-BD')}
                        {prod.originalPrice && prod.originalPrice > prod.price && (
                          <span className="ml-1.5 text-[11px] text-slate-400 line-through font-normal">
                            {currency} {prod.originalPrice.toLocaleString('bn-BD')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsSearchDropdownOpen(false);
                    handleExecuteSearch();
                  }}
                  className="w-full py-2.5 px-3 bg-[#FDD305] hover:bg-[#e6be02] text-slate-950 text-xs font-bold text-center transition-colors block cursor-pointer"
                >
                  সকল ফলাফল দেখুন &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Right: 3 Action Items (Order Track, Cart, Profile) */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-5 shrink-0 text-slate-900 min-w-[170px] sm:min-w-[195px] justify-end">
            {/* 1. Order Track */}
            <button 
              type="button"
              onClick={() => setIsOrderTrackingOpen(true)}
              className="flex flex-col items-center justify-center text-slate-900 hover:text-black transition-colors cursor-pointer group py-0.5 min-w-[50px] sm:min-w-[56px] shrink-0"
              title="Order Track"
            >
              <div className="relative flex items-center justify-center">
                <Truck className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-slate-900 group-hover:scale-105 transition-transform" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap overflow-visible">Order Track</span>
            </button>

            {/* 2. Cart */}
            <button 
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex flex-col items-center justify-center text-slate-900 hover:text-black transition-colors cursor-pointer group py-0.5 min-w-[44px] sm:min-w-[50px] shrink-0"
              title="Shopping Cart"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-slate-900 group-hover:scale-105 transition-transform" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-slate-950 text-[#FDD305] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap overflow-visible">Cart</span>
            </button>

            {/* 3. Profile */}
            <button 
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex flex-col items-center justify-center text-slate-900 hover:text-black transition-colors cursor-pointer group py-0.5 min-w-[44px] sm:min-w-[50px] shrink-0"
              title="Profile & Menu"
            >
              <div className="relative flex items-center justify-center">
                <User className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-slate-900 group-hover:scale-105 transition-transform" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap overflow-visible">Profile</span>
            </button>
          </div>

        </div>

        {/* Dynamic Category Row from Admin Panel */}
        {headerCategories.length > 0 && (
          <div className="border-t border-amber-300/80 bg-[#f5cb05]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex items-center gap-4 sm:gap-6 md:gap-7 overflow-x-auto no-scrollbar py-2 text-xs sm:text-sm font-semibold whitespace-nowrap text-slate-900">
                {headerCategories.map((catName) => {
                  const isSelected = selectedCategoryCheckbox.toLowerCase() === catName.toLowerCase();
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCategoryCheckbox('All');
                        } else {
                          setSelectedCategoryCheckbox(catName);
                        }
                        setCurrentPage(1);
                        if (activeNav !== 'shop') {
                          navigateTo('shop');
                        }
                        setTimeout(() => {
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }, 150);
                      }}
                      className={`transition-colors cursor-pointer pb-0.5 ${
                        isSelected
                          ? 'text-black font-black border-b-2 border-slate-950'
                          : 'text-slate-900 hover:text-black'
                      }`}
                    >
                      {catName}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>





      {/* ============================================================
          MAIN BODY CONTENT (ROUTED VIEWS)
          ============================================================ */}

      {/* VIEW 1: DEDICATED PRODUCT DETAIL VIEW */}
      {activeNav === 'product_detail' && (
        activeProductDetail ? (
        <div className="py-6 sm:py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500">
            <button onClick={() => navigateTo('home')} className="hover:text-slate-900 transition-colors cursor-pointer">Home</button>
            <span>/</span>
            <button onClick={() => navigateTo('shop')} className="hover:text-slate-900 transition-colors cursor-pointer">Shop</button>
            <span>/</span>
            <span className="text-slate-800 font-medium">{activeProductDetail.series}</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-none">{activeProductDetail.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-start">
            
            {/* Left Gallery: Naturo Style (Vertical Thumbnails on Left, Clean Main Image on Right) */}
            <div className="lg:col-span-6 flex flex-col-reverse md:flex-row gap-3 sm:gap-4 items-start">
              
              {/* Vertical Thumbnails List (Desktop: Left Column, Mobile: Horizontal Row Below) */}
              {currentProductImages.length > 1 && (
                <div className="flex flex-row md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto w-full md:w-20 lg:w-24 shrink-0 max-h-[520px] py-1 md:py-0 no-scrollbar">
                  {currentProductImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 md:w-full md:h-20 lg:h-24 rounded-lg bg-white border-2 ${
                        activeImageIndex === idx 
                          ? 'border-[#FDD305] ring-2 ring-amber-400 shadow-sm' 
                          : 'border-slate-200 hover:border-amber-400'
                      } p-1.5 overflow-hidden transition-all shrink-0 cursor-pointer flex items-center justify-center`}
                      aria-label={`View product image ${idx + 1}`}
                    >
                      <img 
                        width={80} 
                        height={80} 
                        src={imgUrl} 
                        alt={`${activeProductDetail.title} thumbnail ${idx + 1}`} 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-contain" 
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Product Frame (Clean, Professional & No Unwanted Hover Zooming) */}
              <div 
                className="relative flex-1 w-full aspect-square max-h-[520px] bg-[#f8faf8] rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center group"
              >
                <img 
                  fetchPriority="high" 
                  width={520} 
                  height={520} 
                  src={currentProductImages[activeImageIndex] || activeProductDetail.coverImage} 
                  alt={activeProductDetail.title} 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                  }}
                  className="w-4/5 h-4/5 object-contain select-none"
                />

                {/* Left/Right Carousel Arrows */}
                {currentProductImages.length > 1 && (
                  <>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(prev => (prev === 0 ? currentProductImages.length - 1 : prev - 1));
                      }}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer z-10 shadow-sm"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(prev => (prev === currentProductImages.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer z-10 shadow-sm"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Fullscreen Zoom Lightbox Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomModalOpen(true);
                  }}
                  className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer z-10"
                  title="Click to Zoom Fullscreen"
                >
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

            </div>

            {/* Right Side: Title, Package List, Price, Weight Selector, Quantity, 4 Action Buttons (Pahariya Style) */}
            {(() => {
              const effectivePrice = selectedVariant?.price ?? activeProductDetail.price;
              const effectiveRegularPrice = selectedVariant?.regularPrice ?? activeProductDetail.regularPrice;
              const effectiveDiscount = effectiveRegularPrice && effectiveRegularPrice > effectivePrice
                ? Math.round(((effectiveRegularPrice - effectivePrice) / effectiveRegularPrice) * 100)
                : activeProductDetail.discountPercentage;

              const variantsList = (activeProductDetail.variants && activeProductDetail.variants.length > 0)
                ? activeProductDetail.variants
                : [];

              const currentVariant = selectedVariant || (variantsList.length > 0 ? variantsList[0] : null);
              const hotline = (ecomSettings?.hotlinePhone && ecomSettings.hotlinePhone !== '09678812525')
                ? ecomSettings.hotlinePhone
                : ((displayPhone && displayPhone !== '09678812525') ? displayPhone : null);

              const rawWhatsApp = ecomSettings?.whatsappNumber || socialLinks?.whatsapp || displayPhone || '01329458568';
              const cleanWhatsApp = (rawWhatsApp || '').replace(/[^\d]/g, '');
              const whatsappNum = (cleanWhatsApp && cleanWhatsApp !== '01700000000' && cleanWhatsApp !== '09678812525')
                ? cleanWhatsApp
                : (cleanWhatsApp || '8801329458568');

              const whatsappOrderMessage = encodeURIComponent(
                `হ্যালো, আমি এই পণ্যটি অর্ডার করতে চাই:\n• পণ্য: ${activeProductDetail.title}${currentVariant ? `\n• ভেরিয়েন্ট: ${currentVariant.name}` : ''}\n• পরিমাণ: ${detailQuantity}\n• সর্বমোট: ${formatPrice(effectivePrice * detailQuantity)}\nঅনুগ্রহ করে আমার ডেলিভারি কনফার্ম করুন।`
              );

              // Extract package contents / highlights
              const bulletSource = activeProductDetail.benefitsHighlights || activeProductDetail.description || '';
              const parsedBullets = bulletSource
                .split('\n')
                .map(line => line.trim().replace(/^[•\-\*]\s*/, ''))
                .filter(line => line.length > 2);

              const packageItems = parsedBullets.length > 0 ? parsedBullets : [
                '১০০% খাঁটি ও গুণগত মানের উপাদান',
                'ন্যাচারাল উপায়ে সংগৃহীত ও প্রক্রিয়াজাত',
                'কোনো কৃত্রিম রং বা প্রিজারভেটিভ নেই',
                'নিরাপদ ও স্বাস্থ্যসম্মত ফুড-গ্রেড প্যাকেজিং'
              ];

              return (
                <div className="lg:col-span-6 space-y-4 sm:space-y-5">
                  {/* Category / Series Tag */}
                  {activeProductDetail.series && (
                    <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold uppercase tracking-wider rounded-md border border-emerald-200">
                      {activeProductDetail.series}
                    </span>
                  )}

                  {/* Title */}
                  <h1 className="text-xl sm:text-2xl lg:text-3xl text-slate-900 font-bold tracking-tight leading-snug">
                    {activeProductDetail.title}
                  </h1>

                  {/* Package List: "প্যাকে যা যা থাকছে:" (Pahariya Screenshot 1) */}
                  <div className="bg-[#fffdf7] border border-amber-200/90 rounded-xl p-3.5 sm:p-4 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-amber-500" />
                      <span>প্যাকে যা যা থাকছে:</span>
                    </h3>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                      {packageItems.slice(0, 6).map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Price Row: Bold Dark Current Price + Strikethrough Regular Price */}
                  <div className="flex flex-wrap items-baseline gap-3 py-1">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                      {formatPrice(effectivePrice)}
                    </span>
                    {effectiveRegularPrice && effectiveRegularPrice > effectivePrice && (
                      <span className="text-base sm:text-lg text-slate-400 line-through">
                        {formatPrice(effectiveRegularPrice)}
                      </span>
                    )}
                    {effectiveDiscount && (
                      <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded">
                        {effectiveDiscount}% OFF
                      </span>
                    )}
                  </div>

                  {/* Weight / Variant Selector (বাছাই করুন:) */}
                  {variantsList.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          ওজন / সাইজ বাছাই করুন: {currentVariant && <span className="text-amber-700 font-bold">{currentVariant.name}</span>}
                        </label>
                        {currentVariant?.price ? (
                          <span className="text-xs font-bold text-slate-950 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                            {formatPrice(currentVariant.price)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {variantsList.map((v) => {
                          const isSelected = currentVariant?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariant(v)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-[#FDD305] text-slate-950 border-[#FDD305] shadow-sm ring-2 ring-amber-400 font-bold'
                                  : 'bg-white text-slate-800 border-slate-300 hover:border-amber-400 hover:bg-slate-50'
                              }`}
                            >
                              <span>{v.name}</span>
                              {v.price > 0 && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                  isSelected ? 'bg-amber-400/40 text-slate-950 font-bold' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {formatPrice(v.price)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity Stepper: [-] 1 [+] */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-slate-700">পরিমাণ:</span>
                    <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                      <button
                        type="button"
                        onClick={() => setDetailQuantity(prev => Math.max(1, prev - 1))}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-5 py-2 text-sm font-bold text-slate-900 min-w-[2.5rem] text-center">
                        {detailQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDetailQuantity(prev => prev + 1)}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons: Buy Now & Order on WhatsApp Only */}
                  <div className="space-y-3 pt-2">
                    {/* Button 1: Buy Now (Solid Vibrant Yellow Full Width) */}
                    <button 
                      type="button"
                      onClick={() => {
                        handleAddToCart(activeProductDetail, detailQuantity, currentVariant || undefined);
                        setIsCartOpen(false);
                        navigateTo('checkout');
                      }}
                      className="w-full bg-[#FDD305] hover:bg-[#e6be02] active:scale-[0.99] text-slate-950 font-black py-3.5 px-4 rounded-xl text-sm sm:text-base tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Buy Now</span>
                    </button>

                    {/* Button 2: Order on WhatsApp (Solid Green Full Width) */}
                    <a
                      href={`https://wa.me/${whatsappNum}?text=${whatsappOrderMessage}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl text-sm sm:text-base tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5 fill-current" />
                      <span>Order on WhatsApp</span>
                    </a>
                  </div>

                  {/* Product Description */}
                  <div className="space-y-1.5 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Product Description / পণ্যের বিবরণ:</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light text-justify whitespace-pre-line">
                      {activeProductDetail.description || activeProductDetail.benefitsHighlights || '১০০% খাঁটি ও গুণগত মানসম্পন্ন খাদ্য ও প্রাকৃতিক পণ্য।'}
                    </p>
                  </div>

                  {/* How to use / Benefits */}
                  {(activeProductDetail.howToUse || activeProductDetail.benefitsHighlights) && (
                    <div className="space-y-1.5 pt-2">
                      <h3 className="text-sm font-bold text-slate-900">ব্যবহার বিধি / উপকারিতা:</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light text-justify whitespace-pre-line">
                        {activeProductDetail.howToUse || activeProductDetail.benefitsHighlights}
                      </p>
                    </div>
                  )}

                  {/* Purity Guarantee Badge */}
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200/80 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span className="text-xs text-emerald-900 font-medium">
                      ন্যাচারাল ও ল্যাব টেস্টে শতভাগ বিশুদ্ধতার নিশ্চয়তা। সারা দেশে ক্যাশ অন ডেলিভারি সুবিধা।
                    </span>
                  </div>

                </div>
              );
            })()}

          </div>

          {/* ============================================================
              1. RELATED / RECOMMENDED PRODUCTS (আরও পণ্য / আপনার পছন্দের হতে পারে)
              ============================================================ */}
          {relatedProducts.length > 0 && (
            <section className="mt-12 sm:mt-16 pt-10 sm:pt-14 border-t border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                    আরও পণ্য দেখুন
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activeProductDetail.series) {
                      setSelectedCategoryCheckbox(activeProductDetail.series);
                    }
                    navigateTo('shop');
                    scrollToTop();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-black hover:underline cursor-pointer"
                >
                  <span>সব পণ্য দেখুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {relatedProducts.map((prod) => (
                  <PahariyaProductCard
                    key={'related-' + prod.id}
                    product={prod}
                    displayStoreLogo={displayStoreLogo}
                    onOpenDetail={openProductDetail}
                    onAddToCart={handleAddToCart}
                    onBuyNow={(p, variant) => {
                      handleAddToCart(p, 1, variant);
                      setIsCartOpen(false);
                      navigateTo('checkout');
                    }}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ============================================================
              2. RECENTLY VIEWED PRODUCTS (সম্প্রতি দেখা পণ্যসমূহ)
              ============================================================ */}
          {recentlyViewedProducts.length > 0 && (
            <section className="mt-12 sm:mt-16 pt-10 sm:pt-14 border-t border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                    সম্প্রতি দেখা পণ্যসমূহ
                  </h2>
                </div>
                {recentlyViewedProducts.length > 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      navigateTo('shop');
                      scrollToTop();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-black hover:underline cursor-pointer"
                  >
                    <span>শপ দেখুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {recentlyViewedProducts.slice(0, 4).map((prod) => (
                  <PahariyaProductCard
                    key={'recent-' + prod.id}
                    product={prod}
                    displayStoreLogo={displayStoreLogo}
                    onOpenDetail={openProductDetail}
                    onAddToCart={handleAddToCart}
                    onBuyNow={(p, variant) => {
                      handleAddToCart(p, 1, variant);
                      setIsCartOpen(false);
                      navigateTo('checkout');
                    }}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
        ) : (
          <div className="py-24 max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-4">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="font-serif text-xl font-bold text-slate-800">No data setup now</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This product formulation is not available or has not been set up yet.
            </p>
            <button 
              onClick={() => navigateTo('shop')}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Browse Shop
            </button>
          </div>
        )
      )}

      {/* VIEW 2: CONTACT US PAGE (Clean Direct Contact - No Message Form) */}
      {activeNav === 'contact' && (
        <div className="py-10 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase">
              সরাসরি যোগাযোগ
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              যোগাযোগ করুন
            </h2>
            <div className="w-12 h-1 bg-[#FDD305] mx-auto rounded-full"></div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto pt-1 font-medium">
              যেকোনো পণ্য, অর্ডার বা তথ্যের জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন।
            </p>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Phone / Hotline */}
            <div className="bg-white rounded-[8px] p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-slate-900 border border-amber-300 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">হটলাইন / কল</h3>
                <p className="text-xs text-slate-600 font-semibold">{displayPhone || 'কল করুন'}</p>
              </div>
              {displayPhone && (
                <a 
                  href={`tel:${displayPhone.replace(/[^\d+]/g, '')}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline"
                >
                  <span>সরাসরি কল করুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* WhatsApp */}
            <div className="bg-white rounded-[8px] p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-slate-900 border border-amber-300 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">হোয়াটসঅ্যাপ</h3>
                <p className="text-xs text-slate-600 font-semibold">{ecomSettings?.whatsappNumber || socialLinks?.whatsapp || displayPhone || 'চ্যাট করুন'}</p>
              </div>
              {(ecomSettings?.whatsappNumber || socialLinks?.whatsapp || displayPhone) && (
                <a 
                  href={`https://wa.me/${(ecomSettings?.whatsappNumber || socialLinks?.whatsapp || displayPhone || '').replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline"
                >
                  <span>চ্যাট করুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Email */}
            <div className="bg-white rounded-[8px] p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-slate-900 border border-amber-300 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">ইমেইল</h3>
                <p className="text-xs text-slate-600 font-semibold truncate max-w-[200px]">{displayEmail || 'ইমেইল করুন'}</p>
              </div>
              {displayEmail && (
                <a 
                  href={`mailto:${displayEmail}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline"
                >
                  <span>ইমেইল পাঠান</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Office Address */}
            <div className="bg-white rounded-[8px] p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-slate-900 border border-amber-300 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">অফিস / ঠিকানা</h3>
                <p className="text-xs text-slate-600 font-medium line-clamp-2">{displayAddress || 'ঢাকা, বাংলাদেশ'}</p>
              </div>
              <span className="mt-auto text-[11px] font-semibold text-slate-400">
                সরাসরি ভিজিট করুন
              </span>
            </div>

          </div>

          {/* Quick Back to Home button */}
          <div className="text-center pt-4">
            <button
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[4px] bg-[#FDD305] hover:bg-[#e6be02] text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>কেনাকাটা চালিয়ে যান</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
            </button>
          </div>

        </div>
      )}

      {/* VIEW 3: SHOP CATALOG PAGE (Screenshot 3 & 4) */}
      {activeNav === 'shop' && (
        <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
          


          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-5 sm:p-6 border border-slate-200/80 shadow-xs">
                <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 pb-2 border-b border-slate-100">
                  Shop Categories
                </h2>
                
                {shopCategories.length > 1 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
                    {shopCategories.map((cat) => (
                      <label 
                        key={cat}
                        className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 hover:text-slate-950 select-none"
                      >
                        <input 
                          type="checkbox"
                          checked={selectedCategoryCheckbox === cat}
                          onChange={() => {
                            setSelectedCategoryCheckbox(cat);
                            setCurrentPage(1);
                          }}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
                        />
                        <span className="truncate">{cat}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-1">No data setup now</p>
                )}
              </div>

              {shopBrands.length > 1 && (
                <div className="bg-white p-5 sm:p-6 border border-slate-200/80 shadow-xs">
                  <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 pb-2 border-b border-slate-100">
                    Brands
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
                    {shopBrands.map((brand: any) => (
                      <label 
                        key={brand}
                        className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 hover:text-slate-950 select-none"
                      >
                        <input 
                          type="radio"
                          name="brand_filter"
                          checked={selectedBrand === brand}
                          onChange={() => {
                            setSelectedBrand(brand);
                            setCurrentPage(1);
                          }}
                          className="w-4 h-4 text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
                        />
                        <span className="truncate">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white p-5 sm:p-6 border border-slate-200/80 shadow-xs">
                <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 pb-2 border-b border-slate-100">
                  Filter by Price
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Tk. 0</span>
                    <span>Tk. {priceRange.toLocaleString('en-US')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={priceRange}
                    onChange={(e) => {
                      setPriceRange(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-9 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="text-xs text-slate-500 font-medium">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredCatalog.length)} of {filteredCatalog.length} products (Page {currentPage})
                  {searchTerm && <span className="text-slate-800 font-semibold ml-1">for &quot;{searchTerm}&quot;</span>}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Sort:</span>
                  <select 
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-800 rounded-none focus:outline-none cursor-pointer"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Product Grid or Empty State (2-cols on mobile, 3-cols on tablet/desktop) */}
              {paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                  {paginatedProducts.map((product) => (
                    <PahariyaProductCard
                      key={product.id}
                      product={product}
                      displayStoreLogo={displayStoreLogo}
                      onOpenDetail={openProductDetail}
                      onAddToCart={handleAddToCart}
                      onBuyNow={(prod, variant) => {
                        handleAddToCart(prod, 1, variant);
                        setIsCartOpen(false);
                        navigateTo('checkout');
                      }}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-4">
                  <Package className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-slate-800">
                      No data setup now
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Products added in the admin panel will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-4">
                  <Search className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-slate-800">
                      No products found
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      We couldn&apos;t find any products matching &quot;{searchTerm}&quot;. Try adjusting your keywords or category filters.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategoryCheckbox('All');
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Clear Search & View All
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-8 text-xs text-slate-600 font-medium">
                <button 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1}
                  className="hover:text-slate-950 disabled:opacity-40"
                >
                  ← First
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                  disabled={currentPage === 1}
                  className="hover:text-slate-950 disabled:opacity-40"
                >
                  &lt; Previous
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-6 h-6 flex items-center justify-center ${currentPage === i + 1 ? 'font-bold text-slate-950 border-b border-slate-950' : 'hover:text-slate-950'}`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                  disabled={currentPage === totalPages}
                  className="hover:text-slate-950 disabled:opacity-40"
                >
                  Next &gt;
                </button>
                <button 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={currentPage === totalPages}
                  className="hover:text-slate-950 disabled:opacity-40"
                >
                  Last →
                </button>
              </div>



            </div>

          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 4: DEDICATED ABOUT US PAGE (Clean Simple Text & Narrative)
          ============================================================ */}
      {activeNav === 'about' && (
        <div className="bg-[#faf9f6] animate-fadeIn min-h-[70vh]">
          
          {/* 1. CINEMATIC ABOUT HERO BANNER */}
          <section className="relative overflow-hidden py-16 sm:py-24 min-h-[360px] sm:min-h-[420px] flex items-center justify-center bg-slate-950 text-white border-b border-slate-900">
            <div className="absolute inset-0 z-0 overflow-hidden">
              {(aboutSettings.image || aboutSettings.heroImage) ? (
                <img
                  src={aboutSettings.image || aboutSettings.heroImage}
                  alt={aboutSettings.title || aboutSettings.heroTitle || displayStoreName}
                  className="w-full h-full object-cover filter brightness-75 scale-105 transition-transform duration-1000"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-black"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/40"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 text-center space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#FDD305]/20 text-[#FDD305] border border-[#FDD305]/30 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#FDD305]" />
                {aboutSettings.badge || 'ABOUT OUR BRAND'}
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-white font-normal uppercase leading-tight tracking-tight drop-shadow-md">
                {aboutSettings.title || aboutSettings.heroTitle || 'about us'}
              </h1>

              {(aboutSettings.subtitle || aboutSettings.heroSubtitle) && (
                <p className="text-slate-200 text-sm sm:text-base font-light leading-relaxed max-w-2xl mx-auto">
                  {aboutSettings.subtitle || aboutSettings.heroSubtitle}
                </p>
              )}

              {/* Breadcrumb */}
              <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-300 font-mono tracking-wider uppercase">
                <button onClick={() => navigateTo('home')} className="hover:text-white transition-colors cursor-pointer">HOME</button>
                <span>/</span>
                <span className="text-[#93c5fd] font-semibold">about us</span>
              </div>
            </div>
          </section>

          {/* 2. MAIN STORY TEXT CONTENT */}
          <section className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-8">
            <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xs border border-slate-200/80 space-y-8">
              <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-light text-base sm:text-lg whitespace-pre-line space-y-4 text-justify">
                {aboutSettings.content || [
                  aboutSettings.storyParagraph1,
                  aboutSettings.storyParagraph2,
                  aboutSettings.storyParagraph3
                ].filter(Boolean).join('\n\n') || 'Detailed information about us will be added soon.'}
              </div>


            </div>
          </section>

        </div>
      )}

      {/* ============================================================
          VIEW 5: DEDICATED CHECKOUT PAGE (Exact UX from User Design)
          ============================================================ */}
      {activeNav === 'checkout' && (
        <CheckoutPage
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={() => clearCartAction()}
          ecomSettings={ecomSettings || (DEFAULT_ABOUT_SETTINGS as any)}
          onNavigateHome={() => navigateTo('home')}
          onNavigateShop={() => navigateTo('shop')}
          onOpenLoginModal={onGoToLogin}
        />
      )}

      {/* VIEW 7: SKIN QUIZ */}
      {activeNav === 'quiz' && (
        <SkinQuizView 
          products={products}
          onAddToCart={(product) => handleAddToCart(product, 1)}
          onCancel={() => navigateTo('home')}
          isWishlisted={(productId) => false}
          onToggleWishlist={() => {}}
          onOpenDetail={(product) => openProductDetail(product)}
        />
      )}

      {/* VIEW 6: HOME VIEW (Default - Matching brandini.co.kr) */}
      {activeNav === 'home' && (
        <>
          {/* ============================================================
              1. TOP HERO SECTION (Dynamic Slider or Clean Placeholder)
              ============================================================ */}
          {(() => {
            const heroBanners = ecomSettings?.heroBanners || [];
            const activeBanner = heroBanners.length > 0 ? heroBanners[activeSlideIndex % heroBanners.length] : null;

            const leftImage = ecomSettings?.heroBannerLeftImage || (ecomSettings?.heroBanners?.[0]?.imageUrl);
            const leftLink = ecomSettings?.heroBannerLeftLink || (ecomSettings?.heroBanners?.[0]?.linkUrl) || '/shop';
            const rightImage = ecomSettings?.heroBannerRightImage || (ecomSettings?.heroBanners?.[1]?.imageUrl);
            const rightLink = ecomSettings?.heroBannerRightLink || (ecomSettings?.heroBanners?.[1]?.linkUrl) || '/shop';

            const hasBanners = Boolean(leftImage || rightImage);

            return (
              <section className="bg-white pt-4 sm:pt-6 pb-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                  {/* Primary SEO Brand Heading for Search Engines */}
                  <h1 className="sr-only">
                    {displayStoreName} - COMFORT TO WELLNESS | স্বস্তির বাজার Official Online Store
                  </h1>
                  
                  {/* DUAL PROMO BANNER GRID (Naturo Style: Left Wide 8 Cols, Right Square 4 Cols ~1:1) */}
                  {hasBanners ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
                      {/* Left Banner (Wide ~67%) */}
                      <div className="col-span-1 lg:col-span-8 flex">
                        {leftImage ? (
                          <div 
                            onClick={() => {
                              if (leftLink.startsWith('http')) window.open(leftLink, '_blank');
                              else navigateTo('shop');
                            }}
                            className="w-full relative rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group bg-[#163e2b] h-[240px] sm:h-[320px] md:h-[380px] lg:h-[420px] cursor-pointer"
                          >
                            <img 
                              src={leftImage} 
                              alt="Promotional Banner" 
                              className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500 cursor-pointer"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/placeholder-image.svg';
                              }}
                            />

                            {/* Left / Right Carousel Arrows */}
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSlideIndex(prev => Math.max(0, prev - 1));
                              }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all cursor-pointer z-10 shadow-md opacity-90 hover:opacity-100"
                              aria-label="Previous Slide"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSlideIndex(prev => prev + 1);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all cursor-pointer z-10 shadow-md opacity-90 hover:opacity-100"
                              aria-label="Next Slide"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>

                            {/* Bottom Center Indicator Dots */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                              <span className="w-5 h-1.5 rounded-full bg-white shadow-xs"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-white/60"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-white/60"></span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-8 flex flex-col justify-center items-center text-center h-[240px] sm:h-[320px] md:h-[380px] lg:h-[420px]">
                            <h3 className="text-xl sm:text-2xl font-bold mb-2">{displayStoreName}</h3>
                            <p className="text-xs sm:text-sm text-emerald-200">100% Pure, Organic & Lab-Tested Quality</p>
                          </div>
                        )}
                      </div>

                      {/* Right Banner (Square ~1:1, ~33%) */}
                      <div className="col-span-1 lg:col-span-4 flex">
                        {rightImage ? (
                          <div 
                            onClick={() => {
                              if (rightLink.startsWith('http')) window.open(rightLink, '_blank');
                              else navigateTo('shop');
                            }}
                            className="w-full relative rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group bg-[#163e2b] h-[240px] sm:h-[320px] md:h-[380px] lg:h-[420px]"
                          >
                            <img 
                              src={rightImage} 
                              alt="Special Offer Banner" 
                              className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/placeholder-image.svg';
                              }}
                            />
                            {/* Promotional Ribbon / Tag */}
                            <div className="absolute top-3 right-3 bg-[#e53935] text-white text-[10px] font-bold px-2.5 py-1 rounded-[4px] shadow-md uppercase tracking-wider">
                              Special Offer
                            </div>
                          </div>
                        ) : (
                          <div className="w-full rounded-2xl bg-gradient-to-br from-[#FDD305] to-[#f59e0b] text-slate-950 p-8 flex flex-col justify-center items-center text-center h-[240px] sm:h-[320px] md:h-[380px] lg:h-[420px] border border-amber-300 shadow-sm">
                            <h3 className="text-lg sm:text-xl font-black mb-2">Fast Nationwide Delivery</h3>
                            <p className="text-xs sm:text-sm text-slate-900 font-medium">Cash on delivery available across Bangladesh</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[6px] border border-dashed border-emerald-300/80 p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-xs space-y-3">
                      <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                        <Package className="w-7 h-7" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                        {displayStoreName}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                        No promotional banners set up yet. Upload your dual promotional banners in Admin Panel → Store Settings.
                      </p>
                      <button 
                        onClick={() => navigateTo('shop')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#134633] hover:bg-[#0e3829] text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-sm"
                      >
                        Explore Catalog →
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* ============================================================
              TOP CATEGORIES SECTION ("সেরা ক্যাটাগরি" Carousel)
              ============================================================ */}
          {displayCategories.length > 0 && (
            <section className="bg-white py-8 sm:py-12 border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-8">
                {/* Section Title */}
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-slate-900 font-bold tracking-tight">
                    সেরা ক্যাটাগরি
                  </h2>
                </div>

                {/* Carousel Container - Exact same left/right alignment as banner */}
                <div className="relative group/carousel">
                  {/* Left Scroll Arrow */}
                  <button
                    type="button"
                    onClick={() => scrollCategories('left')}
                    className="absolute -left-3 sm:-left-4 md:-left-5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 text-slate-700 shadow-md flex items-center justify-center hover:bg-slate-50 transition-all z-10 cursor-pointer active:scale-95"
                    aria-label="Previous Categories"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Horizontal Scroll Cards / Responsive 6-col Desktop Grid */}
                  <div
                    ref={categoryScrollRef}
                    className="flex lg:grid lg:grid-cols-6 items-stretch gap-3 sm:gap-4 md:gap-5 overflow-x-auto lg:overflow-visible scrollbar-none scroll-smooth pb-2 lg:pb-0"
                  >
                    {displayCategories.map((cat) => (
                      <div
                        key={cat.id || cat.name}
                        onClick={() => {
                          setSelectedCategoryCheckbox((cat as any).targetCategory || cat.name);
                          navigateTo('shop');
                        }}
                        className="w-[140px] sm:w-[160px] lg:w-full shrink-0 bg-white border-[1.5px] border-[#1e2d3d] rounded-[6px] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col group select-none"
                      >
                        {/* Top Category Image with white inner frame */}
                        <div className="p-2 sm:p-2.5 pb-2">
                          <div className="w-full aspect-square rounded-[4px] border border-slate-200 overflow-hidden bg-[#faeedd] flex items-center justify-center">
                            <img
                              src={cat.image}
                              alt={cat.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                              }}
                            />
                          </div>
                        </div>

                        {/* Bottom Category Label */}
                        <div className="bg-white py-2.5 px-2 border-t-[1.5px] border-[#1e2d3d] text-center flex items-center justify-center min-h-[42px]">
                          <span className="text-xs sm:text-sm lg:text-[15px] font-bold text-slate-900 line-clamp-1">
                            {cat.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right Scroll Arrow */}
                  <button
                    type="button"
                    onClick={() => scrollCategories('right')}
                    className="absolute -right-3 sm:-right-4 md:-right-5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 text-slate-700 shadow-md flex items-center justify-center hover:bg-slate-50 transition-all z-10 cursor-pointer active:scale-95"
                    aria-label="Next Categories"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Bottom Pagination Indicator Dots */}
                <div className="flex items-center justify-center gap-1.5 mt-5">
                  <span className="w-2 h-2 rounded-full bg-[#1e2d3d]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                </div>
              </div>
            </section>
          )}

          {/* ============================================================
              2. BEST SELLING PRODUCTS (NaturoBD Style)
              ============================================================ */}
          <section className="pt-6 sm:pt-10 pb-4 sm:pb-6 bg-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
              {products.length > 0 ? (
                <>
                  <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl text-slate-900 font-bold tracking-tight">
                      পপুলার প্রোডাক্টস
                    </h2>
                    <div className="w-16 h-1 bg-[#FDD305] mx-auto mt-2 rounded-full"></div>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1.5 font-medium">
                      আমাদের সর্বাধিক বিক্রিত এবং গ্রাহক প্রশংসিত প্রাকৃতিক পণ্যসমূহ
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {products.slice(0, 8).map((product) => (
                      <PahariyaProductCard
                        key={product.id}
                        product={product}
                        displayStoreLogo={displayStoreLogo}
                        onOpenDetail={openProductDetail}
                        onAddToCart={handleAddToCart}
                        onBuyNow={(prod, variant) => {
                          handleAddToCart(prod, 1, variant);
                          setIsCartOpen(false);
                          navigateTo('checkout');
                        }}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-center mt-5 sm:mt-6">
                    <button 
                      onClick={() => navigateTo('shop')}
                      className="inline-flex items-center gap-2 text-slate-900 bg-white hover:bg-slate-50 px-6 py-2 rounded-full border border-slate-300 text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <span>View All Products ({products.length})</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <Package className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-serif text-xl font-normal text-slate-800">
                    No data setup now
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Products added in the admin panel will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ============================================================
              4. DAILY RANDOM CATEGORY SHOWCASE (Changes Once Per Day)
              ============================================================ */}
          {dailyCategoryData && dailyCategoryData.products.length > 0 && (
            <section className="pt-6 sm:pt-10 pb-4 sm:pb-6 bg-white border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-8">
                
                {/* Section Header */}
                <div className="text-center mb-6 sm:mb-8">
                  <span className="text-[11px] font-bold tracking-widest text-slate-900 uppercase bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300 inline-block mb-1.5">
                    আজকের বিশেষ কালেকশন
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl text-slate-900 font-bold tracking-tight">
                    {dailyCategoryData.categoryName}
                  </h2>
                  <div className="w-16 h-1 bg-[#FDD305] mx-auto mt-2 rounded-full"></div>
                  <p className="text-slate-600 text-xs sm:text-sm mt-1.5 font-medium">
                    আমাদের {dailyCategoryData.categoryName} ক্যাটাগরির সেরা পণ্যসমূহ
                  </p>
                </div>

                {/* 4 Products Grid using PahariyaProductCard */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {dailyCategoryData.products.map((product) => (
                    <PahariyaProductCard
                      key={'daily-cat-' + product.id}
                      product={product}
                      displayStoreLogo={displayStoreLogo}
                      onOpenDetail={openProductDetail}
                      onAddToCart={handleAddToCart}
                      onBuyNow={(prod, variant) => {
                        handleAddToCart(prod, 1, variant);
                        setIsCartOpen(false);
                        navigateTo('checkout');
                      }}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>

                {/* View All Button (Goes to main all products page) */}
                <div className="flex items-center justify-center mt-5 sm:mt-6">
                  <button 
                    onClick={() => {
                      setSelectedCategoryCheckbox('All');
                      setSearchTerm('');
                      navigateTo('shop');
                      scrollToTop();
                    }}
                    className="inline-flex items-center gap-2 text-slate-950 bg-[#FDD305] hover:bg-[#e6be02] active:scale-95 px-6 py-2.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer group"
                  >
                    <span>সব পণ্য দেখুন ({products.length})</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-950" />
                  </button>
                </div>

              </div>
            </section>
          )}

          {/* ============================================================
              6. FLASH SALE SPOTLIGHT (Clean & Simple with Variants)
              ============================================================ */}
          {flashSaleConfig?.enabled && products.length > 0 && (() => {
            const targetProd = flashSaleConfig?.productId 
              ? products.find(p => p.id === flashSaleConfig.productId) 
              : products[0];
            
            if (!targetProd) return null;

            return (
              <PahariyaFlashSaleSection
                product={targetProd}
                flashSaleConfig={flashSaleConfig}
                timeLeft={flashSaleTimeLeft}
                displayStoreLogo={displayStoreLogo}
                formatPrice={formatPrice}
                onAddToCart={handleAddToCart}
                onBuyNow={(prod, variant) => {
                  handleAddToCart(prod, 1, variant);
                  setIsCartOpen(false);
                  navigateTo('checkout');
                }}
                onOpenDetail={openProductDetail}
              />
            );
          })()}

        </>
      )}

      {/* ============================================================
          LUXURY FOOTER
          ============================================================ */}
      <React.Suspense fallback={<div className="h-40 bg-[#FDD305]"></div>}>
        <FantineFooter 
          displayStoreLogo={displayStoreLogo}
          displayStoreName={displayStoreName}
          displayTagline={displayTagline}
          displayEmail={displayEmail}
          displayPhone={displayPhone}
          hotlinePhone={ecomSettings?.hotlinePhone}
          whatsappNumber={ecomSettings?.whatsappNumber}
          shopCategories={shopCategories}
          socialLinks={socialLinks}
          setActiveNav={(nav) => navigateTo(nav as any)}
          setSelectedCategoryCheckbox={setSelectedCategoryCheckbox}
          scrollToTop={scrollToTop}
        />
      </React.Suspense>

      {/* ============================================================
          SLIDE-OUT SHOPPING BAG & CHECKOUT DRAWER
          ============================================================ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <div className="w-screen max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
              
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-slate-800" />
                  <h3 className="font-serif text-lg font-bold text-slate-900">Your Shopping Bag ({totalCartCount})</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 10-Minute Cart Reservation Hold Banner */}
              {cart.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-b border-amber-500/25 px-6 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                    <span>Stock Reserved For You:</span>
                  </div>
                  <div className="font-mono font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                    {Math.floor(reservationSeconds / 60).toString().padStart(2, '0')}:{(reservationSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                    <div className="font-serif text-lg text-slate-600">Your bag is empty</div>
                    <p className="text-xs text-slate-500">Discover our clinical Hanbang formulas to get started.</p>
                    <button
                      type="button"
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  cart.map((item) => {
                    const itemPrice = item.variant?.price ?? item.product.price;
                    const itemImage = item.variant?.image || item.product.coverImage;
                    const itemKey = `${item.product.id}-${item.variant?.id || 'default'}`;
                    return (
                      <div key={itemKey} className="flex gap-3 sm:gap-4 pb-4 border-b border-slate-100 items-center relative group">
                        <img 
                          src={itemImage} 
                          alt={item.product.title} 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                          }}
                          className="w-16 h-16 object-cover bg-slate-50 rounded-lg border border-slate-100 shrink-0" 
                        />
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="font-serif text-sm font-semibold text-slate-900 truncate">
                            {item.product.title}
                            {item.variant?.name && (
                              <span className="ml-1 text-xs text-slate-900 font-bold bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300">
                                ({item.variant.name})
                              </span>
                            )}
                          </h4>
                          <div className="text-xs text-slate-500 mt-0.5">{formatPrice(itemPrice)}</div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <button 
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  handleUpdateQuantity(item.product.id, item.quantity - 1, item.variant?.id);
                                } else {
                                  handleRemoveFromCart(item.product.id, item.variant?.id);
                                }
                              }}
                              className="w-6 h-6 border border-slate-200 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-semibold px-2">{item.quantity}</span>
                            <button 
                              type="button"
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                              className="w-6 h-6 border border-slate-200 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Right side: Remove Trash Button + Total Price */}
                        <div className="flex flex-col items-end justify-between self-stretch shrink-0 py-0.5 min-h-[60px]">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.product.id, item.variant?.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors cursor-pointer -mr-1"
                            title="কার্ট থেকে মুছে ফেলুন (Remove item)"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-sm font-serif font-bold text-slate-900">
                            {formatPrice(itemPrice * item.quantity)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-5 sm:p-6 bg-white border-t border-slate-200/80 space-y-4 shadow-lg">
                  {/* Price Breakdown Summary */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-serif font-semibold text-slate-900">{formatPrice(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center font-serif text-sm sm:text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                      <span>Total:</span>
                      <span className="text-[#f97316] text-lg font-black">{formatPrice(cartSubtotal)}</span>
                    </div>
                  </div>

                  {/* Proceed to Dedicated Checkout Page Button */}
                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        if (cart.length > 0) {
                          const eventId = createEventId('initiate_checkout');
                          trackEvent('InitiateCheckout', {
                            content_name: cart.map(i => i.product.title).join(', '),
                            content_ids: cart.map(i => i.product.id),
                            content_type: 'product',
                            value: cartGrandTotal || cartSubtotal,
                            currency: 'BDT',
                            num_items: cart.reduce((acc, item) => acc + item.quantity, 0),
                            contents: cart.map(item => ({
                              id: item.product.id,
                              name: item.product.title,
                              quantity: item.quantity,
                              item_price: item.product.price
                            }))
                          }, eventId);
                        }
                        setIsCartOpen(false);
                        navigateTo('checkout');
                      }}
                      className="w-full bg-[#FDD305] hover:bg-[#e6be02] active:scale-[0.99] text-slate-950 py-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-400/25 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>PROCEED TO CHECKOUT</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ORDER SUCCESS CONFIRMATION MODAL
          ============================================================ */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white max-w-md w-full shadow-2xl p-8 text-center space-y-4 border border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-slate-900">Order Confirmed!</h3>
            <p className="text-xs text-slate-600">
              Thank you for ordering with {displayStoreName}. Your order ID is <strong>{orderSuccess.id}</strong>.
              Our delivery team will contact you shortly.
            </p>
            <button 
              onClick={() => setOrderSuccess(null)}
              className="w-full bg-slate-900 text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              CONTINUE SHOPPING
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          FULLSCREEN PRODUCT IMAGE ZOOM LIGHTBOX MODAL
          ============================================================ */}
      {isZoomModalOpen && (
        <div 
          onClick={() => setIsZoomModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn cursor-zoom-out"
        >
          <button 
            onClick={() => setIsZoomModalOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer z-50"
            title="Close Zoom"
          >
            <X className="w-6 h-6" />
          </button>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center"
          >
            <img fetchPriority="high" width={500} height={500} src={currentProductImages[activeImageIndex] || activeProductDetail.coverImage} alt={activeProductDetail.title} 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
              }}
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl shadow-2xl bg-white/5 p-2 border border-white/10"
            />

            {/* Lightbox Carousel Navigation */}
            {currentProductImages.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => (prev === 0 ? currentProductImages.length - 1 : prev - 1));
                  }}
                  className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => (prev === currentProductImages.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          FLOATING SIDE CART WIDGET (Naturo BD Style with #FDD305 Primary)
          ============================================================ */}
      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#FDD305] hover:bg-[#e6be02] text-slate-950 rounded-l-xl px-2.5 py-3 shadow-2xl flex flex-col items-center gap-1 cursor-pointer transition-transform hover:-translate-x-1 border-l-2 border-y border-amber-400/60 select-none"
        title="View Cart"
        aria-label="View Cart"
      >
        <ShoppingBag className="w-5 h-5 text-slate-950" />
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-950 whitespace-nowrap">
          {totalCartCount} {totalCartCount === 1 ? 'Item' : 'Items'}
        </span>
        <span className="text-[10px] sm:text-[11px] font-black bg-black/10 px-1.5 py-0.5 rounded text-slate-950 whitespace-nowrap">
          ৳{cartSubtotal.toLocaleString('bn-BD')}
        </span>
      </button>

      {/* ============================================================
          ORDER TRACKING MODAL
          ============================================================ */}
      {isOrderTrackingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="bg-[#FDD305] text-slate-950 px-5 py-4 flex items-center justify-between border-b border-amber-300">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-slate-950" />
                <h3 className="text-base sm:text-lg font-bold text-slate-950">অর্ডার ট্র্যাকিং (Order Track)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOrderTrackingOpen(false);
                  setOrderTrackQuery('');
                  setOrderTrackResults([]);
                  setOrderTrackSearched(false);
                }}
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <form onSubmit={handleSearchOrderTracking} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  আপনার ১১ ডিজিটের ফোন নম্বর বা অর্ডার আইডি লিখুন:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orderTrackQuery}
                    onChange={(e) => setOrderTrackQuery(e.target.value)}
                    placeholder="যেমন: 01712345678 বা #ORD-..."
                    className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FDD305] focus:ring-1 focus:ring-[#FDD305]"
                  />
                  <button
                    type="submit"
                    disabled={orderTrackLoading || !orderTrackQuery.trim()}
                    className="bg-[#FDD305] hover:bg-[#e6be02] disabled:bg-slate-300 text-slate-950 px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
                  >
                    {orderTrackLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Search className="w-4 h-4 text-slate-950" />
                    )}
                    <span>ট্র্যাক করুন</span>
                  </button>
                </div>
              </form>


              {/* Loading State */}
              {orderTrackLoading && (
                <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#163e2b]" />
                  <span>অর্ডারের তথ্য খোঁজা হচ্ছে...</span>
                </div>
              )}

              {/* Results */}
              {!orderTrackLoading && orderTrackSearched && (
                orderTrackResults.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    <p className="text-xs font-semibold text-emerald-800">
                      {orderTrackResults.length} টি অর্ডার পাওয়া গেছে:
                    </p>
                    {orderTrackResults.map((order, idx) => {
                      const status = (order.status || 'Pending').toLowerCase();
                      const isDelivered = status === 'delivered';
                      const isShipped = status === 'in transit' || status === 'shipping';
                      const isConfirmed = status === 'confirmed' || status === 'processing';
                      const isPending = !isDelivered && !isShipped && !isConfirmed;

                      return (
                        <div key={order.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div>
                              <p className="text-xs font-bold text-slate-800">অর্ডার #{order.id}</p>
                              <p className="text-[11px] text-slate-500">
                                {order.createdAt ? new Date(order.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isDelivered ? 'bg-emerald-100 text-emerald-800' :
                              isShipped ? 'bg-blue-100 text-blue-800' :
                              isConfirmed ? 'bg-amber-100 text-amber-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {isDelivered ? 'ডেলিভারি সম্পন্ন' :
                               isShipped ? 'কুরিয়ারে প্রেরিত' :
                               isConfirmed ? 'অর্ডার নিশ্চিত হয়েছে' :
                               'প্রক্রিয়াধীন'}
                            </span>
                          </div>

                          {/* Progress Stepper */}
                          <div className="grid grid-cols-4 gap-1 text-center py-1">
                            <div className="flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                              <span className="text-[9px] text-slate-600 mt-1">অর্ডার গ্রহণ</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isConfirmed || isShipped || isDelivered ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                              }`}>
                                {isConfirmed || isShipped || isDelivered ? '✓' : '2'}
                              </div>
                              <span className="text-[9px] text-slate-600 mt-1">নিশ্চিতকরণ</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isShipped || isDelivered ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                              }`}>
                                {isShipped || isDelivered ? '✓' : '3'}
                              </div>
                              <span className="text-[9px] text-slate-600 mt-1">কুরিয়ারে</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isDelivered ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                              }`}>
                                {isDelivered ? '✓' : '4'}
                              </div>
                              <span className="text-[9px] text-slate-600 mt-1">ডেলিভারি</span>
                            </div>
                          </div>

                          {/* Steadfast / Pathao Tracking Code */}
                          {(order.steadfastTrackingCode || order.pathaoTrackingCode) && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                              <div>
                                <p className="text-[11px] font-bold text-emerald-900">কুরিয়ার ট্র্যাকিং কোড:</p>
                                <p className="text-xs font-mono font-bold text-emerald-800">
                                  {order.steadfastTrackingCode || order.pathaoTrackingCode}
                                </p>
                              </div>
                              {order.steadfastTrackingCode && (
                                <a
                                  href={`https://steadfast.com.bd/tracking/${order.steadfastTrackingCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold bg-[#163e2b] text-white px-2.5 py-1 rounded hover:bg-[#102e20] transition-colors"
                                >
                                  কুরিয়ার ট্র্যাক &rarr;
                                </a>
                              )}
                            </div>
                          )}

                          {/* Items */}
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <p className="text-[11px] font-semibold text-slate-600">অর্ডারের পণ্যসমূহ:</p>
                              {order.items.map((item: any, iIdx: number) => (
                                <div key={iIdx} className="flex items-center justify-between text-xs text-slate-700 bg-white p-2 rounded border border-slate-100">
                                  <span className="truncate max-w-[200px]">{item.product?.title || item.title || 'পণ্য'}</span>
                                  <span className="font-semibold text-slate-900">
                                    x{item.quantity} - ৳{((item.variant?.price || item.product?.price || item.price || 0) * item.quantity).toLocaleString('bn-BD')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Total */}
                          <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                            <span className="text-slate-600 font-medium">সর্বমোট মূল্য (ক্যাশ অন ডেলিভারি):</span>
                            <span className="text-sm font-bold text-[#163e2b]">
                              ৳{(order.totalAmount || order.total || 0).toLocaleString('bn-BD')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-2 bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <p className="text-sm font-bold text-slate-800">কোনো অর্ডার পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      অনুগ্রহ করে আপনার অর্ডার করার সময় ব্যবহৃত ১১ ডিজিটের সঠিক মোবাইল নম্বর অথবা অর্ডার আইডি দিয়ে পুনরায় চেষ্টা করুন।
                    </p>
                    {displayPhone && (
                      <div className="pt-2">
                        <a
                          href={`tel:${displayPhone}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#163e2b] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>সাহায্যের জন্য কল করুন: {displayPhone}</span>
                        </a>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PROFILE & SUPPORT MODAL
          ============================================================ */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-4 border border-slate-100 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-[#163e2b] rounded-full flex items-center justify-center mx-auto">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{displayStoreName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">গ্রাহক সহায়তা ও একাউন্ট সেবা</p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsOrderTrackingOpen(true);
                }}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100/80 text-[#163e2b] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 border border-emerald-200"
              >
                <Truck className="w-4 h-4" />
                <span>অর্ডার ট্র্যাকিং (Order Track)</span>
              </button>

              {displayPhone && (
                <a
                  href={`tel:${displayPhone}`}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 text-emerald-700" />
                  <span>সরাসরি কল করুন ({displayPhone})</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  navigateTo('shop');
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>সকল পণ্য দেখুন (Shop)</span>
              </button>

              {onGoToLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onGoToLogin();
                  }}
                  className="w-full py-2 px-4 text-slate-400 hover:text-slate-600 text-[11px] transition-colors cursor-pointer block text-center"
                >
                  অ্যাডমিন প্যানেল লগইন &rarr;
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsProfileOpen(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

