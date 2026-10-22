export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of consecutive failures before opening circuit
  resetTimeoutMs?: number;   // Time in ms before attempting half-open probe
  timeoutMs?: number;        // Maximum execution timeout per request in ms
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

/**
 * Enterprise Stateful Circuit Breaker
 * Prevents downstream external failures (e.g. Courier APIs, FCM notifications, AI calls)
 * from exhausting resources and slowing down server threads.
 */
export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failureThreshold: number;
  private resetTimeoutMs: number;
  private timeoutMs: number;
  private consecutiveFailures = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange: number = Date.now();

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 15000;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  /**
   * Execute an async action protected by this circuit breaker.
   * If the circuit is open, it executes fallback immediately without hitting the downstream server.
   */
  public async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T> | T): Promise<T> {
    const now = Date.now();

    // Check if OPEN state has expired and should transition to HALF_OPEN
    if (this.state === 'OPEN') {
      if (now - this.lastStateChange > this.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      } else {
        if (fallback) {
          return fallback();
        }
        throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN (Fast-fail triggered).`);
      }
    }

    try {
      // Run action with strict timeout
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`[CircuitBreaker:${this.name}] Execution timed out after ${this.timeoutMs}ms`)), this.timeoutMs)
        )
      ]);

      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);
      if (fallback) {
        return fallback();
      }
      throw err;
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    this.consecutiveFailures = 0;
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED');
    }
  }

  private onFailure(err: any): void {
    this.totalFailures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    console.warn(`[CircuitBreaker:${this.name}] Action failed (${this.consecutiveFailures}/${this.failureThreshold}): ${err?.message || err}`);

    if (this.state === 'CLOSED' && this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo('OPEN');
    } else if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    console.log(`[CircuitBreaker:${this.name}] Transitioned: ${this.state} -> ${newState}`);
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === 'CLOSED') {
      this.consecutiveFailures = 0;
    }
  }

  public getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.state,
      failures: this.totalFailures,
      successes: this.totalSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange
    };
  }

  public reset(): void {
    this.transitionTo('CLOSED');
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
  }
}

// Registry of circuit breakers for all external services
export const circuitBreakerRegistry = {
  fcm: new CircuitBreaker('FirebaseCloudMessaging', { failureThreshold: 3, resetTimeoutMs: 10000, timeoutMs: 4000 }),
  steadfastCourier: new CircuitBreaker('SteadfastCourierAPI', { failureThreshold: 4, resetTimeoutMs: 20000, timeoutMs: 6000 }),
  metaPixel: new CircuitBreaker('MetaConversionsAPI', { failureThreshold: 5, resetTimeoutMs: 15000, timeoutMs: 4000 }),
  geminiAI: new CircuitBreaker('GoogleGeminiAPI', { failureThreshold: 3, resetTimeoutMs: 15000, timeoutMs: 10000 }),
  firestore: new CircuitBreaker('FirestoreDatabase', { failureThreshold: 5, resetTimeoutMs: 10000, timeoutMs: 5000 })
};
