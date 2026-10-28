import { FunctionsHttpError } from '@supabase/supabase-js';
import { db } from './supabase';
import type {
  Category,
  Entitlement,
  Order,
  Product,
  ProductSummary,
  Quote,
  Review,
  SearchResult,
  SupportRequest,
} from './types';
import type { SiteSettings } from './settings';

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new ApiError(friendly(res.error.message), res.error.code);
  return res.data;
}

function friendly(message: string): string {
  if (message.startsWith('PUBLISH_VALIDATION_FAILED')) return message.replace('PUBLISH_VALIDATION_FAILED:', 'Cannot publish — missing:');
  if (message.includes('duplicate key') && message.includes('slug')) return 'That slug is already in use.';
  if (message.includes('RATE_LIMITED')) return 'Too many requests. Please wait a little and try again.';
  if (message.includes('FILE_REQUIRED_WHILE_PUBLISHED')) return 'Unpublish the product before removing its file.';
  if (message.includes('Failed to fetch')) return 'Network error — please check your connection and try again.';
  return message;
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => ({}));
      throw new ApiError(payload.message ?? 'Request failed. Please try again.', payload.error, payload.fields);
    }
    throw new ApiError('The service could not be reached. Please try again shortly.');
  }
  return data as T;
}

const PRODUCT_CARD_FIELDS =
  'id,title,slug,subtitle,short_description,product_type,price,currency,original_price,preview_images,status,is_featured,version,created_at,category:categories!products_category_id_fkey(name,slug)';

type CardRow = Omit<ProductSummary, 'category_name' | 'category_slug'> & { category: { name: string; slug: string } | null };
const toSummary = (r: CardRow): ProductSummary => ({
  ...r,
  price: Number(r.price),
  original_price: r.original_price == null ? null : Number(r.original_price),
  category_name: r.category?.name ?? null,
  category_slug: r.category?.slug ?? null,
});

// ---------------------------------------------------------------------------
// Public catalogue
// ---------------------------------------------------------------------------
export async function fetchSettings(): Promise<Partial<SiteSettings>> {
  const rows = check(await db().from('site_settings').select('setting_key,setting_value'));
  return Object.fromEntries((rows ?? []).map((r) => [r.setting_key, r.setting_value])) as Partial<SiteSettings>;
}

export async function fetchCategories(): Promise<Category[]> {
  return check(
    await db().from('categories').select('*').eq('is_published', true).order('display_order').order('name'),
  ) as Category[];
}

export interface SearchParams {
  q?: string | null;
  category?: string | null;
  min?: number | null;
  max?: number | null;
  sort?: string | null;
  page?: number;
  pageSize?: number;
}

export async function searchProducts(p: SearchParams): Promise<SearchResult> {
  const res = check(
    await db().rpc('search_products', {
      p_query: p.q || null,
      p_category_slug: p.category || null,
      p_min_price: p.min ?? null,
      p_max_price: p.max ?? null,
      p_sort: p.sort || 'newest',
      p_page: p.page ?? 1,
      p_page_size: p.pageSize ?? 12,
    }),
  ) as SearchResult;
  return {
    ...res,
    items: res.items.map((i) => ({ ...i, price: Number(i.price), original_price: i.original_price == null ? null : Number(i.original_price) })),
  };
}

export async function fetchFeaturedProducts(limit = 8): Promise<ProductSummary[]> {
  const rows = check(
    await db()
      .from('products')
      .select(PRODUCT_CARD_FIELDS)
      .in('status', ['published', 'coming_soon'])
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit),
  ) as unknown as CardRow[];
  return rows.map(toSummary);
}

export async function fetchNewArrivals(limit = 4): Promise<ProductSummary[]> {
  const rows = check(
    await db()
      .from('products')
      .select(PRODUCT_CARD_FIELDS)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit),
  ) as unknown as CardRow[];
  return rows.map(toSummary);
}

export async function fetchBestsellers(limit = 4): Promise<ProductSummary[]> {
  const rows = check(await db().rpc('bestselling_products', { p_limit: limit })) as ProductSummary[];
  return rows.map((r) => ({ ...r, price: Number(r.price), original_price: r.original_price == null ? null : Number(r.original_price) }));
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  const row = check(
    await db()
      .from('products')
      .select('*, category:categories!products_category_id_fkey(id,name,slug)')
      .eq('slug', slug)
      .maybeSingle(),
  ) as (Product & { category: Category | null }) | null;
  if (!row) return null;
  return {
    ...row,
    price: Number(row.price),
    original_price: row.original_price == null ? null : Number(row.original_price),
    category_name: row.category?.name ?? null,
    category_slug: row.category?.slug ?? null,
  };
}

export async function fetchRelated(product: Product, limit = 4): Promise<ProductSummary[]> {
  let query = db()
    .from('products')
    .select(PRODUCT_CARD_FIELDS)
    .in('status', ['published', 'coming_soon'])
    .neq('id', product.id)
    .limit(limit);
  if (product.category_id) query = query.eq('category_id', product.category_id);
  let rows = check(await query) as unknown as CardRow[];
  if (rows.length < limit) {
    const more = check(
      await db()
        .from('products')
        .select(PRODUCT_CARD_FIELDS)
        .in('status', ['published', 'coming_soon'])
        .not('id', 'in', `(${[product.id, ...rows.map((r) => r.id)].join(',')})`)
        .order('created_at', { ascending: false })
        .limit(limit - rows.length),
    ) as unknown as CardRow[];
    rows = rows.concat(more);
  }
  return rows.map(toSummary);
}

export async function fetchProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  if (!ids.length) return [];
  const rows = check(await db().from('products').select(PRODUCT_CARD_FIELDS).in('id', ids)) as unknown as CardRow[];
  return rows.map(toSummary);
}

export async function fetchReviewSummary(productId: string): Promise<{ count: number; average: number | null }> {
  return check(await db().rpc('product_review_summary', { p_product_id: productId })) as {
    count: number;
    average: number | null;
  };
}

export async function fetchReviews(productId: string): Promise<Review[]> {
  return check(await db().rpc('product_reviews', { p_product_id: productId, p_limit: 20, p_offset: 0 })) as Review[];
}

export async function canReview(productId: string): Promise<boolean> {
  return check(await db().rpc('can_review', { p_product_id: productId })) as boolean;
}

export async function submitReview(productId: string, customerId: string, rating: number, text: string) {
  check(
    await db().from('reviews').insert({ product_id: productId, customer_id: customerId, rating, review_text: text }),
  );
}

export async function fetchMyReview(productId: string, customerId: string) {
  return check(
    await db()
      .from('reviews')
      .select('id,status,rating,review_text')
      .eq('product_id', productId)
      .eq('customer_id', customerId)
      .maybeSingle(),
  );
}

// ---------------------------------------------------------------------------
// Cart & checkout — prices always come from the server
// ---------------------------------------------------------------------------
export async function quoteOrder(productIds: string[], couponCode?: string | null): Promise<Quote> {
  const q = check(
    await db().rpc('quote_order', { p_product_ids: productIds, p_coupon_code: couponCode || null }),
  ) as Quote;
  return {
    ...q,
    subtotal: Number(q.subtotal),
    discount: Number(q.discount),
    total: Number(q.total),
    items: q.items.map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
  };
}

export async function startCheckout(productIds: string[], couponCode?: string | null) {
  // checkout_url for gateway payments; completed=true when the order was completed without payment.
  return invoke<{ order_number: string; checkout_url?: string; completed?: boolean }>('create-order', {
    product_ids: productIds,
    coupon_code: couponCode || undefined,
  });
}

export async function fetchOrderByNumber(orderNumber: string): Promise<Order | null> {
  return check(
    await db().from('orders').select('*, order_items(*)').eq('order_number', orderNumber).maybeSingle(),
  ) as Order | null;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
export function submitEnquiry(v: { full_name: string; email: string; subject: string; message: string; website?: string }) {
  return invoke<{ ok: true }>('submit-form', { kind: 'enquiry', ...v });
}

export const NEWSLETTER_CONSENT =
  'I agree to receive occasional emails from CODEVANTASOLUTIONSLTD about new products and updates. I can unsubscribe at any time.';

export function subscribeNewsletter(email: string, website = '') {
  return invoke<{ ok: true }>('submit-form', {
    kind: 'newsletter',
    email,
    consent: true,
    consent_text: NEWSLETTER_CONSENT,
    website,
  });
}

// ---------------------------------------------------------------------------
// Customer account
// ---------------------------------------------------------------------------
export async function fetchMyOrders(): Promise<Order[]> {
  return check(
    await db().from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
  ) as Order[];
}

export async function fetchMyOrder(id: string): Promise<Order | null> {
  return check(await db().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()) as Order | null;
}

export async function fetchMyEntitlements(): Promise<Entitlement[]> {
  return check(
    await db()
      .from('downloads')
      .select('*, product:products(id,title,slug,version,preview_images,updated_at)')
      .order('created_at', { ascending: false }),
  ) as Entitlement[];
}

export async function requestDownload(productId: string) {
  return invoke<{ url: string; expires_in: number; downloads_remaining: number }>('download', { product_id: productId });
}

export async function fetchMySupportRequests(): Promise<SupportRequest[]> {
  return check(
    await db().from('support_requests').select('*').order('created_at', { ascending: false }),
  ) as SupportRequest[];
}

export async function createSupportRequest(customerId: string, v: { subject: string; message: string; order_id?: string | null }) {
  check(
    await db()
      .from('support_requests')
      .insert({ customer_id: customerId, subject: v.subject, message: v.message, order_id: v.order_id || null }),
  );
}

export async function updateMyName(id: string, fullName: string) {
  check(await db().from('profiles').update({ full_name: fullName }).eq('id', id));
}

// Server-side cart for signed-in customers (guest carts live in the browser).
export async function fetchServerCart(customerId: string): Promise<string[]> {
  const rows = check(await db().from('cart_items').select('product_id').eq('customer_id', customerId)) as {
    product_id: string;
  }[];
  return rows.map((r) => r.product_id);
}

export async function addServerCartItems(customerId: string, productIds: string[]) {
  if (!productIds.length) return;
  check(
    await db()
      .from('cart_items')
      .upsert(
        productIds.map((product_id) => ({ customer_id: customerId, product_id })),
        { onConflict: 'customer_id,product_id', ignoreDuplicates: true },
      ),
  );
}

export async function removeServerCartItem(customerId: string, productId: string) {
  check(await db().from('cart_items').delete().eq('customer_id', customerId).eq('product_id', productId));
}

export async function clearServerCart(customerId: string) {
  check(await db().from('cart_items').delete().eq('customer_id', customerId));
}
