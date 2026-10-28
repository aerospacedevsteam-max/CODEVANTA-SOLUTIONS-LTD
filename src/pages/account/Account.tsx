import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { Download, FileText, LifeBuoy, Package, User } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { useAsync } from '@/lib/useAsync';
import {
  createSupportRequest,
  fetchMyEntitlements,
  fetchMyOrder,
  fetchMyOrders,
  fetchMySupportRequests,
  requestDownload,
  updateMyName,
} from '@/lib/api';
import { cx, formatDate, formatPrice, orderStatusLabel } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import { useAuth } from '@/context/AuthContext';
import { Alert, Breadcrumbs, EmptyState, ErrorState, Field, PageLoader, StatusBadge } from '@/components/ui';
import type { Entitlement } from '@/lib/types';

const nav = [
  { to: '/account', label: 'Overview', icon: User, end: true },
  { to: '/account/orders', label: 'Orders', icon: FileText },
  { to: '/account/downloads', label: 'Downloads', icon: Download },
  { to: '/account/support', label: 'Support', icon: LifeBuoy },
];

export function AccountLayout() {
  return (
    <div className="container-site py-10">
      <Seo title="My account" noindex />
      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Account" className="flex gap-1 overflow-x-auto lg:flex-col">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-navy-900 text-white' : 'text-navy-800 hover:bg-navy-50')}>
              <n.icon className="h-4 w-4" aria-hidden="true" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}

export function AccountOverview() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const orders = useAsync(fetchMyOrders, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setMsg({ ok: false, text: 'Enter at least 2 characters.' });
    try {
      await updateMyName(user!.id, name.trim());
      await refreshProfile();
      setMsg({ ok: true, text: 'Profile updated.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save.' });
    }
  };

  const paid = orders.data?.filter((o) => o.payment_status === 'paid').length ?? 0;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Hello{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h1>
        <p className="mt-1 text-sm text-ink-muted">{user?.email}{user?.email_confirmed_at ? ' · verified' : ' · email not verified yet'}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/account/orders" className="card p-5 hover:shadow-lift"><p className="text-sm text-ink-muted">Orders</p><p className="mt-1 text-2xl font-bold">{orders.data?.length ?? '—'}</p></Link>
        <Link to="/account/downloads" className="card p-5 hover:shadow-lift"><p className="text-sm text-ink-muted">Paid orders</p><p className="mt-1 text-2xl font-bold">{orders.loading ? '—' : paid}</p></Link>
        <Link to="/account/support" className="card p-5 hover:shadow-lift"><p className="text-sm text-ink-muted">Need help?</p><p className="mt-1 font-semibold text-brand-700">Open a request →</p></Link>
      </div>
      <form onSubmit={save} className="card max-w-lg space-y-4 p-6">
        <h2 className="text-base font-semibold">Profile</h2>
        {msg && <Alert tone={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}
        <Field label="Full name" htmlFor="acc-name">
          <input id="acc-name" className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="acc-email" hint="Contact support to change the email linked to your purchases.">
          <input id="acc-email" className="input" value={user?.email ?? ''} disabled />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" type="submit">Save</button>
          <Link to="/forgot-password" className="btn-secondary">Change password</Link>
        </div>
      </form>
    </div>
  );
}

export function AccountOrders() {
  const { data, loading, error, reload } = useAsync(fetchMyOrders, []);
  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Order history</h1>
      {!data?.length ? (
        <EmptyState icon={Package} title="No orders yet" action={<Link to="/products" className="btn-primary">Browse products</Link>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink-subtle">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3"><Link to={`/account/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">{o.order_number}</Link></td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-ink-muted">{o.order_items?.length ?? 0}</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(o.total, o.currency)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.payment_status} label={orderStatusLabel(o)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AccountOrderDetail() {
  const { id = '' } = useParams();
  const { data: o, loading, error, reload } = useAsync(() => fetchMyOrder(id), [id]);
  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!o) return <EmptyState title="Order not found">This order does not exist or belongs to another account.</EmptyState>;
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Orders', to: '/account/orders' }, { label: o.order_number }]} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Order {o.order_number}</h1>
        <StatusBadge status={o.payment_status} label={orderStatusLabel(o)} />
      </div>
      <p className="text-sm text-ink-muted">Placed {formatDate(o.created_at, { dateStyle: 'long', timeStyle: 'short' })}{o.paid_at && ` · paid ${formatDate(o.paid_at, { dateStyle: 'long', timeStyle: 'short' })}`}</p>
      <div className="card divide-y divide-slate-200">
        {o.order_items?.map((i) => (
          <div key={i.id} className="flex justify-between gap-4 p-4 text-sm"><span>{i.product_title_snapshot}</span><span className="font-medium">{formatPrice(i.unit_price, i.currency)}</span></div>
        ))}
        <dl className="space-y-1.5 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd>{formatPrice(o.subtotal, o.currency)}</dd></div>
          {Number(o.discount_amount) > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>−{formatPrice(o.discount_amount, o.currency)}</dd></div>}
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatPrice(o.total, o.currency)}</dd></div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-3">
        {o.payment_status === 'paid' && <Link to="/account/downloads" className="btn-primary">Download files</Link>}
        <Link to={`/account/support?order=${o.id}`} className="btn-secondary">Get help with this order</Link>
      </div>
    </div>
  );
}

function DownloadButton({ e }: { e: Entitlement }) {
  const [state, setState] = useState<{ busy: boolean; msg?: string; ok?: boolean }>({ busy: false });
  const remaining = e.download_limit - e.download_count;
  const usable = e.status === 'active' && remaining > 0 && (!e.expires_at || new Date(e.expires_at) > new Date());
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button
        type="button"
        className="btn-primary"
        disabled={!usable || state.busy}
        onClick={async () => {
          setState({ busy: true });
          try {
            const res = await requestDownload(e.product_id);
            window.location.assign(res.url); // short-lived signed URL
            setState({ busy: false, ok: true, msg: `Download started. ${res.downloads_remaining} remaining.` });
          } catch (err) {
            setState({ busy: false, msg: err instanceof Error ? err.message : 'Download failed.' });
          }
        }}
      >
        <Download className="h-4 w-4" aria-hidden="true" /> {state.busy ? 'Preparing…' : 'Download'}
      </button>
      <p className="text-xs text-ink-subtle">{e.status === 'active' ? `${remaining} of ${e.download_limit} downloads left` : `Access ${e.status}${e.revoked_reason ? ` — ${e.revoked_reason}` : ''}`}</p>
      {state.msg && <p role="status" className={cx('text-xs', state.ok ? 'text-emerald-700' : 'text-red-600')}>{state.msg}</p>}
    </div>
  );
}

export function AccountDownloads() {
  const { data, loading, error, reload } = useAsync(fetchMyEntitlements, []);
  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <h1 className="text-2xl font-bold">Purchased products & downloads</h1>
      <p className="mb-6 mt-1 text-sm text-ink-muted">Download links are created when you click and expire after 60 seconds. Always start downloads from this page.</p>
      {!data?.length ? (
        <EmptyState icon={Download} title="No downloads yet" action={<Link to="/products" className="btn-primary">Browse products</Link>}>
          Products appear here as soon as your payment is confirmed.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {data.map((e) => (
            <li key={e.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <img src={mediaUrl(e.product?.preview_images?.[0])} alt="" className="h-20 w-28 rounded-lg object-cover ring-1 ring-slate-200" loading="lazy" />
              <div className="flex-1">
                <p className="font-semibold text-navy-950">{e.product?.title ?? 'Product'}</p>
                <p className="text-xs text-ink-subtle">Version {e.product?.version ?? '—'} · purchased {formatDate(e.created_at)}{e.last_downloaded_at && ` · last downloaded ${formatDate(e.last_downloaded_at)}`}</p>
                <StatusBadge status={e.status} />
              </div>
              <DownloadButton e={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AccountSupport() {
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const list = useAsync(fetchMySupportRequests, []);
  const orders = useAsync(fetchMyOrders, []);
  const [form, setForm] = useState({ subject: '', message: '', order_id: params.get('order') ?? '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.subject.trim().length < 3 || form.message.trim().length < 10) {
      return setMsg({ ok: false, text: 'Please add a subject (3+ characters) and a message (10+ characters).' });
    }
    setBusy(true);
    try {
      await createSupportRequest(user!.id, { subject: form.subject.trim(), message: form.message.trim(), order_id: form.order_id || null });
      setForm({ subject: '', message: '', order_id: '' });
      setMsg({ ok: true, text: 'Your request has been submitted. We will reply here and by email.' });
      list.reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not submit your request.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Support requests</h1>
      <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
        <h2 className="text-base font-semibold">New request</h2>
        {msg && <Alert tone={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}
        <Field label="Related order (optional)" htmlFor="sr-order">
          <select id="sr-order" className="input" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })}>
            <option value="">No specific order</option>
            {orders.data?.map((o) => <option key={o.id} value={o.id}>{o.order_number} — {formatDate(o.created_at)}</option>)}
          </select>
        </Field>
        <Field label="Subject" htmlFor="sr-subject">
          <input id="sr-subject" className="input" maxLength={160} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </Field>
        <Field label="Message" htmlFor="sr-message">
          <textarea id="sr-message" rows={5} className="input" maxLength={5000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
      </form>

      {list.loading ? <PageLoader /> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : list.data?.length ? (
        <ul className="space-y-3">
          {list.data.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3"><p className="font-semibold">{r.subject}</p><StatusBadge status={r.status} /><span className="text-xs text-ink-subtle">{formatDate(r.created_at)}</span></div>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">{r.message}</p>
              {r.admin_reply && <div className="mt-3 rounded-lg bg-navy-50 p-3 text-sm"><p className="font-semibold text-navy-900">Reply from support</p><p className="mt-1 whitespace-pre-line text-ink-muted">{r.admin_reply}</p></div>}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-ink-muted">You have no support requests yet.</p>}
    </div>
  );
}
