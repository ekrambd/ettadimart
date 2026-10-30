import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const taxRouter = Router();

// GET all taxes
taxRouter.get('/', async (req, res) => {
  try {
    const items = await prisma.tax.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error: any) {
    console.error('Failed to fetch taxes:', error);
    res.status(500).json({ error: 'Failed to fetch taxes', details: error?.message });
  }
});

// GET by ID
taxRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.tax.findUnique({
      where: { id: req.params.id }
    });
    if (item) res.json(item);
    else res.status(404).json({ error: 'Tax not found' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tax', details: error?.message });
  }
});

// POST create new tax
taxRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, percentage, status } = req.body;
    if (!name || percentage === undefined || percentage === null) {
      res.status(400).json({ error: 'Name and percentage are required' });
      return;
    }

    const item = await prisma.tax.create({
      data: {
        name: String(name).trim(),
        percentage: Number(percentage) || 0,
        status: status !== undefined ? Boolean(status) : true
      }
    });
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Failed to create tax:', error);
    res.status(500).json({ error: 'Failed to create tax', details: error?.message });
  }
});

// PUT update existing tax
taxRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, percentage, status } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (percentage !== undefined) updateData.percentage = Number(percentage) || 0;
    if (status !== undefined) updateData.status = Boolean(status);

    const item = await prisma.tax.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json(item);
  } catch (error: any) {
    console.error('Failed to update tax:', error);
    res.status(500).json({ error: 'Failed to update tax', details: error?.message });
  }
});

// DELETE tax
taxRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.tax.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Tax deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete tax:', error);
    res.status(500).json({ error: 'Failed to delete tax', details: error?.message });
  }
});
