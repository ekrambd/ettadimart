import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

type DispatchParams = {
  order: {
    id: string;
    customerName: string;
    phone: string;
    address: string;
    district?: string;
    totalPrice: number;
    status: string;
    productTitle?: string;
    paymentMethod?: string;
    steadfastTrackingCode?: string;
  };
};

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

  static async dispatchOrder(params: DispatchParams) {
    const { order } = params;
    if (!order?.id || !order.customerName || !order.phone || !order.address) {
      throw new Error('Order name, phone, address, and invoice are required');
    }
    if (order.steadfastTrackingCode) throw new Error('This order already has a Steadfast tracking code');

    try {
      const isPrepaid = order.paymentMethod && order.paymentMethod !== 'COD';
      const codAmount = isPrepaid ? 0 : order.totalPrice;

      const resData = await this.request('/create_order', {
        method: 'POST',
        body: JSON.stringify({
          invoice: order.id,
          recipient_name: order.customerName,
          recipient_phone: order.phone,
          recipient_address: `${order.address}${order.district ? `, ${order.district}` : ''}`,
          cod_amount: codAmount,
          note: order.productTitle || 'নূর সার্ভে ইকমার্স পার্সেল'
        })
      });

      if (Number(resData.status) === 200 && resData.consignment?.tracking_code) {
        return {
          success: true,
          trackingCode: String(resData.consignment.tracking_code),
          message: 'স্টিডফাস্ট কুরিয়ারে সফলভাবে পার্সেল এন্ট্রি করা হয়েছে!'
        };
      }

      throw new Error(resData.message || 'Steadfast did not return a tracking code');
    } catch (error: any) {
      console.error('Steadfast API error:', error);
      throw new Error(error?.message || 'Courier dispatch failed');
    }
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ success: false, message: 'Method not allowed' });
      return;
    }

    const authResult = await checkAdminAuthorization(req.headers.authorization || '');
    if (authResult.ok === false) {
      res.status(authResult.status).json({ success: false, message: authResult.message });
      return;
    }

    const result = await SteadfastCourierService.dispatchOrder(req.body as DispatchParams);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('Steadfast dispatch function failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Dispatch failed' });
  }
}
