import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShoppingCart, RefreshCw, Zap, 
  CheckCircle2, ChevronLeft, ChevronRight, Check,
  MessageCircle, Trophy, ShieldCheck, Package, Copy
} from 'lucide-react';
import { publicStoreService, optimizeImageUrl } from '../lib/publicStoreService';
import { DEFAULT_DELIVERY_METHODS, DEFAULT_LANDING_PAGE_SETTINGS, createDefaultLandingForProduct } from '../lib/constants';
import { Product, EcomSettings, BookOrder, LandingPageData, DeliveryMethodItem, LandingPageVariant, InstituteInfo } from '../types';
import { initPixelAndGtm, trackEvent, createEventId } from '../lib/pixelGtmService';
import { getProductSlug } from '../lib/seoUtils';
import { FeedbackDialog } from './ui/FeedbackDialog';
import { playOrderSuccessVibe } from '../lib/soundUtils';
import { validateBDPhone, validateDeliveryAddress, sanitizeBDPhoneInput } from '../lib/validationUtils';
import { calculateDeliveryCharge } from '../lib/deliveryUtils';

interface BookLandingPageProps {
  onNavigateHome: () => void;
  onNavigateToLogin: () => void;
}

export default function BookLandingPage({ onNavigateHome }: BookLandingPageProps) {
  const { slug } = useParams<{ slug?: string }>();
  
  // Dynamic Live State from DB API - No local cache, no seed data
  const [storeSettings, setStoreSettings] = useState<EcomSettings | null>(null);
  const [instituteInfo, setInstituteInfo] = useState<InstituteInfo | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [landingConfig, setLandingConfig] = useState<LandingPageData | null>(null);
  
  const [loading, setLoading] = useState(false);

  // Gallery slider & Variant state
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<LandingPageVariant | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [placedLuckyCoupon, setPlacedLuckyCoupon] = useState('');

  // Touch swipe support for gallery carousel
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Feedback dialog state
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

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        let decodedSlug = '';
        try {
          decodedSlug = slug ? decodeURIComponent(slug).trim().toLowerCase() : '';
        } catch {
          decodedSlug = slug ? slug.trim().toLowerCase() : '';
        }
        const rawSlug = slug ? slug.trim().toLowerCase() : '';

        // Execute ALL public queries simultaneously in parallel to avoid waterfalls
        const [settings, products, info, rawLpSettings] = await Promise.all([
          publicStoreService.getEcomSettings(),
          publicStoreService.getProducts(),
          publicStoreService.getInstituteInfo(),
          publicStoreService.getLandingPageSettings(decodedSlug || rawSlug)
        ]);

        if (isCancelled) return;

        // Find product matching current slug if provided
        let targetProduct: Product | undefined;
        if ((decodedSlug || rawSlug) && products && products.length > 0) {
          targetProduct = products.find(p => {
            const pSlug = (p.slug || '').toLowerCase();
            const genSlug = getProductSlug(p).toLowerCase();
            const pId = p.id.toLowerCase();
            const pTitle = (p.title || '').toLowerCase();
            return pId === decodedSlug || pId === rawSlug ||
                   pSlug === decodedSlug || pSlug === rawSlug ||
                   genSlug === decodedSlug || genSlug === rawSlug ||
                   pTitle === decodedSlug;
          });
        }

        if (!targetProduct && products && products.length > 0) {
          targetProduct = products[0];
        }

        let lpSettings = rawLpSettings;
        if (targetProduct) {
          setProduct(targetProduct);
          // If no specific landing custom settings exist or it's default casio, dynamically generate from targetProduct
          if (!lpSettings || lpSettings.id === 'landing-default' || !lpSettings.bookTitle || lpSettings.bookTitle.includes('CASIO')) {
            lpSettings = createDefaultLandingForProduct(targetProduct);
          }
        }

        setStoreSettings(settings);
        setAllProducts(products || []);
        setInstituteInfo(info || null);
        setLandingConfig(lpSettings);

        // Initialize Meta Pixel & GTM if configured
        if (settings?.pixelId || settings?.gtmId) {
          initPixelAndGtm(settings.pixelId, settings.gtmId);
        }

        // Initialize variant if available
        if (lpSettings && lpSettings.customVariants && lpSettings.customVariants.length > 0) {
          setSelectedVariant(prev => prev || lpSettings.customVariants![0]);
        } else if (targetProduct?.variants && targetProduct.variants.length > 0) {
          const firstVar: LandingPageVariant = {
            id: targetProduct.variants[0].id || 'var-0',
            name: targetProduct.variants[0].name,
            image: optimizeImageUrl(targetProduct.variants[0].image || targetProduct.samplePages?.[0] || targetProduct.image || '', 400),
            price: targetProduct.variants[0].price || targetProduct.price,
            regularPrice: targetProduct.variants[0].regularPrice || targetProduct.regularPrice
          };
          setSelectedVariant(prev => prev || firstVar);
        }

        // Preload top gallery & hero images in background using optimized URLs
        const imagesToPreload: string[] = [
          optimizeImageUrl(lpSettings?.heroBookImage, 800),
          optimizeImageUrl(lpSettings?.mainBookImage, 800),
          optimizeImageUrl(lpSettings?.campaignBannerImage, 800),
          optimizeImageUrl(targetProduct?.image, 800),
          ...(lpSettings?.galleryImages || []).map(img => optimizeImageUrl(img, 800)),
          ...(targetProduct?.samplePages || []).map(img => optimizeImageUrl(img, 800)),
          ...(lpSettings?.customVariants || []).map(v => optimizeImageUrl(v.image, 400))
        ].filter(Boolean) as string[];

        imagesToPreload.slice(0, 6).forEach(src => {
          if (src) {
            const img = new Image();
            img.src = src;
          }
        });

        // Track ViewContent event
        if (targetProduct || lpSettings) {
          const viewPrice = targetProduct?.price || lpSettings?.offerPrice || 0;
          const viewTitle = targetProduct?.title || lpSettings?.bookTitle || 'Watch Landing';
          const eventId = createEventId('view');
          trackEvent('ViewContent', {
            content_name: viewTitle,
            content_ids: [targetProduct?.id || lpSettings?.productId || 'landing'],
            content_type: 'product',
            value: viewPrice,
            currency: 'BDT'
          }, eventId);
        }
      } catch (error) {
        console.warn("Landing page background refresh:", error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  const fallbackProduct = {
    title: 'চায়না ট্রেন্ডি গ্যাজেটস ও ভ্যারাইটিজ প্রোডাক্ট',
    subtitle: '১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি পণ্য',
    price: 0,
    regularPrice: 0,
    image: '/placeholder-image.svg',
    description: 'চায়না থেকে সরাসরি আমদানিকৃত সেরা ট্রেন্ডি স্মার্ট গ্যাজেটস ও কিচেন ভ্যারাইটিজ সমগ্র।'
  };

  const displayTitle = (landingConfig?.bookTitle && !landingConfig.bookTitle.includes('CASIO'))
    ? landingConfig.bookTitle 
    : (product?.title || fallbackProduct.title);
  const displaySubtitle = product?.subtitle || product?.shortSummary || ((landingConfig?.bookSubtitle && !landingConfig.bookSubtitle.includes('CASIO')) ? landingConfig.bookSubtitle : fallbackProduct.subtitle);
  const displayDesc = product?.description || product?.shortSummary || ((landingConfig?.heroDescription && !landingConfig.heroDescription.includes('CASIO')) ? landingConfig.heroDescription : fallbackProduct.description);
  const displayPrice = selectedVariant?.price || product?.price || landingConfig?.offerPrice || fallbackProduct.price;
  const regularPrice = selectedVariant?.regularPrice || product?.regularPrice || landingConfig?.regularPrice || (displayPrice ? Math.round(displayPrice * 1.25) : fallbackProduct.regularPrice);
  const displayImage = selectedVariant?.image || product?.coverImage || product?.image || ((landingConfig?.heroBookImage && !landingConfig.heroBookImage.includes('placeholder')) ? landingConfig.heroBookImage : '') || fallbackProduct.image;
  
  // Dedicated Top Hero Banner image (uploaded in Section 2 as 'Landing page hero product image' - Original/HD)
  const heroTopImage = product?.coverImage || ((landingConfig?.heroBookImage && !landingConfig.heroBookImage.includes('placeholder')) ? landingConfig.heroBookImage : '') || product?.image || landingConfig?.campaignBannerImage || fallbackProduct.image;

  // YouTube Video Embed URL Helper
  const getYouTubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };
  const embedVideoUrl = getYouTubeEmbedUrl(landingConfig?.videoUrl || product?.pdfUrl);
  
  const campaignBadgeText = (landingConfig?.campaignBadgeText && !landingConfig.campaignBadgeText.includes('bike') && !landingConfig.campaignBadgeText.includes('R15') && !landingConfig.campaignBadgeText.includes('ফুড') && !landingConfig.campaignBadgeText.includes('খাঁটি'))
    ? landingConfig.campaignBadgeText
    : (product?.category ? `১০০% অরিজিনাল ${product.category}` : '১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি');
  const rawTicker = landingConfig?.campaignTickerText || landingConfig?.bannerDeliveryText;
  const campaignTickerText = (rawTicker && !rawTicker.includes('bike') && !rawTicker.includes('R15') && !rawTicker.includes('car'))
    ? rawTicker
    : 'সরাসরি ক্যাশ অন ডেলিভারিতে সারা বাংলাদেশে দ্রুত হোম ডেলিভারি।';

  // Variants list
  const variants: LandingPageVariant[] = useMemo(() => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants.map((v, i) => ({
        id: v.id || `var-${i}`,
        name: v.name,
        image: v.image || product.samplePages?.[i] || product.coverImage || product.image || displayImage,
        price: v.price || product.price,
        regularPrice: v.regularPrice || product.regularPrice,
        tag: i === 0 ? 'Best seller' : 'popular'
      }));
    }
    if (landingConfig?.customVariants && landingConfig.customVariants.length > 0 && !landingConfig.customVariants[0].name.includes('CASIO')) {
      return landingConfig.customVariants;
    }
    return [
      {
        id: 'var-default',
        name: displayTitle || 'প্রিমিয়াম কালেকশন',
        image: displayImage,
        price: displayPrice,
        regularPrice: regularPrice,
        tag: 'Original Edition'
      }
    ];
  }, [product?.variants, product?.samplePages, product?.coverImage, product?.image, landingConfig?.customVariants, displayImage, displayPrice, regularPrice, displayTitle]);

  // Gallery images list for slider
  const galleryImages: string[] = useMemo(() => {
    const list: string[] = [];
    if (product?.coverImage) {
      list.push(optimizeImageUrl(product.coverImage, 800));
    }
    if (product?.image) {
      const opt = optimizeImageUrl(product.image, 800);
      if (!list.includes(opt)) list.push(opt);
    }
    if (product?.samplePages && product.samplePages.length > 0) {
      product.samplePages.forEach(img => {
        if (img) {
          const opt = optimizeImageUrl(img, 800);
          if (!list.includes(opt)) list.push(opt);
        }
      });
    }
    if (product?.additionalImages && product.additionalImages.length > 0) {
      product.additionalImages.forEach(img => {
        if (img) {
          const opt = optimizeImageUrl(img, 800);
          if (!list.includes(opt)) list.push(opt);
        }
      });
    }
    if (landingConfig?.galleryImages && landingConfig.galleryImages.length > 0) {
      landingConfig.galleryImages.forEach(img => {
        if (img && !img.includes('placeholder')) {
          const opt = optimizeImageUrl(img, 800);
          if (!list.includes(opt)) list.push(opt);
        }
      });
    }
    if (variants && variants.length > 0) {
      variants.forEach(v => {
        if (v.image && !v.image.includes('placeholder')) {
          const opt = optimizeImageUrl(v.image, 800);
          if (!list.includes(opt)) {
            list.push(opt);
          }
        }
      });
    }
    if (displayImage && !displayImage.includes('placeholder') && !list.includes(displayImage)) {
      list.unshift(displayImage);
    }
    return list.length > 0 ? list : [displayImage];
  }, [product?.coverImage, product?.image, product?.samplePages, product?.additionalImages, landingConfig?.galleryImages, variants, displayImage]);

  const storeName = storeSettings?.storeName || instituteInfo?.name || 'ETTADI MART';

  // Support & Helpline Phone
  const rawSupportPhone = instituteInfo?.phone || storeSettings?.bkashNumber || storeSettings?.nagadNumber || landingConfig?.whatsAppNumber || '';
  const supportPhone = (rawSupportPhone && rawSupportPhone !== '01XXXXXXXXX' && !rawSupportPhone.includes('01XXXXXXXXX'))
    ? rawSupportPhone
    : '';

  // WhatsApp Phone
  const rawWhatsAppPhone = landingConfig?.whatsAppNumber || instituteInfo?.phone || storeSettings?.bkashNumber || storeSettings?.nagadNumber || '';
  const whatsAppPhone = (rawWhatsAppPhone && rawWhatsAppPhone !== '01XXXXXXXXX' && !rawWhatsAppPhone.includes('01XXXXXXXXX'))
    ? rawWhatsAppPhone
    : '';
  const cleanWhatsAppNumber = whatsAppPhone.replace(/\D/g, '').replace(/^0/, '880');

  // Gallery Section Titles
  const gallerySectionTag = landingConfig?.gallerySectionTag ?? 'গ্যালারি';
  const gallerySectionTitle = landingConfig?.gallerySectionTitle ?? 'প্রোডাক্টের প্রতিটি অ্যাঙ্গেলের আসল ছবি';

  // Order Guide / Steps
  const luckyDrawTag = (landingConfig?.luckyDrawTag && !landingConfig.luckyDrawTag.includes('R15')) ? landingConfig.luckyDrawTag : 'সহজ অর্ডার প্রক্রিয়া';
  const luckyDrawTitle = (landingConfig?.luckyDrawTitle && !landingConfig.luckyDrawTitle.includes('R15')) ? landingConfig.luckyDrawTitle : 'সহজ ৪ ধাপে অর্ডার নির্দেশিকা';
  const luckyDrawSteps = useMemo(() => {
    if (landingConfig?.luckyDrawSteps && landingConfig.luckyDrawSteps.length > 0 && !landingConfig.luckyDrawSteps[0].includes('watch')) {
      return landingConfig.luckyDrawSteps;
    }
    return [
      'আপনার নাম, মোবাইল নম্বর ও পূর্ণ ডেলিভারি ঠিকানা প্রদান করুন',
      'আপনার পছন্দের প্যাকেজ বা পরিমাণ সিলেক্ট করুন',
      'অর্ডার কনফার্ম করুন বাটনে ক্লিক করুন',
      'ডেলিভারি ম্যানের কাছ থেকে প্রোডাক্ট চেক করে মূল্য পরিশোধ করুন'
    ];
  }, [landingConfig?.luckyDrawSteps]);

  // Color / Package Section Titles
  const colorSectionTag = landingConfig?.colorSectionTag ?? 'প্যাকেজ নির্বাচন';
  const colorSectionTitle = landingConfig?.colorSectionTitle ?? 'আপনার পছন্দের প্যাকেজ সিলেক্ট করে অর্ডার করুন';

  const discountPercent = regularPrice > displayPrice 
    ? Math.round(((regularPrice - displayPrice) / regularPrice) * 100) 
    : 0;

  useEffect(() => {
    if (displayTitle) {
      document.title = `${displayTitle} | ${storeName}`;
    }
  }, [displayTitle, storeName]);
  
  const activeDeliveryMethods: DeliveryMethodItem[] = useMemo(() => {
    const methods = storeSettings?.deliveryMethods?.filter(m => m.status === 'Active') || [];
    if (methods.length > 0) return methods;
    return DEFAULT_DELIVERY_METHODS.filter(m => m.status === 'Active');
  }, [storeSettings?.deliveryMethods]);

  useEffect(() => {
    if (activeDeliveryMethods.length > 0 && (!selectedDeliveryMethodId || !activeDeliveryMethods.some(m => m.id === selectedDeliveryMethodId))) {
      setSelectedDeliveryMethodId(activeDeliveryMethods[0].id);
    }
  }, [activeDeliveryMethods, selectedDeliveryMethodId]);

  const selectedDeliveryMethod = activeDeliveryMethods.find(m => m.id === selectedDeliveryMethodId) || activeDeliveryMethods[0];
  const subtotal = (displayPrice || 0) * quantity;
  const isProductFreeDelivery = product?.deliveryChargeEnabled === false || (product as any)?.freeDelivery === true;
  const isFreeDelivery = isProductFreeDelivery || (Boolean(storeSettings?.freeDeliveryActive) && subtotal >= Number(storeSettings?.freeDeliveryMinAmount || 0));

  const deliveryCalc = useMemo(() => {
    return calculateDeliveryCharge({
      items: [{
        product: product || { price: displayPrice },
        variant: selectedVariant ? {
          id: selectedVariant.id,
          name: selectedVariant.name,
          price: selectedVariant.price,
          weight: (selectedVariant as any).weight
        } : null,
        quantity
      }],
      method: selectedDeliveryMethod,
      settings: storeSettings,
      isFreeDelivery
    });
  }, [product, selectedVariant, quantity, selectedDeliveryMethod, storeSettings, isFreeDelivery, displayPrice]);

  const deliveryCharge = isFreeDelivery ? 0 : deliveryCalc.totalCharge;
  const totalPrice = subtotal + deliveryCharge;

  // Gallery carousel controls
  const handlePrevSlide = () => {
    setGalleryIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setGalleryIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > 50) {
      handleNextSlide();
    } else if (distance < -50) {
      handlePrevSlide();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const scrollToOrder = () => {
    const eventId = createEventId('initiate_checkout');
    trackEvent('InitiateCheckout', {
      content_name: displayTitle || product?.title || 'Product',
      content_ids: [product?.id || landingConfig?.productId || 'landing_product'],
      content_type: 'product',
      value: totalPrice || displayPrice,
      currency: 'BDT',
      num_items: quantity
    }, eventId);

    const el = document.getElementById('order-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWhatsAppClick = () => {
    trackEvent('Contact', { content_name: 'WhatsApp Order Inquiry' });
    if (!cleanWhatsAppNumber || cleanWhatsAppNumber.length < 10) {
      scrollToOrder();
      return;
    }
    const productName = selectedVariant?.name || displayTitle;
    const message = encodeURIComponent(`আসসালামু আলাইকুম, আমি ${productName} (${displayPrice} টাকা) অর্ডার করতে চাই। বিস্তারিত জানাবেন প্লিজ?`);
    window.open(`https://wa.me/${cleanWhatsAppNumber}?text=${message}`, '_blank');
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setFeedback({
        isOpen: true,
        type: 'info',
        title: 'প্রয়োজনীয় তথ্য দিন',
        message: 'দয়া করে আপনার সম্পূর্ণ নাম প্রদান করুন।'
      });
      return;
    }

    const phoneVal = validateBDPhone(customerPhone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.error || '');
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'সঠিক মোবাইল নম্বর দিন',
        message: phoneVal.error || 'অনুগ্রহ করে ১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নম্বর লিখুন।'
      });
      return;
    }
    setPhoneError('');

    const addrVal = validateDeliveryAddress(customerAddress);
    if (!addrVal.isValid) {
      setAddressError(addrVal.error || '');
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'সম্পূর্ণ ডেলিভারি ঠিকানা প্রয়োজন',
        message: addrVal.error || 'অনুগ্রহ করে বাসা নং, রোড অথবা গ্রাম, থানা, জেলা সহ বিস্তারিত ঠিকানা দিন।'
      });
      return;
    }
    setAddressError('');

    setIsSubmitting(true);

    try {
      const orderId = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
      const luckyCode = 'SB-' + Math.floor(100000 + Math.random() * 900000);
      const chosenItemTitle = selectedVariant ? `${displayTitle} (${selectedVariant.name})` : displayTitle;
      
      const newOrder: BookOrder = {
        id: orderId,
        customerName: customerName.trim(),
        phone: phoneVal.cleanedPhone,
        address: addrVal.cleanedAddress,
        quantity: quantity,
        price: displayPrice,
        unitPrice: displayPrice,
        deliveryCharge: deliveryCharge,
        totalPrice: totalPrice,
        totalAmount: totalPrice,
        deliveryArea: selectedDeliveryMethod?.title || 'Inside Dhaka',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        paymentMethod: 'COD',
        orderType: 'landing',
        source: slug ? `landing-${slug}` : 'landing-page',
        productId: product?.id || landingConfig?.productId || 'landing_prod',
        productTitle: chosenItemTitle,
        productName: chosenItemTitle,
        luckyCouponCode: luckyCode,
        items: [{
          product: {
            id: product?.id || landingConfig?.productId || 'landing_prod',
            title: chosenItemTitle,
            price: displayPrice,
            regularPrice: regularPrice,
            image: selectedVariant?.image || displayImage,
            category: product?.category || 'Natural Food',
            stock: 100,
            isAvailable: true
          },
          quantity: quantity,
          variant: selectedVariant ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            price: selectedVariant.price || displayPrice,
            regularPrice: selectedVariant.regularPrice || regularPrice
          } : undefined
        }],
        district: selectedDeliveryMethod?.title || 'N/A'
      };

      const { dbService } = await import('../lib/dbService');
      await dbService.addBookOrder(newOrder);

      // Track Purchase event with Meta Pixel & GTM
      const eventId = createEventId('purchase');
      trackEvent('Purchase', {
        content_name: chosenItemTitle,
        content_ids: [product?.id || landingConfig?.productId || 'landing_prod'],
        content_type: 'product',
        value: totalPrice,
        currency: 'BDT',
        num_items: quantity
      }, eventId);

      playOrderSuccessVibe();
      setPlacedOrderId(orderId);
      setPlacedLuckyCoupon(luckyCode);
      setOrderSuccess(true);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setQuantity(1);
    } catch (err: any) {
      console.error("Order submission failed", err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'অর্ডারটি ব্যর্থ হয়েছে',
        message: err?.message || 'দুঃখিত, অর্ডারটি সফল হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন অথবা সরাসরি হোয়াটসঅ্যাপে যোগাযোগ করুন।'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#110e0a] flex flex-col items-center justify-center space-y-4 text-[#e0562e]">
        <RefreshCw className="h-10 w-10 animate-spin text-[#e0562e]" />
        <p className="text-[#d8c8b8] text-sm font-semibold tracking-wider">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (landingConfig?.isEnabled === false) {
    return (
      <div className="min-h-screen bg-[#110e0a] flex flex-col items-center justify-center p-6 text-center font-sans text-slate-100">
        <div className="max-w-md w-full bg-[#1c1611] border border-[#b8863b]/30 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-[#e0562e]/10 border border-[#e0562e]/30 rounded-2xl flex items-center justify-center mx-auto text-[#e0562e]">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">এই ক্যাম্পেইনটি বর্তমানে স্থগিত আছে</h2>
            <p className="text-xs text-[#a89d91] leading-relaxed">
              {displayTitle} - এর ল্যান্ডিং পেজ ক্যাম্পেইনটি সাময়িকভাবে বন্ধ আছে। আমাদের অনলাইন শপে থাকা অন্যান্য প্রোডাক্টগুলো দেখতে পারেন।
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full py-3.5 bg-[#e0562e] hover:bg-[#c44320] text-white font-black text-xs rounded-xl transition-all shadow-lg cursor-pointer"
          >
            অন্যান্য প্রোডাক্ট দেখুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#110e0a] text-slate-100 font-sans pb-28 sm:pb-20 selection:bg-[#e0562e] selection:text-white">
      
      {/* Container wrapper matching bestwatchbd layout */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-3 space-y-7">

        {/* ========================================================== */}
        {/* 1. TOP GIVEAWAY BANNER & HERO SECTION                      */}
        {/* ========================================================== */}
        <section className="text-center space-y-4 pt-2">
          
          {/* Top Pill Badge: '🏆 Winner will get this bike' */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1c1611] border border-[#d49b38]/60 text-[#f5b842] text-xs font-bold tracking-wide shadow-md">
            <span>{campaignBadgeText}</span>
          </div>

          {/* Top Graphic Poster Banner (Hero Top Image) */}
          <div className="relative rounded-2xl overflow-hidden border border-[#b8863b]/30 shadow-2xl bg-[#16120e]">
            <img 
              src={heroTopImage || '/placeholder-image.svg'} 
              alt={displayTitle} 
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/placeholder-image.svg')) {
                  target.src = '/placeholder-image.svg';
                }
              }}
              className="w-full h-auto max-h-[480px] object-cover mx-auto"
            />
          </div>

          {/* Embedded YouTube Video (9:16 Mobile & 16:9 Desktop) */}
          {embedVideoUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-[#b8863b]/30 shadow-2xl bg-black aspect-[9/16] md:aspect-video w-full max-w-sm md:max-w-none mx-auto my-3">
              <iframe
                src={embedVideoUrl}
                title="Product Video Review"
                loading="lazy"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}

          {/* Main Hero Title: 'Old fashioned design, chance to win R15!' */}
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-tight px-2">
            {displayTitle}
          </h1>

          {/* Subtitle / Pitch Copy */}
          <p className="text-xs sm:text-sm text-[#d4c8bc] leading-relaxed max-w-lg mx-auto font-normal px-2">
            {displayDesc}
          </p>

          {/* Lucky Draw Ticker Text */}
          {campaignTickerText && (
            <p className="text-xs sm:text-sm font-bold text-[#f5b842] leading-tight">
              {campaignTickerText}
            </p>
          )}

          {/* Price & Discount Row */}
          <div className="flex items-center justify-center gap-3 pt-1">
            {regularPrice > displayPrice && (
              <span className="text-sm sm:text-base text-slate-400 line-through font-mono font-medium">
                Tk.{regularPrice.toLocaleString('bn-BD')}
              </span>
            )}
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {displayPrice.toLocaleString('bn-BD')} only
            </span>
            {discountPercent > 0 && (
              <span className="bg-[#e4a836] text-[#1a140d] font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs">
                {discountPercent}% discount
              </span>
            )}
          </div>

          {/* Primary CTA Button: '🛒 Order now' */}
          <div className="pt-2">
            <button
              type="button"
              onClick={scrollToOrder}
              className="w-full max-w-md mx-auto py-3.5 px-6 bg-[#e0562e] hover:bg-[#c9451f] text-white font-black text-sm sm:text-base rounded-xl shadow-lg shadow-[#e0562e]/30 transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Order now</span>
            </button>
          </div>
        </section>

        {/* ========================================================== */}
        {/* 2. SECTION: 'Gallery' / 'Premium from every angle' */}
        {/* ========================================================== */}
        <section className="text-center space-y-3 pt-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#e0562e] flex items-center justify-center gap-2">
              <span className="w-6 h-[1px] bg-[#e0562e]"></span>
              <span>{gallerySectionTag}</span>
              <span className="w-6 h-[1px] bg-[#e0562e]"></span>
            </p>
            <h2 className="text-lg sm:text-2xl font-black text-white">
              {gallerySectionTitle}
            </h2>
          </div>

          {/* Interactive Image Slider */}
          <div 
            className="relative rounded-2xl overflow-hidden border border-[#b8863b]/40 shadow-xl bg-[#17130e] max-w-md mx-auto aspect-square flex items-center justify-center group"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img 
              src={galleryImages[galleryIndex] || displayImage || '/placeholder-image.svg'} 
              alt="Watch Gallery" 
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/placeholder-image.svg')) {
                  target.src = '/placeholder-image.svg';
                }
              }}
              className="w-full h-full object-cover transition-all duration-300"
            />

            {/* Slider Navigation Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Pagination Dots */}
          {galleryImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIndex(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    galleryIndex === i ? 'w-5 bg-[#e0562e]' : 'w-2 bg-[#4a3f33]'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Simple Multiple Image Preview: Click thumbnail to change cover image */}
          {galleryImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2.5 pb-1 overflow-x-auto max-w-md mx-auto no-scrollbar">
              {galleryImages.map((imgUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIndex(i)}
                  className={`w-14 h-14 rounded-[6px] overflow-hidden border-2 transition-all cursor-pointer bg-white p-0.5 shrink-0 ${
                    galleryIndex === i ? 'border-[#F37022] ring-2 ring-[#F37022]/30 scale-105 shadow-xs' : 'border-slate-300 opacity-70 hover:opacity-100'
                  }`}
                  title={`Preview image ${i + 1}`}
                  aria-label={`Preview image ${i + 1}`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Order CTA under Slider */}
          <div className="pt-2">
            <button
              type="button"
              onClick={scrollToOrder}
              className="w-full max-w-md mx-auto py-3.5 px-6 bg-[#e0562e] hover:bg-[#c9451f] text-white font-black text-sm rounded-xl shadow-md transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Order now</span>
            </button>
          </div>
        </section>



        {/* ========================================================== */}
        {/* 5. SECTION: 'R15 lucky draw' / 'Order, win R15'       */}
        {/* ========================================================== */}
        <section className="text-center space-y-4 pt-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#e0562e] flex items-center justify-center gap-2">
              <span className="w-6 h-[1px] bg-[#e0562e]"></span>
              <span>{luckyDrawTag}</span>
              <span className="w-6 h-[1px] bg-[#e0562e]"></span>
            </p>
            <h2 className="text-lg sm:text-2xl font-black text-white">
              {luckyDrawTitle}
            </h2>
          </div>

          {/* Step-by-Step Numbered List */}
          <div className="space-y-3.5 text-left max-w-md mx-auto pt-1">
            {luckyDrawSteps.map((stepText, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#e0562e] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {(idx + 1).toLocaleString('bn-BD')}
                </span>
                <p className="text-xs sm:text-sm text-[#d4c8bc] leading-snug">
                  {stepText}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================== */}
        {/* 6. SECTION: 'Color selection' & ORDER FORM (CHECKOUT)        */}
        {/* ========================================================== */}
        <section id="order-form-section" className="scroll-mt-12 text-center space-y-4 pt-3">
          {variants.length > 1 ? (
            /* Multi-Variant Mode (e.g. Silver, Black) */
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#e0562e] flex items-center justify-center gap-2">
                  <span className="w-6 h-[1px] bg-[#e0562e]"></span>
                  <span>{colorSectionTag}</span>
                  <span className="w-6 h-[1px] bg-[#e0562e]"></span>
                </p>
                <h2 className="text-base sm:text-xl font-black text-white px-2">
                  {colorSectionTitle}
                </h2>
              </div>

              {/* Variant Selector Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md mx-auto pt-1">
                {variants.map((v, idx) => {
                  const isSelected = (selectedVariant?.id === v.id) || (!selectedVariant && idx === 0);
                  return (
                    <button
                      key={v.id || idx}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#181d24] text-white border-2 border-[#f5b842] shadow-lg ring-2 ring-[#f5b842]/30 scale-102'
                          : 'bg-[#17130e] text-[#c9bcb0] border border-[#2e261e] hover:border-[#b8863b]/50'
                      }`}
                    >
                      {v.image && (
                        <img 
                          src={v.image} 
                          alt={v.name} 
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.endsWith('/placeholder-image.svg')) {
                              target.src = '/placeholder-image.svg';
                            }
                          }}
                          className="w-6 h-6 object-contain rounded" 
                        />
                      )}
                      <span>{v.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#f5b842] stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Single Variant: Clean Product Title & Highlight Badge */
            <div className="space-y-2.5 max-w-md mx-auto px-2">
              <p className="text-xs font-bold text-[#e0562e] flex items-center justify-center gap-2">
                <span className="w-6 h-[1px] bg-[#e0562e]"></span>
                <span>{colorSectionTag || 'colorselection'}</span>
                <span className="w-6 h-[1px] bg-[#e0562e]"></span>
              </p>

              <div className="bg-gradient-to-r from-[#1c150c] via-[#17130e] to-[#120e0a] border border-[#b8863b]/40 rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#0f0c08] border border-[#382d22] p-1 shrink-0 flex items-center justify-center">
                    <img
                      src={selectedVariant?.image || displayImage || '/placeholder-image.svg'}
                      alt={selectedVariant?.name || displayTitle}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.endsWith('/placeholder-image.svg')) {
                          target.src = '/placeholder-image.svg';
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {displayTitle}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#f5b842] bg-[#f5b842]/10 px-2 py-0.5 rounded-md border border-[#f5b842]/20">
                        ✨ {selectedVariant?.tag || 'Original Premium Collection'}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        ⚡ In-stock ready delivery
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Placement Form */}
          <div className="bg-[#17130e] border border-[#b8863b]/40 rounded-2xl p-4 sm:p-6 text-left max-w-md mx-auto shadow-2xl space-y-4">
            
            {orderSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">অভিনন্দন! আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে</h3>
                  <p className="text-xs text-slate-300">
                    অর্ডার নম্বর: <span className="font-mono font-black text-[#f5b842]">#{placedOrderId}</span>
                  </p>
                </div>

                {/* Confirmed Order Card Details */}
                <div className="bg-[#120e0a] border border-[#382d22] rounded-xl p-3.5 text-left text-xs space-y-2">
                  <div className="flex justify-between text-[#c9bcb0]">
                    <span>পণ্য:</span>
                    <span className="font-bold text-white text-right max-w-[200px] truncate">{displayTitle}</span>
                  </div>
                  <div className="flex justify-between text-[#c9bcb0]">
                    <span>মোট বিল:</span>
                    <span className="font-bold text-[#f5b842] font-mono">Tk.{totalPrice.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex justify-between text-[#c9bcb0]">
                    <span>পেমেন্ট মাধ্যম:</span>
                    <span className="font-bold text-emerald-400">ক্যাশ অন ডেলিভারি (হাতে পেয়ে মূল্য পরিশোধ)</span>
                  </div>
                </div>

                {placedLuckyCoupon && (landingConfig?.campaignBadgeText?.includes('কুপন') || Boolean(landingConfig?.luckyDrawTag && !landingConfig.luckyDrawTag.includes('R15'))) && (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-[#f5b842] bg-gradient-to-b from-[#2d1e0d] via-[#1c150c] to-[#120e0a] p-4 text-center shadow-2xl space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5b842]/20 border border-[#f5b842]/40 text-[#f5b842] text-[11px] font-bold">
                      <Trophy className="w-3.5 h-3.5 text-[#f5b842]" />
                      <span>অফিশিয়াল কুপন কোড</span>
                    </div>
                    
                    <p className="text-[11px] text-[#d8c8b8]">আপনার অর্ডার কুপন নম্বর:</p>
                    
                    <div className="py-2.5 px-4 bg-black/60 border border-dashed border-[#f5b842]/70 rounded-xl flex items-center justify-center gap-3">
                      <span className="font-mono text-xl sm:text-2xl font-black text-[#f5b842] tracking-wider">
                        {placedLuckyCoupon}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(placedLuckyCoupon);
                          setFeedback({
                            isOpen: true,
                            type: 'success',
                            title: 'কপি সফল হয়েছে',
                            message: `কুপন কোড ${placedLuckyCoupon} কপি হয়েছে।`
                          });
                        }}
                        className="p-1.5 rounded-lg bg-[#f5b842]/20 hover:bg-[#f5b842]/30 text-[#f5b842] transition-colors cursor-pointer"
                        title="কুপন কোড কপি করুন"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-[#a89d91]">
                  আমাদের কাস্টমার কেয়ার প্রতিনিধি কিছুক্ষণের মধ্যে আপনার নাম্বারে কল করে অর্ডারটি কনফার্ম করবেন।
                </p>

                <button
                  type="button"
                  onClick={() => setOrderSuccess(false)}
                  className="w-full py-3 bg-[#e0562e] hover:bg-[#c44320] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  আরেকটি অর্ডার করুন
                </button>
              </div>
            ) : (
              <form onSubmit={handleOrderSubmit} className="space-y-3.5 text-xs">
                <div className="text-center border-b border-[#2e261e] pb-2">
                  <h3 className="text-sm font-bold text-white">অর্ডার করতে নিচের ফর্মটি পূরণ করুন</h3>
                  <p className="text-[10px] text-[#a89d91]">ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন</p>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-200">
                    আপনার নাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="আপনার সম্পূর্ণ নাম লিখুন"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#120e0a] border border-[#382d22] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#e0562e] transition-all"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-200">
                      মোবাইল নম্বর <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">১১ ডিজিট</span>
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="যেমন: 01315861003"
                      value={customerPhone}
                      onKeyDown={(e) => {
                        if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          return;
                        }
                        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
                          return;
                        }
                        if (!/^[0-9০-৯\+]$/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const clean = sanitizeBDPhoneInput(pasted);
                        setCustomerPhone(clean);
                        if (phoneError) setPhoneError('');
                        if (clean.length === 11) {
                          const val = validateBDPhone(clean);
                          if (!val.isValid) setPhoneError(val.error || '');
                          else setPhoneError('');
                        }
                      }}
                      onChange={(e) => {
                        const sanitized = sanitizeBDPhoneInput(e.target.value);
                        setCustomerPhone(sanitized);
                        if (phoneError) setPhoneError('');
                        if (sanitized.length === 11) {
                          const val = validateBDPhone(sanitized);
                          if (!val.isValid) setPhoneError(val.error || '');
                          else setPhoneError('');
                        }
                      }}
                      onBlur={() => {
                        if (customerPhone.trim()) {
                          const val = validateBDPhone(customerPhone);
                          if (!val.isValid) setPhoneError(val.error || '');
                          else setPhoneError('');
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 bg-[#120e0a] border ${
                        phoneError ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[#382d22] focus:border-[#e0562e]'
                      } rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all font-mono`}
                    />
                    {customerPhone.length === 11 && !phoneError && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xs select-none">
                        ✓
                      </span>
                    )}
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-red-400 font-medium">{phoneError}</p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-200">
                      সম্পূর্ণ ডেলিভারি ঠিকানা <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-[#f5b842]">বাসা/রোড আবশ্যক</span>
                  </div>
                  <div className="relative">
                    <textarea
                      required
                      rows={2}
                      placeholder="যেমন: বাসা নং ১০, আদাবর, ঢাকা অথবা গ্রাম: মঙ্গলবাড়ি, থানা: ধামইরহাট, জেলা: নওগাঁ"
                      value={customerAddress}
                      onChange={(e) => {
                        setCustomerAddress(e.target.value);
                        if (addressError) setAddressError('');
                        if (e.target.value.trim().length >= 10) {
                          const val = validateDeliveryAddress(e.target.value);
                          if (val.isValid) setAddressError('');
                        }
                      }}
                      onBlur={() => {
                        if (customerAddress.trim()) {
                          const val = validateDeliveryAddress(customerAddress);
                          if (!val.isValid) setAddressError(val.error || '');
                          else setAddressError('');
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 bg-[#120e0a] border ${
                        addressError ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[#382d22] focus:border-[#e0562e]'
                      } rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all resize-none`}
                    />
                    {customerAddress.trim().length >= 10 && validateDeliveryAddress(customerAddress).isValid && !addressError && (
                      <span className="absolute right-3.5 bottom-3.5 text-emerald-400 font-bold text-xs select-none">
                        ✓
                      </span>
                    )}
                  </div>
                  {addressError && (
                    <p className="text-[11px] text-red-400 font-medium leading-tight">{addressError}</p>
                  )}
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-slate-200">পরিমাণ:</span>
                  <div className="flex items-center border border-[#382d22] rounded-lg bg-[#120e0a]">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1 text-slate-300 hover:text-white font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-[#f5b842] font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="px-3 py-1 text-slate-300 hover:text-white font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Delivery Area Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="block font-bold text-slate-200">ডেলিভারি এলাকা:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeDeliveryMethods.map((method) => {
                      const isSelected = (selectedDeliveryMethod?.id === method.id) || (selectedDeliveryMethodId === method.id);
                      const mCalc = calculateDeliveryCharge({
                        items: [{
                          product: product || { price: displayPrice },
                          variant: selectedVariant ? { id: selectedVariant.id, name: selectedVariant.name, price: selectedVariant.price, weight: (selectedVariant as any).weight } : null,
                          quantity
                        }],
                        method,
                        settings: storeSettings,
                        isFreeDelivery
                      });

                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedDeliveryMethodId(method.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#261e16] border-[#e0562e] text-white shadow-xs'
                              : 'bg-[#120e0a] border-[#2e261e] text-[#a89d91]'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-[11px] truncate block">{method.title}</span>
                            {mCalc.isWeightBased && mCalc.extraWeightKg > 0 && !isFreeDelivery && (
                              <span className="text-[10px] text-[#f5b842]/90 block">
                                (+{mCalc.extraWeightKg} কেজি অতিরিক্ত ৳{mCalc.extraCharge})
                              </span>
                            )}
                          </div>
                          <span className={`font-bold text-[11px] font-mono shrink-0 ml-2 ${isFreeDelivery ? 'text-emerald-400' : 'text-[#f5b842]'}`}>
                            {isFreeDelivery ? 'ফ্রি (Free)' : `Tk.${mCalc.totalCharge}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-[#120e0a] border border-[#2e261e] rounded-xl p-3 space-y-1.5 pt-2">
                  <div className="flex justify-between text-[#a89d91]">
                    <span>সাবটোটাল ({quantity}টি):</span>
                    <span className="font-bold text-white font-mono">Tk.{subtotal.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex justify-between text-[#a89d91]">
                    <div className="flex items-center gap-1.5">
                      <span>ডেলিভারি চার্জ:</span>
                      {deliveryCalc.isWeightBased && deliveryCalc.totalWeightKg > 0 && !isFreeDelivery && (
                        <span className="text-[10px] bg-[#1f1812] text-[#f5b842] px-1.5 py-0.5 rounded font-mono">
                          {deliveryCalc.totalWeightKg} কেজি
                        </span>
                      )}
                    </div>
                    <span className={`font-bold font-mono ${deliveryCharge === 0 ? 'text-emerald-400' : 'text-white'}`}>
                      {deliveryCharge === 0 ? 'ফ্রি (Free)' : `Tk.${deliveryCharge}`}
                    </span>
                  </div>
                  {deliveryCalc.isWeightBased && deliveryCalc.extraWeightKg > 0 && !isFreeDelivery && (
                    <div className="text-[11px] text-[#f5b842] flex justify-between bg-[#1f1812] px-2 py-1 rounded">
                      <span>অতিরিক্ত ওজনের চার্জ ({deliveryCalc.extraWeightKg} কেজি x ৳{deliveryCalc.extraPerKgRate}):</span>
                      <span className="font-mono font-bold">+{deliveryCalc.extraCharge} Tk</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-[#2e261e] flex justify-between font-black text-sm text-white">
                    <span>সর্বমোট বিল:</span>
                    <span className="text-[#f5b842] font-mono">Tk.{totalPrice.toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                {/* Submit Order Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#e0562e] hover:bg-[#c9451f] text-white font-black text-sm rounded-xl shadow-lg transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>প্রসেসিং হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>অর্ডার কনফার্ম করুন • Tk.{totalPrice.toLocaleString('bn-BD')}</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-[#a89d91] flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>পণ্য হাতে পেয়ে চেক করে সম্পূর্ণ মূল্য পরিশোধ করুন</span>
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#2e261e] py-6 text-center text-[11px] text-[#8f8274] space-y-1">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          {supportPhone && (
            <p>Emergency Helpline: <a href={`tel:${supportPhone}`} className="text-[#f5b842] font-bold">{supportPhone}</a></p>
          )}
        </footer>

      </div>

      {/* ========================================================== */}
      {/* 7. FIXED BOTTOM ACTION BAR (Exact demo style from photos)  */}
      {/* ========================================================== */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-[#16120e]/95 backdrop-blur-md border-t border-[#2e261e] p-2.5 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          {/* Orange '🛒 Place an order' Button */}
          <button
            type="button"
            onClick={scrollToOrder}
            className="flex-1 py-3 px-3 bg-[#e0562e] hover:bg-[#c9451f] text-white font-black text-xs sm:text-sm rounded-lg shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>order</span>
          </button>

          {/* Green '💬 WhatsApp' Button */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="flex-1 py-3 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm rounded-lg shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

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
