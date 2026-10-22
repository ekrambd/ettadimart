import { globalCache } from './cacheEngine';
import { circuitBreakerRegistry } from './circuitBreaker';

export interface RedundantDataSource<T> {
  name: string;
  fetch: () => Promise<T>;
  priority: number; // Lower number = higher priority
}

export interface RedundancyResult<T> {
  data: T;
  source: string;
  isFallback: boolean;
  latencyMs: number;
}

/**
 * Enterprise Multi-Source Redundancy & High Availability Service
 * Implements cascading fallback pipeline with circuit breakers and micro-caching.
 */
export class RedundancyService {
  private static instance: RedundancyService;
  private persistentSnapshots: Map<string, unknown> = new Map();

  private constructor() {}

  public static getInstance(): RedundancyService {
    if (!RedundancyService.instance) {
      RedundancyService.instance = new RedundancyService();
    }
    return RedundancyService.instance;
  }

  /**
   * Execute multi-source redundant query.
   * Steps:
   * 1. Check ultra-fast Tier 1 Memory Cache (0.1ms)
   * 2. Attempt primary source with circuit breaker protection
   * 3. Fallback to secondary source (e.g. REST Replica or Local DB)
   * 4. Fallback to Last-Known-Good persistent memory snapshot
   * 5. Fallback to hardcoded default payload if provided
   */
  public async executeWithRedundancy<T>(
    cacheKey: string,
    sources: RedundantDataSource<T>[],
    defaultFallback?: T
  ): Promise<RedundancyResult<T>> {
    const startTime = Date.now();

    // 1. Check L1 Memory Cache
    const cached = globalCache.get<T>(cacheKey);
    if (cached.data !== null) {
      return {
        data: cached.data,
        source: 'L1_MEMORY_CACHE',
        isFallback: false,
        latencyMs: Date.now() - startTime
      };
    }

    // Sort sources by priority
    const sortedSources = [...sources].sort((a, b) => a.priority - b.priority);

    // 2. Cascade through available sources
    for (let i = 0; i < sortedSources.length; i++) {
      const source = sortedSources[i];
      try {
        const fetchStart = Date.now();
        const data = await circuitBreakerRegistry.firestore.execute(
          () => source.fetch(),
          async () => { throw new Error(`Source ${source.name} circuit open`); }
        );

        if (data !== undefined && data !== null) {
          // Update cache & snapshot
          globalCache.set(cacheKey, data, { ttlSeconds: 60, staleWhileRevalidateSeconds: 180 });
          this.persistentSnapshots.set(cacheKey, data);

          return {
            data,
            source: source.name,
            isFallback: i > 0,
            latencyMs: Date.now() - fetchStart
          };
        }
      } catch (err: any) {
        console.warn(`[RedundancyService] Source '${source.name}' failed: ${err?.message || err}. Falling back to next source...`);
      }
    }

    // 3. Last-Known-Good Memory Snapshot
    if (this.persistentSnapshots.has(cacheKey)) {
      console.info(`[RedundancyService] Recovered from persistent snapshot for ${cacheKey}`);
      return {
        data: this.persistentSnapshots.get(cacheKey) as T,
        source: 'LAST_KNOWN_GOOD_SNAPSHOT',
        isFallback: true,
        latencyMs: Date.now() - startTime
      };
    }

    // 4. Default Fallback
    if (defaultFallback !== undefined) {
      console.warn(`[RedundancyService] Using default fallback for ${cacheKey}`);
      return {
        data: defaultFallback,
        source: 'STATIC_FALLBACK',
        isFallback: true,
        latencyMs: Date.now() - startTime
      };
    }

    throw new Error(`[RedundancyService] All redundant data sources failed for key '${cacheKey}'`);
  }

  /**
   * Save a manual recovery snapshot
   */
  public saveSnapshot<T>(key: string, data: T): void {
    this.persistentSnapshots.set(key, data);
  }

  /**
   * Get all active snapshots
   */
  public getAllSnapshots(): Record<string, unknown> {
    return Object.fromEntries(this.persistentSnapshots.entries());
  }
}

export const redundancyService = RedundancyService.getInstance();
