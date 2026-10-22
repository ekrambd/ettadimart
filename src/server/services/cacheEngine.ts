import { EventEmitter } from 'events';

export interface CacheOptions {
  ttlSeconds?: number;
  staleWhileRevalidateSeconds?: number;
  tags?: string[];
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleUntil: number;
  tags: Set<string>;
  sizeBytes: number;
  createdAt: number;
  lastAccessedAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  keysCount: number;
  estimatedMemoryBytes: number;
  hitRatio: number;
}

/**
 * Enterprise Tier-1 High Performance In-Memory Cache Engine
 * Features:
 * - Microsecond retrieval speeds
 * - LRU (Least Recently Used) automatic eviction policy
 * - TTL (Time-To-Live) and SWR (Stale-While-Revalidate)
 * - Tag-based mass invalidation (e.g. invalidate all 'products:*')
 * - Memory footprint bounded bounds
 */
export class CacheEngine extends EventEmitter {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private maxItems: number;
  private defaultTtlMs: number;
  private hits = 0;
  private misses = 0;
  private staleHits = 0;
  private totalSizeBytes = 0;

  constructor(maxItems = 10000, defaultTtlSeconds = 60) {
    super();
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlSeconds * 1000;

    // Periodically prune fully expired keys (every 60 seconds)
    const cleanupInterval = setInterval(() => this.pruneExpired(), 60000);
    if (typeof cleanupInterval.unref === 'function') {
      cleanupInterval.unref();
    }
  }

  /**
   * Get a cached item. Supports Stale-While-Revalidate.
   */
  public get<T>(key: string): { data: T | null; isStale: boolean } {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      return { data: null, isStale: false };
    }

    const now = Date.now();
    entry.lastAccessedAt = now;

    // Fresh
    if (now <= entry.expiresAt) {
      this.hits++;
      return { data: entry.value, isStale: false };
    }

    // Stale but within SWR grace window
    if (now <= entry.staleUntil) {
      this.staleHits++;
      this.emit('stale_access', key);
      return { data: entry.value, isStale: true };
    }

    // Fully expired
    this.delete(key);
    this.misses++;
    return { data: null, isStale: false };
  }

  /**
   * Set an item in cache with TTL, SWR grace window, and tags
   */
  public set<T>(key: string, value: T, options?: CacheOptions): void {
    const now = Date.now();
    const ttlMs = (options?.ttlSeconds ? options.ttlSeconds * 1000 : this.defaultTtlMs);
    const swrMs = options?.staleWhileRevalidateSeconds ? options.staleWhileRevalidateSeconds * 1000 : ttlMs * 2;

    const expiresAt = now + ttlMs;
    const staleUntil = expiresAt + swrMs;
    const tags = new Set<string>(options?.tags || []);

    // Rough memory size estimation
    let sizeBytes = 128;
    try {
      const serialized = JSON.stringify(value);
      sizeBytes = serialized ? serialized.length * 2 : 128;
    } catch {
      sizeBytes = 256;
    }

    // Evict least recently used if at capacity
    if (this.store.size >= this.maxItems && !this.store.has(key)) {
      this.evictLRU();
    }

    // If updating existing entry, adjust memory
    const existing = this.store.get(key);
    if (existing) {
      this.totalSizeBytes -= existing.sizeBytes;
      for (const tag of existing.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      staleUntil,
      tags,
      sizeBytes,
      createdAt: now,
      lastAccessedAt: now,
    };

    this.store.set(key, entry as CacheEntry<unknown>);
    this.totalSizeBytes += sizeBytes;

    // Index tags
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    this.emit('set', key, tags);
  }

  /**
   * Delete a specific key
   */
  public delete(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    this.totalSizeBytes = Math.max(0, this.totalSizeBytes - entry.sizeBytes);
    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(key);
    }

    this.store.delete(key);
    this.emit('delete', key);
    return true;
  }

  /**
   * Invalidate all cache entries matching a tag (e.g. 'products', 'orders', 'settings')
   */
  public invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) return 0;

    let count = 0;
    const keysArray = Array.from(keys);
    for (const key of keysArray) {
      if (this.delete(key)) {
        count++;
      }
    }
    this.tagIndex.delete(tag);
    this.emit('tag_invalidated', tag, count);
    return count;
  }

  /**
   * Helper: wrap a fetch function with cache
   */
  public async wrap<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
    const { data, isStale } = this.get<T>(key);

    if (data !== null) {
      if (isStale) {
        // Trigger background revalidation
        Promise.resolve().then(async () => {
          try {
            const fresh = await fetcher();
            this.set(key, fresh, options);
          } catch (err) {
            console.warn(`[CacheEngine] Background revalidation failed for ${key}:`, err);
          }
        });
      }
      return data;
    }

    const fresh = await fetcher();
    this.set(key, fresh, options);
    return fresh;
  }

  /**
   * Clear entire cache
   */
  public clear(): void {
    this.store.clear();
    this.tagIndex.clear();
    this.totalSizeBytes = 0;
    this.emit('clear');
  }

  /**
   * Get telemetry stats
   */
  public getStats(): CacheStats {
    const totalRequests = this.hits + this.misses + this.staleHits;
    const hitRatio = totalRequests > 0 ? (this.hits + this.staleHits) / totalRequests : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      staleHits: this.staleHits,
      keysCount: this.store.size,
      estimatedMemoryBytes: this.totalSizeBytes,
      hitRatio: Number(hitRatio.toFixed(4)),
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.staleUntil) {
        this.delete(key);
      }
    }
  }
}

// Global shared cache instance
export const globalCache = new CacheEngine(5000, 60);
export const cacheEngine = globalCache;
