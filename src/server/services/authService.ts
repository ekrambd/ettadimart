import crypto from 'crypto';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'ettadimart-store-secure-vps-admin-key-2026';

export interface AdminUserPayload {
  uid: string;
  email: string;
  phone?: string;
  admin: boolean;
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

/**
 * Generate a cryptographically signed HMAC-SHA256 JWT for the admin session.
 */
export function generateAdminToken(user: { uid: string; email: string; phone?: string }): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    uid: user.uid,
    email: user.email,
    phone: user.phone || '',
    admin: true,
    iat: now,
    exp: now + (30 * 24 * 60 * 60) // 30-day token lifetime
  }));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 JWT admin token.
 */
export function verifyAdminToken(token: string): { valid: boolean; payload?: AdminUserPayload } {
  if (!token || typeof token !== 'string') {
    return { valid: false };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false };
  }

  const [headerB64, payloadB64, signature] = parts;

  // Re-compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return { valid: false };
  }

  try {
    const payload: AdminUserPayload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false }; // Expired
    }

    if (!payload.admin) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Verify admin login credentials against DB settings and environment variables.
 */
export async function verifyAdminCredentials(identifier: string, passwordInput: string): Promise<{ valid: boolean; user?: { uid: string; email: string; phone: string } }> {
  const cleanInput = (identifier || '').trim();
  const digitsInput = cleanInput.replace(/\D/g, '');

  const envEmail = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'admin@ettadimart.com').trim().toLowerCase();
  const envPhone = (process.env.ADMIN_PHONE || process.env.VITE_ADMIN_PHONE || '01726275850').trim();
  const digitsEnvPhone = envPhone.replace(/\D/g, '');

  // Master password fallback from environment variables
  const envPassword = (process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'admin123').trim();

  // Custom password stored in store settings in DB
  let storedCustomPassword = '';
  try {
    const record = await prisma.setting.findUnique({ where: { id: 'global' } });
    if (record && record.value) {
      const parsed = JSON.parse(record.value);
      storedCustomPassword = parsed?.adminCustomPassword || '';
    }
  } catch {}

  const isEmailMatch = cleanInput.toLowerCase() === envEmail;
  const isPhoneMatch = Boolean(
    (cleanInput === envPhone) ||
    (digitsInput && digitsEnvPhone && digitsInput === digitsEnvPhone) ||
    (cleanInput.endsWith('ettadimart.com') && digitsInput && digitsInput === digitsEnvPhone)
  );

  if (!isEmailMatch && !isPhoneMatch) {
    return { valid: false };
  }

  const validPassword = storedCustomPassword || envPassword;
  const isPasswordValid = passwordInput === validPassword;

  if (!isPasswordValid) {
    return { valid: false };
  }

  return {
    valid: true,
    user: {
      uid: 'admin-vps-root',
      email: envEmail,
      phone: envPhone
    }
  };
}
