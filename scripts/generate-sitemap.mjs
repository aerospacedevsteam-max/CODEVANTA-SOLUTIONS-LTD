// Writes public/sitemap.xml and the Sitemap line in public/robots.txt.
// Product and category URLs come from the live database when SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY (public) are set, otherwise from scripts/catalogue.mjs.
// Usage: SITE_URL=https://your-domain.example npm run sitemap
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { categories, products } from './catalogue.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? 'https://YOUR-DOMAIN.example').replace(/\/$/, '');

const staticPaths = ['/', '/products', '/about', '/contact', '/faqs', '/support', '/terms', '/privacy', '/refund-policy', '/licence', '/cookies'];
let productSlugs = products.map((p) => p.slug);
let categorySlugs = categories.map((c) => c[1]);

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
if (url && anon) {
  const supabase = createClient(url, anon);
  const [{ data: ps }, { data: cs }] = await Promise.all([
    supabase.from('products').select('slug').in('status', ['published', 'coming_soon']),
    supabase.from('categories').select('slug').eq('is_published', true),
  ]);
  if (ps) productSlugs = ps.map((p) => p.slug);
  if (cs) categorySlugs = cs.map((c) => c.slug);
  console.log('Using live catalogue from Supabase.');
}

const paths = [...staticPaths, ...categorySlugs.map((s) => `/categories/${s}`), ...productSlugs.map((s) => `/products/${s}`)];
const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${site}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(root, 'public', 'sitemap.xml'), xml);
const robots = readFileSync(join(root, 'public', 'robots.txt'), 'utf8').replace(/^Sitemap: .*$/m, `Sitemap: ${site}/sitemap.xml`);
writeFileSync(join(root, 'public', 'robots.txt'), robots);
console.log(`Wrote ${paths.length} URLs to public/sitemap.xml for ${site}`);
