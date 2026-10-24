'use client';

import { useState } from 'react';

export default function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  async function go() {
    setState('busy');
    try {
      const res = await fetch(`/api/unsubscribe?t=${encodeURIComponent(token)}`, { method: 'POST' });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }
  if (state === 'done') {
    return <p role="status" className="mt-6 ink-soft">You are unsubscribed. We will not send you marketing email.</p>;
  }
  return (
    <div className="mt-6">
      <button type="button" onClick={go} disabled={state === 'busy'} className="btn-gold min-h-[44px] justify-center disabled:opacity-60">
        {state === 'busy' ? 'Working…' : 'Unsubscribe'}
      </button>
      {state === 'error' ? (
        <p role="alert" className="mt-3 text-sm text-[#f87171]">That did not work. Please email book@tassytrucks.com and we will remove you.</p>
      ) : null}
    </div>
  );
}
