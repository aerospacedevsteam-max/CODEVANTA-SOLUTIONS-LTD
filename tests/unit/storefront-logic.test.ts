import { describe, expect, it } from 'vitest';
import { GUEST_CART_KEY, mergeCarts, readGuestCart, sanitizeIds, writeGuestCart } from '../../src/lib/cart';
import { formatPrice, slugify, validDiscount } from '../../src/lib/format';
import { mergeSettings } from '../../src/lib/settings';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe('guest cart', () => {
  it('stores only valid, unique product ids — never prices', () => {
    expect(sanitizeIds([A, A, 'x', 42, { price: 1 }, B])).toEqual([A, B]);
    const s = memoryStorage();
    writeGuestCart([A, A, 'bad'], s);
    expect(s.getItem(GUEST_CART_KEY)).toBe(JSON.stringify([A]));
  });

  it('survives corrupted or unavailable storage', () => {
    const s = memoryStorage();
    s.setItem(GUEST_CART_KEY, '{not json');
    expect(readGuestCart(s)).toEqual([]);
    expect(readGuestCart(undefined)).toEqual([]);
    expect(() => writeGuestCart([A], { setItem: () => { throw new Error('quota'); } })).not.toThrow();
  });

  it('merges a guest cart into the account cart without duplicates', () => {
    expect(mergeCarts([A], [A, B])).toEqual({ merged: [A, B], toUpload: [B] });
    expect(mergeCarts([], [])).toEqual({ merged: [], toUpload: [] });
  });
});

describe('pricing display', () => {
  it('formats INR', () => {
    expect(formatPrice(289, 'INR')).toBe('₹289');
    expect(formatPrice(403.2, 'INR')).toBe('₹403.2');
  });

  it('only reports a discount for a genuine higher previous price', () => {
    expect(validDiscount(199, null)).toBeNull();
    expect(validDiscount(199, 199)).toBeNull();
    expect(validDiscount(199, 150)).toBeNull();
    expect(validDiscount(199, 249)).toBe(20);
  });
});

describe('misc', () => {
  it('slugifies titles', () => {
    expect(slugify('E-commerce UI Starter Kit!')).toBe('e-commerce-ui-starter-kit');
    expect(slugify('  Café  Menu ')).toBe('cafe-menu');
  });

  it('merges partial settings over safe defaults (company facts stay null)', () => {
    const s = mergeSettings({ announcement: { enabled: false, text: '' } } as never);
    expect(s.announcement.enabled).toBe(false);
    expect(s.company.registration_number).toBeNull();
    expect(s.commerce.payments_enabled).toBe(false);
  });
});
