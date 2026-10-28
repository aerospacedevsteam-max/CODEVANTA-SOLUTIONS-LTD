// Admin data access. Every call here is still subject to RLS: the database
// rejects these operations unless the signed-in user's profile role is admin.
import { db } from './supabase';
import { ApiError } from './api';
import type { Category, EnquiryStatus, Order, Product, ReviewStatus, SupportRequest, TicketStatus } from './types';

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) {
    const m = res.error.message;
    throw new ApiError(
      m.startsWith('PUBLISH_VALIDATION_FAILED')
        ? m.replace('PUBLISH_VALIDATION_FAILED:', 'Cannot publish — missing:')
        : m.includes('FILE_REQUIRED_WHILE_PUBLISHED')
          ? 'Unpublish the product before removing its file.'
          : m.includes('duplicate key') && m.includes('slug')
            ? 'That slug is already in use.'
            : m,
    );
  }
  return res.data;
}

export interface DashboardStats {
  products_total: number;
  products_published: number;
  products_draft: number;
  products_coming_soon: number;
  orders_total: number;
  orders_paid: number;
  orders_no_charge?: number;
  revenue: Record<string, number>;
  enquiries_new: number;
  reviews_pending: number;
  support_open: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return check(await db().rpc('admin_dashboard_stats')) as DashboardStats;
}

export async function fetchRecentOrders(limit = 8): Promise<Order[]> {
  return check(
    await db().from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(limit),
  ) as Order[];
}

export async function fetchOrders(status?: string): Promise<Order[]> {
  let q = db().from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(200);
  if (status) q = q.eq('payment_status', status);
  return check(await q) as Order[];
}

export async function fetchOrderAdmin(id: string) {
  const order = check(await db().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()) as Order | null;
  if (!order) return null;
  const [events, downloads] = await Promise.all([
    db().from('payment_events').select('*').eq('order_id', id).order('created_at'),
    db()
      .from('downloads')
      .select('*, product:products(title)')
      .in('order_item_id', (order.order_items ?? []).map((i) => i.id)),
  ]);
  return {
    order,
    events: check(events) as {
      id: string;
      provider_event_id: string;
      event_type: string;
      verification_status: string;
      amount: number | null;
      currency: string | null;
      processed_at: string | null;
      created_at: string;
    }[],
    downloads: check(downloads) as {
      id: string;
      status: string;
      download_count: number;
      download_limit: number;
      expires_at: string | null;
      revoked_reason: string | null;
      product: { title: string } | null;
    }[],
  };
}

export async function updateEntitlement(id: string, status: 'active' | 'revoked', reason?: string, limit?: number) {
  check(
    await db().rpc('admin_update_entitlement', {
      p_download_id: id,
      p_status: status,
      p_reason: reason ?? null,
      p_download_limit: limit ?? null,
      p_expires_at: null,
    }),
  );
}

// Products ------------------------------------------------------------------
export async function fetchAllProducts(): Promise<(Product & { file: { file_name: string; size_bytes: number | null } | null })[]> {
  const rows = check(
    await db()
      .from('products')
      .select('*, category:categories!products_category_id_fkey(id,name,slug), file:product_files(file_name,size_bytes,uploaded_at)')
      .order('created_at', { ascending: false }),
  );
  return rows as never;
}

export async function fetchProductAdmin(id: string) {
  const product = check(
    await db().from('products').select('*, file:product_files(*)').eq('id', id).maybeSingle(),
  ) as (Product & { file: { storage_path: string; file_name: string; size_bytes: number | null; uploaded_at: string } | null }) | null;
  if (!product) return null;
  const extra = check(await db().from('product_categories').select('category_id').eq('product_id', id)) as {
    category_id: string;
  }[];
  return { product, secondaryCategoryIds: extra.map((e) => e.category_id) };
}

export type ProductInput = Omit<
  Product,
  'id' | 'created_at' | 'updated_at' | 'published_at' | 'category' | 'category_name' | 'category_slug'
>;

export async function saveProduct(id: string | null, input: Partial<ProductInput>): Promise<string> {
  if (id) {
    check(await db().from('products').update(input).eq('id', id));
    return id;
  }
  const row = check(await db().from('products').insert(input).select('id').single()) as { id: string };
  return row.id;
}

export async function setSecondaryCategories(productId: string, categoryIds: string[]) {
  check(await db().from('product_categories').delete().eq('product_id', productId));
  if (categoryIds.length) {
    check(
      await db()
        .from('product_categories')
        .insert(categoryIds.map((category_id) => ({ product_id: productId, category_id }))),
    );
  }
}

export async function setProductStatus(id: string, status: Product['status']) {
  check(await db().from('products').update({ status }).eq('id', id));
}

export async function uploadPreviewImage(productSlug: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `products/${productSlug}/${crypto.randomUUID()}.${ext}`;
  check(await db().storage.from('product-media').upload(path, file, { contentType: file.type, upsert: false }));
  return path;
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Uploads to the PRIVATE bucket under an unguessable path and records it. */
export async function uploadProductFile(productId: string, productSlug: string, file: File, uploadedBy: string) {
  if (!/\.zip$/i.test(file.name)) throw new ApiError('Upload a .zip archive.');
  const path = `${productSlug}/${crypto.randomUUID()}/${file.name.replace(/[^A-Za-z0-9._-]/g, '-')}`;
  check(
    await db().storage.from('product-files').upload(path, file, { contentType: 'application/zip', upsert: false }),
  );
  const checksum = await sha256Hex(file);
  check(
    await db().from('product_files').upsert(
      {
        product_id: productId,
        storage_path: path,
        file_name: file.name,
        size_bytes: file.size,
        checksum_sha256: checksum,
        uploaded_by: uploadedBy,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: 'product_id' },
    ),
  );
}

// Categories ----------------------------------------------------------------
export async function fetchAllCategories(): Promise<Category[]> {
  return check(await db().from('categories').select('*').order('display_order').order('name')) as Category[];
}

export async function saveCategory(id: string | null, input: Partial<Category>) {
  if (id) check(await db().from('categories').update(input).eq('id', id));
  else check(await db().from('categories').insert(input));
}

export async function reorderCategories(ordered: Category[]) {
  await Promise.all(
    ordered.map((c, i) => db().from('categories').update({ display_order: (i + 1) * 10 }).eq('id', c.id).then(check)),
  );
}

// Reviews -------------------------------------------------------------------
export interface AdminReview {
  id: string;
  rating: number;
  review_text: string;
  status: ReviewStatus;
  moderation_note: string | null;
  created_at: string;
  product: { title: string; slug: string } | null;
}

export async function fetchReviewsAdmin(status: ReviewStatus | 'all'): Promise<AdminReview[]> {
  let q = db()
    .from('reviews')
    .select('id,rating,review_text,status,moderation_note,created_at,product:products(title,slug)')
    .order('created_at', { ascending: false });
  if (status !== 'all') q = q.eq('status', status);
  return check(await q) as never;
}

export async function moderateReview(id: string, status: ReviewStatus, note: string | null) {
  check(await db().from('reviews').update({ status, moderation_note: note }).eq('id', id));
}

export async function deleteReview(id: string) {
  check(await db().from('reviews').delete().eq('id', id));
}

// Settings ------------------------------------------------------------------
export async function saveSetting(key: string, value: unknown, updatedBy: string) {
  check(
    await db()
      .from('site_settings')
      .upsert({ setting_key: key, setting_value: value, updated_by: updatedBy }, { onConflict: 'setting_key' }),
  );
}

// Customers, enquiries, support ---------------------------------------------
export async function searchCustomers(q: string) {
  return check(await db().rpc('admin_search_customers', { p_query: q || null, p_limit: 50 })) as {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    paid_orders: number;
  }[];
}

export async function fetchCustomerOrders(customerId: string): Promise<Order[]> {
  return check(
    await db().from('orders').select('*, order_items(*)').eq('customer_id', customerId).order('created_at', { ascending: false }),
  ) as Order[];
}

export async function fetchEnquiries() {
  return check(await db().from('enquiries').select('*').order('created_at', { ascending: false }).limit(200)) as {
    id: string;
    full_name: string;
    email: string;
    subject: string;
    message: string;
    status: EnquiryStatus;
    created_at: string;
  }[];
}

export async function setEnquiryStatus(id: string, status: EnquiryStatus) {
  check(await db().from('enquiries').update({ status }).eq('id', id));
}

export async function fetchSupportAdmin(): Promise<SupportRequest[]> {
  return check(
    await db().from('support_requests').select('*').order('created_at', { ascending: false }).limit(200),
  ) as SupportRequest[];
}

export async function replySupport(id: string, status: TicketStatus, reply: string | null) {
  check(await db().from('support_requests').update({ status, admin_reply: reply }).eq('id', id));
}

export async function fetchAuditLog(limit = 50) {
  return check(await db().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit)) as {
    id: number;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string;
  }[];
}
