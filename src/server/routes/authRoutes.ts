import { Router } from 'express';
import { generateAdminToken, verifyAdminCredentials } from '../services/authService';
import { requireAdmin } from '../middleware/adminAuth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { storeSettings, updateStoreSettings } from '../data/store';

const authRouter = Router();

/**
 * POST /api/auth/login
 * Log in admin using phone or email and password. Protected with anti-brute-force rate limiter.
 */
authRouter.post('/login', authRateLimiter, (req, res) => {
  const { identifier, password } = req.body || {};

  if (!identifier || !password) {
    res.status(400).json({ success: false, message: 'Please provide both phone/email and password' });
    return;
  }

  const result = verifyAdminCredentials(identifier, password);

  if (!result.valid || !result.user) {
    res.status(401).json({ success: false, message: 'Invalid credentials. Please verify your phone/email and password.' });
    return;
  }

  const token = generateAdminToken(result.user);

  res.json({
    success: true,
    token,
    user: result.user
  });
});

/**
 * GET /api/auth/me
 * Validate current admin session.
 */
authRouter.get('/me', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  res.json({
    success: true,
    user: admin || { role: 'admin' }
  });
});

/**
 * POST /api/auth/logout
 * Terminate session.
 */
authRouter.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * POST /api/auth/change-password
 * Change admin password (requires admin session).
 */
authRouter.post('/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    return;
  }

  const adminEmail = (req as any).admin?.email || process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'admin@fantinebd.com';
  const adminPhone = (req as any).admin?.phone || process.env.ADMIN_PHONE || process.env.VITE_ADMIN_PHONE || '01329458568';

  const verifyEmail = verifyAdminCredentials(adminEmail, currentPassword);
  const verifyPhone = verifyAdminCredentials(adminPhone, currentPassword);

  if (!verifyEmail.valid && !verifyPhone.valid) {
    res.status(401).json({ success: false, message: 'Current password is incorrect' });
    return;
  }

  // Persist updated password to disk so it survives server restarts
  updateStoreSettings({ adminCustomPassword: newPassword } as any);

  res.json({ success: true, message: 'Admin password changed successfully' });
});

export { authRouter };
