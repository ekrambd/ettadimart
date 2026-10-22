export interface PathaoCredentials {
  clientId?: string;
  clientSecret?: string;
  clientEmail?: string;
  clientPassword?: string;
  storeId?: string | number;
  environment?: 'sandbox' | 'production';
  baseUrl?: string;
}

export interface PathaoDispatchParams {
  order: {
    id: string;
    customerName: string;
    phone: string;
    address: string;
    district?: string;
    thana?: string;
    totalPrice: number;
    status?: string;
    productTitle?: string;
    paymentMethod?: string;
    pathaoConsignmentId?: string;
  };
  storeId?: string | number;
  recipientCity?: number;
  recipientZone?: number;
  recipientArea?: number;
  itemWeight?: number;
  itemQuantity?: number;
  specialInstruction?: string;
  credentials?: PathaoCredentials;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

export class PathaoCourierService {
  private static getResolvedConfig(customCreds?: PathaoCredentials) {
    const isSandbox = customCreds?.environment === 'sandbox' || process.env.PATHAO_ENVIRONMENT === 'sandbox';
    const defaultBaseUrl = isSandbox 
      ? 'https://courier-api-sandbox.pathao.com' 
      : 'https://api-hermes.pathao.com';

    const clientId = customCreds?.clientId || process.env.PATHAO_CLIENT_ID || (isSandbox ? '7N1aMJQbWm' : '');
    const clientSecret = customCreds?.clientSecret || process.env.PATHAO_CLIENT_SECRET || (isSandbox ? 'wRcaibZkUdSNz2EI9ZyuXLINrnAv0TDPUXMnD39' : '');
    const clientEmail = customCreds?.clientEmail || process.env.PATHAO_CLIENT_EMAIL || (isSandbox ? 'test@pathao.com' : '');
    const clientPassword = customCreds?.clientPassword || process.env.PATHAO_CLIENT_PASSWORD || (isSandbox ? 'lovePathao' : '');
    const storeId = customCreds?.storeId || process.env.PATHAO_STORE_ID;
    const baseUrl = (customCreds?.baseUrl || process.env.PATHAO_BASE_URL || defaultBaseUrl).replace(/\/$/, '');

    if (!clientId || !clientSecret || !clientEmail || !clientPassword) {
      throw new Error('Pathao API credentials (client_id, client_secret, client_email, client_password) are required.');
    }

    return { clientId, clientSecret, clientEmail, clientPassword, storeId, baseUrl };
  }

  static async getAccessToken(customCreds?: PathaoCredentials): Promise<string> {
    const { clientId, clientSecret, clientEmail, clientPassword, baseUrl } = this.getResolvedConfig(customCreds);
    const cacheKey = `${baseUrl}_${clientId}_${clientEmail}`;

    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.token;
    }

    const res = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        username: clientEmail,
        password: clientPassword,
        grant_type: 'password'
      }),
      signal: AbortSignal.timeout(15000)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      const errMsg = data.message || data.error_description || `Failed to authenticate with Pathao API (HTTP ${res.status})`;
      throw new Error(errMsg);
    }

    const expiresInMs = (Number(data.expires_in) || 3600) * 1000;
    tokenCache.set(cacheKey, {
      token: data.access_token,
      expiresAt: Date.now() + expiresInMs
    });

    return data.access_token;
  }

  private static async authorizedRequest(path: string, customCreds?: PathaoCredentials, init?: RequestInit) {
    const { baseUrl } = this.getResolvedConfig(customCreds);
    const token = await this.getAccessToken(customCreds);

    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...init?.headers
      },
      signal: AbortSignal.timeout(15000)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.message || (data.errors ? JSON.stringify(data.errors) : `Pathao returned HTTP ${res.status}`);
      throw new Error(errorMsg);
    }
    return data;
  }

  static async testConnection(customCreds?: PathaoCredentials) {
    try {
      const token = await this.getAccessToken(customCreds);
      let stores: any[] = [];
      try {
        const storeRes = await this.getStores(customCreds);
        stores = storeRes.data?.data || storeRes.data || [];
      } catch (e) {
        console.warn('Could not fetch store list during test:', e);
      }

      return {
        success: true,
        message: 'Pathao API connection verified successfully!',
        tokenObtained: Boolean(token),
        storesCount: stores.length,
        stores
      };
    } catch (err: any) {
      throw new Error(err?.message || 'Pathao authentication failed');
    }
  }

  static async getStores(customCreds?: PathaoCredentials) {
    return this.authorizedRequest('/aladdin/api/v1/stores', customCreds);
  }

  static async getCities(customCreds?: PathaoCredentials) {
    return this.authorizedRequest('/aladdin/api/v1/city-list', customCreds);
  }

  static async getZones(cityId: number | string, customCreds?: PathaoCredentials) {
    return this.authorizedRequest(`/aladdin/api/v1/cities/${cityId}/zone-list`, customCreds);
  }

  static async getAreas(zoneId: number | string, customCreds?: PathaoCredentials) {
    return this.authorizedRequest(`/aladdin/api/v1/zones/${zoneId}/area-list`, customCreds);
  }

  static async dispatchOrder(params: PathaoDispatchParams) {
    const { order, credentials } = params;
    if (!order?.id || !order.customerName || !order.phone || !order.address) {
      throw new Error('Order ID, Customer Name, Phone, and Address are required for Pathao delivery.');
    }
    if (order.pathaoConsignmentId) {
      throw new Error('This order already has a Pathao Consignment ID.');
    }

    const { storeId: defaultStoreId } = this.getResolvedConfig(credentials);
    let resolvedStoreId = Number(params.storeId || defaultStoreId);
    
    if (!resolvedStoreId) {
      try {
        const storeRes = await this.getStores(credentials);
        const stores = storeRes.data?.data || storeRes.data || [];
        if (stores.length > 0) {
          resolvedStoreId = Number(stores[0].store_id);
        }
      } catch (e) {
        console.warn('Could not auto-fetch store list:', e);
      }
    }

    if (!resolvedStoreId) {
      throw new Error('Store ID is required for Pathao parcel dispatch. Please configure store_id in Pathao settings or ensure your Pathao account has at least one store created.');
    }

    const pm = (order.paymentMethod || '').trim().toLowerCase();
    const isCod = !pm || pm === 'cod' || pm.includes('cash');
    const isPrepaid = !isCod;
    const amountToCollect = isPrepaid ? 0 : Number(order.totalPrice || 0);

    // Prepare phone number (standardize to 11 digits)
    let cleanPhone = order.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('880') && cleanPhone.length === 13) {
      cleanPhone = cleanPhone.slice(2);
    }

    const payload = {
      store_id: resolvedStoreId,
      merchant_order_id: order.id,
      recipient_name: order.customerName,
      recipient_phone: cleanPhone,
      recipient_address: `${order.address}${order.thana ? `, ${order.thana}` : ''}${order.district ? `, ${order.district}` : ''}`,
      recipient_city: params.recipientCity || 1, // Default Dhaka=1 if not specified
      recipient_zone: params.recipientZone || 1, // Default Zone=1 if not specified
      recipient_area: params.recipientArea || undefined,
      delivery_type: 48, // 48: Normal Delivery (Standard)
      item_type: 2, // 1: Document, 2: Parcel
      special_instruction: params.specialInstruction || order.productTitle || 'Handle with care',
      item_quantity: params.itemQuantity || 1,
      item_weight: params.itemWeight || 0.5,
      amount_to_collect: amountToCollect,
      item_description: order.productTitle || 'ইকমার্স পার্সেল'
    };

    const resData = await this.authorizedRequest('/aladdin/api/v1/orders', credentials, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const consignmentData = resData.data || resData;
    const consignmentId = consignmentData.consignment_id;
    const trackingCode = consignmentData.consignment_id || consignmentData.tracking_code || consignmentData.merchant_order_id;
    const orderStatus = consignmentData.order_status || 'Pending';
    const deliveryFee = consignmentData.delivery_fee || 0;

    if (consignmentId) {
      return {
        success: true,
        consignmentId,
        trackingCode,
        orderStatus,
        deliveryFee,
        message: 'send courierে successfulভাবে পার্সেল বুকিং করা হয়েছে!'
      };
    }

    throw new Error(resData.message || 'Pathao did not return a consignment ID.');
  }

  static async getStatus(consignmentId: string, customCreds?: PathaoCredentials) {
    if (!consignmentId || !/^[A-Za-z0-9_-]{3,80}$/.test(consignmentId)) {
      throw new Error('Invalid Pathao Consignment ID');
    }

    const resData = await this.authorizedRequest(`/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`, customCreds);
    const data = resData.data || resData;
    const orderStatus = data.order_status || data.status || 'Unknown';

    return {
      success: true,
      status: orderStatus,
      data
    };
  }
}
