import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  buildPaymentLinkPayload,
  createPaymentLink,
  mapRazorpayEvent,
  timingSafeEqual,
  toMinorUnits,
  verifyWebhookSignature,
} from '../../supabase/functions/_shared/razorpay';

const secret = 'whsec_test_secret';
const body = JSON.stringify({
  event: 'payment_link.paid',
  payload: {
    payment_link: { entity: { id: 'plink_123', status: 'paid', amount: 40320, amount_paid: 40320, currency: 'INR' } },
    payment: { entity: { id: 'pay_456', amount: 40320, currency: 'INR', status: 'captured' } },
  },
});
const sign = (b: string, s = secret) => createHmac('sha256', s).update(b).digest('hex');

describe('webhook signature verification', () => {
  it('accepts a valid HMAC-SHA256 signature of the raw body', async () => {
    expect(await verifyWebhookSignature(body, sign(body), secret)).toBe(true);
  });

  it('rejects tampered bodies, wrong secrets and missing signatures', async () => {
    expect(await verifyWebhookSignature(body.replace('40320', '1'), sign(body), secret)).toBe(false);
    expect(await verifyWebhookSignature(body, sign(body, 'other'), secret)).toBe(false);
    expect(await verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(await verifyWebhookSignature(body, sign(body), '')).toBe(false);
  });

  it('compares in constant time and handles length mismatch', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('event mapping', () => {
  it('maps payment_link.paid to a paid outcome in major units', () => {
    expect(mapRazorpayEvent(JSON.parse(body))).toEqual({
      eventType: 'payment_link.paid',
      outcome: 'paid',
      providerOrderId: 'plink_123',
      providerPaymentId: 'pay_456',
      amount: 403.2,
      currency: 'INR',
    });
  });

  it('does not treat a link that is not in paid status as paid', () => {
    const e = JSON.parse(body);
    e.payload.payment_link.entity.status = 'partially_paid';
    expect(mapRazorpayEvent(e).outcome).toBe('ignored');
  });

  it('ignores single failed attempts (customer may retry the link)', () => {
    expect(mapRazorpayEvent({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1' } } } }).outcome).toBe(
      'ignored',
    );
  });

  it('maps cancelled/expired links and full/partial refunds', () => {
    const link = { payment_link: { entity: { id: 'plink_9' } } };
    expect(mapRazorpayEvent({ event: 'payment_link.cancelled', payload: link }).outcome).toBe('cancelled');
    expect(mapRazorpayEvent({ event: 'payment_link.expired', payload: link }).outcome).toBe('failed');
    const refund = (refunded: number) => ({
      event: 'refund.processed',
      payload: {
        refund: { entity: { id: 'rfnd_1', payment_id: 'pay_456', amount: refunded, currency: 'INR' } },
        payment: { entity: { id: 'pay_456', amount: 40320, amount_refunded: refunded } },
      },
    });
    expect(mapRazorpayEvent(refund(40320))).toMatchObject({ outcome: 'refunded', providerPaymentId: 'pay_456', amount: 403.2 });
    expect(mapRazorpayEvent(refund(10000))).toMatchObject({ outcome: 'partially_refunded', amount: 100 });
  });

  it('survives malformed payloads', () => {
    expect(mapRazorpayEvent(null).outcome).toBe('ignored');
    expect(mapRazorpayEvent({ event: 'payment_link.paid' })).toMatchObject({ outcome: 'ignored', amount: null });
  });
});

describe('payment link creation', () => {
  const req = {
    orderId: '00000000-0000-4000-8000-000000000001',
    orderNumber: 'CV-2610-1001',
    amount: 403.2,
    currency: 'INR',
    customerEmail: 'buyer@example.test',
    description: 'Order',
    callbackUrl: 'https://shop.example/checkout/return?order=CV-2610-1001',
  };

  it('converts to minor units without floating point drift', () => {
    expect(toMinorUnits(403.2)).toBe(40320);
    expect(toMinorUnits(0.29)).toBe(29);
    expect(toMinorUnits(289)).toBe(28900);
  });

  it('builds a full-payment link that expires at least 15 minutes ahead', () => {
    const now = 1_700_000_000_000;
    const p = buildPaymentLinkPayload({ ...req, expiresInSeconds: 60 }, now);
    expect(p).toMatchObject({ amount: 40320, currency: 'INR', accept_partial: false, reference_id: 'CV-2610-1001' });
    expect(p.expire_by - now / 1000).toBeGreaterThanOrEqual(15 * 60);
  });

  it('authenticates with basic auth and never leaks provider error bodies', async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'plink_1', short_url: 'https://rzp.io/x' })));
    await expect(createPaymentLink(req, { keyId: 'k', keySecret: 's' }, ok)).resolves.toEqual({
      id: 'plink_1',
      short_url: 'https://rzp.io/x',
    });
    expect(ok.mock.calls[0][1].headers.Authorization).toBe('Basic ' + btoa('k:s'));

    const bad = vi.fn().mockResolvedValue(new Response('{"error":{"description":"secret account info"}}', { status: 400 }));
    await expect(createPaymentLink(req, { keyId: 'k', keySecret: 's' }, bad)).rejects.toThrow(
      'PROVIDER_ERROR: Razorpay responded 400',
    );
  });
});
