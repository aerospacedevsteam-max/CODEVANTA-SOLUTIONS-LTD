// POST /functions/v1/create-order  { product_ids: uuid[], coupon_code?: string }
// Creates a pending order priced by the database, then a hosted Razorpay
// Payment Link. The browser only ever receives the hosted checkout URL.
import { adminClient, corsHeaders, errorResponse, json, rateLimit, requireUser } from '../_shared/http.ts';
import { parseCheckout } from '../_shared/validation.ts';
import { createPaymentLink } from '../_shared/razorpay.ts';

function paymentConfig() {
  const provider = Deno.env.get('PAYMENT_PROVIDER');
  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  const siteUrl = Deno.env.get('SITE_URL');
  if (provider !== 'razorpay' || !keyId || !keySecret || !siteUrl) return null;
  return { provider, keyId, keySecret, siteUrl: siteUrl.replace(/\/$/, '') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    if (!user.email_confirmed_at) {
      return json(req, { error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before checking out.' }, 403);
    }

    const parsed = parseCheckout(await req.json().catch(() => null));
    if (!parsed.ok) return json(req, { error: 'VALIDATION_FAILED', fields: parsed.errors }, 400);

    await rateLimit(admin, `checkout:${user.id}`, 10, 600);

    // The database decides the checkout mode (site_settings.commerce.checkout_mode).
    const { data: mode, error: modeError } = await admin.rpc('checkout_mode');
    if (modeError) throw modeError;

    if (mode === 'no_charge') {
      // No gateway yet: complete the order without taking payment and grant access.
      const { data: done, error } = await admin.rpc('complete_no_charge_order', {
        p_customer_id: user.id,
        p_product_ids: parsed.value.productIds,
      });
      if (error) throw error;
      return json(req, { order_number: done.order_number, completed: true });
    }

    const config = paymentConfig();
    if (mode !== 'payments' || !config) throw new Error('PAYMENTS_DISABLED');

    const { data: order, error } = await admin.rpc('create_order', {
      p_customer_id: user.id,
      p_product_ids: parsed.value.productIds,
      p_coupon_code: parsed.value.couponCode,
      p_provider: config.provider,
    });
    if (error) throw error;

    let link;
    try {
      link = await createPaymentLink(
        {
          orderId: order.order_id,
          orderNumber: order.order_number,
          amount: Number(order.total),
          currency: order.currency,
          customerEmail: order.customer_email,
          description: `CODEVANTASOLUTIONSLTD order ${order.order_number}`,
          callbackUrl: `${config.siteUrl}/checkout/return?order=${encodeURIComponent(order.order_number)}`,
        },
        { keyId: config.keyId, keySecret: config.keySecret },
      );
    } catch (providerError) {
      // The order can never be paid without a link; close it so it is not left pending.
      await admin.from('orders').update({ payment_status: 'cancelled' }).eq('id', order.order_id);
      throw providerError;
    }

    const { error: linkError } = await admin
      .from('orders')
      .update({ provider_order_id: link.id })
      .eq('id', order.order_id);
    if (linkError) throw linkError;

    return json(req, { order_number: order.order_number, checkout_url: link.short_url });
  } catch (err) {
    return errorResponse(req, err);
  }
});
