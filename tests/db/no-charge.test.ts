/**
 * No-charge checkout (used until a payment gateway is connected): orders
 * complete without payment, grant access, and are recorded as $0 — never as
 * money received.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createCategory, createDb, createProduct, createUser, makeAdmin } from './helpers';

let db: PGlite;
let alice: string;
let admin: string;
let kit: string;
let draft: string;

const complete = (customer: string, ids: string[]) =>
  as(db, 'service_role', null, async (tx) =>
    (await tx.query<{ r: { order_id: string; order_number: string } }>(`select public.complete_no_charge_order($1, $2::uuid[]) as r`, [customer, ids])).rows[0].r,
  );

beforeAll(async () => {
  db = await createDb();
  // Start without the seeded catalogue/settings so the mode can be switched explicitly.
  await db.exec('truncate public.products, public.categories, public.site_settings cascade');
  alice = await createUser(db, 'alice@example.test', 'Alice');
  admin = await createUser(db, 'admin@example.test', 'Admin');
  await makeAdmin(db, admin);
  const cat = await createCategory(db);
  kit = await createProduct(db, { slug: 'kit', price: 199, currency: 'USD', categoryId: cat, publish: true });
  draft = await createProduct(db, { slug: 'draft-kit', price: 99, currency: 'USD', categoryId: cat });
}, 60_000);

describe('USD migration', () => {
  it('moves the seeded catalogue to USD with the same numbers and enables no-charge checkout', async () => {
    const fresh = await createDb();
    const { rows } = await fresh.query<{ currency: string; price: string; slug: string }>(`select currency, price, slug from public.products`);
    expect(rows.every((r) => r.currency === 'USD')).toBe(true);
    expect(Number(rows.find((r) => r.slug === 'website-starter-collection')!.price)).toBe(289);
    const s = await fresh.query<{ v: any }>(`select setting_value as v from public.site_settings where setting_key = 'commerce'`);
    expect(s.rows[0].v).toMatchObject({ default_currency: 'USD', currencies: ['USD'], checkout_mode: 'no_charge' });
  });
});

describe('complete_no_charge_order', () => {
  it('cannot be called by customers or visitors', async () => {
    for (const role of ['anon', 'authenticated'] as const) {
      await expect(
        as(db, role, role === 'anon' ? null : alice, (tx) => tx.query(`select public.complete_no_charge_order($1, $2::uuid[])`, [alice, [kit]])),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it('is refused when the store is not in no-charge mode', async () => {
    await expect(complete(alice, [kit])).rejects.toThrow(/NO_CHARGE_DISABLED/);
  });

  it('completes the order at $0, keeps list prices, and grants a working download', async () => {
    await db.query(
      `insert into public.site_settings (setting_key, setting_value) values ('commerce', '{"checkout_mode":"no_charge"}')`,
    );
    const r = await complete(alice, [kit]);
    const { rows } = await db.query<any>(`select * from public.orders where id = $1`, [r.order_id]);
    expect(rows[0]).toMatchObject({ payment_provider: 'no_charge', payment_status: 'paid', currency: 'USD' });
    expect([Number(rows[0].subtotal), Number(rows[0].discount_amount), Number(rows[0].total)]).toEqual([199, 199, 0]);
    const items = await db.query<{ unit_price: string }>(`select unit_price from public.order_items where order_id = $1`, [r.order_id]);
    expect(Number(items.rows[0].unit_price)).toBe(199);
    const grant = await as(db, 'service_role', null, async (tx) =>
      (await tx.query<{ g: any }>(`select public.authorize_download($1, $2) as g`, [alice, kit])).rows[0].g,
    );
    expect(grant.file_name).toBe('kit.zip');
    // No fabricated payment-provider events.
    expect((await db.query(`select 1 from public.payment_events`)).rows).toHaveLength(0);
  });

  it('rejects products already owned, unpublished products and empty orders', async () => {
    await expect(complete(alice, [kit])).rejects.toThrow(/ALREADY_OWNED/);
    await expect(complete(alice, [draft])).rejects.toThrow(/PRODUCT_UNAVAILABLE/);
    await expect(complete(alice, [])).rejects.toThrow(/EMPTY_ORDER/);
  });

  it('is not counted as a sale or revenue on the admin dashboard', async () => {
    const s = await as(db, 'authenticated', admin, async (tx) => (await tx.query<{ s: any }>(`select public.admin_dashboard_stats() as s`)).rows[0].s);
    expect(s).toMatchObject({ orders_paid: 0, orders_no_charge: 1, revenue: {} });
  });
});
