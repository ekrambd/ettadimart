import { DeliveryMethodItem, EcomSettings } from '../types';

export interface CartItemLike {
  product: {
    id?: string;
    title?: string;
    weight?: number;
    price?: number;
    deliveryChargeEnabled?: boolean;
    freeDelivery?: boolean;
    isFreeDelivery?: boolean;
  };
  variant?: {
    id?: string;
    name?: string;
    weight?: number;
    price?: number;
  } | null;
  quantity: number;
}

export interface DeliveryCalculationResult {
  baseWeightKg: number;
  totalWeightKg: number;
  extraWeightKg: number;
  extraPerKgRate: number;
  baseCharge: number;
  extraCharge: number;
  totalCharge: number;
  isWeightBased: boolean;
  isFreeDelivery: boolean;
  weightBreakdownText?: string;
}

/**
 * Calculates delivery fee based on total package weight, base allowance, and per-kg surcharge.
 * Matches standard courier policies in Bangladesh (Steadfast, Pathao, RedX).
 */
export function calculateDeliveryCharge({
  items,
  method,
  settings,
  isFreeDelivery = false
}: {
  items: CartItemLike[];
  method?: DeliveryMethodItem | null;
  settings?: EcomSettings | null;
  isFreeDelivery?: boolean;
}): DeliveryCalculationResult {
  if (isFreeDelivery) {
    return {
      baseWeightKg: 1,
      totalWeightKg: 0,
      extraWeightKg: 0,
      extraPerKgRate: 0,
      baseCharge: 0,
      extraCharge: 0,
      totalCharge: 0,
      isWeightBased: false,
      isFreeDelivery: true,
      weightBreakdownText: 'ফ্রি ডেলিভারি'
    };
  }

  const defaultItemWeight = Number(settings?.defaultProductWeightKg) > 0 ? Number(settings?.defaultProductWeightKg) : 0.5;
  
  // Calculate total package weight
  const totalWeightKg = items.reduce((acc, item) => {
    const rawWeight = (typeof item.variant?.weight === 'number' && item.variant.weight > 0)
      ? item.variant.weight
      : (typeof item.product?.weight === 'number' && item.product.weight > 0)
        ? item.product.weight
        : defaultItemWeight;
    return acc + (rawWeight * Math.max(1, item.quantity));
  }, 0);

  const roundedTotalWeight = Math.round(totalWeightKg * 100) / 100;
  const baseCharge = Number(method?.deliveryCharge) >= 0 ? Number(method?.deliveryCharge) : 60;
  
  const isWeightBased = Boolean(
    method?.mode === 'Weight based' || 
    (settings?.weightBasedDeliveryEnabled && method?.mode !== 'Fixed')
  );

  if (!isWeightBased) {
    return {
      baseWeightKg: 1,
      totalWeightKg: roundedTotalWeight,
      extraWeightKg: 0,
      extraPerKgRate: 0,
      baseCharge,
      extraCharge: 0,
      totalCharge: baseCharge,
      isWeightBased: false,
      isFreeDelivery: false,
      weightBreakdownText: roundedTotalWeight > 0 ? `মোট ওজন: ${roundedTotalWeight} কেজি` : undefined
    };
  }

  const baseWeightKg = Number(method?.baseWeightKg) > 0 
    ? Number(method?.baseWeightKg) 
    : (Number(settings?.defaultBaseWeightKg) > 0 ? Number(settings?.defaultBaseWeightKg) : 1);

  // Extra weight rounded up to nearest integer kg (standard courier practice)
  const extraWeightKg = roundedTotalWeight > baseWeightKg 
    ? Math.ceil(roundedTotalWeight - baseWeightKg) 
    : 0;

  const isInsideDhaka = method?.title 
    ? (method.title.toLowerCase().includes('inside') || method.title.includes('ভেতরে') || method.title.toLowerCase().includes('dhaka'))
    : true;

  const fallbackExtraRate = isInsideDhaka
    ? (Number(settings?.defaultExtraPerKgInsideDhaka) > 0 ? Number(settings?.defaultExtraPerKgInsideDhaka) : 20)
    : (Number(settings?.defaultExtraPerKgOutsideDhaka) > 0 ? Number(settings?.defaultExtraPerKgOutsideDhaka) : 25);

  const extraPerKgRate = Number(method?.extraPerKgCharge) >= 0 
    ? Number(method?.extraPerKgCharge) 
    : fallbackExtraRate;

  const extraCharge = extraWeightKg * extraPerKgRate;
  const totalCharge = baseCharge + extraCharge;

  const weightBreakdownText = extraWeightKg > 0 
    ? `বেস ৳${baseCharge} (${baseWeightKg} কেজি) + অতিরিক্ত ${extraWeightKg} কেজি ৳${extraCharge}`
    : `মোট ওজন: ${roundedTotalWeight} কেজি (বেস ${baseWeightKg} কেজি এর ভেতর)`;

  return {
    baseWeightKg,
    totalWeightKg: roundedTotalWeight,
    extraWeightKg,
    extraPerKgRate,
    baseCharge,
    extraCharge,
    totalCharge,
    isWeightBased: true,
    isFreeDelivery: false,
    weightBreakdownText
  };
}
