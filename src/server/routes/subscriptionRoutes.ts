import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

export const subscriptionRouter = Router();

// GET all subscription plans
subscriptionRouter.get('/', async (req, res) => {
  try {
    const { status, targetAudience } = req.query;
    const where: any = {};

    if (status !== undefined && status !== 'all') {
      where.status = status === 'true' || status === '1' || status === 'active';
    }

    if (targetAudience && typeof targetAudience === 'string') {
      where.targetAudience = targetAudience;
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: { price: 'asc' }
    });

    res.json(plans);
  } catch (error: any) {
    console.error('Failed fetching subscription plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans', details: error.message });
  }
});

// GET single plan by ID
subscriptionRouter.get('/:id', async (req, res) => {
  try {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: req.params.id }
    });
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch subscription plan', details: error.message });
  }
});

// POST create plan
subscriptionRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      shortDescription,
      description,
      price,
      durationDays,
      sellLimit,
      isPopular,
      status,
      targetAudience
    } = req.body;

    if (!name || price === undefined || durationDays === undefined) {
      return res.status(400).json({ error: 'Name, Price, and Duration in days are required' });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        id: req.body.id || `sub-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: String(name).trim(),
        shortDescription: shortDescription ? String(shortDescription).trim() : null,
        description: description ? String(description).trim() : null,
        price: Number(price),
        durationDays: Number(durationDays),
        sellLimit: sellLimit !== undefined && sellLimit !== '' ? Number(sellLimit) : null,
        isPopular: Boolean(isPopular),
        status: status !== undefined ? Boolean(status) : true,
        targetAudience: targetAudience || 'vendor'
      }
    });

    res.status(201).json(plan);
  } catch (error: any) {
    console.error('Failed creating subscription plan:', error);
    res.status(500).json({ error: 'Failed to create subscription plan', details: error.message });
  }
});

// PUT update plan
subscriptionRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      shortDescription,
      description,
      price,
      durationDays,
      sellLimit,
      isPopular,
      status,
      targetAudience
    } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (shortDescription !== undefined) data.shortDescription = shortDescription ? String(shortDescription).trim() : null;
    if (description !== undefined) data.description = description ? String(description).trim() : null;
    if (price !== undefined) data.price = Number(price);
    if (durationDays !== undefined) data.durationDays = Number(durationDays);
    if (sellLimit !== undefined) data.sellLimit = sellLimit !== '' ? Number(sellLimit) : null;
    if (isPopular !== undefined) data.isPopular = Boolean(isPopular);
    if (status !== undefined) data.status = Boolean(status);
    if (targetAudience !== undefined) data.targetAudience = targetAudience;

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Failed updating subscription plan:', error);
    res.status(500).json({ error: 'Failed to update subscription plan', details: error.message });
  }
});

// DELETE plan
subscriptionRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.subscriptionPlan.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Subscription plan deleted successfully' });
  } catch (error: any) {
    console.error('Failed deleting subscription plan:', error);
    res.status(500).json({ error: 'Failed to delete subscription plan', details: error.message });
  }
});
