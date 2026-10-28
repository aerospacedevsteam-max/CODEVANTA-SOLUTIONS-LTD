import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { useAsync } from '@/lib/useAsync';
import { searchProducts } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import { ProductCard } from '@/components/product/ProductCard';
import { Breadcrumbs, EmptyState, ErrorState, Modal, PageHeader, Pagination, ProductCardSkeleton } from '@/components/ui';
import { cx } from '@/lib/format';

const PAGE_SIZE = 12;
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A–Z' },
  { value: 'name_desc', label: 'Name: Z–A' },
];

const num = (v: string | null) => (v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);

function Filters({ category, basePath, onDone }: { category: string | null; basePath: (slug: string | null) => string; onDone?: () => void }) {
  const { categories } = useSettings();
  const [params, setParams] = useSearchParams();
  const [min, setMin] = useState(params.get('min') ?? '');
  const [max, setMax] = useState(params.get('max') ?? '');
  useEffect(() => {
    setMin(params.get('min') ?? '');
    setMax(params.get('max') ?? '');
  }, [params]);

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    min ? next.set('min', min) : next.delete('min');
    max ? next.set('max', max) : next.delete('max');
    next.delete('page');
    setParams(next);
    onDone?.();
  };
  const qs = (() => {
    const p = new URLSearchParams(params);
    p.delete('page');
    const s = p.toString();
    return s ? `?${s}` : '';
  })();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-navy-950">Category</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <Link to={basePath(null) + qs} onClick={onDone} aria-current={!category ? 'page' : undefined} className={cx('block rounded-md px-2.5 py-1.5', !category ? 'bg-navy-900 font-medium text-white' : 'text-ink-muted hover:bg-navy-50')}>
              All categories
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link to={basePath(c.slug) + qs} onClick={onDone} aria-current={category === c.slug ? 'page' : undefined} className={cx('block rounded-md px-2.5 py-1.5', category === c.slug ? 'bg-navy-900 font-medium text-white' : 'text-ink-muted hover:bg-navy-50')}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={applyPrice}>
        <h2 className="text-sm font-semibold text-navy-950">Price</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="price-min" className="text-xs text-ink-subtle">Min</label>
            <input id="price-min" type="number" min={0} inputMode="numeric" className="input" value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
          <div>
            <label htmlFor="price-max" className="text-xs text-ink-subtle">Max</label>
            <input id="price-max" type="number" min={0} inputMode="numeric" className="input" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn-secondary mt-3 w-full">Apply price</button>
      </form>
    </div>
  );
}

export default function Catalogue({ mode }: { mode: 'all' | 'category' | 'search' }) {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { categories } = useSettings();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = mode === 'category' ? (slug ?? null) : params.get('category');
  const q = params.get('q') ?? '';
  const sort = SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort')! : 'newest';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const min = num(params.get('min'));
  const max = num(params.get('max'));
  const view = params.get('view') === 'list' ? 'list' : 'grid';
  const categoryObj = categories.find((c) => c.slug === category);

  const { data, loading, error, reload } = useAsync(
    () => searchProducts({ q, category, min, max, sort, page, pageSize: PAGE_SIZE }),
    [q, category, min, max, sort, page],
  );

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    value === null || value === '' ? next.delete(key) : next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const basePath = (s: string | null) => (s ? `/categories/${s}` : mode === 'search' ? '/search' : '/products');
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const title = mode === 'search' ? (q ? `Search results for “${q}”` : 'Search') : (categoryObj?.name ?? (category ? 'Category' : 'All products'));
  const activeFilters = [
    q && mode !== 'search' && { label: `“${q}”`, clear: () => setParam('q', null) },
    min !== null && { label: `Min ${min}`, clear: () => setParam('min', null) },
    max !== null && { label: `Max ${max}`, clear: () => setParam('max', null) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <>
      <Seo
        title={title}
        description={categoryObj?.description ?? 'Browse original website templates, UI kits, developer resources and business templates.'}
        noindex={mode === 'search'}
      />
      <PageHeader title={title} description={categoryObj?.description ?? (mode === 'search' ? 'Search titles and descriptions across the catalogue.' : 'Browse every published product. Filter by category and price.')}>
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            ...(mode === 'category' ? [{ label: 'Products', to: '/products' }, { label: categoryObj?.name ?? 'Category' }] : [{ label: mode === 'search' ? 'Search' : 'Products' }]),
          ]}
        />
      </PageHeader>

      <div className="container-site grid gap-10 py-10 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <Filters category={category} basePath={basePath} />
        </aside>

        <div>
          {mode === 'search' && (
            <form
              role="search"
              className="mb-6 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const term = String(new FormData(e.currentTarget).get('q') ?? '').trim();
                navigate(`/search?q=${encodeURIComponent(term)}`);
              }}
            >
              <label htmlFor="search-page-q" className="sr-only">Search products</label>
              <input id="search-page-q" name="q" type="search" defaultValue={q} key={q} className="input" placeholder="Search products…" maxLength={100} />
              <button className="btn-primary" type="submit">Search</button>
            </form>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <p className="mr-auto text-sm text-ink-muted" aria-live="polite">
              {loading ? 'Loading products…' : data ? `${data.total} product${data.total === 1 ? '' : 's'}` : ''}
            </p>
            <button type="button" className="btn-secondary lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
            </button>
            <label htmlFor="sort" className="sr-only">Sort products</label>
            <select id="sort" className="input w-auto" value={sort} onChange={(e) => setParam('sort', e.target.value === 'newest' ? null : e.target.value)}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="flex rounded-lg border border-slate-300 p-0.5" role="group" aria-label="Layout">
              <button type="button" aria-pressed={view === 'grid'} onClick={() => setParam('view', null)} className={cx('rounded-md p-1.5', view === 'grid' ? 'bg-navy-900 text-white' : 'text-ink-muted')} aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" aria-pressed={view === 'list'} onClick={() => setParam('view', 'list')} className={cx('rounded-md p-1.5', view === 'list' ? 'bg-navy-900 text-white' : 'text-ink-muted')} aria-label="List view">
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {activeFilters.map((f) => (
                <button key={f.label} type="button" onClick={f.clear} className="badge bg-navy-50 py-1 text-navy-800 ring-1 ring-navy-200 hover:bg-navy-100">
                  {f.label} <X className="h-3 w-3" aria-hidden="true" /><span className="sr-only">Remove filter</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className={cx('grid gap-6', view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : '')}>
              {Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No products found" action={<Link to="/products" className="btn-secondary">Clear all filters</Link>}>
              Try a different search term, category or price range.
            </EmptyState>
          ) : (
            <>
              <div className={cx('grid gap-6', view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : '')}>
                {data.items.map((p) => <ProductCard key={p.id} product={p} layout={view} />)}
              </div>
              <Pagination page={page} totalPages={totalPages} onPage={(p) => setParam('page', p === 1 ? null : String(p))} />
            </>
          )}
        </div>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <Filters category={category} basePath={basePath} onDone={() => setFiltersOpen(false)} />
      </Modal>
    </>
  );
}
