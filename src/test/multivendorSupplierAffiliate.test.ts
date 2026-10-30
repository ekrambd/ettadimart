import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../lib/dbService';
import { Supplier, Affiliate, Vendor } from '../types';

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  } as any;
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params?: { detail?: any }) {
      this.type = type;
      this.detail = params?.detail;
    }
  };
}

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
  } as any;
}

describe('SQA Test Suite - Multi-Vendor, Supplier & Affiliate Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Supplier Management Logic', () => {
    it('creates and retrieves a new supplier with complete procurement information', async () => {
      const mockSupplier: Supplier = {
        id: 'supp-sqa-1',
        name: 'Guangzhou Smart Factory Ltd',
        companyName: 'GZ Manufacturing Group',
        phone: '+86 138 0000 8888',
        email: 'procurement@gzfactory.cn',
        address: 'Baiyun District, Guangzhou, China',
        suppliedProducts: 'Smart lifestyle gadgets, ultrasonic cleaners',
        notes: 'Direct supplier with 30-day payment term',
        totalPurchasedAmount: 750000,
        status: 'active'
      };

      await dbService.saveSupplier(mockSupplier);
      const suppliers = await dbService.getSuppliers();
      const saved = suppliers.find(s => s.id === 'supp-sqa-1');

      expect(saved).toBeDefined();
      expect(saved?.name).toBe('Guangzhou Smart Factory Ltd');
      expect(saved?.totalPurchasedAmount).toBe(750000);
      expect(saved?.status).toBe('active');
    });

    it('deletes an existing supplier accurately', async () => {
      const testSupp: Supplier = {
        id: 'supp-to-delete',
        name: 'Temp Vendor',
        phone: '01700000000'
      };
      await dbService.saveSupplier(testSupp);
      let suppliers = await dbService.getSuppliers();
      expect(suppliers.some(s => s.id === 'supp-to-delete')).toBe(true);

      await dbService.deleteSupplier('supp-to-delete');
      suppliers = await dbService.getSuppliers();
      expect(suppliers.some(s => s.id === 'supp-to-delete')).toBe(false);
    });
  });

  describe('2. Affiliate Management Logic', () => {
    it('saves affiliate with commission calculations and referral code', async () => {
      const mockAffiliate: Affiliate = {
        id: 'aff-sqa-1',
        name: 'Tech Influencer BD',
        phone: '01711223344',
        email: 'partner@techbd.com',
        referralCode: 'TECHBD10',
        commissionRate: 10,
        commissionType: 'percentage',
        totalEarnings: 25000,
        totalWithdrawn: 15000,
        balance: 10000,
        totalOrdersCount: 45,
        status: 'active',
        payoutMethod: 'bKash Personal',
        payoutNumber: '01711223344'
      };

      await dbService.saveAffiliate(mockAffiliate);
      const affiliates = await dbService.getAffiliates();
      const saved = affiliates.find(a => a.id === 'aff-sqa-1');

      expect(saved).toBeDefined();
      expect(saved?.referralCode).toBe('TECHBD10');
      expect(saved?.commissionRate).toBe(10);
      expect(saved?.balance).toBe(10000);
    });
  });

  describe('3. Multi-Vendor Logic', () => {
    it('registers a vendor with slug, commission percentage and wallet', async () => {
      const mockVendor: Vendor = {
        id: 'vendor-sqa-1',
        storeName: 'Verified Merchant Flagship',
        slug: 'verified-merchant-flagship',
        ownerName: 'Flagship Operations',
        email: 'ops@merchantflagship.com',
        phone: '01899001122',
        commissionRate: 8.5,
        totalSales: 350000,
        totalOrders: 180,
        walletBalance: 45000,
        totalWithdrawn: 275000,
        status: 'active',
        payoutMethod: 'bKash Merchant',
        payoutAccount: '01899001122',
        rating: 4.95
      };

      await dbService.saveVendor(mockVendor);
      const vendors = await dbService.getVendors();
      const saved = vendors.find(v => v.id === 'vendor-sqa-1');

      expect(saved).toBeDefined();
      expect(saved?.storeName).toBe('Verified Merchant Flagship');
      expect(saved?.slug).toBe('verified-merchant-flagship');
      expect(saved?.commissionRate).toBe(8.5);
      expect(saved?.walletBalance).toBe(45000);
    });
  });
});
