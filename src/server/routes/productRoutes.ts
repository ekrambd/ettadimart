import { Router } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';
import { shardService } from '../services/shardService';

export const productRouter = Router();

function formatProduct(p: any) {
  let variants = p.variants;
  if (typeof variants === 'string') {
    try { variants = JSON.parse(variants); } catch { variants = []; }
  }
  let specs = p.specs;
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch { specs = []; }
  }
  let features = p.features;
  let extraMeta: any = {};
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) {
        features = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        extraMeta = parsed;
        features = parsed.featuresList || [];
      }
    } catch {
      features = [];
    }
  }
  let tableOfContents = p.tableOfContents;
  if (typeof tableOfContents === 'string') {
    try { tableOfContents = JSON.parse(tableOfContents); } catch { tableOfContents = []; }
  }

  const samplePages = Array.isArray(extraMeta.samplePages)
    ? extraMeta.samplePages
    : (Array.isArray(extraMeta.additionalImages)
        ? extraMeta.additionalImages
        : (Array.isArray(extraMeta.images) ? extraMeta.images : []));
  const additionalImages = Array.isArray(extraMeta.additionalImages)
    ? extraMeta.additionalImages
    : samplePages;

  return {
    ...p,
    ...extraMeta,
    samplePages,
    additionalImages,
    images: samplePages,
    deliveryChargeEnabled: extraMeta.deliveryChargeEnabled ?? p.deliveryChargeEnabled ?? true,
    freeDelivery: extraMeta.freeDelivery ?? (extraMeta.deliveryChargeEnabled === false),
    isFreeDelivery: extraMeta.isFreeDelivery ?? (extraMeta.deliveryChargeEnabled === false),
    variants: Array.isArray(variants) ? variants : [],
    specs: Array.isArray(specs) ? specs : [],
    features: Array.isArray(features) ? features : [],
    tableOfContents: Array.isArray(tableOfContents) ? tableOfContents : [],
    coverImage: p.image || null,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString()
  };
}

function sanitizeProductForDb(data: any, isUpdate = false): Record<string, any> {
  const toStr = (v: any) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      return trimmed === '' ? null : trimmed;
    }
    if (Array.isArray(v)) {
      return v.length === 0 ? null : JSON.stringify(v);
    }
    if (typeof v === 'object') {
      try {
        return Object.keys(v).length === 0 ? null : JSON.stringify(v);
      } catch {
        return null;
      }
    }
    return String(v);
  };
  const toNum = (v: any) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  const toInt = (v: any) => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseInt(String(v), 10);
    return isNaN(n) ? null : n;
  };

  const res: Record<string, any> = {};

  if (data.title !== undefined || !isUpdate) res.title = String(data.title || 'Untitled Product');
  if (data.subtitle !== undefined) res.subtitle = data.subtitle ? String(data.subtitle) : null;
  if (data.sku !== undefined) res.sku = data.sku ? String(data.sku) : null;
  if (data.price !== undefined || !isUpdate) res.price = toNum(data.price) ?? 0;
  if (data.regularPrice !== undefined) res.regularPrice = toNum(data.regularPrice);
  if (data.costPrice !== undefined) res.costPrice = toNum(data.costPrice);
  if (data.hasVariants !== undefined) res.hasVariants = Boolean(data.hasVariants);
  if (data.variants !== undefined) res.variants = toStr(data.variants);
  if (data.image !== undefined || data.coverImage !== undefined) res.image = data.image || data.coverImage || null;
  if (data.category !== undefined || !isUpdate) res.category = data.category ? String(data.category) : 'General';
  if (data.subCategory !== undefined) res.subCategory = data.subCategory ? String(data.subCategory) : null;
  if (data.brand !== undefined) res.brand = data.brand ? String(data.brand) : null;
  if (data.brandId !== undefined) res.brandId = data.brandId ? String(data.brandId) : null;
  if (data.vendorId !== undefined) res.vendorId = data.vendorId ? String(data.vendorId) : null;
  if (data.vendorName !== undefined) res.vendorName = data.vendorName ? String(data.vendorName) : null;
  if (data.stock !== undefined || !isUpdate) res.stock = toInt(data.stock) ?? 0;
  if (data.isAvailable !== undefined) res.isAvailable = data.isAvailable !== false;
  if (data.description !== undefined) res.description = data.description ? String(data.description) : null;
  if (data.ingredients !== undefined) res.ingredients = data.ingredients ? String(data.ingredients) : null;
  if (data.benefitsHighlights !== undefined) res.benefitsHighlights = data.benefitsHighlights ? String(data.benefitsHighlights) : null;
  if (data.howToUseIt !== undefined) res.howToUseIt = data.howToUseIt ? String(data.howToUseIt) : null;
  if (data.specs !== undefined) res.specs = toStr(data.specs);
  if (data.tableOfContents !== undefined) res.tableOfContents = toStr(data.tableOfContents);
  if (data.productType !== undefined) res.productType = data.productType ? String(data.productType) : null;
  if (data.translation !== undefined) res.translation = data.translation ? String(data.translation) : null;
  if (data.barcode !== undefined) res.barcode = data.barcode ? String(data.barcode) : null;
  if (data.shortSummary !== undefined) res.shortSummary = data.shortSummary ? String(data.shortSummary) : null;
  if (data.vatPercent !== undefined) res.vatPercent = toNum(data.vatPercent);
  if (data.authorName !== undefined) res.authorName = data.authorName ? String(data.authorName) : null;
  if (data.pdfUrl !== undefined) res.pdfUrl = data.pdfUrl ? String(data.pdfUrl) : null;
  if (data.slug !== undefined) res.slug = data.slug ? String(data.slug) : null;
  if (data.unit !== undefined) res.unit = data.unit ? String(data.unit) : null;
  if (data.minOrderQty !== undefined) res.minOrderQty = toInt(data.minOrderQty) ?? 1;
  if (data.maxOrderQty !== undefined) res.maxOrderQty = toInt(data.maxOrderQty);
  if (data.wholesalePrice !== undefined || data.paikariPrice !== undefined) {
    res.wholesalePrice = toNum(data.wholesalePrice ?? data.paikariPrice);
  }
  if (data.isWholesaleAvailable !== undefined) res.isWholesaleAvailable = Boolean(data.isWholesaleAvailable);
  if (data.isFeatured !== undefined) res.isFeatured = Boolean(data.isFeatured);
  if (data.selectedAttributes !== undefined) res.selectedAttributes = toStr(data.selectedAttributes);

  // Preserve deliveryChargeEnabled, freeDelivery, codAvailable and publishing metadata in features JSON column
  const meta: Record<string, any> = {};

  if (data.features !== undefined) {
    if (typeof data.features === 'string') {
      try {
        const parsed = JSON.parse(data.features);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          Object.assign(meta, parsed);
        }
      } catch {}
    } else if (typeof data.features === 'object' && data.features !== null && !Array.isArray(data.features)) {
      Object.assign(meta, data.features);
    }
  }

  if (data.deliveryChargeEnabled !== undefined) meta.deliveryChargeEnabled = Boolean(data.deliveryChargeEnabled);
  if (data.freeDelivery !== undefined) meta.freeDelivery = Boolean(data.freeDelivery);
  if (data.isFreeDelivery !== undefined) meta.isFreeDelivery = Boolean(data.isFreeDelivery);
  if (data.deliveryChargeAmount !== undefined) meta.deliveryChargeAmount = toNum(data.deliveryChargeAmount) ?? 0;
  if (data.codAvailable !== undefined) meta.codAvailable = Boolean(data.codAvailable);
  if (data.continueSelling !== undefined) meta.continueSelling = Boolean(data.continueSelling);
  if (data.isNewArrival !== undefined) meta.isNewArrival = Boolean(data.isNewArrival);
  if (data.isFeatured !== undefined) meta.isFeatured = Boolean(data.isFeatured);
  if (data.isCampaign !== undefined) meta.isCampaign = Boolean(data.isCampaign);
  if (data.isPrivate !== undefined) meta.isPrivate = Boolean(data.isPrivate);
  if (data.isOneTimePurchase !== undefined) meta.isOneTimePurchase = Boolean(data.isOneTimePurchase);
  if (data.weight !== undefined) meta.weight = toNum(data.weight);
  if (data.features !== undefined && Array.isArray(data.features) && data.features.length > 0) {
    meta.featuresList = data.features;
  }

  // Preserve multiple images / samplePages / additionalImages
  const rawImages = data.samplePages ?? data.additionalImages ?? data.images;
  if (Array.isArray(rawImages)) {
    const cleanList = rawImages.filter((img: any) => typeof img === 'string' && img.trim());
    if (cleanList.length > 0) {
      meta.samplePages = cleanList;
      meta.additionalImages = cleanList;
      meta.images = cleanList;
    }
  } else if (typeof rawImages === 'string' && rawImages.trim()) {
    try {
      const parsed = JSON.parse(rawImages);
      if (Array.isArray(parsed)) {
        const cleanList = parsed.filter((img: any) => typeof img === 'string' && img.trim());
        if (cleanList.length > 0) {
          meta.samplePages = cleanList;
          meta.additionalImages = cleanList;
          meta.images = cleanList;
        }
      }
    } catch {}
  }

  if (Object.keys(meta).length > 0) {
    res.features = JSON.stringify(meta);
  } else if (data.features !== undefined) {
    res.features = toStr(data.features);
  }

  return res;
}

// GET All Products - Direct DB Query (No seed data, no local cache)
productRouter.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(products.map(formatProduct));
  } catch (error: any) {
    console.error('Failed to fetch products from DB:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error?.message });
  }
});

// GET Batch Products by IDs
productRouter.get('/batch', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const idsQuery = (req.query.ids as string) || '';
  if (!idsQuery) return res.json([]);
  const ids = idsQuery.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const products = await prisma.product.findMany({
      where: { id: { in: ids } }
    });
    res.json(products.map(formatProduct));
  } catch (error: any) {
    console.error('Failed to fetch batch products from DB:', error);
    res.status(500).json({ error: 'Failed to fetch batch products', details: error?.message });
  }
});

// GET Product by ID with view counter tracking
productRouter.get('/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id }
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    shardService.incrementCounter(`views_${id}`, 1);
    res.json(formatProduct(product));
  } catch (error: any) {
    console.error('Failed to fetch product from DB:', error);
    res.status(500).json({ error: 'Failed to fetch product', details: error?.message });
  }
});

// POST Create Product
productRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    const id = data.id || `prod-${Date.now()}`;
    const sanitized = sanitizeProductForDb(data, false);

    const created = await prisma.product.upsert({
      where: { id },
      create: {
        id,
        title: sanitized.title || 'Untitled Product',
        category: sanitized.category || 'General',
        price: sanitized.price ?? 0,
        ...sanitized
      },
      update: sanitized
    });

    res.status(201).json(formatProduct(created));
  } catch (error: any) {
    console.error('Failed to create product in DB:', error);
    res.status(500).json({ error: 'Failed to create product', details: error?.message });
  }
});

// PUT Update Product
productRouter.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const data = { ...req.body };
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (existing && existing.features) {
      try {
        const existingMeta = JSON.parse(existing.features);
        if (typeof existingMeta === 'object' && existingMeta !== null) {
          if (data.samplePages === undefined && data.additionalImages === undefined && data.images === undefined) {
            data.samplePages = existingMeta.samplePages || existingMeta.additionalImages || existingMeta.images;
          }
          if (data.features === undefined) {
            data.features = existingMeta;
          }
        }
      } catch {}
    }

    const sanitized = sanitizeProductForDb(data, true);

    const updated = await prisma.product.upsert({
      where: { id },
      create: {
        id,
        ...sanitized,
        title: sanitized.title || 'Untitled Product',
        category: sanitized.category || 'General',
        price: sanitized.price ?? 0
      },
      update: sanitized
    });

    res.json(formatProduct(updated));
  } catch (error: any) {
    console.error('Failed to update product in DB:', error);
    res.status(500).json({ error: 'Failed to update product', details: error?.message });
  }
});

// DELETE Product
productRouter.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete product in DB:', error);
    res.status(500).json({ error: 'Failed to delete product', details: error?.message });
  }
});
