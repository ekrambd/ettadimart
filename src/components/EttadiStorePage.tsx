import { dbService } from "../lib/dbService";
//fix pixel event 2

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ShoppingBag, User, Search, ChevronDown, ChevronLeft, ChevronRight,
  ArrowRight, ArrowLeft, Heart, Star, Check, Sparkles, X, Plus, Minus,
  ShieldCheck, Truck, RefreshCw, Send, HelpCircle, Eye, Share2, Award,
  Phone, Mail, Globe, Droplet, Sun, Moon, Zap, Flame, Layers, MessageCircle, MessageSquare, ArrowUp, MapPin, ZoomIn, Clock,
  Building2, BookOpen, Microscope, Quote, Sprout, FlaskConical, CreditCard, Smartphone, Copy, Tag,
  Play, Pause, Volume2, VolumeX, Menu, Package, Layout, Trash2, LayoutGrid, QrCode, Watch, Shirt, ShoppingCart, Home, FileText, Store
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
import StoreHeader from './StoreHeader';
import { playOrderSuccessVibe } from '../lib/soundUtils';
import { validateBDPhone, validateDeliveryAddress } from '../lib/validationUtils';
import { calculateDeliveryCharge } from '../lib/deliveryUtils';

const EttadiFooter = React.lazy(() => import('./EttadiFooter'));

interface EttadiStorePageProps {
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
  
  // Comprehensive collection of all candidate product images
  const allImagesList: string[] = [];
  const addCandidate = (imgCandidate: any) => {
    if (!imgCandidate) return;
    if (typeof imgCandidate === 'string') {
      const trimmed = imgCandidate.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) parsed.forEach(addCandidate);
          return;
        } catch {}
      }
      const safe = getSafeSkincareImage(trimmed, allImagesList.length);
      if (safe && safe !== DEFAULT_FANTINE_FALLBACK_IMAGE && !allImagesList.includes(safe)) {
        allImagesList.push(safe);
      }
    } else if (Array.isArray(imgCandidate)) {
      imgCandidate.forEach(addCandidate);
    }
  };

  addCandidate((p as any).coverImage);
  addCandidate(p.image);
  addCandidate((p as any).imageUrl);
  addCandidate((p as any).samplePages);
  addCandidate((p as any).additionalImages);
  addCandidate((p as any).images);
  if (Array.isArray(p.variants)) {
    p.variants.forEach((v: any) => {
      if (v?.image) addCandidate(v.image);
    });
  }

  const rawCover = (p as any).coverImage || p.image || (p as any).imageUrl || allImagesList[0];
  const coverImage = getSafeSkincareImage(rawCover, index);
  const additionalImages = allImagesList.length > 0 ? allImagesList : [coverImage];

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

interface EttadiProductCardProps {
  product: FantineProductItem;
  displayStoreLogo?: string;
  onOpenDetail: (product: FantineProductItem) => void;
  onAddToCart: (product: FantineProductItem, quantity?: number, variant?: import('../types').ProductVariant) => void;
  onBuyNow: (product: FantineProductItem, variant?: import('../types').ProductVariant) => void;
  formatPrice: (priceVal: number) => string;
}

function EttadiProductCard({
  product,
  displayStoreLogo,
  onOpenDetail,
  onAddToCart,
  onBuyNow,
  formatPrice,
}: EttadiProductCardProps) {
  const variants = product.variants && product.variants.length > 0 ? product.variants : [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || '');

  const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants[0] || null;

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const regularPrice = selectedVariant ? (selectedVariant.regularPrice || product.regularPrice) : product.regularPrice;
  const hasDiscount = Boolean(regularPrice && regularPrice > currentPrice);
  const discountPercent = hasDiscount 
    ? Math.round(((regularPrice! - currentPrice) / regularPrice!) * 100) 
    : (product.discountPercentage || 0);

  const isProductFreeDelivery = product.deliveryChargeEnabled === false || 
    (product as any).freeDelivery === true || 
    (product as any).isFreeDelivery === true;

  const cardImage = selectedVariant?.image || product.coverImage || product.image || DEFAULT_FANTINE_FALLBACK_IMAGE;

  return (
    <div className="group flex flex-col bg-white rounded-[6px] border border-slate-200/90 hover:border-slate-300 hover:shadow-lg transition-all duration-300 p-3 sm:p-3.5 overflow-hidden justify-between">
      <div>
        {/* Product Image Area - Scale Full Width Cover */}
        <div 
          className="relative aspect-square w-full bg-slate-50 rounded-[6px] overflow-hidden mb-3 cursor-pointer group/img select-none" 
          onClick={() => onOpenDetail(product)}
        >
          {/* Dynamic Top Promotional Ribbon if configured in DB */}
          {product.badge && (
            <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-r from-[#F37022] to-amber-600 text-white text-[9px] font-black tracking-wide uppercase py-0.5 px-2 text-center shadow-2xs truncate">
              {product.badge}
            </div>
          )}

          <img 
            loading="lazy" 
            decoding="async"
            src={optimizeImageUrl(cardImage, 500)} 
            alt={product.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Top Right Discount Badge if applicable */}
          {hasDiscount && discountPercent > 0 && (
            <span className={`absolute ${product.badge ? 'top-6' : 'top-2'} right-2 bg-[#F37022] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] shadow-xs`}>
              ↓ {discountPercent}%
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 
          onClick={() => onOpenDetail(product)}
          className="text-[13px] sm:text-sm text-slate-900 hover:text-[#F37022] transition-colors cursor-pointer font-semibold leading-snug line-clamp-2 min-h-[2.5rem]"
          title={product.title}
        >
          {product.title}
        </h3>
        
        {/* Price Row: Discount % + Strikethrough + Bold Price */}
        <div className="flex items-baseline gap-2 pt-2 pb-0.5">
          {hasDiscount && (
            <span className="text-xs font-bold text-[#F37022] shrink-0">
              ↓ {discountPercent}%
            </span>
          )}
          {regularPrice && regularPrice > currentPrice && (
            <span className="text-xs text-slate-400 line-through shrink-0">
              {formatPrice(regularPrice)}
            </span>
          )}
          <span className="text-sm sm:text-base font-extrabold text-slate-900">
            {formatPrice(currentPrice)}
          </span>
        </div>

        {/* Free Delivery Note if enabled for this product */}
        {isProductFreeDelivery && (
          <div className="text-[11px] font-normal pb-2 flex items-center">
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>FREE delivery</span>
            </span>
          </div>
        )}

        {/* Size / Weight Variant Selector if available */}
        {variants.length > 0 && (
          <div className="pb-2">
            <div className="flex flex-wrap items-center gap-1">
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
                    className={`px-2 py-0.5 rounded-[4px] text-[11px] font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-orange-50 text-[#F37022] border-orange-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white'
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

      {/* Action Buttons: Cart Icon (Add to Cart) + Buy Now Button Feature */}
      <div className="pt-2 mt-auto flex items-center gap-2">
        {/* Cart Icon Button (Add to Cart) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product, 1, selectedVariant || undefined);
          }}
          className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 bg-orange-50 hover:bg-orange-100 text-[#F37022] border border-orange-200 active:scale-95 rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-2xs group/btn"
          title="Add to Cart"
          aria-label="Add to Cart"
        >
          <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2] group-hover/btn:scale-110 transition-transform" />
        </button>

        {/* Buy Now Button Feature */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBuyNow(product, selectedVariant || undefined);
          }}
          className="flex-1 bg-[#F37022] hover:bg-[#d95c10] active:scale-[0.98] text-white font-bold text-xs sm:text-sm h-9 sm:h-10 px-3 rounded-[6px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shadow-orange-500/20 whitespace-nowrap"
          title="Buy Now"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Buy Now</span>
        </button>
      </div>
    </div>
  );
}

interface EttadiFlashSaleSectionProps {
  product: FantineProductItem;
  flashSaleConfig: any;
  timeLeft: { days: number; hours: number; minutes: number; seconds: number };
  displayStoreLogo?: string;
  formatPrice: (priceVal: number) => string;
  onAddToCart: (product: FantineProductItem, quantity?: number, variant?: import('../types').ProductVariant) => void;
  onBuyNow: (product: FantineProductItem, variant?: import('../types').ProductVariant) => void;
  onOpenDetail: (product: FantineProductItem) => void;
}

function EttadiFlashSaleSection({
  product,
  flashSaleConfig,
  timeLeft,
  displayStoreLogo,
  formatPrice,
  onAddToCart,
  onBuyNow,
  onOpenDetail,
}: EttadiFlashSaleSectionProps) {
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
            <div className="flex items-center justify-center bg-white text-[#F37022] px-2 sm:px-2.5 py-1 rounded-[4px] min-w-[2.4rem] text-center shadow-xs">
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
                <span className="absolute top-2.5 right-2.5 bg-[#F37022] text-white text-xs font-bold px-2.5 py-1 rounded-[4px] shadow-xs">
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Product Details & Actions */}
            <div className="md:col-span-7 flex flex-col justify-center space-y-4 text-center md:text-left">
              
              {/* Product Title */}
              <h3 
                onClick={() => onOpenDetail(product)}
                className="text-lg sm:text-2xl font-bold text-slate-900 hover:text-[#F37022] transition-colors cursor-pointer leading-snug line-clamp-2"
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
                  <span className="text-xs font-bold text-[#F37022] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-[4px]">
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
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-orange-50 text-[#F37022] border-orange-300 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
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
                  className="w-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#F37022] font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-[#F37022]" />
                  <span>Add to Cart</span>
                </button>
                <button
                  type="button"
                  onClick={() => onBuyNow(product, selectedVariant || undefined)}
                  className="w-full bg-[#F37022] hover:bg-[#d95c10] active:scale-95 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Buy Now</span>
                </button>

              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default function EttadiStorePage({ onGoToLogin, onGoToLanding }: EttadiStorePageProps) {
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

  // Dynamic Ecom Settings with instant session rehydration
  const [ecomSettings, setEcomSettings] = useState<EcomSettings | null>(() => {
    try {
      const cached = sessionStorage.getItem('ettadi_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [instituteInfo, setInstituteInfo] = useState<InstituteInfo | null>(() => {
    try {
      const cached = sessionStorage.getItem('ettadi_cached_info');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // Dynamic Product State from Admin / DB with instant session rehydration
  const [products, setProducts] = useState<FantineProductItem[]>(() => {
    try {
      const cached = sessionStorage.getItem('ettadi_cached_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => normalizeFantineProduct(p, idx));
        }
      }
    } catch {}
    return [];
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('ettadi_cached_products');
      if (cached && JSON.parse(cached)?.length > 0) return false;
    } catch {}
    return true;
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
  const [activeProductDetail, setActiveProductDetail] = useState<FantineProductItem | null>(null);
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
      if (settings) {
        setEcomSettings(settings);
        try { sessionStorage.setItem('ettadi_cached_settings', JSON.stringify(settings)); } catch {}
      }
      if (info) {
        setInstituteInfo(info);
        try { sessionStorage.setItem('ettadi_cached_info', JSON.stringify(info)); } catch {}
      }
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
        try { sessionStorage.setItem('ettadi_cached_settings', JSON.stringify(pubSettings)); } catch {}
      }
      if (pubInfo) {
        setInstituteInfo(prev => prev || pubInfo);
        try { sessionStorage.setItem('ettadi_cached_info', JSON.stringify(pubInfo)); } catch {}
      }
    } catch {
      // ignore
    }
  };

  // Sync Live Products from dbService & publicStoreService with resilience & retries
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadLiveProducts = async (retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const dbProds = await dbService.getProducts();
        if (Array.isArray(dbProds) && dbProds.length > 0) {
          const normalized = dbProds.map((p, idx) => normalizeFantineProduct(p, idx));
          setProducts(normalized);
          setIsLoadingProducts(false);
          try {
            sessionStorage.setItem('ettadi_cached_products', JSON.stringify(dbProds));
          } catch {}
          setActiveProductDetail(prev => {
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product')) {
              const urlMatch = findProductFromPath(window.location.pathname, routeSlug, routeId, normalized);
              if (urlMatch) return urlMatch;
            }
            const match = normalized.find(p => p.id === prev?.id);
            return match || normalized[0] || null;
          });
          return;
        }
      } catch (err) {
        console.warn(`Product fetch attempt ${attempt} failed:`, err);
      }

      try {
        const pubProds = await publicStoreService.getProducts();
        if (Array.isArray(pubProds) && pubProds.length > 0) {
          const normalized = pubProds.map((p, idx) => normalizeFantineProduct(p, idx));
          setProducts(normalized);
          setIsLoadingProducts(false);
          try {
            sessionStorage.setItem('ettadi_cached_products', JSON.stringify(pubProds));
          } catch {}
          setActiveProductDetail(prev => {
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product')) {
              const urlMatch = findProductFromPath(window.location.pathname, routeSlug, routeId, normalized);
              if (urlMatch) return urlMatch;
            }
            const match = normalized.find(p => p.id === prev?.id);
            return match || normalized[0] || null;
          });
          return;
        }
      } catch (err) {
        console.warn(`publicStoreService fetch attempt ${attempt} failed:`, err);
      }

      if (attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 400));
      }
    }

    // Done all retries
    setIsLoadingProducts(false);
  };

  useEffect(() => {
    loadLiveProducts();
    loadLiveSettings();

    const failsafe = setTimeout(() => {
      setIsLoadingProducts(false);
    }, 3000);

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
      clearTimeout(failsafe);
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

  // Prevent background scroll bounce when slide-out drawer or modal is active
  useEffect(() => {
    if (isMobileMenuOpen || isCartOpen || isOrderTrackingOpen || isProfileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, isCartOpen, isOrderTrackingOpen, isProfileOpen]);

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
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const setCurrentCustomer = useAppStore(state => state.setCurrentCustomer);


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

  const displayStoreName = ecomSettings?.storeName || instituteInfo?.name || 'Ettadi Mart';
  const displayStoreLogo = ecomSettings?.storeLogo || (ecomSettings as any)?.logoUrl || instituteInfo?.logo || '/ettadimart-logo.svg';
  const displayStoreIcon = '/uploads/file-1792780766111-313750155.jpg';
  const displayStoreFavicon = ecomSettings?.storeFavicon || ecomSettings?.favicon || instituteInfo?.favicon || (instituteInfo as any)?.storeFavicon || '/ettadimart-favicon.svg';
  const displayCompanyName = ecomSettings?.companyName || instituteInfo?.name || displayStoreName;
  const displayTagline = ecomSettings?.storeTagline || ecomSettings?.footerDescription || instituteInfo?.description || 'China Direct Varieties';
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
        : `${displayStoreName} - China Imported Varieties`;
      const homeDesc = ecomSettings?.storeTagline?.trim() || aboutSettings?.description || 'ETTADI MART - China Imported Varieties. Discover trending smart gadgets, kitchen tools and daily lifestyle varieties delivered across Bangladesh.';
      updateMetaTags(
        homeTitle, 
        homeDesc, 
        displayStoreLogo,
        window.location.href
      );
    }
  }, [displayStoreLogo, displayStoreName, ecomSettings?.storeTagline, aboutSettings?.description]);

  // Dynamic SEO based on active view with Multi-Lingual Keywords (SEO, AEO, GEO)
  useEffect(() => {
    if (activeNav === 'product_detail' && activeProductDetail) {
      const prodKeywords = `${activeProductDetail.title}, ${activeProductDetail.brand || displayStoreName}, ${activeProductDetail.series || activeProductDetail.category || 'varieties'}, ${activeProductDetail.title} price in bangladesh, buy ${activeProductDetail.title} bd, ${displayStoreName}, ইত্যাদি মার্ট, online shopping bd, cash on delivery bangladesh`;
      updateMetaTags(
        `${activeProductDetail.title} | ${displayStoreName}`,
        activeProductDetail.subtitle || activeProductDetail.description || `Buy ${activeProductDetail.title} at ${displayStoreName} with fast cash on delivery across Bangladesh.`,
        activeProductDetail.coverImage || activeProductDetail.image,
        window.location.href,
        prodKeywords
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
      const shopKeywords = 'shop online bangladesh, variety products bd, smart gadgets dhaka, kitchen tools online, china direct products, ettadi mart collection, ইত্যাদি মার্ট শপ, ক্যাশ অন ডেলিভারি';
      updateMetaTags(
        `Shop All Products | ${displayStoreName}`,
        aboutSettings?.description || `Browse our complete catalog of quality China imported variety products and smart gadgets at ${displayStoreName}. Fast delivery across Bangladesh.`,
        displayStoreLogo,
        window.location.href,
        shopKeywords
      );
      updateProductSchema(null, window.location.href, displayStoreName);
      updateBreadcrumbSchema([
        { name: 'Home', url: window.location.origin },
        { name: 'Shop', url: window.location.href }
      ]);
    } else if (activeNav === 'about') {
      updateMetaTags(
        `About Us | ${displayStoreName}`,
        aboutSettings?.subtitle || aboutSettings?.description || `Learn about our story, mission, and direct China importing at ${displayStoreName}.`,
        displayStoreLogo,
        window.location.href,
        'about ettadi mart, ইত্যাদি মার্ট সম্পর্কে, china importer bangladesh, trustworthy ecommerce bd'
      );
      updateProductSchema(null, window.location.href, displayStoreName);
      updateBreadcrumbSchema([]);
    } else if (activeNav === 'contact') {
      updateMetaTags(
        `Contact Us & Customer Support | ${displayStoreName}`,
        'Get in touch with our customer care team via WhatsApp, phone, or email. Hotline: +8801726275850.',
        displayStoreLogo,
        window.location.href,
        'contact ettadi mart, ইত্যাদি মার্ট হেল্পলাইন, customer support bangladesh'
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
      const homeTitle = `${displayStoreName} | ইত্যাদি মার্ট - China Imported Varieties | Online Shopping BD`;
      const homeDesc = `${displayStoreName} (ইত্যাদি মার্ট) - চায়না থেকে সরাসরি আমদানিকৃত সেরা ট্রেন্ডি স্মার্ট গ্যাজেটস, হোম ও কিচেন ভ্যারাইটিজ সমগ্র। সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারি।`;
      const homeKeywords = 'ettadi mart, ettadimart, ettadi mart bd, ইত্যাদি মার্ট, ইত্তাদি মার্ট, china imported gadgets bd, smart lifestyle bangladesh, kitchen gadgets online shopping bd, smart home tools bangladesh, online shopping bangladesh, ক্যাশ অন ডেলিভারি শপিং, সেরা অনলাইন শপ, চায়না প্রোডাক্ট বাংলাদেশ, trending items bd, variety store dhaka';
      updateMetaTags(
        homeTitle,
        homeDesc,
        displayStoreLogo,
        window.location.origin,
        homeKeywords
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


  // Cart Subtotal (Calculates with Wholesaler Paikari Rate when customerType === 'wholesaler')
  const isWholesalerUser = currentCustomer?.customerType === 'wholesaler';

  const getItemEffectivePrice = useCallback((item: { product: Product; variant?: any; quantity: number }) => {
    if (
      isWholesalerUser &&
      item.product.isWholesaleAvailable &&
      item.product.wholesalePrice != null &&
      item.product.wholesalePrice > 0 &&
      item.quantity >= (item.product.minOrderQty || 1)
    ) {
      return Number(item.product.wholesalePrice);
    }
    return item.variant?.price ?? item.product.price;
  }, [isWholesalerUser]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (getItemEffectivePrice(item) * item.quantity), 0);
  }, [cart, getItemEffectivePrice]);

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
        
        // Smart keyword fallbacks for China imported variety e-commerce
        if (cat.includes('gadget') || cat.includes('গ্যাজেট')) return pCat.includes('gadget') || pTitle.includes('গ্যাজেট') || pTitle.includes('লাইট') || pTitle.includes('চার্জার') || pTitle.includes('ব্লেন্ডার');
        if (cat.includes('kitchen') || cat.includes('কিচেন')) return pCat.includes('kitchen') || pTitle.includes('কিচেন') || pTitle.includes('সিলার') || pTitle.includes('কাটার') || pTitle.includes('চপার');
        if (cat.includes('utility') || cat.includes('ইউটিলিটি')) return pCat.includes('utility') || pTitle.includes('ইউটিলিটি') || pTitle.includes('ল্যাম্প') || pTitle.includes('ক্লিনার');
        if (cat.includes('personal') || cat.includes('পার্সোনাল')) return pCat.includes('personal') || pTitle.includes('পার্সোনাল') || pTitle.includes('ট্রিমার') || pTitle.includes('শেভার');
        if (cat.includes('tool') || cat.includes('টুলস')) return pCat.includes('tool') || pTitle.includes('টুলস') || pTitle.includes('স্প্রে') || pTitle.includes('গান');
        if (cat.includes('trending') || cat.includes('ট্রেন্ডিং')) return Boolean(p.isFeatured || p.isNewArrival || pTitle.includes('ট্রেন্ডিং'));
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
    if (ecomSettings?.categoryItems && Array.isArray(ecomSettings.categoryItems)) {
      ecomSettings.categoryItems.forEach(c => {
        if (c?.name && c.name.trim()) set.add(c.name.trim());
      });
    }
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
  }, [products, ecomSettings?.categoryItems, ecomSettings?.categories]);

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
    // 1. Categories configured in Admin Panel CategoryManager (categoryItems)
    if (Array.isArray(ecomSettings?.categoryItems) && ecomSettings.categoryItems.length > 0) {
      const activeItems = ecomSettings.categoryItems
        .filter(item => item && item.name && item.name.trim().length > 0)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      if (activeItems.length > 0) {
        return activeItems.map(item => {
          const catName = item.name.trim();
          // Find matching product image if category item doesn't have an uploaded image
          const matchedProd = products.find(p => 
            p.category?.toLowerCase() === catName.toLowerCase() ||
            p.subCategory?.toLowerCase() === catName.toLowerCase()
          );
          const resolvedImage = item.image || matchedProd?.image || (matchedProd as any)?.coverImage || '';
          return {
            id: item.id || `cat-${catName}`,
            name: catName,
            targetCategory: catName,
            image: resolvedImage
          };
        });
      }
    }

    // 2. Categories string array from Admin Panel (ecomSettings.categories)
    if (Array.isArray(ecomSettings?.categories) && ecomSettings.categories.length > 0) {
      const catNames = ecomSettings.categories
        .map(c => (typeof c === 'string' ? c.trim() : (c as any)?.name?.trim()))
        .filter(Boolean) as string[];

      if (catNames.length > 0) {
        return catNames.map((catName, idx) => {
          const matchedProd = products.find(p => 
            p.category?.toLowerCase() === catName.toLowerCase() ||
            p.subCategory?.toLowerCase() === catName.toLowerCase()
          );
          const resolvedImage = matchedProd?.image || (matchedProd as any)?.coverImage || '';
          return {
            id: `cat-${idx}-${catName}`,
            name: catName,
            targetCategory: catName,
            image: resolvedImage
          };
        });
      }
    }

    // 3. Fallback to distinct categories derived from real products in DB
    if (Array.isArray(products) && products.length > 0) {
      const distinctCats = Array.from(new Set(products.map(p => p.category?.trim()).filter(Boolean) as string[]));
      if (distinctCats.length > 0) {
        return distinctCats.map((catName, idx) => {
          const matchedProd = products.find(p => p.category?.toLowerCase() === catName.toLowerCase());
          const resolvedImage = matchedProd?.image || (matchedProd as any)?.coverImage || '';
          return {
            id: `cat-prod-${idx}-${catName}`,
            name: catName,
            targetCategory: catName,
            image: resolvedImage
          };
        });
      }
    }

    // If no real categories exist, return empty array (no fake or static data)
    return [];
  }, [ecomSettings?.categoryItems, ecomSettings?.categories, products]);



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
    if (appliedCoupon.type === 'percentage' || (appliedCoupon.type as any) === 'percent') {
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
    const addImg = (candidate: any) => {
      if (!candidate) return;
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) parsed.forEach(addImg);
            return;
          } catch {}
        }
        if (trimmed && trimmed !== DEFAULT_FANTINE_FALLBACK_IMAGE && !imgs.includes(trimmed)) {
          imgs.push(trimmed);
        }
      } else if (Array.isArray(candidate)) {
        candidate.forEach(addImg);
      }
    };

    // 1. Cover and main product images first
    if (activeProductDetail.coverImage) addImg(activeProductDetail.coverImage);
    if (activeProductDetail.image) addImg(activeProductDetail.image);
    if ((activeProductDetail as any).imageUrl) addImg((activeProductDetail as any).imageUrl);

    // 2. Additional images, samplePages, images
    addImg(activeProductDetail.additionalImages);
    addImg((activeProductDetail as any).samplePages);
    addImg((activeProductDetail as any).images);

    // 3. Variant images
    if (Array.isArray(activeProductDetail.variants)) {
      activeProductDetail.variants.forEach(v => {
        if (v?.image) addImg(v.image);
      });
    }

    return imgs.length > 0 ? imgs : ['/placeholder-image.svg'];
  }, [activeProductDetail]);

  // Branded Circular Loader on initial store load (prevents empty flashes before data arrives)
  if (isLoadingProducts && products.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4 selection:bg-orange-100">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-[3.5px] border-[#F37022]/20 border-t-[#F37022] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/ettadimart-favicon.svg" 
              alt={displayStoreName || "EttadiMart"} 
              className="w-8 h-8 object-contain" 
            />
          </div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-base font-black text-slate-900 tracking-wide">
            ETTADI <span className="text-[#F37022]">MART</span>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            {displayTagline || "চায়না ট্রেন্ডি গ্যাজেটস ও ভ্যারাইটিজ শপ"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans relative selection:bg-orange-100 selection:text-orange-950 pb-16 md:pb-0">
      
      {/* Toast Notification */}
      {showNotificationToast.show && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium">{showNotificationToast.msg}</span>
        </div>
      )}

      {/* ============================================================
          MAIN STORE HEADER (Unified Across Marketplace)
          ============================================================ */}
      <StoreHeader activeNav={activeNav === 'quiz' ? 'home' : activeNav} />





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
            
            {/* Left Gallery: Clean Main Image on Top + Simple Horizontal Preview Thumbnails Below */}
            <div className="lg:col-span-7 flex flex-col items-start w-full">
              
              {/* Main Product Frame (Clean, Large High-Res & Clickable Cover Image) */}
              <div 
                className="relative w-full aspect-square max-h-[620px] bg-white rounded-xl overflow-hidden border border-slate-200/90 flex items-center justify-center group shadow-md"
              >
                <img 
                  fetchPriority="high" 
                  width={620} 
                  height={620} 
                  src={currentProductImages[activeImageIndex] || activeProductDetail.coverImage} 
                  alt={activeProductDetail.title} 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                  }}
                  className="w-full h-full object-contain p-3 select-none transition-all duration-300 group-hover:scale-105"
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
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer z-10 shadow-sm"
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer z-10 shadow-sm"
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

              {/* Simple Multiple Image Preview: Click thumbnail to change cover image */}
              {currentProductImages.length > 1 && (
                <div className="mt-3 flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 w-full no-scrollbar">
                  {currentProductImages.map((imgUrl, idx) => {
                    const isActive = activeImageIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-[6px] bg-white border-2 ${
                          isActive 
                            ? 'border-[#F37022] ring-2 ring-[#F37022]/20 shadow-xs' 
                            : 'border-slate-200 hover:border-[#F37022]/60 hover:shadow-2xs'
                        } p-1 overflow-hidden transition-all shrink-0 cursor-pointer flex items-center justify-center`}
                        title={`Click to preview image ${idx + 1}`}
                        aria-label={`View product image ${idx + 1}`}
                      >
                        <img 
                          width={80} 
                          height={80} 
                          src={imgUrl} 
                          alt={`${activeProductDetail.title} preview ${idx + 1}`} 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_FANTINE_FALLBACK_IMAGE;
                          }}
                          className="w-full h-full object-contain select-none" 
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-[#F37022]/5 pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Right Side: Title, Package List, Price, Weight Selector, Quantity, 4 Action Buttons */}
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

              // Single primary description text (deduplicated)
              const cleanDescription = (
                activeProductDetail.description || 
                activeProductDetail.benefitsHighlights || 
                '১০০% অরিজিনাল ও গুণগত মানসম্পন্ন প্রোডাক্ট। সরাসরি চায়না থেকে আমদানিকৃত ট্রেন্ডি গ্যাজেট ও লাইফস্টাইল পণ্য।'
              ).trim();

              // Distinct How-to-use (rendered only if genuinely different from description)
              const rawHowToUse = (activeProductDetail.howToUse || (activeProductDetail as any).howToUseIt || '').trim();
              const distinctHowToUse = (rawHowToUse && rawHowToUse !== cleanDescription) ? rawHowToUse : null;

              return (
                <div className="lg:col-span-5 space-y-4 sm:space-y-5">
                  {/* Category / Series Tag */}
                  {activeProductDetail.series && (
                    <span className="inline-block px-2.5 py-1 bg-orange-50 text-[#F37022] text-[11px] font-bold uppercase tracking-wider rounded-[6px] border border-orange-200">
                      {activeProductDetail.series}
                    </span>
                  )}

                  {/* Title */}
                  <h1 className="text-xl sm:text-2xl lg:text-3xl text-slate-900 font-bold tracking-tight leading-snug">
                    {activeProductDetail.title}
                  </h1>

                  {/* Vendor / Merchant Badge */}
                  <div className="flex items-center gap-2 text-xs py-0.5">
                    <span className="text-slate-500 font-medium">Sold by:</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full font-bold text-[11px] border border-slate-200 transition-colors">
                      <Store className="w-3 h-3 text-[#F37022]" />
                      <span>{activeProductDetail.vendorName || displayStoreName || 'Ettadi Mart Official'}</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Seller
                    </span>
                  </div>

                  {/* Optional Short Subtitle (Only if genuinely distinct from description and title) */}
                  {activeProductDetail.subtitle && 
                   activeProductDetail.subtitle.trim() !== activeProductDetail.title.trim() &&
                   activeProductDetail.subtitle.trim() !== cleanDescription && (
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      {activeProductDetail.subtitle}
                    </p>
                  )}

                  {/* Price Row: Bold Dark Current Price + Strikethrough Regular Price */}
                  <div className="flex flex-wrap items-baseline gap-3 py-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {formatPrice(effectivePrice)}
                    </span>
                    {effectiveRegularPrice && effectiveRegularPrice > effectivePrice && (
                      <span className="text-base sm:text-lg text-slate-400 line-through">
                        {formatPrice(effectiveRegularPrice)}
                      </span>
                    )}
                    {effectiveDiscount && (
                      <span className="text-xs bg-orange-100 text-[#F37022] font-bold px-2 py-0.5 rounded-[4px]">
                        {effectiveDiscount}% OFF
                      </span>
                    )}
                  </div>

                  {/* Weight / Variant Selector (বাছাই করুন:) */}
                  {variantsList.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          সাইজ বা ভ্যারিয়েন্ট বাছাই করুন: {currentVariant && <span className="text-[#F37022] font-bold">{currentVariant.name}</span>}
                        </label>
                        {currentVariant?.price ? (
                          <span className="text-xs font-bold text-slate-950 bg-amber-100/90 px-2.5 py-0.5 rounded-[4px] border border-amber-300">
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
                              onClick={() => {
                                setSelectedVariant(v);
                                if (v.image) {
                                  const vIdx = currentProductImages.findIndex(img => img === v.image);
                                  if (vIdx !== -1) {
                                    setActiveImageIndex(vIdx);
                                  }
                                }
                              }}
                              className={`px-3.5 py-2 rounded-[6px] text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-orange-50 text-[#F37022] border-orange-300 shadow-2xs ring-1 ring-[#F37022] font-bold'
                                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span>{v.name}</span>
                              {v.price > 0 && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] ${
                                  isSelected ? 'bg-orange-100 text-[#F37022] font-bold' : 'bg-slate-100 text-slate-700 border border-slate-200'
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
                    <span className="text-xs font-bold text-slate-700">Quantity:</span>
                    <div className="inline-flex items-center border border-slate-300 rounded-[6px] overflow-hidden bg-white shadow-2xs">
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

                  {/* Multi-Vendor Store Card / Shop Attribution (Matching Screenshot 4) */}
                  {(() => {
                    const shopName = (activeProductDetail as any).vendorName || 'Ettadi Mart Store';
                    const shopSlug = (activeProductDetail as any).vendorId ? (activeProductDetail as any).vendorId.replace('vendor-', '') : 'ettadi-mart';
                    return (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-md group mt-3">
                        <div className="h-32 w-full bg-slate-900 relative">
                          <img 
                            src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=300&fit=crop" 
                            alt={shopName} 
                            className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          <div className="absolute inset-x-4 bottom-3 flex items-center justify-between z-10">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-extrabold text-sm sm:text-base drop-shadow-sm">
                                  {shopName}
                                </span>
                                <span className="bg-emerald-500/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                  Shop
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-white/80 mt-0.5">
                                <span className="text-amber-400 font-bold">★ 5.0</span>
                                <span>•</span>
                                <span>Sold: -/24</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/shops/${shopSlug}`)}
                              className="px-3 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>Visit Store</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons: Add to Cart & Buy Now */}
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => {
                          handleAddToCart(activeProductDetail, detailQuantity, currentVariant || undefined);
                        }}
                        className="w-full bg-orange-50 hover:bg-orange-100 border border-orange-200 active:scale-[0.99] text-[#F37022] font-bold py-3.5 px-4 rounded-[6px] text-sm sm:text-base tracking-wide transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-5 h-5 text-[#F37022]" />
                        <span>Add to Cart</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          handleAddToCart(activeProductDetail, detailQuantity, currentVariant || undefined);
                          setIsCartOpen(false);
                          navigateTo('checkout');
                        }}
                        className="w-full bg-[#F37022] hover:bg-[#d95c10] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-[6px] text-sm sm:text-base tracking-wide transition-all shadow-md shadow-orange-500/25 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Buy Now</span>
                      </button>
                    </div>

                    {/* Button 2: Order on WhatsApp (Solid Green Full Width) */}
                    <a
                      href={`https://wa.me/${whatsappNum}?text=${whatsappOrderMessage}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-[6px] text-sm sm:text-base tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5 fill-current" />
                      <span>Order on WhatsApp</span>
                    </a>
                  </div>

                  {/* Authentic Guarantee Badge */}
                  <div className="p-3 bg-orange-50/70 rounded-[6px] border border-orange-200/80 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#F37022] shrink-0" />
                    <span className="text-xs text-slate-800 font-medium">
                      ১০০% অরিজিনাল কোয়ালিটি ও ফাস্ট ডেলিভারির নিশ্চয়তা। সারা দেশে ক্যাশ অন ডেলিভারি সুবিধা।
                    </span>
                  </div>

                  {/* Single Clean Professional Product Description (Zero Duplication) */}
                  <div className="bg-white rounded-[6px] border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <div className="w-7 h-7 rounded-[6px] bg-[#F37022]/10 text-[#F37022] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        Product Description / পণ্যের বিবরণ
                      </h2>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line text-justify">
                      {cleanDescription}
                    </div>

                    {/* Genuine Usage Instructions (Rendered ONLY if completely distinct) */}
                    {distinctHowToUse && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F37022]"></span>
                          <span>ব্যবহার বিধি / How to Use</span>
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line text-justify">
                          {distinctHowToUse}
                        </p>
                      </div>
                    )}
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
                  <EttadiProductCard
                    key={'related-' + prod.id}
                    product={prod}
                    displayStoreLogo={displayStoreIcon}
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
                  <EttadiProductCard
                    key={'recent-' + prod.id}
                    product={prod}
                    displayStoreLogo={displayStoreIcon}
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
        ) : isLoadingProducts ? (
          <div className="py-12 max-w-7xl mx-auto px-4 sm:px-8 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-slate-100 rounded-[6px]" />
              <div className="space-y-4">
                <div className="h-8 bg-slate-100 rounded-[4px] w-3/4" />
                <div className="h-6 bg-slate-100 rounded-[4px] w-1/3" />
                <div className="h-24 bg-slate-100 rounded-[6px] w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-24 max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-4">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="font-serif text-xl font-bold text-slate-800">পণ্যটি পাওয়া যায়নি</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              অনুরোধকৃত পণ্যটি এই মুহূর্তে পাওয়া যাচ্ছে না। আমাদের শপে থাকা অন্যান্য প্রোডাক্টগুলো দেখতে পারেন।
            </p>
            <button 
              onClick={() => navigateTo('shop')}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#F37022] hover:bg-[#DE5A0E] text-white text-xs font-semibold rounded-[6px] transition-colors cursor-pointer"
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
            <span className="text-[11px] font-bold tracking-widest text-[#F37022] uppercase">
              Direct Contact
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Contact Us
            </h2>
            <div className="w-12 h-1 bg-[#F37022] mx-auto rounded-full"></div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto pt-1 font-medium">
              For any queries, orders or support, reach out to our team directly.
            </p>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Phone / Hotline */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-900 border border-slate-200 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Hotline</h3>
                <p className="text-xs text-slate-600 font-semibold">{displayPhone || '+8809613444455'}</p>
              </div>
              {displayPhone && (
                <a 
                  href={`tel:${displayPhone.replace(/[^\d+]/g, '')}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#F37022] hover:text-[#d95c10] hover:underline"
                >
                  <span>Call Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* WhatsApp */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">WhatsApp</h3>
                <p className="text-xs text-slate-600 font-semibold">{ecomSettings?.whatsappNumber || socialLinks?.whatsapp || displayPhone || 'Chat'}</p>
              </div>
              {(ecomSettings?.whatsappNumber || socialLinks?.whatsapp || displayPhone) && (
                <a 
                  href={`https://wa.me/${(ecomSettings?.whatsappNumber || socialLinks?.whatsapp || displayPhone || '').replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <span>Chat on WhatsApp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Email */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-900 border border-slate-200 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Email</h3>
                <p className="text-xs text-slate-600 font-semibold truncate max-w-[200px]">{displayEmail || 'customer.care@ettadimart.com'}</p>
              </div>
              {displayEmail && (
                <a 
                  href={`mailto:${displayEmail}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#F37022] hover:text-[#d95c10] hover:underline"
                >
                  <span>Send Email</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Office Address */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-900 border border-slate-200 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Office Address</h3>
                <p className="text-xs text-slate-600 font-medium line-clamp-2">{displayAddress || 'Rahman Regnum Centre, Level-6, Tejgaon C/A, Dhaka-1208'}</p>
              </div>
              <span className="mt-auto text-[11px] font-semibold text-slate-400">
                Visit Us
              </span>
            </div>

          </div>

          {/* Quick Back to Home button */}
          <div className="text-center pt-4">
            <button
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-2 px-8 py-2.5 rounded-[6px] bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

        </div>
      )}

      {/* VIEW 3: SHOP CATALOG PAGE (Screenshot 3 & 4) */}
      {activeNav === 'shop' && (
        <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
          


          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
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
                          className="w-4 h-4 rounded text-[#F37022] focus:ring-[#F37022] border-slate-300 cursor-pointer"
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
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
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
                          className="w-4 h-4 text-[#F37022] focus:ring-[#F37022] border-slate-300 cursor-pointer"
                        />
                        <span className="truncate">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
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
                    className="w-full accent-[#F37022] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-9 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="text-xs text-slate-500 font-medium">
                  {filteredCatalog.length === 0 ? (
                    <span>0 products found</span>
                  ) : (
                    <span>
                      Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredCatalog.length)} of {filteredCatalog.length} products (Page {currentPage} of {totalPages})
                    </span>
                  )}
                  {searchTerm && <span className="text-slate-800 font-semibold ml-1">for &quot;{searchTerm}&quot;</span>}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Sort:</span>
                  <select 
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-800 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Product Grid or Empty State (2-cols on mobile, 3-cols on tablet/desktop) */}
              {isLoadingProducts && products.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200/80 rounded-[6px] p-3 space-y-3 shadow-2xs">
                      <div className="w-full aspect-square bg-slate-100 rounded-[6px]" />
                      <div className="h-4 bg-slate-100 rounded-[4px] w-3/4" />
                      <div className="h-4 bg-slate-100 rounded-[4px] w-1/2" />
                      <div className="h-8 bg-slate-100 rounded-[6px] w-full" />
                    </div>
                  ))}
                </div>
              ) : paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                  {paginatedProducts.map((product) => (
                    <EttadiProductCard
                      key={product.id}
                      product={product}
                      displayStoreLogo={displayStoreIcon}
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
                <div className="bg-white p-12 text-center rounded-[6px] border border-slate-200 space-y-4">
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

              {totalPages > 1 && (
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
              )}



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
              <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#F37022]" />
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
          onOpenDetail={(product) => openProductDetail(product as any)}
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
                    {displayStoreName} - China Imported Varieties | ইত্যাদি মার্ট Official Online Store
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
                            className="w-full relative rounded-[6px] overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group bg-slate-900 h-[240px] sm:h-[320px] md:h-[380px] lg:h-[420px] cursor-pointer"
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
                          <div className="w-full rounded-[6px] bg-gradient-to-br from-slate-900 to-slate-950 text-white p-8 flex flex-col justify-center items-center text-center h-[240px] sm:h-[320px] md:h-[380px] lg:h-[420px]">
                            <h3 className="text-xl sm:text-2xl font-bold mb-2">{displayStoreName}</h3>
                            <p className="text-xs sm:text-sm text-slate-300">China Direct Imported Varieties, Smart Gadgets & Lifestyle</p>
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
                            className="w-full relative rounded-[6px] overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group bg-slate-900 h-[240px] sm:h-[320px] md:h-[380px] lg:h-[420px]"
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
                            <div className="absolute top-3 right-3 bg-[#F37022] text-white text-[10px] font-bold px-2.5 py-1 rounded-[4px] shadow-md uppercase tracking-wider">
                              Special Offer
                            </div>
                          </div>
                        ) : (
                          <div className="w-full rounded-[6px] bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 flex flex-col justify-center items-center text-center h-[240px] sm:h-[320px] md:h-[380px] lg:h-[420px] border border-slate-700 shadow-sm">
                            <h3 className="text-lg sm:text-xl font-bold mb-2">Fast Nationwide Delivery</h3>
                            <p className="text-xs sm:text-sm text-slate-300 font-medium">Cash on delivery available across Bangladesh</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Posh Website Marquee Ticker */}
                  <div className="mt-4 sm:mt-5 bg-white rounded-[6px] border border-slate-100 shadow-2xs py-2.5 sm:py-3 px-3 sm:px-4 overflow-hidden flex items-center select-none">
                    {/* Scrolling Ticker Track */}
                    <div className="flex-1 overflow-hidden relative">
                      <div className="animate-marquee items-center gap-8 text-xs sm:text-[13px] text-slate-700 font-medium">
                        {/* Set 1 */}
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">ETTADI MART:</span>
                          <span>China Direct Import Varieties, Gadgets & Lifestyle Products at Unbeatable Prices.</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
                          <span className="font-semibold text-slate-800">100% Quality Checked</span>
                          <span>& Authentic Guaranteed.</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-blue-600 inline" />
                          <span>Fast Cash on Delivery (COD) Available Nationwide Across Bangladesh.</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5 text-[#F37022] font-bold">
                          <Tag className="w-3.5 h-3.5 inline" />
                          <span>Special Promo: Buy Any 3 Products & Get Free Delivery!</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-600 inline" />
                          <span>Customer Care Hotline: +8809613444455 (9 AM – 9 PM Everyday)</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <span>⭐ 10,000+ Happy Customers Trust Ettadi Mart</span>
                        </span>
                        <span className="text-slate-300 mr-8">•</span>

                        {/* Set 2 (Duplicate for smooth infinite scroll) */}
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">ETTADI MART:</span>
                          <span>China Direct Import Varieties, Gadgets & Lifestyle Products at Unbeatable Prices.</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
                          <span className="font-semibold text-slate-800">100% Quality Checked</span>
                          <span>& Authentic Guaranteed.</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-blue-600 inline" />
                          <span>Fast Cash on Delivery (COD) Available Nationwide Across Bangladesh.</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5 text-[#F37022] font-bold">
                          <Tag className="w-3.5 h-3.5 inline" />
                          <span>Special Promo: Buy Any 3 Products & Get Free Delivery!</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-600 inline" />
                          <span>Customer Care Hotline: +8809613444455 (9 AM – 9 PM Everyday)</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                          <span>⭐ 10,000+ Happy Customers Trust Ettadi Mart</span>
                        </span>
                        <span className="text-slate-300 mr-8">•</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ============================================================
              RECOMMENDED CATEGORIES (Circular Showcase)
              ============================================================ */}
          {displayCategories.length > 0 && (
            <section className="bg-white py-8 sm:py-10 border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-8">
                {/* Section Header with Left Title and Right Arrows */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Recommended Categories
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollCategories('left')}
                      className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:text-[#F37022] hover:border-orange-200 hover:bg-orange-50/50 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                      aria-label="Previous Categories"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCategories('right')}
                      className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:text-[#F37022] hover:border-orange-200 hover:bg-orange-50/50 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                      aria-label="Next Categories"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Scroll Circular Cards */}
                <div
                  ref={categoryScrollRef}
                  className="flex items-start gap-4 sm:gap-6 lg:gap-8 overflow-x-auto scrollbar-none scroll-smooth pb-3"
                >
                  {displayCategories.map((cat, idx) => (
                    <div
                      key={cat.id || idx}
                      onClick={() => {
                        setSelectedCategoryCheckbox(cat.name);
                        setCurrentPage(1);
                        navigateTo('shop');
                      }}
                      className="flex flex-col items-center shrink-0 w-24 sm:w-28 md:w-32 cursor-pointer group select-none"
                    >
                      {/* Circular Avatar */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-slate-50 border border-slate-200/80 shadow-2xs group-hover:shadow-md group-hover:scale-105 group-hover:border-[#F37022] transition-all duration-300 flex items-center justify-center">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            loading="lazy"
                            className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-110"
                            onError={(e) => {
                              // If image fails, fallback to Tag icon
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.category-fallback-icon');
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`category-fallback-icon w-full h-full items-center justify-center bg-orange-50/60 text-[#F37022] font-bold text-lg sm:text-xl ${cat.image ? 'hidden' : 'flex'}`}
                        >
                          <Tag className="w-7 h-7 sm:w-8 sm:h-8 text-[#F37022]/70" />
                        </div>
                      </div>
                      {/* Category Label */}
                      <span className="text-xs sm:text-[13px] font-semibold text-slate-800 text-center mt-2 group-hover:text-[#F37022] transition-colors line-clamp-1 w-full px-1">
                        {cat.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ============================================================
              DEALS YOU CAN'T MISS (Trending Products Showcase)
              ============================================================ */}
          <section className="pt-8 sm:pt-10 pb-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
              {isLoadingProducts && products.length === 0 ? (
                <>
                  <div className="mb-6">
                    <div className="h-6 w-48 bg-slate-200 rounded-[6px] animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="bg-white border border-slate-200/80 rounded-[6px] p-3 space-y-3 shadow-2xs">
                        <div className="w-full aspect-square bg-slate-100 rounded-[6px]" />
                        <div className="h-4 bg-slate-100 rounded-[4px] w-3/4" />
                        <div className="h-4 bg-slate-100 rounded-[4px] w-1/2" />
                        <div className="h-8 bg-slate-100 rounded-[6px] w-full" />
                      </div>
                    ))}
                  </div>
                </>
              ) : products.length > 0 ? (
                <>
                  {/* Section Header */}
                  <div className="mb-6">
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                      Deals you can't miss
                    </h2>
                  </div>

                  {/* Products Grid with Wider, Clean Product Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {products.slice(0, 12).map((product) => (
                      <EttadiProductCard
                        key={product.id}
                        product={product}
                        displayStoreLogo={displayStoreIcon}
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

                  {/* "Load More" Button */}
                  <div className="flex items-center justify-center mt-8 sm:mt-10">
                    <button 
                      onClick={() => navigateTo('shop')}
                      className="rounded-[6px] border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 px-8 py-2.5 text-xs sm:text-sm font-bold text-slate-800 transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      Load More
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
              6. FLASH SALE SPOTLIGHT (Clean & Simple with Variants)
              ============================================================ */}
          {flashSaleConfig?.enabled && products.length > 0 && (() => {
            const targetProd = flashSaleConfig?.productId 
              ? products.find(p => p.id === flashSaleConfig.productId) 
              : products[0];
            
            if (!targetProd) return null;

            return (
              <EttadiFlashSaleSection
                product={targetProd}
                flashSaleConfig={flashSaleConfig}
                timeLeft={flashSaleTimeLeft}
                displayStoreLogo={displayStoreIcon}
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
      <React.Suspense fallback={<div className="h-40 bg-white"></div>}>
        <EttadiFooter 
          displayStoreLogo={displayStoreLogo}
          displayStoreName={displayStoreName}
          displayTagline={displayTagline}
          displayAddress={displayAddress}
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
                    <p className="text-xs text-slate-500">Discover our China imported trending variety gadgets to get started.</p>
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
                      <span className="text-[#F37022] text-lg font-black">{formatPrice(cartSubtotal)}</span>
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
                      className="w-full bg-[#F37022] hover:bg-[#d95c10] active:scale-[0.99] text-white py-3.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4 text-white" />
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
          ORDER TRACKING MODAL
          ============================================================ */}
      {isOrderTrackingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-white" />
                <h3 className="text-base sm:text-lg font-bold text-white">Track Order</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOrderTrackingOpen(false);
                  setOrderTrackQuery('');
                  setOrderTrackResults([]);
                  setOrderTrackSearched(false);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <form onSubmit={handleSearchOrderTracking} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Enter your 11-digit phone number or Order ID:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orderTrackQuery}
                    onChange={(e) => setOrderTrackQuery(e.target.value)}
                    placeholder="e.g. 01712345678 or #ORD-..."
                    className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#F37022] focus:ring-1 focus:ring-[#F37022]"
                  />
                  <button
                    type="submit"
                    disabled={orderTrackLoading || !orderTrackQuery.trim()}
                    className="bg-[#F37022] hover:bg-[#d95c10] disabled:bg-slate-300 text-white px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
                  >
                    {orderTrackLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Search className="w-4 h-4 text-white" />
                    )}
                    <span>Track</span>
                  </button>
                </div>
              </form>


              {/* Loading State */}
              {orderTrackLoading && (
                <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#F37022]" />
                  <span>অর্ডারের তথ্য খোঁজা হচ্ছে...</span>
                </div>
              )}

              {/* Results */}
              {!orderTrackLoading && orderTrackSearched && (
                orderTrackResults.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    <p className="text-xs font-semibold text-slate-800">
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
                            <div className="bg-orange-50/60 border border-orange-200/80 rounded-lg p-2.5 flex items-center justify-between">
                              <div>
                                <p className="text-[11px] font-bold text-slate-900">কুরিয়ার ট্র্যাকিং কোড:</p>
                                <p className="text-xs font-mono font-bold text-[#F37022]">
                                  {order.steadfastTrackingCode || order.pathaoTrackingCode}
                                </p>
                              </div>
                              {order.steadfastTrackingCode && (
                                <a
                                  href={`https://steadfast.com.bd/tracking/${order.steadfastTrackingCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold bg-[#F37022] text-white px-2.5 py-1 rounded hover:bg-[#d95c10] transition-colors"
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
                            <span className="text-sm font-bold text-[#F37022]">
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
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F37022] bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 hover:bg-orange-100"
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
            <div className="w-14 h-14 bg-orange-100 text-[#F37022] rounded-full flex items-center justify-center mx-auto">
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
                className="w-full py-2.5 px-4 bg-orange-50 hover:bg-orange-100/80 text-[#F37022] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 border border-orange-200"
              >
                <Truck className="w-4 h-4" />
                <span>অর্ডার ট্র্যাকিং (Order Track)</span>
              </button>

              {displayPhone && (
                <a
                  href={`tel:${displayPhone}`}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 text-[#F37022]" />
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
                <ShoppingBag className="w-4 h-4 text-[#F37022]" />
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
              className="w-full py-2 bg-slate-900 text-white rounded-[6px] text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          MOBILE NATIVE APP SLIDE-OUT DRAWER SYSTEM
          ============================================================ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden md:hidden animate-fadeIn">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Drawer Panel */}
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-[85vw] max-w-[320px] bg-white shadow-2xl flex flex-col justify-between overflow-hidden animate-slideInLeft border-r border-slate-100">
              
              {/* Drawer Top Brand Header */}
              <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50/50 p-4 border-b border-orange-100/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img 
                    src={displayStoreLogo || '/ettadimart-logo.svg'} 
                    alt={displayStoreName} 
                    className="h-9 w-9 object-contain rounded-[6px] shrink-0 shadow-2xs" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/ettadimart-favicon.svg';
                    }}
                  />
                  <div>
                    <h3 className="font-black text-sm text-slate-900 tracking-tight leading-tight">
                      {displayStoreName.trim() || 'Ettadi Mart'}
                    </h3>
                    <p className="text-[10px] font-semibold text-[#F37022] leading-tight">
                      {displayTagline.trim() || 'China Direct Varieties'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-[6px] transition-colors cursor-pointer"
                  title="Close Menu"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
                
                {/* Quick Action Badges: Track Order & Helpline */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsOrderTrackingOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-2.5 bg-orange-50/80 hover:bg-orange-100/80 rounded-[6px] border border-orange-200/80 text-center transition-all cursor-pointer group active:scale-95"
                  >
                    <Truck className="w-5 h-5 text-[#F37022] mb-1" />
                    <span className="text-[11px] font-bold text-slate-900 leading-tight">Track Order</span>
                    <span className="text-[9px] text-slate-500">অর্ডার ট্র্যাক</span>
                  </button>

                  <a
                    href={`tel:${displayPhone}`}
                    className="flex flex-col items-center justify-center p-2.5 bg-slate-50 hover:bg-slate-100 rounded-[6px] border border-slate-200 text-center transition-all cursor-pointer group active:scale-95"
                  >
                    <Phone className="w-5 h-5 text-[#F37022] mb-1" />
                    <span className="text-[11px] font-bold text-slate-900 leading-tight">Call Helpline</span>
                    <span className="text-[9px] text-slate-500">সরাসরি কল</span>
                  </a>
                </div>

                {/* Primary Navigation Links */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">Navigation</p>
                  <nav className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigateTo('home');
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-bold transition-colors cursor-pointer ${
                        activeNav === 'home'
                          ? 'bg-[#F37022] text-white shadow-xs'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Home className="w-4 h-4" />
                        <span>Home (হোম)</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setSelectedCategoryCheckbox('All');
                        navigateTo('shop');
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-bold transition-colors cursor-pointer ${
                        activeNav === 'shop'
                          ? 'bg-[#F37022] text-white shadow-xs'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-4 h-4" />
                        <span>All Products (সব পণ্য)</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigateTo('about');
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-bold transition-colors cursor-pointer ${
                        activeNav === 'about'
                          ? 'bg-[#F37022] text-white shadow-xs'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Award className="w-4 h-4" />
                        <span>About Us (আমাদের সম্পর্কে)</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigateTo('contact');
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-xs font-bold transition-colors cursor-pointer ${
                        activeNav === 'contact'
                          ? 'bg-[#F37022] text-white shadow-xs'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4" />
                        <span>Contact & Support (যোগাযোগ)</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </nav>
                </div>

                {/* Categories List */}
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Categories</p>
                    <span className="text-[10px] text-[#F37022] font-semibold">{shopCategories.length} items</span>
                  </div>
                  <div className="space-y-1">
                    {shopCategories.map((catName) => {
                      const isCatSelected = selectedCategoryCheckbox.toLowerCase() === catName.toLowerCase();
                      return (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryCheckbox(catName);
                            setIsMobileMenuOpen(false);
                            setCurrentPage(1);
                            if (activeNav !== 'shop') navigateTo('shop');
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-[6px] text-xs transition-colors cursor-pointer ${
                            isCatSelected
                              ? 'bg-orange-50 text-[#F37022] font-bold border border-orange-200'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span>{catName}</span>
                          </div>
                          {isCatSelected && <Check className="w-3.5 h-3.5 text-[#F37022]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Assurance Trust Badges */}
                <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-100 space-y-2 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>১০০% অথেনটিক চায়না কোয়ালিটি</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>সারা বাংলাদেশে ক্যাশ অন ডেলিভারি</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>৭ দিনের সহজ রিটার্ন নিশ্চয়তা</span>
                  </div>
                </div>

              </div>

              {/* Drawer Bottom Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsProfileOpen(true);
                  }}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-[6px] border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Account & Lists</span>
                </button>

                {onGoToLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onGoToLogin();
                    }}
                    className="w-full py-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-center"
                  >
                    Admin Login &rarr;
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          NATIVE MOBILE APP BOTTOM NAVIGATION BAR (Fixed at Screen Bottom)
          ============================================================ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]">
        {activeNav === 'product_detail' && activeProductDetail ? (
          /* Mobile Sticky Buy Action Bar on Product Detail Page */
          <div className="px-3 py-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleHomeClick}
              className="flex flex-col items-center justify-center p-2 text-slate-600 hover:text-[#F37022] active:scale-90 transition-transform cursor-pointer shrink-0"
              title="Home"
            >
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-medium mt-0.5">Home</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex flex-col items-center justify-center p-2 text-slate-600 hover:text-[#F37022] active:scale-90 transition-transform cursor-pointer shrink-0"
              title="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#F37022] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
              <span className="text-[9px] font-medium mt-0.5">Cart</span>
            </button>

            {/* Add to Cart button */}
            <button
              type="button"
              onClick={() => handleAddToCart(activeProductDetail, detailQuantity, selectedVariant || undefined)}
              className="flex-1 py-2.5 px-2 bg-orange-50 hover:bg-orange-100 text-[#F37022] border border-[#F37022] rounded-[6px] text-xs font-bold flex items-center justify-center gap-1 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>কার্টে যোগ</span>
            </button>

            {/* Direct Buy Now button */}
            <button
              type="button"
              onClick={() => {
                handleAddToCart(activeProductDetail, detailQuantity, selectedVariant || undefined);
                setIsCartOpen(false);
                navigateTo('checkout');
              }}
              className="flex-1 py-2.5 px-3 bg-[#F37022] hover:bg-[#d95c10] text-white rounded-[6px] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>অর্ডার করুন</span>
            </button>
          </div>
        ) : (
          /* Standard 5-Item Native Mobile Tab Bar */
          <div className="grid grid-cols-5 items-center h-14 px-1">
            {/* 1. Home */}
            <button
              type="button"
              onClick={handleHomeClick}
              className={`flex flex-col items-center justify-center h-full transition-transform active:scale-90 cursor-pointer ${
                activeNav === 'home' ? 'text-[#F37022]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Home className={`w-5 h-5 ${activeNav === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {activeNav === 'home' && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-0.5 bg-[#F37022] rounded-full" />
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${activeNav === 'home' ? 'font-bold' : 'font-medium'}`}>
                Home
              </span>
            </button>

            {/* 2. Shop / Categories */}
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryCheckbox('All');
                navigateTo('shop');
              }}
              className={`flex flex-col items-center justify-center h-full transition-transform active:scale-90 cursor-pointer ${
                activeNav === 'shop' ? 'text-[#F37022]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <LayoutGrid className={`w-5 h-5 ${activeNav === 'shop' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {activeNav === 'shop' && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-0.5 bg-[#F37022] rounded-full" />
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${activeNav === 'shop' ? 'font-bold' : 'font-medium'}`}>
                Shop
              </span>
            </button>

            {/* 3. Track Order */}
            <button
              type="button"
              onClick={() => setIsOrderTrackingOpen(true)}
              className="flex flex-col items-center justify-center h-full text-slate-500 hover:text-slate-900 transition-transform active:scale-90 cursor-pointer"
            >
              <Truck className="w-5 h-5 stroke-[1.8]" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5">
                Track
              </span>
            </button>

            {/* 4. Cart */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex flex-col items-center justify-center h-full text-slate-500 hover:text-slate-900 transition-transform active:scale-90 cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 stroke-[1.8]" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-2.5 bg-[#F37022] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-scaleIn">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">
                Cart
              </span>
            </button>

            {/* 5. Menu Drawer */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center h-full transition-transform active:scale-90 cursor-pointer ${
                isMobileMenuOpen ? 'text-[#F37022]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Menu className="w-5 h-5 stroke-[1.8]" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5">
                Menu
              </span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

