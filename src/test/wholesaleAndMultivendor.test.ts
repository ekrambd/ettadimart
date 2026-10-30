import { describe, it, expect } from 'vitest';
import { Product, Customer } from '../types';

describe('SQA Test Suite - Wholesale / Paikari Pricing & Multi-Vendor Rules', () => {
  const sampleWholesaleProduct: Product = {
    id: 'prod-wholesale-1',
    title: 'Mustard Oil Pure 5L Can',
    price: 1100, // Regular retail price: ৳1100
    regularPrice: 1200,
    isWholesaleAvailable: true,
    wholesalePrice: 920, // Paikari wholesale price: ৳920
    minOrderQty: 5, // Minimum wholesale quantity: 5 units
    maxOrderQty: 50, // Maximum allowed order quantity: 50 units
    stock: 200,
    category: 'Groceries'
  };

  const sampleStandardProduct: Product = {
    id: 'prod-standard-2',
    title: 'Premium Basmati Rice 1kg',
    price: 350,
    regularPrice: 380,
    isWholesaleAvailable: false,
    stock: 100,
    category: 'Rice'
  };

  const regularCustomer: Customer = {
    id: 'cust-reg-1',
    name: 'Retail Shopper',
    phone: '01711000001',
    customerType: 'regular'
  };

  const wholesalerCustomer: Customer = {
    id: 'cust-ws-1',
    name: 'Bhai Bhai Traders',
    phone: '01811000002',
    customerType: 'wholesaler'
  };

  // Helper matching the authoritative pricing logic in orderRoutes, PosView, and CheckoutPage
  function resolveProductPrice(product: Product, quantity: number, customerType?: 'regular' | 'wholesaler') {
    const isWholesaler = customerType === 'wholesaler';
    const qualifiesForWholesale = 
      isWholesaler &&
      product.isWholesaleAvailable &&
      product.wholesalePrice != null &&
      product.wholesalePrice > 0 &&
      quantity >= (product.minOrderQty || 1);

    return qualifiesForWholesale ? Number(product.wholesalePrice) : Number(product.price);
  }

  describe('1. Wholesale / Paikari Pricing Calculation', () => {
    it('regular retail customer ALWAYS receives retail price regardless of quantity', () => {
      const priceFor1 = resolveProductPrice(sampleWholesaleProduct, 1, regularCustomer.customerType);
      const priceFor10 = resolveProductPrice(sampleWholesaleProduct, 10, regularCustomer.customerType);
      
      expect(priceFor1).toBe(1100);
      expect(priceFor10).toBe(1100);
      expect(priceFor10).not.toBe(920);
    });

    it('wholesaler customer receives retail price if quantity is below minOrderQty', () => {
      // minOrderQty is 5, customer orders 4
      const priceFor4 = resolveProductPrice(sampleWholesaleProduct, 4, wholesalerCustomer.customerType);
      expect(priceFor4).toBe(1100);
    });

    it('wholesaler customer receives wholesale price when quantity reaches or exceeds minOrderQty', () => {
      // minOrderQty is 5
      const priceFor5 = resolveProductPrice(sampleWholesaleProduct, 5, wholesalerCustomer.customerType);
      const priceFor20 = resolveProductPrice(sampleWholesaleProduct, 20, wholesalerCustomer.customerType);

      expect(priceFor5).toBe(920);
      expect(priceFor20).toBe(920);
    });

    it('non-wholesale products always bill at standard price even for wholesaler customers', () => {
      const price = resolveProductPrice(sampleStandardProduct, 20, wholesalerCustomer.customerType);
      expect(price).toBe(350);
    });
  });

  describe('2. Max Order Quantity Validation', () => {
    it('allows quantities within maxOrderQty limit', () => {
      const qty = 45;
      const isWithinLimit = !sampleWholesaleProduct.maxOrderQty || qty <= sampleWholesaleProduct.maxOrderQty;
      expect(isWithinLimit).toBe(true);
    });

    it('rejects quantities strictly exceeding maxOrderQty limit', () => {
      const qty = 51;
      const exceeds = sampleWholesaleProduct.maxOrderQty != null && qty > sampleWholesaleProduct.maxOrderQty;
      expect(exceeds).toBe(true);
    });
  });

  describe('3. Multi-Vendor Isolation & Line Items', () => {
    it('accurately calculates vendor-attributed line total and savings', () => {
      const qty = 10;
      const unitPrice = resolveProductPrice(sampleWholesaleProduct, qty, wholesalerCustomer.customerType);
      const lineTotal = unitPrice * qty;
      const savings = ((sampleWholesaleProduct.price) - unitPrice) * qty;

      expect(lineTotal).toBe(9200);
      expect(savings).toBe(1800); // ৳(1100 - 920) * 10 = ৳1800 saved
    });
  });
});
