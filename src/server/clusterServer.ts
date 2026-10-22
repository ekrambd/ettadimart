import cluster, { Worker } from 'node:cluster';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const numCPUs = process.env.WORKER_COUNT ? parseInt(process.env.WORKER_COUNT, 10) : Math.min(os.cpus().length, 4);

/**
 * Enterprise Multi-Core Node.js Cluster Master
 * Distributes network traffic across isolated worker processes matching CPU cores.
 */
if (cluster.isPrimary || (cluster as any).isMaster) {
  console.log('====================================================');
  console.log('🚀 NOOR ENTERPRISE MULTI-SERVER CLUSTER MANAGER');
  console.log(`⚡ Primary PID ${process.pid} is online`);
  console.log(`⚡ Forking ${numCPUs} worker processes (Detected ${os.cpus().length} CPU cores)...`);
  console.log('====================================================\n');

  const workers: Worker[] = [];

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork({ WORKER_ID: `${i + 1}` });
    workers.push(worker);
  }

  // Handle worker lifecycle
  cluster.on('online', (worker) => {
    console.log(`[Cluster] Worker #${worker.process.pid} is online & ready to serve traffic`);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[Cluster] ⚠️ Worker #${worker.process.pid} died (code: ${code}, signal: ${signal}). Auto-healing and respawning new worker...`);
    const newWorker = cluster.fork();
    workers.push(newWorker);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Cluster] Graceful shutdown initiated. Terminating workers...');
    for (const worker of Object.values(cluster.workers || {})) {
      if (worker) {
        worker.kill('SIGTERM');
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

} else {
  // Worker process: run main server
  const serverPath = path.join(process.cwd(), 'dist/server.cjs');
  import(serverPath).catch(() => {
    // If running in development via tsx
    import(path.join(process.cwd(), 'server.ts')).catch((err) => {
      console.error('[Worker] Failed to start server instance:', err);
    });
  });
}
