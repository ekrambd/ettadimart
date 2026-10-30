import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const flashSaleRouter = Router();

// GET all flash sales
flashSaleRouter.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const where: any = {};

    if (status !== undefined && status !== 'all') {
      where.status = status === 'true' || status === '1' || status === 'active';
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } }
      ];
    }

    const items = await prisma.flashSale.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (error: any) {
    console.error('Failed to fetch flash sales:', error);
    res.status(500).json({ error: 'Failed to fetch flash sales', details: error.message });
  }
});

// GET single flash sale
flashSaleRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.flashSale.findUnique({
      where: { id: req.params.id }
    });
    if (!item) {
      return res.status(404).json({ error: 'Flash sale not found' });
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch flash sale', details: error.message });
  }
});

// POST create flash sale
flashSaleRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      minimumDiscount,
      startDate,
      startTime,
      endDate,
      endTime,
      description,
      thumbnail,
      status,
      productIds
    } = req.body;

    if (!name || minimumDiscount === undefined || !startDate || !startTime || !endDate || !endTime || !description) {
      return res.status(400).json({ 
        error: 'Name, Minimum Discount, Start Date/Time, End Date/Time, and Description are required' 
      });
    }

    const item = await prisma.flashSale.create({
      data: {
        id: req.body.id || `flash-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: String(name).trim(),
        minimumDiscount: Number(minimumDiscount),
        startDate: String(startDate),
        startTime: String(startTime),
        endDate: String(endDate),
        endTime: String(endTime),
        description: String(description).trim(),
        thumbnail: thumbnail || null,
        status: status !== undefined ? Boolean(status) : true,
        productIds: productIds ? (typeof productIds === 'string' ? productIds : JSON.stringify(productIds)) : null
      }
    });

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Failed to create flash sale:', error);
    res.status(500).json({ error: 'Failed to create flash sale', details: error.message });
  }
});

// PUT update flash sale
flashSaleRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      minimumDiscount,
      startDate,
      startTime,
      endDate,
      endTime,
      description,
      thumbnail,
      status,
      productIds
    } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (minimumDiscount !== undefined) data.minimumDiscount = Number(minimumDiscount);
    if (startDate !== undefined) data.startDate = String(startDate);
    if (startTime !== undefined) data.startTime = String(startTime);
    if (endDate !== undefined) data.endDate = String(endDate);
    if (endTime !== undefined) data.endTime = String(endTime);
    if (description !== undefined) data.description = String(description).trim();
    if (thumbnail !== undefined) data.thumbnail = thumbnail || null;
    if (status !== undefined) data.status = Boolean(status);
    if (productIds !== undefined) {
      data.productIds = typeof productIds === 'string' ? productIds : JSON.stringify(productIds);
    }

    const updated = await prisma.flashSale.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update flash sale:', error);
    res.status(500).json({ error: 'Failed to update flash sale', details: error.message });
  }
});

// DELETE flash sale
flashSaleRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.flashSale.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Flash sale deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete flash sale:', error);
    res.status(500).json({ error: 'Failed to delete flash sale', details: error.message });
  }
});
