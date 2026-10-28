import { Link } from 'react-router-dom';
import { cx } from '@/lib/format';

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#121c36" />
      <path d="M23 11.5h-4.5a8.5 8.5 0 0 0 0 17H23" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M24.5 15.5l4 9 4-9" fill="none" stroke="#5e8dfb" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Two-tone wordmark that keeps the exact company name: CODEVANTASOLUTIONSLTD. */
export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link to="/" className={cx('group inline-flex items-center gap-2.5', className)} aria-label="CODEVANTASOLUTIONSLTD home">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={cx('text-[15px] font-extrabold tracking-[-0.01em] sm:text-base', inverted ? 'text-white' : 'text-navy-950')}>
          CODEVANTA<span className={inverted ? 'text-brand-300' : 'text-brand-600'}>SOLUTIONSLTD</span>
        </span>
        <span className={cx('mt-1 hidden text-[10px] font-medium uppercase tracking-[0.18em] sm:block', inverted ? 'text-navy-300' : 'text-ink-subtle')}>
          Digital products
        </span>
      </span>
    </Link>
  );
}
