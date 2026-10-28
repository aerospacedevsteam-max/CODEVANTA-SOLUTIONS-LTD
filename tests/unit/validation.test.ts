import { describe, expect, it } from 'vitest';
import { parseCheckout, parseDownload, parseForm } from '../../supabase/functions/_shared/validation';
import { mapError } from '../../supabase/functions/_shared/errors';

const id = '3f1c2b9a-8d7e-4c6b-9a5f-1e2d3c4b5a69';

describe('checkout input', () => {
  it('accepts product ids only — never prices or totals', () => {
    const r = parseCheckout({ product_ids: [id, id], coupon_code: 'launch10', price: 1, total: 0 });
    expect(r).toEqual({ ok: true, value: { productIds: [id], couponCode: 'LAUNCH10' } });
  });

  it('rejects malformed ids, empty carts and odd coupons', () => {
    expect(parseCheckout({ product_ids: [] }).ok).toBe(false);
    expect(parseCheckout({ product_ids: ['1 or 1=1'] }).ok).toBe(false);
    expect(parseCheckout({ product_ids: Array(51).fill(id) }).ok).toBe(false);
    expect(parseCheckout({ product_ids: [id], coupon_code: "x'; drop" }).ok).toBe(false);
    expect(parseCheckout(null).ok).toBe(false);
  });
});

describe('public forms', () => {
  const enquiry = { kind: 'enquiry', full_name: 'Asha', email: 'Asha@Example.com', subject: 'Licence', message: 'Can I use this for a client?' };

  it('validates and normalises enquiries', () => {
    expect(parseForm(enquiry)).toEqual({
      ok: true,
      value: { kind: 'enquiry', fullName: 'Asha', email: 'asha@example.com', subject: 'Licence', message: 'Can I use this for a client?' },
    });
    const bad = parseForm({ ...enquiry, email: 'nope', message: 'short' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['email', 'message']);
  });

  it('silently drops honeypot submissions', () => {
    expect(parseForm({ ...enquiry, website: 'http://spam' })).toEqual({ ok: true, value: null });
  });

  it('requires explicit newsletter consent', () => {
    expect(parseForm({ kind: 'newsletter', email: 'a@b.co' }).ok).toBe(false);
    expect(
      parseForm({ kind: 'newsletter', email: 'a@b.co', consent: true, consent_text: 'I agree to receive emails.' }).ok,
    ).toBe(true);
  });

  it('validates download requests', () => {
    expect(parseDownload({ product_id: id }).ok).toBe(true);
    expect(parseDownload({ product_id: '../etc/passwd' }).ok).toBe(false);
  });
});

describe('error mapping', () => {
  it('maps database codes to safe messages and hides unknown errors', () => {
    expect(mapError(new Error('ALREADY_OWNED'))).toMatchObject({ status: 409, code: 'ALREADY_OWNED' });
    expect(mapError({ message: 'PRODUCT_UNAVAILABLE: ["x"]' })).toMatchObject({ status: 409 });
    expect(mapError(new Error('relation "secret_table" does not exist'))).toEqual({
      status: 500,
      code: 'INTERNAL',
      message: 'Something went wrong. Please try again.',
    });
  });
});
