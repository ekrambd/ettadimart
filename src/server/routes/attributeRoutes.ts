import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const attributeRouter = Router();

// GET /api/attributes
attributeRouter.get('/', async (_req, res) => {
  try {
    const items = await (prisma as any).attribute.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const parsed = items.map((item: any) => ({
      ...item,
      values: item.values ? JSON.parse(item.values) : []
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Failed to fetch attributes:', error);
    res.status(500).json({ error: 'Failed to fetch attributes' });
  }
});

// POST /api/attributes
attributeRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, values, status } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Attribute name is required' });
      return;
    }
    const created = await (prisma as any).attribute.create({
      data: {
        name,
        values: Array.isArray(values) ? JSON.stringify(values) : JSON.stringify([]),
        status: status !== undefined ? Boolean(status) : true
      }
    });
    res.status(201).json({
      ...created,
      values: created.values ? JSON.parse(created.values) : []
    });
  } catch (error: any) {
    console.error('Failed to create attribute:', error);
    res.status(500).json({ error: error.message || 'Failed to create attribute' });
  }
});

// PUT /api/attributes/:id
attributeRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, values, status } = req.body;
    const updated = await (prisma as any).attribute.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(values !== undefined && { values: Array.isArray(values) ? JSON.stringify(values) : JSON.stringify([]) }),
        ...(status !== undefined && { status: Boolean(status) })
      }
    });
    res.json({
      ...updated,
      values: updated.values ? JSON.parse(updated.values) : []
    });
  } catch (error: any) {
    console.error('Failed to update attribute:', error);
    res.status(500).json({ error: error.message || 'Failed to update attribute' });
  }
});

// DELETE /api/attributes/:id
attributeRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).attribute.delete({ where: { id } });
    res.json({ success: true, message: 'Attribute removed successfully' });
  } catch (error: any) {
    console.error('Failed to delete attribute:', error);
    res.status(500).json({ error: error.message || 'Failed to delete attribute' });
  }
});
