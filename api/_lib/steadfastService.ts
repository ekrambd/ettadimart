export interface DispatchParams {
  order: {
    id: string;
    customerName: string;
    phone: string;
    address: string;
    district?: string;
    totalPrice: number;
    status: string;
    productTitle?: string;
    paymentMethod?: string;
    steadfastTrackingCode?: string;
  };
}

export class SteadfastCourierService {
  private static getConfig() {
    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;
    const baseUrl = (process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1').replace(/\/$/, '');
    if (!apiKey || !secretKey) throw new Error('Steadfast credentials are not configured on the server');
    return { apiKey, secretKey, baseUrl };
  }

  private static async request(path: string, init?: RequestInit) {
    const { apiKey, secretKey, baseUrl } = this.getConfig();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        ...init?.headers
      },
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || (data.status && Number(data.status) >= 400)) {
      throw new Error(data.message || `Steadfast returned HTTP ${response.status}`);
    }
    return data;
  }

  static async testConnection() {
    const data = await this.request('/get_balance');
    if (Number(data.status) !== 200) throw new Error(data.message || 'Steadfast credentials were rejected');
    return { success: true, balance: Number(data.current_balance || 0), message: 'Steadfast API connection verified' };
  }

  static async dispatchOrder(params: DispatchParams) {
    const { order } = params;
    if (!order?.id || !order.customerName || !order.phone || !order.address) {
      throw new Error('Order name, phone, address, and invoice are required');
    }
    if (order.steadfastTrackingCode) throw new Error('This order already has a Steadfast tracking code');

    try {
      const isPrepaid = order.paymentMethod && order.paymentMethod !== 'COD';
      const codAmount = isPrepaid ? 0 : order.totalPrice;

      const resData = await this.request('/create_order', {
        method: 'POST',
        body: JSON.stringify({
          invoice: order.id,
          recipient_name: order.customerName,
          recipient_phone: order.phone,
          recipient_address: `${order.address}${order.district ? `, ${order.district}` : ''}`,
          cod_amount: codAmount,
          note: order.productTitle || 'নূর সার্ভে ইকমার্স পার্সেল'
        })
      });

      if (Number(resData.status) === 200 && resData.consignment?.tracking_code) {
        const trackingCode = String(resData.consignment.tracking_code);
        return {
          success: true,
          trackingCode,
          message: 'স্টিডফাস্ট কুরিয়ারে সফলভাবে পার্সেল এন্ট্রি করা হয়েছে!'
        };
      }

      throw new Error(resData.message || 'Steadfast did not return a tracking code');
    } catch (error: any) {
      console.error('Steadfast API error:', error);
      throw new Error(error?.message || 'Courier dispatch failed');
    }
  }

  static async getStatus(trackingCode: string) {
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(trackingCode)) throw new Error('Invalid Steadfast tracking code');
    const data = await this.request(`/status_by_trackingcode/${encodeURIComponent(trackingCode)}`);
    if (Number(data.status) !== 200 || !data.delivery_status) throw new Error(data.message || 'Courier status unavailable');
    return { success: true, status: String(data.delivery_status) };
  }
}
