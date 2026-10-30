<div align="center">
  <h1>ETTADI MART (ইত্যাদি মার্ট)</h1>
  <p><strong>High-Performance Multi-Vendor E-Commerce Platform</strong></p>
</div>

---

## 🚀 Overview

**EttadiMart** is a production-ready, full-stack e-commerce marketplace engine designed for high conversion, high-concurrency order placement, and multi-seller operations across Bangladesh.

---

## 🌟 Key Features & Updates

### 1. Website Frontend Enhancements
* **Enlarged High-Def Product Cards:** Product display images have been enhanced to a prominent `aspect-[4/5]` / `aspect-square` frame with smooth hover zoom magnification (`scale-110`).
* **High-Impact Product Gallery Frame:** Expanded image gallery up to `620px` height with responsive thumbnails and one-click full-screen zoom inspection.
* **Seller Storefront Badge:** Product pages clearly indicate `"Sold by: [Vendor Name]"` alongside a verified merchant badge.

### 2. Admin Management Modules
* **Subcategory Engine:**
  - Add, edit, and organize subcategories under any parent category in **Categories**.
  - Visual subcategory tags in table rows.
  - Automatic reactive synchronization inside product creation/editing.
* **Real-time Product Search:**
  - Fast search by Product Title, Brand, Category, Subcategory, SKU, and SEO keywords.
  - Instant one-click clear button (`X`).
* **Supplier Procurement Management:**
  - Dedicated **Suppliers** module in the sidebar.
  - Track Supplier / Factory name, Phone / WhatsApp / WeChat, Address, Supplied items, Sourced amount, and Status.
  - KPI counters for total suppliers, active vendors, and cumulative sourcing expenditure.
* **Affiliate & Referral Partner Engine:**
  - Dedicated **Affiliates** module in the sidebar.
  - Manage unique Referral Promo Codes (e.g. `TECHBD`, `REF1024`).
  - Calculate percentage (%) or flat (Tk) commissions.
  - One-click copy for referral links (`/?ref=CODE`).
  - Track referral conversions, earnings, and bKash / Nagad payout accounts.
* **Multi-Vendor Marketplace:**
  - Dedicated **Vendors** module in the sidebar.
  - Onboard and manage individual seller shops.
  - Configure per-vendor commission rates (e.g. 5% – 12%).
  - Real-time seller wallet balances, fulfilled order counts, and payout logs.
  - Product association: Assign any product to specific registered vendors or direct in-house inventory.

---

## 🛠️ Development & Build Setup

### Prerequisites
* **Node.js** (v18+) or **Bun** (v1.3+)

### 1. Install Dependencies
```bash
bun install
# or
npm install
```

### 2. Database Sync
```bash
npx prisma generate
```

### 3. Run Development Server
```bash
bun run dev
# or
npm run dev
```

### 4. Production Build & Test
```bash
bun run build
# or
./node_modules/.bin/vite build
```

---

## 🧪 SQA Test Suite

To verify all core marketplace logic, run Vitest:

```bash
./node_modules/.bin/vitest run src/test/multivendorSupplierAffiliate.test.ts
./node_modules/.bin/vitest run src/test/ProductCard.test.tsx
```

### Test Coverage Checklist:
- [x] **Supplier Management**: Save, update, retrieve, and delete procurement suppliers.
- [x] **Affiliate Management**: Promo code generation, percentage/flat commission math, and payout ledgers.
- [x] **Multi-Vendor Engine**: Shop registration, slug generation, wallet balances, and commission deductions.
- [x] **Product Display**: Image responsiveness, wishlist triggers, quick view, and badge rendering.
