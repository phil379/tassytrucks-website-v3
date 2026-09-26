'use client';

import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { facilitySignupSchema } from '@/lib/facility';

/**
 * Step 0 of the facility wizard — two fields, on the public page.
 *
 * Two on purpose. The page promises "60 seconds, no credit card" and that
 * promise is worth keeping; everything else is asked behind the magic link,
 * where the person has already committed.
 *
 * THE SUCCESS RULE: a null id is a FAILURE. On 2026-09-25 the booking form
 * rendered "Request received" for two submissions it never stored, because
 * `setDone(json.id ?? 'received')` turned a null id into a truthy value. A
 * signup that was not stored must never show a success screen.
 */
export default function FacilitySignupForm({ source }: { source?: string }) {
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState('');

  /** When the form was rendered. The difference at submit is the bot signal. */
  const renderedAtRef = useRef<number>(Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      facilityName: String(fd.get('facilityName') ?? ''),
      workEmail: String(fd.get('workEmail') ?? ''),
      hp_token: String(fd.get('hp_token') ?? ''),
      elapsedMs: Date.now() - renderedAtRef.current,
      source: source ?? 'partners-signup',
    };

    // Validate with the same schema the server uses, so the two can never
    // disagree about what a valid signup is.
    const check = facilitySignupSchema.safeParse(payload);
    if (!check.success) {
      const next: Record<string, string> = {};
      for (const issue of check.error.issues) {
        const key = issue.path.join('.') || 'form';
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/facility-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      // A null id means nothing was stored — bot check, or a write that failed.
      // Never render success for it.
      if (!res.ok || !json.ok || !json.id) {
        setFieldErrors(json.fieldErrors ?? {});
        setFormError(
          json.error ?? 'We could not save that. Please call (704) 941-8508 and we will set you up by phone.',
        );
        return;
      }

      setSentTo(payload.workEmail);
      setDone(json.id);
    } catch {
      setFormError('We could not reach the server. Please call (704) 941-8508.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card-tile p-8 text-center" role="status" aria-live="polite">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[color:var(--gold)]" aria-hidden="true" />
        <h2 className="serif text-2xl font-semibold mt-4">Check your inbox</h2>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
          We sent a secure link to <strong>{sentTo}</strong>. Open it to finish
          setting up — about two minutes, and no password to remember.
        </p>
        <p className="mt-4 text-sm text-[color:var(--muted)]">
          Nothing arrived? Check spam, or call dispatch on{' '}
          <a className="underline" href="tel:+17049418508">(704) 941-8508</a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card-tile p-6 sm:p-8">
      {/* Honeypot. Named hp_token, NOT company — company/organization is an
          autofill category and browsers fill it even off-screen. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="hp_token">Leave this field empty</label>
        <input
          id="hp_token"
          name="hp_token"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
        />
      </div>

      <Field
        id="facilityName"
        label="Facility name"
        placeholder="e.g. Lakeside Rehabilitation Center"
        autoComplete="organization"
        error={fieldErrors.facilityName}
      />

      <Field
        id="workEmail"
        label="Work email"
        type="email"
        placeholder="you@facility.org"
        autoComplete="email"
        error={fieldErrors.workEmail}
      />

      {formError ? (
        <p role="alert" className="mt-4 text-sm text-[color:var(--danger,#E06A6A)]">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary mt-6 w-full justify-center disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Sending…
          </>
        ) : (
          <>
            Get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-[color:var(--muted)]">
        We&rsquo;ll email a secure link to finish setup. No password to remember.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  type = 'text',
  ...rest
}: {
  id: string;
  label: string;
  error?: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mt-5 first:mt-0">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 w-full rounded-lg border border-[color:var(--line)] bg-transparent px-4 py-3 text-base outline-none focus:border-[color:var(--gold)]"
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-[color:var(--danger,#E06A6A)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
