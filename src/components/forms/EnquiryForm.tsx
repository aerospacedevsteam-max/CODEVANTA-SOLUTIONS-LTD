import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { ApiError, submitEnquiry } from '@/lib/api';
import { Alert, Field } from '@/components/ui';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter your name (at least 2 characters).').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  subject: z.string().trim().min(3, 'Enter a subject.').max(160),
  message: z.string().trim().min(10, 'Please write at least 10 characters.').max(5000),
  website: z.string().max(0).optional().or(z.literal('')),
});
type Values = z.infer<typeof schema>;

export function EnquiryForm({ defaults, submitLabel = 'Send message' }: { defaults?: Partial<Values>; submitLabel?: string }) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { website: '', ...defaults } });

  const onSubmit = async (v: Values) => {
    setResult(null);
    try {
      await submitEnquiry({ ...v, website: v.website ?? '' });
      setResult({ ok: true, message: 'Thank you — your message has been received. We will reply by email.' });
      reset({ full_name: '', email: '', subject: '', message: '', website: '' });
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [k, msg] of Object.entries(e.fields)) setError(k as keyof Values, { message: msg });
      }
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Could not send your message.' });
    }
  };

  const err = (k: keyof Values) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `enq-${k}-error` : undefined });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {result && <Alert tone={result.ok ? 'success' : 'error'}>{result.message}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="enq-full_name" error={errors.full_name?.message}>
          <input id="enq-full_name" className="input" autoComplete="name" {...register('full_name')} {...err('full_name')} />
        </Field>
        <Field label="Email" htmlFor="enq-email" error={errors.email?.message}>
          <input id="enq-email" type="email" className="input" autoComplete="email" {...register('email')} {...err('email')} />
        </Field>
      </div>
      <Field label="Subject" htmlFor="enq-subject" error={errors.subject?.message}>
        <input id="enq-subject" className="input" {...register('subject')} {...err('subject')} />
      </Field>
      <Field label="Message" htmlFor="enq-message" error={errors.message?.message}>
        <textarea id="enq-message" rows={6} className="input" {...register('message')} {...err('message')} />
      </Field>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="enq-website">Website</label>
        <input id="enq-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>
      <p className="text-xs text-ink-subtle">
        We use your details only to respond to this message. See our <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
