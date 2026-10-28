// POST /functions/v1/payment-webhook  (called by Razorpay, not by browsers)
// Deploy with --no-verify-jwt: authenticity comes from the HMAC signature.
import { adminClient, sha256Hex } from '../_shared/http.ts';
import { mapRazorpayEvent, verifyWebhookSignature } from '../_shared/razorpay.ts';
import { sendOrderConfirmation } from '../_shared/email.ts';

const plain = (status: number, body = '') => new Response(body, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return plain(405);

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (!secret) {
    console.error('payment-webhook: RAZORPAY_WEBHOOK_SECRET is not configured');
    return plain(503);
  }

  const rawBody = await req.text();
  if (rawBody.length > 512_000) return plain(413);

  const valid = await verifyWebhookSignature(rawBody, req.headers.get('x-razorpay-signature'), secret);
  if (!valid) {
    console.warn('payment-webhook: rejected request with invalid signature');
    return plain(401);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return plain(400);
  }

  const mapped = mapRazorpayEvent(event);
  // Razorpay sends a unique id per event (retries reuse it) → idempotency key.
  const eventId = req.headers.get('x-razorpay-event-id') ?? `sha256:${await sha256Hex(rawBody)}`;
  const admin = adminClient();

  // Refund events reference the payment, not the payment link.
  let providerOrderId = mapped.providerOrderId;
  if (!providerOrderId && mapped.providerPaymentId) {
    const { data } = await admin
      .from('orders')
      .select('provider_order_id')
      .eq('payment_provider', 'razorpay')
      .eq('provider_payment_id', mapped.providerPaymentId)
      .maybeSingle();
    providerOrderId = data?.provider_order_id ?? null;
  }

  const { data: result, error } = await admin.rpc('process_payment_event', {
    p_provider: 'razorpay',
    p_provider_event_id: eventId,
    p_event_type: mapped.eventType,
    p_provider_order_id: providerOrderId,
    p_outcome: mapped.outcome,
    p_amount: mapped.amount,
    p_currency: mapped.currency,
    p_provider_payment_id: mapped.providerPaymentId,
  });

  if (error) {
    // Non-2xx makes Razorpay retry later; processing is idempotent.
    console.error('payment-webhook: processing failed', error.message);
    return plain(500);
  }

  if (result?.result === 'paid' && result.order_id) {
    try {
      await sendOrderConfirmation(admin, result.order_id);
    } catch (mailError) {
      // The order is paid and entitlements exist; email failure must not trigger a retry.
      console.error('payment-webhook: confirmation email failed', mailError instanceof Error ? mailError.message : mailError);
    }
  }

  return plain(200, 'ok');
});
