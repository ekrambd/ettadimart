import { describe, it, expect, beforeEach } from 'vitest';
import { calculateDeliveryCharge } from '../lib/deliveryUtils';
import { validateBDPhone, validateDeliveryAddress } from '../lib/validationUtils';
import { Product, ProductVariant } from '../types';

describe('UI/UX & Checkout Flow Tests', () => {
  const mockProduct: Product = {
    id: 'prod-101',
    title: 'Smart LED Desk Lamp',
    price: 1250,
    regularPrice: 1500,
    category: 'Home & Living',
    subCategory: 'Lighting',
    vendorId: 'vendor-1',
    vendorName: 'Ettadi Official Flagship',
    image: 'https://example.com/lamp.jpg',
    stock: 25
  };

  const mockVariant: ProductVariant = {
    id: 'var-warm-white',
    name: 'Warm White 3000K',
    price: 1350,
    regularPrice: 1600
  };

  describe('1. Add to Cart & Calculation Logic', () => {
    it('calculates subtotal correctly with single product', () => {
      const cart = [{ product: mockProduct, quantity: 2 }];
      const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      expect(subtotal).toBe(2500);
    });

    it('calculates subtotal correctly with product variant', () => {
      const cart = [
        { product: mockProduct, quantity: 1 },
        { product: mockProduct, quantity: 2, variant: mockVariant }
      ];
      const subtotal = cart.reduce(
        (acc, item) => acc + ((item.variant?.price ?? item.product.price) * item.quantity),
        0
      );
      // 1250 + (1350 * 2) = 1250 + 2700 = 3950
      expect(subtotal).toBe(3950);
    });
  });

  describe('2. Delivery Fee Calculations', () => {
    const mockSettings = {
      deliveryChargeInsideDhaka: 60,
      deliveryChargeOutsideDhaka: 120
    };

    it('applies Inside Dhaka delivery fee', () => {
      const result = calculateDeliveryCharge({
        items: [{ product: mockProduct, quantity: 1 }],
        method: { id: 'dm-1', title: 'Inside Dhaka', deliveryCharge: 60, status: 'Active', mode: 'manual', type: 'flat', minimumCharge: 60, maximumCharge: 60, updatedAt: '' },
        settings: mockSettings as any
      });
      expect(result.totalCharge).toBe(60);
    });

    it('applies Outside Dhaka delivery fee', () => {
      const result = calculateDeliveryCharge({
        items: [{ product: mockProduct, quantity: 1 }],
        method: { id: 'dm-2', title: 'Outside Dhaka', deliveryCharge: 120, status: 'Active', mode: 'manual', type: 'flat', minimumCharge: 120, maximumCharge: 120, updatedAt: '' },
        settings: mockSettings as any
      });
      expect(result.totalCharge).toBe(120);
    });
  });

  describe('3. Form Validation (Phone & Address for BD Delivery)', () => {
    it('validates correct BD phone numbers', () => {
      expect(validateBDPhone('01726275850').isValid).toBe(true);
      expect(validateBDPhone('01811223344').isValid).toBe(true);
      expect(validateBDPhone('+8801912345678').isValid).toBe(true);
    });

    it('rejects invalid or incomplete phone numbers', () => {
      expect(validateBDPhone('012345').isValid).toBe(false);
      expect(validateBDPhone('abcdefghijk').isValid).toBe(false);
    });

    it('validates delivery addresses', () => {
      expect(validateDeliveryAddress('House 12, Road 4, Dhanmondi, Dhaka').isValid).toBe(true);
      expect(validateDeliveryAddress('Hi').isValid).toBe(false); // Too short
    });
  });
});
