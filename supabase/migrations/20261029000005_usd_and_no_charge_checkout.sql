-- =============================================================================
-- 1. Prices move to USD (same numbers).
-- 2. "No-charge" checkout: until a payment gateway is connected, signed-in
--    customers can complete an order and get instant access. Orders are recorded
--    honestly: list prices kept on the items, a 100% no-charge discount, total 0,
--    payment_provider 'no_charge' — never as money received.
--    The mode is enforced here on the server via site_settings.commerce.checkout_mode:
--      'no_charge' | 'payments' | 'disabled'
-- =============================================================================

update public.products set currency = 'USD' where currency = 'INR';
alter table public.products alter column currency set default 'USD';

update public.site_settings
   set setting_value = setting_value
       || jsonb_build_object('currencies', jsonb_build_array('USD'), 'default_currency', 'USD', 'checkout_mode', 'no_charge')
 where setting_key = 'commerce';

-- Server-side source of truth for the checkout mode.
create or replace function public.checkout_mode()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select setting_value ->> 'checkout_mode' from public.site_settings where setting_key = 'commerce'),
    'disabled'
  );
$$;

-- Completes an order without taking payment. Service role only (Edge Function).
create or replace function public.complete_no_charge_order(p_customer_id uuid, p_product_ids uuid[])
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
  if public.checkout_mode() <> 'no_charge' then
    raise exception 'NO_CHARGE_DISABLED' using errcode = 'P0001';
  end if;
  if p_customer_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  select email into v_email from auth.users where id = p_customer_id;
  if not found then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  v_quote := public.quote_order(p_product_ids, null);

  if jsonb_array_length(v_quote -> 'unavailable') > 0 then
    raise exception 'PRODUCT_UNAVAILABLE: %', v_quote -> 'unavailable' using errcode = 'P0001';
  end if;
  if jsonb_array_length(v_quote -> 'items') = 0 then
    raise exception 'EMPTY_ORDER' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.downloads d
     where d.customer_id = p_customer_id
       and d.status = 'active'
       and d.product_id in (select (i ->> 'product_id')::uuid from jsonb_array_elements(v_quote -> 'items') i)
  ) then
    raise exception 'ALREADY_OWNED' using errcode = 'P0001';
  end if;

  insert into public.orders (customer_id, customer_email, subtotal, discount_amount, total, currency,
                             payment_provider, payment_status, paid_at)
  values (p_customer_id, v_email,
          (v_quote ->> 'subtotal')::numeric,
          (v_quote ->> 'subtotal')::numeric,   -- 100% no-charge discount
          0,
          v_quote ->> 'currency',
          'no_charge', 'paid', now())
  returning * into v_order;

  insert into public.order_items (order_id, product_id, product_title_snapshot, unit_price, currency)
  select v_order.id, (i ->> 'product_id')::uuid, i ->> 'title', (i ->> 'unit_price')::numeric, i ->> 'currency'
    from jsonb_array_elements(v_quote -> 'items') i;

  insert into public.downloads (order_item_id, customer_id, product_id)
  select oi.id, p_customer_id, oi.product_id from public.order_items oi where oi.order_id = v_order.id;

  return jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number);
end;
$$;

-- Dashboard: no-charge orders are not sales.
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
    'orders_paid',         (select count(*) from public.orders
                             where payment_status in ('paid', 'partially_refunded') and payment_provider is distinct from 'no_charge'),
    'orders_no_charge',    (select count(*) from public.orders where payment_provider = 'no_charge'),
    'revenue',             coalesce((select jsonb_object_agg(currency, amount) from (
                              select currency, sum(total) as amount from public.orders
                               where payment_status in ('paid', 'partially_refunded')
                                 and payment_provider is distinct from 'no_charge'
                               group by currency) r), '{}'::jsonb),
    'enquiries_new',       (select count(*) from public.enquiries where status = 'new'),
    'reviews_pending',     (select count(*) from public.reviews where status = 'pending'),
    'support_open',        (select count(*) from public.support_requests where status in ('open', 'in_progress'))
  );
end;
$$;

revoke execute on function public.checkout_mode() from public, anon, authenticated;
revoke execute on function public.complete_no_charge_order(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.checkout_mode() to service_role;
grant execute on function public.complete_no_charge_order(uuid, uuid[]) to service_role;
