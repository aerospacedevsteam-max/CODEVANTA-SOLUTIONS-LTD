// POST /functions/v1/download  { product_id }
// Checks the signed-in customer's entitlement (paid order, not revoked/expired,
// under the download limit) and returns a 60-second signed URL.
import { adminClient, corsHeaders, errorResponse, json, rateLimit, requireUser } from '../_shared/http.ts';
import { parseDownload } from '../_shared/validation.ts';

const SIGNED_URL_TTL_SECONDS = 60;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);

    const parsed = parseDownload(await req.json().catch(() => null));
    if (!parsed.ok) return json(req, { error: 'VALIDATION_FAILED', fields: parsed.errors }, 400);

    await rateLimit(admin, `download:${user.id}`, 20, 3600);

    const { data: grant, error } = await admin.rpc('authorize_download', {
      p_customer_id: user.id,
      p_product_id: parsed.value.productId,
    });
    if (error) throw error;

    const { data: signed, error: signError } = await admin.storage
      .from('product-files')
      .createSignedUrl(grant.storage_path, SIGNED_URL_TTL_SECONDS, { download: grant.file_name });
    if (signError || !signed) throw new Error('FILE_UNAVAILABLE');

    return json(req, {
      url: signed.signedUrl,
      expires_in: SIGNED_URL_TTL_SECONDS,
      downloads_remaining: grant.downloads_remaining,
    });
  } catch (err) {
    return errorResponse(req, err);
  }
});
