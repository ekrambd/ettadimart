import { z } from 'zod';

export const SubCategoryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Sub-Categoryর Name is required'),
  order: z.number().optional()
});

export const CategoryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'categoryর Name is required'),
  order: z.number().optional(),
  subcategories: z.array(SubCategoryItemSchema).optional().default([])
});

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'productের name/শিRoName is required'),
  subtitle: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().nonnegative(),
  regularPrice: z.number().optional(),
  costPrice: z.number().optional(),
  image: z.string(),
  category: z.string().min(1, 'category আবশ্যক'),
  subCategory: z.string().optional(),
  stock: z.number().int().default(0),
  openingStock: z.number().optional(),
  receivedStock: z.number().optional(),
  soldStock: z.number().optional(),
  returnedStock: z.number().optional(),
  damagedStock: z.number().optional(),
  transferredStock: z.number().optional(),
  reservedStock: z.number().optional(),
  reorderPoint: z.number().optional(),
  isAvailable: z.boolean().default(true),
  description: z.string().optional(),
  specs: z.array(z.string()).optional(),
  createdAt: z.string().optional(),

  // Publishing & Identity
  productType: z.string().optional(),
  translation: z.string().optional(),
  barcode: z.string().optional(),
  shortSummary: z.string().optional(),
  vatPercent: z.number().optional(),
  authorName: z.string().optional(),
  pdfUrl: z.string().optional(),
  isFlashSale: z.boolean().optional(),
  flashPrice: z.number().optional(),
  isPrivate: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isCampaign: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isOneTimePurchase: z.boolean().optional(),
  continueSelling: z.boolean().optional(),
  isUnlisted: z.boolean().optional(),
  codAvailable: z.boolean().optional(),
  deliveryChargeEnabled: z.boolean().optional(),
  deliveryChargeAmount: z.number().optional(),
  exclusiveDelivery: z.boolean().optional(),
  addQrToImage: z.boolean().optional(),
  addBarcodeToImage: z.boolean().optional()
});

export const HeroBannerItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  badge: z.string().optional(),
  discountText: z.string().optional(),
  showDiscount: z.boolean().optional(),
  imageOnly: z.boolean().optional(),
  bgGradient: z.string().optional(),
  imageUrl: z.string().optional(),
  link: z.string().optional(),
  actionType: z.enum(['product', 'external']).optional(),
  productId: z.string().optional()
});

export const PaymentGatewayItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  status: z.enum(['Active', 'Inactive']),
  transactionFee: z.number(),
  discountAmount: z.number(),
  priority: z.number(),
  instruction: z.string(),
  updatedAt: z.string(),
  accountNumber: z.string().optional()
});

export const DeliveryMethodItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['Active', 'Inactive']),
  mode: z.string(),
  type: z.string(),
  minimumCharge: z.number(),
  maximumCharge: z.number(),
  deliveryCharge: z.number(),
  updatedAt: z.string()
});

export const PromoCardItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  badge: z.string().optional(),
  bgGradient: z.string().optional()
});

export const EcomSettingsSchema = z.object({
  storeName: z.string().optional(),
  storeLogo: z.string().optional(),
  storeFavicon: z.string().optional(),
  favicon: z.string().optional(),
  storeTagline: z.string().optional(),
  primaryColor: z.string().optional(),
  pixelId: z.string().optional(),
  gtmId: z.string().optional(),
  metaApiToken: z.string().optional(),
  steadfastApiKey: z.string().optional(),
  steadfastSecretKey: z.string().optional(),
  deliveryChargeInsideDhaka: z.number().default(60),
  deliveryChargeOutsideDhaka: z.number().default(110),
  bkashNumber: z.string().optional(),
  nagadNumber: z.string().optional(),
  paymentGateways: z.array(PaymentGatewayItemSchema).optional(),
  deliveryMethods: z.array(DeliveryMethodItemSchema).optional(),
  heroBanners: z.array(HeroBannerItemSchema).optional(),
  categories: z.array(z.string()).optional(),
  categoryItems: z.array(CategoryItemSchema).optional(),
  promoCards: z.array(PromoCardItemSchema).optional(),
  hotlinePhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  calloutBannerText: z.string().optional(),
  calloutBannerSubtext: z.string().optional(),
  showCalloutBanner: z.boolean().optional(),
  heroBannerLeftImage: z.string().optional(),
  heroBannerLeftLink: z.string().optional(),
  heroBannerRightImage: z.string().optional(),
  heroBannerRightLink: z.string().optional(),
  trustBadges: z.record(z.any()).optional()
}).passthrough();

export const BookOrderSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  customerName: z.string().min(1, 'Customer Name আবশ্যক'),
  phone: z.string().min(1, 'mobile number আবশ্যক'),
  address: z.string().min(1, 'address আবশ্যক'),
  district: z.string().optional(),
  thana: z.string().optional(),
  productTitle: z.string(),
  price: z.number(),
  deliveryCharge: z.number(),
  quantity: z.number().min(1),
  totalPrice: z.number(),
  paymentMethod: z.enum(['COD', 'bKash', 'Nagad']).optional(),
  trxId: z.string().optional(),
  senderPhone: z.string().optional(),
  orderType: z.enum(['landing', 'physical', 'store']),
  status: z.string(),
  createdAt: z.string(),
  notes: z.string().optional(),
  steadfastTrackingCode: z.string().optional(),
  steadfastStatus: z.string().optional(),
  couponCode: z.string().optional(),
  discountAmount: z.number().optional()
});

export const CouponSchema = z.object({
  id: z.string(),
  code: z.string().min(1, 'Coupon code আবশ্যক'),
  title: z.string().min(1, 'শিRoName is required'),
  discount: z.number().positive(),
  maxDiscount: z.number().optional(),
  minimumSpent: z.number().optional(),
  usageLimit: z.number().optional(),
  usageCount: z.number().default(0),
  endDate: z.string().optional(),
  type: z.enum(['fixed', 'percentage']),
  status: z.enum(['Active', 'Inactive']),
  visibility: z.enum(['Public', 'Private']),
  oncePerCustomer: z.boolean().optional(),
  description: z.string().optional(),
  updatedAt: z.string()
});

// Helper validation functions
export function validateProduct(data: unknown) {
  return ProductSchema.safeParse(data);
}

export function validateCategoryItem(data: unknown) {
  return CategoryItemSchema.safeParse(data);
}

export function validateEcomSettings(data: unknown) {
  return EcomSettingsSchema.safeParse(data);
}

export function validateBookOrder(data: unknown) {
  return BookOrderSchema.safeParse(data);
}

export function validateCoupon(data: unknown) {
  return CouponSchema.safeParse(data);
}
