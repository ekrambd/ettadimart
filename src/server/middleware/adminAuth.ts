import type { NextFunction, Request, Response } from 'express';
import { verifyAdminToken, AdminUserPayload } from '../services/authService';

export type AdminAuthorizationResult =
  | { ok: true; decoded: AdminUserPayload }
  | { ok: false; status: number; message: string };

export async function checkAdminAuthorization(authorization: string): Promise<AdminAuthorizationResult> {
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;

  const adminEmail = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@ettadimart.com').trim();
  const adminPhone = (process.env.VITE_ADMIN_PHONE || process.env.ADMIN_PHONE || '01726275850').trim();

  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      return {
        ok: true,
        decoded: {
          uid: 'dev-admin',
          email: adminEmail,
          phone: adminPhone,
          admin: true,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400
        }
      };
    }
    return { ok: false, status: 401, message: 'Admin authentication is required' };
  }

  // In production, strictly require cryptographically verified HMAC-SHA256 JWT
  const verified = verifyAdminToken(token);
  if (verified.valid && verified.payload) {
    return { ok: true, decoded: verified.payload };
  }

  // Allow bypass ONLY in explicit non-production local development mode
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    if (token.startsWith('BypassAdmin:') || token === adminEmail || token === adminPhone || token === '01726275850' || token === 'admin') {
      const passedIdentity = token.replace('BypassAdmin:', '').trim();
      return {
        ok: true,
        decoded: {
          uid: 'dev-admin',
          email: passedIdentity || adminEmail,
          phone: adminPhone,
          admin: true,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400
        }
      };
    }
  }

  return { ok: false, status: 401, message: 'Admin session is invalid or expired. Please sign in again.' };
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const result = await checkAdminAuthorization(req.header('authorization') || '');
  if (result.ok === false) {
    res.status(result.status).json({ success: false, message: result.message });
    return;
  }
  (req as any).admin = result.decoded;
  next();
}
