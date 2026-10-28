-- =============================================================================
-- Business logic. Everything that decides money, ownership or access runs here,
-- on the server, so it cannot be influenced by the browser.
--
-- Error convention: raise exception '<CODE>[: detail]' using errcode 'P0001'.
-- Edge Functions map <CODE> to HTTP responses.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles & profiles
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- True when the signed-in user has (or had) an entitlement to the product.
create or replace function public.owns_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.downloads where product_id = p_product_id and customer_id = auth.uid()
  );
$$;

-- New auth users get a customer profile. Role is never read from user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- API users (anon/authenticated) can never change a role; only the service role
-- or a database owner can, e.g. via the SQL editor (see README "Create an admin").
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'PROFILE_ID_IMMUTABLE' using errcode = '42501';
  end if;
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') then
    raise exception 'ROLE_CHANGE_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- -----------------------------------------------------------------------------
-- Audit logging for sensitive administrative changes
-- -----------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_details jsonb;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, n.value)
      into v_details
      from jsonb_each(to_jsonb(new)) n
     where n.key not in ('updated_at')
       and (to_jsonb(old) -> n.key) is distinct from n.value;
    if v_details is null then
      return new;  -- nothing meaningful changed
    end if;
    v_details := jsonb_build_object('changed', v_details);
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'product_id', v_row ->> 'setting_key'),
    v_details
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row_change();
create trigger audit_product_files after insert or update or delete on public.product_files
  for each row execute function public.audit_row_change();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_row_change();
create trigger audit_coupons after insert or update or delete on public.coupons
  for each row execute function public.audit_row_change();
create trigger audit_site_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_row_change();
create trigger audit_reviews_moderation after update or delete on public.reviews
  for each row execute function public.audit_row_change();
create trigger audit_profile_roles after update of role on public.profiles
  for each row execute function public.audit_row_change();
create trigger audit_downloads after update on public.downloads
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Product publication rules
-- -----------------------------------------------------------------------------
create or replace function public.validate_product_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing text[] := '{}';
  v_path text;
begin
  if new.status <> 'published' then
    return new;
  end if;

  if coalesce(char_length(new.short_description), 0) < 20 then
    v_missing := array_append(v_missing, 'short description (20+ characters)');
  end if;
  if coalesce(char_length(new.description), 0) < 120 then
    v_missing := array_append(v_missing, 'description (120+ characters)');
  end if;
  if new.category_id is null then
    v_missing := array_append(v_missing, 'category');
  end if;
  if new.price <= 0 then
    v_missing := array_append(v_missing, 'price greater than zero');
  end if;
  if cardinality(new.preview_images) = 0 then
    v_missing := array_append(v_missing, 'at least one preview image');
  end if;
  if jsonb_array_length(new.contents) = 0 then
    v_missing := array_append(v_missing, 'contents list');
  end if;
  if coalesce(char_length(new.licence_text), 0) < 50 then
    v_missing := array_append(v_missing, 'licence text');
  end if;

  select storage_path into v_path from public.product_files where product_id = new.id;
  if v_path is null then
    v_missing := array_append(v_missing, 'downloadable file');
  elsif not exists (
    select 1 from storage.objects where bucket_id = 'product-files' and name = v_path
  ) then
    v_missing := array_append(v_missing, 'downloadable file is not present in storage');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'PUBLISH_VALIDATION_FAILED: %', array_to_string(v_missing, '; ')
      using errcode = '23514';
  end if;

  if new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger products_validate_publication
  before insert or update on public.products
  for each row execute function public.validate_product_publication();

-- A published product must keep its file.
create or replace function public.protect_published_file()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.products where id = old.product_id and status = 'published') then
    raise exception 'FILE_REQUIRED_WHILE_PUBLISHED: unpublish the product before removing its file'
      using errcode = '23514';
  end if;
  return old;
end;
$$;

create trigger product_files_protect_delete
  before delete on public.product_files
  for each row execute function public.protect_published_file();

-- -----------------------------------------------------------------------------
-- Reviews: moderation metadata is set by the database, not the client
-- -----------------------------------------------------------------------------
create or replace function public.stamp_review_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.moderated_by := auth.uid();
    new.moderated_at := now();
  end if;
  -- Content and ownership are immutable after submission.
  new.product_id  := old.product_id;
  new.customer_id := old.customer_id;
  new.rating      := old.rating;
  new.review_text := old.review_text;
  return new;
end;
$$;

create trigger reviews_stamp_moderation
  before update on public.reviews
  for each row execute function public.stamp_review_moderation();

-- True when the signed-in user holds an active entitlement for the product.
create or replace function public.can_review(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.downloads d
      join public.order_items oi on oi.id = d.order_item_id
      join public.orders o on o.id = oi.order_id
     where d.customer_id = auth.uid()
       and d.product_id = p_product_id
       and d.status = 'active'
       and o.payment_status = 'paid'
  );
$$;

create or replace function public.product_review_summary(p_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'count', count(*),
    'average', round(avg(rating)::numeric, 1)
  )
  from public.reviews
  where product_id = p_product_id and status = 'approved';
$$;

-- Approved reviews with a privacy-preserving display name (first name only).
create or replace function public.product_reviews(p_product_id uuid, p_limit int default 20, p_offset int default 0)
returns table (id uuid, rating smallint, review_text text, created_at timestamptz, reviewer_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.review_text, r.created_at,
         coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Verified customer')
    from public.reviews r
    left join public.profiles p on p.id = r.customer_id
   where r.product_id = p_product_id and r.status = 'approved'
   order by r.created_at desc
   limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

-- -----------------------------------------------------------------------------
-- Catalogue search (security invoker: RLS applies)
-- -----------------------------------------------------------------------------
create or replace function public.search_products(
  p_query          text    default null,
  p_category_slug  text    default null,
  p_min_price      numeric default null,
  p_max_price      numeric default null,
  p_sort           text    default 'newest',
  p_page           int     default 1,
  p_page_size      int     default 12
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_q      text := nullif(trim(left(coalesce(p_query, ''), 100)), '');
  v_size   int  := least(greatest(coalesce(p_page_size, 12), 1), 48);
  v_offset int  := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 12), 1), 48);
  v_result jsonb;
begin
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with filtered as (
    select p.id, p.title, p.slug, p.subtitle, p.short_description, p.product_type,
           p.price, p.currency, p.original_price, p.preview_images, p.status,
           p.is_featured, p.version, p.created_at, p.published_at,
           c.name as category_name, c.slug as category_slug
      from public.products p
      left join public.categories c on c.id = p.category_id
     where p.status in ('published', 'coming_soon')
       and (v_q is null
            or p.title ilike v_q
            or p.short_description ilike v_q
            or p.description ilike v_q)
       and (p_category_slug is null
            or c.slug = p_category_slug
            or exists (select 1
                         from public.product_categories pc
                         join public.categories c2 on c2.id = pc.category_id
                        where pc.product_id = p.id and c2.slug = p_category_slug))
       and (p_min_price is null or p.price >= p_min_price)
       and (p_max_price is null or p.price <= p_max_price)
  ),
  ordered as (
    select f.*, row_number() over (
             order by
               case when p_sort = 'price_asc'  then f.price end asc,
               case when p_sort = 'price_desc' then f.price end desc,
               case when p_sort = 'name_asc'   then f.title end asc,
               case when p_sort = 'name_desc'  then f.title end desc,
               f.created_at desc, f.title asc
           ) as rn
      from filtered f
  )
  select jsonb_build_object(
           'total', (select count(*) from filtered),
           'page', greatest(coalesce(p_page, 1), 1),
           'page_size', v_size,
           'items', coalesce((
             select jsonb_agg(to_jsonb(o) - 'rn' order by o.rn)
               from ordered o
              where o.rn > v_offset and o.rn <= v_offset + v_size
           ), '[]'::jsonb)
         )
    into v_result;
  return v_result;
end;
$$;

-- Bestsellers are derived only from paid orders. Returns nothing for a new store.
create or replace function public.bestselling_products(p_limit int default 4)
returns setof public.products
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
    from public.products p
    join (
      select oi.product_id, count(*) as units
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
       where o.payment_status = 'paid'
       group by oi.product_id
    ) s on s.product_id = p.id
   where p.status = 'published'
   order by s.units desc, p.title
   limit least(greatest(p_limit, 1), 24);
$$;

-- -----------------------------------------------------------------------------
-- Pricing — the single source of truth for cart totals and orders
-- -----------------------------------------------------------------------------
create or replace function public.quote_order(p_product_ids uuid[], p_coupon_code text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ids          uuid[];
  v_items        jsonb;
  v_unavailable  uuid[];
  v_currency     text;
  v_currencies   int;
  v_subtotal     numeric(10, 2);
  v_discount     numeric(10, 2) := 0;
  v_coupon       public.coupons;
  v_code         text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_coupon_state text := null;
begin
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_product_ids, '{}')) x where x is not null;
  if cardinality(v_ids) > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'product_id', p.id, 'title', p.title, 'slug', p.slug,
           'unit_price', p.price, 'currency', p.currency,
           'preview_image', p.preview_images[1], 'product_type', p.product_type
         ) order by p.title), '[]'::jsonb),
         count(distinct p.currency),
         min(p.currency),
         coalesce(sum(p.price), 0)
    into v_items, v_currencies, v_currency, v_subtotal
    from public.products p
   where p.id = any (v_ids) and p.status = 'published';

  select coalesce(array_agg(x), '{}') into v_unavailable
    from unnest(v_ids) x
   where not exists (select 1 from public.products p where p.id = x and p.status = 'published');

  if v_currencies > 1 then
    raise exception 'MIXED_CURRENCIES' using errcode = 'P0001';
  end if;

  if v_code is not null then
    select * into v_coupon from public.coupons where code = v_code;
    if not found or not v_coupon.is_active then
      v_coupon_state := 'invalid';
    elsif (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.ends_at is not null and v_coupon.ends_at <= now())
       or (v_coupon.max_redemptions is not null and v_coupon.redemption_count >= v_coupon.max_redemptions) then
      v_coupon_state := 'expired';
    elsif v_subtotal = 0 or v_subtotal < v_coupon.min_subtotal
       or (v_coupon.discount_type = 'fixed' and v_coupon.currency is distinct from v_currency) then
      v_coupon_state := 'not_applicable';
    else
      v_coupon_state := 'applied';
      v_discount := least(
        v_subtotal,
        case v_coupon.discount_type
          when 'percent' then round(v_subtotal * v_coupon.discount_value / 100, 2)
          else v_coupon.discount_value
        end
      );
    end if;
  end if;

  return jsonb_build_object(
    'items', v_items,
    'unavailable', to_jsonb(v_unavailable),
    'currency', v_currency,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total', v_subtotal - v_discount,
    'coupon', case when v_code is null then null
                   else jsonb_build_object('code', v_code, 'status', v_coupon_state,
                                           'coupon_id', case when v_coupon_state = 'applied' then v_coupon.id end)
              end
  );
end;
$$;

-- Creates a pending order using only server-side prices. Service role only.
create or replace function public.create_order(
  p_customer_id  uuid,
  p_product_ids  uuid[],
  p_coupon_code  text,
  p_provider     text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote  jsonb;
  v_email  text;
  v_order  public.orders;
begin
  if p_customer_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  select email into v_email from auth.users where id = p_customer_id;
  if not found then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  v_quote := public.quote_order(p_product_ids, p_coupon_code);

  if jsonb_array_length(v_quote -> 'unavailable') > 0 then
    raise exception 'PRODUCT_UNAVAILABLE: %', v_quote -> 'unavailable' using errcode = 'P0001';
  end if;
  if jsonb_array_length(v_quote -> 'items') = 0 then
    raise exception 'EMPTY_ORDER' using errcode = 'P0001';
  end if;
  if v_quote -> 'coupon' is not null and v_quote -> 'coupon' ->> 'status' <> 'applied' then
    raise exception 'COUPON_NOT_APPLICABLE: %', v_quote -> 'coupon' ->> 'status' using errcode = 'P0001';
  end if;
  if (v_quote ->> 'total')::numeric <= 0 then
    raise exception 'ZERO_TOTAL_NOT_SUPPORTED' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.downloads d
     where d.customer_id = p_customer_id
       and d.status = 'active'
       and d.product_id in (select (i ->> 'product_id')::uuid from jsonb_array_elements(v_quote -> 'items') i)
  ) then
    raise exception 'ALREADY_OWNED' using errcode = 'P0001';
  end if;

  insert into public.orders (customer_id, customer_email, subtotal, discount_amount, total,
                             currency, coupon_id, payment_provider)
  values (p_customer_id, v_email,
          (v_quote ->> 'subtotal')::numeric,
          (v_quote ->> 'discount')::numeric,
          (v_quote ->> 'total')::numeric,
          v_quote ->> 'currency',
          (v_quote -> 'coupon' ->> 'coupon_id')::uuid,
          p_provider)
  returning * into v_order;

  insert into public.order_items (order_id, product_id, product_title_snapshot, unit_price, currency)
  select v_order.id, (i ->> 'product_id')::uuid, i ->> 'title', (i ->> 'unit_price')::numeric, i ->> 'currency'
    from jsonb_array_elements(v_quote -> 'items') i;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'total', v_order.total,
    'currency', v_order.currency,
    'customer_email', v_email,
    'items', v_quote -> 'items'
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Payment processing — called only by the signature-verified webhook.
-- Idempotent: each provider event is recorded once (unique constraint).
-- p_outcome: paid | failed | cancelled | refunded | partially_refunded | ignored
-- -----------------------------------------------------------------------------
create or replace function public.process_payment_event(
  p_provider           text,
  p_provider_event_id  text,
  p_event_type         text,
  p_provider_order_id  text,
  p_outcome            text,
  p_amount             numeric,
  p_currency           text,
  p_provider_payment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order     public.orders;
  v_event_id  uuid;
  v_verify    text;
  v_result    text := 'no_change';
begin
  if p_outcome not in ('paid', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'ignored') then
    raise exception 'INVALID_OUTCOME' using errcode = 'P0001';
  end if;
  if coalesce(p_provider_event_id, '') = '' then
    raise exception 'EVENT_ID_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_order
    from public.orders
   where payment_provider = p_provider and provider_order_id = p_provider_order_id
   for update;

  v_verify := case
    when v_order.id is null then 'unknown_order'
    when p_outcome = 'ignored' then 'ignored'
    when p_outcome = 'paid'
         and (p_amount is distinct from v_order.total or upper(p_currency) is distinct from v_order.currency)
      then 'amount_mismatch'
    else 'verified'
  end;

  insert into public.payment_events (order_id, provider, provider_event_id, event_type,
                                     verification_status, amount, currency)
  values (v_order.id, p_provider, p_provider_event_id, p_event_type, v_verify, p_amount, upper(p_currency))
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('result', 'duplicate', 'order_id', v_order.id);
  end if;

  if v_verify <> 'verified' then
    update public.payment_events set processed_at = now() where id = v_event_id;
    return jsonb_build_object('result', v_verify, 'order_id', v_order.id);
  end if;

  if p_outcome = 'paid' then
    if v_order.payment_status in ('pending', 'failed', 'cancelled') then
      update public.orders
         set payment_status = 'paid', paid_at = now(),
             provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id)
       where id = v_order.id;
      if v_order.customer_id is not null then
        insert into public.downloads (order_item_id, customer_id, product_id)
        select oi.id, v_order.customer_id, oi.product_id
          from public.order_items oi
         where oi.order_id = v_order.id
        on conflict (order_item_id) do nothing;
      end if;
      if v_order.coupon_id is not null then
        update public.coupons set redemption_count = redemption_count + 1 where id = v_order.coupon_id;
      end if;
      v_result := 'paid';
    end if;

  elsif p_outcome in ('failed', 'cancelled') then
    -- A failure never downgrades an order that has already been paid.
    if v_order.payment_status = 'pending' then
      update public.orders set payment_status = p_outcome::public.payment_status where id = v_order.id;
      v_result := p_outcome;
    end if;

  elsif p_outcome = 'refunded' then
    if v_order.payment_status in ('paid', 'partially_refunded') then
      update public.orders set payment_status = 'refunded', refunded_at = now() where id = v_order.id;
      update public.downloads
         set status = 'revoked', revoked_reason = 'Order refunded'
       where order_item_id in (select id from public.order_items where order_id = v_order.id)
         and status = 'active';
      v_result := 'refunded';
    end if;

  elsif p_outcome = 'partially_refunded' then
    if v_order.payment_status = 'paid' then
      update public.orders set payment_status = 'partially_refunded' where id = v_order.id;
      v_result := 'partially_refunded';
    end if;
  end if;

  update public.payment_events set processed_at = now() where id = v_event_id;
  return jsonb_build_object('result', v_result, 'order_id', v_order.id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Download authorisation — service role only. Checks entitlement, paid order,
-- expiry and limit, then counts the download. Returns the private object path
-- for the Edge Function to sign; the path is never returned to the browser.
-- -----------------------------------------------------------------------------
create or replace function public.authorize_download(p_customer_id uuid, p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dl    public.downloads;
  v_file  public.product_files;
begin
  select d.* into v_dl
    from public.downloads d
    join public.order_items oi on oi.id = d.order_item_id
    join public.orders o on o.id = oi.order_id
   where d.customer_id = p_customer_id
     and d.product_id = p_product_id
     and d.status = 'active'
     and o.payment_status in ('paid', 'partially_refunded')
   order by d.created_at desc
   limit 1
   for update of d;

  if not found then
    raise exception 'NO_ENTITLEMENT' using errcode = 'P0001';
  end if;
  if v_dl.expires_at is not null and v_dl.expires_at <= now() then
    raise exception 'ENTITLEMENT_EXPIRED' using errcode = 'P0001';
  end if;
  if v_dl.download_count >= v_dl.download_limit then
    raise exception 'DOWNLOAD_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  select * into v_file from public.product_files where product_id = p_product_id;
  if not found then
    raise exception 'FILE_UNAVAILABLE' using errcode = 'P0001';
  end if;

  update public.downloads
     set download_count = download_count + 1, last_downloaded_at = now()
   where id = v_dl.id;
  insert into public.download_events (download_id, customer_id) values (v_dl.id, p_customer_id);

  return jsonb_build_object(
    'storage_path', v_file.storage_path,
    'file_name', v_file.file_name,
    'downloads_remaining', v_dl.download_limit - v_dl.download_count - 1
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Rate limiting (fixed window) — service role only.
-- -----------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits   int;
begin
  insert into public.rate_limits (bucket_key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (bucket_key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$;

-- Support requests: at most 5 per customer per hour.
create or replace function public.limit_support_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.support_requests
       where customer_id = new.customer_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger support_requests_rate_limit
  before insert on public.support_requests
  for each row execute function public.limit_support_requests();

-- -----------------------------------------------------------------------------
-- Admin helpers (each checks is_admin() itself)
-- -----------------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'products_total',      (select count(*) from public.products),
    'products_published',  (select count(*) from public.products where status = 'published'),
    'products_draft',      (select count(*) from public.products where status = 'draft'),
    'products_coming_soon',(select count(*) from public.products where status = 'coming_soon'),
    'orders_total',        (select count(*) from public.orders),
    'orders_paid',         (select count(*) from public.orders where payment_status in ('paid', 'partially_refunded')),
    'revenue',             coalesce((select jsonb_object_agg(currency, amount) from (
                              select currency, sum(total) as amount from public.orders
                               where payment_status in ('paid', 'partially_refunded')
                               group by currency) r), '{}'::jsonb),
    'enquiries_new',       (select count(*) from public.enquiries where status = 'new'),
    'reviews_pending',     (select count(*) from public.reviews where status = 'pending'),
    'support_open',        (select count(*) from public.support_requests where status in ('open', 'in_progress'))
  );
end;
$$;

create or replace function public.admin_search_customers(p_query text default null, p_limit int default 25)
returns table (id uuid, email text, full_name text, created_at timestamptz, paid_orders bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(trim(left(coalesce(p_query, ''), 100)), '');
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.created_at,
           (select count(*) from public.orders o
             where o.customer_id = p.id and o.payment_status in ('paid', 'partially_refunded'))
      from public.profiles p
      join auth.users u on u.id = p.id
     where v_q is null or u.email ilike v_q or p.full_name ilike v_q
     order by p.created_at desc
     limit least(greatest(p_limit, 1), 100);
end;
$$;

-- Revoke or reinstate a customer's entitlement, or change its limit/expiry.
-- Payment state is deliberately NOT editable here or anywhere else in the API.
create or replace function public.admin_update_entitlement(
  p_download_id     uuid,
  p_status          public.entitlement_status,
  p_reason          text default null,
  p_download_limit  int default null,
  p_expires_at      timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_status = 'active' and exists (
    select 1 from public.downloads d
      join public.order_items oi on oi.id = d.order_item_id
      join public.orders o on o.id = oi.order_id
     where d.id = p_download_id and o.payment_status not in ('paid', 'partially_refunded')
  ) then
    raise exception 'ORDER_NOT_PAID' using errcode = 'P0001';
  end if;

  update public.downloads
     set status = p_status,
         revoked_reason = case when p_status = 'active' then null else left(p_reason, 300) end,
         download_limit = coalesce(p_download_limit, download_limit),
         expires_at = p_expires_at
   where id = p_download_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;
