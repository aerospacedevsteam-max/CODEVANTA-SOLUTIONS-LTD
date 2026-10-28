import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Download,
  FileCheck2,
  LifeBuoy,
  Lock,
  MousePointerClick,
  ScrollText,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Seo } from '@/lib/seo';
import { useAsync } from '@/lib/useAsync';
import { fetchBestsellers, fetchFeaturedProducts, fetchNewArrivals, fetchProduct, searchProducts } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import { HeroVisual } from '@/components/product/HeroVisual';
import { CategoryCard } from '@/components/product/CategoryCard';
import { AddToCartButton, PriceTag, ProductCard } from '@/components/product/ProductCard';
import { EmptyState, ErrorState, ProductCardSkeleton, Skeleton } from '@/components/ui';
import { Accordion } from '@/components/ui/Accordion';
import { NewsletterForm } from '@/components/forms/NewsletterForm';
import { faqs } from '@/lib/faq';
import { mediaUrl } from '@/lib/media';
import { cx } from '@/lib/format';
import type { ProductSummary } from '@/lib/types';

function Section({ id, eyebrow, title, intro, action, children, className }: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cx('py-14 sm:py-20', className)}>
      <div className="container-site">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>}
            <h2 id={id ? `${id}-title` : undefined} className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>
            {intro && <p className="mt-3 text-ink-muted">{intro}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function ProductRow({ state, empty }: { state: { data?: ProductSummary[]; loading: boolean; error: Error | null; reload: () => void }; empty: string }) {
  if (state.loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data?.length) return <EmptyState title="Nothing here yet">{empty}</EmptyState>;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {state.data.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

function FeaturedBundle({ slug }: { slug: string }) {
  const { data: product, loading } = useAsync(() => fetchProduct(slug), [slug]);
  if (loading) return <Skeleton className="h-80 w-full rounded-2xl" />;
  if (!product || product.status === 'draft' || product.status === 'archived') return null;
  const purchasable = product.status === 'published';
  return (
    <section aria-labelledby="bundle-title" className="py-14 sm:py-20">
      <div className="container-site">
        <div className="relative overflow-hidden rounded-3xl bg-navy-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,theme(colors.brand.600/.45),transparent_55%)]" aria-hidden="true" />
          <div className="relative grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">Featured collection</p>
              <h2 id="bundle-title" className="mt-2 text-3xl font-bold text-white sm:text-4xl">{product.title}</h2>
              <p className="mt-4 text-navy-200">{product.short_description}</p>
              {product.highlights.length > 0 && (
                <ul className="mt-6 grid gap-2.5 text-sm text-navy-100 sm:grid-cols-2">
                  {product.highlights.slice(0, 6).map((h) => (
                    <li key={h} className="flex gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <div className="[&_*]:!text-white">
                  <PriceTag price={product.price} originalPrice={product.original_price} currency={product.currency} size="lg" />
                </div>
                {!purchasable && <span className="badge bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/30">In development — not yet for sale</span>}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/products/${product.slug}`} className="btn bg-white text-navy-950 hover:bg-navy-100">
                  View collection <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                {purchasable && <AddToCartButton product={product} className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20" />}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
              <img src={mediaUrl(product.preview_images[0])} alt={`${product.title} preview`} className="w-full" loading="lazy" width={1200} height={900} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductsByCategory() {
  const { categories } = useSettings();
  const tabs = categories.slice(0, 5);
  const [active, setActive] = useState<string | null>(null);
  const current = active ?? tabs[0]?.slug ?? null;
  const state = useAsync(
    async () => (current ? (await searchProducts({ category: current, pageSize: 4 })).items : []),
    [current],
  );
  if (!tabs.length) return null;
  return (
    <Section id="by-category" eyebrow="Explore" title="Products by category" action={current && <Link to={`/categories/${current}`} className="btn-secondary">View category</Link>}>
      <div role="tablist" aria-label="Product categories" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1">
        {tabs.map((c) => (
          <button
            key={c.id}
            role="tab"
            type="button"
            aria-selected={c.slug === current}
            onClick={() => setActive(c.slug)}
            className={cx('whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition', c.slug === current ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white text-navy-800 ring-slate-300 hover:ring-navy-400')}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <ProductRow state={state} empty="No products in this category yet." />
      </div>
    </Section>
  );
}

const reasons = [
  { icon: FileCheck2, title: 'Original, checked files', text: 'Every product is created in-house and only goes on sale after its files are built and checked.' },
  { icon: ScrollText, title: 'Clear licence', text: 'A plain-English licence explains exactly how you can use each product, including client work.' },
  { icon: ShieldCheck, title: 'Secure checkout', text: 'Payments happen on the payment provider’s hosted page. We never see or store card details.' },
  { icon: LifeBuoy, title: 'Real support', text: 'Questions about your files go to a person. Raise a request from your account at any time.' },
];

const steps = [
  { icon: MousePointerClick, title: 'Choose your products', text: 'Browse the catalogue, read what’s included and add items to your cart.' },
  { icon: UserCheck, title: 'Sign in & check out', text: 'Sign in so your purchase is linked to your account, then pay on the secure hosted checkout.' },
  { icon: CreditCard, title: 'Payment confirmed', text: 'The payment provider confirms your payment directly with our server — usually within seconds.' },
  { icon: Download, title: 'Download any time', text: 'Your files appear in Account → Downloads, with secure links generated on request.' },
];

export default function Home() {
  const { settings, categories, loaded, error, reload } = useSettings();
  const featured = useAsync(() => fetchFeaturedProducts(4), []);
  const arrivals = useAsync(() => fetchNewArrivals(4), []);
  const bestsellers = useAsync(() => fetchBestsellers(4), []);
  const hp = settings.homepage;

  return (
    <>
      <Seo title={settings.seo.default_title} description={settings.seo.default_description} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-navy-50 via-white to-white">
        <div className="container-site grid items-center gap-16 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="badge bg-white text-navy-800 ring-1 ring-slate-200">
              <Lock className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Instant digital delivery to your account
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
              Digital Resources to Build <span className="text-brand-600">Better, Faster.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-muted">
              Explore practical digital products, website starter kits, UI resources, and business templates designed to help creators and businesses get started.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-primary btn-lg">
                Explore Products <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#categories" className="btn-secondary btn-lg">Browse Categories</a>
            </div>
          </div>
          <div className="pb-10 pt-6 lg:pl-8">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Categories */}
      <Section id="categories" eyebrow="Categories" title="Find the right starting point" intro="Each category opens a filtered catalogue so you can compare products side by side.">
        {!loaded ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : categories.length === 0 ? (
          <EmptyState title="Categories coming soon">Categories appear once the catalogue is connected.</EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => <CategoryCard key={c.id} category={c} />)}
          </div>
        )}
      </Section>

      {/* Featured */}
      <Section id="featured" eyebrow="Featured" title="Featured products" className="bg-slate-50/70" action={<Link to="/products" className="btn-secondary">All products</Link>}>
        <ProductRow state={featured} empty="Featured products will appear here." />
      </Section>

      {hp.show_featured_bundle && hp.featured_bundle_slug && <FeaturedBundle slug={hp.featured_bundle_slug} />}

      {hp.show_new_arrivals && (
        <Section id="new" eyebrow="Just added" title="New arrivals" action={<Link to="/products?sort=newest" className="btn-secondary">See newest</Link>}>
          <ProductRow state={arrivals} empty="New products will appear here once published." />
        </Section>
      )}

      {/* Bestsellers only render when real paid orders exist. */}
      {hp.show_bestsellers && !bestsellers.loading && !bestsellers.error && (bestsellers.data?.length ?? 0) > 0 && (
        <Section id="bestsellers" eyebrow="Popular" title="Bestselling products" intro="Ranked by completed orders." className="bg-slate-50/70">
          <ProductRow state={bestsellers} empty="" />
        </Section>
      )}

      <ProductsByCategory />

      {/* Why shop with us */}
      <Section id="why" eyebrow="Why shop with us" title="Built to be used, sold honestly" className="bg-slate-50/70">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r) => (
            <div key={r.title} className="card p-6">
              <r.icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">{r.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{r.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Delivery */}
      <Section id="delivery" eyebrow="Digital delivery" title="How digital delivery works">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-slate-200 p-6">
              <span className="text-xs font-bold text-brand-700">STEP {i + 1}</span>
              <s.icon className="mt-3 h-6 w-6 text-navy-800" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* FAQ */}
      <Section id="faq" eyebrow="FAQ" title="Frequently asked questions" className="bg-slate-50/70" action={<Link to="/faqs" className="btn-secondary">All FAQs</Link>}>
        <div className="max-w-3xl">
          <Accordion items={faqs.slice(0, 6)} />
        </div>
      </Section>

      {/* Support CTA + newsletter */}
      <section className="py-14 sm:py-20">
        <div className="container-site grid gap-6 lg:grid-cols-2">
          <div className="card flex flex-col justify-between gap-6 p-8">
            <div>
              <LifeBuoy className="h-7 w-7 text-brand-600" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-bold">Need help choosing?</h2>
              <p className="mt-2 text-ink-muted">Ask us about compatibility, licensing or what’s included before you buy.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="btn-primary">Contact us</Link>
              <Link to="/support" className="btn-secondary">Support centre</Link>
            </div>
          </div>
          {hp.show_newsletter && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold">Hear about new releases</h2>
              <p className="mb-5 mt-2 text-ink-muted">Occasional emails when new products and updates are published. No spam.</p>
              <NewsletterForm />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
