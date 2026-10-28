import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  Clock,
  CreditCard,
  Download,
  Expand,
  FileArchive,
  LifeBuoy,
  MessageSquare,
  RotateCcw,
  ScrollText,
  ShoppingBag,
} from 'lucide-react';
import { Seo } from '@/lib/seo';
import { useAsync } from '@/lib/useAsync';
import { canReview, fetchMyReview, fetchProduct, fetchRelated, fetchReviewSummary, fetchReviews, submitReview } from '@/lib/api';
import { mediaUrl } from '@/lib/media';
import { cx, formatDate } from '@/lib/format';
import { siteUrl } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { AddToCartButton, PriceTag, ProductCard } from '@/components/product/ProductCard';
import { Accordion } from '@/components/ui/Accordion';
import { Alert, Breadcrumbs, EmptyState, ErrorState, Modal, PageLoader, Stars } from '@/components/ui';
import type { Product } from '@/lib/types';
import NotFound from './NotFound';

const SECTIONS = [
  ['description', 'Description'],
  ['preview', 'Preview'],
  ['included', 'What’s included'],
  ['compatibility', 'Compatibility'],
  ['licence', 'Licence'],
  ['faq', 'FAQ'],
  ['reviews', 'Reviews'],
] as const;

function Gallery({ product }: { product: Product }) {
  const images = product.preview_images.length ? product.preview_images : [''];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  return (
    <div>
      <div className="card relative overflow-hidden">
        <img src={mediaUrl(images[active])} alt={`${product.title} — preview ${active + 1} of ${images.length}`} className="aspect-[4/3] w-full object-cover" width={1200} height={900} />
        <button type="button" onClick={() => setZoom(true)} className="btn absolute bottom-3 right-3 bg-white/95 text-navy-900 shadow-card hover:bg-white">
          <Expand className="h-4 w-4" aria-hidden="true" /> Enlarge
        </button>
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3" aria-label="Preview images">
          {images.map((img, i) => (
            <li key={img + i}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show preview ${i + 1}`}
                aria-pressed={i === active}
                className={cx('block w-full overflow-hidden rounded-lg ring-2 transition', i === active ? 'ring-brand-600' : 'ring-transparent hover:ring-slate-300')}
              >
                <img src={mediaUrl(img)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={zoom} onClose={() => setZoom(false)} title={`${product.title} — preview ${active + 1}`} size="xl">
        <img src={mediaUrl(images[active])} alt={`${product.title} enlarged preview`} className="w-full rounded-lg" />
        {images.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => setActive((active - 1 + images.length) % images.length)}>Previous</button>
            <button type="button" className="btn-secondary" onClick={() => setActive((active + 1) % images.length)}>Next</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Reviews({ product }: { product: Product }) {
  const { user } = useAuth();
  const list = useAsync(() => fetchReviews(product.id), [product.id]);
  const eligibility = useAsync(
    async () => (user ? { can: await canReview(product.id), mine: await fetchMyReview(product.id, user.id) } : null),
    [product.id, user?.id],
  );
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done' | 'error'; message?: string }>({ status: 'idle' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (text.trim().length < 10) {
      setState({ status: 'error', message: 'Please write at least 10 characters.' });
      return;
    }
    setState({ status: 'sending' });
    try {
      await submitReview(product.id, user.id, rating, text.trim());
      setState({ status: 'done' });
      eligibility.reload();
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Could not submit your review.' });
    }
  };

  return (
    <div className="space-y-6">
      {list.loading ? (
        <p className="text-sm text-ink-muted">Loading reviews…</p>
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.data?.length ? (
        <ul className="space-y-4">
          {list.data.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={r.rating} />
                <span className="text-sm font-semibold text-navy-900">{r.reviewer_name}</span>
                <span className="badge bg-emerald-50 text-emerald-700"><BadgeCheck className="h-3 w-3" aria-hidden="true" /> Verified customer</span>
                <span className="text-xs text-ink-subtle">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-muted">{r.review_text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={MessageSquare} title="No reviews yet">
          Only customers who have bought this product can leave a review. Reviews are checked before they are published.
        </EmptyState>
      )}

      {user && eligibility.data?.mine && (
        <Alert tone="info" title="Your review">
          Status: {String((eligibility.data.mine as { status: string }).status)}. Thank you for your feedback.
        </Alert>
      )}
      {state.status === 'done' && <Alert tone="success">Thanks — your review has been submitted and will appear once it has been checked.</Alert>}
      {user && eligibility.data?.can && !eligibility.data.mine && state.status !== 'done' && (
        <form onSubmit={submit} className="card space-y-4 p-5" noValidate>
          <h3 className="text-base font-semibold">Write a review</h3>
          <div>
            <label htmlFor="review-rating" className="label">Rating</label>
            <select id="review-rating" className="input w-auto" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="review-text" className="label">Your review</label>
            <textarea id="review-text" className="input min-h-28" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} aria-invalid={state.status === 'error'} />
            <p className="field-hint">Reviews are moderated under our review policy (see FAQs). Only your first name is shown.</p>
          </div>
          {state.status === 'error' && <p className="field-error">{state.message}</p>}
          <button className="btn-primary" type="submit" disabled={state.status === 'sending'}>
            {state.status === 'sending' ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      )}
      {!user && (
        <p className="text-sm text-ink-muted">
          Bought this product? <Link to={`/signin?next=/products/${product.slug}%23reviews`} className="font-medium text-brand-700 underline">Sign in</Link> to leave a review.
        </p>
      )}
    </div>
  );
}

function productJsonLd(p: Product, rating: { count: number; average: number | null } | undefined) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.seo_description ?? p.short_description ?? undefined,
    image: p.preview_images.map((i) => (i.startsWith('/') ? `${siteUrl}${i}` : mediaUrl(i))),
    sku: p.slug,
    brand: { '@type': 'Brand', name: 'CODEVANTASOLUTIONSLTD' },
    category: p.category_name ?? undefined,
  };
  // Offers only for products that can actually be bought right now.
  if (p.status === 'published') {
    data.offers = {
      '@type': 'Offer',
      price: p.price.toFixed(2),
      priceCurrency: p.currency,
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/products/${p.slug}`,
    };
  }
  if (rating && rating.count > 0 && rating.average) {
    data.aggregateRating = { '@type': 'AggregateRating', ratingValue: rating.average, reviewCount: rating.count };
  }
  return data;
}

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { add, has } = useCart();
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const { data: product, loading, error, reload } = useAsync(() => fetchProduct(slug), [slug]);
  const rating = useAsync(async () => (product ? fetchReviewSummary(product.id) : undefined), [product?.id]);
  const related = useAsync(async () => (product ? fetchRelated(product, 4) : []), [product?.id]);

  if (loading) return <PageLoader label="Loading product…" />;
  if (error) return <div className="container-site py-16"><ErrorState error={error} onRetry={reload} /></div>;
  if (!product || (product.status === 'draft' && !isAdmin)) return <NotFound />;

  const purchasable = product.status === 'published';
  const mode = settings.commerce.checkout_mode;
  const paymentsOn = mode === 'payments' && settings.commerce.payments_enabled;

  const buyNow = async () => {
    if (!has(product.id)) await add(product.id);
    navigate('/checkout');
  };

  return (
    <>
      <Seo
        title={product.seo_title ?? product.title}
        description={product.seo_description ?? product.short_description ?? undefined}
        image={product.preview_images[0]?.startsWith('/') ? product.preview_images[0] : undefined}
        type="product"
        noindex={product.status === 'archived'}
        jsonLd={productJsonLd(product, rating.data)}
      />
      <div className="container-site py-8 sm:py-10">
        {product.status === 'draft' && <Alert tone="warning" className="mb-6" title="Admin preview — draft">This product is hidden from visitors.</Alert>}
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Products', to: '/products' },
            ...(product.category_slug ? [{ label: product.category_name ?? 'Category', to: `/categories/${product.category_slug}` }] : []),
            { label: product.title },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
          <Gallery product={product} />

          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-700">{product.product_type}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{product.title}</h1>
            {product.subtitle && <p className="mt-3 text-lg text-ink-muted">{product.subtitle}</p>}

            {rating.data && rating.data.count > 0 && rating.data.average && (
              <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-navy-900">
                <Stars value={rating.data.average} /> {rating.data.average} · {rating.data.count} verified review{rating.data.count === 1 ? '' : 's'}
              </a>
            )}

            <div className="mt-6">
              <PriceTag price={product.price} originalPrice={product.original_price} currency={product.currency} size="lg" />
              <p className="mt-1 text-xs text-ink-subtle">Price shown in {product.currency}. Final amount is confirmed at checkout.</p>
            </div>

            <div className="mt-5 flex items-center gap-2 text-sm">
              {purchasable ? (
                <><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> <span className="font-medium text-emerald-700">Available — digital download</span></>
              ) : product.status === 'coming_soon' ? (
                <><Clock className="h-4 w-4 text-amber-600" aria-hidden="true" /> <span className="font-medium text-amber-800">In development — not yet available to buy</span></>
              ) : (
                <span className="font-medium text-ink-muted">No longer sold. Existing customers can still download it from their account.</span>
              )}
            </div>

            {purchasable && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <AddToCartButton product={product} className="btn-lg" full />
                <button type="button" className="btn-accent btn-lg w-full" onClick={buyNow}>
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Buy now
                </button>
              </div>
            )}
            {purchasable && !paymentsOn && mode !== 'no_charge' && (
              <Alert tone="warning" className="mt-4" title="Online payments not yet enabled">
                You can add this product to your cart, then send a purchase enquiry from checkout.
              </Alert>
            )}

            {product.highlights.length > 0 && (
              <ul className="mt-8 space-y-2.5">
                {product.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5 text-sm text-ink-muted">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" /> {h}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
              {[
                { icon: Download, title: 'Delivery', text: mode === 'no_charge' ? 'Digital download from your account as soon as your order is complete. Nothing is shipped.' : 'Digital download from your account after payment is confirmed. Nothing is shipped.' },
                { icon: CreditCard, title: 'Payment', text: mode === 'no_charge' ? 'No payment is taken at the moment — complete your order and get instant access.' : paymentsOn ? (settings.commerce.payment_methods_note ?? 'Secure hosted checkout by our payment provider.') : 'Online payments are not enabled yet — purchase enquiries are available.' },
                { icon: RotateCcw, title: 'Refunds', text: <>Digital goods: see conditions in our <Link to="/refund-policy" className="font-medium text-brand-700 underline">Refund & Cancellation Policy</Link>.</> },
                { icon: ScrollText, title: 'Licence', text: <>Single-licensee standard licence. <a href="#licence" className="font-medium text-brand-700 underline">Read terms</a>.</> },
                { icon: LifeBuoy, title: 'Support', text: product.support_info ?? 'Questions about the files are answered through your account’s support page.' },
              ].map((row) => (
                <div key={row.title} className="flex gap-3 p-4">
                  <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" aria-hidden="true" />
                  <p><span className="font-semibold text-navy-900">{row.title}: </span><span className="text-ink-muted">{row.text}</span></p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-subtle">Version {product.version} · Updated {formatDate(product.updated_at)}</p>
          </div>
        </div>

        {/* Section navigation */}
        <nav aria-label="Product sections" className="sticky top-16 z-20 -mx-4 mt-14 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:top-28">
          <ul className="flex gap-1">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-ink-muted hover:border-navy-300 hover:text-navy-900">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mx-auto max-w-4xl [&>section]:scroll-mt-40">
          <section id="description" className="pt-10">
            <h2 className="text-xl font-semibold">Description</h2>
            <div className="prose-site mt-4 whitespace-pre-line">{product.description}</div>
          </section>

          <section id="preview" className="pt-12">
            <h2 className="text-xl font-semibold">Preview</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {product.preview_images.map((img, i) => (
                <img key={img} src={mediaUrl(img)} alt={`${product.title} preview ${i + 1}`} loading="lazy" className="card w-full" width={1200} height={900} />
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-subtle">Previews are illustrations of the included layouts. Placeholder text and imagery in the files are meant to be replaced with your own.</p>
          </section>

          <section id="included" className="pt-12">
            <h2 className="text-xl font-semibold">What’s included</h2>
            <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
              {product.contents.map((c) => (
                <li key={c.name} className="flex gap-3 p-4 text-sm">
                  <FileArchive className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" aria-hidden="true" />
                  <span><code className="font-semibold text-navy-900">{c.name}</code>{c.description && <span className="text-ink-muted"> — {c.description}</span>}</span>
                </li>
              ))}
            </ul>
          </section>

          <section id="compatibility" className="pt-12">
            <h2 className="text-xl font-semibold">Compatibility & requirements</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold">Requirements</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
                  {product.technical_requirements.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold">Tested / compatible with</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
                  {product.compatibility.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section id="licence" className="pt-12">
            <h2 className="text-xl font-semibold">Licence</h2>
            <div className="mt-4 whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-ink-muted">{product.licence_text}</div>
            <p className="mt-3 text-sm"><Link to="/licence" className="font-medium text-brand-700 underline">Read the full Digital Product Licence</Link></p>
          </section>

          <section id="faq" className="pt-12">
            <h2 className="text-xl font-semibold">Frequently asked questions</h2>
            <div className="mt-4">
              {product.faq.length ? <Accordion items={product.faq.map((f) => ({ q: f.question, a: f.answer }))} /> : <p className="text-sm text-ink-muted">See our <Link to="/faqs" className="underline">general FAQs</Link>.</p>}
            </div>
          </section>

          <section id="reviews" className="pt-12">
            <h2 className="text-xl font-semibold">Reviews</h2>
            <div className="mt-4"><Reviews product={product} /></div>
          </section>
        </div>

        {related.data && related.data.length > 0 && (
          <section aria-labelledby="related-title" className="pt-20">
            <h2 id="related-title" className="text-2xl font-bold">Related products</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.data.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
