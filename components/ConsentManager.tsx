'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ANALYTICS_SCRIPT_SRC,
  CONSENT_STORAGE_KEY,
  OPEN_SETTINGS_EVENT,
  parseConsent,
  serializeConsent,
} from '@/lib/consent';

/**
 * Asks once, with two buttons of equal size and weight, whether we may count visits
 * with analytics. Nothing is pre-selected, there is no toggle to hunt for, and the
 * page works the same either way. Analytics is injected here and nowhere else, so it
 * cannot load before the visitor says yes.
 */

// Both buttons share this one class string on purpose: equal weight, no nudging.
const BUTTON =
  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border-2 border-[color:var(--gold)] bg-transparent px-3 py-2 text-sm font-semibold text-[color:var(--ink)] hover:bg-[rgba(200,147,46,0.15)] sm:whitespace-nowrap sm:px-4';

function readStored(): ReturnType<typeof parseConsent> {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStored(analytics: boolean) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(analytics));
  } catch {
    /* Storage blocked: the choice applies to this page view only. */
  }
}

function loadAnalytics() {
  if (document.querySelector('script[data-tassy-analytics]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = ANALYTICS_SCRIPT_SRC;
  s.setAttribute('data-tassy-analytics', '1');
  document.head.appendChild(s);
}

export default function ConsentManager() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<boolean | null>(null);
  const [fromSettings, setFromSettings] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<Element | null>(null);

  // First visit: read the saved choice. Load analytics only if it was Accept.
  useEffect(() => {
    const saved = readStored();
    if (!saved) {
      setOpen(true);
      return;
    }
    setCurrent(saved.analytics);
    if (saved.analytics) loadAnalytics();
  }, []);

  // Footer "Cookie settings" reopens the banner and moves focus into it.
  useEffect(() => {
    const onOpen = () => {
      openerRef.current = document.activeElement;
      setFromSettings(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open && fromSettings) titleRef.current?.focus();
  }, [open, fromSettings]);

  const close = useCallback(() => {
    setOpen(false);
    setFromSettings(false);
    const opener = openerRef.current as HTMLElement | null;
    openerRef.current = null;
    opener?.focus?.();
  }, []);

  const choose = useCallback(
    (analytics: boolean) => {
      const hadAnalytics = Boolean(document.querySelector('script[data-tassy-analytics]'));
      writeStored(analytics);
      setCurrent(analytics);
      if (analytics) {
        loadAnalytics();
        close();
      } else if (hadAnalytics) {
        // A script that is already running cannot be unloaded; reloading stops it.
        window.location.reload();
      } else {
        close();
      }
    },
    [close],
  );

  useEffect(() => {
    if (!open || !fromSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, fromSettings, close]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      data-testid="consent-banner"
      /* Compact (Muse, 2026-11-13): the old bar was full width and about a quarter of the screen
         tall, and covered the hero buttons on first paint. On a phone it is now a short bar with
         one line of text and the two buttons side by side; from tablet up it is a small card in
         the bottom-right corner, clear of the "Request a Ride" buttons on the left. Both buttons
         stay the same size and weight. */
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--line)] bg-[#1B1A17] shadow-[0_-8px_30px_rgba(0,0,0,0.45)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md sm:rounded-xl sm:border"
    >
      <div className="px-4 py-3 sm:p-5">
        <h2 id="consent-title" ref={titleRef} tabIndex={-1} className="serif text-base font-semibold outline-none sm:text-lg">
          Cookies and visitor counting
        </h2>
        {/* Phone: one line. The full explanation is one tap away on the Cookies page. */}
        <p className="ink-soft mt-1 text-sm leading-snug sm:hidden">
          Booking works whatever you choose. Accept to let us count page visits.{' '}
          <Link href="/cookies" className="underline underline-offset-2">Details</Link>
        </p>
        <p id="consent-desc" className="ink-soft mt-2 hidden max-w-3xl text-sm leading-relaxed sm:block">
          Booking, payment and address suggestions work whatever you choose. If you accept, we also
          use Vercel Web Analytics to count which pages are visited. If you reject, we do not load
          it. Details are on our{' '}
          <Link href="/cookies" className="underline underline-offset-2">Cookies page</Link>.
        </p>
        {current !== null && (
          <p className="ink-soft mt-2 text-sm" data-testid="consent-current">
            Your current choice: {current ? 'Accept' : 'Reject non-essential'}.
          </p>
        )}
        <div className="mt-3 flex flex-row gap-2 sm:mt-4 sm:gap-3">
          <button type="button" className={BUTTON} onClick={() => choose(true)}>
            Accept
          </button>
          <button type="button" className={BUTTON} onClick={() => choose(false)}>
            Reject non-essential
          </button>
        </div>
      </div>
    </div>
  );
}
