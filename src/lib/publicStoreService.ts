import type { EcomSettings, InstituteInfo, Product, Brand, ContactMessage, LandingPageData } from '../types';
import { DEFAULT_BRANDS, DEFAULT_PRODUCTS, DEFAULT_ECOM_SETTINGS, DEFAULT_INSTITUTE_INFO } from './constants';

const memoryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

export function optimizeImageUrl(url?: string, width = 800): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.includes('images.unsplash.com')) {
    const base = trimmed.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=80`;
  }
  if (trimmed.startsWith('/uploads/')) {
    return `/cdn${trimmed}?w=${width}&format=webp&q=85`;
  }
  return trimmed;
}

export function getResponsiveImageProps(url?: string, baseWidth = 800) {
  if (!url) return { src: '' };
  const optimizedSrc = optimizeImageUrl(url, baseWidth);
  if (url.startsWith('/uploads/')) {
    const sm = `/cdn${url}?w=400&format=webp&q=80 400w`;
    const md = `/cdn${url}?w=800&format=webp&q=85 800w`;
    const lg = `/cdn${url}?w=1200&format=webp&q=85 1200w`;
    return {
      src: optimizedSrc,
      srcSet: `${sm}, ${md}, ${lg}`,
      sizes: '(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px'
    };
  }
  return { src: optimizedSrc };
}

export function readStorefrontCache<T>(key: string, fallback?: T): T | null {
  const mem = memoryCache.get(key);
  if (mem && (Date.now() - mem.timestamp < CACHE_TTL_MS)) {
    return mem.data as T;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, { data: parsed, timestamp: Date.now() });
      return parsed as T;
    }
  } catch {
    // quota/parse failure
  }
  return fallback !== undefined ? fallback : null;
}

function readCache<T>(key: string, fallback: T): T {
  return readStorefrontCache<T>(key, fallback) ?? fallback;
}

function writeCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota failure ignored
  }
}

export const publicStoreService = {
  async getProducts(): Promise<Product[]> {
    const cached = readCache<Product[]>('noor_ecom_products', DEFAULT_PRODUCTS);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          writeCache('noor_ecom_products', data);
          return data;
        }
      }
    } catch {
      // offline / fallback to cache
    }
    return cached || [];
  },

  async getEcomSettings(): Promise<EcomSettings> {
    const cached = readCache<EcomSettings>('noor_ecom_settings', DEFAULT_ECOM_SETTINGS);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const merged = { ...DEFAULT_ECOM_SETTINGS, ...data };
        writeCache('noor_ecom_settings', merged);
        return merged;
      }
    } catch {
      // fallback
    }
    return cached;
  },

  async getInstituteInfo(): Promise<InstituteInfo> {
    const cached = readCache<InstituteInfo>('noor_institute_info', DEFAULT_INSTITUTE_INFO);
    try {
      const res = await fetch('/api/institute');
      if (res.ok) {
        const data = await res.json();
        const merged = { ...DEFAULT_INSTITUTE_INFO, ...data };
        writeCache('noor_institute_info', merged);
        return merged;
      }
    } catch {
      // fallback
    }
    return cached;
  },

  async getBrands(): Promise<Brand[]> {
    const cached = readCache<Brand[]>('noor_brands', DEFAULT_BRANDS);
    try {
      const res = await fetch('/api/brands');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          writeCache('noor_brands', data);
          return data;
        }
      }
    } catch {
      // fallback
    }
    return cached;
  },

  async getLandingPageSettings(slugOrId?: string, productFallback?: Product): Promise<LandingPageData> {
    const cacheKey = `noor_lp_${slugOrId || productFallback?.slug || productFallback?.id || 'default'}`;
    const targetSlug = slugOrId || productFallback?.slug || productFallback?.id;
    if (targetSlug) {
      try {
        const res = await fetch(`/api/landing-pages/${targetSlug}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            writeCache(cacheKey, data);
            return data;
          }
        }
      } catch {
        // fallback
      }
    }
    const { DEFAULT_LANDING_PAGE_SETTINGS } = await import('./constants');
    return readCache<LandingPageData>(cacheKey, DEFAULT_LANDING_PAGE_SETTINGS as any);
  },

  async saveContactMessage(message: Partial<ContactMessage>): Promise<ContactMessage> {
    const msg: ContactMessage = {
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: message.name || '',
      email: message.email || '',
      phone: message.phone || '',
      message: message.message || '',
      createdAt: new Date().toISOString(),
      status: 'unread'
    };

    try {
      await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
    } catch {
      // fallback to local cache
    }

    try {
      const raw = localStorage.getItem('noor_contact_messages');
      const list: ContactMessage[] = raw ? JSON.parse(raw) : [];
      const updated = [msg, ...list.filter(m => m.id !== msg.id)];
      localStorage.setItem('noor_contact_messages', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('contact-messages-updated', { detail: updated }));
    } catch {
      // ignore
    }

    return msg;
  },

  async submitContactMessage(message: Partial<ContactMessage>): Promise<ContactMessage> {
    return this.saveContactMessage(message);
  }
};
