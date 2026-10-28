import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Lock } from 'lucide-react';
import { useAsync } from '@/lib/useAsync';
import {
  deleteReview,
  fetchAllCategories,
  fetchAuditLog,
  fetchCustomerOrders,
  fetchEnquiries,
  fetchOrderAdmin,
  fetchOrders,
  fetchReviewsAdmin,
  fetchSupportAdmin,
  moderateReview,
  reorderCategories,
  replySupport,
  saveCategory,
  saveSetting,
  searchCustomers,
  setEnquiryStatus,
  updateEntitlement,
} from '@/lib/adminApi';
import { cx, formatDate, formatPrice, orderStatusLabel, paymentStatusLabel, slugify } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Alert, EmptyState, ErrorState, Field, PageLoader, Stars, StatusBadge } from '@/components/ui';
import type { Category, EnquiryStatus, ReviewStatus, TicketStatus } from '@/lib/types';
import type { SiteSettings } from '@/lib/settings';
import { AdminTitle } from './AdminLayout';
import { categoryIcons } from '@/components/product/CategoryCard';

function useFlash() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Action failed.' });
      return false;
    }
  };
  const node = msg && <Alert tone={msg.ok ? 'success' : 'error'} className="mb-4">{msg.text}</Alert>;
  return { run, node };
}

// ---------------------------------------------------------------------------
export function AdminCategories() {
  const { data, loading, error, reload } = useAsync(fetchAllCategories, []);
  const { reload: reloadSite } = useSettings();
  const { run, node } = useFlash();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const list = data ?? [];

  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    void run(() => reorderCategories(next), 'Order saved.').then(() => { reload(); reloadSite(); });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { id, ...rest } = editing;
    void run(() => saveCategory(id ?? null, { name: rest.name, slug: rest.slug, description: rest.description || null, icon: rest.icon || null, is_published: rest.is_published ?? true, display_order: rest.display_order ?? (list.length + 1) * 10 }), 'Category saved.').then((ok) => {
      if (ok) { setEditing(null); reload(); reloadSite(); }
    });
  };

  return (
    <div>
      <AdminTitle title="Categories"><button type="button" className="btn-primary" onClick={() => setEditing({ is_published: true })}>New category</button></AdminTitle>
      {node}
      {editing && (
        <form onSubmit={submit} className="card mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="c-name"><input id="c-name" className="input" required value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} /></Field>
          <Field label="Slug" htmlFor="c-slug"><input id="c-slug" className="input" required value={editing.slug ?? ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
          <Field label="Description" htmlFor="c-desc"><input id="c-desc" className="input" maxLength={400} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
          <Field label="Icon" htmlFor="c-icon">
            <select id="c-icon" className="input" value={editing.icon ?? ''} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}>
              <option value="">Default</option>
              {Object.keys(categoryIcons).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_published ?? true} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked, archived_at: e.target.checked ? null : new Date().toISOString() })} /> Visible on the website (untick to archive)</label>
          <div className="flex gap-2 sm:col-span-2"><button className="btn-primary" type="submit">Save</button><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button></div>
        </form>
      )}
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {list.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex flex-col">
              <button type="button" className="btn-ghost p-1" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${c.name} up`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" className="btn-ghost p-1" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${c.name} down`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="flex-1"><p className="font-semibold">{c.name}</p><p className="text-xs text-ink-subtle">/{c.slug}</p></div>
            <StatusBadge status={c.is_published ? 'published' : 'archived'} label={c.is_published ? 'visible' : 'archived'} />
            <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(c)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const { data, loading, error, reload } = useAsync(() => fetchOrders(status || undefined), [status]);
  return (
    <div>
      <AdminTitle title="Orders" />
      <Alert tone="info" className="mb-4">Payment status is set only by verified payment-provider webhooks and cannot be edited here.</Alert>
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded'].map((s) => (
          <button key={s} type="button" onClick={() => setParams(s ? { status: s } : {})} className={cx('rounded-full px-3 py-1 text-sm ring-1 ring-inset', status === s ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white ring-slate-300')}>
            {s ? paymentStatusLabel[s] : 'All'}
          </button>
        ))}
      </div>
      {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !data?.length ? <EmptyState title="No orders" /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink-subtle"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Payment</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3"><Link to={`/admin/orders/${o.id}`} className="font-semibold text-brand-700">{o.order_number}</Link></td>
                  <td className="px-4 py-3 text-ink-muted">{o.customer_email ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-subtle">{formatDate(o.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-4 py-3">{formatPrice(o.total, o.currency)}</td>
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

export function AdminOrderDetail() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useAsync(() => fetchOrderAdmin(id), [id]);
  const { run, node } = useFlash();
  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Order not found" />;
  const { order: o, events, downloads } = data;
  return (
    <div className="space-y-6">
      <AdminTitle title={`Order ${o.order_number}`}><StatusBadge status={o.payment_status} label={orderStatusLabel(o)} /></AdminTitle>
      {node}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 text-sm">
          <h2 className="mb-3 text-base font-semibold">Summary</h2>
          <dl className="grid grid-cols-[9rem_1fr] gap-y-1.5">
            <dt className="text-ink-subtle">Customer</dt><dd>{o.customer_email ?? 'Deleted account'}</dd>
            <dt className="text-ink-subtle">Created</dt><dd>{formatDate(o.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
            <dt className="text-ink-subtle">Paid</dt><dd>{o.paid_at ? formatDate(o.paid_at, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</dd>
            <dt className="text-ink-subtle">Refunded</dt><dd>{o.refunded_at ? formatDate(o.refunded_at) : '—'}</dd>
            <dt className="text-ink-subtle">Provider</dt><dd>{o.payment_provider ?? '—'} {o.provider_order_id && <code className="text-xs">{o.provider_order_id}</code>}</dd>
            <dt className="text-ink-subtle">Subtotal</dt><dd>{formatPrice(o.subtotal, o.currency)}</dd>
            <dt className="text-ink-subtle">Discount</dt><dd>{formatPrice(o.discount_amount, o.currency)}</dd>
            <dt className="font-semibold">Total</dt><dd className="font-semibold">{formatPrice(o.total, o.currency)}</dd>
          </dl>
          <ul className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
            {o.order_items?.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.product_title_snapshot}</span><span>{formatPrice(i.unit_price, i.currency)}</span></li>)}
          </ul>
        </section>
        <section className="card p-5 text-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Lock className="h-4 w-4" aria-hidden="true" /> Payment events (read-only)</h2>
          {!events.length ? <p className="text-ink-muted">No provider events received.</p> : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium">{e.event_type} <StatusBadge status={e.verification_status === 'verified' ? 'paid' : 'failed'} label={e.verification_status} /></p>
                  <p className="text-xs text-ink-subtle">{formatDate(e.created_at, { dateStyle: 'medium', timeStyle: 'medium' })} · {e.amount != null ? formatPrice(e.amount, e.currency ?? o.currency) : '—'} · <code>{e.provider_event_id}</code></p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-subtle">Refunds are issued in the payment provider’s dashboard; the refund webhook then updates this order and revokes access automatically.</p>
        </section>
      </div>
      <section className="card p-5 text-sm">
        <h2 className="mb-3 text-base font-semibold">Download entitlements</h2>
        {!downloads.length ? <p className="text-ink-muted">None — entitlements are created only after a verified payment.</p> : (
          <ul className="divide-y divide-slate-200">
            {downloads.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex-1 font-medium">{d.product?.title}</span>
                <span className="text-ink-subtle">{d.download_count}/{d.download_limit} downloads</span>
                <StatusBadge status={d.status} />
                {d.status === 'active' ? (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => {
                    const reason = window.prompt('Reason for revoking access (shown to the customer):');
                    if (reason) void run(() => updateEntitlement(d.id, 'revoked', reason), 'Access revoked.').then(reload);
                  }}>Revoke</button>
                ) : (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => void run(() => updateEntitlement(d.id, 'active'), 'Access reinstated.').then(reload)}>Reinstate</button>
                )}
                <button type="button" className="btn-ghost btn-sm" onClick={() => void run(() => updateEntitlement(d.id, d.status as 'active' | 'revoked', undefined, d.download_limit + 5), 'Limit increased by 5.').then(reload)}>+5 downloads</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function AdminCustomers() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const list = useAsync(() => searchCustomers(query), [query]);
  const orders = useAsync(async () => (selected ? fetchCustomerOrders(selected) : []), [selected]);
  return (
    <div>
      <AdminTitle title="Customers" />
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }} className="mb-4 flex gap-2">
        <label htmlFor="cust-q" className="sr-only">Search by email or name</label>
        <input id="cust-q" className="input max-w-sm" placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" type="submit">Search</button>
      </form>
      {list.loading ? <PageLoader /> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data?.length ? <EmptyState title="No customers found" /> : (
        <div className="grid gap-6 xl:grid-cols-2">
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white text-sm">
            {list.data.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelected(c.id)} className={cx('flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50', selected === c.id && 'bg-navy-50')}>
                  <span><span className="block font-medium">{c.full_name ?? '—'}</span><span className="text-ink-subtle">{c.email}</span></span>
                  <span className="text-xs text-ink-subtle">{c.paid_orders} paid · joined {formatDate(c.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="card p-5 text-sm">
            <h2 className="mb-3 text-base font-semibold">Orders</h2>
            {!selected ? <p className="text-ink-muted">Select a customer.</p> : orders.loading ? <PageLoader /> : !orders.data?.length ? <p className="text-ink-muted">No orders.</p> : (
              <ul className="divide-y divide-slate-200">
                {orders.data.map((o) => <li key={o.id} className="flex justify-between py-2"><Link to={`/admin/orders/${o.id}`} className="text-brand-700">{o.order_number}</Link><span>{formatPrice(o.total, o.currency)}</span><StatusBadge status={o.payment_status} /></li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function AdminReviews() {
  const [status, setStatus] = useState<ReviewStatus | 'all'>('pending');
  const { data, loading, error, reload } = useAsync(() => fetchReviewsAdmin(status), [status]);
  const { run, node } = useFlash();
  return (
    <div>
      <AdminTitle title="Reviews" />
      <Alert tone="info" className="mb-4">
        Moderation policy: approve genuine reviews whether positive or negative. Reject reviews containing personal data, offensive or unlawful content, spam, or content unrelated to the product. Review text cannot be edited.
      </Alert>
      {node}
      <div className="mb-4 flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={cx('rounded-full px-3 py-1 text-sm ring-1 ring-inset', status === s ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white ring-slate-300')}>{s}</button>
        ))}
      </div>
      {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !data?.length ? <EmptyState title="No reviews here" /> : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="card p-5 text-sm">
              <div className="flex flex-wrap items-center gap-3"><Stars value={r.rating} /><span className="font-medium">{r.product?.title}</span><StatusBadge status={r.status} /><span className="text-xs text-ink-subtle">{formatDate(r.created_at)}</span></div>
              <p className="mt-2 whitespace-pre-line text-ink-muted">{r.review_text}</p>
              {r.moderation_note && <p className="mt-2 text-xs text-ink-subtle">Note: {r.moderation_note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== 'approved' && <button type="button" className="btn-primary btn-sm" onClick={() => void run(() => moderateReview(r.id, 'approved', null), 'Review approved.').then(reload)}>Approve</button>}
                {r.status !== 'rejected' && <button type="button" className="btn-secondary btn-sm" onClick={() => { const note = window.prompt('Reason for rejection (internal):') ?? ''; void run(() => moderateReview(r.id, 'rejected', note || null), 'Review rejected.').then(reload); }}>Reject</button>}
                <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => window.confirm('Permanently remove this review?') && void run(() => deleteReview(r.id), 'Review removed.').then(reload)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function AdminInbox() {
  const enquiries = useAsync(fetchEnquiries, []);
  const tickets = useAsync(fetchSupportAdmin, []);
  const { run, node } = useFlash();
  const [replies, setReplies] = useState<Record<string, string>>({});
  return (
    <div className="space-y-10">
      <AdminTitle title="Enquiries & support" />
      {node}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Support requests</h2>
        {tickets.loading ? <PageLoader /> : tickets.error ? <ErrorState error={tickets.error} /> : !tickets.data?.length ? <p className="text-sm text-ink-muted">No support requests.</p> : (
          <ul className="space-y-3">
            {tickets.data.map((t) => (
              <li key={t.id} className="card p-5 text-sm">
                <div className="flex flex-wrap items-center gap-3"><span className="font-semibold">{t.subject}</span><StatusBadge status={t.status} /><span className="text-xs text-ink-subtle">{formatDate(t.created_at)}</span>{t.order_id && <Link to={`/admin/orders/${t.order_id}`} className="text-xs text-brand-700">View order</Link>}</div>
                <p className="mt-2 whitespace-pre-line text-ink-muted">{t.message}</p>
                <label htmlFor={`reply-${t.id}`} className="label mt-3">Reply (visible to the customer)</label>
                <textarea id={`reply-${t.id}`} rows={3} className="input" defaultValue={t.admin_reply ?? ''} onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['in_progress', 'resolved', 'closed'] as TicketStatus[]).map((s) => (
                    <button key={s} type="button" className="btn-secondary btn-sm" onClick={() => void run(() => replySupport(t.id, s, (replies[t.id] ?? t.admin_reply ?? '') || null), 'Request updated.').then(tickets.reload)}>Save as {s.replace('_', ' ')}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Contact enquiries</h2>
        {enquiries.loading ? <PageLoader /> : enquiries.error ? <ErrorState error={enquiries.error} /> : !enquiries.data?.length ? <p className="text-sm text-ink-muted">No enquiries.</p> : (
          <ul className="space-y-3">
            {enquiries.data.map((e) => (
              <li key={e.id} className="card p-5 text-sm">
                <div className="flex flex-wrap items-center gap-3"><span className="font-semibold">{e.subject}</span><StatusBadge status={e.status} /><span className="text-xs text-ink-subtle">{formatDate(e.created_at)}</span></div>
                <p className="text-ink-subtle">{e.full_name} · <a className="underline" href={`mailto:${e.email}`}>{e.email}</a></p>
                <p className="mt-2 whitespace-pre-line text-ink-muted">{e.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['in_progress', 'closed', 'spam'] as EnquiryStatus[]).map((s) => (
                    <button key={s} type="button" className="btn-secondary btn-sm" onClick={() => void run(() => setEnquiryStatus(e.id, s), 'Enquiry updated.').then(enquiries.reload)}>Mark {s.replace('_', ' ')}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
type JsonKey = keyof SiteSettings;
const SETTING_HELP: Record<JsonKey, string> = {
  announcement: 'Announcement bar. Set "enabled": false to hide it.',
  company: 'Verified company details only. Leave null until confirmed — pages show placeholders.',
  social: 'Social links shown in the footer: { "links": [{ "label": "...", "href": "https://..." }] }',
  homepage: 'Toggle homepage sections and choose the featured bundle slug.',
  footer: 'Extra footer links: { "links": [{ "label": "...", "href": "..." }] }',
  seo: 'Default homepage title and meta description.',
  commerce: 'Currencies and payment display. "payments_enabled" only changes what the site shows — the server still refuses payments until provider secrets are configured.',
};

export function AdminSettings() {
  const { settings, reload } = useSettings();
  const { user } = useAuth();
  const { run, node } = useFlash();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const audit = useAsync(() => fetchAuditLog(30), []);

  useEffect(() => {
    setDrafts(Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, JSON.stringify(v, null, 2)])));
  }, [settings]);

  const save = (key: JsonKey) => {
    let value: unknown;
    try {
      value = JSON.parse(drafts[key]);
    } catch {
      void run(() => Promise.reject(new Error(`“${key}” is not valid JSON.`)), '');
      return;
    }
    void run(() => saveSetting(key, value, user!.id), `Saved “${key}”.`).then((ok) => ok && reload());
  };

  return (
    <div className="space-y-6">
      <AdminTitle title="Website settings" />
      {node}
      <div className="grid gap-6 xl:grid-cols-2">
        {(Object.keys(SETTING_HELP) as JsonKey[]).map((key) => (
          <section key={key} className="card p-5">
            <h2 className="text-base font-semibold capitalize">{key}</h2>
            <p className="mt-1 text-xs text-ink-subtle">{SETTING_HELP[key]}</p>
            <label htmlFor={`set-${key}`} className="sr-only">{key} JSON</label>
            <textarea id={`set-${key}`} rows={10} spellCheck={false} className="input mt-3 font-mono text-xs" value={drafts[key] ?? ''} onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })} />
            <button type="button" className="btn-primary mt-3" onClick={() => save(key)}>Save {key}</button>
          </section>
        ))}
      </div>
      <section className="card p-5">
        <h2 className="text-base font-semibold">Recent admin activity (audit log)</h2>
        {audit.loading ? <PageLoader /> : audit.error ? <ErrorState error={audit.error} /> : (
          <ul className="mt-3 divide-y divide-slate-200 text-sm">
            {audit.data?.map((a) => <li key={a.id} className="flex flex-wrap gap-3 py-2"><span className="text-ink-subtle">{formatDate(a.created_at, { dateStyle: 'short', timeStyle: 'short' })}</span><span className="font-medium">{a.action}</span><span>{a.entity_type}</span><code className="text-xs text-ink-subtle">{a.entity_id}</code></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
