// Real-browser smoke test of the production build.
// Builds the app against a stub Supabase URL, serves it, and drives headless
// Chrome through every route at phone/tablet/desktop widths. Supabase REST
// calls are intercepted (CDP Fetch domain) and answered from the seed catalogue,
// so pages render with realistic data. Checks: no JS errors, an <h1> exists,
// no horizontal overflow. Screenshots go to node_modules/.cache/smoke/.
// Usage: npm run test:browser
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './lib/chrome.mjs';
import { categories, products } from './catalogue.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'node_modules', '.cache', 'smoke-dist');
const shots = join(root, 'node_modules', '.cache', 'smoke');
mkdirSync(shots, { recursive: true });
const STUB = 'https://stub-project.supabase.co';

if (!process.env.SMOKE_SKIP_BUILD) execSync(`npx vite build --outDir "${outDir}" --emptyOutDir --logLevel warn${process.env.SMOKE_NO_MINIFY ? " --minify false --mode development" : ""}`, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_SUPABASE_URL: STUB, VITE_SUPABASE_PUBLISHABLE_KEY: 'stub-publishable-key', VITE_SITE_URL: 'http://127.0.0.1' },
});

// ---------------------------------------------------------------- fake data
const previews = JSON.parse(readFileSync(join(root, 'public', 'previews', 'previews.json'), 'utf8'));
const cats = categories.map(([name, slug, description, icon], i) => ({ id: `c${i}`, name, slug, description, icon, image_path: null, is_published: true, display_order: (i + 1) * 10, archived_at: null }));
const rows = products.map((p, i) => {
  const c = cats.find((x) => x.slug === p.category);
  return {
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    title: p.title, slug: p.slug, subtitle: p.subtitle, short_description: p.short_description, description: p.description,
    product_type: p.product_type, highlights: p.highlights, contents: p.contents.map(([name, description]) => ({ name, description })),
    technical_requirements: p.requirements, compatibility: p.compatibility, faq: p.faq.map(([question, answer]) => ({ question, answer })),
    licence_text: p.licence_text, support_info: p.support_info, price: p.price, currency: 'INR', original_price: null,
    category_id: c.id, preview_images: previews[p.slug], version: p.version, status: 'published', is_featured: p.featured,
    seo_title: null, seo_description: null, published_at: `2026-10-${String(10 + i).padStart(2, '0')}T00:00:00Z`,
    created_at: `2026-10-${String(10 + i).padStart(2, '0')}T00:00:00Z`, updated_at: '2026-10-28T00:00:00Z',
    category: { id: c.id, name: c.name, slug: c.slug },
  };
});
const summary = (r) => ({ ...r, category_name: r.category.name, category_slug: r.category.slug });

function respond(url, method, body) {
  const u = new URL(url);
  const path = u.pathname.replace('/rest/v1/', '');
  const p = Object.fromEntries(u.searchParams);
  if (path === 'site_settings') return [];
  if (path === 'categories') return cats;
  if (path === 'rpc/bestselling_products' || path === 'rpc/product_reviews') return [];
  if (path === 'rpc/product_review_summary') return { count: 0, average: null };
  if (path === 'rpc/search_products') {
    const a = JSON.parse(body || '{}');
    let list = rows.map(summary);
    if (a.p_category_slug) list = list.filter((r) => r.category_slug === a.p_category_slug);
    if (a.p_query) list = list.filter((r) => (r.title + r.short_description).toLowerCase().includes(a.p_query.toLowerCase()));
    return { total: list.length, page: 1, page_size: 12, items: list.slice(0, 12) };
  }
  if (path === 'rpc/quote_order') {
    const a = JSON.parse(body || '{}');
    const items = rows.filter((r) => a.p_product_ids.includes(r.id)).map((r) => ({ product_id: r.id, title: r.title, slug: r.slug, unit_price: r.price, currency: 'INR', preview_image: r.preview_images[0], product_type: r.product_type }));
    const subtotal = items.reduce((s, i) => s + i.unit_price, 0);
    return { items, unavailable: [], currency: 'INR', subtotal, discount: 0, total: subtotal, coupon: null };
  }
  if (path === 'products') {
    let list = rows;
    if (p.slug) list = list.filter((r) => r.slug === p.slug.replace('eq.', ''));
    if (p.is_featured) list = list.filter((r) => r.is_featured);
    if (p.category_id) list = list.filter((r) => r.category_id === p.category_id.replace('eq.', ''));
    if (p.id?.startsWith('neq.')) list = list.filter((r) => r.id !== p.id.slice(4));
    if (p.limit) list = list.slice(0, Number(p.limit));
    return list;
  }
  return [];
}

// ---------------------------------------------------------------- server
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
  let file = join(outDir, rel);
  if (rel.startsWith('..') || !existsSync(file) || !extname(file)) file = join(outDir, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------- browser
const chrome = await launchChrome({ port: 9361 });
const errors = [];
chrome.onEvent(async (e) => {
  if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text);
  if (process.env.SMOKE_DEBUG && e.method === 'Runtime.consoleAPICalled') console.log('[console.' + e.params.type + ']', e.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 600));
  if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') errors.push(e.params.args.map((a) => a.value ?? a.description).join(' '));
  if (e.method === 'Fetch.requestPaused') {
    const { requestId, request } = e.params;
    const cors = [{ name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: '*' }];
    if (request.method === 'OPTIONS') return chrome.send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: cors });
    let data = respond(request.url, request.method, request.postData);
    const wantsObject = Object.entries(request.headers).some(([k, v]) => k.toLowerCase() === 'accept' && v.includes('vnd.pgrst.object'));
    if (wantsObject && Array.isArray(data)) data = data[0] ?? null;
    await chrome.send('Fetch.fulfillRequest', {
      requestId, responseCode: 200,
      responseHeaders: [...cors, { name: 'Content-Type', value: 'application/json' }, { name: 'Content-Range', value: '0-0/*' }],
      body: Buffer.from(JSON.stringify(data)).toString('base64'),
    });
  }
});
await chrome.send('Fetch.enable', { patterns: [{ urlPattern: `${STUB}/*` }] });

const routes = process.env.SMOKE_ROUTES ? process.env.SMOKE_ROUTES.split(',') : ['/', '/products', '/products?view=list', '/categories/business-templates', '/products/website-starter-collection', '/products/small-business-finance-tracker', '/search?q=dashboard', '/cart', '/checkout', '/checkout/cancelled', '/signin', '/register', '/forgot-password', '/about', '/contact', '/faqs', '/support', '/privacy', '/terms', '/refund-policy', '/licence', '/cookies', '/no-such-page', '/admin'];
const widths = [[375, true], [768, false], [1280, false]];
const shotList = new Set(['/', '/products', '/products/website-starter-collection', '/cart', '/checkout', '/contact']);
let failures = 0;

for (const [w, mobile] of widths) {
  await chrome.viewport(w, 900, mobile);
  for (const route of routes) {
    errors.length = 0;
    if (route === '/cart' || route === '/checkout') {
      await chrome.goto(base + '/', 300);
      await chrome.evaluate(`localStorage.setItem('cv_cart_v1', JSON.stringify(${JSON.stringify([rows[1].id, rows[6].id])}))`);
    }
    await chrome.goto(base + route, 1400);
    const r = await chrome.evaluate(`({ h1: document.querySelector('h1')?.textContent?.trim() ?? null, sw: document.documentElement.scrollWidth, iw: innerWidth, title: document.title, h: document.documentElement.scrollHeight,
      offenders: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.sr-only,[aria-hidden=true],.overflow-x-auto')).slice(0, 3).map(e => e.tagName + '.' + String(e.className).slice(0, 60)) })`);
    const problems = [];
    if (!r.h1 && route !== '/admin') problems.push('no h1');
    if (r.sw > r.iw) problems.push(`horizontal overflow ${r.sw}>${r.iw} ${JSON.stringify(r.offenders)}`);
    if (errors.length) problems.push(`errors: ${errors.join(' | ').slice(0, 300)}`);
    if (problems.length) failures++;
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${String(w).padEnd(4)} ${route.padEnd(42)} ${problems.length ? problems.join('; ') : `h1="${(r.h1 ?? '').slice(0, 50)}"`}`);
    if (shotList.has(route) && (w === 375 || w === 1280)) {
      const height = Math.min(r.h, 6000);
      await chrome.viewport(w, height, mobile);
      await new Promise((res) => setTimeout(res, 500));
      writeFileSync(join(shots, `${route === '/' ? 'home' : route.replace(/[/?=]/g, '_')}-${w}.jpg`), await chrome.screenshot({ width: w, height, quality: 70 }));
      await chrome.viewport(w, 900, mobile);
    }
  }
}
await chrome.close();
server.close();
console.log(failures ? `\n${failures} route checks failed` : '\nAll browser route checks passed');
process.exit(failures ? 1 : 0);
