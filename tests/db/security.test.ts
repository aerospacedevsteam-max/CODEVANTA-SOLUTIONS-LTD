/**
 * Executes the committed Supabase migrations in a real Postgres engine (PGlite)
 * and checks RLS, grants, pricing, payment idempotency and download rules
 * exactly as the API roles (anon / authenticated / service_role) see them.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  as,
  createCategory,
  createDb,
  createPendingOrder,
  createProduct,
  createUser,
  makeAdmin,
  payEvent,
} from './helpers';

let db: PGlite;
let admin: string;
let alice: string;
let bob: string;
let categoryId: string;
let starter: string; // published, 199
let saas: string; // published, 249
let draft: string; // draft
let soon: string; // coming soon

beforeAll(async () => {
  db = await createDb();
  // This suite asserts exact counts, so start from an empty catalogue (the seed is covered in catalogue.test.ts).
  await db.exec('truncate public.products, public.categories, public.site_settings, public.audit_logs cascade');
  admin = await createUser(db, 'admin@example.test', 'Ada Admin');
  alice = await createUser(db, 'alice@example.test', 'Alice Example');
  bob = await createUser(db, 'bob@example.test', 'Bob Example');
  await makeAdmin(db, admin);
  categoryId = await createCategory(db);
  starter = await createProduct(db, { slug: 'business-starter', price: 199, categoryId, publish: true });
  saas = await createProduct(db, { slug: 'saas-starter', price: 249, categoryId, publish: true });
  draft = await createProduct(db, { slug: 'unfinished-kit', price: 99, categoryId });
  soon = await createProduct(db, { slug: 'collection', price: 289, categoryId, status: 'coming_soon' });
  await db.query(
    `insert into public.coupons (code, discount_type, discount_value) values ('LAUNCH10', 'percent', 10)`,
  );
}, 60_000);

const rowsAs = async (role: 'anon' | 'authenticated', user: string | null, sql: string, params: unknown[] = []) =>
  as(db, role, user, async (tx) => (await tx.query(sql, params)).rows);

describe('profiles & roles', () => {
  it('ignores a role supplied in sign-up metadata', async () => {
    const { rows } = await db.query<{ role: string }>(`select role from public.profiles where id = $1`, [alice]);
    expect(rows[0].role).toBe('customer');
  });

  it('prevents a customer from promoting themselves to admin', async () => {
    await expect(
      rowsAs('authenticated', alice, `update public.profiles set role = 'admin' where id = $1`, [alice]),
    ).rejects.toThrow(/permission denied|ROLE_CHANGE_FORBIDDEN/);
  });

  it('lets a customer update their own name but not anyone else’s', async () => {
    await rowsAs('authenticated', alice, `update public.profiles set full_name = 'Alice E.' where id = $1`, [alice]);
    await rowsAs('authenticated', alice, `update public.profiles set full_name = 'Hacked' where id = $1`, [bob]);
    const { rows } = await db.query<{ id: string; full_name: string }>(
      `select id, full_name from public.profiles where id in ($1, $2)`,
      [alice, bob],
    );
    expect(rows.find((r) => r.id === alice)?.full_name).toBe('Alice E.');
    expect(rows.find((r) => r.id === bob)?.full_name).toBe('Bob Example');
  });

  it('hides other profiles from customers', async () => {
    const rows = await rowsAs('authenticated', alice, `select id from public.profiles`);
    expect(rows).toHaveLength(1);
  });
});

describe('catalogue access', () => {
  it('shows visitors published and coming-soon products only', async () => {
    const rows = await rowsAs('anon', null, `select id from public.products`);
    const ids = rows.map((r: any) => r.id);
    expect(ids).toEqual(expect.arrayContaining([starter, saas, soon]));
    expect(ids).not.toContain(draft);
  });

  it('never exposes private download paths to visitors or customers', async () => {
    await expect(rowsAs('anon', null, `select * from public.product_files`)).rejects.toThrow(/permission denied/);
    const rows = await rowsAs('authenticated', alice, `select * from public.product_files`);
    expect(rows).toHaveLength(0);
  });

  it('rejects catalogue writes from visitors and customers', async () => {
    await expect(
      rowsAs('anon', null, `insert into public.products (title, slug, price) values ('Bad', 'bad', 1)`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      rowsAs('authenticated', alice, `insert into public.products (title, slug, price) values ('Bad', 'bad', 1)`),
    ).rejects.toThrow(/row-level security/);
    const updated = await rowsAs(
      'authenticated',
      alice,
      `update public.products set price = 1 where id = $1 returning id`,
      [starter],
    );
    expect(updated).toHaveLength(0);
  });

  it('search_products filters, sorts and paginates', async () => {
    const res = await as(db, 'anon', null, async (tx) =>
      (await tx.query<{ r: any }>(`select public.search_products(null, null, null, null, 'price_asc', 1, 2) as r`))
        .rows[0].r,
    );
    expect(res.total).toBe(3);
    expect(res.items.map((i: any) => Number(i.price))).toEqual([199, 249]);
    const page2 = await as(db, 'anon', null, async (tx) =>
      (await tx.query<{ r: any }>(`select public.search_products(null, null, null, null, 'price_asc', 2, 2) as r`))
        .rows[0].r,
    );
    expect(page2.items.map((i: any) => Number(i.price))).toEqual([289]);
    const q = await as(db, 'anon', null, async (tx) =>
      (await tx.query<{ r: any }>(`select public.search_products('saas', null, 200, 300) as r`)).rows[0].r,
    );
    expect(q.items.map((i: any) => i.id)).toEqual([saas]);
    const wildcard = await as(db, 'anon', null, async (tx) =>
      (await tx.query<{ r: any }>(`select public.search_products('%') as r`)).rows[0].r,
    );
    expect(wildcard.total).toBe(0);
  });
});

describe('product publishing workflow', () => {
  it('blocks publishing without a downloadable file, then allows it once the file is stored', async () => {
    const id = await as(db, 'authenticated', admin, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.products (title, slug, short_description, description, price, category_id,
                                      preview_images, contents, licence_text)
         values ('Admin Kit', 'admin-kit', 'An admin-created starter kit for tests.', $1, 149, $2,
                 '{/previews/a.svg}', '[{"name":"a.html"}]', $3) returning id`,
        ['Long description for the admin created product. '.repeat(4), categoryId, 'Licence text '.repeat(6)],
      );
      return rows[0].id;
    });

    await expect(
      rowsAs('authenticated', admin, `update public.products set status = 'published' where id = $1`, [id]),
    ).rejects.toThrow(/PUBLISH_VALIDATION_FAILED: downloadable file/);

    await as(db, 'authenticated', admin, (tx) =>
      tx.query(`insert into public.product_files (product_id, storage_path, file_name) values ($1, 'admin-kit/v1.zip', 'admin-kit.zip')`, [id]),
    );
    await expect(
      rowsAs('authenticated', admin, `update public.products set status = 'published' where id = $1`, [id]),
    ).rejects.toThrow(/not present in storage/);

    await as(db, 'authenticated', admin, (tx) =>
      tx.query(`insert into storage.objects (bucket_id, name) values ('product-files', 'admin-kit/v1.zip')`),
    );
    await rowsAs('authenticated', admin, `update public.products set status = 'published' where id = $1`, [id]);
    const { rows } = await db.query<{ status: string; published_at: string }>(
      `select status, published_at from public.products where id = $1`,
      [id],
    );
    expect(rows[0].status).toBe('published');
    expect(rows[0].published_at).not.toBeNull();

    await expect(
      rowsAs('authenticated', admin, `delete from public.product_files where product_id = $1`, [id]),
    ).rejects.toThrow(/FILE_REQUIRED_WHILE_PUBLISHED/);

    const audit = await rowsAs(
      'authenticated',
      admin,
      `select action from public.audit_logs where entity_type = 'products' and entity_id = $1`,
      [id],
    );
    expect(audit.map((a: any) => a.action)).toEqual(expect.arrayContaining(['insert', 'update']));
  });

  it('validates required content before publishing', async () => {
    const id = await createProduct(db, { slug: 'thin-kit', price: 99, categoryId });
    await db.query(`update public.products set description = 'too short' where id = $1`, [id]);
    await expect(
      rowsAs('authenticated', admin, `update public.products set status = 'published' where id = $1`, [id]),
    ).rejects.toThrow(/description \(120\+ characters\)/);
  });
});

describe('storage', () => {
  it('only admins can upload or list private product files', async () => {
    await expect(
      rowsAs('authenticated', alice, `insert into storage.objects (bucket_id, name) values ('product-files', 'x.zip')`),
    ).rejects.toThrow(/row-level security/);
    expect(await rowsAs('anon', null, `select name from storage.objects where bucket_id = 'product-files'`)).toHaveLength(0);
    expect(
      await rowsAs('authenticated', alice, `select name from storage.objects where bucket_id = 'product-files'`),
    ).toHaveLength(0);
    expect(
      (await rowsAs('authenticated', admin, `select name from storage.objects where bucket_id = 'product-files'`))
        .length,
    ).toBeGreaterThan(0);
  });
});

describe('server-side pricing', () => {
  it('quote_order uses database prices and flags unavailable items', async () => {
    const q = await as(db, 'anon', null, async (tx) =>
      (await tx.query<{ q: any }>(`select public.quote_order($1::uuid[], 'launch10') as q`, [[starter, saas, draft, soon]]))
        .rows[0].q,
    );
    expect(Number(q.subtotal)).toBe(448);
    expect(Number(q.discount)).toBe(44.8);
    expect(Number(q.total)).toBe(403.2);
    expect(q.coupon.status).toBe('applied');
    expect(q.unavailable).toEqual(expect.arrayContaining([draft, soon]));
  });

  it('reports invalid coupons without discounting', async () => {
    const q = await as(db, 'anon', null, async (tx) =>
      (await tx.query<{ q: any }>(`select public.quote_order($1::uuid[], 'NOPE') as q`, [[starter]])).rows[0].q,
    );
    expect(q.coupon.status).toBe('invalid');
    expect(Number(q.total)).toBe(199);
  });

  it('only the service role can create orders, and only with server prices', async () => {
    await expect(
      rowsAs('authenticated', alice, `select public.create_order($1, $2::uuid[], null, 'razorpay')`, [alice, [starter]]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      rowsAs(
        'authenticated',
        alice,
        `insert into public.orders (customer_id, subtotal, total, currency) values ($1, 1, 1, 'INR')`,
        [alice],
      ),
    ).rejects.toThrow(/permission denied/);

    const order = await createPendingOrder(db, alice, [starter, saas], 'plink_price_test', 'LAUNCH10');
    expect(Number(order.total)).toBe(403.2);
    const { rows } = await db.query<{ unit_price: string }>(
      `select unit_price from public.order_items where order_id = $1 order by unit_price`,
      [order.order_id],
    );
    expect(rows.map((r) => Number(r.unit_price))).toEqual([199, 249]);
  });

  it('rejects unpublished products, inapplicable coupons and empty orders', async () => {
    await expect(createPendingOrder(db, alice, [draft], 'plink_x1')).rejects.toThrow(/PRODUCT_UNAVAILABLE/);
    await expect(createPendingOrder(db, alice, [starter], 'plink_x2', 'NOPE')).rejects.toThrow(/COUPON_NOT_APPLICABLE/);
    await expect(createPendingOrder(db, alice, [], 'plink_x3')).rejects.toThrow(/EMPTY_ORDER/);
  });

  it('customers cannot change order status or totals', async () => {
    const { rows } = await db.query<{ id: string }>(
      `select id from public.orders where provider_order_id = 'plink_price_test'`,
    );
    await expect(
      rowsAs('authenticated', alice, `update public.orders set payment_status = 'paid', total = 0 where id = $1`, [
        rows[0].id,
      ]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('payments, entitlements and downloads', () => {
  it('a failed payment creates no entitlement and no download', async () => {
    await createPendingOrder(db, bob, [saas], 'plink_bob_fail');
    expect((await payEvent(db, 'evt_bob_fail', 'plink_bob_fail', 'failed', 249)).result).toBe('failed');
    const ent = await db.query(`select 1 from public.downloads where customer_id = $1`, [bob]);
    expect(ent.rows).toHaveLength(0);
    await expect(
      as(db, 'service_role', null, (tx) => tx.query(`select public.authorize_download($1, $2)`, [bob, saas])),
    ).rejects.toThrow(/NO_ENTITLEMENT/);
  });

  it('an amount mismatch is recorded but never marks the order paid', async () => {
    await createPendingOrder(db, bob, [starter], 'plink_bob_mismatch');
    expect((await payEvent(db, 'evt_mismatch', 'plink_bob_mismatch', 'paid', 1)).result).toBe('amount_mismatch');
    const { rows } = await db.query<{ payment_status: string }>(
      `select payment_status from public.orders where provider_order_id = 'plink_bob_mismatch'`,
    );
    expect(rows[0].payment_status).toBe('pending');
  });

  it('a verified payment marks the order paid exactly once (idempotent)', async () => {
    const before = await db.query<{ redemption_count: number }>(`select redemption_count from public.coupons`);
    expect((await payEvent(db, 'evt_alice_paid', 'plink_price_test', 'paid', 403.2)).result).toBe('paid');
    expect((await payEvent(db, 'evt_alice_paid', 'plink_price_test', 'paid', 403.2)).result).toBe('duplicate');
    // A second, distinct "paid" event for the same order changes nothing.
    expect((await payEvent(db, 'evt_alice_paid_2', 'plink_price_test', 'paid', 403.2)).result).toBe('no_change');

    const ent = await db.query(`select product_id from public.downloads where customer_id = $1`, [alice]);
    expect(ent.rows).toHaveLength(2);
    const events = await db.query(`select 1 from public.payment_events where provider_event_id = 'evt_alice_paid'`);
    expect(events.rows).toHaveLength(1);
    const after = await db.query<{ redemption_count: number }>(`select redemption_count from public.coupons`);
    expect(after.rows[0].redemption_count).toBe(before.rows[0].redemption_count + 1);
  });

  it('a late failure event never downgrades a paid order', async () => {
    expect((await payEvent(db, 'evt_alice_late_fail', 'plink_price_test', 'failed', 403.2)).result).toBe('no_change');
    const { rows } = await db.query<{ payment_status: string }>(
      `select payment_status from public.orders where provider_order_id = 'plink_price_test'`,
    );
    expect(rows[0].payment_status).toBe('paid');
  });

  it('unknown orders are logged and ignored', async () => {
    expect((await payEvent(db, 'evt_unknown', 'plink_does_not_exist', 'paid', 10)).result).toBe('unknown_order');
  });

  it('customers cannot call payment or download functions directly', async () => {
    await expect(
      rowsAs('authenticated', bob, `select public.process_payment_event('razorpay','e','t','plink_bob_mismatch','paid',199,'INR')`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      rowsAs('authenticated', bob, `select public.authorize_download($1, $2)`, [bob, starter]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      rowsAs('authenticated', bob, `insert into public.downloads (order_item_id, customer_id, product_id) select id, $1, product_id from public.order_items limit 1`, [bob]),
    ).rejects.toThrow(/permission denied/);
  });

  it('authorises entitled downloads, counts them and enforces the limit', async () => {
    const res = await as(db, 'service_role', null, async (tx) =>
      (await tx.query<{ r: any }>(`select public.authorize_download($1, $2) as r`, [alice, starter])).rows[0].r,
    );
    expect(res.storage_path).toBe('business-starter/business-starter-v1.zip');
    expect(res.downloads_remaining).toBe(14);

    await db.query(`update public.downloads set download_count = download_limit where customer_id = $1 and product_id = $2`, [
      alice,
      starter,
    ]);
    await expect(
      as(db, 'service_role', null, (tx) => tx.query(`select public.authorize_download($1, $2)`, [alice, starter])),
    ).rejects.toThrow(/DOWNLOAD_LIMIT_REACHED/);

    const events = await rowsAs('authenticated', alice, `select 1 from public.download_events`);
    expect(events).toHaveLength(1);
  });

  it('prevents buying a product the customer already owns', async () => {
    await expect(createPendingOrder(db, alice, [saas], 'plink_dupe')).rejects.toThrow(/ALREADY_OWNED/);
  });

  it('isolates orders, items and downloads between customers', async () => {
    expect(await rowsAs('authenticated', bob, `select 1 from public.orders where customer_id = $1`, [alice])).toHaveLength(0);
    expect(await rowsAs('authenticated', bob, `select 1 from public.downloads where customer_id = $1`, [alice])).toHaveLength(0);
    const bobItems = await rowsAs('authenticated', bob, `select o.customer_id from public.order_items i join public.orders o on o.id = i.order_id`);
    expect(bobItems.every((r: any) => r.customer_id === bob)).toBe(true);
    expect(await rowsAs('authenticated', bob, `select 1 from public.payment_events`)).toHaveLength(0);
    expect(await rowsAs('anon', null, `select 1 from public.products where id = $1`, [draft])).toHaveLength(0);
    await expect(rowsAs('anon', null, `select 1 from public.orders`)).rejects.toThrow(/permission denied/);
  });

  it('bestsellers come only from paid orders', async () => {
    const rows = await rowsAs('anon', null, `select id from public.bestselling_products(10)`);
    expect(rows.map((r: any) => r.id).sort()).toEqual([starter, saas].sort());
  });

  it('a refund revokes the entitlements', async () => {
    expect((await payEvent(db, 'evt_alice_refund', 'plink_price_test', 'refunded', 403.2)).result).toBe('refunded');
    const { rows } = await db.query<{ status: string }>(`select status from public.downloads where customer_id = $1`, [alice]);
    expect(rows.every((r) => r.status === 'revoked')).toBe(true);
    await expect(
      as(db, 'service_role', null, (tx) => tx.query(`select public.authorize_download($1, $2)`, [alice, saas])),
    ).rejects.toThrow(/NO_ENTITLEMENT/);
  });

  it('admins can view orders but cannot falsify payment state', async () => {
    expect((await rowsAs('authenticated', admin, `select 1 from public.orders`)).length).toBeGreaterThan(0);
    await expect(
      rowsAs('authenticated', admin, `update public.orders set payment_status = 'paid'`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      rowsAs('authenticated', admin, `insert into public.payment_events (provider, provider_event_id, event_type, verification_status) values ('x','y','z','verified')`),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('reviews', () => {
  let carol: string;
  beforeAll(async () => {
    carol = await createUser(db, 'carol@example.test', 'Carol Buyer');
    await createPendingOrder(db, carol, [starter], 'plink_carol');
    await payEvent(db, 'evt_carol', 'plink_carol', 'paid', 199);
  });

  it('only verified buyers can submit, and only as pending', async () => {
    await expect(
      rowsAs('authenticated', bob, `insert into public.reviews (product_id, customer_id, rating, review_text) values ($1, $2, 5, 'Great kit, very useful')`, [starter, bob]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      rowsAs('authenticated', carol, `insert into public.reviews (product_id, customer_id, rating, review_text, status) values ($1, $2, 5, 'Great kit, very useful', 'approved')`, [starter, carol]),
    ).rejects.toThrow(/permission denied/);
    await rowsAs('authenticated', carol, `insert into public.reviews (product_id, customer_id, rating, review_text) values ($1, $2, 4, 'Clean code and clear docs.')`, [starter, carol]);
    // Pending reviews are invisible publicly (visitors read reviews only through product_reviews()).
    expect(await rowsAs('anon', null, `select 1 from public.product_reviews($1)`, [starter])).toHaveLength(0);
    await expect(rowsAs('anon', null, `select 1 from public.reviews`)).rejects.toThrow(/permission denied/);
    expect(await rowsAs('authenticated', bob, `select 1 from public.reviews`)).toHaveLength(0);
  });

  it('customers cannot approve reviews; admins can', async () => {
    const r1 = await rowsAs('authenticated', carol, `update public.reviews set status = 'approved' returning id`);
    expect(r1).toHaveLength(0);
    await rowsAs('authenticated', admin, `update public.reviews set status = 'approved'`);
    const summary = await as(db, 'anon', null, async (tx) =>
      (await tx.query<{ s: any }>(`select public.product_review_summary($1) as s`, [starter])).rows[0].s,
    );
    expect(summary).toEqual({ count: 1, average: 4 });
    const list = await rowsAs('anon', null, `select reviewer_name from public.product_reviews($1)`, [starter]);
    expect(list[0]).toEqual({ reviewer_name: 'Carol' });
  });
});

describe('support, enquiries, carts, settings', () => {
  it('customers create and read only their own support requests, rate-limited', async () => {
    const { rows } = await db.query<{ id: string }>(`select id from public.orders where customer_id = $1 limit 1`, [alice]);
    await expect(
      rowsAs('authenticated', bob, `insert into public.support_requests (customer_id, order_id, subject, message) values ($1, $2, 'Help', 'Please help with this order')`, [bob, rows[0].id]),
    ).rejects.toThrow(/row-level security/);
    for (let i = 0; i < 5; i++) {
      await rowsAs('authenticated', bob, `insert into public.support_requests (customer_id, subject, message) values ($1, 'Question', 'A question about downloads')`, [bob]);
    }
    await expect(
      rowsAs('authenticated', bob, `insert into public.support_requests (customer_id, subject, message) values ($1, 'Question', 'A question about downloads')`, [bob]),
    ).rejects.toThrow(/RATE_LIMITED/);
    expect(await rowsAs('authenticated', alice, `select 1 from public.support_requests`)).toHaveLength(0);
    await expect(
      rowsAs('authenticated', bob, `update public.support_requests set status = 'closed' returning id`),
    ).resolves.toHaveLength(0);
  });

  it('enquiries cannot be written or read through the public API', async () => {
    await expect(
      rowsAs('anon', null, `insert into public.enquiries (full_name, email, subject, message) values ('A B', 'a@b.co', 'Hi', 'Hello there friend')`),
    ).rejects.toThrow(/permission denied/);
    await expect(rowsAs('anon', null, `select 1 from public.enquiries`)).rejects.toThrow(/permission denied/);
    expect(await rowsAs('authenticated', alice, `select 1 from public.enquiries`)).toHaveLength(0);
  });

  it('carts are private to each customer', async () => {
    await rowsAs('authenticated', alice, `insert into public.cart_items (customer_id, product_id) values ($1, $2)`, [alice, saas]);
    await expect(
      rowsAs('authenticated', bob, `insert into public.cart_items (customer_id, product_id) values ($1, $2)`, [alice, starter]),
    ).rejects.toThrow(/row-level security/);
    expect(await rowsAs('authenticated', bob, `select 1 from public.cart_items`)).toHaveLength(0);
  });

  it('settings: public read, admin-only write, audited', async () => {
    await db.query(`insert into public.site_settings (setting_key, setting_value) values ('announcement', '{"enabled":true,"text":"Hello"}')`);
    await db.query(`insert into public.site_settings (setting_key, setting_value, is_public) values ('internal_notes', '{}', false)`);
    expect((await rowsAs('anon', null, `select setting_key from public.site_settings`)).map((r: any) => r.setting_key)).toEqual(['announcement']);
    const blocked = await rowsAs('authenticated', alice, `update public.site_settings set setting_value = '{}' returning id`);
    expect(blocked).toHaveLength(0);
    await rowsAs('authenticated', admin, `update public.site_settings set setting_value = '{"enabled":false}' where setting_key = 'announcement'`);
    const audit = await rowsAs('authenticated', admin, `select actor_id from public.audit_logs where entity_type = 'site_settings' and action = 'update'`);
    expect(audit[0]).toEqual({ actor_id: admin });
    expect(await rowsAs('authenticated', alice, `select 1 from public.audit_logs`)).toHaveLength(0);
  });

  it('admin-only RPCs refuse customers', async () => {
    await expect(rowsAs('authenticated', alice, `select public.admin_dashboard_stats()`)).rejects.toThrow(/FORBIDDEN/);
    await expect(rowsAs('authenticated', alice, `select * from public.admin_search_customers(null)`)).rejects.toThrow(/FORBIDDEN/);
    const stats = await as(db, 'authenticated', admin, async (tx) =>
      (await tx.query<{ s: any }>(`select public.admin_dashboard_stats() as s`)).rows[0].s,
    );
    expect(stats.products_published).toBeGreaterThanOrEqual(3);
    expect(stats.orders_paid).toBeGreaterThanOrEqual(1);
  });
});
