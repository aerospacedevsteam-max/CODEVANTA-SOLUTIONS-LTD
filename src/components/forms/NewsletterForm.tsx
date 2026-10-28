import { useId, useState, type FormEvent } from 'react';
import { NEWSLETTER_CONSENT, subscribeNewsletter } from '@/lib/api';
import { cx } from '@/lib/format';

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setState('error');
      setMessage('Please tick the consent box to subscribe.');
      return;
    }
    setState('sending');
    try {
      await subscribeNewsletter(email, website);
      setState('done');
      setMessage('Thanks — you are subscribed. You can unsubscribe at any time.');
      setEmail('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Could not subscribe right now.');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p className={cx('text-sm font-semibold', dark ? 'text-white' : 'text-navy-950')}>Product updates by email</p>
      <div className="flex gap-2">
        <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={cx('input', dark && 'border-white/15 bg-white/5 text-white placeholder:text-navy-400')}
        />
        <button type="submit" className={dark ? 'btn-accent' : 'btn-primary'} disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Subscribe'}
        </button>
      </div>
      {/* Honeypot: hidden from people, often filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className={cx('flex items-start gap-2 text-xs leading-5', dark ? 'text-navy-300' : 'text-ink-muted')}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-400" />
        <span>{NEWSLETTER_CONSENT}</span>
      </label>
      {state !== 'idle' && state !== 'sending' && (
        <p role="status" className={cx('text-sm', state === 'done' ? (dark ? 'text-emerald-300' : 'text-emerald-700') : dark ? 'text-red-300' : 'text-red-600')}>
          {message}
        </p>
      )}
    </form>
  );
}
