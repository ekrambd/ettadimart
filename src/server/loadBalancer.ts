import http from 'http';
import { EventEmitter } from 'events';

export type LoadBalancingStrategy = 'ROUND_ROBIN' | 'LEAST_CONNECTIONS' | 'IP_HASH';

export interface UpstreamServer {
  id: string;
  host: string;
  port: number;
  weight?: number;
  isHealthy: boolean;
  activeConnections: number;
  totalRequestsServed: number;
  averageLatencyMs: number;
  lastHealthCheck: number | null;
  failedHealthChecks: number;
}

export interface LoadBalancerConfig {
  port: number;
  strategy: LoadBalancingStrategy;
  healthCheckIntervalMs: number;
  healthCheckPath: string;
  healthCheckTimeoutMs: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  upstreams: Array<{ host: string; port: number; weight?: number }>;
}

/**
 * Enterprise Software Load Balancer & Reverse Proxy
 * - Distributes traffic across multiple backend server processes
 * - Automatic background active health checking and dead node ejection
 * - Multiple balancing algorithms: Round Robin, Least Connections, IP Hash
 */
export class SoftwareLoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private upstreams: UpstreamServer[] = [];
  private roundRobinIndex = 0;
  private server: http.Server | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    super();
    this.config = {
      port: config.port || 8080,
      strategy: config.strategy || 'ROUND_ROBIN',
      healthCheckIntervalMs: config.healthCheckIntervalMs || 5000,
      healthCheckPath: config.healthCheckPath || '/api/health',
      healthCheckTimeoutMs: config.healthCheckTimeoutMs || 2000,
      unhealthyThreshold: config.unhealthyThreshold || 2,
      healthyThreshold: config.healthyThreshold || 1,
      upstreams: config.upstreams || [
        { host: '127.0.0.1', port: 3001, weight: 1 },
        { host: '127.0.0.1', port: 3002, weight: 1 }
      ]
    };

    this.initUpstreams();
  }

  private initUpstreams(): void {
    this.upstreams = this.config.upstreams.map((u, idx) => ({
      id: `upstream-${idx + 1}`,
      host: u.host,
      port: u.port,
      weight: u.weight || 1,
      isHealthy: true,
      activeConnections: 0,
      totalRequestsServed: 0,
      averageLatencyMs: 0,
      lastHealthCheck: null,
      failedHealthChecks: 0
    }));
  }

  /**
   * Select upstream server based on configured strategy
   */
  public getNextUpstream(clientIp?: string): UpstreamServer | null {
    const healthy = this.upstreams.filter(u => u.isHealthy);
    if (healthy.length === 0) return null;

    switch (this.config.strategy) {
      case 'LEAST_CONNECTIONS': {
        return healthy.reduce((prev, curr) =>
          curr.activeConnections < prev.activeConnections ? curr : prev
        );
      }

      case 'IP_HASH': {
        if (!clientIp) return healthy[0];
        let hash = 0;
        for (let i = 0; i < clientIp.length; i++) {
          hash = (hash << 5) - hash + clientIp.charCodeAt(i);
          hash |= 0;
        }
        const index = Math.abs(hash) % healthy.length;
        return healthy[index];
      }

      case 'ROUND_ROBIN':
      default: {
        const selected = healthy[this.roundRobinIndex % healthy.length];
        this.roundRobinIndex = (this.roundRobinIndex + 1) % healthy.length;
        return selected;
      }
    }
  }

  /**
   * Start the Load Balancer HTTP Reverse Proxy Server
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        // Built-in status endpoint
        if (req.url === '/lb-status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getStatus(), null, 2));
          return;
        }

        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const upstream = this.getNextUpstream(clientIp);

        if (!upstream) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Service Unavailable - All upstream backend servers are down' }));
          return;
        }

        upstream.activeConnections++;
        upstream.totalRequestsServed++;
        const startTime = Date.now();

        const proxyReq = http.request(
          {
            host: upstream.host,
            port: upstream.port,
            path: req.url,
            method: req.method,
            headers: {
              ...req.headers,
              'x-forwarded-for': clientIp,
              'x-forwarded-proto': 'http',
              'x-load-balancer-upstream': upstream.id
            }
          },
          (proxyRes) => {
            const latency = Date.now() - startTime;
            upstream.averageLatencyMs = Math.round((upstream.averageLatencyMs + latency) / 2);
            upstream.activeConnections = Math.max(0, upstream.activeConnections - 1);

            res.writeHead(proxyRes.statusCode || 200, {
              ...proxyRes.headers,
              'X-Proxied-By': 'Noor-Load-Balancer',
              'X-Upstream-Server': upstream.id
            });
            proxyRes.pipe(res);
          }
        );

        proxyReq.on('error', (err) => {
          upstream.activeConnections = Math.max(0, upstream.activeConnections - 1);
          console.error(`[LoadBalancer] Upstream ${upstream.id} connection error:`, err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad Gateway - Failed to connect to upstream server' }));
        });

        req.pipe(proxyReq);
      });

      this.server.listen(this.config.port, () => {
        console.log(`⚖️  Noor Load Balancer listening on http://localhost:${this.config.port} (${this.config.strategy})`);
        this.startHealthChecks();
        resolve();
      });
    });
  }

  /**
   * Active Health Checker
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      for (const upstream of this.upstreams) {
        const req = http.get(
          {
            host: upstream.host,
            port: upstream.port,
            path: this.config.healthCheckPath,
            timeout: this.config.healthCheckTimeoutMs
          },
          (res) => {
            upstream.lastHealthCheck = Date.now();
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              if (!upstream.isHealthy) {
                console.log(`[LoadBalancer] ✅ Upstream ${upstream.id} (${upstream.host}:${upstream.port}) restored to HEALTHY`);
              }
              upstream.isHealthy = true;
              upstream.failedHealthChecks = 0;
            } else {
              this.handleFailedHealthCheck(upstream);
            }
            res.resume(); // consume stream
          }
        );

        req.on('error', () => this.handleFailedHealthCheck(upstream));
        req.on('timeout', () => {
          req.destroy();
          this.handleFailedHealthCheck(upstream);
        });
      }
    }, this.config.healthCheckIntervalMs);

    if (typeof this.healthCheckTimer.unref === 'function') {
      this.healthCheckTimer.unref();
    }
  }

  private handleFailedHealthCheck(upstream: UpstreamServer): void {
    upstream.lastHealthCheck = Date.now();
    upstream.failedHealthChecks++;
    if (upstream.isHealthy && upstream.failedHealthChecks >= this.config.unhealthyThreshold) {
      upstream.isHealthy = false;
      console.warn(`[LoadBalancer] ❌ Upstream ${upstream.id} (${upstream.host}:${upstream.port}) marked UNHEALTHY`);
    }
  }

  public getStatus() {
    return {
      strategy: this.config.strategy,
      port: this.config.port,
      healthyNodesCount: this.upstreams.filter(u => u.isHealthy).length,
      totalNodesCount: this.upstreams.length,
      upstreams: this.upstreams
    };
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
