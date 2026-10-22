import { ApiClient } from '../services/apiClient';
import { BookOrder } from '../types';

export interface CustomerCourierRatio {
  phone: string;
  totalParcels: number;
  deliveredParcels: number;
  returnedParcels: number;
  cancelledParcels: number;
  successRatio: number; // e.g. 92 (%)
  returnRatio: number;  // e.g. 8 (%)
  riskLevel: 'safe' | 'medium' | 'high' | 'new';
  riskLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  storeOrdersCount: number;
  storeDeliveredCount: number;
  storeCancelledCount: number;
  source: 'steadfast' | 'internal' | 'combined';
  recommendation: string;
  summaryText: string;
}

const memoryRatioCache = new Map<string, { data: CustomerCourierRatio; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

export function cleanPhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return digits.substring(2);
  }
  return digits;
}

export async function checkCustomerCourierRatio(
  rawPhone: string,
  allStoreOrders: BookOrder[] = []
): Promise<CustomerCourierRatio> {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone || phone.length < 10) {
    return {
      phone: rawPhone,
      totalParcels: 0,
      deliveredParcels: 0,
      returnedParcels: 0,
      cancelledParcels: 0,
      successRatio: 100,
      returnRatio: 0,
      riskLevel: 'new',
      riskLabel: 'নতুন নম্বর',
      badgeBg: 'bg-slate-100',
      badgeBorder: 'border-slate-200',
      badgeText: 'text-slate-700',
      storeOrdersCount: 0,
      storeDeliveredCount: 0,
      storeCancelledCount: 0,
      source: 'internal',
      recommendation: 'customerের সঠিক mobile number নিশ্চিত করুন।',
      summaryText: 'নম্বর সঠিক নয় বা কোনো হিস্ট্রি পাওয়া যায়নি।'
    };
  }

  // Check cache
  const cached = memoryRatioCache.get(phone);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  // 1. Calculate internal store order performance
  const matchedOrders = allStoreOrders.filter(o => cleanPhoneNumber(o.phone) === phone);
  const storeOrdersCount = matchedOrders.length;
  const storeDeliveredCount = matchedOrders.filter(o => 
    o.status === 'Delivered' || (o.status as string) === 'delivered'
  ).length;
  const storeCancelledCount = matchedOrders.filter(o => 
    o.status === 'Cancelled' || o.status === 'Returned' || (o.status as string) === 'cancelled'
  ).length;

  let extTotal = 0;
  let extDelivered = 0;
  let extReturned = 0;
  let extCancelled = 0;
  let source: 'steadfast' | 'internal' | 'combined' = 'internal';

  // 2. Fetch Steadfast Courier Central Fraud / Delivery History
  try {
    const extRes = await ApiClient.checkSteadfastFraud(phone);
    if (extRes && extRes.success) {
      extTotal = Number(extRes.totalParcels || 0);
      extDelivered = Number(extRes.deliveredParcels || 0);
      extReturned = Number(extRes.returnedParcels || 0);
      extCancelled = Number(extRes.cancelledParcels || 0);
      source = storeOrdersCount > 0 ? 'combined' : 'steadfast';
    }
  } catch (err) {
    // Graceful fallback to internal store history
  }

  // 3. Combine metrics intelligently
  const totalParcels = Math.max(extTotal, storeOrdersCount);
  const deliveredParcels = Math.max(extDelivered, storeDeliveredCount);
  const returnedParcels = Math.max(extReturned, storeCancelledCount);
  const cancelledParcels = Math.max(extCancelled, storeCancelledCount);

  let successRatio = 100;
  let returnRatio = 0;

  if (totalParcels > 0) {
    successRatio = Math.min(100, Math.max(0, Math.round((deliveredParcels / totalParcels) * 100)));
    returnRatio = Math.min(100, Math.max(0, Math.round((returnedParcels / totalParcels) * 100)));
  }

  // 4. Determine Risk Level & Localized Guidance
  let riskLevel: 'safe' | 'medium' | 'high' | 'new' = 'new';
  let riskLabel = 'নতুন customer';
  let badgeBg = 'bg-sky-50';
  let badgeBorder = 'border-sky-200';
  let badgeText = 'text-sky-700';
  let recommendation = 'নতুন customer — পার্সেল পাঠানোর আগে ফোনে address নিশ্চিত করুন।';

  if (totalParcels === 0) {
    riskLevel = 'new';
    riskLabel = 'নতুন customer (১ম অর্ডার)';
    badgeBg = 'bg-slate-100';
    badgeBorder = 'border-slate-300';
    badgeText = 'text-slate-700';
    recommendation = 'পূর্বে কোনো পার্সেল হিস্ট্রি নেই। ফোনে অর্ডার কনফার্ম করে পার্সেল বুকিং করুন।';
  } else if (successRatio >= 85) {
    riskLevel = 'safe';
    riskLabel = `${successRatio}% সাকসেস (নিরাপদ)`;
    badgeBg = 'bg-emerald-50';
    badgeBorder = 'border-emerald-300';
    badgeText = 'text-emerald-800';
    recommendation = '✅ বিশ্বস্ত ও নিরাপদ customer — দ্রুত Cash on deliveryতে পার্সেল পাঠাতে পারেন।';
  } else if (successRatio >= 65) {
    riskLevel = 'medium';
    riskLabel = `${successRatio}% সাকসেস (মাঝারি ঝুঁকি)`;
    badgeBg = 'bg-amber-50';
    badgeBorder = 'border-amber-300';
    badgeText = 'text-amber-800';
    recommendation = '⚠️ মাঝারি ঝুঁকির customer — customerের সাথে ফোনে কথা বলে ডেলিভারি কনফার্ম করুন।';
  } else {
    riskLevel = 'high';
    riskLabel = `${successRatio}% সাকসেস (উচ্চ return ঝুঁকি)`;
    badgeBg = 'bg-rose-50';
    badgeBorder = 'border-rose-300';
    badgeText = 'text-rose-800';
    recommendation = '🚫 উচ্চ return প্রবণ customer! পার্সেল পাঠানোর আগে অন্তত Delivery charges অগ্রিম নিন।';
  }

  const result: CustomerCourierRatio = {
    phone,
    totalParcels,
    deliveredParcels,
    returnedParcels,
    cancelledParcels,
    successRatio,
    returnRatio,
    riskLevel,
    riskLabel,
    badgeBg,
    badgeBorder,
    badgeText,
    storeOrdersCount,
    storeDeliveredCount,
    storeCancelledCount,
    source,
    recommendation,
    summaryText: totalParcels > 0
      ? `মোট ${totalParcels}T পার্সেলের মধ্যে ${deliveredParcels}T Successful delivery হয়েছে (${successRatio}% সাকসেস রেট)।`
      : 'কুরিয়ার সিস্টেমে এই নম্বরের পূর্ববর্তী কোনো রেকর্ড পাওয়া যায়নি।'
  };

  memoryRatioCache.set(phone, { data: result, timestamp: Date.now() });
  return result;
}
