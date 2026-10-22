import { Router } from 'express';
import { prisma } from '../db';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { requireAdmin } from '../middleware/adminAuth';

export const reviewRouter = Router();

// GET all reviews
reviewRouter.get('/', cacheResponse({ ttlSeconds: 60, staleWhileRevalidateSeconds: 120, tag: 'reviews' }), async (req, res) => {
  try {
    const items = await prisma.review.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET by ID
reviewRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create
reviewRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.review.create({ data: req.body });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT update
reviewRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.review.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE
reviewRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
