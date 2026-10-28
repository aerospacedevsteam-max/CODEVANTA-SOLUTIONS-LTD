import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, Lock, Star, X, XCircle } from 'lucide-react';
import { cx } from '@/lib/format';
import { ConfigError } from '@/lib/supabase';

export function Spinner({ className = 'h-5 w-5', label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cx('animate-spin text-navy-500', className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-ink-muted">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-md bg-slate-200/70', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

type Tone = 'info' | 'success' | 'warning' | 'error';
const toneStyles: Record<Tone, string> = {
  info: 'border-brand-200 bg-brand-50 text-navy-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};
const toneIcons = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };

export function Alert({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const Icon = toneIcons[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-lg border p-4 text-sm', toneStyles[tone], className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-6">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Info,
  title,
  children,
  action,
  level = 2,
}: {
  icon?: typeof Info;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** Use 1 when the empty state is the page's main content (e.g. 404). */
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-white shadow-card">
        <Icon className="h-6 w-6 text-navy-600" aria-hidden="true" />
      </span>
      <Heading className="text-lg font-semibold">{title}</Heading>
      {children && <div className="mt-2 max-w-md text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: { error: Error; onRetry?: () => void; title?: string }) {
  if (error instanceof ConfigError) {
    return (
      <EmptyState icon={AlertTriangle} title="Store database not connected">
        {error.message} See the README section “Connect Supabase”.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      action={
        onRetry && (
          <button type="button" className="btn-secondary" onClick={onRetry}>
            Try again
          </button>
        )
      }
    >
      {error.message}
    </EmptyState>
  );
}

export function AccessDenied({ message = 'You do not have permission to view this page.' }: { message?: string }) {
  return (
    <div className="container-site py-16">
      <EmptyState icon={Lock} title="Access denied" action={<Link to="/" className="btn-secondary">Back to home</Link>}>
        {message}
      </EmptyState>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close?.();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        'w-[calc(100%-2rem)] rounded-2xl p-0 shadow-lift backdrop:bg-navy-950/60 backdrop:backdrop-blur-sm',
        size === 'md' && 'max-w-lg',
        size === 'lg' && 'max-w-3xl',
        size === 'xl' && 'max-w-6xl',
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <button type="button" onClick={onClose} className="btn-ghost -mr-2 p-2" aria-label="Close dialog">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      <button type="button" className="btn-ghost p-2" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-subtle">…</span>}
          <button
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cx('h-9 min-w-9 rounded-lg px-3 text-sm font-medium', p === page ? 'bg-navy-900 text-white' : 'text-navy-800 hover:bg-navy-50')}
          >
            {p}
          </button>
        </span>
      ))}
      <button type="button" className="btn-ghost p-2" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden="true" className={cx(size, i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
      ))}
    </span>
  );
}

const statusTone: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  open: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  new: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  coming_soon: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  in_progress: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  draft: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  closed: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  archived: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  partially_refunded: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  refunded: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cx('badge ring-1 ring-inset', statusTone[status] ?? 'bg-red-50 text-red-700 ring-red-600/20')}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b border-slate-200 bg-gradient-to-b from-navy-50/70 to-white">
      <div className="container-site py-10 sm:py-14">
        {children}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-base text-ink-muted">{description}</p>}
      </div>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-ink-subtle">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            {item.to ? (
              <Link to={item.to} className="hover:text-navy-900 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-navy-900">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="field-hint">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Highlights text the business must replace with verified information. */
export function Placeholder({ children }: { children: ReactNode }) {
  return <span className="placeholder-note">[{children}]</span>;
}
