import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const migrationsDir = join(root, 'supabase', 'migrations');

export type Role = 'anon' | 'authenticated' | 'service_role';
export type Tx = Transaction;

/** Fresh database with the Supabase shim and every committed migration applied. */
export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(join(__dirname, 'supabase-shim.sql'), 'utf8'));
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  }
  return db;
}

/** Run `fn` as an API role, with JWT claims for `userId` (if any) — like PostgREST does. */
export async function as<T>(db: PGlite, role: Role, userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(userId ? { sub: userId, role } : { role }),
    ]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}

export async function createUser(db: PGlite, email: string, fullName = 'Test User'): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify({ full_name: fullName, role: 'admin' /* must be ignored */ })],
  );
  return rows[0].id;
}

export async function makeAdmin(db: PGlite, userId: string): Promise<void> {
  await db.query(`update public.profiles set role = 'admin' where id = $1`, [userId]);
}

export async function createCategory(db: PGlite, slug = 'website-templates'): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.categories (name, slug) values ($1, $2) returning id`,
    [slug.replace(/-/g, ' '), slug],
  );
  return rows[0].id;
}

interface ProductOpts {
  slug: string;
  price: number;
  categoryId: string;
  currency?: string;
  publish?: boolean;
  status?: 'draft' | 'coming_soon';
}

/** Creates a complete product; when publish=true also attaches a stored file and publishes it. */
export async function createProduct(db: PGlite, o: ProductOpts): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.products
       (title, slug, short_description, description, price, currency, category_id,
        preview_images, contents, licence_text, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
    [
      `Product ${o.slug}`,
      o.slug,
      'A complete original starter kit for testing.',
      'A complete original starter kit used by the automated tests. '.repeat(4),
      o.price,
      o.currency ?? 'INR',
      o.categoryId,
      ['/previews/test.svg'],
      JSON.stringify([{ name: 'index.html', description: 'Home page' }]),
      'Standard licence text for one licensee. You may use the files in end products.',
      o.status ?? 'draft',
    ],
  );
  const id = rows[0].id;
  if (o.publish) {
    const path = `${o.slug}/${o.slug}-v1.zip`;
    await db.query(`insert into storage.objects (bucket_id, name) values ('product-files', $1)`, [path]);
    await db.query(`insert into public.product_files (product_id, storage_path, file_name) values ($1, $2, $3)`, [
      id,
      path,
      `${o.slug}.zip`,
    ]);
    await db.query(`update public.products set status = 'published' where id = $1`, [id]);
  }
  return id;
}

/** Creates a pending order through the trusted path and attaches a provider order id. */
export async function createPendingOrder(
  db: PGlite,
  customerId: string,
  productIds: string[],
  providerOrderId: string,
  coupon: string | null = null,
): Promise<{ order_id: string; total: string }> {
  const order = await as(db, 'service_role', null, async (tx) => {
    const { rows } = await tx.query<{ o: { order_id: string; total: string } }>(
      `select public.create_order($1, $2::uuid[], $3, 'razorpay') as o`,
      [customerId, productIds, coupon],
    );
    await tx.query(`update public.orders set provider_order_id = $1 where id = $2`, [providerOrderId, rows[0].o.order_id]);
    return rows[0].o;
  });
  return order;
}

export async function payEvent(
  db: PGlite,
  eventId: string,
  providerOrderId: string,
  outcome: string,
  amount: number,
  currency = 'INR',
): Promise<{ result: string }> {
  return as(db, 'service_role', null, async (tx) => {
    const { rows } = await tx.query<{ r: { result: string } }>(
      `select public.process_payment_event('razorpay', $1, $2, $3, $4, $5, $6) as r`,
      [eventId, `test.${outcome}`, providerOrderId, outcome, amount, currency],
    );
    return rows[0].r;
  });
}
