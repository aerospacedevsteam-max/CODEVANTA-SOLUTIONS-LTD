// Uploads the packaged ZIPs in dist-products/ to the PRIVATE `product-files`
// bucket, records them in product_files and (with --publish) publishes each
// product. The database re-validates every publication rule.
//
// Usage:
//   npm run products:build
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run products:upload            # upload only
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run products:upload -- --publish
//   ... -- --only=business-website-starter-kit,portfolio-website-starter-kit
//
// The service-role key bypasses RLS: run this only on a trusted machine and
// never expose the key to the browser or commit it.
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const publish = args.includes('--publish');
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell (never in VITE_ variables).');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(root, 'dist-products', 'manifest.json'), 'utf8'));
} catch {
  console.error('dist-products/manifest.json not found — run `npm run products:build` first.');
  process.exit(1);
}

let failures = 0;
for (const item of manifest.filter((m) => !only || only.includes(m.slug))) {
  try {
    const buffer = readFileSync(join(root, 'dist-products', item.file));
    const sha = createHash('sha256').update(buffer).digest('hex');
    if (sha !== item.sha256) throw new Error('checksum does not match manifest — rebuild before uploading');

    const { data: product, error: pErr } = await supabase.from('products').select('id, status').eq('slug', item.slug).single();
    if (pErr || !product) throw new Error(`product "${item.slug}" not found in database`);

    // Unguessable object path; the bucket is private either way.
    const path = `${item.slug}/${randomUUID()}/${item.file}`;
    const { error: upErr } = await supabase.storage.from('product-files').upload(path, buffer, { contentType: 'application/zip', upsert: false });
    if (upErr) throw new Error(`upload failed: ${upErr.message}`);

    const { error: fErr } = await supabase.from('product_files').upsert(
      { product_id: product.id, storage_path: path, file_name: item.file, size_bytes: item.size, checksum_sha256: sha, uploaded_at: new Date().toISOString() },
      { onConflict: 'product_id' },
    );
    if (fErr) throw new Error(`recording file failed: ${fErr.message}`);

    if (publish && product.status !== 'published') {
      const { error: sErr } = await supabase.from('products').update({ status: 'published' }).eq('id', product.id);
      if (sErr) throw new Error(`publish rejected: ${sErr.message}`);
    }
    console.log(`OK   ${item.slug} → private storage${publish ? ' · published' : ''}`);
  } catch (e) {
    failures++;
    console.error(`FAIL ${item.slug}: ${e.message}`);
  }
}
process.exit(failures ? 1 : 0);
