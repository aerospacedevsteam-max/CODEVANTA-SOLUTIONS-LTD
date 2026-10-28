import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { useAsync } from '@/lib/useAsync';
import { quoteOrder } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { Alert, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import type { Quote } from '@/lib/types';

export function OrderSummary({ quote, children }: { quote: Quote; children?: React.ReactNode }) {
  const currency = quote.currency ?? 'USD';
  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold">Order summary</h2>
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd className="font-medium">{formatPrice(quote.subtotal, currency)}</dd></div>
        {quote.discount > 0 && quote.coupon?.status === 'applied' && (
          <div className="flex justify-between text-emerald-700"><dt>Discount ({quote.coupon.code})</dt><dd>−{formatPrice(quote.discount, currency)}</dd></div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-bold text-navy-950">{formatPrice(quote.total, currency)}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-ink-subtle">Prices calculated by our server in {currency}. Any taxes are shown on the payment page if applicable.</p>
      {children}
    </div>
  );
}

const couponMessages: Record<string, string> = {
  invalid: 'That code is not valid.',
  expired: 'That code has expired or reached its limit.',
  not_applicable: 'That code cannot be used with this cart.',
};

export default function Cart() {
  const { ids, remove, couponCode, setCouponCode, syncError } = useCart();
  const { settings } = useSettings();
  const [codeInput, setCodeInput] = useState(couponCode);
  const { data: quote, loading, error, reload } = useAsync(() => quoteOrder(ids, couponCode), [ids.join(','), couponCode]);

  const unavailable = quote?.unavailable ?? [];

  return (
    <>
      <Seo title="Shopping cart" noindex />
      <PageHeader title="Shopping cart" />
      <div className="container-site py-10">
        {syncError && <Alert tone="warning" className="mb-6">{syncError}</Alert>}
        {ids.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Link to="/products" className="btn-primary">Continue shopping</Link>}>
            Browse the catalogue and add products to your cart.
          </EmptyState>
        ) : loading && !quote ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem]"><Skeleton className="h-64" /><Skeleton className="h-56" /></div>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : quote ? (
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-4">
              {unavailable.length > 0 && (
                <Alert tone="warning" title="Some items are no longer available">
                  <p>{unavailable.length} item{unavailable.length > 1 ? 's are' : ' is'} not currently for sale and will not be charged.</p>
                  <button type="button" className="mt-2 font-semibold underline" onClick={() => unavailable.forEach((id) => void remove(id))}>
                    Remove unavailable items
                  </button>
                </Alert>
              )}
              <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {quote.items.map((item) => (
                  <li key={item.product_id} className="flex gap-4 p-4">
                    <img src={mediaUrl(item.preview_image)} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" loading="lazy" />
                    <div className="flex flex-1 flex-col">
                      <Link to={`/products/${item.slug}`} className="font-semibold text-navy-950 hover:text-brand-700">{item.title}</Link>
                      <p className="text-xs text-ink-subtle">{item.product_type} · Single licence · Qty 1</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="font-semibold">{formatPrice(item.unit_price, item.currency)}</span>
                        <button type="button" onClick={() => remove(item.product_id)} className="btn-ghost btn-sm text-red-600 hover:bg-red-50" aria-label={`Remove ${item.title}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-subtle">
                Digital products are sold as one single-licensee licence each, so quantities are fixed at 1. For team or multi-licence needs, <Link to="/contact" className="underline">contact us</Link>.
              </p>
              <Link to="/products" className="btn-secondary">Continue shopping</Link>
            </div>

            <div className="space-y-4">
              <OrderSummary quote={quote}>
                <form
                  className="mt-5 border-t border-slate-200 pt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setCouponCode(codeInput.trim().toUpperCase());
                  }}
                >
                  <label htmlFor="coupon" className="label flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" aria-hidden="true" /> Coupon code</label>
                  <div className="flex gap-2">
                    <input id="coupon" className="input uppercase" value={codeInput} maxLength={32} onChange={(e) => setCodeInput(e.target.value)} />
                    <button type="submit" className="btn-secondary">Apply</button>
                  </div>
                  {quote.coupon && quote.coupon.status !== 'applied' && (
                    <p className="field-error flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> {couponMessages[quote.coupon.status]}</p>
                  )}
                  {quote.coupon?.status === 'applied' && (
                    <p className="mt-1.5 text-sm text-emerald-700">
                      Code applied. <button type="button" className="underline" onClick={() => { setCouponCode(''); setCodeInput(''); }}>Remove</button>
                    </p>
                  )}
                </form>
                <Link
                  to="/checkout"
                  className="btn-primary btn-lg mt-6 w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  aria-disabled={quote.items.length === 0}
                >
                  Proceed to checkout
                </Link>
                {settings.commerce.currencies.length > 1 && (
                  <p className="mt-3 text-xs text-ink-subtle">Each product is sold in its listed currency; currencies cannot be mixed in one order.</p>
                )}
              </OrderSummary>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
