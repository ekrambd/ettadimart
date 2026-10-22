import { Router } from 'express';
import { backupEngine } from '../services/backupEngine';

export const backupRouter = Router();

// GET /api/admin/backups - List all backups
backupRouter.get('/', (_req, res) => {
  try {
    const backups = backupEngine.listBackups();
    res.json({ success: true, count: backups.length, backups });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list backups' });
  }
});

// POST /api/admin/backups/create - Create immediate snapshot
backupRouter.post('/create', async (req, res) => {
  try {
    const metadata = await backupEngine.createBackup(req.body?.data);
    res.status(201).json({ success: true, message: 'Backup created successfully', backup: metadata });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create backup' });
  }
});

// POST /api/admin/backups/restore - Point-in-time restore
backupRouter.post('/restore', async (req, res) => {
  const { backupId } = req.body;
  if (!backupId) {
    res.status(400).json({ success: false, error: 'backupId is required' });
    return;
  }

  try {
    const result = await backupEngine.restoreBackup(backupId);
    res.json({ success: true, message: `Successfully restored backup ${backupId}`, restored: result.restored });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to restore backup' });
  }
});
