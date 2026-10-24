'use client';

import { useEffect } from 'react';

/**
 * Tells the CSS when the page has been scrolled, by setting `data-hdr-scrolled` on <html>.
 * The header shrinks from that (see `.site-header` in app/globals.css). It renders nothing,
 * and without JavaScript the header simply stays full size.
 *
 * Two thresholds, not one, so a finger resting near the line cannot make it flicker.
 */
const ON_AT = 40;
const OFF_AT = 8;

export default function HeaderScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    let on = false;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const y = window.scrollY;
      const next = on ? y > OFF_AT : y > ON_AT;
      if (next === on) return;
      on = next;
      if (on) root.setAttribute('data-hdr-scrolled', '');
      else root.removeAttribute('data-hdr-scrolled');
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      root.removeAttribute('data-hdr-scrolled');
    };
  }, []);
  return null;
}
