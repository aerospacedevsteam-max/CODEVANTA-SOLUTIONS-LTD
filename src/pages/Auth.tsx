import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Redirect } from '@/components/layout/SiteLayout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { db, siteUrl } from '@/lib/supabase';
import { Seo } from '@/lib/seo';
import { useAuth } from '@/context/AuthContext';
import { Alert, Field, PageLoader } from '@/components/ui';
import { LogoMark } from '@/components/layout/Logo';

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/account';
  return next;
}

function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-navy-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <LogoMark className="h-10 w-10" />
          <h1 className="mt-5 text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}

const password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(72, 'Use at most 72 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

// --------------------------------------------------------------------------
const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export function SignIn() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });

  if (user) return <Redirect to={next} />;

  const onSubmit = async (v: z.infer<typeof signInSchema>) => {
    setError(null);
    try {
      const { error: e } = await db().auth.signInWithPassword(v);
      if (e) throw e;
      navigate(next, { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed.';
      setError(/invalid login/i.test(msg) ? 'Email or password is incorrect.' : /not confirmed/i.test(msg) ? 'Please verify your email address first — check your inbox.' : msg);
    }
  };

  return (
    <>
      <Seo title="Sign in" noindex />
      <AuthCard
        title="Sign in"
        subtitle="Access your orders, downloads and support requests."
        footer={<>New here? <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700">Create an account</Link></>}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Email" htmlFor="si-email" error={errors.email?.message}>
            <input id="si-email" type="email" autoComplete="email" className="input" aria-invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Password" htmlFor="si-password" error={errors.password?.message}>
            <input id="si-password" type="password" autoComplete="current-password" className="input" aria-invalid={!!errors.password} {...register('password')} />
          </Field>
          <div className="text-right text-sm">
            <Link to="/forgot-password" className="font-medium text-brand-700">Forgot password?</Link>
          </div>
          <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </AuthCard>
    </>
  );
}

// --------------------------------------------------------------------------
const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Enter your name.').max(120),
    email: z.string().trim().email('Enter a valid email address.'),
    password,
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: 'Please accept the Terms and Privacy Policy.' }) }),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' });

export function Register() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  if (user) return <Redirect to={next} />;

  const onSubmit = async (v: z.infer<typeof registerSchema>) => {
    setError(null);
    try {
      const { data, error: e } = await db().auth.signUp({
        email: v.email,
        password: v.password,
        options: {
          data: { full_name: v.full_name },
          emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (e) throw e;
      // Without email confirmation Supabase signs the user in straight away.
      if (data.session) {
        navigate(next, { replace: true });
        return;
      }
      setSentTo(v.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    }
  };

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a verification link to ${sentTo}.`}>
        <Alert tone="success" title="Verify your email address">
          Open the link in the email to activate your account. If it does not arrive within a few minutes, check your spam folder.
        </Alert>
        <MailCheck className="mx-auto mt-6 h-12 w-12 text-brand-600" aria-hidden="true" />
      </AuthCard>
    );
  }

  return (
    <>
      <Seo title="Create an account" noindex />
      <AuthCard title="Create your account" subtitle="Your purchases and downloads are stored securely in your account." footer={<>Already registered? <Link to={`/signin?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700">Sign in</Link></>}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Full name" htmlFor="rg-name" error={errors.full_name?.message}>
            <input id="rg-name" autoComplete="name" className="input" aria-invalid={!!errors.full_name} {...register('full_name')} />
          </Field>
          <Field label="Email" htmlFor="rg-email" error={errors.email?.message}>
            <input id="rg-email" type="email" autoComplete="email" className="input" aria-invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Password" htmlFor="rg-password" error={errors.password?.message} hint="At least 10 characters, including a letter and a number.">
            <input id="rg-password" type="password" autoComplete="new-password" className="input" aria-invalid={!!errors.password} {...register('password')} />
          </Field>
          <Field label="Confirm password" htmlFor="rg-confirm" error={errors.confirm?.message}>
            <input id="rg-confirm" type="password" autoComplete="new-password" className="input" aria-invalid={!!errors.confirm} {...register('confirm')} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-ink-muted">
            <input type="checkbox" className="mt-0.5 h-4 w-4" {...register('terms')} />
            <span>I agree to the <Link to="/terms" className="underline">Terms</Link> and have read the <Link to="/privacy" className="underline">Privacy Policy</Link>.</span>
          </label>
          {errors.terms && <p className="field-error">{errors.terms.message}</p>}
          <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
        </form>
      </AuthCard>
    </>
  );
}

// --------------------------------------------------------------------------
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  return (
    <>
      <Seo title="Reset your password" noindex />
      <AuthCard title="Reset your password" subtitle="We will email you a secure link to choose a new password." footer={<Link to="/signin" className="font-semibold text-brand-700">Back to sign in</Link>}>
        {state === 'sent' ? (
          <Alert tone="success" title="Check your email">If an account exists for {email}, a reset link is on its way.</Alert>
        ) : (
          <form
            className="space-y-4"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              if (!z.string().email().safeParse(email.trim()).success) {
                setState('error');
                setError('Enter a valid email address.');
                return;
              }
              setState('sending');
              try {
                const { error: err } = await db().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${siteUrl}/reset-password` });
                if (err) throw err;
                setState('sent');
              } catch (err) {
                setState('error');
                setError(err instanceof Error ? err.message : 'Could not send the reset email.');
              }
            }}
          >
            {state === 'error' && <Alert tone="error">{error}</Alert>}
            <Field label="Email" htmlFor="fp-email">
              <input id="fp-email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <button className="btn-primary w-full" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
      </AuthCard>
    </>
  );
}

// --------------------------------------------------------------------------
const resetSchema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' });

export function ResetPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

  if (loading) return <PageLoader label="Verifying reset link…" />;
  return (
    <>
      <Seo title="Choose a new password" noindex />
      <AuthCard title="Choose a new password">
        {!user ? (
          <Alert tone="error" title="This reset link is invalid or has expired">
            <Link to="/forgot-password" className="underline">Request a new link</Link>.
          </Alert>
        ) : done ? (
          <Alert tone="success" title="Password updated">
            <button type="button" className="underline" onClick={() => navigate('/account')}>Continue to your account</button>
          </Alert>
        ) : (
          <form
            className="space-y-4"
            noValidate
            onSubmit={handleSubmit(async (v) => {
              setError(null);
              const { error: e } = await db().auth.updateUser({ password: v.password });
              if (e) setError(e.message);
              else setDone(true);
            })}
          >
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="New password" htmlFor="rp-password" error={errors.password?.message} hint="At least 10 characters, including a letter and a number.">
              <input id="rp-password" type="password" autoComplete="new-password" className="input" aria-invalid={!!errors.password} {...register('password')} />
            </Field>
            <Field label="Confirm new password" htmlFor="rp-confirm" error={errors.confirm?.message}>
              <input id="rp-confirm" type="password" autoComplete="new-password" className="input" aria-invalid={!!errors.confirm} {...register('confirm')} />
            </Field>
            <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>Update password</button>
          </form>
        )}
      </AuthCard>
    </>
  );
}

// --------------------------------------------------------------------------
/** Email-verification landing page; supabase-js exchanges the code from the URL. */
export function AuthCallback() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const errorDescription = params.get('error_description');

  useEffect(() => {
    if (user) navigate(safeNext(params.get('next')), { replace: true });
  }, [user, navigate, params]);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  if (errorDescription || (timedOut && !loading && !user)) {
    return (
      <AuthCard title="Verification link problem">
        <Alert tone="error">{errorDescription ?? 'This link is invalid or has expired.'} <Link to="/signin" className="underline">Sign in</Link> to request a new one.</Alert>
      </AuthCard>
    );
  }
  return <PageLoader label="Verifying your email…" />;
}
