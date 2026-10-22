import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';
import { cacheResponse } from '../middleware/cacheMiddleware';

export const landingRouter = Router();

landingRouter.get('/', cacheResponse({ ttlSeconds: 120, staleWhileRevalidateSeconds: 300, tag: 'landing' }), async (req, res) => {
  const items = await prisma.landingPage.findMany();
  res.json(items);
});

landingRouter.get('/:id', cacheResponse({ ttlSeconds: 120, staleWhileRevalidateSeconds: 300, tag: 'landing' }), async (req, res) => {
  const rawId = req.params.id;
  let decoded = rawId;
  try {
    decoded = decodeURIComponent(rawId);
  } catch {}

  const item = await prisma.landingPage.findFirst({
    where: {
      OR: [
        { id: rawId },
        { id: decoded },
        { slug: rawId },
        { slug: decoded },
        { productId: rawId },
        { productId: decoded }
      ]
    }
  });
  if (item) res.json(item);
  else res.status(404).json({ error: 'Not found' });
});

landingRouter.post('/', requireAdmin, async (req, res) => {
  const data = req.body;
  if (!data.id) data.id = data.slug || data.productId || `lp_${Date.now()}`;
  const item = await prisma.landingPage.upsert({
    where: { id: data.id },
    update: data,
    create: data
  });
  res.json(item);
});
