// Razorpay adapter. Runtime-neutral (Web Crypto + fetch) so it runs in Supabase
// Edge Functions (Deno) and is unit-tested in Node.
//
// Flow: create-order creates a hosted Payment Link → customer pays on Razorpay →
// Razorpay calls payment-webhook → signature verified → process_payment_event().

export type PaymentOutcome = 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded' | 'ignored';

export interface MappedEvent {
  eventType: string;
  outcome: PaymentOutcome;
  /** Payment Link id (plink_…) — matches orders.provider_order_id. */
  providerOrderId: string | null;
  /** Razorpay payment id (pay_…) — used to locate the order for refunds. */
  providerPaymentId: string | null;
  /** Major units (e.g. rupees), converted from Razorpay's minor units. */
  amount: number | null;
  currency: string | null;
}

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

/**
 * Verifies the X-Razorpay-Signature header: hex HMAC-SHA256 of the raw request
 * body keyed with the webhook secret. The raw body must not be re-serialised.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(expected, signature.trim().toLowerCase());
}

/** Razorpay uses minor units; INR and the other supported currencies have 2 decimals. */
export const toMinorUnits = (amount: number): number => Math.round(amount * 100);
export const fromMinorUnits = (amount: number): number => Math.round(amount) / 100;

// deno-lint-ignore no-explicit-any
type Json = any;

export function mapRazorpayEvent(event: Json): MappedEvent {
  const type: string = String(event?.event ?? 'unknown');
  const link = event?.payload?.payment_link?.entity;
  const payment = event?.payload?.payment?.entity;
  const refund = event?.payload?.refund?.entity;
  const base: MappedEvent = {
    eventType: type,
    outcome: 'ignored',
    providerOrderId: link?.id ?? null,
    providerPaymentId: payment?.id ?? refund?.payment_id ?? null,
    amount: null,
    currency: null,
  };

  switch (type) {
    case 'payment_link.paid': {
      // Use the captured payment amount; fall back to the link's amount_paid.
      const minor = payment?.amount ?? link?.amount_paid;
      return {
        ...base,
        outcome: link?.status === 'paid' ? 'paid' : 'ignored',
        amount: typeof minor === 'number' ? fromMinorUnits(minor) : null,
        currency: payment?.currency ?? link?.currency ?? null,
      };
    }
    case 'payment_link.cancelled':
      return { ...base, outcome: 'cancelled' };
    case 'payment_link.expired':
      return { ...base, outcome: 'failed' };
    case 'refund.processed': {
      const paid = payment?.amount;
      const refunded = payment?.amount_refunded;
      const full = typeof paid === 'number' && typeof refunded === 'number' && refunded >= paid;
      return {
        ...base,
        outcome: full ? 'refunded' : 'partially_refunded',
        amount: typeof refund?.amount === 'number' ? fromMinorUnits(refund.amount) : null,
        currency: refund?.currency ?? null,
      };
    }
    // A single failed attempt does not close a payment link — the customer may retry.
    case 'payment.failed':
    default:
      return base;
  }
}

export interface PaymentLinkRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  description: string;
  callbackUrl: string;
  expiresInSeconds?: number;
}

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

export function buildPaymentLinkPayload(req: PaymentLinkRequest, now = Date.now()) {
  return {
    amount: toMinorUnits(req.amount),
    currency: req.currency,
    accept_partial: false,
    reference_id: req.orderNumber,
    description: req.description.slice(0, 2048),
    customer: { email: req.customerEmail },
    notify: { sms: false, email: false },
    reminder_enable: false,
    callback_url: req.callbackUrl,
    callback_method: 'get',
    // Razorpay requires expiry at least 15 minutes ahead.
    expire_by: Math.floor(now / 1000) + Math.max(req.expiresInSeconds ?? 3600, 16 * 60),
    notes: { order_id: req.orderId, order_number: req.orderNumber },
  };
}

export async function createPaymentLink(
  req: PaymentLinkRequest,
  creds: RazorpayCredentials,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; short_url: string }> {
  const res = await fetchImpl('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(`${creds.keyId}:${creds.keySecret}`),
    },
    body: JSON.stringify(buildPaymentLinkPayload(req)),
  });
  if (!res.ok) {
    // Do not echo provider responses to clients; they may contain account details.
    throw new Error(`PROVIDER_ERROR: Razorpay responded ${res.status}`);
  }
  const data = await res.json();
  if (!data?.id || !data?.short_url) throw new Error('PROVIDER_ERROR: malformed payment link response');
  return { id: data.id, short_url: data.short_url };
}
