import crypto from 'crypto';
import { storeSettings } from '../data/store';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fantine-store-secure-vps-admin-key-2026';

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
 * Verify a native HMAC-SHA256 JWT token with zero external cloud dependencies.
 */
export function verifyAdminToken(token: string): AdminUserPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    // Timing-safe signature comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const data = JSON.parse(base64UrlDecode(payload)) as AdminUserPayload;
    const now = Math.floor(Date.now() / 1000);

    if (data.exp && data.exp < now) {
      return null; // Expired
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Verify login credentials against environment variables and persisted store settings.
 */
export function verifyAdminCredentials(identifier: string, passwordInput: string): { valid: boolean; user?: { uid: string; email: string; phone: string } } {
  const cleanInput = (identifier || '').trim();
  const digitsInput = cleanInput.replace(/\D/g, '');

  const envEmail = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'admin@fantinebd.com').trim().toLowerCase();
  const envPhone = (process.env.ADMIN_PHONE || process.env.VITE_ADMIN_PHONE || '01329458568').trim();
  const digitsEnvPhone = envPhone.replace(/\D/g, '');

  // Master password fallback from environment variables
  const envPassword = (process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'admin123').trim();

  // Custom password stored in store settings if modified via admin profile
  const storedCustomPassword = (storeSettings as any)?.adminCustomPassword || '';

  const isEmailMatch = cleanInput.toLowerCase() === envEmail;
  const isPhoneMatch = Boolean(
    (cleanInput === envPhone) ||
    (digitsInput && digitsEnvPhone && digitsInput === digitsEnvPhone) ||
    (cleanInput.endsWith('fantinebd.com') && digitsInput && digitsInput === digitsEnvPhone)
  );

  if (!isEmailMatch && !isPhoneMatch) {
    return { valid: false };
  }

  // Verify against custom password or environment password
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
