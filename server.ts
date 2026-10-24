import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import zlib from "zlib";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { createServer as createViteServer } from "vite";
import { app } from "./src/server/app";
import { prisma } from "./src/server/db";
import { getDbSettings } from "./src/server/routes/settingsRoutes";

async function injectServerMeta(html: string, reqPath: string, host: string, proto: string): Promise<string> {
  const storeSettings = await getDbSettings();
  const storeName = storeSettings?.storeName?.trim() || "ETTADI MART";
  const storeTagline = storeSettings?.storeTagline?.trim() || "China Imported Varieties & Smart Lifestyle Products";
  let title = storeSettings?.storeName?.trim()
    ? `${storeName} | ইত্যাদি মার্ট - China Imported Varieties | Online Shopping BD`
    : "ETTADI MART | ইত্যাদি মার্ট - China Imported Varieties | Online Shopping BD";
  let description = storeSettings?.storeTagline?.trim() || storeSettings?.footerDescription?.trim() || "ETTADI MART (ইত্যাদি মার্ট) - চায়না থেকে সরাসরি আমদানিকৃত সেরা ট্রেন্ডি স্মার্ট গ্যাজেটস, হোম ও কিচেন ভ্যারাইটিজ সমগ্র। সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারি।";
  
  // Use user-uploaded logo/favicon if configured, otherwise use clean placeholder SVG
  const uploadedLogo = storeSettings?.storeLogo?.trim();
  const uploadedFavicon = (storeSettings?.storeFavicon || storeSettings?.favicon)?.trim();
  let image = uploadedLogo || (uploadedFavicon ? uploadedFavicon : `${proto}://${host}/ettadimart-logo.svg`);
  const fullUrl = `${proto}://${host}${reqPath}`;

  let keywords = "ettadi mart, ettadimart, ettadi mart bd, ইত্যাদি মার্ট, ইত্তাদি মার্ট, china imported gadgets bd, smart lifestyle bangladesh, kitchen gadgets online shopping bd, smart home tools bangladesh, online shopping bangladesh, ক্যাশ অন ডেলিভারি শপিং, সেরা অনলাইন শপ, চায়না প্রোডাক্ট বাংলাদেশ, trending items bd, variety store dhaka, wholesale china products bd";
  let productSchemaHtml = "";

  if (reqPath.startsWith('/product')) {
    const rawSeg = reqPath.replace(/^\/product\/?/, '').split('/')[0] || '';
    const cleanSeg = decodeURIComponent(rawSeg).trim().toLowerCase();
    const pathLower = decodeURIComponent(reqPath).toLowerCase();

    try {
      const storeProducts = await prisma.product.findMany();
      const matched = storeProducts.find(p => {
        const pId = (p.id || '').toLowerCase();
        const rawTitle = (p.title || '').trim();
        const pSlug = (p.slug || rawTitle)
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-{2,}/g, '-');

        return (cleanSeg && (cleanSeg === pSlug || cleanSeg === pId)) ||
               (pSlug.length > 2 && pathLower.includes(pSlug)) ||
               (pId.length > 2 && pathLower.includes(pId));
      });

      if (matched) {
        title = `${matched.title} | ${storeName} - China Imported Varieties`;
        description = matched.description || (matched as any).subtitle || description;
        image = (matched as any).coverImage || matched.image || image;
        keywords = `${matched.title}, ${matched.brand || storeName}, ${matched.category || 'varieties'}, ${matched.title} price in bangladesh, buy ${matched.title} bd, ${storeName}, ইত্যাদি মার্ট, online shopping bangladesh, cash on delivery`;

        const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const productSchema = {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": matched.title,
          "image": image.startsWith('http') ? image : `${proto}://${host}${image}`,
          "description": description.replace(/<[^>]*>/g, '').slice(0, 300),
          "sku": matched.id,
          "mpn": matched.sku || matched.id,
          "category": matched.category || "China Imported Varieties & Smart Lifestyle",
          "brand": {
            "@type": "Brand",
            "name": matched.brand || storeName
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": (matched as any).rating || "4.9",
            "reviewCount": (matched as any).reviewsCount || (matched as any).reviewCount || "28",
            "bestRating": "5",
            "worstRating": "1"
          },
          "offers": {
            "@type": "Offer",
            "url": fullUrl,
            "priceCurrency": "BDT",
            "price": matched.price || 0,
            "priceValidUntil": validUntil,
            "availability": (matched.stock === undefined || matched.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition",
            "seller": {
              "@type": "Organization",
              "name": storeName
            },
            "shippingDetails": {
              "@type": "OfferShippingDetails",
              "shippingRate": {
                "@type": "MonetaryAmount",
                "value": "70",
                "currency": "BDT"
              },
              "shippingDestination": {
                "@type": "DefinedRegion",
                "addressCountry": "BD"
              },
              "deliveryTime": {
                "@type": "ShippingDeliveryTime",
                "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "d" },
                "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "d" }
              }
            },
            "hasMerchantReturnPolicy": {
              "@type": "MerchantReturnPolicy",
              "applicableCountry": "BD",
              "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
              "merchantReturnDays": 7,
              "returnMethod": "https://schema.org/ReturnByMail",
              "returnFees": "https://schema.org/FreeReturn"
            }
          }
        };
        productSchemaHtml = `<script type="application/ld+json">${JSON.stringify(productSchema)}</script>`;
      }
    } catch (e) {
      // ignore
    }
  } else if (reqPath.startsWith('/shop')) {
    title = `Shop All Variety Products | ${storeName} - China Imported`;
    description = `Explore our complete product catalog of China imported smart gadgets, kitchen tools, personal care and lifestyle items at ${storeName}. Fast cash on delivery in Bangladesh.`;
    keywords = `shop online bangladesh, variety products bd, smart gadgets dhaka, kitchen tools online, china direct products, ettadi mart collection, ইত্যাদি মার্ট শপ, ক্যাশ অন ডেলিভারি`;
  } else if (reqPath.startsWith('/about')) {
    title = `About Us | ${storeName} - China Imported Varieties`;
    description = `Learn more about ${storeName} and our dedication to providing factory-direct China imported variety products in Bangladesh.`;
    keywords = `about ettadi mart, ইত্যাদি মার্ট সম্পর্কে, china importer bangladesh, trustworthy ecommerce bd`;
  } else if (reqPath.startsWith('/contact')) {
    title = `Contact Us | ${storeName} - Customer Support`;
    description = `Reach out to the ${storeName} team for customer support, inquiries, and wholesale orders. Phone: +8801726275850.`;
    keywords = `contact ettadi mart, ইত্যাদি মার্ট হেল্পলাইন, ettadimart customer service, ecommerce support bd`;
  }

  let modified = html;
  // Replace Title
  modified = modified.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

  // Replace Meta Description
  modified = modified.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);

  // Replace Meta Keywords (Dynamic SEO Ranking)
  modified = modified.replace(/<meta name="keywords" content=".*?"\s*\/?>/i, `<meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}" />`);

  // Replace OpenGraph tags
  modified = modified.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
  modified = modified.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
  modified = modified.replace(/<meta property="og:image" content=".*?"\s*\/?>/i, `<meta property="og:image" content="${image}" />`);
  modified = modified.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${fullUrl}" />`);

  // Replace Twitter card tags
  modified = modified.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
  modified = modified.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
  modified = modified.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${image}" />`);

  // Replace or inject Canonical link
  if (modified.includes('<link rel="canonical"')) {
    modified = modified.replace(/<link rel="canonical" href=".*?"\s*\/?>/i, `<link rel="canonical" href="${fullUrl}" />`);
  } else {
    modified = modified.replace('</head>', `  <link rel="canonical" href="${fullUrl}" />\n</head>`);
  }

  // Inject Product Schema if on product page
  if (productSchemaHtml) {
    modified = modified.replace('</head>', `  ${productSchemaHtml}\n</head>`);
  }

  // Inject Google Site Verification if configured in settings
  const gVerification = (storeSettings as any)?.googleSiteVerification || (storeSettings as any)?.googleSearchConsoleVerification;
  if (gVerification) {
    const cleanCode = gVerification.includes('content="') ? (gVerification.match(/content="([^"]+)"/)?.[1] || gVerification) : gVerification.trim();
    if (cleanCode) {
      modified = modified.replace('</head>', `  <meta name="google-site-verification" content="${cleanCode}" />\n</head>`);
    }
  }

  // Dynamically update favicon tag
  const faviconUrl = uploadedFavicon || '/placeholder-favicon.svg';
  modified = modified.replace(/<link rel="icon" [^>]*>/i, `<link rel="icon" href="${faviconUrl}" />`);
  modified = modified.replace(/<link rel="shortcut icon" [^>]*>/i, `<link rel="shortcut icon" href="${faviconUrl}" />`);

  return modified;
}

const PORT = Number(process.env.PORT) || 3004;

// Standard Security & Trust Headers for Google SEO Trust, Page Experience & Protection
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.removeHeader('X-Powered-By');
  next();
});

// Native HTTP Gzip/Deflate Compression Middleware (Zero dependency)
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
    return next();
  }

  const originalSend = res.send.bind(res);
  res.send = (body: any) => {
    // Only compress text, json, and html payloads larger than 1KB
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      const contentType = (res.getHeader('Content-Type') as string) || '';
      const isCompressible = contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript') || contentType.includes('xml');

      if (isCompressible && (typeof body === 'string' ? Buffer.byteLength(body) : body.length) > 1024) {
        if (acceptEncoding.includes('gzip')) {
          res.setHeader('Content-Encoding', 'gzip');
          res.removeHeader('Content-Length');
          return zlib.gzip(body, (err, compressed) => {
            if (err) return originalSend(body);
            originalSend(compressed);
          });
        }
      }
    }
    return originalSend(body);
  };
  next();
});

// ==================== SEO: DYNAMIC SITEMAP & ROBOTS ====================
app.get('/sitemap.xml', async (req, res) => {
  try {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const rawHost = req.headers.host || 'ettadimart.com';
    const host = rawHost.includes('ettadimart.com') ? 'https://ettadimart.com' : `${proto}://${rawHost}`;

    const staticRoutes = [
      { loc: `${host}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${host}/shop`, priority: '0.9', changefreq: 'daily' },
      { loc: `${host}/about`, priority: '0.8', changefreq: 'monthly' },
      { loc: `${host}/contact`, priority: '0.8', changefreq: 'monthly' },
      { loc: `${host}/quiz`, priority: '0.8', changefreq: 'weekly' }
    ];

    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const r of staticRoutes) {
      xml += `  <url>\n    <loc>${r.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>\n`;
    }

    const slugify = (value: string) => {
      if (!value) return '';
      return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^\u0980-\u09ffa-zA-Z0-9\s-]+/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    };

    const seenUrls = new Set<string>();
    try {
      const products = await prisma.product.findMany({
        select: { id: true, title: true, slug: true, updatedAt: true }
      });

      for (const p of products) {
        const slug = slugify(p.slug || p.title || p.id);
        if (!slug) continue;
        const loc = `${host}/product/${encodeURIComponent(slug)}`;
        if (seenUrls.has(loc)) continue;
        seenUrls.add(loc);

        const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : today;
        xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
    } catch (dbErr) {
      console.warn('Failed querying products for sitemap:', dbErr);
    }

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(xml);
  } catch (err) {
    const staticSitemap = path.join(process.cwd(), 'public', 'sitemap.xml');
    if (fs.existsSync(staticSitemap)) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      return res.sendFile(staticSitemap);
    }
    res.status(500).send('Error generating sitemap');
  }
});

app.get('/robots.txt', (_req, res) => {
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(robotsPath);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /checkout\nSitemap: https://ettadimart.com/sitemap.xml\n");
});

// AEO / LLM Knowledge endpoint for AI Search Engines (ChatGPT, Perplexity, Gemini)
app.get('/llms.txt', (_req, res) => {
  const llmsPath = path.join(process.cwd(), 'public', 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(llmsPath);
  }
  res.status(404).send('Not Found');
});

// Google Merchant Center & Google Shopping RSS Product Feed
app.get('/feed.xml', async (req, res) => {
  try {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const rawHost = req.headers.host || 'ettadimart.com';
    const host = rawHost.includes('ettadimart.com') ? 'https://ettadimart.com' : `${proto}://${rawHost}`;

    const products = await prisma.product.findMany();
    
    let feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ETTADI MART - Google Shopping Product Feed</title>
    <link>${host}</link>
    <description>Direct China Imported Varieties and Smart Lifestyle Products in Bangladesh</description>
`;

    for (const p of products) {
      const slug = p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const prodUrl = `${host}/product/${encodeURIComponent(slug)}`;
      const prodImg = (p.image?.startsWith('http') ? p.image : `${host}${p.image || '/ettadimart-logo.svg'}`);
      const priceVal = `${p.price || 0} BDT`;
      const availability = (p.stock === undefined || p.stock > 0) ? 'in_stock' : 'out_of_stock';
      const cleanDesc = (p.description || p.subtitle || p.title)
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .slice(0, 500);

      feedXml += `    <item>
      <g:id>${p.id}</g:id>
      <g:title><![CDATA[${p.title}]]></g:title>
      <g:description><![CDATA[${cleanDesc}]]></g:description>
      <g:link>${prodUrl}</g:link>
      <g:image_link>${prodImg}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${priceVal}</g:price>
      <g:brand><![CDATA[${p.brand || 'ETTADI MART'}]]></g:brand>
      <g:product_type><![CDATA[${p.category || 'General Variety'}]]></g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>BD</g:country>
        <g:service>Standard Delivery</g:service>
        <g:price>70 BDT</g:price>
      </g:shipping>
    </item>\n`;
    }

    feedXml += `  </channel>\n</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(feedXml);
  } catch (err) {
    res.status(500).send('Error generating product feed');
  }
});

// ==================== VITE / STATIC SERVER ====================
async function startServer() {
  const isDev = process.env.NODE_ENV !== "production" ||
                process.env.npm_lifecycle_event === 'dev' ||
                !fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // Static Assets Cache (Immutable 1-year cache for fingerprinted JS/CSS/Images)
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));

    // Fallback static files directly from public directory
    app.use(express.static(path.join(process.cwd(), 'public')));

    const getIndexHtml = () => {
      let filePath = path.join(distPath, 'index.html');
      if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), 'index.html');
      }
      if (fs.existsSync(filePath)) {
        const html = fs.readFileSync(filePath, 'utf-8');
        const etag = `"${crypto.createHash('md5').update(html).digest('hex')}"`;
        return { html, etag };
      }
      return { html: null, etag: null };
    };

    // SPA Page Route Handler with Micro-caching & Dynamic Server-side Meta Injection
    app.get('*', async (req, res) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/cdn') || req.path.startsWith('/uploads')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }

      // Prevent non-HTML file requests (e.g. missing .js, .tsx, .css) from returning index.html
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return res.status(404).end();
      }

      const { html, etag } = getIndexHtml();
      if (!html) {
        return res.sendFile(path.join(process.cwd(), 'index.html'));
      }

      const host = req.headers.host || 'localhost:3000';
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const isMetaRoute = req.path === '/' || req.path.startsWith('/product') || req.path.startsWith('/shop') || req.path.startsWith('/about') || req.path.startsWith('/contact') || req.path.startsWith('/quiz');

      if (isMetaRoute) {
        const enrichedHtml = await injectServerMeta(html, req.path, host, proto);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(enrichedHtml);
      }

      // Check 304 Not Modified for static index
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === etag) {
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('X-Page-Cache', 'HIT-304');
        return res.status(304).end();
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (etag) res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Page-Cache', 'HIT-MEMORY');
      res.send(html);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Ettadi Mart E-Commerce Server active on http://localhost:${PORT}`);
  });
}

startServer();
