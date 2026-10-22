import { Router, Request, Response } from 'express';
import { telemetryService } from '../services/telemetryService';
import { inventoryReservationService } from '../services/inventoryReservationService';

export const benchmarkRouter = Router();

/**
 * GET /api/system/metrics
 * Live system telemetry, RPS, cache hit ratio, and latency percentiles
 */
benchmarkRouter.get('/metrics', (_req: Request, res: Response) => {
  try {
    const metrics = telemetryService.getMetrics();
    res.json({ ok: true, metrics });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/system/benchmark
 * Run synthetic 500-request high-concurrency benchmark
 */
benchmarkRouter.post('/benchmark', async (req: Request, res: Response) => {
  try {
    const concurrency = Math.min(Math.max(Number(req.body.concurrency) || 500, 50), 2000);
    const benchmark = await telemetryService.runBenchmark(concurrency);
    res.json({ ok: true, benchmark });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/system/reserve-stock
 * Reserve temporary 10-minute hold for an item during shopping/checkout
 */
benchmarkRouter.post('/reserve-stock', (req: Request, res: Response) => {
  try {
    const { sessionId, productId, quantity = 1 } = req.body;
    if (!sessionId || !productId) {
      res.status(400).json({ ok: false, error: 'sessionId and productId are required' });
      return;
    }

    const result = inventoryReservationService.reserve(sessionId, productId, quantity);
    res.json({ ok: result.success, ...result });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/system/release-stock
 * Release temporary hold
 */
benchmarkRouter.post('/release-stock', (req: Request, res: Response) => {
  try {
    const { sessionId, productId } = req.body;
    if (!sessionId || !productId) {
      res.status(400).json({ ok: false, error: 'sessionId and productId are required' });
      return;
    }

    const released = inventoryReservationService.release(sessionId, productId);
    res.json({ ok: true, released });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/system/stock-status/:productId
 * Get reserved count for a product
 */
benchmarkRouter.get('/stock-status/:productId', (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const reservedCount = inventoryReservationService.getReservedCount(productId);
    res.json({ ok: true, productId, reservedCount });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
