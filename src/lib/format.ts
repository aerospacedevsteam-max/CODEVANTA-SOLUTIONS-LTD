const formatters = new Map<string, Intl.NumberFormat>();

export function formatPrice(amount: number | string | null | undefined, currency = 'USD'): string {
  const value = Number(amount ?? 0);
  const key = currency;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : currency === 'USD' ? 'en-US' : 'en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatters.set(key, f);
  }
  return f.format(value);
}

/** A discount is shown only when a genuine, higher reference price exists. */
export function validDiscount(price: number | string, original: number | string | null | undefined): number | null {
  const p = Number(price);
  const o = original == null ? NaN : Number(original);
  if (!Number.isFinite(o) || !Number.isFinite(p) || o <= p || p < 0) return null;
  return Math.round(((o - p) / o) * 100);
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso));
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const paymentStatusLabel: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  no_charge: 'Completed (no charge)',
  failed: 'Payment failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Order status for display; orders completed without payment are never shown as "Paid". */
export function orderStatusLabel(o: { payment_status: string; payment_provider?: string | null }): string {
  if (o.payment_provider === 'no_charge' && o.payment_status === 'paid') return paymentStatusLabel.no_charge;
  return paymentStatusLabel[o.payment_status] ?? o.payment_status;
}
