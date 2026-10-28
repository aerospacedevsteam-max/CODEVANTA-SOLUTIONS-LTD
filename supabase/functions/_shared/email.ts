// Order confirmation email via Resend (https://resend.com). Any provider with an
// HTTP API can be swapped in here. Skipped (with a log line) when not configured.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function sendOrderConfirmation(admin: SupabaseClient, orderId: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  const siteUrl = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
  if (!apiKey || !from) {
    console.log('order email skipped: RESEND_API_KEY / EMAIL_FROM not configured');
    return;
  }

  const { data: order, error } = await admin
    .from('orders')
    .select('order_number, customer_email, total, currency, order_items(product_title_snapshot, unit_price)')
    .eq('id', orderId)
    .single();
  if (error || !order?.customer_email) throw error ?? new Error('order not found');

  const money = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: order.currency }).format(Number(n));
  const rows = (order.order_items as { product_title_snapshot: string; unit_price: number }[])
    .map((i) => `<tr><td>${escapeHtml(i.product_title_snapshot)}</td><td align="right">${money(i.unit_price)}</td></tr>`)
    .join('');

  const html = `
    <h1 style="font-family:sans-serif">Thank you for your order</h1>
    <p style="font-family:sans-serif">Your payment for order <strong>${escapeHtml(order.order_number)}</strong> has been confirmed.</p>
    <table style="font-family:sans-serif" cellpadding="6">${rows}
      <tr><td><strong>Total</strong></td><td align="right"><strong>${money(order.total)}</strong></td></tr></table>
    <p style="font-family:sans-serif">Download your files any time from your account:
      <a href="${siteUrl}/account/downloads">${siteUrl}/account/downloads</a></p>
    <p style="font-family:sans-serif;color:#555">CODEVANTASOLUTIONSLTD</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [order.customer_email],
      subject: `Order ${order.order_number} confirmed — your downloads are ready`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`email provider responded ${res.status}`);
}
