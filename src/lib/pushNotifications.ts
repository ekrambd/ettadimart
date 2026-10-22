/**
 * Web Push Notification Handler
 * Standalone notification helper without Firebase client dependencies.
 */
export async function requestNotificationPermission(_phone?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return 'granted';
    }
  } catch (error) {
    console.warn('Notification permission request:', error);
  }
  return null;
}

export function showDesktopOrderNotification(order: { id: string; customerName?: string; totalAmount?: number; totalPrice?: number; productTitle?: string; productName?: string }): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const title = '🎉 নতুন অর্ডার এসেছে!';
      const amount = order.totalAmount ?? order.totalPrice ?? 0;
      const body = `${order.id} · ${order.customerName || 'গ্রাহক'} · Tk. ${amount.toLocaleString('bn-BD')}\nপণ্য: ${order.productTitle || order.productName || 'অর্ডার'}`;
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: order.id
      });
    } catch {}
  }
}

