import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, ExternalLink, Plus, Upload } from 'lucide-react';
import { useAsync } from '@/lib/useAsync';
import {
  fetchAllCategories,
  fetchAllProducts,
  fetchProductAdmin,
  saveProduct,
  setProductStatus,
  setSecondaryCategories,
  uploadPreviewImage,
  uploadProductFile,
  type ProductInput,
} from '@/lib/adminApi';
import { cx, formatBytes, formatDate, formatPrice, slugify } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import { useAuth } from '@/context/AuthContext';
import { Alert, EmptyState, ErrorState, Field, PageLoader, StatusBadge } from '@/components/ui';
import type { ContentItem, FaqItem, Product, ProductStatus } from '@/lib/types';
import { AdminTitle } from './AdminLayout';

export function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const { data, loading, error, reload } = useAsync(fetchAllProducts, []);
  const rows = (data ?? []).filter((p) => !status || p.status === status);
  return (
    <div>
      <AdminTitle title="Products">
        <Link to="/admin/products/new" className="btn-primary"><Plus className="h-4 w-4" aria-hidden="true" /> New product</Link>
      </AdminTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'published', 'coming_soon', 'draft', 'archived'].map((s) => (
          <button key={s} type="button" onClick={() => setParams(s ? { status: s } : {})} className={cx('rounded-full px-3 py-1 text-sm ring-1 ring-inset', status === s ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white ring-slate-300')}>
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>
      {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? <EmptyState title="No products" /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-ink-subtle">
              <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">File</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3"><Link to={`/admin/products/${p.id}`} className="font-semibold text-brand-700 hover:underline">{p.title}</Link><p className="text-xs text-ink-subtle">/{p.slug}</p></td>
                  <td className="px-4 py-3 text-ink-muted">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3">{formatPrice(p.price, p.currency)}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.file ? `${p.file.file_name} (${formatBytes(p.file.size_bytes)})` : <span className="text-amber-700">No file</span>}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-ink-subtle">{formatDate(p.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

function toForm(p?: Product | null) {
  return {
    title: p?.title ?? '',
    slug: p?.slug ?? '',
    subtitle: p?.subtitle ?? '',
    short_description: p?.short_description ?? '',
    description: p?.description ?? '',
    product_type: p?.product_type ?? 'Template kit',
    price: p ? String(p.price) : '',
    original_price: p?.original_price != null ? String(p.original_price) : '',
    currency: p?.currency ?? 'USD',
    category_id: p?.category_id ?? '',
    version: p?.version ?? '1.0.0',
    is_featured: p?.is_featured ?? false,
    highlights: (p?.highlights ?? []).join('\n'),
    technical_requirements: (p?.technical_requirements ?? []).join('\n'),
    compatibility: (p?.compatibility ?? []).join('\n'),
    preview_images: (p?.preview_images ?? []).join('\n'),
    contents: (p?.contents ?? []).map((c) => (c.description ? `${c.name} | ${c.description}` : c.name)).join('\n'),
    faq: (p?.faq ?? []).map((f) => `${f.question} | ${f.answer}`).join('\n'),
    licence_text: p?.licence_text ?? '',
    support_info: p?.support_info ?? '',
    seo_title: p?.seo_title ?? '',
    seo_description: p?.seo_description ?? '',
  };
}
type FormState = ReturnType<typeof toForm>;

function toInput(f: FormState): Partial<ProductInput> {
  const pairs = (s: string) => lines(s).map((l) => l.split('|').map((x) => x.trim()));
  return {
    title: f.title.trim(),
    slug: f.slug.trim(),
    subtitle: f.subtitle.trim() || null,
    short_description: f.short_description.trim() || null,
    description: f.description.trim() || null,
    product_type: f.product_type.trim() || 'Template kit',
    price: Number(f.price),
    original_price: f.original_price ? Number(f.original_price) : null,
    currency: f.currency.trim().toUpperCase(),
    category_id: f.category_id || null,
    version: f.version.trim() || '1.0.0',
    is_featured: f.is_featured,
    highlights: lines(f.highlights),
    technical_requirements: lines(f.technical_requirements),
    compatibility: lines(f.compatibility),
    preview_images: lines(f.preview_images),
    contents: pairs(f.contents).map(([name, description]) => ({ name, ...(description ? { description } : {}) })) as ContentItem[],
    faq: pairs(f.faq).filter((p) => p[1]).map(([question, answer]) => ({ question, answer })) as FaqItem[],
    licence_text: f.licence_text.trim() || null,
    support_info: f.support_info.trim() || null,
    seo_title: f.seo_title.trim() || null,
    seo_description: f.seo_description.trim() || null,
  };
}

/** Mirrors the database publication rules so admins see what is missing. */
function publishChecklist(f: FormState, hasFile: boolean) {
  return [
    ['Short description (20+ characters)', f.short_description.trim().length >= 20],
    ['Description (120+ characters)', f.description.trim().length >= 120],
    ['Category', Boolean(f.category_id)],
    ['Price greater than zero', Number(f.price) > 0],
    ['At least one preview image', lines(f.preview_images).length > 0],
    ['Contents list', lines(f.contents).length > 0],
    ['Licence text', f.licence_text.trim().length >= 50],
    ['Downloadable file uploaded', hasFile],
  ] as const;
}

export function AdminProductEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
  const cats = useAsync(fetchAllCategories, []);
  const existing = useAsync(async () => (isNew ? null : fetchProductAdmin(id!)), [id]);
  const [f, setF] = useState<FormState>(toForm());
  const [secondary, setSecondary] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing.data) {
      setF(toForm(existing.data.product));
      setSecondary(existing.data.secondaryCategoryIds);
    }
  }, [existing.data]);

  if (existing.loading || cats.loading) return <PageLoader />;
  if (existing.error) return <ErrorState error={existing.error} onRetry={existing.reload} />;
  if (!isNew && !existing.data) return <EmptyState title="Product not found" />;

  const product = existing.data?.product ?? null;
  const file = product?.file ?? null;
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const run = async (fn: () => Promise<void>, success: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: success });
      existing.reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Action failed.' });
    } finally {
      setBusy(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.slug.trim() || !(Number(f.price) >= 0) || f.price === '') {
      setMsg({ ok: false, text: 'Title, slug and price are required.' });
      return;
    }
    void run(async () => {
      const newId = await saveProduct(isNew ? null : id!, toInput(f));
      await setSecondaryCategories(newId, secondary.filter((c) => c !== f.category_id));
      if (isNew) navigate(`/admin/products/${newId}`, { replace: true });
    }, 'Product saved.');
  };

  const changeStatus = (s: ProductStatus, label: string) =>
    run(async () => {
      await saveProduct(id!, toInput(f));
      await setProductStatus(id!, s);
    }, label);

  const checklist = publishChecklist(f, Boolean(file));

  return (
    <div>
      <AdminTitle title={isNew ? 'New product' : f.title || 'Edit product'}>
        {product && (
          <div className="flex items-center gap-2">
            <StatusBadge status={product.status} />
            <Link to={`/products/${product.slug}`} target="_blank" className="btn-secondary btn-sm"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Preview page</Link>
          </div>
        )}
      </AdminTitle>
      {msg && <Alert tone={msg.ok ? 'success' : 'error'} className="mb-6">{msg.text}</Alert>}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_20rem]">
        <form onSubmit={save} className="card space-y-5 p-6" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" htmlFor="p-title"><input id="p-title" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value, slug: isNew && (!f.slug || f.slug === slugify(f.title)) ? slugify(e.target.value) : f.slug })} /></Field>
            <Field label="Slug" htmlFor="p-slug" hint="Lowercase letters, numbers and hyphens."><input id="p-slug" className="input" value={f.slug} onChange={set('slug')} /></Field>
          </div>
          <Field label="Subtitle" htmlFor="p-sub"><input id="p-sub" className="input" value={f.subtitle} onChange={set('subtitle')} maxLength={200} /></Field>
          <Field label="Short description" htmlFor="p-short"><textarea id="p-short" rows={2} className="input" value={f.short_description} onChange={set('short_description')} maxLength={300} /></Field>
          <Field label="Description" htmlFor="p-desc"><textarea id="p-desc" rows={8} className="input" value={f.description} onChange={set('description')} /></Field>
          <div className="grid gap-5 sm:grid-cols-4">
            <Field label="Price" htmlFor="p-price"><input id="p-price" type="number" min={0} step="0.01" className="input" value={f.price} onChange={set('price')} /></Field>
            <Field label="Previous price" htmlFor="p-orig" hint="Only a genuine earlier price."><input id="p-orig" type="number" min={0} step="0.01" className="input" value={f.original_price} onChange={set('original_price')} /></Field>
            <Field label="Currency" htmlFor="p-cur"><input id="p-cur" className="input uppercase" maxLength={3} value={f.currency} onChange={set('currency')} /></Field>
            <Field label="Version" htmlFor="p-ver"><input id="p-ver" className="input" value={f.version} onChange={set('version')} /></Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Primary category" htmlFor="p-cat">
              <select id="p-cat" className="input" value={f.category_id} onChange={set('category_id')}>
                <option value="">Select…</option>
                {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Product type" htmlFor="p-type"><input id="p-type" className="input" value={f.product_type} onChange={set('product_type')} /></Field>
          </div>
          <fieldset>
            <legend className="label">Also list in</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {cats.data?.filter((c) => c.id !== f.category_id).map((c) => (
                <label key={c.id} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={secondary.includes(c.id)} onChange={(e) => setSecondary(e.target.checked ? [...secondary, c.id] : secondary.filter((x) => x !== c.id))} /> {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_featured} onChange={(e) => setF({ ...f, is_featured: e.target.checked })} /> Feature on homepage</label>
          <Field label="Highlights (one per line)" htmlFor="p-hl"><textarea id="p-hl" rows={4} className="input" value={f.highlights} onChange={set('highlights')} /></Field>
          <Field label="What’s included (one per line: name | description)" htmlFor="p-contents"><textarea id="p-contents" rows={6} className="input font-mono text-xs" value={f.contents} onChange={set('contents')} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Requirements (one per line)" htmlFor="p-req"><textarea id="p-req" rows={4} className="input" value={f.technical_requirements} onChange={set('technical_requirements')} /></Field>
            <Field label="Compatibility (one per line)" htmlFor="p-compat"><textarea id="p-compat" rows={4} className="input" value={f.compatibility} onChange={set('compatibility')} /></Field>
          </div>
          <Field label="FAQ (one per line: question | answer)" htmlFor="p-faq"><textarea id="p-faq" rows={4} className="input" value={f.faq} onChange={set('faq')} /></Field>
          <Field label="Licence text" htmlFor="p-lic"><textarea id="p-lic" rows={4} className="input" value={f.licence_text} onChange={set('licence_text')} /></Field>
          <Field label="Support information" htmlFor="p-sup"><textarea id="p-sup" rows={2} className="input" value={f.support_info} onChange={set('support_info')} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="SEO title" htmlFor="p-seot" hint="Max 70 characters."><input id="p-seot" className="input" maxLength={70} value={f.seo_title} onChange={set('seo_title')} /></Field>
            <Field label="SEO description" htmlFor="p-seod" hint="Max 170 characters."><input id="p-seod" className="input" maxLength={170} value={f.seo_description} onChange={set('seo_description')} /></Field>
          </div>
          <Field label="Preview images (one path per line)" htmlFor="p-imgs" hint="Static paths like /previews/x.svg, or uploaded media paths."><textarea id="p-imgs" rows={3} className="input font-mono text-xs" value={f.preview_images} onChange={set('preview_images')} /></Field>
          {!isNew && (
            <label className="btn-secondary cursor-pointer">
              <Upload className="h-4 w-4" aria-hidden="true" /> Upload preview image
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void run(async () => {
                  const path = await uploadPreviewImage(f.slug, file);
                  const next = { ...f, preview_images: [...lines(f.preview_images), path].join('\n') };
                  setF(next);
                  await saveProduct(id!, toInput(next));
                }, 'Preview image uploaded.');
              }} />
            </label>
          )}
          {lines(f.preview_images).length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {lines(f.preview_images).map((p) => <img key={p} src={mediaUrl(p)} alt="" className="aspect-[4/3] rounded-lg object-cover ring-1 ring-slate-200" />)}
            </div>
          )}
          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            <button type="submit" className="btn-primary" disabled={busy}>{isNew ? 'Create draft' : 'Save changes'}</button>
            <Link to="/admin/products" className="btn-secondary">Back</Link>
          </div>
        </form>

        {!isNew && product && (
          <aside className="space-y-6">
            <div className="card p-5">
              <h2 className="text-base font-semibold">Downloadable file</h2>
              {file ? (
                <p className="mt-2 text-sm text-ink-muted">{file.file_name} · {formatBytes(file.size_bytes)}<br />Uploaded {formatDate(file.uploaded_at)}</p>
              ) : (
                <p className="mt-2 text-sm text-amber-700">No file uploaded. The product cannot be published.</p>
              )}
              <label className="btn-secondary mt-4 w-full cursor-pointer">
                <Upload className="h-4 w-4" aria-hidden="true" /> {file ? 'Replace file (.zip)' : 'Upload file (.zip)'}
                <input type="file" accept=".zip,application/zip" className="sr-only" onChange={(e) => {
                  const zip = e.target.files?.[0];
                  if (zip && user) void run(() => uploadProductFile(id!, f.slug, zip, user.id), 'File uploaded to private storage.');
                }} />
              </label>
              <p className="mt-2 text-xs text-ink-subtle">Stored in a private bucket. Customers only receive short-lived signed links.</p>
            </div>

            <div className="card p-5">
              <h2 className="text-base font-semibold">Publishing</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {checklist.map(([label, ok]) => (
                  <li key={label} className={cx('flex items-center gap-2', ok ? 'text-emerald-700' : 'text-ink-muted')}>
                    {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />} {label}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-subtle">The database re-checks these rules, including that the file exists in storage.</p>
              <div className="mt-4 grid gap-2">
                {product.status !== 'published' && <button type="button" className="btn-accent" disabled={busy} onClick={() => changeStatus('published', 'Product published.')}>Publish</button>}
                {product.status !== 'coming_soon' && <button type="button" className="btn-secondary" disabled={busy} onClick={() => changeStatus('coming_soon', 'Shown as “In development” (not purchasable).')}>Show as in development</button>}
                {product.status !== 'draft' && <button type="button" className="btn-secondary" disabled={busy} onClick={() => changeStatus('draft', 'Moved to draft (hidden).')}>Unpublish to draft</button>}
                {product.status !== 'archived' && <button type="button" className="btn-ghost text-red-700" disabled={busy} onClick={() => changeStatus('archived', 'Archived. Existing buyers keep access.')}>Archive</button>}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
