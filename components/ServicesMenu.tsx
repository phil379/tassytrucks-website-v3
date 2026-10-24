'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export type ServicesColumn = { heading: string; links: Array<{ href: string; label: string }> };

/**
 * The "Services" menu in the top bar. Opens on hover or keyboard focus, as before, and can now be
 * dismissed with Escape (WCAG 1.4.13) without moving the pointer or the focus. It reports its
 * state to assistive technology with aria-expanded.
 */
export default function ServicesMenu({ columns }: { columns: ServicesColumn[] }) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hover || focus) && !dismissed;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setDismissed(false);
      }}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocus(false);
          setDismissed(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDismissed(true);
      }}
    >
      <Link href="/#services" className="nav-link inline-flex items-center gap-1" aria-haspopup="true" aria-expanded={open}>
        Services <ChevronDown size={13} className="mt-0.5" aria-hidden="true" />
      </Link>
      <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 z-40 ${open ? 'block' : 'hidden'}`}>
        <div className="bg-surface border border-line rounded-card shadow-[0_16px_40px_-16px_rgba(27,26,23,0.25)] p-6 w-[34rem]">
          <div className="grid grid-cols-2 gap-8">
            {columns.map((col) => (
              <div key={col.heading}>
                <div className="eyebrow !text-[10px]">{col.heading}</div>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="nav-link text-sm block">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* FIX_PROD_131 — "How it works" relocated here from the top nav */}
          <Link href="/#how" className="nav-link text-sm inline-flex items-center gap-1 mt-6 pt-4 border-t border-line w-full">
            How it works <ChevronDown size={13} className="-rotate-90 mt-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
