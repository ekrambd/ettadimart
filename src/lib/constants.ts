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
  subtitle: 'SHOSTIR BAZAR - COMFORT TO WELLNESS',
  content: `SHOSTIR BAZAR-এ আমরা বিশ্বাস করি সুস্থতা ও স্বাস্থ্যকর জীবনযাপন সবার অধিকার।

আমরা সরাসরি বিশ্বমানের খাঁটি, বিশুদ্ধ ও স্বাস্থ্যকর খাদ্য ও পুষ্টিকর সুপারফুড সরবরাহ করি। আমাদের প্রতিটি প্রোডাক্ট ১০০% আসল, ল্যাব-টেস্টেড এবং সম্পূর্ণ নিরাপদ।

আমাদের লক্ষ্য হলো বাংলাদেশের প্রতিটি মানুষের কাছে সেরা মানের পুষ্টিকর, খাঁটি ও স্বাস্থ্যকর খাদ্যপণ্য সহজলভ্য এবং নির্ভরযোগ্যভাবে পৌঁছে দেওয়া।`,
  image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1600&auto=format&fit=crop&q=85',
  badge: 'PURE & ORGANIC WELLNESS',
  heroTitle: 'Pure Nutrition & Holistic Health For All',
  heroSubtitle: 'SHOSTIR BAZAR brings you the finest selection of authentic superfoods, organic dates, premium nuts, and daily wellness items.',
  heroImage: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1600&auto=format&fit=crop&q=85',
  storyBadge: 'OUR PHILOSOPHY & PROMISE',
  storyTitle: 'Pure Natural Quality You Can Trust',
  storySubtitle: 'From Trusted Organic Growers Directly to Your Family',
  storyParagraph1: 'SHOSTIR BAZAR was born out of a profound commitment to health, purity, and daily wellness. By sourcing authentic superfoods—such as fresh Medina Ajwa dates, golden raisins, organic honey, and raw nuts—we bring health straight to your family table.',
  storyParagraph2: 'Every product is handpicked, quality checked, and carefully packed under strict hygienic standards ensuring maximum freshness and nutritional integrity.',
  storyParagraph3: '100% natural, fresh, free from artificial additives, and guaranteed authentic.',
  storyImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1000&auto=format&fit=crop&q=85',
  pillarsTitle: 'Our Four Pillars of Quality',
  pillarsSubtitle: 'Committed to delivering uncompromising purity and vitality',
  pillars: [
    {
      id: 'p1',
      badge: 'PURITY',
      title: '100% Authentic & Pure',
      description: 'Sourced directly from authentic origins with absolute guarantees of quality and purity.',
      icon: 'Sprout'
    },
    {
      id: 'p2',
      badge: 'HYGIENE',
      title: 'Hygienic Packing',
      description: 'Food-grade premium packaging ensuring maximum freshness and extended shelf life.',
      icon: 'ShieldCheck'
    },
    {
      id: 'p3',
      badge: 'NUTRITION',
      title: 'High Nutrient Density',
      description: 'Loaded with natural vitamins, minerals, and antioxidants for your family’s daily energy.',
      icon: 'Heart'
    },
    {
      id: 'p4',
      badge: 'CARE',
      title: 'Customer Satisfaction',
      description: 'Fast nationwide delivery with Cash on Delivery and dedicated customer support.',
      icon: 'Sparkles'
    }
  ],
  hqTitle: 'SHOSTIR BAZAR Headquarters',
  hqSubtitle: 'Comfort To Wellness',
  hqAddress: 'Dhaka, Bangladesh',
  hqImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=85',
  missionStatement: '',
  founderQuote: 'Healthy living starts with what you consume every day. We are here to make authentic wellness effortless and trustworthy.',
  founderName: 'SHOSTIR BAZAR Wellness Team',
  founderTitle: 'Quality & Wellness Division',
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
  storeName: 'SHOSTIR BAZAR',
  companyName: 'SHOSTIR BAZAR',
  storeLogo: '/uploads/file-1792215004226-886642061.jpg',
  storeFavicon: '/uploads/file-1792215009696-613126128.jpg',
  favicon: '/uploads/file-1792215009696-613126128.jpg',
  heroBannerLeftImage: '/uploads/file-1792185577063-331672488.jpg',
  heroBannerRightImage: '/uploads/file-1792185581499-616845250.jpg',
  storeTagline: 'COMFORT TO WELLNESS',
  topAnnouncementText: 'WELCOME TO SHOSTIR BAZAR',
  contactEmail: 'sostirbazar@gmail.com',
  contactPhone: '‪+880 1934‑224441‬',
  storeAddress: 'Dhaka, Bangladesh',
  footerDescription: 'SHOSTIR BAZAR - COMFORT TO WELLNESS. Discover premium quality products for your health, comfort, and daily wellness.',
  socialLinks: {
    facebook: '',
    instagram: '',
    youtube: '',
    twitter: '',
    tiktok: '',
    linkedin: '',
    whatsapp: ''
  },
  primaryColor: '#0f766e',
  gtmId: '',
  deliveryChargeInsideDhaka: 70,
  deliveryChargeOutsideDhaka: 110,
  bkashNumber: '',
  nagadNumber: '',
  paymentGateways: DEFAULT_PAYMENT_GATEWAYS,
  deliveryMethods: DEFAULT_DELIVERY_METHODS,
  categories: ['ghee'],
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
  name: 'SHOSTIR BAZAR',
  regNo: '',
  phone: '‪+880 1934‑224441‬',
  email: 'sostirbazar@gmail.com',
  address: 'Dhaka, Bangladesh',
  street: '',
  description: 'COMFORT TO WELLNESS',
  industry: 'E-Commerce & Natural Foods',
  bearingRollLocation: '',
  logo: '/uploads/file-1792215004226-886642061.jpg',
  favicon: '/uploads/file-1792215009696-613126128.jpg'
};

export const DEFAULT_LANDING_PAGE_SETTINGS: import('../types').LandingPageData = {
  id: 'landing-default',
  slug: '',
  templateTheme: 'luxury_dark',
  bookTitle: 'প্রিমিয়াম ন্যাচারাল ফুড প্রোডাক্ট',
  bookSubtitle: '১০০% খাঁটি ও স্বাস্থ্যকর পুষ্টিকর খাদ্য',
  authorName: 'SHOSTIR BAZAR',
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
  heroHeadline: 'প্রিমিয়াম কোয়ালিটি প্রাকৃতিক খাদ্য ও পুষ্টি উপাদান',
  heroDescription: 'কোনো ক্ষতিকর কেমিক্যাল বা কৃত্রিম উপাদান ছাড়া প্রাকৃতিক উৎস থেকে সংগৃহীত। ১০০% স্বাস্থ্যকর, ফ্রেশ ও নিরাপদ।',
  videoUrl: '',
  campaignBadgeText: '১০০% প্রিমিয়াম ও খাঁটি পণ্য',
  campaignBannerTitle: 'অর্ডার করতে নিচের বাটনে ক্লিক করুন',
  campaignCouponNote: 'পণ্য হাতে পেয়ে চেক করে মূল্য পরিশোধ করুন',
  campaignTickerText: 'সরাসরি ক্যাশ অন ডেলিভারিতে অর্ডার করুন!',
  prizes: [],
  variantSectionTitle: 'পণ্যের ভ্যারিয়েন্ট',
  variantSectionSubtitle: 'আপনার পছন্দের প্যাকেজ বা সাইজ বেছে নিন',
  customVariants: [],
  watchSpecs: [
    { label: 'মান ও বিশুদ্ধতা', value: '১০০% প্রাকৃতিক ও খাঁটি' },
    { label: 'সংরক্ষণ', value: 'সম্পূর্ণ হাইজিনিক প্যাকেজিং' },
    { label: 'উপাদান', value: 'প্রাকৃতিক ও ক্ষতিকর উপাদানমুক্ত' },
    { label: 'ডেলিভারি', value: 'সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি' }
  ],
  features: [
    '১০০% খাঁটি ও প্রাকৃতিক উপাদান',
    'কোনো কৃত্রিম রং বা ক্ষতিকর প্রিজারভেটিভ নেই',
    'উন্নত ও ফুড-গ্রেড প্যাকেজিং',
    'ক্যাশ অন ডেলিভারি সুবিধা (হাতে পেয়ে মূল্য পরিশোধ)'
  ],
  reviews: [
    { name: 'আরিফুল ইসলাম', comment: 'প্রোডাক্ট হাতে পাওয়ার পর কোয়ালিটি দেখে মুগ্ধ হয়েছি। খুবই খাঁটি ও ফ্রেশ।', rating: 5 },
    { name: 'তাসলিমা আক্তার', comment: 'প্যাকেজিং এবং ডেলিভারি খুব দ্রুত হয়েছে। প্রোডাক্টটি ১০০% প্রিমিয়াম।', rating: 5 }
  ],
  relatedProductIds: [],
  galleryImages: [],
  paymentMethodDefault: 'COD',
  onlyCashOnDelivery: true,
  vintageTag: 'খাঁটি ও প্রাকৃতিক খাদ্য',
  vintageTitle: 'সুস্থতা ও দীর্ঘস্থায়ী শক্তির প্রাকৃতিক সমাধান',
  vintageDescription: 'স্বাস্থ্যকর জীবনযাপনের জন্য খাঁটি ও বিশুদ্ধ প্রাকৃতিক পুষ্টি উপাদান। যা আপনার প্রতিদিনের শক্তিবর্ধনে সহায়ক।',
  vintageFeatures: [
    { id: 'vf-1', title: '১০০% খাঁটি ও ফ্রেশ', subtitle: 'বিশ্বস্ত উৎস থেকে সরাসরি সংগৃহীত', icon: 'ShieldCheck' },
    { id: 'vf-2', title: 'পুষ্টিগুণে ভরপুর', subtitle: 'প্রাকৃতিক ভিটামিন ও মিনারেলে সমৃদ্ধ', icon: 'Zap' },
    { id: 'vf-3', title: 'হাইজিনিক প্যাকেজিং', subtitle: 'ফুড-গ্রেড সিলড প্যাকেটে সুরক্ষিত', icon: 'Package' },
    { id: 'vf-4', title: 'ক্যাশ অন ডেলিভারি', subtitle: 'হাতে পেয়ে দেখে মূল্য পরিশোধের সুবিধা', icon: 'Clock' }
  ],
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
  grandPrizeTitle: 'SHOSTIR BAZAR',
  grandPrizeSubtitle: 'Comfort To Wellness',
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
    bookTitle: product.title || 'প্রিমিয়াম ফুড প্রোডাক্ট',
    bookSubtitle: product.subtitle || product.shortSummary || product.title,
    authorName: product.authorName || 'SHOSTIR BAZAR',
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
