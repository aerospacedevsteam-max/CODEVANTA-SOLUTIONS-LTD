/**
 * The committed seed catalogue must load, stay non-purchasable until files are
 * uploaded, and satisfy every publication rule once a file exists in storage.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createDb } from './helpers';

let db: PGlite;
beforeAll(async () => {
  db = await createDb();
}, 60_000);

describe('initial catalogue migration', () => {
  it('creates 9 categories, 10 products and the public settings', async () => {
    const cats = await db.query(`select slug from public.categories`);
    expect(cats.rows).toHaveLength(9);
    const products = await db.query<{ status: string; currency: string; original_price: string | null }>(
      `select status, currency, original_price from public.products`,
    );
    expect(products.rows).toHaveLength(10);
    // No fake discounts and nothing purchasable before files are uploaded.
    expect(products.rows.every((p) => p.status === 'coming_soon' && p.currency === 'USD' && p.original_price === null)).toBe(true);
    const settings = await as(db, 'anon', null, async (tx) => (await tx.query(`select setting_key from public.site_settings`)).rows);
    expect(settings.map((s: any) => s.setting_key).sort()).toEqual(['announcement', 'commerce', 'company', 'footer', 'homepage', 'seo', 'social']);
  });

  it('uses the proposed launch prices', async () => {
    const { rows } = await db.query<{ slug: string; price: string }>(`select slug, price from public.products`);
    const price = Object.fromEntries(rows.map((r) => [r.slug, Number(r.price)]));
    expect(price['website-starter-collection']).toBe(289);
    expect(price['small-business-website-bundle']).toBe(399);
    expect(price['portfolio-website-starter-kit']).toBe(149);
  });

  it('publishes only the registered company facts that were supplied', async () => {
    const { rows } = await db.query<{ v: any }>(`select setting_value as v from public.site_settings where setting_key = 'company'`);
    expect(rows[0].v).toMatchObject({
      legal_name: 'CODEVANTA SOLUTIONS LTD',
      registration_number: '17535159',
      country: 'England and Wales',
      registered_office: 'Office 22003, 182-184 High Street North, East Ham, E6 2JA, United Kingdom',
      support_email: 'support@codevantasolutions.com',
      phone: null,
    });
  });

  it('cannot be bought while coming soon', async () => {
    const { rows } = await db.query<{ id: string }>(`select id from public.products`);
    const q = await as(db, 'anon', null, async (tx) =>
      (await tx.query<{ q: any }>(`select public.quote_order($1::uuid[]) as q`, [rows.map((r) => r.id)])).rows[0].q,
    );
    expect(q.items).toHaveLength(0);
    expect(q.unavailable).toHaveLength(10);
  });

  it('every seeded product passes the publication rules once its file is stored', async () => {
    const { rows } = await db.query<{ id: string; slug: string }>(`select id, slug from public.products`);
    for (const p of rows) {
      await expect(db.query(`update public.products set status = 'published' where id = $1`, [p.id])).rejects.toThrow(
        /downloadable file/,
      );
      const path = `${p.slug}/test/${p.slug}-v1.0.0.zip`;
      await db.query(`insert into storage.objects (bucket_id, name) values ('product-files', $1)`, [path]);
      await db.query(`insert into public.product_files (product_id, storage_path, file_name) values ($1, $2, $3)`, [p.id, path, `${p.slug}-v1.0.0.zip`]);
      await db.query(`update public.products set status = 'published' where id = $1`, [p.id]);
    }
    const published = await db.query(`select 1 from public.products where status = 'published'`);
    expect(published.rows).toHaveLength(10);
  });
});
