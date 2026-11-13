import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { apply, contact } from '@/lib/saas-links';
import { CAREERS_OPEN } from '@/lib/careers-gate';
import { partnerSignup } from '@/lib/partner-links';
import { BUSINESS, BUSINESS_LOCATION } from '@/lib/business';
import CookieSettingsButton from '@/components/CookieSettingsButton';

// FIX_PROD_131 — footer de-cluttered: 7 columns (~33 SEO-stuffed links) + a
// redundant facility banner → brand + 4 focused columns. The facility banner was
// duplicate (the home page already has a full Facilities section); the Charlotte/
// pet SEO landing pages stay reachable via the Header "Services" dropdown, so no
// page is orphaned. Motto elevated; single "Sign in" (top nav); legal row tightened.
export default function Footer() {
  return (
    <footer data-site-chrome className="bg-ink-section">
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
            {/* TODO(FMCSA): Phil's USDOT 3808299 / MC-1373369 are Inactive at FMCSA, so no USDOT/MC number is published on any public page. Add them back (footer, JSON-LD, trust chips) only once FMCSA shows Active. The USDOT/MC numbers that used to be here belonged to another company (Tassy Logistics LLC) and must never return; scripts/test-banned-claims.ts enforces that. */}
            <div>SDVOSB Certified · {BUSINESS_LOCATION}</div>
          </div>

          {/* The same two badges as the home page, smaller. Phil's files, unaltered; not links. */}
          <div data-testid="footer-trust-badges" className="mt-6 flex flex-wrap items-center gap-3">
            <img
              src="/brand/hirevets-2023-gold-banner.webp"
              alt="2023 HIRE Vets Medallion Award Gold Winner -- U.S. Department of Labor, HIREVets.gov"
              width={840}
              height={439}
              loading="lazy"
              className="block h-auto w-[220px] max-w-full rounded-md"
            />
            <img
              src="/brand/sba-sdvosb-certified.webp"
              alt="U.S. Small Business Administration -- Service-Disabled Veteran-Owned Certified"
              width={400}
              height={500}
              loading="lazy"
              className="block h-auto w-[92px]"
            />
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

        {/* Careers -- hidden while lib/careers-gate.ts is OFF (Phil, 2026-11-13). */}
        {CAREERS_OPEN ? (
        <div>
          <div className="eyebrow opacity-60 text-current">Careers</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={apply.driver} className="hover:text-[color:var(--gold-warm)]">Drive with Tassy</a></li>
            <li><a href={apply.companion} className="hover:text-[color:var(--gold-warm)]">Become a companion</a></li>
            <li><a href={apply.cna} className="hover:text-[color:var(--gold-warm)]">Become a CNA</a></li>
            <li><a href={apply.salesRep} className="hover:text-[color:var(--gold-warm)]">Become a sales rep</a></li>
            {/* Was a 404 until 2026-09-24, then a stopgap pointing at the
                SaaS careers index with a note saying "swap it back to a local
                <Link href="/careers"> the day that page ships". 2026-10-01:
                that page ships. The four role links above still cross to the
                SaaS forms ON PURPOSE -- they write to
                tassy_archive.*_applications on the Tassy project (16 real
                applications live there) and issue the applicant onboarding
                magic link from @/server/onboarding-tokens. Rebuilding them
                here would fork that flow for no gain. /careers is the hub that
                keeps a browsing candidate on tassytrucks.com until they
                actually apply. */}
            <li>
              <Link
                href="/careers"
                className="inline-flex items-center gap-1 hover:text-[color:var(--gold-warm)]"
              >
                View all careers <ArrowRight size={13} />
              </Link>
            </li>
          </ul>
        </div>
        ) : null}

        {/* Partners */}
        <div>
          <div className="eyebrow opacity-60 text-current">Partners</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href={partnerSignup({ source: 'footer' })}
                className="hover:text-[color:var(--gold-warm)]"
              >
                Facility partners
              </Link>
            </li>
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
            <li className="opacity-60 pt-2">{BUSINESS_LOCATION}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="container-x flex flex-col sm:flex-row justify-between items-center gap-2 text-xs opacity-60">
          <div>© {new Date().getFullYear()} {BUSINESS.legalName} · DBA {BUSINESS.tradeName} · SDVOSB Certified</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/privacy" className="hover:opacity-100">Privacy</Link>
            <Link href="/terms" className="hover:opacity-100">Terms</Link>
            <Link href="/refunds" className="hover:opacity-100">Refunds</Link>
            <Link href="/cookies" className="hover:opacity-100">Cookies</Link>
            <Link href="/accessibility" className="hover:opacity-100">Accessibility</Link>
            <CookieSettingsButton className="hover:opacity-100" />
            <Link href="/privacy/request" className="hover:opacity-100">Do not sell or share my info &amp; data requests</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
