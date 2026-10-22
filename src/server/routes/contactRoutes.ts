import { Router } from 'express';
import { prisma } from '../db';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { requireAdmin } from '../middleware/adminAuth';

export const contactRouter = Router();

// GET all
contactRouter.get('/', async (req, res) => {
  try {
    const items = await prisma.contactMessage.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// GET by ID
contactRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create
contactRouter.post('/', async (req, res) => {
  try {
    const item = await prisma.contactMessage.create({ data: req.body });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT update
contactRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE
contactRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
