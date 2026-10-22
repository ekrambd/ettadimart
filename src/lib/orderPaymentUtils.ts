import { BookOrder } from '../types';

/**
 * Checks if an order's payment method represents Cash on Delivery (COD).
 */
export function isOrderCod(paymentMethod?: string | null): boolean {
  if (!paymentMethod) return true; // Default in BD e-commerce is COD
  const normalized = paymentMethod.trim().toLowerCase();
  return (
    normalized === 'cod' ||
    normalized === 'cash' ||
    normalized === 'cash on delivery' ||
    normalized === 'cash_on_delivery' ||
    normalized === 'cash in delivery' ||
    normalized.includes('cash')
  );
}

/**
 * Checks whether an order is considered paid.
 *
 * Rules:
 * 1. If explicit paymentStatus is 'paid', returns true.
 * 2. If explicit paymentStatus is 'unpaid' or 'due', returns false.
 * 3. For Cash on Delivery (COD) orders:
 *    - The customer has NOT paid yet while the order is Pending, Confirmed, Packaging, Ready for Shipment, Shipped, etc.
 *    - It ONLY becomes paid when actually delivered (status === 'Delivered' or courier status === 'delivered').
 * 4. For Prepaid / Digital payments (bKash, Nagad, Rocket, Card, Online, etc.):
 *    - Considered paid if trxId is present or it's a confirmed prepaid payment.
 */
export function isOrderPaid(order?: {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  status?: string | null;
  steadfastStatus?: string | null;
  pathaoStatus?: string | null;
  trxId?: string | null;
} | null): boolean {
  if (!order) return false;

  const rawPaymentStatus = (order.paymentStatus || '').trim().toLowerCase();
  if (rawPaymentStatus === 'paid') return true;
  if (rawPaymentStatus === 'unpaid' || rawPaymentStatus === 'due' || rawPaymentStatus === 'pending') return false;

  const isCod = isOrderCod(order.paymentMethod);

  if (isCod) {
    const st = (order.status || '').trim().toLowerCase();
    const sf = (order.steadfastStatus || '').trim().toLowerCase();
    const pt = (order.pathaoStatus || '').trim().toLowerCase();
    
    // For COD, only 'Delivered' means the cash has been collected from customer
    return st === 'delivered' || sf === 'delivered' || pt === 'delivered';
  }

  // Non-COD / Prepaid (bKash, Nagad, etc.)
  const pm = (order.paymentMethod || '').trim().toLowerCase();
  const isPrepaidMethod =
    pm.includes('bkash') ||
    pm.includes('nagad') ||
    pm.includes('rocket') ||
    pm.includes('prepaid') ||
    pm.includes('card') ||
    pm.includes('online');

  if (isPrepaidMethod) {
    const st = (order.status || '').trim().toLowerCase();
    if (st === 'cancelled' || st === 'return' || st === 'returned') return false;
    return true;
  }

  return false;
}
