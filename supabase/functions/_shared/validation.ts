// Dependency-free input validation shared by Edge Functions (and unit-tested in Node).

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
export const isEmail = (v: unknown): v is string => typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v);

function text(v: unknown, min: number, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length >= min && t.length <= max ? t : null;
}

export interface CheckoutInput {
  productIds: string[];
  couponCode: string | null;
}

export function parseCheckout(body: unknown): Result<CheckoutInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const ids = Array.isArray(b.product_ids) ? b.product_ids : null;
  if (!ids || ids.length === 0 || ids.length > 50 || !ids.every(isUuid)) {
    return { ok: false, errors: { product_ids: 'Provide between 1 and 50 valid product ids.' } };
  }
  let coupon: string | null = null;
  if (b.coupon_code != null && b.coupon_code !== '') {
    const c = text(b.coupon_code, 3, 32);
    if (!c || !/^[A-Za-z0-9_-]+$/.test(c)) return { ok: false, errors: { coupon_code: 'Invalid coupon code.' } };
    coupon = c.toUpperCase();
  }
  return { ok: true, value: { productIds: [...new Set(ids as string[])], couponCode: coupon } };
}

export interface EnquiryInput {
  kind: 'enquiry';
  fullName: string;
  email: string;
  subject: string;
  message: string;
}
export interface NewsletterInput {
  kind: 'newsletter';
  email: string;
  consentText: string;
}
export type FormInput = EnquiryInput | NewsletterInput;

/** Returns `{ ok: true, value: null }` for honeypot hits so bots get a normal-looking response. */
export function parseForm(body: unknown): Result<FormInput | null> {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.website === 'string' && b.website.trim() !== '') return { ok: true, value: null };

  if (b.kind === 'enquiry') {
    const errors: Record<string, string> = {};
    const fullName = text(b.full_name, 2, 120);
    const subject = text(b.subject, 3, 160);
    const message = text(b.message, 10, 5000);
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (!fullName) errors.full_name = 'Enter your name (2–120 characters).';
    if (!isEmail(email)) errors.email = 'Enter a valid email address.';
    if (!subject) errors.subject = 'Enter a subject (3–160 characters).';
    if (!message) errors.message = 'Enter a message (10–5000 characters).';
    if (Object.keys(errors).length) return { ok: false, errors };
    return { ok: true, value: { kind: 'enquiry', fullName: fullName!, email, subject: subject!, message: message! } };
  }

  if (b.kind === 'newsletter') {
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (!isEmail(email)) return { ok: false, errors: { email: 'Enter a valid email address.' } };
    if (b.consent !== true) return { ok: false, errors: { consent: 'Please confirm you agree to receive emails.' } };
    const consentText = text(b.consent_text, 10, 500);
    if (!consentText) return { ok: false, errors: { consent: 'Consent text missing.' } };
    return { ok: true, value: { kind: 'newsletter', email, consentText } };
  }

  return { ok: false, errors: { kind: 'Unknown form type.' } };
}

export function parseDownload(body: unknown): Result<{ productId: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!isUuid(b.product_id)) return { ok: false, errors: { product_id: 'Invalid product id.' } };
  return { ok: true, value: { productId: b.product_id } };
}
