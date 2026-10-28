import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, MailCheck, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { useAsync } from '@/lib/useAsync';
import { quoteOrder, startCheckout } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { Alert, EmptyState, ErrorState, PageHeader, PageLoader } from '@/components/ui';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { OrderSummary } from './Cart';

export default function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const { ids, couponCode } = useCart();
  const { settings } = useSettings();
  const { data: quote, loading, error, reload } = useAsync(() => quoteOrder(ids, couponCode), [ids.join(','), couponCode]);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const navigate = useNavigate();
  const mode = settings.commerce.checkout_mode;
  const paymentsOn = mode === 'payments' && settings.commerce.payments_enabled;

  if (authLoading || loading) return <PageLoader label="Preparing checkout…" />;

  if (ids.length === 0) {
    return (
      <div className="container-site py-16">
        <EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Link to="/products" className="btn-primary">Browse products</Link>} />
      </div>
    );
  }
  if (error) return <div className="container-site py-16"><ErrorState error={error} onRetry={reload} /></div>;
  if (!quote) return null;

  const pay = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const res = await startCheckout(ids, couponCode);
      if (res.completed) {
        // No-charge mode: the server completed the order and granted access.
        navigate(`/checkout/return?order=${encodeURIComponent(res.order_number)}`);
        return;
      }
      // Hand over to the provider's hosted checkout. The order is only marked
      // paid when the provider's signed webhook reaches our server.
      if (!res.checkout_url) throw new Error('Checkout could not be started.');
      window.location.assign(res.checkout_url);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Checkout could not be started.');
      setBusy(false);
    }
  };

  const enquiryMessage = `I would like to purchase:\n${quote.items.map((i) => `- ${i.title} (${formatPrice(i.unit_price, i.currency)})`).join('\n')}\n\nCart total: ${formatPrice(quote.total, quote.currency ?? 'USD')}`;

  return (
    <>
      <Seo title="Checkout" noindex />
      <PageHeader
        title="Checkout"
        description={mode === 'no_charge' ? 'Review your order and complete it to get instant access to your files.' : 'Review your order, then pay securely on our payment provider’s hosted checkout.'}
      />
      <div className="container-site grid items-start gap-8 py-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {quote.unavailable.length > 0 && (
            <Alert tone="warning" title="Your cart has unavailable items">
              Return to the <Link to="/cart" className="underline">cart</Link> to remove them before paying.
            </Alert>
          )}

          <section className="card p-6">
            <h2 className="text-base font-semibold">1. Your account</h2>
            {!user ? (
              <div className="mt-3 space-y-3 text-sm text-ink-muted">
                <p>Purchases are linked to your account so you can download your files at any time.</p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/signin?next=/checkout" className="btn-primary">Sign in</Link>
                  <Link to="/register?next=/checkout" className="btn-secondary">Create account</Link>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-sm">
                <p className="flex items-center gap-2 text-ink-muted"><MailCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Signed in as <strong className="text-navy-900">{user.email}</strong></p>
                {!user.email_confirmed_at && <Alert tone="warning">Please verify your email address (check your inbox) before paying.</Alert>}
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold">2. Items</h2>
            <ul className="mt-3 divide-y divide-slate-200 text-sm">
              {quote.items.map((i) => (
                <li key={i.product_id} className="flex justify-between gap-4 py-2.5">
                  <span>{i.title} <span className="text-ink-subtle">· single licence</span></span>
                  <span className="font-medium">{formatPrice(i.unit_price, i.currency)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold">3. {mode === 'no_charge' ? 'Complete your order' : 'Payment'}</h2>
            {mode === 'no_charge' ? (
              <div className="mt-4 space-y-4 text-sm">
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span className="text-ink-muted">
                    I agree to the <Link to="/terms" className="underline">Terms</Link> and the <Link to="/licence" className="underline">Digital Product Licence</Link>, and I request immediate access to the digital files. I acknowledge that I lose my right to cancel once they are made available.
                  </span>
                </label>
                {failure && <Alert tone="error">{failure}</Alert>}
                <button type="button" className="btn-accent btn-lg w-full" disabled={!user || !user.email_confirmed_at || !agreed || busy || quote.unavailable.length > 0 || quote.items.length === 0} onClick={pay}>
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" /> {busy ? 'Completing your order…' : 'Complete order'}
                </button>
                <p className="text-xs text-ink-subtle">No payment is taken at the moment. Your files appear in Account → Downloads as soon as you complete the order.</p>
              </div>
            ) : !paymentsOn ? (
              <div className="mt-4 space-y-5">
                <Alert tone="info" title="Online checkout is currently unavailable">
                  Send us a purchase enquiry and we will reply by email.
                </Alert>
                <EnquiryForm
                  submitLabel="Send purchase enquiry"
                  defaults={{ email: user?.email ?? '', subject: 'Purchase enquiry', message: enquiryMessage }}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span className="text-ink-muted">
                    I agree to the <Link to="/terms" className="underline">Terms</Link> and the <Link to="/licence" className="underline">Digital Product Licence</Link>, and I request immediate access to the digital files after payment. I acknowledge that I lose my right to cancel once they are made available, as explained in the <Link to="/refund-policy" className="underline">Refund & Cancellation Policy</Link>.
                  </span>
                </label>
                {failure && <Alert tone="error">{failure}</Alert>}
                <button type="button" className="btn-accent btn-lg w-full" disabled={!user || !user.email_confirmed_at || !agreed || busy || quote.unavailable.length > 0 || quote.items.length === 0} onClick={pay}>
                  <Lock className="h-4 w-4" aria-hidden="true" /> {busy ? 'Redirecting to secure payment…' : `Pay ${formatPrice(quote.total, quote.currency ?? 'USD')} securely`}
                </button>
                <p className="flex items-center gap-2 text-xs text-ink-subtle">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> You will be redirected to {settings.commerce.payment_provider_label ?? 'our payment provider'}. We never see or store your card details.
                </p>
              </div>
            )}
          </section>
        </div>
        <OrderSummary quote={quote}>
          <Link to="/cart" className="btn-secondary mt-5 w-full">Edit cart</Link>
        </OrderSummary>
      </div>
    </>
  );
}
