import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { productRouter } from './routes/productRoutes';
import { orderRouter } from './routes/orderRoutes';
import { settingsRouter, courierRouter, facebookRouter } from './routes/settingsRoutes';
import { backupRouter } from './routes/backupRoutes';
import { benchmarkRouter } from './routes/benchmarkRoutes';
import { aiRouter } from './routes/aiRoutes';
import { uploadRouter } from './routes/uploadRoutes';
import { authRouter } from './routes/authRoutes';
import { categoryRouter } from './routes/categoryRoutes';
import { sliderRouter } from './routes/sliderRoutes';
import { customerRouter } from './routes/customerRoutes';
import { couponRouter } from './routes/couponRoutes';
import { reviewRouter } from './routes/reviewRoutes';
import { brandRouter } from './routes/brandRoutes';
import { contactRouter } from './routes/contactRoutes';
import { landingRouter } from './routes/landingRoutes';
import { instituteRouter } from './routes/instituteRoutes';
import { taxRouter } from './routes/taxRoutes';
import { driverRouter } from './routes/driverRoutes';
import { supplierRouter } from './routes/supplierRoutes';
import { flashSaleRouter } from './routes/flashSaleRoutes';
import { subscriptionRouter } from './routes/subscriptionRoutes';
import { vendorRouter } from './routes/vendorRoutes';
import { attributeRouter } from './routes/attributeRoutes';
import { unitRouter } from './routes/unitRoutes';
import { purchaseRouter } from './routes/purchaseRoutes';
import { imageRouter } from './routes/imageCDN';

import { globalCache } from './services/cacheEngine';
import { shardService } from './services/shardService';
import { circuitBreakerRegistry } from './services/circuitBreaker';
import { backupEngine } from './services/backupEngine';
import { telemetryService } from './services/telemetryService';

export const app = express();

// Trust reverse proxies (Cloudflare & Nginx) for real client IP and HTTPS protocol detection
app.set('trust proxy', true);

// ==========================================
// COMPREHENSIVE SECURITY HEADERS (Helmet Equivalent)
// ==========================================
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.removeHeader('X-Powered-By'); // Hide Express signature
  next();
});

app.use(express.json({ limit: '2mb' }));

// Initialize automated periodic database backups
backupEngine.startScheduledBackups(6);

// ==========================================
// SYSTEM DESIGN MONITORING & TELEMETRY
// ==========================================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Ettadi Mart High-Availability E-Commerce Engine',
    workerPid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/system/metrics', (_req, res) => {
  const metrics = telemetryService.getMetrics();
  res.json({
    success: true,
    ok: true,
    metrics,
    system: {
      platform: os.platform(),
      cpus: os.cpus().length,
      freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      processMemoryUsageMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      workerPid: process.pid,
      uptimeSeconds: Math.round(process.uptime())
    },
    cache: globalCache.getStats(),
    circuitBreakers: {
      fcm: circuitBreakerRegistry.fcm.getStats(),
      steadfast: circuitBreakerRegistry.steadfastCourier.getStats(),
      metaPixel: circuitBreakerRegistry.metaPixel.getStats(),
      geminiAI: circuitBreakerRegistry.geminiAI.getStats(),
      firestore: circuitBreakerRegistry.firestore.getStats()
    }
  });
});

app.get('/api/system/cache', (_req, res) => {
  res.json({
    success: true,
    stats: globalCache.getStats()
  });
});

app.post('/api/system/cache/clear', (_req, res) => {
  globalCache.clear();
  res.json({ success: true, message: 'All in-memory caches purged across worker' });
});

// ==========================================
// ROUTE REGISTRATIONS
// ==========================================
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/courier', courierRouter);
app.use('/api/facebook', facebookRouter);
app.use('/api/admin/backups', backupRouter);
app.use('/api/system', benchmarkRouter);
app.use('/api/ai', aiRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/sliders', sliderRouter);
app.use('/api/customers', customerRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/brands', brandRouter);
app.use('/api/contact-messages', contactRouter);
app.use('/api/landing-pages', landingRouter);
app.use('/api/institute', instituteRouter);
app.use('/api/taxes', taxRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/flash-sales', flashSaleRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/vendors', vendorRouter);
app.use('/api/attributes', attributeRouter);
app.use('/api/units', unitRouter);
app.use('/api/purchases', purchaseRouter);
app.use('/cdn', imageRouter);

// Local media static file serving
const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(publicUploadsDir, {
  maxAge: '1y',
  immutable: true
}));

// Service Worker endpoint
app.get('/firebase-messaging-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', () => self.clients.claim());
  `);
});

// Send Push Notification endpoint via FCM legacy server protocol protected by Circuit Breaker
app.post('/api/notifications/send', async (req, res) => {
  const { title, body, icon, url, tokens } = req.body;
  
  if (!title || !body || !tokens || !Array.isArray(tokens) || tokens.length === 0) {
    res.status(400).json({ success: false, message: 'title, body, and non-empty tokens array are required' });
    return;
  }
  try {
    const { getDbSettings } = await import('./routes/settingsRoutes');
    const storeSettings = await getDbSettings();
    const serverKey = storeSettings?.fcmServerKey || process.env.FCM_SERVER_KEY;

    if (!serverKey) {
      res.status(400).json({ 
        success: false, 
        message: 'FCM Server Key is not configured. Please set it in Admin Settings.' 
      });
      return;
    }

    const result = await circuitBreakerRegistry.fcm.execute(async () => {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${serverKey}`
        },
        body: JSON.stringify({
          registration_ids: tokens,
          notification: {
            title,
            body,
            icon: icon || '/logo.png',
            sound: 'default'
          },
          data: {
            url: url || '/'
          }
        })
      });
      return await response.json();
    });
    
    res.json({ 
      success: true, 
      multicast_id: (result as any).multicast_id,
      success_count: (result as any).success,
      failure_count: (result as any).failure,
      results: (result as any).results || []
    });
  } catch (err: any) {
    console.error('Failed to send push notifications:', err);
    res.status(502).json({ success: false, error: err.message || 'Failed to deliver notifications via FCM' });
  }
});
