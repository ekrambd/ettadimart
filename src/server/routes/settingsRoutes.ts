import { Router } from 'express';
import { prisma } from '../db';
import { SteadfastCourierService } from '../services/steadfastService';
import { PathaoCourierService } from '../services/pathaoService';
import { FacebookCapiService } from '../services/facebookCapiService';
import { requireAdmin } from '../middleware/adminAuth';
import { circuitBreakerRegistry } from '../services/circuitBreaker';

export const settingsRouter = Router();
export const courierRouter = Router();
export const facebookRouter = Router();

export async function getDbSettings(): Promise<any> {
  try {
    const record = await prisma.setting.findUnique({ where: { id: 'global' } });
    if (record && record.value) {
      return JSON.parse(record.value);
    }
  } catch (err) {
    console.warn('[settings] DB read error:', err);
  }
  return {
    storeName: 'ETTADI MART',
    companyName: 'Ettadi Mart',
    storeTagline: 'China Imported Varieties & Smart Lifestyle Products',
    topAnnouncementText: '🔥 চায়না থেকে সরাসরি আমদানিকৃত সেরা ট্রেন্ডি গ্যাজেটস ও ভ্যারাইটিজ সমগ্র | সারা দেশে ক্যাশ অন ডেলিভারি!',
    contactEmail: 'support@ettadimart.com',
    contactPhone: '01726275850',
    storeAddress: 'Dhaka, Bangladesh',
    deliveryChargeInsideDhaka: 70,
    deliveryChargeOutsideDhaka: 120,
    storeLogo: '/ettadimart-logo.svg',
    storeFavicon: '/ettadimart-favicon.svg',
    categories: [],
    heroBanners: []
  };
}

export async function saveDbSettings(settings: any): Promise<any> {
  const current = await getDbSettings();
  const merged = { ...current, ...settings };
  await prisma.setting.upsert({
    where: { id: 'global' },
    create: { id: 'global', value: JSON.stringify(merged) },
    update: { value: JSON.stringify(merged) }
  });
  return merged;
}

// Settings Routes - Instant Fresh Data directly from DB (No cache)
const handleGetSettings = async (_req: any, res: any) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const settings = await getDbSettings();
  const { 
    pixelId: _pixelId, 
    metaApiToken: _metaApiToken, 
    steadfastApiKey: _steadfastApiKey, 
    steadfastSecretKey: _steadfastSecretKey,
    pathaoClientSecret: _pathaoClientSecret,
    pathaoClientPassword: _pathaoClientPassword,
    adminCustomPassword: _adminCustomPassword,
    ...publicSettings 
  } = settings;
  res.json(publicSettings);
};

const handlePostSettings = async (req: any, res: any) => {
  const current = await getDbSettings();
  const { 
    pixelId: _pixelId, 
    metaApiToken: _metaApiToken, 
    steadfastApiKey: _steadfastApiKey, 
    steadfastSecretKey: _steadfastSecretKey,
    adminCustomPassword: _adminCustomPassword,
    ...safeSettings 
  } = req.body;

  if (current?.adminCustomPassword && !safeSettings.adminCustomPassword) {
    safeSettings.adminCustomPassword = current.adminCustomPassword;
  }

  const updated = await saveDbSettings(safeSettings);
  const { adminCustomPassword: _pass, ...cleanUpdated } = updated;
  res.json({ success: true, settings: cleanUpdated });
};

settingsRouter.get('/', handleGetSettings);
settingsRouter.get('/ecom', handleGetSettings);
settingsRouter.post('/', requireAdmin, handlePostSettings);
settingsRouter.post('/ecom', requireAdmin, handlePostSettings);

// ==========================================
// STEADFAST COURIER DISPATCH WITH CIRCUIT BREAKER
// ==========================================
courierRouter.get('/steadfast/test', requireAdmin, async (_req, res) => {
  try {
    const result = await circuitBreakerRegistry.steadfastCourier.execute(
      () => SteadfastCourierService.testConnection()
    );
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Steadfast connection failed' });
  }
});

courierRouter.get('/steadfast/status/:trackingCode', requireAdmin, async (req, res) => {
  try {
    const result = await circuitBreakerRegistry.steadfastCourier.execute(
      () => SteadfastCourierService.getStatus(req.params.trackingCode)
    );
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Steadfast status check failed' });
  }
});

courierRouter.post('/steadfast/dispatch', requireAdmin, async (req, res) => {
  try {
    const result = await circuitBreakerRegistry.steadfastCourier.execute(
      () => SteadfastCourierService.dispatchOrder(req.body)
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Dispatch failed' });
  }
});

courierRouter.get('/steadfast/fraud-check/:phone', requireAdmin, async (req, res) => {
  try {
    const result = await circuitBreakerRegistry.steadfastCourier.execute(
      () => SteadfastCourierService.checkDeliveryRatio(req.params.phone)
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Courier fraud check failed' });
  }
});

// ==========================================
// PATHAO COURIER DISPATCH & INTEGRATION
// ==========================================
courierRouter.post('/pathao/test', requireAdmin, async (req, res) => {
  try {
    const creds = req.body?.credentials || req.body;
    const result = await PathaoCourierService.testConnection(creds);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Pathao credentials connection test failed' });
  }
});

courierRouter.get('/pathao/stores', requireAdmin, async (req, res) => {
  try {
    const creds = req.query as any;
    const result = await PathaoCourierService.getStores(creds);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Failed to fetch Pathao stores' });
  }
});

courierRouter.get('/pathao/cities', requireAdmin, async (req, res) => {
  try {
    const result = await PathaoCourierService.getCities();
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Failed to fetch Pathao cities' });
  }
});

courierRouter.get('/pathao/cities/:cityId/zones', requireAdmin, async (req, res) => {
  try {
    const result = await PathaoCourierService.getZones(req.params.cityId);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Failed to fetch Pathao zones' });
  }
});

courierRouter.get('/pathao/zones/:zoneId/areas', requireAdmin, async (req, res) => {
  try {
    const result = await PathaoCourierService.getAreas(req.params.zoneId);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Failed to fetch Pathao areas' });
  }
});

courierRouter.post('/pathao/dispatch', requireAdmin, async (req, res) => {
  try {
    const result = await PathaoCourierService.dispatchOrder(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Pathao dispatch failed' });
  }
});

courierRouter.get('/pathao/status/:consignmentId', requireAdmin, async (req, res) => {
  try {
    const result = await PathaoCourierService.getStatus(req.params.consignmentId);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Pathao status check failed' });
  }
});

// Pathao Webhook Receiver
courierRouter.post('/pathao/webhook', async (req, res) => {
  try {
    const eventData = req.body;
    console.log('[Pathao Webhook Event Received]:', JSON.stringify(eventData));
    res.status(200).json({ success: true, message: 'Webhook event processed' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Meta Facebook CAPI Protected by Circuit Breaker
facebookRouter.post('/capi', async (req, res) => {
  const { eventName, eventId, eventData, userData, eventSourceUrl } = req.body || {};
  if (!eventName || !eventId || !eventSourceUrl) {
    res.status(400).json({ success: false, message: 'eventName, eventId, and eventSourceUrl are required' });
    return;
  }
  const forwardedFor = req.header('cf-connecting-ip') || req.header('x-forwarded-for');
  const clientIpAddress = (req.header('cf-connecting-ip') || forwardedFor?.split(',')[0] || req.ip || req.socket.remoteAddress || '').trim();

  try {
    const result = await circuitBreakerRegistry.metaPixel.execute(async () => {
      return FacebookCapiService.sendEvent(eventName, {
        eventId,
        eventSourceUrl,
        userAgent: req.header('user-agent'),
        customData: eventData || {}
      }, {
        ...userData,
        clientIpAddress
      });
    }, async () => {
      return { success: false, status: 503, message: 'Meta CAPI circuit breaker is open (fast-fallback)' };
    });

    res.status(result.success ? 200 : (result.status || 502)).json(result);
  } catch (err: any) {
    res.status(502).json({ success: false, message: err?.message || 'Meta CAPI failed' });
  }
});
