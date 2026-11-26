'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { THANKSGIVING, thanksgivingActive } from '@/lib/thanksgiving';

/**
 * The Thanksgiving banner (Phil, 2026-11-26): sitewide, above the header, in the brand's
 * black and gold — the website twin of the Thanksgiving Facebook post. It renders ONLY
 * inside the holiday window (lib/thanksgiving.ts), checked on the visitor's device at
 * view time, so it appears Thanksgiving morning and removes itself Sunday night with
 * no deploy in between. Dismissible: the close button remembers the choice on that
 * device for the rest of the window. Sized generously (Phil's word on the sister
 * banner: "make that a little bit bigger") — a full line at text-base on desktop.
 */
export default function ThanksgivingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!thanksgivingActive(new Date())) return;
    try {
      if (window.localStorage.getItem(THANKSGIVING.dismissKey) === '1') return;
    } catch {
      // Storage unavailable (private mode): show the banner; dismissal just won't stick.
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(THANKSGIVING.dismissKey, '1');
    } catch {
      // Nothing to remember on this device; the banner is closed for this view.
    }
  };

  return (
    <div
      className="border-b-2 border-[#C8932E] bg-[#0D1117] text-[#F4EFE0]"
      role="region"
      aria-label="Thanksgiving message"
    >
      <div className="container-x relative flex items-center justify-center gap-3 py-3 pr-12">
        <p className="text-center text-sm leading-snug sm:text-base">
          <span className="font-bold tracking-[0.14em] text-[#C8932E]">HAPPY THANKSGIVING</span>
          {' — '}from our family to yours. Thank you to every rider, family, and facility who
          trusts us with the people they love.{' '}
          <Link
            href="/request"
            className="font-semibold whitespace-nowrap underline decoration-[#C8932E] underline-offset-2"
          >
            Book a ride
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the Thanksgiving message"
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-2 text-[#F4EFE0]/80 transition hover:bg-white/10 hover:text-[#F4EFE0]"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}
