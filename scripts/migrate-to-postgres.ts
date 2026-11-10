/**
 * Enterprise PostgreSQL Migration Engine
 * Migrates Ettadi Mart from Local SQLite to Managed PostgreSQL (Neon, Supabase, RDS, DigitalOcean, Docker)
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-postgres.ts "postgresql://user:password@host:5432/ettadimart?sslmode=require"
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const targetPgUrl = process.argv[2] || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!targetPgUrl || (!targetPgUrl.startsWith('postgres://') && !targetPgUrl.startsWith('postgresql://'))) {
  console.error('\n❌ ERROR: Valid PostgreSQL Connection String Required.');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/migrate-to-postgres.ts "postgresql://user:password@host:5432/ettadimart?sslmode=require"\n');
  process.exit(1);
}

const sqliteDbPath = path.resolve(process.cwd(), 'prisma/ettadimart.db');
if (!fs.existsSync(sqliteDbPath)) {
  console.error(`\n❌ ERROR: Source SQLite database not found at ${sqliteDbPath}`);
  process.exit(1);
}

console.log('====================================================');
console.log('🐘 Ettadi Mart SQLite -> PostgreSQL Migration Engine');
console.log('====================================================\n');
console.log(`Source Database : ${sqliteDbPath}`);
console.log(`Target Postgres : ${targetPgUrl.replace(/:[^:@]+@/, ':****@')}\n`);

async function runMigration() {
  try {
    // 1. Open SQLite
    const sqlite = new Database(sqliteDbPath, { readonly: true });
    console.log('✅ Connected to source SQLite database.');

    // 2. Push Schema to PostgreSQL using Prisma
    console.log('\n🔄 Applying Prisma schema to PostgreSQL destination...');
    execSync(`npx prisma db push --schema=prisma/schema.postgresql.prisma --accept-data-loss`, {
      env: {
        ...process.env,
        DATABASE_URL: targetPgUrl
      },
      stdio: 'inherit'
    });
    console.log('✅ PostgreSQL tables and indexes created successfully.');

    // 3. Connect to Postgres via PrismaClient
    const { PrismaClient } = await import('@prisma/client');
    const pgPrisma = new PrismaClient({
      datasources: {
        db: {
          url: targetPgUrl
        }
      }
    });

    const tables = [
      'Setting',
      'InstituteInfo',
      'Category',
      'Brand',
      'Vendor',
      'Unit',
      'Attribute',
      'Product',
      'Customer',
      'Coupon',
      'Order',
      'Review',
      'Slider',
      'LandingPage',
      'Tax',
      'Driver',
      'Supplier',
      'FlashSale',
      'SubscriptionPlan',
      'WithdrawalRequest',
      'ContactMessage'
    ];

    console.log('\n📦 Migrating data table by table...');

    for (const table of tables) {
      // Check if table exists in SQLite
      const tableCheck = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      if (!tableCheck) {
        continue;
      }

      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as any[];
      if (rows.length === 0) {
        console.log(`  ⚪ ${table.padEnd(20)}: 0 records (empty)`);
        continue;
      }

      // Format Date fields from string/timestamp if needed
      const cleanRows = rows.map(r => {
        const item: any = { ...r };
        for (const [k, v] of Object.entries(item)) {
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
            item[k] = new Date(v);
          } else if ((k === 'createdAt' || k === 'updatedAt' || k === 'orderDate' || k === 'date') && typeof v === 'number') {
            item[k] = new Date(v);
          }
        }
        return item;
      });

      // Upsert/Insert in chunks of 50
      const chunkSize = 50;
      let inserted = 0;
      const modelDelegate = (pgPrisma as any)[table.charAt(0).toLowerCase() + table.slice(1)];

      if (!modelDelegate) {
        console.warn(`  ⚠️ Delegate not found for ${table}, skipping`);
        continue;
      }

      for (let i = 0; i < cleanRows.length; i += chunkSize) {
        const chunk = cleanRows.slice(i, i + chunkSize);
        for (const record of chunk) {
          try {
            await modelDelegate.upsert({
              where: { id: record.id },
              create: record,
              update: record
            });
            inserted++;
          } catch (insertErr: any) {
            // If upsert fails on ID or unique constraint, try create
            try {
              await modelDelegate.create({ data: record });
              inserted++;
            } catch (err: any) {
              console.warn(`    ⚠️ Record ${record.id} in ${table} skipped: ${err.message}`);
            }
          }
        }
      }

      console.log(`  ✅ ${table.padEnd(20)}: ${inserted} / ${rows.length} records transferred`);
    }

    sqlite.close();
    await pgPrisma.$disconnect();

    console.log('\n🎉 ====================================================');
    console.log('🎉 PostgreSQL Migration Completed Successfully!');
    console.log('====================================================\n');
    console.log('To activate PostgreSQL on this server or production, simply set in your .env:');
    console.log(`DATABASE_URL="${targetPgUrl}"\n`);

  } catch (err: any) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
