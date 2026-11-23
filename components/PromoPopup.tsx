'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BLACK_FRIDAY, blackFridayActive } from '@/lib/promo';

/**
 * The Black Friday welcome card (Phil, 2026-11-23 — his Macy's-style idea, approved from
 * Muse's mock): a gold gift with a red ribbon, shown once per session when a visitor
 * arrives, inside the offer window only (lib/promo.ts). Dismissible three ways — the ×,
 * "No thanks", or a click on the dimmed page — and "Book your ride" goes straight to the
 * form. Never shown on transactional pages (the booking form itself, payment, receipts,
 * ops, facility), where the price panel already carries the offer. The thin top banner
 * (components/PromoBanner.tsx) stays up regardless; this card is the greeting, not the
 * only notice. Like the banner, it removes itself when the window closes — no deploy.
 */

const SEEN_KEY = 'promo-popup-seen';
const EXCLUDED_PREFIXES = ['/request', '/pay', '/r/', '/ops', '/facility'];

const GOLD = '#C8932E';
const CREAM = '#F4EFE0';
const RED_BAND = 'linear-gradient(180deg, #E33244, #B81B29)';
const RED = '#D2202F';

function Gift() {
  const band: CSSProperties = {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    width: 36, top: 0, bottom: 0, background: RED_BAND,
  };
  const loop: CSSProperties = {
    position: 'absolute', top: 6, width: 62, height: 34,
    border: `9px solid ${RED}`, borderRadius: '50%',
  };
  return (
    <div style={{ margin: '20px auto 4px', width: 190 }} aria-hidden="true">
      <div style={{ position: 'relative', height: 44 }}>
        <div style={{ ...loop, left: 34, transform: 'rotate(-24deg)' }} />
        <div style={{ ...loop, right: 34, transform: 'rotate(24deg)' }} />
        <div style={{
          position: 'absolute', left: '50%', top: 14, transform: 'translateX(-50%)',
          width: 26, height: 26, borderRadius: 8, background: RED,
        }} />
      </div>
      <div style={{
        height: 36, borderRadius: 9, position: 'relative',
        background: 'linear-gradient(180deg, #F8CD6A, #E5A93B)',
        boxShadow: '0 3px 8px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.45)',
      }}>
        <div style={band} />
      </div>
      <div style={{
        margin: '5px 10px 0', height: 104, borderRadius: 10, position: 'relative',
        background: 'linear-gradient(180deg, #F6C453, #E39A1E 55%, #C07F10)',
        boxShadow: '0 14px 28px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.35)',
      }}>
        <div style={band} />
      </div>
      <div style={{
        margin: '10px auto 0', width: 150, height: 12, borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(200,147,46,0.35), transparent 70%)',
      }} />
    </div>
  );
}

export default function PromoPopup() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  const excluded = EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (excluded) return;
    if (sessionStorage.getItem(SEEN_KEY) === BLACK_FRIDAY.code) return;
    if (!blackFridayActive(new Date())) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(SEEN_KEY, BLACK_FRIDAY.code);
      setVisible(true);
      requestAnimationFrame(() => setEntered(true));
    }, 700);
    return () => clearTimeout(t);
  }, [excluded]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible || excluded) return null;

  const close = () => setVisible(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Black Friday — 10% off every ride booked by Sunday, November 29"
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(5,6,8,0.66)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18,
        opacity: entered ? 1 : 0, transition: 'opacity 220ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 520,
          background: '#0D1117', border: `1.5px solid ${GOLD}`, borderRadius: 22,
          boxShadow: '0 30px 80px rgba(0,0,0,0.65), 0 0 0 6px rgba(200,147,46,0.08)',
          padding: '34px 40px 30px', textAlign: 'center', color: CREAM,
          transform: entered ? 'scale(1)' : 'scale(0.96)', transition: 'transform 220ms ease',
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss the Black Friday offer"
          style={{
            position: 'absolute', top: 10, right: 16, background: 'none', border: 'none',
            fontSize: 26, lineHeight: 1, color: 'rgba(244,239,224,0.65)', cursor: 'pointer',
          }}
        >
          ×
        </button>
        <div style={{ color: GOLD, fontWeight: 800, letterSpacing: '0.34em', fontSize: 15, textIndent: '0.34em' }}>
          BLACK FRIDAY
        </div>
        <Gift />
        <div className="serif" style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.02, marginTop: 14 }}>
          10<span style={{ color: GOLD }}>%</span> OFF
        </div>
        <div style={{ marginTop: 10, fontSize: 19, fontWeight: 600 }}>
          every ride booked by Sunday, Nov 29
        </div>
        <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(244,239,224,0.78)' }}>
          Applied automatically when you book — no code needed,
          and the discount shows on your receipt.
        </p>
        <Link
          href="/request"
          onClick={close}
          style={{
            display: 'inline-block', marginTop: 22, background: GOLD, color: '#14100a',
            fontWeight: 700, fontSize: 16.5, padding: '14px 34px', borderRadius: 12,
            textDecoration: 'none',
          }}
        >
          Book your ride
        </Link>
        <button
          type="button"
          onClick={close}
          style={{
            display: 'block', margin: '14px auto 0', background: 'none', border: 'none',
            fontSize: 13, color: 'rgba(244,239,224,0.55)', textDecoration: 'underline', cursor: 'pointer',
          }}
        >
          No thanks, I'll browse first
        </button>
      </div>
    </div>
  );
}
