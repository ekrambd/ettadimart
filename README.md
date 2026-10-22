<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Noor Survey Storefront

This repo contains the storefront, admin UI, and the local Express backend that powers order and tracking flows.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Configure [.env.local](/Users/roxy/Downloads/nur-servey/.env.local) for your environment
3. Run the app:
   `npm run dev`

## Meta Server-Side Tracking

The server-side Meta Conversions API uses these env vars:

1. `META_PIXEL_ID` - the Meta Pixel ID that receives server events
2. `META_CAPI_TOKEN` - the server access token for CAPI
3. `META_TEST_EVENT_CODE` - optional test code for validating events in Events Manager

Notes:

1. `Purchase` and `InitiateCheckout` can be sent server-side.
2. The browser pixel still fires client-side events for deduplication.
3. Keep `META_CAPI_TOKEN` server-only and never expose it with a `VITE_` prefix.
