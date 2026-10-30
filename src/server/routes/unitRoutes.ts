import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const unitRouter = Router();

// GET /api/units
unitRouter.get('/', async (_req, res) => {
  try {
    const items = await (prisma as any).unit.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch units:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

// POST /api/units
unitRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, code, status } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Unit name and unit code are required' });
      return;
    }
    const created = await (prisma as any).unit.create({
      data: {
        name,
        code: code.trim().toLowerCase(),
        status: status !== undefined ? Boolean(status) : true
      }
    });
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Failed to create unit:', error);
    res.status(500).json({ error: error.message || 'Failed to create unit' });
  }
});

// PUT /api/units/:id
unitRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, status } = req.body;
    const updated = await (prisma as any).unit.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code.trim().toLowerCase() }),
        ...(status !== undefined && { status: Boolean(status) })
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update unit:', error);
    res.status(500).json({ error: error.message || 'Failed to update unit' });
  }
});

// DELETE /api/units/:id
unitRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).unit.delete({ where: { id } });
    res.json({ success: true, message: 'Unit removed successfully' });
  } catch (error: any) {
    console.error('Failed to delete unit:', error);
    res.status(500).json({ error: error.message || 'Failed to delete unit' });
  }
});
