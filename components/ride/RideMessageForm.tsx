'use client';

import { useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { sendRiderMessage } from '@/app/ride/[token]/actions';

/**
 * "Message dispatch about this ride" — the rider's half of rider messaging.
 * Presentational twin of the facility console's MessageComposer: same form
 * shape, same send states. The token rides along in a hidden field (it is
 * already in the page URL); the server resolves everything else from it.
 * Dispatch replies by email, so a sent message says exactly that.
 */
export default function RideMessageForm({ token }: { token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const res = await sendRiderMessage(fd);
      if (res.ok) {
        formRef.current?.reset();
        setSent(true);
      } else {
        setError(res.error);
      }
    } catch {
      setError('We could not reach the server. Please call (704) 941-8508.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="serif text-xl font-semibold">Message dispatch about this ride</h2>
      <p className="ink-soft mt-1 text-sm">
        Questions or changes for this trip — dispatch reads these in the office and replies by
        email. For anything urgent, call{' '}
        <a className="underline" href="tel:+17049418508">(704) 941-8508</a> — the phone is always
        faster than a message.
      </p>
      <form ref={formRef} onSubmit={onSubmit} className="mt-4">
        <input type="hidden" name="token" value={token} />
        <label className="sr-only" htmlFor="rider-message-body">Message dispatch</label>
        <textarea
          id="rider-message-body"
          name="body"
          className="form-field"
          rows={3}
          maxLength={4000}
          required
          placeholder="Change a pickup time, ask about your ride…"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-[#f87171]">{error}</p>
        )}
        {sent && !error && (
          <p className="mt-2 text-sm">Message sent. Dispatch will reply by email.</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-gold mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm"
        >
          {busy ? (
            <><Loader2 size={15} className="animate-spin" /> Sending…</>
          ) : (
            <><Send size={15} /> Send</>
          )}
        </button>
      </form>
    </div>
  );
}
