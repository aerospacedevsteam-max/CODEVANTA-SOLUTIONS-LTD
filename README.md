# CODEVANTASOLUTIONSLTD — Digital Products Store

A complete storefront for selling original digital products: website templates, UI kits, developer resources and business spreadsheets. It includes the catalogue, product pages, cart, payment-provider checkout, protected downloads, customer accounts, an admin dashboard, legal pages, and a Supabase backend with migrations and Row Level Security.

**Status:** the code is complete and tested locally. Going live needs your Supabase project, verified company details and payment-provider approval (see [What you need to supply](#what-you-need-to-supply)). Until a provider is configured, the store shows a clearly labelled development state and offers purchase enquiries instead of taking payments.

---

## Contents

1. [Stack and structure](#stack-and-structure)
2. [Local setup](#local-setup)
3. [Connect Supabase](#connect-supabase)
4. [Product files: build, upload, publish](#product-files-build-upload-publish)
5. [Payments](#payments)
6. [Deploy to Vercel](#deploy-to-vercel)
7. [Security model](#security-model)
8. [Tests and test report](#tests-and-test-report)
9. [What you need to supply](#what-you-need-to-supply)
10. [Deviations from the brief and known limitations](#deviations-from-the-brief-and-known-limitations)

---

## Stack and structure

React 19 + Vite + TypeScript · Tailwind CSS · React Router · Lucide icons · React Hook Form + Zod · Supabase (Postgres, Auth, Storage, RLS, Edge Functions) · Vercel.

```
src/
  components/      layout (header, drawer, footer), product cards, UI primitives, forms
  context/         Auth, Cart (guest cart + account sync), Settings
  lib/             api.ts / adminApi.ts (all data access), cart, format, seo, types
  pages/           storefront, auth, account/, admin/, legal/
supabase/
  migrations/      001 schema · 002 business logic · 003 RLS & grants & storage · 004 seed catalogue
  functions/       create-order · payment-webhook · download · submit-form · _shared/
product-sources/   ORIGINAL product deliverables (9 templates/kits/spreadsheets) + LICENSE.txt
scripts/           build/upload products, previews, seed generation, sitemap, browser smoke test
tests/             db/ (real Postgres via PGlite) · unit/ · ui/ (jsdom)
public/previews/   product preview images, screenshots of the real product files
```

### Pages (all 31 required, plus extras)

| Area | Routes |
|---|---|
| Storefront | `/` · `/products` · `/categories/:slug` · `/products/:slug` · `/search?q=` · `/cart` · `/checkout` · `/checkout/return` (success/pending/failure, read from server) · `/checkout/cancelled` |
| Auth | `/signin` · `/register` · `/forgot-password` · `/reset-password` · `/auth/callback` (email verification) |
| Account | `/account` (profile) · `/account/orders` · `/account/orders/:id` · `/account/downloads` · `/account/support` |
| Info & legal | `/about` · `/contact` · `/faqs` · `/support` · `/privacy` · `/terms` · `/refund-policy` · `/licence` · `/cookies` · 404 |
| Admin | `/admin` · `/admin/products` · `/admin/products/:id` · `/admin/categories` · `/admin/orders` · `/admin/orders/:id` · `/admin/customers` · `/admin/reviews` · `/admin/inbox` · `/admin/settings` |

The catalogue keeps search, category, price range, sort, page and grid/list view in the URL, so filtered views are shareable.

---

## Local setup

Requirements: Node 20+ (tested with Node 24), npm. Chrome or Edge is needed only for preview generation and the browser smoke test.

```bash
npm install
cp .env.example .env            # then fill in VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev                     # http://localhost:5173
```

Without Supabase variables the site still runs. It shows a "database not connected" notice and empty or error states, never fake data.

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `preview` | Develop, build to `dist/`, preview the build |
| `npm test` | Unit, database (RLS) and UI tests |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test:browser` | Builds the app and checks every route in headless Chrome at 375/768/1280px |
| `npm run spreadsheets:build` | Regenerates and re-verifies the two `.xlsx` products |
| `npm run products:previews` | Screenshots the real product files into `public/previews/` |
| `npm run seed:generate` | Regenerates migration 004 from `scripts/catalogue.mjs` |
| `npm run products:build` | Validates and zips every product into `dist-products/` |
| `npm run products:upload` | Uploads ZIPs to private storage (service role; see below) |
| `npm run sitemap` | Writes `public/sitemap.xml` and the robots.txt sitemap line |

---

## Connect Supabase

### Automatic (recommended)

Put three values in `.env` (git-ignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_ACCESS_TOKEN` (create it at supabase.com → Account → Access Tokens). After that, `npm run dev` runs `npm run supabase:sync` first, which:

- applies new migrations;
- sets Auth redirect URLs and the password policy;
- sets Edge Function secrets, including payment and email secrets once you add them to `.env`;
- deploys changed Edge Functions;
- uploads changed product ZIPs to private storage and publishes them.

Unchanged steps are skipped, and a sync failure never blocks the dev server. To become admin, add `ADMIN_EMAIL=you@example.com` to `.env`, register on the site with that email, then run the sync again (or restart `npm run dev`).

### Manual (Supabase CLI)

Steps marked **(you)** need your Supabase account.

1. **(you)** Create a project at supabase.com. Note the project ref, URL, anon key and service-role key.
2. Install the Supabase CLI and link the project:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase db push            # applies supabase/migrations/001–004
   ```
   Migration 004 seeds 9 categories, the site settings and the 10 products as **coming soon** ("In development", not purchasable).
3. Auth settings (Dashboard → Authentication):
   - Site URL: your production URL. Redirect URLs: `https://YOUR-DOMAIN/auth/callback` and `https://YOUR-DOMAIN/reset-password` (plus the localhost equivalents for development).
   - Email confirmation is **off** (set by the sync): new accounts can sign in and order immediately. To require it, set up custom SMTP first, then add `EMAIL_CONFIRMATION=true` to `.env`. The password minimum is 10 characters.
   - **(you)** Configure custom SMTP so verification and reset emails come from your domain.
4. Deploy the Edge Functions and set their secrets:
   ```bash
   npx supabase functions deploy create-order
   npx supabase functions deploy download
   npx supabase functions deploy submit-form --no-verify-jwt
   npx supabase functions deploy payment-webhook --no-verify-jwt
   npx supabase secrets set SITE_URL=https://YOUR-DOMAIN ALLOWED_ORIGINS=https://YOUR-DOMAIN RATE_LIMIT_SALT=$(openssl rand -hex 32)
   ```
5. **Create the first admin.** Register normally on the site, then in the SQL editor run:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@your-domain.example');
   ```
   Roles cannot be changed through the API; a database trigger blocks it. They can only be changed this way.
6. Fill in **Admin → Website settings → company** with verified details only. Until you do, pages show amber `[placeholder]` labels.

---

## Product files: build, upload, publish

The `product-sources/` folder contains the deliverables, all original and built for this store:

| Product | Source folder(s) | Proposed price |
|---|---|---|
| Website Starter Collection | business, service-business, portfolio, saas-landing | ₹289 |
| Business Website Starter Kit | `business-website-starter` (4 pages) | ₹199 |
| SaaS Landing Page Starter Kit | `saas-landing-starter` | ₹249 |
| Admin Dashboard UI Starter Kit | `admin-dashboard-starter` | ₹299 |
| E-commerce UI Starter Kit | `ecommerce-ui-starter` (5 pages) | ₹299 |
| Portfolio Website Starter Kit | `portfolio-starter` | ₹149 |
| Small Business Finance Tracker | `small-business-finance-tracker` (.xlsx, 276 formulas) | ₹199 |
| Freelance Project Management Template | `freelance-project-management-template` (.xlsx, 4,028 formulas) | ₹149 |
| Developer Portfolio Components Pack | `developer-portfolio-components` (7 Web Components) | ₹199 |
| Small Business Website Bundle | business, portfolio, saas-landing | ₹399 |

To make the products purchasable:

```bash
npm run products:build                                   # validate + zip → dist-products/
# Run on a trusted machine only; never commit or expose the service-role key:
SUPABASE_URL=https://REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run products:upload -- --publish
```

The upload script checks each ZIP against its SHA-256 in the manifest and uploads it to the **private** `product-files` bucket under an unguessable path. It then records the file and publishes the product. The database refuses to publish any product that is missing a description, category, price, preview, contents list, licence, or a file that actually exists in storage.

Admins can also create products and upload files and previews in **Admin → Products**. The same rules apply there.

---

## Payments

### Current mode: no-charge checkout (prices in USD)

The server reads `checkout_mode` from **Admin → Website settings → commerce**:

| Mode | Behaviour |
|---|---|
| `no_charge` (current) | Signed-in customers with a verified email complete orders without paying. Files go straight to Account → Downloads. Checkout says no payment is taken. Orders are stored with their list prices, a 100% no-charge discount and a $0 total, with `payment_provider = 'no_charge'`. They show as "Completed (no charge)" and never count as sales or revenue. |
| `payments` | Normal paid checkout through the payment gateway (below). Also needs `"payments_enabled": true` and the provider secrets. |
| `disabled` | Checkout shows a purchase enquiry form instead. |

To start charging later: add the gateway keys to `.env` and let the sync push them, then set `"checkout_mode": "payments"` and `"payments_enabled": true`.

**No payment provider has been assumed to approve this business.** The integration is written for **Razorpay Payment Links**, a hosted checkout, because the proposed prices are in INR. Before enabling it, confirm all of the following:

- **(you)** The company's country of registration, and that Razorpay (or another provider) onboards that entity for **digital goods**.
- **(you)** Settlement currency, business verification (KYC), and any tax registration that applies.

If you use a different provider, implement the same contract in `supabase/functions/_shared/`: create a hosted checkout, then map verified webhook events to `paid | failed | cancelled | refunded | partially_refunded`. Everything else stays the same.

To enable it once you're approved:

```bash
npx supabase secrets set PAYMENT_PROVIDER=razorpay RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=...
```

1. In the Razorpay Dashboard → Webhooks, add `https://REF.supabase.co/functions/v1/payment-webhook` with the same secret. Select the events `payment_link.paid`, `payment_link.cancelled`, `payment_link.expired` and `refund.processed`.
2. Test the full flow in Razorpay **test mode** first.
3. Then set **Admin → Website settings → commerce** to `"payments_enabled": true`. This only changes what the site displays; the server still refuses checkout while the secrets are missing.

How a payment flows:

1. The browser sends **product IDs only**.
2. `create-order` requires a signed-in user with a verified email, rate-limits, and calls `create_order()`. That function prices the order from the database, validates any coupon, and rejects unavailable or already-owned products.
3. It then creates a hosted Payment Link and redirects the customer to it.
4. Razorpay calls `payment-webhook`, which verifies the HMAC-SHA256 signature of the raw body.
5. `process_payment_event()` records the event exactly once (unique provider event ID), checks that the amount and currency match the order, and only then marks the order paid and creates download entitlements.
6. The return page polls the **database**. It ignores the provider's redirect parameters, so it never shows a success the server hasn't confirmed.

**Order email (optional):** set `RESEND_API_KEY` and `EMAIL_FROM` (a verified sender) to send confirmations. Any HTTP email API can replace Resend in `_shared/email.ts`.

---

## Deploy to Vercel

1. Import the repository in Vercel. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
2. Environment variables (public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL=https://YOUR-DOMAIN`. **Never** add the service-role key or payment secrets to Vercel or any `VITE_` variable.
3. `vercel.json` handles SPA rewrites, security headers and immutable caching for assets.
4. Run `SITE_URL=https://YOUR-DOMAIN npm run sitemap` and commit the result, or run it in CI.
5. Update the Supabase Auth Site URL and redirect URLs, plus `SITE_URL` and `ALLOWED_ORIGINS` in the function secrets, to the production domain.

---

## Security model

- **RLS on every table**, with explicit grant revocations on top. Visitors read published catalogue data only. Customers read only their own profile, orders, entitlements, download events, support requests and cart.
- **Nobody can write orders, order items, payment events or entitlements through the API**, admins included. Those rows come only from service-role functions. Admins can view payment state and revoke or reinstate access (audited), but cannot mark an order paid.
- **Roles:** sign-up metadata is ignored. A trigger blocks role changes from API roles, and column grants allow customers to update only `full_name`.
- **Private files:** paid files live in a private bucket. Their paths are kept in the admin-only `product_files` table, not in the public `products` table. Downloads go through `authorize_download()`, which checks for a paid order, an active and unexpired entitlement and the download limit (15 by default), then counts and logs the download. Customers then get a 60-second signed URL.
- **Reviews:** only buyers with an active paid entitlement can submit, once per product, always as pending. Text is immutable and moderation is audited. Visitors see only approved reviews, with the reviewer's first name.
- **Abuse protection:** contact and newsletter forms go through `submit-form` (validation, honeypot, per-IP rate limit using a salted hash). Checkout and downloads are rate-limited per user, and support requests are capped at 5 per hour in the database.
- **Audit log:** changes to products, files, categories, coupons, settings, reviews, roles and entitlements are recorded with the acting user.
- **Secrets:** the browser only ever sees the anon key. Service-role and payment secrets live in Edge Function secrets, and provider error bodies are never relayed to clients.

---

## Tests and test report

Every result below comes from commands actually run on 28 October 2026 (Windows 11, Node 24.22, Chrome).

| Suite | Command | Result |
|---|---|---|
| Database security & business logic: all migrations executed in real Postgres (PGlite) with a Supabase role/auth/storage shim | `npx vitest run tests/db` | **40 passed** |
| Edge Function logic: Razorpay HMAC verification, event mapping, payment-link payloads, input validation, error mapping | `npx vitest run tests/unit/razorpay.test.ts tests/unit/validation.test.ts` | **18 passed** |
| Storefront logic: guest cart, cart merge, pricing display, discounts | `tests/unit/storefront-logic.test.ts` | **7 passed** |
| Product deliverables: every product packages completely; every "What's included" item exists in its ZIP | `tests/unit/products.test.ts` | **12 passed** |
| UI: every route renders (public, account, admin), access control, honest pricing, cart totals from server, disabled-payments state, return page ignores redirect params | `tests/ui/routes.test.tsx` | **52 passed** |
| **All automated tests** | `npm test` | **129 passed, 0 failed** |
| TypeScript | `npm run typecheck` | 0 errors |
| Production build | `npm run build` | succeeds |
| Real browser: 24 routes × 375/768/1280px. Checks no JS errors, an `<h1>` present and no horizontal overflow | `npm run test:browser` | **72/72 passed** |
| Product HTML | `npx html-validate "product-sources/**/*.html"` | 0 errors across 19 files |
| Product JS | `node --check` on every file | 30/30 pass |
| Spreadsheets | `npm run spreadsheets:build` | 1,821 assertions passed; 0 formula errors |

Database tests cover: role escalation; cross-customer reads; anonymous and customer writes to the catalogue, orders and enquiries; private file-path exposure; storage bucket access; server-side pricing and coupons; rejection of unavailable products, empty orders and already-owned products; customers and admins being unable to change payment state; failed and amount-mismatched payments creating no entitlements; duplicate webhooks being idempotent; late failures never downgrading a paid order; refunds revoking access; download limits; review eligibility and moderation; support rate limits; audit logging; and publish validation, including the requirement that the file exists in storage.

The browser test caught a real bug that jsdom couldn't: in current Chrome `window.scrollTo()` returns a Promise, and returning it from a React effect broke client-side redirects. It's fixed.

**Not tested here** (no credentials or services available):

- Edge Functions running on Supabase's Deno runtime against a live project. Their logic modules are unit-tested and the database functions they call are tested.
- Live Supabase Auth emails, a real Razorpay payment and webhook, Resend delivery, and signed-URL downloads from real Storage.
- Firefox, Safari and real mobile devices.
- The spreadsheets in Excel, LibreOffice or Google Sheets. Formulas were verified by automated recalculation only.

Run the Razorpay **test-mode** flow end to end before going live.

---

## What you need to supply

| Item | Where it goes |
|---|---|
| Supabase project (URL, anon key, service-role key) | `.env` / Vercel / `supabase link` |
| Verified company facts: legal name, country, registration number, registered office, support email, phone | Admin → Website settings → `company` |
| Payment-provider approval and keys (country and digital-goods eligibility first) | `supabase secrets set …`, then `commerce.payments_enabled` |
| Email sender (SMTP for auth; optionally Resend for order emails) | Supabase Auth settings / function secrets |
| Production domain | `VITE_SITE_URL`, `SITE_URL`, `ALLOWED_ORIGINS`, Auth URLs, `npm run sitemap` |
| Legal review of Terms, Privacy, Refund and Licence (jurisdiction, tax wording, retention periods, refund window) | `src/pages/legal/Legal.tsx`, `product-sources/LICENSE.txt` |
| Final prices: see the pricing note below | Admin → Products |

---

## Deviations from the brief and known limitations

- **`products.download_storage_path` lives in a separate admin-only `product_files` table.** Product rows are publicly readable, so keeping the path there would expose private storage paths to anyone.
- **Quantity is fixed at 1 per product.** Each purchase is one single-licensee licence, and the database enforces it. Team or multi-licence sales go through the contact page.
- **Product status adds `coming_soon`** (shown as "In development"). This lets the Website Starter Collection and the other products be visible but not purchasable until their files are uploaded.
- **Pricing note — please review.** The brief's proposed prices make the **Website Starter Collection (₹289, 4 kits)** cheaper than the **Small Business Website Bundle (₹399, 3 of the same kits)**. Both are seeded as proposed, and the bundle's FAQ points buyers to the collection. You'll probably want to change one of the prices or the bundle's contents before publishing.
- **Currency:** prices are INR. There is no automatic currency conversion, and orders cannot mix currencies.
- **Coupons:** fully supported by the database and checkout, but there is no admin coupon screen yet. Create coupons in the SQL editor or Table Editor (`public.coupons`).
- **Newsletter unsubscribe:** consent is stored, but there is no self-service unsubscribe link yet. Handle unsubscribes manually, or through your email platform if you sync subscribers to one.
- **Developer Portfolio Components demo:** browsers don't load ES modules from `file://`, so buyers must view the demo through a local web server. The product page and README both say so.
- **Spreadsheet sample data** is dated 2026 and labelled as sample data to delete.
