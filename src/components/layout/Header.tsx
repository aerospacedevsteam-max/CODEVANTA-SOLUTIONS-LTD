import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, User, X } from 'lucide-react';
import { Logo } from './Logo';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { cx } from '@/lib/format';

export const primaryNav = [
  { label: 'Website Templates', to: '/categories/website-templates' },
  { label: 'UI Kits', to: '/categories/ui-kits' },
  { label: 'Developer Resources', to: '/categories/developer-resources' },
  { label: 'Business Templates', to: '/categories/business-templates' },
  { label: 'Bundles', to: '/categories/bundles' },
];

function AnnouncementBar() {
  const { settings } = useSettings();
  const a = settings.announcement;
  if (!a.enabled || !a.text) return null;
  return (
    <div className="bg-navy-950 text-center text-xs font-medium text-navy-100 sm:text-sm">
      <p className="container-site py-2">
        {a.text}
        {a.link_href && a.link_label && (
          <Link to={a.link_href} className="ml-2 font-semibold text-white underline underline-offset-2">
            {a.link_label}
          </Link>
        )}
      </p>
    </div>
  );
}

function SearchBox({ className, onDone }: { className?: string; onDone?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/products');
    onDone?.();
  };
  return (
    <form role="search" onSubmit={submit} className={cx('relative', className)}>
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        id="site-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search templates, kits, resources…"
        className="input rounded-full bg-slate-50 pl-9"
        maxLength={100}
      />
    </form>
  );
}

function CategoriesMenu() {
  const { categories } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-navy-800 hover:bg-navy-50"
        aria-expanded={open}
        aria-controls="categories-menu"
        onClick={() => setOpen((o) => !o)}
      >
        Categories <ChevronDown className={cx('h-4 w-4 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id="categories-menu" className="absolute left-0 top-full z-40 mt-2 w-[min(36rem,90vw)] animate-fade-in rounded-xl border border-slate-200 bg-white p-3 shadow-lift">
          <ul className="grid gap-1 sm:grid-cols-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/categories/${c.slug}`} className="block rounded-lg p-3 hover:bg-navy-50">
                  <span className="block text-sm font-semibold text-navy-900">{c.name}</span>
                  {c.description && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-subtle">{c.description}</span>}
                </Link>
              </li>
            ))}
            {categories.length === 0 && <li className="p-3 text-sm text-ink-subtle">Categories will appear here once the store is connected.</li>}
          </ul>
          <Link to="/products" className="mt-2 block rounded-lg bg-navy-50 px-3 py-2 text-center text-sm font-semibold text-navy-900 hover:bg-navy-100">
            Browse all products
          </Link>
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!user) {
    return (
      <Link to="/signin" className="btn-ghost px-2.5 sm:px-3">
        <User className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }
  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn-ghost px-2.5 sm:px-3" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <User className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Account</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-56 animate-fade-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift">
          <p className="truncate px-3 py-2 text-xs text-ink-subtle">{user.email}</p>
          <Link role="menuitem" to="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-navy-50">
            <User className="h-4 w-4" aria-hidden="true" /> My account
          </Link>
          <Link role="menuitem" to="/account/downloads" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-navy-50">
            <Package className="h-4 w-4" aria-hidden="true" /> Downloads
          </Link>
          {isAdmin && (
            <Link role="menuitem" to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-navy-50">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Admin
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-navy-50"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { categories } = useSettings();
  const { pathname } = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  const link = 'block rounded-lg px-3 py-2.5 text-[15px] font-medium text-navy-900 hover:bg-navy-50';
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
      <div className="absolute inset-0 bg-navy-950/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] animate-slide-in flex-col overflow-y-auto bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <Logo />
          <button ref={closeRef} type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4">
          <SearchBox onDone={onClose} />
        </div>
        <nav aria-label="Mobile" className="space-y-0.5 px-2 pb-6">
          <Link to="/" className={link}>Home</Link>
          <Link to="/products" className={link}>All Products</Link>
          <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Categories</p>
          {categories.map((c) => (
            <Link key={c.id} to={`/categories/${c.slug}`} className={link}>{c.name}</Link>
          ))}
          <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Help</p>
          <Link to="/faqs" className={link}>FAQs</Link>
          <Link to="/support" className={link}>Support</Link>
          <Link to="/contact" className={link}>Contact</Link>
          <Link to="/about" className={link}>About</Link>
        </nav>
      </div>
    </div>
  );
}

export function Header() {
  const { count } = useCart();
  const [drawer, setDrawer] = useState(false);
  const navLink = ({ isActive }: { isActive: boolean }) =>
    cx('rounded-md px-3 py-2 text-sm font-medium transition', isActive ? 'bg-navy-50 text-navy-950' : 'text-navy-800 hover:bg-navy-50');

  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <AnnouncementBar />
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container-site flex h-16 items-center gap-3">
          <button type="button" className="btn-ghost -ml-2 p-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Logo />
          <SearchBox className="mx-6 hidden max-w-md flex-1 md:block" />
          <div className="ml-auto flex items-center gap-1">
            <AccountMenu />
            <Link to="/cart" className="btn-ghost relative px-2.5 sm:px-3" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white sm:static sm:ml-0.5">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        <nav aria-label="Primary" className="hidden border-t border-slate-100 lg:block">
          <div className="container-site flex h-12 items-center gap-0.5">
            <NavLink to="/" end className={navLink}>Home</NavLink>
            <NavLink to="/products" className={navLink}>All Products</NavLink>
            <CategoriesMenu />
            {primaryNav.map((n) => (
              <NavLink key={n.to} to={n.to} className={navLink}>{n.label}</NavLink>
            ))}
            <span className="ml-auto" />
            <NavLink to="/faqs" className={navLink}>FAQs</NavLink>
            <NavLink to="/contact" className={navLink}>Contact</NavLink>
          </div>
        </nav>
      </header>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}
