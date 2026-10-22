import { Router } from 'express';
import { prisma } from '../db';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { requireAdmin } from '../middleware/adminAuth';

export const sliderRouter = Router();

// GET all sliders
sliderRouter.get('/', cacheResponse({ ttlSeconds: 60, staleWhileRevalidateSeconds: 120, tag: 'sliders' }), async (req, res) => {
  try {
    const items = await prisma.slider.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
});

// GET by ID
sliderRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.slider.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create
sliderRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.slider.create({ data: req.body });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT update
sliderRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.slider.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE
sliderRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.slider.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
