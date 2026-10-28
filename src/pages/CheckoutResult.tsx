import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { fetchOrderByNumber } from '@/lib/api';
import { formatPrice, paymentStatusLabel } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { EmptyState, PageLoader } from '@/components/ui';
import type { Order } from '@/lib/types';

const POLL_MS = 3000;
const MAX_POLLS = 20;

/**
 * Landing page after the hosted checkout. The status shown here is read from
 * our database, which only changes when the provider's signed webhook arrives —
 * query-string parameters added by the provider are never trusted.
 */
export function CheckoutReturn() {
  const [params] = useSearchParams();
  const orderNumber = params.get('order') ?? '';
  const { user, loading: authLoading } = useAuth();
  const { remove } = useCart();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [polls, setPolls] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cleared = useRef(false);

  useEffect(() => {
    if (authLoading || !user || !orderNumber) return;
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    const tick = async (n: number) => {
      try {
        const o = await fetchOrderByNumber(orderNumber);
        if (!active) return;
        setOrder(o);
        setPolls(n);
        if (o && o.payment_status === 'pending' && n < MAX_POLLS) timer = setTimeout(() => tick(n + 1), POLL_MS);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load your order.');
      }
    };
    void tick(1);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [orderNumber, user, authLoading]);

  useEffect(() => {
    if (order?.payment_status === 'paid' && !cleared.current) {
      cleared.current = true;
      order.order_items?.forEach((i) => void remove(i.product_id));
    }
  }, [order, remove]);

  if (authLoading) return <PageLoader />;
  if (!user) {
    return (
      <div className="container-site py-16">
        <EmptyState title="Sign in to see your order" action={<Link to={`/signin?next=${encodeURIComponent(`/checkout/return?order=${orderNumber}`)}`} className="btn-primary">Sign in</Link>} />
      </div>
    );
  }
  if (error) return <div className="container-site py-16"><EmptyState icon={XCircle} title="We could not load your order">{error}</EmptyState></div>;
  if (order === undefined) return <PageLoader label="Checking your payment…" />;
  if (order === null) {
    return <div className="container-site py-16"><EmptyState icon={XCircle} title="Order not found" action={<Link to="/account/orders" className="btn-secondary">View my orders</Link>}>We could not find that order in your account.</EmptyState></div>;
  }

  const status = order.payment_status;
  const noCharge = order.payment_provider === 'no_charge';
  return (
    <>
      <Seo title={status === 'paid' ? (noCharge ? 'Order complete' : 'Payment confirmed') : 'Order status'} noindex />
      <div className="container-site max-w-2xl py-16 text-center">
        {status === 'paid' ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-bold">{noCharge ? 'Order complete' : 'Payment confirmed'}</h1>
            <p className="mt-3 text-ink-muted">
              {noCharge ? (<>Thank you. Order <strong>{order.order_number}</strong> is complete and no payment was taken. Your files are ready in your account.</>) : (<>Thank you. Order <strong>{order.order_number}</strong> for {formatPrice(order.total, order.currency)} has been confirmed by the payment provider. Your files are ready in your account.</>)}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/account/downloads" className="btn-primary btn-lg">Go to my downloads</Link>
              <Link to={`/account/orders/${order.id}`} className="btn-secondary btn-lg">View order</Link>
            </div>
          </>
        ) : status === 'pending' ? (
          <>
            <Clock className="mx-auto h-14 w-14 text-amber-500" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-bold">{polls < MAX_POLLS ? 'Confirming your payment…' : 'Payment not confirmed yet'}</h1>
            <p className="mt-3 text-ink-muted" aria-live="polite">
              {polls < MAX_POLLS
                ? 'We are waiting for the payment provider to confirm order ' + order.order_number + '. This usually takes a few seconds.'
                : `We have not received confirmation for order ${order.order_number} yet. If you completed payment, it will appear in your account once confirmed — you do not need to pay again. If you did not complete payment, you can return to your cart.`}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/account/orders" className="btn-secondary">My orders</Link>
              <Link to="/cart" className="btn-secondary">Back to cart</Link>
            </div>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-14 w-14 text-red-500" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-bold">{paymentStatusLabel[status]}</h1>
            <p className="mt-3 text-ink-muted">Order {order.order_number} was not paid. No files have been released and you have not been charged by us for this order.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/cart" className="btn-primary">Return to cart</Link>
              <Link to="/support" className="btn-secondary">Get help</Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Shown when a customer abandons or cancels payment. */
export function CheckoutCancelled() {
  return (
    <>
      <Seo title="Payment not completed" noindex />
      <div className="container-site max-w-2xl py-16 text-center">
        <XCircle className="mx-auto h-14 w-14 text-red-500" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-bold">Payment not completed</h1>
        <p className="mt-3 text-ink-muted">Your payment was cancelled or did not go through. Your cart has been kept so you can try again. No files are released unless a payment is confirmed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/cart" className="btn-primary">Return to cart</Link>
          <Link to="/contact" className="btn-secondary">Contact us</Link>
        </div>
      </div>
    </>
  );
}
