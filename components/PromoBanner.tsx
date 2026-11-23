'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BLACK_FRIDAY, blackFridayActive } from '@/lib/promo';

/**
 * The Black Friday banner (Phil, 2026-11-23): sitewide, above the header, in the brand's
 * black and gold. It renders ONLY inside the offer window (lib/promo.ts) — checked on the
 * visitor's device at view time, so it appears Monday morning and removes itself Sunday
 * night with no deploy in between. Dismissible per session; the discount itself is applied
 * automatically at booking whether the banner is showing or not.
 */
export default function PromoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('promo-banner-dismissed') === BLACK_FRIDAY.code) return;
    setVisible(blackFridayActive(new Date()));
  }, []);

  if (!visible) return null;

  return (
    <div
      className="border-b-2 border-[#C8932E] bg-[#0D1117] text-[#F4EFE0]"
      role="region"
      aria-label="Black Friday offer"
    >
      <div className="container-x flex items-center justify-center gap-3 py-2">
        <p className="text-center text-[13px] leading-snug sm:text-sm">
          <span className="font-bold tracking-[0.14em] text-[#C8932E]">BLACK FRIDAY</span>
          {' — '}10% off every ride booked by Sunday, Nov 29. Applied automatically when you
          book, and it shows on your receipt.{' '}
          <Link
            href="/request"
            className="font-semibold whitespace-nowrap underline decoration-[#C8932E] underline-offset-2"
          >
            Book now
          </Link>
        </p>
        <button
          type="button"
          aria-label="Dismiss the Black Friday banner"
          className="shrink-0 px-1 text-lg leading-none text-[#F4EFE0]/70 hover:text-[#F4EFE0]"
          onClick={() => {
            sessionStorage.setItem('promo-banner-dismissed', BLACK_FRIDAY.code);
            setVisible(false);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
