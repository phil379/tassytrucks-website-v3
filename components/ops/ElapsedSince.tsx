'use client';

import { useEffect, useState } from 'react';

/**
 * "47 min" — how long a request has been sitting.
 *
 * Rendered client-side and re-ticked every 30s. Server-rendering it would show
 * the elapsed time at page load and then quietly lie for as long as the tab
 * stays open, which is exactly the number the operator is deciding on.
 *
 * Crosses 90 minutes and it turns urgent — that is the same threshold the
 * escalation cron uses, so the screen and the SMS agree.
 */
export default function ElapsedSince({ iso, urgentAfterMinutes = 90 }: { iso: string; urgentAfterMinutes?: number }) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const compute = () => {
      const started = Date.parse(iso);
      if (Number.isNaN(started)) return setMinutes(null);
      setMinutes(Math.max(0, Math.floor((Date.now() - started) / 60000)));
    };
    compute();
    const t = setInterval(compute, 30_000);
    return () => clearInterval(t);
  }, [iso]);

  // Nothing until mounted, so server and client markup agree.
  if (minutes === null) return null;

  const urgent = minutes >= urgentAfterMinutes;
  const label =
    minutes < 60
      ? `${minutes} min`
      : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 min-h-[32px] text-sm font-semibold tabular-nums ${
        urgent
          ? 'bg-[rgba(248,113,113,0.15)] text-[#fca5a5] border border-[rgba(248,113,113,0.45)]'
          : 'border border-line ink-soft'
      }`}
      title={`Waiting ${label}`}
    >
      {urgent && <span className="sr-only">Overdue — </span>}
      waiting {label}
    </span>
  );
}
