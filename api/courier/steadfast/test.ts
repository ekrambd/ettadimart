import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

type AdminAuthorizationResult =
  | { ok: true; decoded: DecodedIdToken }
  | { ok: false; status: number; message: string };

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured on the server');
  }

  return initializeApp({ projectId });
}

async function checkAdminAuthorization(authorization: string): Promise<AdminAuthorizationResult> {
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { ok: false, status: 401, message: 'Admin authentication is required' };

  // Handle hardcoded admin bypass token (e.g. for development or when bypassing Firebase Auth via VITE_ADMIN_EMAIL)
  const adminEmail = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim();
  if (adminEmail && token === `BypassAdmin:${adminEmail}`) {
    return {
      ok: true,
      decoded: {
        uid: 'hardcoded-admin',
        email: adminEmail,
        email_verified: true,
        admin: true,
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        fb: { signInProvider: 'custom' },
        iss: 'zinniamart-bypass',
        sub: 'hardcoded-admin',
        aud: 'land-certificate'
      } as unknown as DecodedIdToken
    };
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const allowedEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
    if (allowedEmails.length === 0) {
      return { ok: true, decoded };
    }
    const isAllowed = decoded.admin === true
      || Boolean(decoded.email && allowedEmails.includes(decoded.email.toLowerCase()));

    if (!isAllowed) {
      return { ok: false, status: 403, message: 'This account is not allowed to use admin integrations' };
    }

    return { ok: true, decoded };
  } catch (error) {
    console.error('Admin token verification failed:', error);
    return { ok: false, status: 401, message: 'Admin session is invalid or expired' };
  }
}

class SteadfastCourierService {
  private static getConfig() {
    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;
    const baseUrl = (process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1').replace(/\/$/, '');
    if (!apiKey || !secretKey) throw new Error('Steadfast credentials are not configured on the server');
    return { apiKey, secretKey, baseUrl };
  }

  private static async request(path: string, init?: RequestInit) {
    const { apiKey, secretKey, baseUrl } = this.getConfig();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        ...init?.headers
      },
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || (data.status && Number(data.status) >= 400)) {
      throw new Error(data.message || `Steadfast returned HTTP ${response.status}`);
    }
    return data;
  }

  static async testConnection() {
    const data = await this.request('/get_balance');
    if (Number(data.status) !== 200) throw new Error(data.message || 'Steadfast credentials were rejected');
    return { success: true, balance: Number(data.current_balance || 0), message: 'Steadfast API connection verified' };
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ success: false, message: 'Method not allowed' });
      return;
    }

    const authResult = await checkAdminAuthorization(req.headers.authorization || '');
    if (authResult.ok === false) {
      res.status(authResult.status).json({ success: false, message: authResult.message });
      return;
    }

    res.status(200).json(await SteadfastCourierService.testConnection());
  } catch (err: any) {
    console.error('Steadfast test function failed:', err);
    res.status(502).json({ success: false, message: err?.message || 'Steadfast connection failed' });
  }
}
