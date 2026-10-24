import { Router } from 'express';
import { prisma } from '../db';
import { BookOrder } from '../../types';
import { requireAdmin } from '../middleware/adminAuth';
import { validateBDPhone, validateDeliveryAddress } from '../../lib/validationUtils';
import { getDbSettings } from './settingsRoutes';

export const orderRouter = Router();

// Rate limiter for checkout
const checkoutAttempts = new Map<string, { count: number; firstAttempt: number }>();
function checkoutRateLimiter(req: any, res: any, next: any) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 15;

  const userRecord = checkoutAttempts.get(ip);
  if (!userRecord || now - userRecord.firstAttempt > windowMs) {
    checkoutAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (userRecord.count >= maxAttempts) {
    return res.status(429).json({ error: 'Too many order attempts. Please wait a minute and try again.' });
  }

  userRecord.count++;
  next();
}

// Live SSE Order Clients
const liveClients = new Set<(order: any) => void>();
function broadcastNewOrder(order: any) {
  for (const client of liveClients) {
    try {
      client(order);
    } catch {
      liveClients.delete(client);
    }
  }
}

// GET /api/orders/live - SSE Stream
orderRouter.get('/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const onNewOrder = (order: any) => {
    try {
      res.write(`data: ${JSON.stringify(order)}\n\n`);
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

function formatOrder(o: any): BookOrder {
  let items = o.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }

  return {
    id: o.id,
    customerName: o.customerName,
    name: o.customerName,
    phone: o.phone,
    address: o.address,
    email: o.email || undefined,
    couponCode: o.couponCode || undefined,
    couponDiscount: o.couponDiscount ? Number(o.couponDiscount) : undefined,
    paymentGateway: o.paymentGateway || undefined,
    paymentMethod: o.paymentMethod || undefined,
    deliveryFee: o.deliveryFee ? Number(o.deliveryFee) : undefined,
    deliveryCharge: Number(o.deliveryCharge || 0),
    deliveryZone: o.deliveryZone || undefined,
    district: o.district || undefined,
    thana: o.thana || undefined,
    deliveryArea: o.deliveryArea || undefined,
    productTitle: o.productTitle || undefined,
    productName: o.productName || o.productTitle || undefined,
    price: o.price ? Number(o.price) : undefined,
    unitPrice: o.unitPrice ? Number(o.unitPrice) : undefined,
    quantity: Number(o.quantity || 1),
    items: Array.isArray(items) ? items : [],
    totalPrice: o.totalPrice ? Number(o.totalPrice) : undefined,
    totalAmount: o.totalAmount ? Number(o.totalAmount) : (o.totalPrice ? Number(o.totalPrice) : undefined),
    trxId: o.trxId || undefined,
    senderPhone: o.senderPhone || undefined,
    orderType: o.orderType || 'storefront',
    source: o.source || undefined,
    status: o.status || 'Pending',
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    orderDate: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString()
  };
}

// GET All Orders - Live from DB
orderRouter.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders.map(formatOrder));
  } catch (error) {
    console.error('Failed to fetch orders from DB:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/track - Order Tracking by Phone or ID
orderRouter.get('/track', async (req, res) => {
  const query = String(req.query.q || req.query.phone || req.query.id || '').trim();
  if (!query) {
    return res.status(400).json({ success: false, message: 'Please provide a phone number or Order ID' });
  }

  const cleanDigits = query.replace(/\D/g, '');
  try {
    const allOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const matched = allOrders.filter(o => {
      const orderPhone = (o.phone || '').replace(/\D/g, '');
      const isPhoneMatch = Boolean(cleanDigits && orderPhone && (orderPhone.endsWith(cleanDigits) || cleanDigits.endsWith(orderPhone)));
      const isIdMatch = Boolean(o.id && o.id.toLowerCase() === query.toLowerCase());
      return isPhoneMatch || isIdMatch;
    });

    return res.json({
      success: true,
      orders: matched.map(formatOrder)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Order tracking failed' });
  }
});

// POST /api/orders/checkout - Atomic Server-Side Order Placement
orderRouter.post('/checkout', checkoutRateLimiter, async (req, res) => {
  try {
    const { items, customerName, phone, address, deliveryZone, deliveryMethodId, paymentMethod, senderPhone, trxId, couponCode, notes, email } = req.body;

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

    // 1. Authoritative DB Price Check
    const productIds = items.map((i: any) => i.productId || i.product?.id || i.id).filter(Boolean);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const productLookupMap = new Map(dbProducts.map(p => [p.id, p]));

    let calculatedSubtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const productId = item.productId || item.product?.id || item.id;
      const quantity = Math.max(1, parseInt(item.quantity || 1, 10));

      const matchedProduct = productLookupMap.get(productId);
      const unitPrice = matchedProduct ? Number(matchedProduct.price || 0) : Number(item.price || item.product?.price || 0);
      const regularPrice = matchedProduct ? Number(matchedProduct.regularPrice || unitPrice) : Number(item.regularPrice || unitPrice);
      const title = matchedProduct?.title || item.product?.title || item.title || 'Product';

      calculatedSubtotal += unitPrice * quantity;
      validatedItems.push({
        product: {
          id: productId,
          title,
          price: unitPrice,
          regularPrice,
          image: matchedProduct?.image || item.product?.image || item.product?.coverImage || '',
          category: matchedProduct?.category || item.product?.category || ''
        },
        quantity
      });
    }

    // 2. Delivery charge from DB settings
    const settings = await getDbSettings();
    let deliveryFee = 70;
    if (deliveryZone && String(deliveryZone).toLowerCase().includes('outside')) {
      deliveryFee = Number(settings.deliveryChargeOutsideDhaka || 120);
    } else {
      deliveryFee = Number(settings.deliveryChargeInsideDhaka || 70);
    }

    // 3. Coupon validation
    let couponDiscount = 0;
    if (couponCode) {
      try {
        const foundCoupon = await prisma.coupon.findUnique({
          where: { code: String(couponCode).trim().toUpperCase() }
        });
        if (foundCoupon && foundCoupon.status === 'Active') {
          if (foundCoupon.type === 'percentage') {
            couponDiscount = Math.round(calculatedSubtotal * (foundCoupon.discount / 100));
            if (foundCoupon.maxDiscount && foundCoupon.maxDiscount > 0) {
              couponDiscount = Math.min(couponDiscount, foundCoupon.maxDiscount);
            }
          } else {
            couponDiscount = Math.min(calculatedSubtotal, foundCoupon.discount);
          }
        }
      } catch {}
    }

    const calculatedGrandTotal = Math.max(0, calculatedSubtotal + deliveryFee - couponDiscount);
    const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const createdOrder = await prisma.order.create({
      data: {
        id: orderId,
        customerName: String(customerName).trim(),
        phone: phoneVal.cleanedPhone,
        address: addressVal.cleanedAddress,
        deliveryZone: deliveryZone || 'inside_dhaka',
        email: email ? String(email).trim() : null,
        deliveryFee,
        deliveryCharge: deliveryFee,
        items: JSON.stringify(validatedItems),
        quantity: validatedItems.reduce((sum, i) => sum + i.quantity, 0),
        price: calculatedSubtotal,
        totalPrice: calculatedGrandTotal,
        totalAmount: calculatedGrandTotal,
        productName: validatedItems.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
        productTitle: validatedItems.map(i => `${i.product.title} (x${i.quantity})`).join(', '),
        status: 'Pending',
        orderType: 'storefront',
        paymentMethod: paymentMethod || 'COD',
        paymentGateway: paymentMethod || 'Cash on Delivery',
        senderPhone: senderPhone ? String(senderPhone).trim() : null,
        trxId: trxId ? String(trxId).trim() : null,
        couponCode: couponCode ? String(couponCode).trim() : null,
        couponDiscount: couponDiscount > 0 ? couponDiscount : null
      }
    });

    const formatted = formatOrder(createdOrder);
    broadcastNewOrder(formatted);

    return res.status(201).json({
      success: true,
      order: formatted
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Server error during checkout validation.' });
  }
});

// POST Create Order (Admin manual create)
orderRouter.post('/', checkoutRateLimiter, async (req, res) => {
  try {
    const rawPhone = req.body.phone || req.body.customerPhone;
    const rawAddress = req.body.address || req.body.customerAddress;

    const orderId = req.body.id || `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const items = req.body.items ? (typeof req.body.items === 'string' ? req.body.items : JSON.stringify(req.body.items)) : null;

    const created = await prisma.order.create({
      data: {
        id: orderId,
        customerName: req.body.customerName || req.body.name || 'Customer',
        phone: rawPhone || '',
        address: rawAddress || '',
        email: req.body.email || null,
        deliveryZone: req.body.deliveryZone || null,
        district: req.body.district || null,
        thana: req.body.thana || null,
        deliveryArea: req.body.deliveryArea || null,
        deliveryFee: req.body.deliveryFee ? Number(req.body.deliveryFee) : null,
        deliveryCharge: req.body.deliveryCharge ? Number(req.body.deliveryCharge) : 0,
        items,
        quantity: req.body.quantity ? Number(req.body.quantity) : 1,
        price: req.body.price ? Number(req.body.price) : null,
        unitPrice: req.body.unitPrice ? Number(req.body.unitPrice) : null,
        totalPrice: req.body.totalPrice ? Number(req.body.totalPrice) : null,
        totalAmount: req.body.totalAmount ? Number(req.body.totalAmount) : (req.body.totalPrice ? Number(req.body.totalPrice) : null),
        productName: req.body.productName || req.body.productTitle || null,
        productTitle: req.body.productTitle || req.body.productName || null,
        status: req.body.status || 'Pending',
        orderType: req.body.orderType || 'storefront',
        paymentMethod: req.body.paymentMethod || 'COD',
        paymentGateway: req.body.paymentGateway || req.body.paymentMethod || 'Cash on Delivery',
        trxId: req.body.trxId || null,
        senderPhone: req.body.senderPhone || null,
        couponCode: req.body.couponCode || null,
        couponDiscount: req.body.couponDiscount ? Number(req.body.couponDiscount) : null
      }
    });

    const formatted = formatOrder(created);
    broadcastNewOrder(formatted);
    res.status(201).json(formatted);
  } catch (error) {
    console.error('Failed to create order in DB:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT Update Order
orderRouter.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const data = { ...req.body };
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    if (data.items && typeof data.items !== 'string') {
      data.items = JSON.stringify(data.items);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...data,
        price: data.price !== undefined ? Number(data.price) : undefined,
        totalPrice: data.totalPrice !== undefined ? Number(data.totalPrice) : undefined,
        totalAmount: data.totalAmount !== undefined ? Number(data.totalAmount) : undefined,
        deliveryCharge: data.deliveryCharge !== undefined ? Number(data.deliveryCharge) : undefined,
        quantity: data.quantity !== undefined ? Number(data.quantity) : undefined
      }
    });

    res.json(formatOrder(updated));
  } catch (error) {
    console.error('Failed to update order in DB:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE Order
orderRouter.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.order.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (error) {
    console.error('Failed to delete order in DB:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});
