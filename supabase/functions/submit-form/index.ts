// POST /functions/v1/submit-form
//   { kind: 'enquiry', full_name, email, subject, message, website }
//   { kind: 'newsletter', email, consent: true, consent_text, website }
// `website` is a honeypot field that real visitors never fill in.
import { adminClient, clientIp, corsHeaders, errorResponse, json, rateLimit, sha256Hex } from '../_shared/http.ts';
import { parseForm } from '../_shared/validation.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const parsed = parseForm(await req.json().catch(() => null));
    if (!parsed.ok) return json(req, { error: 'VALIDATION_FAILED', fields: parsed.errors }, 400);
    if (parsed.value === null) return json(req, { ok: true }); // honeypot

    const admin = adminClient();
    // Only a salted hash of the IP is stored, and only inside the rate-limit key.
    const ipHash = await sha256Hex(`${Deno.env.get('RATE_LIMIT_SALT') ?? ''}:${clientIp(req)}`);
    await rateLimit(admin, `form:${parsed.value.kind}:${ipHash}`, 5, 3600);

    if (parsed.value.kind === 'enquiry') {
      const v = parsed.value;
      const { error } = await admin
        .from('enquiries')
        .insert({ full_name: v.fullName, email: v.email, subject: v.subject, message: v.message });
      if (error) throw error;
    } else {
      const v = parsed.value;
      const { error } = await admin
        .from('newsletter_subscribers')
        .upsert(
          { email: v.email, consent_text: v.consentText, consented_at: new Date().toISOString(), unsubscribed_at: null },
          { onConflict: 'email' },
        );
      if (error) throw error;
    }
    return json(req, { ok: true });
  } catch (err) {
    return errorResponse(req, err);
  }
});
