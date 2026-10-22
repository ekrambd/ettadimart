export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  regularPrice?: number;
  image?: string;
  color?: string;
  weight?: number; // Weight in kg
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
}

export interface Product {
  id: string;
  title: string;
  subtitle?: string;
  sku?: string;
  price: number;
  regularPrice?: number;
  costPrice?: number;
  weight?: number; // Weight in kg
  hasVariants?: boolean;
  variants?: ProductVariant[];
  image?: string;
  category: string;
  subCategory?: string;
  brand?: string;
  brandId?: string;
  stock?: number;
  openingStock?: number;
  receivedStock?: number;
  soldStock?: number;
  returnedStock?: number;
  damagedStock?: number;
  transferredStock?: number;
  reservedStock?: number;
  reorderPoint?: number;
  isAvailable?: boolean;
  description?: string;
  ingredients?: string;
  benefitsHighlights?: string;
  howToUseIt?: string;

  specs?: string[];
  features?: string[];
  tableOfContents?: string[] | string;
  createdAt?: string;
  viewsCount?: number;

  // Additional publishing, identity & pricing fields from admin panel
  productType?: string;
  translation?: string;
  barcode?: string;
  shortSummary?: string;
  vatPercent?: number;
  authorName?: string;
  pdfUrl?: string;
  slug?: string; // Optional product URL slug for public product pages
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  // Book-specific metadata
  primaryAuthor?: string;
  printType?: string; // e.g., 'newsprint', 'whitepaper', etc.
  isbn?: string;
  colorGrade?: string; // e.g., 'B&W', 'Color'
  edition?: string;
  pageCount?: number;
  samplePdfUrl?: string; // Short preview PDF
  samplePages?: string[]; // Array of image URLs for preview pages
  isFlashSale?: boolean;
  flashPrice?: number;
  isPrivate?: boolean;
  isFeatured?: boolean;
  isCampaign?: boolean;
  isNewArrival?: boolean;
  isOneTimePurchase?: boolean;
  continueSelling?: boolean;
  isUnlisted?: boolean;
  codAvailable?: boolean;
  deliveryChargeEnabled?: boolean;
  deliveryChargeAmount?: number;
  exclusiveDelivery?: boolean;
  addQrToImage?: boolean;
  addBarcodeToImage?: boolean;
  giftWrapEnabled?: boolean;
  giftWrapPrice?: number;
  condition?: string;
  author?: string;
  coverImage?: string;
  additionalImages?: string[];
  badge?: string;
  discountPercentage?: number;
  stockQuantity?: number;
  rating?: number;
  reviewsCount?: number;
  tags?: string[];
}

export interface HeroBannerItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  discountText?: string;
  showDiscount?: boolean;
  imageOnly?: boolean;
  bgGradient?: string;
  imageUrl?: string;
  mobileImageUrl?: string;

  link?: string;
  actionType?: 'product' | 'external';
  productId?: string;
  mediaType?: 'image' | 'video';
  videoType?: 'file' | 'youtube';
  videoUrl?: string;
  youtubeUrl?: string;
  buttonText?: string;
}

export interface SubCategoryItem {
  id: string;
  name: string;
  image?: string;
  order?: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  order?: number;
  image?: string;
  icon?: string;
  subcategories?: SubCategoryItem[];
}

export interface PromoCardItem {
  id: string;
  title: string;
  badge?: string;
  bgGradient?: string;
  imageUrl?: string;
  mobileImageUrl?: string;

  discountText?: string;
  priceText?: string;
  subtitle?: string;
  link?: string;
  productId?: string;
}

export interface PaymentGatewayItem {
  id: string;
  title: string;
  type: string;
  status: 'Active' | 'Inactive';
  transactionFee: number;
  discountAmount: number;
  priority: number;
  instruction: string;
  updatedAt: string;
  accountNumber?: string;
}

export interface DeliveryMethodItem {
  id: string;
  title: string;
  status: 'Active' | 'Inactive';
  mode: string;
  type: string;
  minimumCharge: number;
  maximumCharge: number;
  deliveryCharge: number;
  updatedAt: string;
  baseWeightKg?: number; // Base weight threshold (default 1 kg)
  extraPerKgCharge?: number; // Additional fee per kg above base weight (e.g. 20 Tk/kg)
}

export interface LandingPagePrize {
  rank: string; // e.g. "১ম পুরস্কার"
  title: string; // e.g. "Toyota Premio"
  image?: string;
}

export interface LandingPageVariant {
  id: string;
  name: string; // e.g. "সিলভার" or "CASIO AE-1200WHL — সিলভার"
  image: string;
  price?: number;
  regularPrice?: number;
  tag?: string;
  inStock?: boolean;
}

export interface LandingPageWatchSpec {
  label: string;
  value: string;
  icon?: string;
}

export interface LandingPageFeatureItem {
  id?: string;
  title: string;
  subtitle: string;
  icon?: string;
}

export interface LandingPageQualityItem {
  id?: string;
  title: string;
  subtitle: string;
  icon?: string;
}

export interface LandingPageData {
  id: string; // e.g. 'landing-default'
  slug: string; // e.g. 'smart-land-survey-book'
  isEnabled?: boolean; // Whether the landing page is active/enabled for this product
  productId?: string; // linked store product ID (Legacy)
  productIds?: string[]; // Array of linked store product IDs
  bookTitle: string;
  bookSubtitle?: string;
  authorName: string;
  authorDesignation?: string;
  authorPhoto?: string;
  mainBookImage: string;
  heroBookImage?: string;
  logoUrl?: string;
  pageCount?: string;
  paperQuality?: string;
  regularPrice: number;
  offerPrice: number;
  deliveryCharge: number;
  deliveryChargeOutside?: number;
  deliveryAreaInsideText?: string;
  deliveryAreaOutsideText?: string;
  bannerDeliveryText?: string;
  heroHeadline?: string;
  heroDescription?: string;
  shortSummary?: string;
  videoUrl?: string;
  features?: string[];
  tableOfContents?: string[];
  reviews?: { name: string; comment: string; rating: number; photo?: string }[];
  relatedProductIds?: string[];
  galleryImages?: string[];
  paymentMethodDefault?: 'COD' | 'bKash' | 'Nagad';
  onlyCashOnDelivery?: boolean;

  // Watch Store & Giveaway Campaign Template Enhancements
  templateTheme?: 'luxury_dark' | 'classic_light';
  isGiveawayEnabled?: boolean; // Toggle giveaway section on/off on landing page
  campaignBadgeText?: string; // e.g. 'Yamaha R15 জিতুন'
  campaignBannerImage?: string; // Custom graphic banner
  campaignBannerTitle?: string; // e.g. 'অর্ডার করলেই আপনি পেয়ে যাবেন একT কুপন কার্ড যার মাধ্যমে আপনিও ক্যাম্পেইনে যুক্ত হয়ে যেতে পারবেন!'
  campaignCouponNote?: string; // e.g. 'কুপনT অবশ্যই যত্ন সহকারে সংগ্রহ করে রাখবেন'
  campaignTickerText?: string; // e.g. 'Lucky coupon to win Yamaha R15 on order.'
  prizes?: LandingPagePrize[];
  variantSectionTitle?: string; // e.g. 'একই feeচার, তিনT ভিন্ন লুক'
  variantSectionSubtitle?: string; // e.g. 'বেছে নিন যেটা আপনার স্টাইলের সাথে মানায়'
  customVariants?: LandingPageVariant[];
  whatsAppNumber?: string; // Direct WhatsApp contact
  watchSpecs?: LandingPageWatchSpec[];

  // Dynamic Landing Page Sections & Customizable Cards
  vintageTag?: string; // e.g. 'For vintage lovers'
  vintageTitle?: string; // e.g. 'Whose eyes still get stuck on the clocks of yesteryear'
  vintageDescription?: string; // e.g. 'A taste of real time lost in the crowd of smartwatches — this classic design is for them.'
  vintageFeatures?: LandingPageFeatureItem[];

  gallerySectionTag?: string; // e.g. 'Gallery'
  gallerySectionTitle?: string; // e.g. 'Premium from every angle'

  qualitySectionTag?: string; // e.g. 'Why this watch?'
  qualitySectionTitle?: string; // e.g. 'Japanese quality, amazing price'
  qualityItems?: LandingPageQualityItem[];

  luckyDrawTag?: string; // e.g. 'R15 lucky draw'
  luckyDrawTitle?: string; // e.g. 'Order, win R15'
  luckyDrawSteps?: string[]; // e.g. ['Order watch — receive unique lucky coupon code with parcel', ...]
  grandPrizeTitle?: string; // e.g. 'Yamaha R15'
  grandPrizeSubtitle?: string; // e.g. 'Every order = a new opportunity'
  grandPrizeLiveTag?: string; // e.g. 'FACEBOOK LIVE STREAM'

  colorSectionTag?: string; // e.g. 'Color selection'
  colorSectionTitle?: string; // e.g. 'Click on the color button below to preview the watch and order'
}

export interface FlashSaleSettings {
  enabled: boolean;
  productId?: string;
  badgeTag?: string; // e.g. 'BRIGHTENING AND WHITENING SERIES'
  title?: string; // e.g. 'FANTINE Whitening and Brightening Series'
  subtitle?: string; // description
  customImage?: string; // optional image override
  flashPrice?: number; // special promotional price
  originalPrice?: number; // original strike-through price
  endDate?: string; // ISO date string e.g. '2026-10-31T23:59:59'
  buttonText?: string; // e.g. 'SHOP NOW'
  showVideoSection?: boolean;
  videoTitle?: string;
  videoSubtitle?: string;
  videoType?: 'file' | 'youtube';
  videoUrl?: string;
  youtubeUrl?: string;
}

export interface HighlightSpotlightSettings {
  enabled: boolean;
  targetType: 'product' | 'category'; // Whether highlighting a product or category
  productId?: string;
  categoryName?: string;
  badgeTag?: string; // e.g. 'FANTINE INNOVATION HUB'
  title?: string; // e.g. 'Welcome to FANTINE Laboratory'
  subtitle?: string; // e.g. 'Discover our advanced dermal solutions...'
  customImage?: string; // optional custom image or auto from product/category
  buttonText?: string; // e.g. 'EXPLORE NOW'
  buttonLink?: string;
}

export interface EcomSettings {
  storeName?: string;
  storeLogo?: string;
  storeFavicon?: string;
  favicon?: string;
  storeTagline?: string;
  topAnnouncementText?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  storeAddress?: string;
  footerDescription?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
    whatsapp?: string;
    messenger?: string;
  };
  hotlinePhone?: string;
  whatsappNumber?: string;
  messengerUrl?: string;
  calloutBannerText?: string;
  calloutBannerSubtext?: string;
  showCalloutBanner?: boolean;
  heroBannerLeftImage?: string;
  heroBannerLeftLink?: string;
  heroBannerRightImage?: string;
  heroBannerRightLink?: string;
  trustBadges?: {
    badge1Icon?: string;
    badge1Title?: string;
    badge1Subtitle?: string;
    badge2Icon?: string;
    badge2Title?: string;
    badge2Subtitle?: string;
    badge3Icon?: string;
    badge3Title?: string;
    badge3Subtitle?: string;
  };
  primaryColor?: string;
  pixelId?: string;
  gtmId?: string;
  googleSiteVerification?: string;
  metaKeywords?: string;
  metaApiToken?: string;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  deliveryChargeInsideDhaka: number;
  deliveryChargeOutsideDhaka: number;
  deliveryChargeInsideExpress?: number;
  deliveryChargeOutsideExpress?: number;
  freeDeliveryEnabled?: boolean;
  freeDeliveryMinPurchase?: number;
  weightBasedDeliveryEnabled?: boolean;
  defaultBaseWeightKg?: number; // e.g. 1 kg
  defaultExtraPerKgInsideDhaka?: number; // e.g. 20 Tk/kg
  defaultExtraPerKgOutsideDhaka?: number; // e.g. 25 Tk/kg
  defaultProductWeightKg?: number; // fallback e.g. 0.5 kg if product weight not specified
  deliveryDays?: string[];
  deliveryCutoffTimes?: Record<string, string>;

  bkashNumber?: string;
  nagadNumber?: string;
  paymentGateways?: PaymentGatewayItem[];
  deliveryMethods?: DeliveryMethodItem[];
  heroBanners?: HeroBannerItem[];
  categories?: string[];
  categoryItems?: CategoryItem[];
  brands?: Brand[];
  promoCards?: PromoCardItem[];
  pointsEnabled?: boolean;
  pointsEarnRate?: number;
  pointsRewards?: PointRewardItem[];
  pointsFaqs?: PointFaqItem[];
  maintenanceMode?: boolean;
  showViewCountOnWebsite?: boolean;
  websiteViewsCount?: number;
  landingViewsCount?: number;
  fcmServerKey?: string;
  fcmVapidKey?: string;
  flashSale?: FlashSaleSettings;
  highlightSpotlight?: HighlightSpotlightSettings;

  // Pathao Courier API Integration Settings
  pathaoClientId?: string;
  pathaoClientSecret?: string;
  pathaoClientEmail?: string;
  pathaoClientPassword?: string;
  pathaoStoreId?: string;
  pathaoEnvironment?: 'sandbox' | 'production';
  pathaoBaseUrl?: string;
  pathaoGrantType?: string;
  pathaoTitle?: string;
  pathaoMinCharge?: number;
  pathaoMaxCharge?: number;
  pathaoWebhookSecret?: string;
  defaultCourierProvider?: 'steadfast' | 'pathao';
  aboutSettings?: AboutPageSettings;
}

export interface AboutPagePillar {
  id: string;
  title: string;
  description: string;
  icon?: string;
  badge?: string;
}

export interface AboutPageStat {
  id: string;
  value: string;
  label: string;
}

export interface AboutPageSettings {
  title?: string;
  subtitle?: string;
  content?: string;
  image?: string;
  badge?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  storyBadge?: string;
  storyTitle?: string;
  storySubtitle?: string;
  storyParagraph1?: string;
  storyParagraph2?: string;
  storyParagraph3?: string;
  storyImage?: string;
  pillarsTitle?: string;
  pillarsSubtitle?: string;
  pillars?: AboutPagePillar[];
  hqTitle?: string;
  hqSubtitle?: string;
  hqAddress?: string;
  hqImage?: string;
  missionStatement?: string;
  founderQuote?: string;
  founderName?: string;
  founderTitle?: string;
  founderImage?: string;
  stats?: AboutPageStat[];
}

export interface InstituteInfo {
  name: string;
  regNo: string;
  phone: string;
  email: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  website?: string;
  logo?: string;
  favicon?: string;
  tagline?: string;
  establishedYear?: string;
  description?: string;
  ingredients?: string;
  benefitsHighlights?: string;
  howToUseIt?: string;
  author?: string;
  tags?: string[];

  industry?: string;
  bearingRollLocation?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  couponDiscount?: number;

  address?: string;
  district?: string;
  registeredAt?: string;
  totalOrders?: number;
  totalSpent?: number;
  pointsBalance?: number;
  pointsSpent?: number;
  points?: number;
  password?: string;
  orders?: any[];
  lastOrderDate?: string;
  authMethod?: 'email' | 'phone' | 'google';
  wishlist?: string[];
  createdAt?: string;
}

export interface BookOrder {
  id: string; // e.g. ORD-2026-1001
  productId?: string;
  productName?: string;
  customerName: string;
  email?: string; 
  couponDiscount?: number;

  paymentGateway?: string;
  deliveryFee?: number;

  name?: string;
  phone: string;
  address: string;
  deliveryZone?: string;
  district?: string;
  thana?: string;
  productTitle?: string; // e.g. "Smart land surveying and management"
  price?: number; // 490
  unitPrice?: number;
  deliveryCharge: number; // 90
  quantity: number; // 1
  items?: CartItem[] | any[];
  totalPrice?: number; // 580
  totalAmount?: number;
  paymentMethod?: 'COD' | 'bKash' | 'Nagad';
  trxId?: string;
  senderPhone?: string;
  orderType?: 'landing' | 'physical' | 'store' | 'storefront';
  source?: string;
  deliveryArea?: string;
  status: 'Pending' | 'Confirmed' | 'Packaging' | 'Ready for Shipment' | 'Shipped' | 'Delivered' | 'Hold' | 'Under Review' | 'Not Responding' | 'Return' | 'Cancelled' | string;
  createdAt: string;
  orderDate?: string;
  pointsSpent?: number;
  notes?: string;
  steadfastTrackingCode?: string;
  steadfastStatus?: string;
  pathaoConsignmentId?: string;
  pathaoTrackingCode?: string;
  pathaoStatus?: string;
  pathaoDeliveryFee?: number;
  courierProvider?: 'steadfast' | 'pathao' | string;
  couponCode?: string;
  luckyCouponCode?: string;
  discountAmount?: number;
  handoffProof?: string;
  courierMerchant?: string;
  giftWrapSelected?: boolean;
  giftWrapPrice?: number;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  discount: number;
  maxDiscount?: number;
  minimumSpent?: number;
  minSpent?: number;
  usageLimit?: number;
  usageCount: number;
  endDate?: string;
  type: 'fixed' | 'percentage';
  status: 'Active' | 'Inactive';
  visibility: 'Public' | 'Private';
  oncePerCustomer?: boolean;
  description?: string;
  ingredients?: string;
  benefitsHighlights?: string;
  howToUseIt?: string;
  author?: string;
  tags?: string[];

  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  ingredients?: string;
  benefitsHighlights?: string;
  howToUseIt?: string;
  author?: string;
  tags?: string[];

  website?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ActiveTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'coupons' | 'inventory' | 'category_management' | 'brand_management' | 'flash_sale' | 'highlight_spotlight' | 'about_settings' | 'landing_setup' | 'payment_settings' | 'delivery_settings' | 'pixel_settings' | 'courier_settings' | 'profile' | 'points';

export interface ContactMessage {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  createdAt: string;
  status?: 'unread' | 'read' | 'replied';
  replyNote?: string;
}

export interface Review {
  id: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  customerName: string;
  email?: string; 
  couponDiscount?: number;

  paymentGateway?: string;
  deliveryFee?: number;

  customerPhone: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
  orderId?: string;
}

export interface PointRewardItem {
  id: string;
  title: string;
  pointsCost: number;
  rewardType: 'shipping_discount' | 'flat_discount';
  value: number;
}

export interface PointFaqItem {
  id: string;
  question: string;
  answer: string;
}
