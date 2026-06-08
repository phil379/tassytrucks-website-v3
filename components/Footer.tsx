import Link from 'next/link';
import { apply, contact, portal } from '@/lib/saas-links';

export default function Footer() {
  return (
    <footer className="bg-ink-section">
      <div className="container-x py-16 grid grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="col-span-2">
          <div className="flex items-center gap-3">
            <div className="logo-mark">
              <span className="serif font-bold text-[color:var(--gold-warm)] text-xl">T</span>
            </div>
            <div>
              <div className="serif text-xl font-semibold leading-none">Tassy Trucks</div>
              <div className="text-[10px] tracking-eyebrow uppercase mt-1 opacity-60">
                Premium Transport · Veteran-Owned
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm opacity-75 max-w-xs leading-relaxed">
            From hospital discharges to post-procedure concierge transport, Tassy moves the
            people who matter to you with discretion, dignity, and Army-grade reliability.
          </p>
          <div className="mt-6 text-xs opacity-60 space-y-1">
            <div>USDOT #3104152 · MC #79222</div>
            <div>SDVOSB Certified · Charlotte, North Carolina</div>
          </div>
        </div>

        <div>
          <div className="eyebrow opacity-60 text-current">Services</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/nemt" className="hover:text-[color:var(--gold-warm)]">NEMT</Link></li>
            <li><Link href="/vip" className="hover:text-[color:var(--gold-warm)]">VIP Concierge</Link></li>
            <li><Link href="/winnie" className="hover:text-[color:var(--gold-warm)]">Winnie Ride</Link></li>
            <li><Link href="/renew" className="hover:text-[color:var(--gold-warm)]">Tassy Renew</Link></li>
            <li><Link href="/recover" className="hover:text-[color:var(--gold-warm)]">Tassy Recover</Link></li>
            <li><Link href="/pricing" className="hover:text-[color:var(--gold-warm)]">Pricing</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow opacity-60 text-current">Partners</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={apply.facility} className="hover:text-[color:var(--gold-warm)]">Facility partners</a></li>
            <li><a href={apply.salesRep} className="hover:text-[color:var(--gold-warm)]">Become a sales rep</a></li>
            <li><a href={apply.driver} className="hover:text-[color:var(--gold-warm)]">Drive with Tassy</a></li>
            <li><a href={portal.facility} className="hover:text-[color:var(--gold-warm)]">Facility portal</a></li>
            <li><a href={portal.login} className="hover:text-[color:var(--gold-warm)]">Sign in</a></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow opacity-60 text-current">Contact</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={contact.phone} className="hover:text-[color:var(--gold-warm)]">{contact.phoneDisplay}</a></li>
            <li><a href={contact.bookingEmail} className="hover:text-[color:var(--gold-warm)]">booking@tassytrucks.com</a></li>
            <li><a href={contact.salesEmail} className="hover:text-[color:var(--gold-warm)]">partners@tassytrucks.com</a></li>
            <li className="opacity-60 pt-2">Charlotte, NC</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="container-x flex flex-col sm:flex-row justify-between items-center gap-2 text-xs opacity-60">
          <div>© {new Date().getFullYear()} Tassy Trucks LLC. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:opacity-100">Privacy</Link>
            <Link href="/terms" className="hover:opacity-100">Terms</Link>
            <Link href="/accessibility" className="hover:opacity-100">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
