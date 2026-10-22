import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storeProducts, storeOrders, storeSettings } from '../data/store';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  sizeBytes: number;
  checksum: string;
  collections: {
    productsCount: number;
    ordersCount: number;
    settingsIncluded: boolean;
  };
  filePath?: string;
}

export interface BackupPayload {
  metadata: Omit<BackupMetadata, 'checksum' | 'sizeBytes'>;
  data: {
    products: any[];
    orders: any[];
    settings: any;
  };
}

/**
 * Enterprise Automated Backup & Point-In-Time Disaster Recovery Engine
 */
export class BackupEngine {
  private static instance: BackupEngine;
  private backupDir: string;
  private autoBackupInterval: NodeJS.Timeout | null = null;
  private inMemoryBackups: Map<string, { payload: string; metadata: BackupMetadata }> = new Map();

  private constructor() {
    this.backupDir = path.join(process.cwd(), '.backups');
    this.ensureBackupDirectory();
  }

  public static getInstance(): BackupEngine {
    if (!BackupEngine.instance) {
      BackupEngine.instance = new BackupEngine();
    }
    return BackupEngine.instance;
  }

  private ensureBackupDirectory(): void {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[BackupEngine] Filesystem backup directory warning (running with in-memory persistence):', err);
    }
  }

  /**
   * Start scheduled automated backups (default: every 6 hours)
   */
  public startScheduledBackups(intervalHours = 6): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.autoBackupInterval = setInterval(async () => {
      try {
        console.log('[BackupEngine] Running scheduled automated disaster recovery snapshot...');
        await this.createBackup();
      } catch (err) {
        console.error('[BackupEngine] Scheduled backup failed:', err);
      }
    }, intervalMs);

    if (typeof this.autoBackupInterval.unref === 'function') {
      this.autoBackupInterval.unref();
    }
  }

  /**
   * Create an atomic point-in-time backup snapshot
   */
  public async createBackup(customData?: { products?: any[]; orders?: any[]; settings?: any }): Promise<BackupMetadata> {
    const timestamp = new Date().toISOString();
    const id = `backup-${Date.now()}`;

    const products = customData?.products || [...storeProducts];
    const orders = customData?.orders || [...storeOrders];
    const settings = customData?.settings || { ...storeSettings };

    const payload: BackupPayload = {
      metadata: {
        id,
        timestamp,
        collections: {
          productsCount: products.length,
          ordersCount: orders.length,
          settingsIncluded: Boolean(settings)
        }
      },
      data: {
        products,
        orders,
        settings
      }
    };

    const serialized = JSON.stringify(payload, null, 2);
    const checksum = crypto.createHash('sha256').update(serialized).digest('hex');
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');

    const metadata: BackupMetadata = {
      id,
      timestamp,
      sizeBytes,
      checksum,
      collections: payload.metadata.collections
    };

    // Save to filesystem if available
    const filePath = path.join(this.backupDir, `${id}.json`);
    try {
      this.ensureBackupDirectory();
      fs.writeFileSync(filePath, serialized, 'utf8');
      metadata.filePath = filePath;
    } catch (err) {
      console.warn('[BackupEngine] Failed to write backup to disk, persisting in memory:', err);
    }

    this.inMemoryBackups.set(id, { payload: serialized, metadata });
    this.pruneOldBackups(20); // Keep last 20 snapshots

    console.log(`[BackupEngine] Snapshot created: ${id} (${(sizeBytes / 1024).toFixed(2)} KB, Checksum: ${checksum.slice(0, 8)})`);
    return metadata;
  }

  /**
   * List all available backups
   */
  public listBackups(): BackupMetadata[] {
    const results: BackupMetadata[] = [];

    // From filesystem
    try {
      if (fs.existsSync(this.backupDir)) {
        const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.join(this.backupDir, file), 'utf8');
            const parsed = JSON.parse(content) as BackupPayload;
            const checksum = crypto.createHash('sha256').update(content).digest('hex');
            results.push({
              id: parsed.metadata.id || path.basename(file, '.json'),
              timestamp: parsed.metadata.timestamp || new Date().toISOString(),
              sizeBytes: Buffer.byteLength(content, 'utf8'),
              checksum,
              collections: parsed.metadata.collections,
              filePath: path.join(this.backupDir, file)
            });
          } catch {
            // ignore corrupted files
          }
        }
      }
    } catch {
      // ignore
    }

    // Merge in-memory backups
    for (const [id, item] of this.inMemoryBackups.entries()) {
      if (!results.some(r => r.id === id)) {
        results.push(item.metadata);
      }
    }

    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Restore application state from a specific backup ID
   */
  public async restoreBackup(backupId: string): Promise<{ success: boolean; restored: BackupMetadata['collections'] }> {
    let rawContent: string | null = null;

    // Try filesystem
    const diskPath = path.join(this.backupDir, `${backupId}.json`);
    if (fs.existsSync(diskPath)) {
      rawContent = fs.readFileSync(diskPath, 'utf8');
    } else if (this.inMemoryBackups.has(backupId)) {
      rawContent = this.inMemoryBackups.get(backupId)!.payload;
    }

    if (!rawContent) {
      throw new Error(`[BackupEngine] Backup with ID '${backupId}' not found`);
    }

    const payload = JSON.parse(rawContent) as BackupPayload;

    // Atomic restore into store
    const { storeProducts: currentProducts, storeOrders: currentOrders } = await import('../data/store');
    
    // Clear and restore products
    currentProducts.length = 0;
    if (Array.isArray(payload.data.products)) {
      for (const p of payload.data.products) {
        currentProducts.push(p);
      }
    }

    // Clear and restore orders
    currentOrders.length = 0;
    if (Array.isArray(payload.data.orders)) {
      for (const o of payload.data.orders) {
        currentOrders.push(o);
      }
    }

    // Restore settings
    if (payload.data.settings) {
      const { updateStoreSettings } = await import('../data/store');
      updateStoreSettings(payload.data.settings);
    }

    // Invalidate all server caches
    const { globalCache } = await import('./cacheEngine');
    globalCache.clear();

    console.log(`[BackupEngine] Successfully restored snapshot '${backupId}'`);
    return {
      success: true,
      restored: payload.metadata.collections
    };
  }

  /**
   * Prune backups exceeding maximum retention limit
   */
  private pruneOldBackups(maxRetained = 20): void {
    const all = this.listBackups();
    if (all.length > maxRetained) {
      const toDelete = all.slice(maxRetained);
      for (const item of toDelete) {
        if (item.filePath && fs.existsSync(item.filePath)) {
          try {
            fs.unlinkSync(item.filePath);
          } catch {}
        }
        this.inMemoryBackups.delete(item.id);
      }
    }
  }
}

export const backupEngine = BackupEngine.getInstance();
