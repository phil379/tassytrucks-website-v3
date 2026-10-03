'use client';

import { useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { sendFacilityMessage } from '@/app/facility/messages/actions';

export default function MessageComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await sendFacilityMessage(fd);
      if (res.ok) formRef.current?.reset();
      else setError(res.error);
    } catch {
      setError('We could not reach the server. Please call (704) 941-8508.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-5">
      <label className="sr-only" htmlFor="body">Message dispatch</label>
      <textarea
        id="body"
        name="body"
        className="form-field"
        rows={3}
        maxLength={4000}
        required
        placeholder="Change a pickup time, add a companion seat, ask where a driver is…"
      />
      {/* Said here because this box is next to passenger names and it is
          exactly where someone would otherwise type a reason for the visit. */}
      <p className="ink-mute mt-1.5 text-xs">
        Logistics only, please &mdash; no diagnoses, procedures or record numbers.
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-[#f87171]">{error}</p>}
      <button type="submit" disabled={busy} className="btn-gold mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm">
        {busy ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send</>}
      </button>
    </form>
  );
}
