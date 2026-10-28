// One command that brings the linked Supabase project up to date:
//   1. applies pending SQL migrations (tracked in supabase_migrations.schema_migrations,
//      the same table the Supabase CLI uses)
//   2. sets Auth redirect URLs and password policy
//   3. sets Edge Function secrets
//   4. deploys Edge Functions whose files changed
//   5. packages products and uploads changed ZIPs to private storage, then publishes them
// Everything is idempotent; unchanged steps are skipped.
//
// Needs in .env (git-ignored):
//   VITE_SUPABASE_URL=https://<ref>.supabase.co
//   SUPABASE_ACCESS_TOKEN=sbp_...   (Dashboard → Account → Access Tokens; NEVER prefix with VITE_)
// Usage: npm run supabase:sync         (also runs automatically before `npm run dev`)
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ifConfigured = process.argv.includes('--if-configured');
const envPath = join(root, '.env');

function loadEnv() {
  const env = {};
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
const env = { ...loadEnv(), ...process.env };
const token = env.SUPABASE_ACCESS_TOKEN;
const projectUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const ref = projectUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

if (!token || !ref) {
  const msg = !ref ? 'VITE_SUPABASE_URL missing in .env' : 'SUPABASE_ACCESS_TOKEN missing in .env';
  if (ifConfigured) {
    console.log(`[supabase-sync] skipped (${msg})`);
    process.exit(0);
  }
  console.error(`[supabase-sync] ${msg}. Create a token at https://supabase.com/dashboard/account/tokens and add it to .env.`);
  process.exit(1);
}

const statePath = join(root, 'supabase', '.temp', 'sync-state.json');
mkdirSync(dirname(statePath), { recursive: true });
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
const saveState = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
const sha = (data) => createHash('sha256').update(data).digest('hex');
const log = (...a) => console.log('[supabase-sync]', ...a);

async function api(method, path, body, { form } = {}) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(form ? {} : { 'Content-Type': 'application/json' }) },
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}
const sql = (query) => api('POST', '/database/query', { query });

// ---------------------------------------------------------------- 1. migrations
async function migrate() {
  await sql(`create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
  const applied = new Set((await sql('select version from supabase_migrations.schema_migrations')).map((r) => r.version));
  const dir = join(root, 'supabase', 'migrations');
  let count = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const [version, ...nameParts] = file.replace(/\.sql$/, '').split('_');
    if (applied.has(version)) continue;
    const body = readFileSync(join(dir, file), 'utf8');
    if (body.includes('$migration_body$')) throw new Error(`${file} contains the reserved tag $migration_body$`);
    log(`applying migration ${file}`);
    await sql(`begin;
${body}
;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('${version}', '${nameParts.join('_')}', array[$migration_body$${body}$migration_body$]);
commit;`);
    count++;
  }
  log(count ? `${count} migration(s) applied` : 'database schema up to date');
}

// ---------------------------------------------------------------- 2. auth config
async function configureAuth() {
  const site = (env.SITE_URL ?? env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const urls = [...new Set([site, 'http://localhost:5173'])].flatMap((u) => [`${u}/auth/callback`, `${u}/auth/callback?*`, `${u}/reset-password`]);
  // Email confirmation is OFF by default (accounts work immediately). Set EMAIL_CONFIRMATION=true
  // in .env to require it — only do that once custom SMTP is configured in Supabase.
  const confirmEmails = String(env.EMAIL_CONFIRMATION).toLowerCase() === 'true';
  const config = { site_url: site, uri_allow_list: urls.join(','), password_min_length: 10, mailer_autoconfirm: !confirmEmails };
  const key = sha(JSON.stringify(config));
  if (state.auth === key) return log('auth settings up to date');
  await api('PATCH', '/config/auth', config);
  state.auth = key;
  saveState();
  log(`auth settings updated (site URL ${site})`);
}

// ---------------------------------------------------------------- 3. secrets
async function setSecrets() {
  if (!env.RATE_LIMIT_SALT) {
    env.RATE_LIMIT_SALT = randomBytes(32).toString('hex');
    appendFileSync(envPath, `\n# Generated by supabase-sync (server-side only)\nRATE_LIMIT_SALT=${env.RATE_LIMIT_SALT}\n`);
  }
  const site = (env.SITE_URL ?? env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const secrets = {
    SITE_URL: site,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS ?? [...new Set([site, 'http://localhost:5173', 'http://localhost:4173'])].join(','),
    RATE_LIMIT_SALT: env.RATE_LIMIT_SALT,
  };
  // Payment/email secrets are pushed only once you add them to .env.
  for (const k of ['PAYMENT_PROVIDER', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM']) {
    if (env[k]) secrets[k] = env[k];
  }
  const key = sha(JSON.stringify(secrets));
  if (state.secrets === key) return log('function secrets up to date');
  await api('POST', '/secrets', Object.entries(secrets).map(([name, value]) => ({ name, value })));
  state.secrets = key;
  saveState();
  log(`function secrets set: ${Object.keys(secrets).join(', ')}`);
}

// ---------------------------------------------------------------- 4. edge functions
const FUNCTIONS = { 'create-order': true, download: true, 'submit-form': false, 'payment-webhook': false }; // name → verify_jwt

function functionFiles(name) {
  const base = join(root, 'supabase', 'functions');
  const list = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(join(d, e.name)) : [join(d, e.name)]));
  return [...list(join(base, name)), ...list(join(base, '_shared'))].filter((f) => f.endsWith('.ts'));
}

async function deployFunctions() {
  for (const [name, verifyJwt] of Object.entries(FUNCTIONS)) {
    const files = functionFiles(name);
    const key = sha(files.map((f) => relative(root, f) + readFileSync(f, 'utf8')).join('\n') + verifyJwt);
    if (state.functions?.[name] === key) {
      log(`function ${name} up to date`);
      continue;
    }
    const rel = (f) => relative(root, f).split(sep).join('/');
    const form = new FormData();
    form.append('metadata', JSON.stringify({ name, entrypoint_path: `supabase/functions/${name}/index.ts`, verify_jwt: verifyJwt }));
    for (const f of files) form.append('file', new Blob([readFileSync(f)], { type: 'application/typescript' }), rel(f));
    await api('POST', `/functions/deploy?slug=${name}`, undefined, { form });
    state.functions = { ...state.functions, [name]: key };
    saveState();
    log(`function ${name} deployed (verify_jwt=${verifyJwt})`);
  }
}

// ---------------------------------------------------------------- 5. product files
async function secretKey() {
  const keys = await api('GET', '/api-keys?reveal=true');
  const secret = keys.find((k) => k.type === 'secret')?.api_key ?? keys.find((k) => k.name === 'service_role')?.api_key;
  if (!secret) throw new Error('could not read a secret/service_role key for storage access');
  return secret;
}

/** Deletes private product files that no product points to (replaced uploads). */
async function removeOrphanFiles() {
  const orphans = (await sql(`select o.name from storage.objects o
    where o.bucket_id = 'product-files'
      and not exists (select 1 from public.product_files f where f.storage_path = o.name)`)).map((r) => r.name);
  if (!orphans.length) return log('no unused product files in storage');
  const res = await fetch(`https://${ref}.supabase.co/storage/v1/object/product-files`, {
    method: 'DELETE',
    headers: { apikey: await secretKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: orphans }),
  });
  if (!res.ok) throw new Error(`storage cleanup → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  log(`removed ${orphans.length} unused product file(s) from storage`);
}

async function syncProducts() {
  execFileSync(process.execPath, [join(root, 'scripts', 'build-products.mjs')], { cwd: root, stdio: 'ignore' });
  const manifest = JSON.parse(readFileSync(join(root, 'dist-products', 'manifest.json'), 'utf8'));
  const changed = manifest.filter((m) => state.products?.[m.slug] !== m.sha256).map((m) => m.slug);
  if (!changed.length) return log('product files up to date');

  const secret = await secretKey();
  log(`uploading ${changed.length} product file(s) to private storage…`);
  execFileSync(process.execPath, [join(root, 'scripts', 'upload-products.mjs'), '--publish', `--only=${changed.join(',')}`], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_URL: `https://${ref}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: secret },
  });
  state.products = { ...state.products, ...Object.fromEntries(manifest.filter((m) => changed.includes(m.slug)).map((m) => [m.slug, m.sha256])) };
  saveState();
}

// ---------------------------------------------------------------- admin account
async function ensureAdmin() {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return;
  if (!/^[^\s@']+@[^\s@']+\.[^\s@']+$/.test(email)) throw new Error('ADMIN_EMAIL is not a valid email');
  const rows = await sql(`update public.profiles set role = 'admin'
    where id = (select id from auth.users where lower(email) = '${email}') and role <> 'admin' returning id`);
  const exists = await sql(`select 1 from auth.users where lower(email) = '${email}'`);
  if (!exists.length) log(`ADMIN_EMAIL ${email} has not registered yet — register on the site, then run the sync again`);
  else log(rows.length ? `${email} is now an admin` : `${email} is admin`);
}

try {
  log(`project ${ref}`);
  await migrate();
  await ensureAdmin();
  await configureAuth();
  await setSecrets();
  await deployFunctions();
  await syncProducts();
  await removeOrphanFiles();
  log('done ✔');
} catch (e) {
  console.error('[supabase-sync] FAILED:', e.message);
  // Do not block `npm run dev` when offline; the next run retries.
  process.exit(ifConfigured ? 0 : 1);
}
