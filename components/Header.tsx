import Link from 'next/link';
import { ArrowRight, ChevronDown, Phone } from 'lucide-react';
import { portal, contact, book } from '@/lib/saas-links';

const nav = [
  { href: '/#how', label: 'How it works' },
  { href: '/partners', label: 'Partners' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#founder', label: 'About' },
];

const servicesMenu: Array<{ heading: string; links: Array<{ href: string; label: string }> }> = [
  {
    heading: 'Medical transport',
    links: [
      { href: '/charlotte/nemt-rides', label: 'NEMT rides' },
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
      { href: '/school', label: 'Tassy School · Student transport' },
    ],
  },
];

export default function Header() {
  return (
    <header className="border-b border-line bg-bg/95 sticky top-0 z-30 backdrop-blur">
      <div className="container-x py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="logo-mark">
            {/* Replace with /tassy-logo.jpg once placed in public/ */}
            <span className="serif font-bold text-[color:var(--gold)] text-xl">T</span>
          </div>
          <div>
            <div className="serif text-xl font-semibold leading-none">Tassy Transportation</div>
            <div className="text-[10px] tracking-eyebrow uppercase ink-mute mt-1">
              Premium Transport · Veteran-Owned
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
              <div className="bg-surface border border-line rounded-card shadow-[0_16px_40px_-16px_rgba(27,26,23,0.25)] p-6 grid grid-cols-2 gap-8 w-[34rem]">
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
          <a href={portal.login} className="btn-ghost hidden sm:inline-flex text-sm">
            Sign in
          </a>
          <a href={book.quick} className="btn-gold text-sm">
            Book a Ride <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </header>
  );
}
