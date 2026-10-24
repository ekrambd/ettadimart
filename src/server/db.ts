import path from 'path';
import dotenv from 'dotenv';
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

const adapter = new PrismaBetterSqlite3({
  url: dbUrl,
});

export const prisma = new PrismaClient({ adapter });