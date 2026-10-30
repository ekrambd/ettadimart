import { Router } from 'express';
import { prisma } from '../db';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { requireAdmin } from '../middleware/adminAuth';

export const customerRouter = Router();

// GET all customers
customerRouter.get('/', async (req, res) => {
  try {
    const items = await prisma.customer.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET by ID
customerRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create or upsert customer
customerRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const { phone, name, email, address, district, image, customerType, notes, totalOrders, totalSpent } = req.body;
    if (!phone || !name) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const cleanPhone = String(phone).trim().replace(/\s+/g, '');

    // Upsert by phone so duplicate phone numbers don't crash
    const item = await prisma.customer.upsert({
      where: { phone: cleanPhone },
      update: {
        name: String(name).trim(),
        email: email ? String(email).trim() : undefined,
        address: address ? String(address).trim() : undefined,
        district: district ? String(district).trim() : undefined,
        image: image || undefined,
        customerType: customerType || undefined,
        notes: notes || undefined,
        totalOrders: totalOrders !== undefined ? Number(totalOrders) : undefined,
        totalSpent: totalSpent !== undefined ? Number(totalSpent) : undefined
      },
      create: {
        id: req.body.id || `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: String(name).trim(),
        phone: cleanPhone,
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
        district: district ? String(district).trim() : null,
        image: image || null,
        customerType: customerType || 'regular',
        notes: notes || null,
        totalOrders: totalOrders !== undefined ? Number(totalOrders) : 0,
        totalSpent: totalSpent !== undefined ? Number(totalSpent) : 0
      }
    });
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Failed to save customer:', error);
    res.status(500).json({ error: 'Failed to create customer', details: error.message });
  }
});

// PUT update
customerRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE
customerRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
