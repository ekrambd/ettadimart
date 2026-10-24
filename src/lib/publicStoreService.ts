import type { EcomSettings, InstituteInfo, Product, Brand, ContactMessage, LandingPageData } from '../types';

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

export const publicStoreService = {
  // Direct live fetch from DB API - No local cache, no seed data
  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.warn('Failed to fetch products from /api/products:', e);
    }
    return [];
  },

  async getEcomSettings(): Promise<EcomSettings> {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        return data || { storeName: 'ETTADI MART' };
      }
    } catch (e) {
      console.warn('Failed to fetch settings from /api/settings:', e);
    }
    return { storeName: 'ETTADI MART' };
  },

  async getInstituteInfo(): Promise<InstituteInfo | null> {
    try {
      const res = await fetch('/api/institute');
      if (res.ok) {
        const data = await res.json();
        return data || null;
      }
    } catch (e) {
      console.warn('Failed to fetch institute from /api/institute:', e);
    }
    return null;
  },

  async getBrands(): Promise<Brand[]> {
    try {
      const res = await fetch('/api/brands');
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch {
      // ignore
    }
    return [];
  },

  async getLandingPageBySlug(slug: string): Promise<LandingPageData | null> {
    const targetSlug = slug.trim().toLowerCase();
    if (!targetSlug) return null;
    try {
      const res = await fetch(`/api/landing-pages/${targetSlug}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  },

  async getLandingPageSettings(slugOrId?: string, _productFallback?: Product): Promise<LandingPageData | null> {
    if (slugOrId) {
      const lp = await this.getLandingPageBySlug(slugOrId);
      if (lp) return lp;
    }
    return null;
  },

  async submitContactMessage(msg: { name: string; email: string; phone?: string; subject?: string; message: string }): Promise<boolean> {
    try {
      const res = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
};
