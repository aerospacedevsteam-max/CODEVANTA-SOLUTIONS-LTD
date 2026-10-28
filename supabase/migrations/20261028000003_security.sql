-- =============================================================================
-- Security: Row Level Security, least-privilege grants, storage buckets/policies.
--
-- Supabase grants ALL on public tables/functions to anon and authenticated by
-- default. We revoke what the API must never do, then RLS limits rows.
-- The service role (Edge Functions only) bypasses RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.products               enable row level security;
alter table public.product_categories     enable row level security;
alter table public.product_files          enable row level security;
alter table public.coupons                enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.payment_events         enable row level security;
alter table public.downloads              enable row level security;
alter table public.download_events        enable row level security;
alter table public.reviews                enable row level security;
alter table public.enquiries              enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.support_requests       enable row level security;
alter table public.cart_items             enable row level security;
alter table public.site_settings          enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.rate_limits            enable row level security;

-- -----------------------------------------------------------------------------
-- Table privileges (defence in depth on top of RLS)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Public catalogue
grant select on public.categories, public.products, public.product_categories, public.site_settings
  to anon, authenticated;

-- Signed-in users (RLS narrows every statement to their own rows or to admins)
grant update (full_name) on public.profiles to authenticated;
grant select on public.profiles to authenticated;

grant insert, update, delete on public.categories, public.products, public.product_categories
  to authenticated;                                   -- admin-only via RLS
grant select, insert, update, delete on public.product_files, public.coupons to authenticated;  -- admin-only via RLS
grant insert, update on public.site_settings to authenticated;                                 -- admin-only via RLS

grant select on public.orders, public.order_items, public.downloads, public.download_events
  to authenticated;                                   -- own rows, or admin
grant select on public.payment_events, public.audit_logs, public.newsletter_subscribers
  to authenticated;                                   -- admin-only via RLS

grant select, delete on public.reviews to authenticated;
grant insert (product_id, customer_id, rating, review_text) on public.reviews to authenticated;
grant update (status, moderation_note) on public.reviews to authenticated;   -- admin-only via RLS

grant select on public.enquiries to authenticated;
grant update (status) on public.enquiries to authenticated;                  -- admin-only via RLS

grant select on public.support_requests to authenticated;
grant insert (customer_id, order_id, subject, message) on public.support_requests to authenticated;
grant update (status, admin_reply) on public.support_requests to authenticated; -- admin-only via RLS

grant select, insert, delete on public.cart_items to authenticated;

-- Never exposed through the API: rate_limits. Never writable through the API:
-- orders, order_items, payment_events, downloads, download_events, audit_logs.

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_product(uuid) to anon, authenticated;
grant execute on function public.search_products(text, text, numeric, numeric, text, int, int) to anon, authenticated;
grant execute on function public.bestselling_products(int) to anon, authenticated;
grant execute on function public.quote_order(uuid[], text) to anon, authenticated;
grant execute on function public.product_review_summary(uuid) to anon, authenticated;
grant execute on function public.product_reviews(uuid, int, int) to anon, authenticated;
grant execute on function public.can_review(uuid) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_search_customers(text, int) to authenticated;
grant execute on function public.admin_update_entitlement(uuid, public.entitlement_status, text, int, timestamptz) to authenticated;

grant execute on function public.create_order(uuid, uuid[], text, text) to service_role;
grant execute on function public.process_payment_event(text, text, text, text, text, numeric, text, text) to service_role;
grant execute on function public.authorize_download(uuid, uuid) to service_role;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- categories
create policy "categories: public read published" on public.categories
  for select using (is_published or public.is_admin());
create policy "categories: admin insert" on public.categories
  for insert to authenticated with check (public.is_admin());
create policy "categories: admin update" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories: admin delete" on public.categories
  for delete to authenticated using (public.is_admin());

-- products: visitors see published and coming-soon products; owners keep
-- visibility of archived products they bought; admins see everything.
create policy "products: public read" on public.products
  for select using (
    status in ('published', 'coming_soon')
    or public.is_admin()
    or public.owns_product(id)
  );
create policy "products: admin insert" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "products: admin update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products: admin delete" on public.products
  for delete to authenticated using (public.is_admin());

-- product_categories
create policy "product_categories: public read" on public.product_categories
  for select using (true);
create policy "product_categories: admin write" on public.product_categories
  for insert to authenticated with check (public.is_admin());
create policy "product_categories: admin delete" on public.product_categories
  for delete to authenticated using (public.is_admin());

-- product_files, coupons: admin only
create policy "product_files: admin all" on public.product_files
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "coupons: admin all" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- orders & items: read own or admin; no API writes at all
create policy "orders: read own or admin" on public.orders
  for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "order_items: read own or admin" on public.order_items
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_items.order_id and o.customer_id = auth.uid())
  );

-- payment ledger: admin read only
create policy "payment_events: admin read" on public.payment_events
  for select to authenticated using (public.is_admin());

-- entitlements
create policy "downloads: read own or admin" on public.downloads
  for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "download_events: read own or admin" on public.download_events
  for select to authenticated using (customer_id = auth.uid() or public.is_admin());

-- reviews
create policy "reviews: read approved, own, or admin" on public.reviews
  for select using (status = 'approved' or customer_id = auth.uid() or public.is_admin());
create policy "reviews: verified buyers submit" on public.reviews
  for insert to authenticated with check (
    customer_id = auth.uid() and status = 'pending' and public.can_review(product_id)
  );
create policy "reviews: admin moderate" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reviews: delete own or admin" on public.reviews
  for delete to authenticated using (customer_id = auth.uid() or public.is_admin());

-- enquiries & newsletter (written by the submit-form Edge Function)
create policy "enquiries: admin read" on public.enquiries
  for select to authenticated using (public.is_admin());
create policy "enquiries: admin update" on public.enquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "newsletter: admin read" on public.newsletter_subscribers
  for select to authenticated using (public.is_admin());

-- support requests
create policy "support: read own or admin" on public.support_requests
  for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "support: customers create own" on public.support_requests
  for insert to authenticated with check (
    customer_id = auth.uid()
    and (order_id is null
         or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()))
  );
create policy "support: admin update" on public.support_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- carts
create policy "cart: own rows" on public.cart_items
  for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- settings
create policy "settings: public read" on public.site_settings
  for select using (is_public or public.is_admin());
create policy "settings: admin insert" on public.site_settings
  for insert to authenticated with check (public.is_admin());
create policy "settings: admin update" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- audit log: admin read only; rows come from triggers
create policy "audit: admin read" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- rate_limits: no policies (service role only)

-- -----------------------------------------------------------------------------
-- Storage
--   product-media : public bucket for preview images (admin upload)
--   product-files : PRIVATE bucket for paid downloads (admin upload; customers
--                   receive short-lived signed URLs from the download function)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('product-files', 'product-files', false, 524288000,
   array['application/zip', 'application/x-zip-compressed'])
on conflict (id) do nothing;

create policy "product-media: public read" on storage.objects
  for select using (bucket_id = 'product-media');
create policy "product-media: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-media' and public.is_admin());
create policy "product-media: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-media' and public.is_admin());
create policy "product-media: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-media' and public.is_admin());

create policy "product-files: admin read" on storage.objects
  for select to authenticated using (bucket_id = 'product-files' and public.is_admin());
create policy "product-files: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-files' and public.is_admin());
create policy "product-files: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-files' and public.is_admin());
create policy "product-files: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-files' and public.is_admin());
