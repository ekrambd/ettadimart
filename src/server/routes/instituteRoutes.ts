import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';
import { cacheResponse } from '../middleware/cacheMiddleware';

export const instituteRouter = Router();

instituteRouter.get('/', cacheResponse({ ttlSeconds: 300, staleWhileRevalidateSeconds: 600, tag: 'institute' }), async (req, res) => {
  const item = await prisma.instituteInfo.findUnique({ where: { id: 'global' } });
  res.json(item || {});
});

instituteRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const allowed = ['name', 'logo', 'address', 'phone', 'email', 'website', 'facebook', 'youtube', 'aboutUs', 'termsAndConditions', 'privacyPolicy', 'returnPolicy'];
    const safeData: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        safeData[key] = req.body[key] ? String(req.body[key]) : null;
      }
    }

    const item = await prisma.instituteInfo.upsert({
      where: { id: 'global' },
      update: safeData,
      create: { id: 'global', ...safeData }
    });
    res.json(item);
  } catch (err: any) {
    console.warn('[institute] Upsert failed:', err);
    res.status(500).json({ error: err.message || 'Failed saving institute info' });
  }
});
