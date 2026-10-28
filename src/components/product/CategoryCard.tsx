import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  Briefcase,
  Code2,
  FileSpreadsheet,
  LayoutDashboard,
  LayoutTemplate,
  Palette,
  Rocket,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '@/lib/types';

export const categoryIcons: Record<string, LucideIcon> = {
  'layout-template': LayoutTemplate,
  palette: Palette,
  'layout-dashboard': LayoutDashboard,
  briefcase: Briefcase,
  'shopping-cart': ShoppingCart,
  rocket: Rocket,
  'file-spreadsheet': FileSpreadsheet,
  'code-2': Code2,
  boxes: Boxes,
};

export function CategoryCard({ category }: { category: Category }) {
  const Icon = categoryIcons[category.icon ?? ''] ?? Boxes;
  return (
    <Link
      to={`/categories/${category.slug}`}
      className="card group relative flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
    >
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-navy-900 to-brand-700 text-white shadow-card">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold">{category.name}</h3>
      {category.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{category.description}</p>}
      <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-slate-400 transition group-hover:text-brand-600" aria-hidden="true" />
    </Link>
  );
}
