import path from 'path';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getCleanDbUrl(): string {
  let raw = process.env.DATABASE_URL || 'file:./prisma/ettadimart.db';
  raw = raw.replace(/^["']|["']$/g, '').trim();

  if (raw.startsWith('file:')) {
    const rawPath = raw.slice(5);
    const absPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    return `file:${absPath}`;
  }
  return raw;
}

const dbUrl = getCleanDbUrl();
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let client: PrismaClient;

if (isPostgres) {
  console.log(`[DatabaseEngine] Initializing Managed PostgreSQL Connection Pool (${dbUrl.split('@')[1] || 'remote'})`);
  client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    }
  });
} else {
  // Enterprise SQLite Concurrency Tuning:
  // WAL mode (concurrent read/write), NORMAL sync, 10s busy timeout, and memory mapping
  try {
    const rawPath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : dbUrl;
    const directDb = new Database(rawPath);
    directDb.pragma('journal_mode = WAL');
    directDb.pragma('synchronous = NORMAL');
    directDb.pragma('busy_timeout = 10000');
    directDb.pragma('cache_size = -64000'); // 64MB RAM page cache
    directDb.pragma('temp_store = MEMORY');
    directDb.pragma('mmap_size = 2147483648'); // 2GB memory-mapped files
    directDb.close();
    console.log('[DatabaseEngine] SQLite WAL Mode & Concurrency Engine Initialized (Read/Write Non-blocking)');
  } catch (err: any) {
    console.warn('[DatabaseEngine] SQLite PRAGMA note:', err.message);
  }

  const adapter = new PrismaBetterSqlite3({
    url: dbUrl,
  });
  client = new PrismaClient({ adapter });
}

export const prisma = client;