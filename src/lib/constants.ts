import { 
  Product, Coupon, Brand, 
  PaymentGatewayItem, DeliveryMethodItem, HeroBannerItem, PromoCardItem, 
  EcomSettings, InstituteInfo, FlashSaleSettings, HighlightSpotlightSettings 
} from '../types';

export const DEFAULT_PRODUCTS: Product[] = [];

export const DEFAULT_COUPONS: Coupon[] = [];

export const DEFAULT_BRANDS: Brand[] = [];

export const DEFAULT_PAYMENT_GATEWAYS: PaymentGatewayItem[] = [
  {
    id: 'gw-1',
    title: 'Cash on Delivery',
    type: 'Cash on Delivery',
    status: 'Active',
    transactionFee: 0,
    discountAmount: 0,
    priority: 1,
    instruction: 'Pay with cash upon delivery of your order.',
    updatedAt: new Date().toLocaleDateString(),
    accountNumber: ''
  }
];

export const DEFAULT_DELIVERY_METHODS: DeliveryMethodItem[] = [
  {
    id: 'dm-1',
    title: 'Inside Dhaka',
    status: 'Active',
    mode: 'Weight based',
    type: 'Weight based',
    minimumCharge: 0,
    maximumCharge: 0,
    deliveryCharge: 60,
    baseWeightKg: 1,
    extraPerKgCharge: 20,
    updatedAt: new Date().toLocaleDateString()
  },
  {
    id: 'dm-2',
    title: 'Outside Dhaka',
    status: 'Active',
    mode: 'Weight based',
    type: 'Weight based',
    minimumCharge: 0,
    maximumCharge: 0,
    deliveryCharge: 120,
    baseWeightKg: 1,
    extraPerKgCharge: 25,
    updatedAt: new Date().toLocaleDateString()
  }
];

export const DEFAULT_HERO_BANNERS: HeroBannerItem[] = [];

export const DEFAULT_PROMO_CARDS: PromoCardItem[] = [];

export const DEFAULT_ABOUT_SETTINGS: import('../types').AboutPageSettings = {
  title: 'About Us',
  subtitle: 'ETTADI MART - CHINA IMPORTED VARIETIES',
  content: `ইত্যাদি মার্টে (Ettadi Mart) আপনাকে স্বাগতম। আমরা সরাসরি চায়নার শীর্ষ উৎপাদনকারী কারখানা থেকে উদ্ভাবনী ও ট্রেন্ডি স্মার্ট গ্যাজেটস, হোম ও কিচেন ভ্যারাইটিজ এবং আধুনিক লাইফস্টাইল পণ্য সামগ্রী বাংলাদেশে সরবরাহ করি।

আমাদের প্রতিটি প্রোডাক্ট ১০০% কার্যকরী, কোয়ালিটি টেস্টেড এবং সবচেয়ে সাশ্রয়ী পাইকারি ও খুচরা মূল্যে গ্রাহকদের কাছে পৌঁছে দেওয়া হয়।

আমাদের লক্ষ্য হলো প্রযুক্তি ও আধুনিক জীবনের সেরা ভ্যারাইটিজ গ্যাজেটসমূহ সারা বাংলাদেশের প্রতিটি ঘরে ঘরে সহজে পৌঁছে দেওয়া।`,
  image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1600&auto=format&fit=crop&q=85',
  badge: '100% FACTORY DIRECT CHINA IMPORT',
  heroTitle: 'Direct China Imported Variety Products & Gadgets',
  heroSubtitle: 'ETTADI MART brings you innovative, practical, and top-selling variety gadgets for modern living at honest prices.',
  heroImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1600&auto=format&fit=crop&q=85',
  storyBadge: 'OUR COMMITMENT & PROMISE',
  storyTitle: 'Direct Factory Quality You Can Rely On',
  storySubtitle: 'Quality Checked & Delivered Directly to Your Doorstep',
  storyParagraph1: 'ETTADI MART was founded with a mission to bring high-utility, trending, and viral China imported variety products directly to customers across Bangladesh without middlemen markups.',
  storyParagraph2: 'Every product is tested for durability, performance, and electrical safety before dispatch, ensuring you always receive genuine and defect-free items.',
  storyParagraph3: '100% factory direct, verified build quality, with 7 days replacement guarantee.',
  storyImage: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1000&auto=format&fit=crop&q=85',
  pillarsTitle: 'Our Four Pillars of Service',
  pillarsSubtitle: 'Committed to delivering authentic quality and fast delivery',
  pillars: [
    {
      id: 'p1',
      badge: 'IMPORT',
      title: '100% China Direct Import',
      description: 'Sourced directly from verified manufacturers with guaranteed build quality.',
      icon: 'ShieldCheck'
    },
    {
      id: 'p2',
      badge: 'TESTED',
      title: 'Rigorous Quality Check',
      description: 'Pre-dispatch testing ensures all electronic & kitchen gadgets function properly.',
      icon: 'Sprout'
    },
    {
      id: 'p3',
      badge: 'FAST',
      title: 'Nationwide Cash on Delivery',
      description: 'Check products in front of delivery agent before completing cash on delivery.',
      icon: 'Heart'
    },
    {
      id: 'p4',
      badge: 'SUPPORT',
      title: '7 Days Replacement',
      description: 'Fast replacement guarantee and responsive WhatsApp customer care.',
      icon: 'Sparkles'
    }
  ],
  hqTitle: 'ETTADI MART Hub',
  hqSubtitle: 'China Imported Variety Mart',
  hqAddress: 'Dhaka, Bangladesh',
  hqImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=85',
  missionStatement: '',
  founderQuote: 'Smart gadgets make daily life simpler and more enjoyable. We bring that innovation straight to your doorstep.',
  founderName: 'ETTADI MART Operations Team',
  founderTitle: 'China Sourcing Division',
  founderImage: 'https://images.unsplash.com/photo-1594824813589-980f745e69e8?w=800&auto=format&fit=crop&q=85',
  stats: [
    { id: 's1', value: '100%', label: 'Authentic & Pure' },
    { id: 's2', value: '24-48h', label: 'Fast Delivery' },
    { id: 's3', value: '10k+', label: 'Happy Customers' },
    { id: 's4', value: 'COD', label: 'Cash on Delivery' }
  ]
};

export const DEFAULT_FLASH_SALE_SETTINGS: FlashSaleSettings = {
  enabled: false,
  productId: '',
  badgeTag: '',
  title: '',
  subtitle: '',
  customImage: '',
  flashPrice: 0,
  originalPrice: 0,
  endDate: '',
  buttonText: 'SHOP NOW',
  showVideoSection: false,
  videoTitle: '',
  videoSubtitle: '',
  videoType: 'file',
  videoUrl: ''
};

export const DEFAULT_HIGHLIGHT_SPOTLIGHT_SETTINGS: HighlightSpotlightSettings = {
  enabled: false,
  targetType: 'product',
  productId: '',
  categoryName: '',
  badgeTag: '',
  title: '',
  subtitle: '',
  customImage: '',
  buttonText: 'BUY NOW',
  buttonLink: ''
};

export const DEFAULT_ECOM_SETTINGS: EcomSettings = {
  storeName: 'ETTADI MART',
  companyName: 'Ettadi Mart',
  storeLogo: '/ettadimart-logo.svg',
  storeFavicon: '/ettadimart-favicon.svg',
  favicon: '/ettadimart-favicon.svg',
  heroBannerLeftImage: '/banners/china-variety-gadgets-banner.svg',
  heroBannerRightImage: '/banners/china-kitchen-lifestyle-banner.svg',
  storeTagline: 'China Imported Varieties & Smart Lifestyle Products',
  topAnnouncementText: '🔥 চায়না থেকে সরাসরি আমদানিকৃত সেরা ট্রেন্ডি গ্যাজেটস ও ভ্যারাইটিজ সমগ্র | সারা দেশে ক্যাশ অন ডেলিভারি!',
  contactEmail: 'support@ettadimart.com',
  contactPhone: '01726275850',
  storeAddress: 'Dhaka, Bangladesh',
  footerDescription: 'ইত্যাদি মার্ট (Ettadi Mart) - চায়না থেকে সরাসরি আমদানিকৃত ট্রেন্ডি স্মার্ট গ্যাজেটস, হোম ও কিচেন ভ্যারাইটিজ এবং ইউনিক লাইফস্টাইল পণ্য সমগ্র। সারা বাংলাদেশে দ্রুততম ক্যাশ অন ডেলিভারি।',
  socialLinks: {
    facebook: '',
    instagram: '',
    youtube: '',
    twitter: '',
    tiktok: '',
    linkedin: '',
    whatsapp: '01726275850'
  },
  primaryColor: '#F37022',
  gtmId: '',
  deliveryChargeInsideDhaka: 70,
  deliveryChargeOutsideDhaka: 120,
  bkashNumber: '',
  nagadNumber: '',
  paymentGateways: DEFAULT_PAYMENT_GATEWAYS,
  deliveryMethods: DEFAULT_DELIVERY_METHODS,
  categories: ['Smart Gadgets', 'Home & Kitchen', 'Daily Utility', 'Personal Care', 'Tools & Accessories', 'Hot Trending'],
  heroBanners: [],
  promoCards: [],
  showViewCountOnWebsite: false,
  websiteViewsCount: 0,
  landingViewsCount: 0,
  aboutSettings: DEFAULT_ABOUT_SETTINGS,
  flashSale: DEFAULT_FLASH_SALE_SETTINGS,
  highlightSpotlight: DEFAULT_HIGHLIGHT_SPOTLIGHT_SETTINGS
};

export const DEFAULT_INSTITUTE_INFO: InstituteInfo = {
  name: 'ETTADI MART',
  regNo: '',
  phone: '01726275850',
  email: 'support@ettadimart.com',
  address: 'Dhaka, Bangladesh',
  street: '',
  description: 'China Imported Varieties & Smart Lifestyle Products',
  industry: 'E-Commerce & China Imported Variety Products',
  bearingRollLocation: '',
  logo: '/ettadimart-logo.svg',
  favicon: '/ettadimart-favicon.svg'
};

export const DEFAULT_LANDING_PAGE_SETTINGS: import('../types').LandingPageData = {
  id: 'landing-default',
  slug: '',
  templateTheme: 'luxury_dark',
  bookTitle: 'চায়না ইম্পোর্টেড ট্রেন্ডি গ্যাজেটস',
  bookSubtitle: '১০০% অরিজিনাল ও আধুনিক লাইফস্টাইল পণ্য',
  authorName: 'ETTADI MART',
  authorDesignation: '১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি',
  authorPhoto: '/placeholder-image.svg',
  mainBookImage: '/placeholder-image.svg',
  heroBookImage: '/placeholder-image.svg',
  logoUrl: '',
  pageCount: '১০০% ন্যাচারাল',
  paperQuality: 'হাইড্রেশন ও পুষ্টি সমৃদ্ধ',
  regularPrice: 0,
  offerPrice: 0,
  deliveryCharge: 60,
  deliveryChargeOutside: 110,
  deliveryAreaInsideText: 'ঢাকার ভিতরে ডেলিভারি',
  deliveryAreaOutsideText: 'ঢাকার বাইরে ডেলিভারি',
  bannerDeliveryText: 'সরাসরি ক্যাশ অন ডেলিভারিতে সারা বাংলাদেশে দ্রুত হোম ডেলিভারি।',
  heroHeadline: '১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি পণ্য',
  heroDescription: 'সেরা মান ও সাশ্রয়ী মূল্যে সরাসরি সংগৃহীত ১০০% প্রিমিয়াম ও অরিজিনাল প্রোডাক্ট।',
  videoUrl: '',
  campaignBadgeText: '১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি',
  campaignBannerTitle: 'অর্ডার করতে নিচের বাটনে ক্লিক করুন',
  campaignCouponNote: 'পণ্য হাতে পেয়ে চেক করে মূল্য পরিশোধ করুন',
  campaignTickerText: 'সরাসরি ক্যাশ অন ডেলিভারিতে অর্ডার করুন!',
  prizes: [],
  variantSectionTitle: 'পণ্যের ভ্যারিয়েন্ট',
  variantSectionSubtitle: 'আপনার পছন্দের প্যাকেজ বা সাইজ বেছে নিন',
  customVariants: [],
  watchSpecs: [],
  features: [],
  reviews: [],
  relatedProductIds: [],
  galleryImages: [],
  paymentMethodDefault: 'COD',
  onlyCashOnDelivery: true,
  vintageTag: '',
  vintageTitle: '',
  vintageDescription: '',
  vintageFeatures: [],
  gallerySectionTag: 'গ্যালারি',
  gallerySectionTitle: 'প্রোডাক্টের প্রতিটি অ্যাঙ্গেলের আসল ছবি',
  qualitySectionTag: 'কেন আমাদের পণ্য সেরা?',
  qualitySectionTitle: 'সেরা মান, শতভাগ বিশুদ্ধতা ও সাশ্রয়ী মূল্য',
  qualityItems: [
    { id: 'qi-1', title: 'ল্যাব টেস্টেড বিশুদ্ধতা', subtitle: 'কোনো প্রকার ভেজাল বা ক্যামিকেল মুক্ত', icon: 'ShieldCheck' },
    { id: 'qi-2', title: 'সরাসরি সংগ্রহ', subtitle: 'উৎপাদকদের থেকে সরাসরি বিশ্বস্ত সোর্সিং', icon: 'Trophy' }
  ],
  luckyDrawTag: 'সহজ অর্ডার প্রক্রিয়া',
  luckyDrawTitle: 'সহজ ৪ ধাপে অর্ডার নির্দেশিকা',
  luckyDrawSteps: [
    'আপনার নাম, মোবাইল নম্বর ও পূর্ণ ঠিকানা প্রদান করুন',
    'আপনার পছন্দের প্যাকেজ বা পরিমাণ সিলেক্ট করুন',
    'অর্ডার কনফার্ম করুন বাটনে ক্লিক করুন',
    'ডেলিভারি ম্যানের কাছ থেকে প্রোডাক্ট চেক করে মূল্য পরিশোধ করুন'
  ],
  grandPrizeTitle: 'ETTADI MART',
  grandPrizeSubtitle: 'China Imported Varieties',
  grandPrizeLiveTag: '১০০% অরিজিনাল গ্যারান্টি',
  colorSectionTag: 'প্যাকেজ বা ভ্যারিয়েন্ট নির্বাচন',
  colorSectionTitle: 'আপনার পছন্দের প্যাকেজ নির্বাচন করুন'
};

export const createDefaultLandingForProduct = (product: Product): import('../types').LandingPageData => {
  const slug = product.slug || product.id;
  
  return {
    id: `landing-${product.id}`,
    slug: slug,
    isEnabled: true,
    productId: product.id,
    productIds: [product.id],
    templateTheme: 'luxury_dark',
    relatedProductIds: [],
    bookTitle: product.title || 'চায়না ইম্পোর্টেড গ্যাজেট',
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
    heroHeadline: product.title || 'প্রিমিয়াম কোয়ালিটি ফুড প্রোডাক্ট',
    heroDescription: product.description || product.shortSummary || '১০০% খাঁটি ও স্বাস্থ্যকর খাদ্যপণ্য। কোনো ক্ষতিকর কেমিক্যাল বা কৃত্রিম উপাদান ছাড়া প্রস্তুত।',
    videoUrl: product.pdfUrl || '',
    campaignBadgeText: '১০০% প্রিমিয়াম ও খাঁটি পণ্য',
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
    features: product.features && product.features.length > 0
      ? product.features
      : [
          '১০০% খাঁটি ও প্রাকৃতিক উপাদান',
          'স্বাস্থ্যসম্মত প্যাকেজিং ও পুষ্টিগুণ অটুট',
          'কোনো ধরনের কৃত্রিম উপাদান বা ক্ষতিকর কেমিক্যাল নেই',
          'ক্যাশ অন ডেলিভারিতে পণ্য দেখে নেওয়ার সুবিধা'
        ],
    reviews: [
      { name: 'মোঃ আব্দুল্লাহ', comment: 'পণ্যটির কোয়ালিটি অসাধারণ। যেমন দেখেছি তেমনই পেয়েছি।', rating: 5 },
      { name: 'ফারহানা ইসলাম', comment: 'প্যাকেজিং খুবই সুন্দর এবং ফ্রেশ। ডেলিভারিও খুব দ্রুত পেয়েছি।', rating: 5 }
    ],
    galleryImages: [product.coverImage, product.image, ...(product.samplePages || [])].filter(Boolean) as string[],
    paymentMethodDefault: 'COD',
    onlyCashOnDelivery: true
  };
};
