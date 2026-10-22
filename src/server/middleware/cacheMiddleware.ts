import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { globalCache } from '../services/cacheEngine';

export interface HttpCacheOptions {
  ttlSeconds?: number;
  staleWhileRevalidateSeconds?: number;
  tag?: string;
  isPrivate?: boolean;
}

/**
 * Enterprise HTTP Caching & Micro-caching Middleware
 * - Intercepts GET requests
 * - Evaluates client 'If-None-Match' ETag header $\rightarrow$ returns 304 Not Modified immediately without body transmission
 * - Serves response from Tier-1 memory cache on cache hits
 * - Attaches standard Cache-Control, ETag, and X-Cache headers
 */
export function cacheResponse(options: HttpCacheOptions = {}) {
  const ttl = options.ttlSeconds ?? 60;
  const swr = options.staleWhileRevalidateSeconds ?? 120;
  const tag = options.tag ?? 'general';
  const isPrivate = options.isPrivate ?? false;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache safe GET / HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const cacheKey = `http:${req.method}:${req.originalUrl || req.url}`;
    const cached = globalCache.get<{ body: any; etag: string; contentType: string }>(cacheKey);

    const clientEtag = req.headers['if-none-match'];

    if (cached.data) {
      // Check 304 Not Modified
      if (clientEtag && clientEtag === cached.data.etag) {
        res.setHeader('ETag', cached.data.etag);
        res.setHeader('Cache-Control', `${isPrivate ? 'private' : 'public'}, max-age=${ttl}, stale-while-revalidate=${swr}`);
        res.setHeader('X-Cache', 'HIT-304');
        return res.status(304).end();
      }

      // Serve cached content
      res.setHeader('ETag', cached.data.etag);
      res.setHeader('Content-Type', cached.data.contentType || 'application/json');
      res.setHeader('Cache-Control', `${isPrivate ? 'private' : 'public'}, max-age=${ttl}, stale-while-revalidate=${swr}`);
      res.setHeader('X-Cache', cached.isStale ? 'STALE-HIT' : 'HIT');
      return res.status(200).send(cached.data.body);
    }

    // Intercept response to capture and cache
    res.setHeader('X-Cache', 'MISS');
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    const storeAndSend = (bodyContent: any, isJson = false) => {
      // Only cache successful 200 OK responses
      if (res.statusCode === 200) {
        const payloadString = typeof bodyContent === 'string' ? bodyContent : JSON.stringify(bodyContent);
        const hash = crypto.createHash('sha1').update(payloadString).digest('hex');
        const etag = `"${hash}"`;

        const contentType = (res.getHeader('Content-Type') as string) || (isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `${isPrivate ? 'private' : 'public'}, max-age=${ttl}, stale-while-revalidate=${swr}`);

        // Check if matching client ETag on fresh compute
        if (clientEtag && clientEtag === etag) {
          globalCache.set(cacheKey, { body: bodyContent, etag, contentType }, {
            ttlSeconds: ttl,
            staleWhileRevalidateSeconds: swr,
            tags: [tag, 'http_routes']
          });
          return res.status(304).end();
        }

        globalCache.set(cacheKey, { body: bodyContent, etag, contentType }, {
          ttlSeconds: ttl,
          staleWhileRevalidateSeconds: swr,
          tags: [tag, 'http_routes']
        });
      }

      return isJson ? originalJson(bodyContent) : originalSend(bodyContent);
    };

    res.json = (body: any) => storeAndSend(body, true);
    res.send = (body: any) => storeAndSend(body, false);

    next();
  };
}
