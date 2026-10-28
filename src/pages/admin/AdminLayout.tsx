import { NavLink, Outlet } from 'react-router-dom';
import { FolderTree, Inbox, LayoutDashboard, MessageSquareText, Package, Receipt, Settings, Users } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { cx } from '@/lib/format';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/orders', label: 'Orders', icon: Receipt },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareText },
  { to: '/admin/inbox', label: 'Enquiries & support', icon: Inbox },
  { to: '/admin/settings', label: 'Website settings', icon: Settings },
];

export default function AdminLayout() {
  return (
    <div className="bg-slate-50">
      <Seo title="Admin" noindex />
      <div className="container-site grid gap-8 py-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:sticky lg:top-32 lg:flex-col lg:self-start">
          <p className="hidden px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle lg:block">Administration</p>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-navy-900 text-white' : 'text-navy-800 hover:bg-white')}>
              <n.icon className="h-4 w-4" aria-hidden="true" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 pb-16"><Outlet /></div>
      </div>
    </div>
  );
}

export function AdminTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
