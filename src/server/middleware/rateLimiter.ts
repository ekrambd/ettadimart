import type { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
}) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please wait a moment and try again.',
    statusCode = 429
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Periodically clean up expired entries every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(ip);
      }
    }
  }, 2 * 60 * 1000);

  // Unref interval so it does not block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const rawIp = req.header('cf-connecting-ip') || 
                  req.header('x-forwarded-for')?.split(',')[0] || 
                  req.ip || 
                  req.socket.remoteAddress || 
                  'unknown';
    const ip = String(rawIp).trim();
    const now = Date.now();

    const record = hits.get(ip);

    if (!record || now > record.resetTime) {
      hits.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(statusCode).json({
        success: false,
        error: message,
        retryAfterSeconds
      });
    }

    next();
  };
}

/** Anti-spam limiter for order checkout: Max 6 checkout attempts per minute per IP */
export const checkoutRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 6,
  message: 'Order submission limit reached. Please wait a minute before placing another order.'
});

/** Anti brute-force limiter for admin & customer logins: Max 10 attempts per 5 minutes per IP */
export const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please wait 5 minutes before trying again.'
});
