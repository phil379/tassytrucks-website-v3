import Link from 'next/link';
import { ArrowRight, ChevronDown, Phone, Menu, X } from 'lucide-react';
import { contact, book } from '@/lib/saas-links';

// FIX_PROD_131 — nav trimmed 8→6 visible items: "How it works" moved into the
// Services dropdown (below) so the top bar stays calm.
const nav = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/partners', label: 'Partners' },
  { href: '/#founder', label: 'About' },
];

const servicesMenu: Array<{ heading: string; links: Array<{ href: string; label: string }> }> = [
  {
    heading: 'Medical transport',
    links: [
      { href: '/charlotte/nemt-rides', label: 'Tassy Care rides' },
      { href: '/charlotte/dialysis-transport', label: 'Dialysis transport' },
      { href: '/charlotte/wheelchair-transport', label: 'Wheelchair transport' },
      { href: '/charlotte/post-surgery-transport', label: 'Post-surgery transport' },
      { href: '/charlotte/veteran-transport', label: 'Veteran transport' },
      { href: '/charlotte/concierge-medical-transport', label: 'Concierge transport' },
      { href: '/charlotte/family-medical-rides', label: 'Book for a loved one' },
    ],
  },
  {
    heading: 'Winnie Ride · Pets',
    links: [
      { href: '/charlotte/pet-transport', label: 'Pet transport' },
      { href: '/charlotte/vet-appointment-rides', label: 'Vet appointment rides' },
      { href: '/charlotte/post-surgery-pet-transport', label: 'Post-surgery pet pickup' },
      { href: '/charlotte/calm-pet-transport', label: 'Calm pet transport' },
      { href: '/charlotte/dog-grooming-pickup', label: 'Grooming pickup' },
      { href: '/charlotte/pet-boarding-transport', label: 'Boarding transport' },
    ],
  },
  {
    heading: 'Schools',
    links: [
      { href: '/school', label: 'Tassy Scholar · Student transport' },
    ],
  },
];

export default function Header() {
  return (
    <header className="border-b border-line bg-bg/95 sticky top-0 z-30 backdrop-blur">
      <div className="container-x py-4 flex items-center justify-between">
        <Link href="/" aria-label="Tassy Transportation home" className="flex items-center gap-3">
          {/* FIX_PROD_137b — doubled again per Phil (was 44/56/64 → now 88/112/128px);
              framed to rhyme with the founder photo tile (rounded-tile · border-line ·
              overflow-hidden · object-cover). */}
          <span className="block shrink-0 h-[88px] w-[88px] md:h-28 md:w-28 lg:h-32 lg:w-32 rounded-tile border border-line overflow-hidden transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(27,26,23,0.2)]">
            <img
              src="/brand/logo-cream.svg"
              alt="Tassy Transportation — veteran-owned premium transport in Charlotte NC"
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          </span>
          {/* FIX_PROD_143 — hidden below sm. At 375px the row needed 398px inside a
              327px content box (logo 88 + this block 136 + right cluster 162), giving
              every page a 48px horizontal overflow. The logo stays at Phil's
              FIX_PROD_137b size and the Book-a-Ride CTA stays visible; the wordmark is
              already carried by the logo alt text + the Link aria-label, and returns
              at >=640px where it fits. */}
          <div className="hidden sm:block">
            <div className="serif text-xl font-semibold leading-none">Tassy Transportation</div>
            {/* FIX_PROD_131 — motto replaces the redundant "Premium Transport" tagline.
                FIX_PROD_137 — nudged up on desktop to balance the enlarged logo. */}
            <div className="serif italic text-[11px] lg:text-[13px] mt-1" style={{ color: 'var(--gold)' }}>
              We Transport With Care.
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {/* CSS-only hover dropdown — no client JS */}
          <div className="relative group">
            <Link href="/#services" className="nav-link inline-flex items-center gap-1">
              Services <ChevronDown size={13} className="mt-0.5" />
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 hidden group-hover:block group-focus-within:block z-40">
              <div className="bg-surface border border-line rounded-card shadow-[0_16px_40px_-16px_rgba(27,26,23,0.25)] p-6 w-[34rem]">
                <div className="grid grid-cols-2 gap-8">
                  {servicesMenu.map((col) => (
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
                <Link
                  href="/#how"
                  className="nav-link text-sm inline-flex items-center gap-1 mt-6 pt-4 border-t border-line w-full"
                >
                  How it works <ChevronDown size={13} className="-rotate-90 mt-0.5" />
                </Link>
              </div>
            </div>
          </div>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="nav-link">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={contact.phone}
            className="nav-link hidden md:inline-flex items-center gap-1.5 text-sm"
          >
            <Phone size={14} /> {contact.phoneDisplay}
          </a>
          {/* FIX_PROD_142 (SECURITY) — removed the "Sign in" link. It pointed at the SaaS
              login (portal.login → /login), a public discoverable link into an internal
              admin surface. Existing users have the app URL; the marketing site funnels
              to booking, not the backend login. */}
          <a href={book.ride} className="btn-gold text-sm">
            Book a Ride <ArrowRight size={16} />
          </a>

          {/* MEGA_TASSY_MARKETING_LAUNCH_TEARDOWN (Agents B + E) — before this, the
              whole nav was `hidden lg:flex`: below 1024px only the logo + "Book a
              Ride" rendered, so Services/Pricing/Partners/About were UNREACHABLE on
              phones & tablets. This <details> disclosure is server-only (no client
              JS) and gives full nav parity below lg. */}
          <details className="lg:hidden group/m relative">
            <summary
              className="list-none cursor-pointer inline-flex items-center justify-center h-11 w-11 rounded-md border border-line text-ink [&::-webkit-details-marker]:hidden"
              aria-label="Open navigation menu"
            >
              <Menu size={20} className="group-open/m:hidden" aria-hidden="true" />
              <X size={20} className="hidden group-open/m:block" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full mt-3 w-[min(21rem,calc(100vw-2rem))] bg-surface border border-line rounded-card shadow-[0_16px_40px_-16px_rgba(0,0,0,0.6)] p-5 z-50 max-h-[80vh] overflow-y-auto">
              {servicesMenu.map((col) => (
                <div key={col.heading} className="mb-4">
                  <div className="eyebrow !text-[10px]">{col.heading}</div>
                  <ul className="mt-2 space-y-1.5">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="nav-link text-sm block py-1">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="border-t border-line pt-4 mt-1 space-y-1.5">
                <Link href="/#how" className="nav-link text-sm block py-1">How it works</Link>
                {nav.map((n) => (
                  <Link key={n.href} href={n.href} className="nav-link text-sm block py-1">
                    {n.label}
                  </Link>
                ))}
              </div>
              {/* FIX_PROD_142 (SECURITY) — mobile menu no longer carries a "Sign in"
                  link to the SaaS login; only the public dispatch phone remains. */}
              <div className="border-t border-line pt-4 mt-4 flex flex-col gap-3">
                <a href={contact.phone} className="nav-link inline-flex items-center gap-2 text-sm">
                  <Phone size={15} /> {contact.phoneDisplay}
                </a>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
