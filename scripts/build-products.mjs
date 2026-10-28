// Packages every product in products.config.mjs into dist-products/*.zip and
// writes dist-products/manifest.json (size + SHA-256) for the upload script.
// Usage: npm run products:build
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from './products.config.mjs';
import { buildZip } from './lib/package-products.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sources = join(root, 'product-sources');
const out = join(root, 'dist-products');
mkdirSync(out, { recursive: true });

const manifest = [];
let failed = false;
for (const p of products) {
  try {
    const z = await buildZip(sources, p);
    writeFileSync(join(out, z.fileName), z.buffer);
    manifest.push({ slug: p.slug, version: p.version, file: z.fileName, size: z.size, sha256: z.sha256, entries: z.entries });
    console.log(`OK   ${z.fileName}  ${(z.size / 1024).toFixed(1)} KB  ${z.entries} files`);
  } catch (e) {
    failed = true;
    console.error(`FAIL ${p.slug}\n${e.message}`);
  }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
if (failed) process.exit(1);
console.log(`\n${manifest.length} archives written to dist-products/`);
