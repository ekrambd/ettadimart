import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FacebookCapiService } from '../src/server/services/facebookCapiService';
import { SteadfastCourierService } from '../src/server/services/steadfastService';

process.env.META_PIXEL_ID = '123456789';
process.env.META_CAPI_TOKEN = 'meta-test-token';
process.env.META_TEST_EVENT_CODE = 'TEST00000';
process.env.STEADFAST_API_KEY = 'steadfast-test-key';
process.env.STEADFAST_SECRET_KEY = 'steadfast-test-secret';
process.env.STEADFAST_BASE_URL = 'https://steadfast.test/api/v1';

const requests: Array<{ url: string; init?: RequestInit }> = [];

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  requests.push({ url, init });

  if (url.endsWith('/get_balance')) {
    return Response.json({ status: 200, current_balance: 4250 });
  }
  if (url.endsWith('/create_order')) {
    return Response.json({ status: 200, consignment: { tracking_code: 'SF-REAL-123', status: 'in_review' } });
  }
  if (url.endsWith('/status_by_trackingcode/SF-REAL-123')) {
    return Response.json({ status: 200, delivery_status: 'delivered' });
  }
  if (url.includes('graph.facebook.com')) {
    return Response.json({ events_received: 1 });
  }
  return Response.json({ message: 'Unexpected URL' }, { status: 404 });
}) as typeof fetch;

const balance = await SteadfastCourierService.testConnection();
assert.equal(balance.balance, 4250);

const dispatch = await SteadfastCourierService.dispatchOrder({
  order: {
    id: 'ORD-TEST-1',
    customerName: 'Test Customer',
    phone: '01700000000',
    address: 'Dhaka',
    district: 'Dhaka',
    totalPrice: 580,
    status: 'Pending',
    paymentMethod: 'COD',
    productTitle: 'Test Product'
  }
});
assert.equal(dispatch.trackingCode, 'SF-REAL-123');

const createRequest = requests.find(request => request.url.endsWith('/create_order'))!;
assert.equal(new Headers(createRequest.init?.headers).get('Api-Key'), 'steadfast-test-key');
assert.equal(new Headers(createRequest.init?.headers).get('Secret-Key'), 'steadfast-test-secret');
assert.equal(JSON.parse(String(createRequest.init?.body)).cod_amount, 580);

const courierStatus = await SteadfastCourierService.getStatus('SF-REAL-123');
assert.equal(courierStatus.status, 'delivered');

await assert.rejects(() => SteadfastCourierService.dispatchOrder({
  order: {
    id: 'ORD-TEST-2',
    customerName: 'Test Customer',
    phone: '01700000000',
    address: 'Dhaka',
    totalPrice: 580,
    status: 'Shipped',
    steadfastTrackingCode: 'SF-EXISTING'
  }
}), /already has a Steadfast tracking code/);

delete process.env.STEADFAST_API_KEY;
await assert.rejects(() => SteadfastCourierService.testConnection(), /not configured/);
process.env.STEADFAST_API_KEY = 'steadfast-test-key';

const capiResult = await FacebookCapiService.sendEvent('Purchase', {
  eventId: 'purchase-test-1',
  eventSourceUrl: 'https://example.com/checkout',
  userAgent: 'integration-test',
  customData: { value: 580, currency: 'BDT' }
}, { phone: '01700000000' });
assert.equal(capiResult.success, true);

const metaRequest = requests.find(request => request.url.includes('graph.facebook.com'))!;
const metaBody = JSON.parse(String(metaRequest.init?.body));
assert.equal(metaBody.data[0].event_id, 'purchase-test-1');
assert.equal(metaBody.data[0].user_data.ph, createHash('sha256').update('8801700000000').digest('hex'));
assert.equal(metaBody.access_token, 'meta-test-token');
assert.equal(metaBody.test_event_code, 'TEST00000');

const checkoutResult = await FacebookCapiService.sendEvent('InitiateCheckout', {
  eventId: 'checkout-test-1',
  eventSourceUrl: 'https://example.com/book',
  userAgent: 'integration-test',
  customData: { value: 370, currency: 'BDT' }
}, { phone: '01700000000' });
assert.equal(checkoutResult.success, true);

const checkoutRequest = requests.filter(request => request.url.includes('graph.facebook.com')).at(-1)!;
const checkoutBody = JSON.parse(String(checkoutRequest.init?.body));
assert.equal(checkoutBody.data[0].event_name, 'InitiateCheckout');
assert.equal(checkoutBody.data[0].event_id, 'checkout-test-1');

const unsupportedEvent = await FacebookCapiService.sendEvent('NotARealEvent', {}, {});
assert.equal(unsupportedEvent.success, false);
assert.equal(unsupportedEvent.status, 400);

console.log('Integration smoke tests passed without external network calls.');
