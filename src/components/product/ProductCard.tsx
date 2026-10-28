import { Link } from 'react-router-dom';
import { Check, Clock, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { ProductSummary } from '@/lib/types';
import { cx, formatPrice, validDiscount } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import { useCart } from '@/context/CartContext';

export function PriceTag({
  price,
  originalPrice,
  currency,
  size = 'md',
}: {
  price: number;
  originalPrice: number | null;
  currency: string;
  size?: 'md' | 'lg';
}) {
  const discount = validDiscount(price, originalPrice);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={cx('font-bold text-navy-950', size === 'lg' ? 'text-3xl' : 'text-lg')}>{formatPrice(price, currency)}</span>
      {discount !== null && (
        <>
          <span className={cx('text-ink-subtle line-through', size === 'lg' ? 'text-lg' : 'text-sm')}>
            <span className="sr-only">Previous price </span>
            {formatPrice(originalPrice, currency)}
          </span>
          <span className="badge bg-emerald-50 text-emerald-700">Save {discount}%</span>
        </>
      )}
    </div>
  );
}

export function AddToCartButton({ product, className, full }: { product: Pick<ProductSummary, 'id' | 'status' | 'title'>; className?: string; full?: boolean }) {
  const { has, add } = useCart();
  const [busy, setBusy] = useState(false);
  const inCart = has(product.id);

  if (product.status !== 'published') {
    return (
      <button type="button" disabled className={cx('btn-secondary', full && 'w-full', className)}>
        <Clock className="h-4 w-4" aria-hidden="true" /> In development
      </button>
    );
  }
  if (inCart) {
    return (
      <Link to="/cart" className={cx('btn-secondary', full && 'w-full', className)}>
        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> In cart
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cx('btn-primary', full && 'w-full', className)}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await add(product.id);
        } finally {
          setBusy(false);
        }
      }}
      aria-label={`Add ${product.title} to cart`}
    >
      <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Add to cart
    </button>
  );
}

export function ProductCard({ product, layout = 'grid' }: { product: ProductSummary; layout?: 'grid' | 'list' }) {
  const href = `/products/${product.slug}`;
  const comingSoon = product.status === 'coming_soon';

  const image = (
    <Link to={href} className={cx('relative block overflow-hidden bg-navy-50', layout === 'grid' ? 'aspect-[4/3]' : 'aspect-[4/3] sm:w-64 sm:shrink-0')} tabIndex={-1} aria-hidden="true">
      <img
        src={mediaUrl(product.preview_images[0])}
        alt=""
        loading="lazy"
        decoding="async"
        width={800}
        height={600}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
      {comingSoon && <span className="badge absolute left-3 top-3 bg-white/95 text-navy-800 shadow-card">In development</span>}
    </Link>
  );

  return (
    <article className={cx('card group flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift', layout === 'grid' ? 'flex-col' : 'flex-col sm:flex-row')}>
      {image}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-700">{product.category_name ?? product.product_type}</p>
        <h3 className="mt-1.5 text-base font-semibold leading-snug">
          <Link to={href} className="hover:text-brand-700">
            {product.title}
          </Link>
        </h3>
        {product.short_description && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{product.short_description}</p>}
        <p className="mt-2 text-xs text-ink-subtle">{product.product_type} · v{product.version}</p>
        <div className="mt-auto pt-4">
          <PriceTag price={product.price} originalPrice={product.original_price} currency={product.currency} />
          <div className={cx('mt-3 grid gap-2', layout === 'grid' ? 'grid-cols-2' : 'grid-cols-2 sm:max-w-sm')}>
            <Link to={href} className="btn-secondary whitespace-nowrap px-2">
              View details
            </Link>
            <AddToCartButton product={product} className="whitespace-nowrap px-2" />
          </div>
        </div>
      </div>
    </article>
  );
}
