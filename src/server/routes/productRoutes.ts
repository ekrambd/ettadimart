import { Router } from 'express';
import { storeProducts, saveProductsToDisk } from '../data/store';
import { Product } from '../../types';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { globalCache } from '../services/cacheEngine';
import { shardService } from '../services/shardService';
import { prisma } from '../db';

export const productRouter = Router();

// GET All Products - High-speed cached with ETag, SWR & Eager Loading (Zero N+1 Queries)
productRouter.get('/', cacheResponse({ ttlSeconds: 60, staleWhileRevalidateSeconds: 120, tag: 'products' }), async (req, res) => {
  const includeReviews = req.query.include === 'reviews' || req.query.withReviews === 'true';
  const includeBrand = req.query.include === 'brand' || req.query.withBrand === 'true';

  let products = [...storeProducts];

  // Eager load related data in a single batch query (Zero N+1 queries)
  if (includeReviews || includeBrand) {
    const productIds = products.map(p => p.id);

    const reviewsMap = new Map<string, any[]>();
    if (includeReviews) {
      try {
        const allReviews = await prisma.review.findMany({
          where: { productId: { in: productIds } }
        });
        for (const rev of allReviews) {
          if (!reviewsMap.has(rev.productId)) reviewsMap.set(rev.productId, []);
          reviewsMap.get(rev.productId)!.push(rev);
        }
      } catch {}
    }

    const brandsMap = new Map<string, any>();
    if (includeBrand) {
      try {
        const allBrands = await prisma.brand.findMany();
        for (const b of allBrands) brandsMap.set(b.id, b);
      } catch {}
    }

    products = products.map(p => ({
      ...p,
      reviews: includeReviews ? (reviewsMap.get(p.id) || []) : undefined,
      brandDetails: (includeBrand && p.brandId) ? (brandsMap.get(p.brandId) || null) : undefined
    }));
  }

  res.json(products);
});

// GET Batch Products by IDs in 1 query (Prevents N+1 frontend requests)
productRouter.get('/batch', cacheResponse({ ttlSeconds: 60, staleWhileRevalidateSeconds: 120, tag: 'products' }), (req, res) => {
  const idsQuery = (req.query.ids as string) || '';
  if (!idsQuery) return res.json([]);
  const ids = idsQuery.split(',').map(s => s.trim()).filter(Boolean);
  const matched = storeProducts.filter(p => ids.includes(p.id));
  res.json(matched);
});

// GET Product by ID with sharded view counter tracking
productRouter.get('/:id', cacheResponse({ ttlSeconds: 60, staleWhileRevalidateSeconds: 120, tag: 'products' }), (req, res) => {
  const { id } = req.params;
  const product = storeProducts.find(p => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // Increment distributed sharded view counter in background
  shardService.incrementCounter(`views_${id}`, 1);

  res.json(product);
});

// POST Create Product - writes and invalidates cache
productRouter.post('/', (req, res) => {
  const newProduct: Product = {
    id: req.body.id || `prod-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  storeProducts.unshift(newProduct);
  saveProductsToDisk(storeProducts);

  // Invalidate product caches across cluster
  globalCache.invalidateTag('products');

  res.status(201).json(newProduct);
});

// PUT Update Product - updates and invalidates cache
productRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const index = storeProducts.findIndex(p => p.id === id);
  if (index !== -1) {
    storeProducts[index] = { ...storeProducts[index], ...req.body };
    saveProductsToDisk(storeProducts);

    // Invalidate product caches
    globalCache.invalidateTag('products');

    res.json(storeProducts[index]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// DELETE Product - removes and invalidates cache
productRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = storeProducts.findIndex(p => p.id === id);
  if (index !== -1) {
    storeProducts.splice(index, 1);
    saveProductsToDisk(storeProducts);

    // Invalidate product caches
    globalCache.invalidateTag('products');

    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});
