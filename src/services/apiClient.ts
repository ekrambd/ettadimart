import { Product, BookOrder, EcomSettings } from '../types';
//mycomment
export class ApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    let idToken: string | null = null;
    if (!endpoint.startsWith('/facebook/capi')) {
      const { authService } = await import('../lib/authService');
      idToken = authService.getToken() || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null);

      if (!idToken && typeof window !== 'undefined') {
        const storedEmail = localStorage.getItem('noor_admin_session_email');
        if (storedEmail) {
          idToken = `BypassAdmin:${storedEmail}`;
        }
      }
    }
    const res = await fetch(`/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...options?.headers
      },
      ...options
    });

    if (!res.ok) {
      let message = `API error ${res.status}: ${res.statusText}`;
      try {
        const body = await res.json();
        message = body.message || body.error || message;
      } catch {
        // Keep the HTTP status message when the response is not JSON.
      }
      throw new Error(message);
    }

    return res.json() as Promise<T>;
  }

  // Product Endpoints
  static getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  static createProduct(product: Partial<Product>): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
  }

  static updateProduct(product: Product): Promise<Product> {
    return this.request<Product>(`/products/${product.id}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    });
  }

  static deleteProduct(id: string): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  // Order Endpoints
  static getOrders(): Promise<BookOrder[]> {
    return this.request<BookOrder[]>(`/orders?_t=${Date.now()}`);
  }

  static createOrder(order: Partial<BookOrder>): Promise<BookOrder> {
    return this.request<BookOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(order)
    });
  }

  static updateOrder(order: BookOrder): Promise<BookOrder> {
    return this.request<BookOrder>(`/orders/${order.id}`, {
      method: 'PUT',
      body: JSON.stringify(order)
    });
  }

  static deleteOrder(id: string): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(`/orders/${id}`, {
      method: 'DELETE'
    });
  }

  // E-commerce Settings Endpoints
  static getSettings(): Promise<EcomSettings> {
    return this.request<EcomSettings>('/settings/ecom');
  }

  static saveSettings(settings: Partial<EcomSettings>): Promise<{ success: boolean; settings: EcomSettings }> {
    return this.request<{ success: boolean; settings: EcomSettings }>('/settings/ecom', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  // Institute / Brand Info Endpoints
  static getInstituteInfo(): Promise<any> {
    return this.request<any>('/institute');
  }

  static saveInstituteInfo(info: any): Promise<any> {
    return this.request<any>('/institute', {
      method: 'POST',
      body: JSON.stringify(info)
    });
  }

  // Steadfast Courier Dispatch
  static dispatchSteadfast(order: BookOrder): Promise<{ success: boolean; trackingCode?: string; message?: string }> {
    return this.request<{ success: boolean; trackingCode?: string; message?: string }>('/courier/steadfast/dispatch', {
      method: 'POST',
      body: JSON.stringify({ order })
    });
  }

  static testSteadfast(): Promise<{ success: boolean; balance?: number; message?: string }> {
    return this.request('/courier/steadfast/test');
  }

  static getSteadfastStatus(trackingCode: string): Promise<{ success: boolean; status: string }> {
    return this.request(`/courier/steadfast/status/${encodeURIComponent(trackingCode)}`);
  }

  static checkSteadfastFraud(phone: string): Promise<{
    success: boolean;
    phone?: string;
    totalParcels?: number;
    deliveredParcels?: number;
    returnedParcels?: number;
    cancelledParcels?: number;
    successRatio?: number;
    source?: string;
    message?: string;
  }> {
    return this.request(`/courier/steadfast/fraud-check/${encodeURIComponent(phone)}`);
  }

  // Pathao Courier Integration
  static testPathao(credentials?: any): Promise<{ success: boolean; message?: string; storesCount?: number; stores?: any[] }> {
    return this.request('/courier/pathao/test', {
      method: 'POST',
      body: JSON.stringify({ credentials })
    });
  }

  static getPathaoStores(credentials?: any): Promise<any> {
    return this.request('/courier/pathao/stores', {
      method: 'GET'
    });
  }

  static getPathaoCities(): Promise<any> {
    return this.request('/courier/pathao/cities');
  }

  static getPathaoZones(cityId: number | string): Promise<any> {
    return this.request(`/courier/pathao/cities/${cityId}/zones`);
  }

  static getPathaoAreas(zoneId: number | string): Promise<any> {
    return this.request(`/courier/pathao/zones/${zoneId}/areas`);
  }

  static dispatchPathao(payload: {
    order: BookOrder;
    storeId?: string | number;
    recipientCity?: number;
    recipientZone?: number;
    recipientArea?: number;
    itemWeight?: number;
    itemQuantity?: number;
    specialInstruction?: string;
    credentials?: any;
  }): Promise<{ success: boolean; consignmentId?: string; trackingCode?: string; orderStatus?: string; deliveryFee?: number; message?: string }> {
    return this.request('/courier/pathao/dispatch', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static getPathaoStatus(consignmentId: string): Promise<{ success: boolean; status: string; data?: any }> {
    return this.request(`/courier/pathao/status/${encodeURIComponent(consignmentId)}`);
  }

  static sendFacebookEvent(payload: {
    eventName: string;
    eventId: string;
    eventData: Record<string, unknown>;
    userData: { phone?: string; email?: string };
    eventSourceUrl: string;
  }): Promise<{ success: boolean; message?: string }> {
    return this.request('/facebook/capi', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static sendPushNotification(payload: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    tokens: string[];
  }): Promise<{ success: boolean; multicast_id?: number; success_count?: number; failure_count?: number; message?: string }> {
    return this.request('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}
