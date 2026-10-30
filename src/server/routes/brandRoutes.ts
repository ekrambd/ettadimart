import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';
import { globalCache } from '../services/cacheEngine';

export const brandRouter = Router();

// GET all brands - instant fresh data
brandRouter.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const items = await (prisma as any).brand.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error: any) {
    console.error('Failed to fetch brands from DB:', error);
    res.status(500).json({ error: 'Failed to fetch brands', details: error?.message });
  }
});

// GET by ID
brandRouter.get('/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const item = await prisma.brand.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create
brandRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, name, logo, description, website, isActive, sortOrder } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const payload: any = {
      name: String(name).trim(),
      logo: logo || null,
      description: description || null,
      website: website || null,
      isActive: isActive !== false,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : 0
    };
    if (id && String(id).trim()) {
      payload.id = String(id).trim();
    }

    const item = await (prisma as any).brand.create({ data: payload });
    globalCache.invalidateTag('brands');
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Failed to create brand:', error);
    res.status(500).json({ error: 'Failed to create brand', details: error?.message });
  }
});

// PUT update
brandRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, logo, description, website, isActive, sortOrder } = req.body;
    const payload: any = {};
    if (name !== undefined) payload.name = String(name).trim();
    if (logo !== undefined) payload.logo = logo || null;
    if (description !== undefined) payload.description = description || null;
    if (website !== undefined) payload.website = website || null;
    if (isActive !== undefined) payload.isActive = Boolean(isActive);
    if (sortOrder !== undefined) payload.sortOrder = Number(sortOrder) || 0;

    const item = await (prisma as any).brand.update({
      where: { id: req.params.id },
      data: payload
    });
    globalCache.invalidateTag('brands');
    res.json(item);
  } catch (error: any) {
    console.error('Failed to update brand:', error);
    res.status(500).json({ error: 'Failed to update brand', details: error?.message });
  }
});

// DELETE
brandRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await (prisma as any).brand.delete({ where: { id: req.params.id } });
    globalCache.invalidateTag('brands');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete brand:', error);
    res.status(500).json({ error: 'Failed to delete brand', details: error?.message });
  }
});
