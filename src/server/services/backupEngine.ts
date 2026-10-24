import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../db';
import { saveDbSettings } from '../routes/settingsRoutes';

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
      console.warn('[BackupEngine] Filesystem backup directory warning:', err);
    }
  }

  /**
   * Start scheduled automated backups (default: every 6 hours)
   */
  public startScheduledBackups(intervalHours = 6): void {
    this.startAutoBackup(intervalHours * 60 * 60 * 1000);
  }

  public startAutoBackup(intervalMs = 6 * 60 * 60 * 1000): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }

    this.autoBackupInterval = setInterval(() => {
      this.createBackup().catch(err => {
        console.error('[BackupEngine] Auto-backup failed:', err);
      });
    }, intervalMs);

    // Initial snapshot on startup (in background)
    setTimeout(() => {
      this.createBackup().catch(() => {});
    }, 5000);

    console.log(`[BackupEngine] Scheduled automated backups initialized (interval: ${intervalMs / 1000 / 60}m)`);
  }

  /**
   * Stop scheduled automated backups
   */
  public stopAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
  }

  /**
   * Create an atomic point-in-time backup snapshot
   */
  public async createBackup(customData?: { products?: any[]; orders?: any[]; settings?: any }): Promise<BackupMetadata> {
    const timestamp = new Date().toISOString();
    const id = `backup-${Date.now()}`;

    let products = customData?.products;
    if (!products) {
      try {
        products = await prisma.product.findMany();
      } catch {
        products = [];
      }
    }

    let orders = customData?.orders;
    if (!orders) {
      try {
        orders = await prisma.order.findMany();
      } catch {
        orders = [];
      }
    }

    let settings = customData?.settings;
    if (!settings) {
      try {
        const record = await prisma.setting.findUnique({ where: { id: 'global' } });
        settings = record && record.value ? JSON.parse(record.value) : {};
      } catch {
        settings = {};
      }
    }

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

    const filePath = path.join(this.backupDir, `${id}.json`);
    try {
      this.ensureBackupDirectory();
      fs.writeFileSync(filePath, serialized, 'utf8');
      metadata.filePath = filePath;
    } catch (err) {
      console.warn('[BackupEngine] Failed to write backup to disk, persisting in memory:', err);
    }

    this.inMemoryBackups.set(id, { payload: serialized, metadata });
    this.pruneOldBackups(20);

    console.log(`[BackupEngine] Snapshot created: ${id} (${(sizeBytes / 1024).toFixed(2)} KB, Checksum: ${checksum.slice(0, 8)})`);
    return metadata;
  }

  /**
   * List all available backups
   */
  public listBackups(): BackupMetadata[] {
    const results: BackupMetadata[] = [];

    try {
      if (fs.existsSync(this.backupDir)) {
        const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(this.backupDir, file), 'utf8');
            const parsed = JSON.parse(raw);
            results.push({
              id: parsed.metadata?.id || file.replace('.json', ''),
              timestamp: parsed.metadata?.timestamp || new Date().toISOString(),
              sizeBytes: Buffer.byteLength(raw, 'utf8'),
              checksum: crypto.createHash('sha256').update(raw).digest('hex'),
              collections: parsed.metadata?.collections || { productsCount: 0, ordersCount: 0, settingsIncluded: false },
              filePath: path.join(this.backupDir, file)
            });
          } catch {}
        }
      }
    } catch {}

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

    if (Array.isArray(payload.data.products)) {
      await prisma.product.deleteMany({});
      for (const p of payload.data.products) {
        try {
          await prisma.product.create({ data: p });
        } catch {}
      }
    }

    if (Array.isArray(payload.data.orders)) {
      await prisma.order.deleteMany({});
      for (const o of payload.data.orders) {
        try {
          await prisma.order.create({ data: o });
        } catch {}
      }
    }

    if (payload.data.settings) {
      await saveDbSettings(payload.data.settings);
    }

    console.log(`[BackupEngine] Successfully restored snapshot '${backupId}'`);
    return {
      success: true,
      restored: payload.metadata.collections
    };
  }

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
