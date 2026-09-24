import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { apply, contact } from '@/lib/saas-links';

// FIX_PROD_131 — footer de-cluttered: 7 columns (~33 SEO-stuffed links) + a
// redundant facility banner → brand + 4 focused columns. The facility banner was
// duplicate (the home page already has a full Facilities section); the Charlotte/
// pet SEO landing pages stay reachable via the Header "Services" dropdown, so no
// page is orphaned. Motto elevated; single "Sign in" (top nav); legal row tightened.
export default function Footer() {
  return (
    <footer className="bg-ink-section">
      <div className="container-x py-16 grid grid-cols-2 lg:grid-cols-6 gap-10">
        {/* Brand */}
        <div className="col-span-2">
          <div className="flex items-center gap-3">
            <img src="/brand/logo-cream.svg" alt="Tassy Transportation" className="h-10 w-10 shrink-0" />
            <div>
              <div className="serif text-xl font-semibold leading-none">Tassy Transportation</div>
              {/* FIX_PROD_131 — motto replaces the redundant "Premium Transport" tagline */}
              <div className="serif italic text-sm mt-1" style={{ color: 'var(--gold)' }}>
                We Transport With Care.
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

        {/* Services */}
        <div>
          <div className="eyebrow opacity-60 text-current">Services</div>
          <ul className="mt-3 space-y-2 text-sm">
            {/* These names lagged the Recovery/Concierge split by a fortnight.
                /vip is Tassy Concierge and /recover is Tassy Recovery — the
                footer was still calling them VIP Concierge and Tassy Guardian,
                which is the retired line, on every page of the site. */}
            <li><Link href="/nemt" className="hover:text-[color:var(--gold-warm)]">Tassy Care</Link></li>
            <li><Link href="/recover" className="hover:text-[color:var(--gold-warm)]">Tassy Recovery</Link></li>
            <li><Link href="/vip" className="hover:text-[color:var(--gold-warm)]">Tassy Concierge</Link></li>
            <li><Link href="/winnie" className="hover:text-[color:var(--gold-warm)]">Winnie Ride</Link></li>
            <li><Link href="/school" className="hover:text-[color:var(--gold-warm)]">Tassy Scholar</Link></li>
            <li><Link href="/pricing" className="hover:text-[color:var(--gold-warm)]">Pricing</Link></li>
          </ul>
        </div>

        {/* Careers */}
        <div>
          <div className="eyebrow opacity-60 text-current">Careers</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={apply.driver} className="hover:text-[color:var(--gold-warm)]">Drive with Tassy</a></li>
            <li><a href={apply.companion} className="hover:text-[color:var(--gold-warm)]">Become a companion</a></li>
            <li><a href={apply.cna} className="hover:text-[color:var(--gold-warm)]">Become a CNA</a></li>
            <li><a href={apply.salesRep} className="hover:text-[color:var(--gold-warm)]">Become a sales rep</a></li>
            {/* A 404 on every page of the site until 2026-09-24. `/careers`
                was never built here — the hiring reference doc specifies it as
                a marketing page and the marketing repo does not have one. Until
                it does, this points at the careers index that actually answers,
                so the one link a browsing candidate clicks is not a dead end.
                Swap it back to a local <Link href="/careers"> the day that page
                ships. */}
            <li>
              <a
                href={apply.careers}
                className="inline-flex items-center gap-1 hover:text-[color:var(--gold-warm)]"
              >
                View all careers <ArrowRight size={13} />
              </a>
            </li>
          </ul>
        </div>

        {/* Partners */}
        <div>
          <div className="eyebrow opacity-60 text-current">Partners</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={apply.facility} className="hover:text-[color:var(--gold-warm)]">Facility partners</a></li>
            <li><Link href="/partners" className="hover:text-[color:var(--gold-warm)]">Partner with Tassy</Link></li>
            {/* FIX_PROD_142 (SECURITY) — removed the "Existing facility" shortcut: it linked
                straight to the SaaS login (portal.facilityLogin → /login?intent=facility),
                exposing an internal admin surface as a public, crawl-indexable marketing link.
                Onboarded facilities already have their credentials + the app URL; the marketing
                site must not advertise the login. */}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <div className="eyebrow opacity-60 text-current">Contact</div>
          {/* FIX_PROD_143 — break-words (inherited): partners@tassytrucks.com is a
              179px unbreakable token in a ~150px grid column at 375px, which pushed
              the document to 386px wide. */}
          <ul className="mt-3 space-y-2 text-sm break-words">
            <li><a href={contact.phone} className="hover:text-[color:var(--gold-warm)]">{contact.phoneDisplay}</a></li>
            <li><a href={contact.bookingEmail} className="hover:text-[color:var(--gold-warm)]">book@tassytrucks.com</a></li>
            <li><a href={contact.salesEmail} className="hover:text-[color:var(--gold-warm)]">partners@tassytrucks.com</a></li>
            <li className="opacity-60 pt-2">Charlotte, NC</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="container-x flex flex-col sm:flex-row justify-between items-center gap-2 text-xs opacity-60">
          <div>© {new Date().getFullYear()} Tassy Trucks LLC · DBA Tassy Transportation · SDVOSB Certified</div>
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
