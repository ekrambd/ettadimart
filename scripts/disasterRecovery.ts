import { backupEngine } from '../src/server/services/backupEngine';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  console.log('====================================================');
  console.log('🛡️  NOOR ENTERPRISE DISASTER RECOVERY & BACKUP CLI');
  console.log('====================================================\n');

  try {
    switch (command) {
      case 'create':
      case 'backup': {
        console.log('Creating snapshot of all database collections...');
        const backup = await backupEngine.createBackup();
        console.log('✅ Snapshot created successfully!');
        console.log(`ID:        ${backup.id}`);
        console.log(`Timestamp: ${backup.timestamp}`);
        console.log(`Size:      ${(backup.sizeBytes / 1024).toFixed(2)} KB`);
        console.log(`Checksum:  ${backup.checksum}`);
        console.log(`Contents:  ${backup.collections.productsCount} products, ${backup.collections.ordersCount} orders`);
        break;
      }

      case 'list': {
        const backups = backupEngine.listBackups();
        console.log(`Found ${backups.length} available backup snapshot(s):\n`);
        if (backups.length === 0) {
          console.log('No snapshots found. Run `npm run backup:create` to create one.');
        } else {
          console.table(
            backups.map(b => ({
              ID: b.id,
              Date: b.timestamp,
              'Size (KB)': (b.sizeBytes / 1024).toFixed(2),
              Products: b.collections.productsCount,
              Orders: b.collections.ordersCount,
              Checksum: b.checksum.slice(0, 10) + '...'
            }))
          );
        }
        break;
      }

      case 'restore': {
        const backupId = args[1];
        if (!backupId) {
          console.error('❌ Error: Please specify backup ID to restore. Example: `npm run backup:restore backup-1710000000000`');
          process.exit(1);
        }
        console.log(`Attempting point-in-time recovery for backup ID '${backupId}'...`);
        const res = await backupEngine.restoreBackup(backupId);
        console.log('✅ Database state successfully restored!');
        console.log(`Products Restored: ${res.restored.productsCount}`);
        console.log(`Orders Restored:   ${res.restored.ordersCount}`);
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Usage:');
        console.log('  node scripts/disasterRecovery.ts create');
        console.log('  node scripts/disasterRecovery.ts list');
        console.log('  node scripts/disasterRecovery.ts restore <backupId>');
    }
  } catch (err: any) {
    console.error('❌ Disaster recovery operation failed:', err?.message || err);
    process.exit(1);
  }
}

main();
