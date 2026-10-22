import assert from 'node:assert/strict';
import { slugifyProductText, truncateSeoText } from '../src/lib/seoUtils';

const mockWindow: { dataLayer?: Array<Record<string, unknown>> } = {};
Object.assign(globalThis, { window: mockWindow });

const { trackEvent } = await import('../src/lib/pixelGtmService');

trackEvent('PageView');
trackEvent('ViewContent', { content_ids: ['prod-1'], value: 280, currency: 'BDT' });
trackEvent('AddToCart', { content_ids: ['prod-1'], value: 280, currency: 'BDT' });
trackEvent('InitiateCheckout', { content_ids: ['prod-1'], value: 370, currency: 'BDT' });
trackEvent('Purchase', { order_id: 'ORD-SMOKE', value: 370, currency: 'BDT' }, 'purchase-smoke-id');

const events = (mockWindow.dataLayer || []).map(item => item.event);
assert.deepEqual(events, ['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase']);
assert.equal(mockWindow.dataLayer?.[4].event_id, 'purchase-smoke-id');
assert.equal(mockWindow.dataLayer?.[4].currency, 'BDT');

assert.equal(slugifyProductText("Tolsen ১০০' ফিতা"), 'tolsen-১০০-ফিতা');
assert.equal(slugifyProductText('  Smart Land Survey Book  '), 'smart-land-survey-book');
assert.equal(truncateSeoText('A  description   with spaces', 100), 'A description with spaces');
assert.equal(truncateSeoText('1234567890', 6), '12345…');

console.log('Storefront tracking and SEO smoke tests passed.');
