import { Link } from 'react-router-dom';
import { useAsync } from '@/lib/useAsync';
import { fetchDashboardStats, fetchEnquiries, fetchRecentOrders } from '@/lib/adminApi';
import { formatDate, formatPrice, orderStatusLabel } from '@/lib/format';
import { ErrorState, PageLoader, StatusBadge } from '@/components/ui';
import { AdminTitle } from './AdminLayout';

export default function Dashboard() {
  const stats = useAsync(fetchDashboardStats, []);
  const orders = useAsync(() => fetchRecentOrders(8), []);
  const enquiries = useAsync(fetchEnquiries, []);

  if (stats.loading) return <PageLoader />;
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />;
  const s = stats.data!;
  const revenue = Object.entries(s.revenue);

  const tiles = [
    { label: 'Total products', value: s.products_total, to: '/admin/products' },
    { label: 'Published', value: s.products_published, to: '/admin/products?status=published' },
    { label: 'Drafts', value: s.products_draft, to: '/admin/products?status=draft' },
    { label: 'In development', value: s.products_coming_soon, to: '/admin/products?status=coming_soon' },
    { label: 'Orders (all states)', value: s.orders_total, to: '/admin/orders' },
    { label: 'Verified sales', value: s.orders_paid, to: '/admin/orders?status=paid' },
    { label: 'No-charge orders', value: s.orders_no_charge ?? 0, to: '/admin/orders?status=paid' },
    { label: 'Pending reviews', value: s.reviews_pending, to: '/admin/reviews' },
    { label: 'New enquiries / open tickets', value: `${s.enquiries_new} / ${s.support_open}`, to: '/admin/inbox' },
  ];

  return (
    <div className="space-y-8">
      <AdminTitle title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="card p-5 hover:shadow-lift">
            <p className="text-sm text-ink-muted">{t.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{t.value}</p>
          </Link>
        ))}
      </div>
      <div className="card p-5">
        <p className="text-sm text-ink-muted">Revenue from verified payments (paid and partially refunded orders, before refunds)</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {revenue.length ? revenue.map(([cur, amt]) => formatPrice(amt, cur)).join(' · ') : formatPrice(0, 'USD')}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Recent orders</h2><Link to="/admin/orders" className="text-sm text-brand-700">View all</Link></div>
          {orders.error ? <ErrorState error={orders.error} /> : !orders.data?.length ? <p className="text-sm text-ink-muted">No orders yet.</p> : (
            <ul className="divide-y divide-slate-200 text-sm">
              {orders.data.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link to={`/admin/orders/${o.id}`} className="font-medium text-brand-700">{o.order_number}</Link>
                  <span className="text-ink-subtle">{formatDate(o.created_at)}</span>
                  <span>{formatPrice(o.total, o.currency)}</span>
                  <StatusBadge status={o.payment_status} label={orderStatusLabel(o)} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Recent enquiries</h2><Link to="/admin/inbox" className="text-sm text-brand-700">Inbox</Link></div>
          {enquiries.error ? <ErrorState error={enquiries.error} /> : !enquiries.data?.length ? <p className="text-sm text-ink-muted">No enquiries yet.</p> : (
            <ul className="divide-y divide-slate-200 text-sm">
              {enquiries.data.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate font-medium">{e.subject}</span>
                  <span className="shrink-0 text-ink-subtle">{formatDate(e.created_at)}</span>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
