import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { portal, contact, book } from '@/lib/saas-links';

const nav = [
  { href: '/#services', label: 'Services' },
  { href: '/#how', label: 'How it works' },
  { href: '/#facilities', label: 'For Facilities' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#founder', label: 'About' },
];

export default function Header() {
  return (
    <header className="border-b border-line bg-bg/95 sticky top-0 z-30 backdrop-blur">
      <div className="container-x py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="logo-mark">
            {/* Replace with /tassy-logo.jpg once placed in public/ */}
            <span className="serif font-bold text-[color:var(--gold-warm)] text-xl">T</span>
          </div>
          <div>
            <div className="serif text-xl font-semibold leading-none">Tassy Trucks</div>
            <div className="text-[10px] tracking-eyebrow uppercase ink-mute mt-1">
              Premium Transport · Veteran-Owned
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
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
