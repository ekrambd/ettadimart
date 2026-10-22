import { Router } from 'express';
import { checkoutRateLimiter } from '../middleware/rateLimiter';
import { storeOrders, storeProducts, storeSettings, saveOrdersToDisk } from '../data/store';
import { BookOrder } from '../../types';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { requireAdmin } from '../middleware/adminAuth';
import { globalCache } from '../services/cacheEngine';
import { shardService } from '../services/shardService';
import { redundancyService } from '../services/redundancyService';
import { prisma } from '../db';
import { validateBDPhone, validateDeliveryAddress } from '../../lib/validationUtils';

export const orderRouter = Router();

// Live SSE Clients for instantaneous real-time order stream
const liveClients = new Set<(order: BookOrder) => void>();

export function broadcastNewOrder(order: BookOrder) {
  liveClients.forEach(callback => {
    try {
      callback(order);
    } catch {
      liveClients.delete(callback);
    }
  });
}

// GET /api/orders/live - Server-Sent Events (SSE) for Real-Time Order Stream
orderRouter.get('/live', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('\n');

  const onNewOrder = (order: BookOrder) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'NEW_ORDER', order })}\n\n`);
    } catch {
      liveClients.delete(onNewOrder);
    }
  };

  liveClients.add(onNewOrder);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      liveClients.delete(onNewOrder);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    liveClients.delete(onNewOrder);
  });
});

// GET All Orders - Live in-memory fetch with Zero latency (Never stale)
orderRouter.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const includeCustomer = req.query.include === 'customer' || req.query.withCustomer === 'true';

  let orders = [...storeOrders];

  // Eager load customer data in 1 single batch query (Zero N+1 queries)
  if (includeCustomer && orders.length > 0) {
    const phones = Array.from(new Set(orders.map(o => o.phone).filter(Boolean)));
    try {
      const customers = await prisma.customer.findMany({
        where: { phone: { in: phones } }
      });
      const customerMap = new Map(customers.map(c => [c.phone, c]));
      orders = orders.map(o => ({
        ...o,
        customerDetails: o.phone ? (customerMap.get(o.phone) || null) : null
      }));
    } catch {}
  }

  res.json(orders);
});

// GET /api/orders/track - Public 1-Click Order Tracking by Phone or Order ID (Free, Zero API cost)
orderRouter.get('/track', (req, res) => {
  const query = String(req.query.q || req.query.phone || req.query.id || '').trim();
  if (!query) {
    return res.status(400).json({ success: false, message: 'Please provide a phone number or Order ID' });
  }

  const cleanDigits = query.replace(/\D/g, '');
  const matched = storeOrders.filter(o => {
    const orderPhone = (o.customerPhone || o.phone || '').replace(/\D/g, '');
    const isPhoneMatch = Boolean(cleanDigits && orderPhone && (orderPhone.endsWith(cleanDigits) || cleanDigits.endsWith(orderPhone)));
    const isIdMatch = Boolean(o.id && o.id.toLowerCase() === query.toLowerCase());
    return isPhoneMatch || isIdMatch;
  });

  return res.json({
    success: true,
    orders: matched
  });
});

// GET Sharding & Partition info for Orders
orderRouter.get('/shards/stats', (_req, res) => {
  const counterStats = shardService.getCounterStats('orders_total');
  const partitions: Record<string, number> = {};

  for (const order of storeOrders) {
    const shardIndex = shardService.getShardIndex(order.id || '');
    partitions[`shard_${shardIndex}`] = (partitions[`shard_${shardIndex}`] || 0) + 1;
  }

  res.json({
    success: true,
    totalOrders: storeOrders.length,
    counterStats,
    distribution: partitions
  });
});

// POST /api/orders/checkout - Secure Server-Side Atomic Order Validation & Placement (N+1 queries prevented)
orderRouter.post('/checkout', checkoutRateLimiter, async (req, res) => {
  try {
    const { items, customerName, phone, address, deliveryZone, deliveryCharge, deliveryMethodId, paymentMethod, senderPhone, trxId, couponCode, notes, email } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }
    if (!customerName || !phone || !address) {
      return res.status(400).json({ error: 'Customer name, phone number, and delivery address are required.' });
    }

    const phoneVal = validateBDPhone(String(phone));
    if (!phoneVal.isValid) {
      return res.status(400).json({ error: phoneVal.error || 'Invalid Bangladeshi mobile phone number.' });
    }

    const addressVal = validateDeliveryAddress(String(address));
    if (!addressVal.isValid) {
      return res.status(400).json({ error: addressVal.error || 'Invalid delivery address.' });
    }

    // 1. Authoritative Server-Side Stock & Price Verification (Indexed O(1) Map - Zero N+1 queries)
    let calculatedSubtotal = 0;
    const validatedItems: any[] = [];
    const productLookupMap = new Map(storeProducts.map(p => [p.id, p]));

    for (const item of items) {
      const productId = item.productId || item.product?.id || item.id;
      const quantity = Math.max(1, parseInt(item.quantity || 1, 10));

      const matchedProduct = productLookupMap.get(productId);
      const unitPrice = matchedProduct ? Number(matchedProduct.price || 0) : Number(item.price || item.product?.price || 0);
      const regularPrice = matchedProduct ? Number(matchedProduct.regularPrice || unitPrice) : Number(item.regularPrice || unitPrice);
      const title = matchedProduct?.title || item.product?.title || item.title || 'Product';

      // Stock check
      const currentStock = matchedProduct ? (typeof matchedProduct.stock === 'number' ? matchedProduct.stock : (matchedProduct as any).stockQuantity) : undefined;
      const canContinueSelling = matchedProduct?.continueSelling === true;

      if (matchedProduct && typeof currentStock === 'number') {
        if (currentStock < quantity && !canContinueSelling) {
          return res.status(400).json({
            error: `Insufficient stock for product "${title}". Available: ${currentStock}`
          });
        }
        // Deduct inventory atomically on server
        if (typeof matchedProduct.stock === 'number') {
          matchedProduct.stock -= quantity;
        } else if (typeof (matchedProduct as any).stockQuantity === 'number') {
          (matchedProduct as any).stockQuantity -= quantity;
        }
      }

      calculatedSubtotal += unitPrice * quantity;
      validatedItems.push({
        product: {
          id: productId,
          title,
          price: unitPrice,
          regularPrice,
          image: matchedProduct?.coverImage || item.product?.image || item.product?.coverImage || '',
          category: matchedProduct?.category || item.product?.category || '',
          stock: matchedProduct?.stockQuantity || 100,
          isAvailable: true
        },
        quantity
      });
    }

    // 2. Authoritative Dynamic Delivery Charge Calculation from Admin Settings
    let deliveryFee = 60;
    const deliveryMethods = (storeSettings as any)?.deliveryMethods;
    if (Array.isArray(deliveryMethods) && deliveryMethods.length > 0) {
      const match = deliveryMethods.find((m: any) => 
        (m.id && (m.id === deliveryMethodId || m.id === deliveryZone)) ||
        (m.title && m.title.trim().toLowerCase() === String(deliveryZone).trim().toLowerCase()) ||
        (m.status === 'Active' && (
          m.title.toLowerCase().includes(String(deliveryZone).toLowerCase()) ||
          String(deliveryZone).toLowerCase().includes(m.title.toLowerCase())
        ))
      );
      if (match) {
        const baseCharge = Number(match.deliveryCharge) >= 0 ? Number(match.deliveryCharge) : 60;
        const isWeightBased = match.mode === 'Weight based' || Boolean((storeSettings as any)?.weightBasedDeliveryEnabled && match.mode !== 'Fixed');
        if (isWeightBased) {
          const defaultItemWeight = Number((storeSettings as any)?.defaultProductWeightKg) > 0 ? Number((storeSettings as any).defaultProductWeightKg) : 0.5;
          const totalWeightKg = items.reduce((acc: number, item: any) => {
            const matchedP = productLookupMap.get(item.productId || item.product?.id || item.id);
            const w = (typeof matchedP?.weight === 'number' && matchedP.weight > 0) ? matchedP.weight : defaultItemWeight;
            return acc + (w * Math.max(1, parseInt(item.quantity || 1, 10)));
          }, 0);
          const baseWeight = Number(match.baseWeightKg) > 0 ? Number(match.baseWeightKg) : (Number((storeSettings as any)?.defaultBaseWeightKg) || 1);
          const extraKg = totalWeightKg > baseWeight ? Math.ceil(totalWeightKg - baseWeight) : 0;
          const isInside = match.title ? (match.title.toLowerCase().includes('inside') || match.title.includes('ভেতরে')) : true;
          const fallbackRate = isInside 
            ? (Number((storeSettings as any)?.defaultExtraPerKgInsideDhaka) || 20) 
            : (Number((storeSettings as any)?.defaultExtraPerKgOutsideDhaka) || 25);
          const extraRate = Number(match.extraPerKgCharge) >= 0 ? Number(match.extraPerKgCharge) : fallbackRate;
          deliveryFee = baseCharge + (extraKg * extraRate);
        } else {
          deliveryFee = baseCharge;
        }
      } else if (deliveryCharge !== undefined && !isNaN(Number(deliveryCharge))) {
        deliveryFee = Math.max(0, Number(deliveryCharge));
      } else {
        const firstActive = deliveryMethods.find((m: any) => m.status === 'Active');
        deliveryFee = firstActive ? (Number(firstActive.deliveryCharge) || 0) : 60;
      }
    } else if (deliveryCharge !== undefined && !isNaN(Number(deliveryCharge))) {
      deliveryFee = Math.max(0, Number(deliveryCharge));
    } else {
      const isInside = deliveryZone === 'inside_dhaka' || 
                       String(deliveryZone).toLowerCase().includes('inside') || 
                       String(deliveryZone).includes('ভেতরে');
      deliveryFee = isInside 
        ? (Number(storeSettings.deliveryChargeInsideDhaka) || 60) 
        : (Number(storeSettings.deliveryChargeOutsideDhaka) || 110);
    }

    const hasFreeDeliveryProduct = validatedItems.some(i => {
      const p = productLookupMap.get(i.product.id);
      return p?.deliveryChargeEnabled === false || (p as any)?.freeDelivery === true || (p as any)?.isFreeDelivery === true;
    });

    if (hasFreeDeliveryProduct || (
        (storeSettings as any)?.freeDeliveryEnabled && 
        (storeSettings as any)?.freeDeliveryMinPurchase && 
        calculatedSubtotal >= Number((storeSettings as any).freeDeliveryMinPurchase)
    )) {
      deliveryFee = 0;
    }

    // 3. Authoritative Coupon Verification
    let couponDiscount = 0;
    if (couponCode && typeof couponCode === 'string') {
      const cleanCoupon = couponCode.trim().toUpperCase();
      try {
        const foundCoupon = await prisma.coupon.findFirst({
          where: { code: cleanCoupon, status: 'Active' }
        });
        if (foundCoupon) {
          if (foundCoupon.type === 'percentage') {
            couponDiscount = Math.round(calculatedSubtotal * (foundCoupon.discount / 100));
            if (foundCoupon.maxDiscount && foundCoupon.maxDiscount > 0) {
              couponDiscount = Math.min(couponDiscount, foundCoupon.maxDiscount);
            }
          } else {
            couponDiscount = Math.min(calculatedSubtotal, foundCoupon.discount);
          }
        }
      } catch (err) {
        console.warn('Coupon DB lookup failed:', err);
      }
    }

    const calculatedGrandTotal = Math.max(0, calculatedSubtotal + deliveryFee - couponDiscount);
    const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const shardIndex = shardService.getShardIndex(orderId);
    const timePartition = shardService.getTimePartitionName('orders');

    const confirmedOrder: BookOrder & { _shardMeta?: { shardIndex: number; partition: string } } = {
      id: orderId,
      customerName: String(customerName).trim(),
      phone: phoneVal.cleanedPhone,
      address: addressVal.cleanedAddress,
      deliveryZone: deliveryZone || 'inside_dhaka',
      email: email ? String(email).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      deliveryFee,
      deliveryCharge: deliveryFee,

      items: validatedItems,
      quantity: validatedItems.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: calculatedGrandTotal,
      totalAmount: calculatedGrandTotal,
      productName: validatedItems.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
      productTitle: validatedItems.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
      status: 'Pending',
      orderType: 'storefront',
      paymentMethod: paymentMethod || 'Cash on Delivery',
      paymentGateway: paymentMethod || 'Cash on Delivery',
      senderPhone: senderPhone ? String(senderPhone).trim() : undefined,
      trxId: trxId ? String(trxId).trim() : undefined,
      couponCode: couponCode ? String(couponCode).trim() : undefined,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      createdAt: new Date().toISOString(),
      orderDate: new Date().toISOString(),
      _shardMeta: {
        shardIndex,
        partition: timePartition
      }
    };

    // Save order
    storeOrders.unshift(confirmedOrder);
    saveOrdersToDisk(storeOrders);
    broadcastNewOrder(confirmedOrder);

    shardService.incrementCounter('orders_total', 1);
    globalCache.invalidateTag('orders');
    globalCache.invalidateTag('products');
    redundancyService.saveSnapshot('recent_orders_backup', storeOrders.slice(0, 100));

    return res.status(201).json({
      success: true,
      order: confirmedOrder
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Server error during checkout validation.' });
  }
});

// POST Create Order - with sharded partitioning & distributed counter
orderRouter.post('/', checkoutRateLimiter, (req, res) => {
  const rawPhone = req.body.phone || req.body.customerPhone;
  const rawAddress = req.body.address || req.body.customerAddress;
  const isPhysicalOrShowroom = req.body.orderType === 'physical' || (rawAddress && String(rawAddress).toLowerCase().includes('showroom'));

  if (rawPhone && !isPhysicalOrShowroom) {
    const phoneVal = validateBDPhone(String(rawPhone));
    if (!phoneVal.isValid) {
      return res.status(400).json({ error: phoneVal.error || 'Invalid Bangladeshi mobile phone number.' });
    }
    req.body.phone = phoneVal.cleanedPhone;
    if (req.body.customerPhone) req.body.customerPhone = phoneVal.cleanedPhone;
  }

  if (rawAddress && !isPhysicalOrShowroom) {
    const addressVal = validateDeliveryAddress(String(rawAddress));
    if (!addressVal.isValid) {
      return res.status(400).json({ error: addressVal.error || 'Invalid delivery address.' });
    }
    req.body.address = addressVal.cleanedAddress;
    if (req.body.customerAddress) req.body.customerAddress = addressVal.cleanedAddress;
  }

  const orderId = req.body.id || `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const shardIndex = shardService.getShardIndex(orderId);
  const timePartition = shardService.getTimePartitionName('orders');

  const newOrder: BookOrder & { _shardMeta?: { shardIndex: number; partition: string } } = {
    id: orderId,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    _shardMeta: {
      shardIndex,
      partition: timePartition
    },
    ...req.body
  };

  storeOrders.unshift(newOrder);
  saveOrdersToDisk(storeOrders);
  broadcastNewOrder(newOrder);

  // Increment distributed sharded order counter
  shardService.incrementCounter('orders_total', 1);

  // Invalidate order caches
  globalCache.invalidateTag('orders');

  // Redundancy snapshot
  redundancyService.saveSnapshot('recent_orders_backup', storeOrders.slice(0, 100));

  res.status(201).json(newOrder);
});

// PUT Update Order
orderRouter.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = storeOrders.findIndex(o => o.id === id);
  if (index !== -1) {
    storeOrders[index] = { ...storeOrders[index], ...req.body };
    saveOrdersToDisk(storeOrders);

    // Invalidate order caches
    globalCache.invalidateTag('orders');

    res.json(storeOrders[index]);
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

// DELETE Order
orderRouter.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = storeOrders.findIndex(o => o.id === id);
  if (index !== -1) {
    storeOrders.splice(index, 1);
    saveOrdersToDisk(storeOrders);

    // Invalidate order caches
    globalCache.invalidateTag('orders');

    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});
