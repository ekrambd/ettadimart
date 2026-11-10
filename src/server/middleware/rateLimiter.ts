/**
 * In-Memory High-Throughput Sliding Window Rate Limiter
 * Ettadi Mart Enterprise Scaling Suite
 * 
 * Protects server from burst bot flooding, order scalping, and DDoS
 * Zero external package dependency (runs 100% in memory)
 */

import { Request, Response, NextFunction } from 'express';

interface ClientRecord {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, ClientRecord>();

// Periodic memory garbage collection every 60s
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipMap.entries()) {
    if (record.resetAt <= now) {
      ipMap.delete(ip);
    }
  }
}, 60000).unref();

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const { windowMs, maxRequests, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Whitelist static assets, health checks, and localhost
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
               req.socket.remoteAddress || 
               'unknown-client';

    if (ip === '127.0.0.1' || ip === '::1' || req.path.startsWith('/health')) {
      return next();
    }

    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();
    const existing = ipMap.get(key);

    if (!existing || existing.resetAt <= now) {
      ipMap.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    if (existing.count >= maxRequests) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.status(429).json({
        error: message || 'Too many requests. Please slow down and try again shortly.',
        retryAfterSeconds: retryAfter
      });
      return;
    }

    existing.count++;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - existing.count);
    next();
  };
}

// Global General API Limiter: 300 requests per minute
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'API rate limit exceeded. Please wait a moment.'
});

// Checkout & Order Creation Limiter: 25 orders per minute per IP
export const checkoutRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 25,
  message: 'Checkout rate limit exceeded. Please wait a moment before submitting again.'
});

// Admin Auth Login Limiter: 10 login attempts per minute (Anti-brute-force)
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many login attempts. Please wait 1 minute before trying again.'
});
