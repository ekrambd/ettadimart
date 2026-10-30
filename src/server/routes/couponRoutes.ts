import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';
import { globalCache } from '../services/cacheEngine';

export const couponRouter = Router();

// GET all coupons - instant fresh data
couponRouter.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const items = await prisma.coupon.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// GET by ID
couponRouter.get('/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const item = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create
couponRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      code,
      title,
      discount,
      discountType,
      type,
      minimumSpent,
      minimumOrderAmount,
      maxDiscount,
      maximumDiscountAmount,
      limitForSingleUser,
      limitPerUser,
      startDate,
      startTime,
      expiredDate,
      expiredTime,
      shopId,
      status,
      description
    } = req.body;

    if (!code || discount === undefined) {
      return res.status(400).json({ error: 'Coupon code and discount are required' });
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Check existing
    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode }
    });
    if (existing) {
      return res.status(400).json({ error: 'A coupon with this code already exists' });
    }

    const item = await prisma.coupon.create({
      data: {
        id: req.body.id || `cpn-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        code: cleanCode,
        title: title ? String(title).trim() : cleanCode,
        discount: Number(discount),
        type: (discountType || type || 'fixed').toLowerCase() === 'percentage' ? 'percentage' : 'fixed',
        minimumSpent: minimumOrderAmount !== undefined ? Number(minimumOrderAmount) : (minimumSpent !== undefined ? Number(minimumSpent) : 0),
        maxDiscount: maximumDiscountAmount !== undefined && maximumDiscountAmount !== '' ? Number(maximumDiscountAmount) : (maxDiscount !== undefined && maxDiscount !== '' ? Number(maxDiscount) : null),
        limitPerUser: limitForSingleUser !== undefined && limitForSingleUser !== '' ? Number(limitForSingleUser) : (limitPerUser !== undefined && limitPerUser !== '' ? Number(limitPerUser) : 1),
        startDate: startDate ? String(startDate) : null,
        startTime: startTime ? String(startTime) : null,
        expiredDate: expiredDate ? String(expiredDate) : null,
        expiredTime: expiredTime ? String(expiredTime) : null,
        shopId: shopId ? String(shopId) : null,
        status: status ? (typeof status === 'boolean' ? (status ? 'Active' : 'Inactive') : String(status)) : 'Active',
        description: description ? String(description).trim() : null
      }
    });
    globalCache.invalidateTag('coupons');
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Failed to create coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon', details: error.message });
  }
});

// PUT update
couponRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data: any = { ...req.body };
    if (data.code) data.code = String(data.code).trim().toUpperCase();
    if (data.discount !== undefined) data.discount = Number(data.discount);
    if (data.discountType || data.type) {
      data.type = (data.discountType || data.type).toLowerCase() === 'percentage' ? 'percentage' : 'fixed';
      delete data.discountType;
    }
    if (data.minimumOrderAmount !== undefined) {
      data.minimumSpent = Number(data.minimumOrderAmount);
      delete data.minimumOrderAmount;
    }
    if (data.maximumDiscountAmount !== undefined) {
      data.maxDiscount = data.maximumDiscountAmount !== '' ? Number(data.maximumDiscountAmount) : null;
      delete data.maximumDiscountAmount;
    }
    if (data.limitForSingleUser !== undefined) {
      data.limitPerUser = data.limitForSingleUser !== '' ? Number(data.limitForSingleUser) : 1;
      delete data.limitForSingleUser;
    }
    if (typeof data.status === 'boolean') {
      data.status = data.status ? 'Active' : 'Inactive';
    }

    const item = await prisma.coupon.update({
      where: { id: req.params.id },
      data
    });
    globalCache.invalidateTag('coupons');
    res.json(item);
  } catch (error: any) {
    console.error('Failed to update coupon:', error);
    res.status(500).json({ error: 'Failed to update', details: error.message });
  }
});

// DELETE
couponRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    globalCache.invalidateTag('coupons');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
