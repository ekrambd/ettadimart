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
      const pm = (order.paymentMethod || '').trim().toLowerCase();
      const isCod = !pm || pm === 'cod' || pm.includes('cash');
      const isPrepaid = !isCod;
      const codAmount = isPrepaid ? 0 : Number(order.totalPrice || 0);

      const resData = await this.request('/create_order', {
        method: "POST",
        body: JSON.stringify({
          invoice: order.id,
          recipient_name: order.customerName,
          recipient_phone: order.phone,
          recipient_address: `${order.address}${order.district ? `, ${order.district}` : ''}`,
          cod_amount: codAmount,
          note: order.productTitle || 'Ecommerce Parcel'
        })
      });

      if (Number(resData.status) === 200 && (resData.consignment?.consignment_id || resData.consignment?.tracking_code)) {
        const trackingCode = String(resData.consignment.consignment_id || resData.consignment.tracking_code);
        return {
          success: true,
          trackingCode,
          message: "Parcel entry has been successfully made to Steadfast Courier!"
        };
      }

      throw new Error(resData.message || "Steadfast did not return a tracking code");
    } catch (error: any) {
      console.error("Steadfast API error:", error);
      throw new Error(error?.message || "Courier dispatch failed");
    }
  }

  static async getStatus(trackingCode: string) {
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(trackingCode)) throw new Error('Invalid Steadfast tracking code');
    const isNumeric = /^\d+$/.test(trackingCode);
    const endpoint = isNumeric ? `/status_by_cid/${encodeURIComponent(trackingCode)}` : `/status_by_trackingcode/${encodeURIComponent(trackingCode)}`;
    const data = await this.request(endpoint);
    if (Number(data.status) !== 200 || !data.delivery_status) throw new Error(data.message || 'Courier status unavailable');
    return { success: true, status: String(data.delivery_status) };
  }

  static async checkDeliveryRatio(phone: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Valid 11-digit phone number is required');
    }

    try {
      // Query Steadfast API fraud check / delivery ratio endpoint
      const endpoint = `/fraud_check/${encodeURIComponent(cleanPhone)}`;
      const data = await this.request(endpoint).catch(async () => {
        return await this.request(`/check_delivery_ratio`, {
          method: 'POST',
          body: JSON.stringify({ phone: cleanPhone })
        }).catch(() => null);
      });

      if (data && (data.total_parcels !== undefined || data.total_delivered !== undefined || data.delivery_ratio !== undefined || data.data)) {
        const payload = data.data || data;
        const totalParcels = Number(payload.total_parcels || payload.total_orders || payload.total || 0);
        const deliveredParcels = Number(payload.total_delivered || payload.delivered || 0);
        const returnedParcels = Number(payload.total_returned || payload.returned || payload.total_cancelled || 0);
        const cancelledParcels = Number(payload.total_cancelled || payload.cancelled || 0);
        const successRatio = totalParcels > 0 
          ? Number(payload.delivery_ratio || ((deliveredParcels / totalParcels) * 100).toFixed(1))
          : 0;

        return {
          success: true,
          phone: cleanPhone,
          totalParcels,
          deliveredParcels,
          returnedParcels,
          cancelledParcels,
          successRatio,
          source: 'steadfast'
        };
      }

      return {
        success: false,
        phone: cleanPhone,
        message: 'No external courier records found for this number'
      };
    } catch (err: any) {
      return {
        success: false,
        phone: cleanPhone,
        message: err.message || 'Steadfast fraud check failed'
      };
    }
  }
}
