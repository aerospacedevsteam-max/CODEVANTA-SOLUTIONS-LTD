-- =============================================================================
-- CODEVANTASOLUTIONSLTD storefront — core schema
-- Tables, enums, constraints, indexes and timestamp triggers.
-- Security (RLS, grants) lives in 20261028000003_security.sql.
-- =============================================================================

create type public.app_role as enum ('customer', 'admin');
create type public.product_status as enum ('draft', 'coming_soon', 'published', 'archived');
create type public.payment_status as enum (
  'pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded'
);
create type public.entitlement_status as enum ('active', 'revoked', 'expired');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.enquiry_status as enum ('new', 'in_progress', 'closed', 'spam');
create type public.discount_type as enum ('percent', 'fixed');

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 120),
  role        public.app_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role = 'admin';
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 80),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description    text check (description is null or char_length(description) <= 400),
  icon           text,                 -- lucide icon name used by the UI
  image_path     text,
  is_published   boolean not null default true,
  display_order  integer not null default 0,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index categories_order_idx on public.categories (display_order) where is_published;
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table public.products (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null check (char_length(title) between 3 and 140),
  slug                    text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  subtitle                text check (subtitle is null or char_length(subtitle) <= 200),
  short_description       text check (short_description is null or char_length(short_description) <= 300),
  description             text,
  product_type            text not null default 'Template kit',
  highlights              text[] not null default '{}',
  -- [{ "name": "index.html", "description": "Home page" }, ...]
  contents                jsonb not null default '[]'::jsonb check (jsonb_typeof(contents) = 'array'),
  technical_requirements  text[] not null default '{}',
  compatibility           text[] not null default '{}',
  -- [{ "question": "...", "answer": "..." }, ...]
  faq                     jsonb not null default '[]'::jsonb check (jsonb_typeof(faq) = 'array'),
  licence_text            text,
  support_info            text,
  price                   numeric(10, 2) not null check (price >= 0),
  currency                char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  -- A genuine previous selling price. Only shown when greater than price.
  original_price          numeric(10, 2) check (original_price is null or original_price > price),
  category_id             uuid references public.categories (id) on delete restrict,
  preview_images          text[] not null default '{}',
  version                 text not null default '1.0.0',
  status                  public.product_status not null default 'draft',
  is_featured             boolean not null default false,
  seo_title               text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description         text check (seo_description is null or char_length(seo_description) <= 170),
  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index products_status_idx on public.products (status, created_at desc);
create index products_category_idx on public.products (category_id);
create index products_featured_idx on public.products (is_featured) where is_featured;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Secondary category membership (a product always has one primary category_id).
create table public.product_categories (
  product_id   uuid not null references public.products (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);
create index product_categories_category_idx on public.product_categories (category_id);

-- -----------------------------------------------------------------------------
-- coupons
-- -----------------------------------------------------------------------------
create table public.coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  description       text,
  discount_type     public.discount_type not null,
  discount_value    numeric(10, 2) not null check (discount_value > 0),
  currency          char(3) check (currency is null or currency ~ '^[A-Z]{3}$'),
  min_subtotal      numeric(10, 2) not null default 0 check (min_subtotal >= 0),
  starts_at         timestamptz,
  ends_at           timestamptz,
  max_redemptions   integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count  integer not null default 0 check (redemption_count >= 0),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (discount_type <> 'fixed' or currency is not null),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- orders / order_items
-- -----------------------------------------------------------------------------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid references public.profiles (id) on delete set null,
  customer_email     text,
  order_number       text not null unique
                     default ('CV-' || to_char(now(), 'YYMM') || '-' || nextval('public.order_number_seq')::text),
  subtotal           numeric(10, 2) not null check (subtotal >= 0),
  discount_amount    numeric(10, 2) not null default 0 check (discount_amount >= 0),
  total              numeric(10, 2) not null check (total >= 0),
  currency           char(3) not null check (currency ~ '^[A-Z]{3}$'),
  coupon_id          uuid references public.coupons (id) on delete set null,
  payment_provider   text,
  provider_order_id  text,
  provider_payment_id text,
  payment_status     public.payment_status not null default 'pending',
  paid_at            timestamptz,
  refunded_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (total = subtotal - discount_amount),
  unique (payment_provider, provider_order_id)
);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (payment_status, created_at desc);
create index orders_provider_payment_idx on public.orders (provider_payment_id) where provider_payment_id is not null;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id                      uuid primary key default gen_random_uuid(),
  order_id                uuid not null references public.orders (id) on delete cascade,
  product_id              uuid not null references public.products (id) on delete restrict,
  product_title_snapshot  text not null,
  unit_price              numeric(10, 2) not null check (unit_price >= 0),
  currency                char(3) not null,
  -- Each line is one single-licensee licence; quantities above 1 are not applicable.
  quantity                integer not null default 1 check (quantity = 1),
  created_at              timestamptz not null default now(),
  unique (order_id, product_id)
);
create index order_items_product_idx on public.order_items (product_id);

-- -----------------------------------------------------------------------------
-- payment_events (webhook ledger; unique per provider event → idempotency)
-- -----------------------------------------------------------------------------
create table public.payment_events (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid references public.orders (id) on delete set null,
  provider             text not null,
  provider_event_id    text not null,
  event_type           text not null,
  verification_status  text not null check (verification_status in ('verified', 'amount_mismatch', 'unknown_order', 'ignored')),
  amount               numeric(10, 2),
  currency             char(3),
  processed_at         timestamptz,
  created_at           timestamptz not null default now(),
  unique (provider, provider_event_id)
);
create index payment_events_order_idx on public.payment_events (order_id);

-- -----------------------------------------------------------------------------
-- downloads (entitlements) and download_events
-- -----------------------------------------------------------------------------
create table public.downloads (
  id                  uuid primary key default gen_random_uuid(),
  order_item_id       uuid not null unique references public.order_items (id) on delete cascade,
  customer_id         uuid not null references public.profiles (id) on delete cascade,
  product_id          uuid not null references public.products (id) on delete restrict,
  status              public.entitlement_status not null default 'active',
  download_count      integer not null default 0 check (download_count >= 0),
  download_limit      integer not null default 15 check (download_limit > 0),
  expires_at          timestamptz,
  revoked_reason      text,
  last_downloaded_at  timestamptz,
  created_at          timestamptz not null default now()
);
create index downloads_customer_idx on public.downloads (customer_id, product_id);

create table public.download_events (
  id           uuid primary key default gen_random_uuid(),
  download_id  uuid not null references public.downloads (id) on delete cascade,
  customer_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index download_events_download_idx on public.download_events (download_id, created_at desc);

-- -----------------------------------------------------------------------------
-- reviews
-- -----------------------------------------------------------------------------
create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  customer_id      uuid not null references public.profiles (id) on delete cascade,
  rating           smallint not null check (rating between 1 and 5),
  review_text      text not null check (char_length(review_text) between 10 and 2000),
  status           public.review_status not null default 'pending',
  moderation_note  text,
  moderated_by     uuid references public.profiles (id) on delete set null,
  moderated_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (product_id, customer_id)
);
create index reviews_product_idx on public.reviews (product_id, status);
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- enquiries, newsletter, support
-- -----------------------------------------------------------------------------
create table public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (char_length(full_name) between 2 and 120),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  subject     text not null check (char_length(subject) between 3 and 160),
  message     text not null check (char_length(message) between 10 and 5000),
  status      public.enquiry_status not null default 'new',
  created_at  timestamptz not null default now()
);
create index enquiries_status_idx on public.enquiries (status, created_at desc);

create table public.newsletter_subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  consent_text     text not null,
  consented_at     timestamptz not null default now(),
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now()
);

create table public.support_requests (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.profiles (id) on delete cascade,
  order_id     uuid references public.orders (id) on delete set null,
  subject      text not null check (char_length(subject) between 3 and 160),
  message      text not null check (char_length(message) between 10 and 5000),
  status       public.ticket_status not null default 'open',
  admin_reply  text check (admin_reply is null or char_length(admin_reply) <= 5000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index support_requests_customer_idx on public.support_requests (customer_id, created_at desc);
create trigger support_requests_updated_at before update on public.support_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- carts (signed-in customers; guests keep a convenience cart in the browser)
-- -----------------------------------------------------------------------------
create table public.cart_items (
  customer_id  uuid not null references public.profiles (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (customer_id, product_id)
);

-- -----------------------------------------------------------------------------
-- site settings, audit logs, rate limits
-- -----------------------------------------------------------------------------
create table public.site_settings (
  id             uuid primary key default gen_random_uuid(),
  setting_key    text not null unique check (setting_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  setting_value  jsonb not null,
  is_public      boolean not null default true,
  updated_by     uuid references public.profiles (id) on delete set null,
  updated_at     timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

create table public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  details      jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create table public.rate_limits (
  bucket_key    text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (bucket_key, window_start)
);

-- -----------------------------------------------------------------------------
-- product_files — the private download for a product.
-- Kept out of `products` (which is publicly readable) so that private storage
-- paths are never exposed to visitors. Only admins and the service role read it.
-- -----------------------------------------------------------------------------
create table public.product_files (
  product_id       uuid primary key references public.products (id) on delete cascade,
  storage_path     text not null check (storage_path !~ '(^/|\.\.)'),
  file_name        text not null check (char_length(file_name) between 1 and 200),
  size_bytes       bigint check (size_bytes is null or size_bytes > 0),
  checksum_sha256  text check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by      uuid references public.profiles (id) on delete set null,
  uploaded_at      timestamptz not null default now()
);
