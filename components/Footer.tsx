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
      {/* Large screens: the brand gets the widest column, and Contact is sized to its longest line
          (partners@tassytrucks.com) so no address ever breaks (Phil, 2026-11-14). */}
      <div
        className="container-x py-16 grid grid-cols-2 gap-10 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_max-content]"
      >
        {/* Brand. Phil, 2026-11-14: name and logo were too small. Logo 2x (80px; 64px on phones),
            name 30px (24px on phones), tagline scaled to match.
            Phil, 2026-11-22: logo still too small in the footer — enlarged again
            to 128px on desktop, 96px on phones. The asset is an SVG, so it stays sharp. */}
        <div className="col-span-2 lg:col-span-1">
          {/* Lockup stacks in the lg band (Phil's iPad screenshot, 2026-11-23): beside
              the 128px logo, the wordmark needs ~375px but the brand column has ~245px
              at 1024 (~300px at 1180), so "Transportation" spilled into the Services
              column and struck through "Tassy Recovery". Stacked — logo over a
              one-size-down wordmark — until 1500px, where the column is wide enough
              for the side-by-side lockup exactly as before. */}
          <div className="flex items-center gap-4 lg:flex-col lg:items-start min-[1500px]:flex-row min-[1500px]:items-center">
            <img src="/brand/logo-cream.svg" alt="Tassy Transportation" className="h-24 w-24 sm:h-32 sm:w-32 shrink-0" />
            <div>
              <div className="serif text-2xl sm:text-3xl lg:text-2xl min-[1500px]:text-3xl font-semibold leading-tight">Tassy Transportation</div>
              {/* FIX_PROD_131 — motto replaces the redundant "Premium Transport" tagline */}
              <div className="serif italic text-base sm:text-lg mt-1" style={{ color: 'var(--gold)' }}>
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
            {/* Sister service (Phil, 2026-11-23): T-Gigs is the gig-driver weekly-rental arm of
                the same company (Tassy Trucks LLC), and tgigs.app's footer already links back
                here — this is the reciprocal link. Deep link to the weekly-rental page, not
                the T-Gigs homepage, and no availability promise: that page shows live status. */}
            <li className="pt-2 mt-1 border-t border-white/10">
              <a
                href="https://www.tgigs.app/rent/weekly-car-rental-charlotte"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[color:var(--gold-warm)]"
              >
                T-Gigs — Weekly car rentals
              </a>
              <div className="text-xs opacity-60 mt-0.5">For gig drivers · Our sister service</div>
            </li>
          </ul>
        </div>

        {/* Careers. While lib/careers-gate.ts is OFF the column no longer
            disappears: /careers is a visible interest page (Phil, 2026-11-21),
            so the closed branch links there instead — and to nothing on the
            SaaS, whose application forms stay unreachable until hiring opens. */}
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
        ) : (
        <div>
          <div className="eyebrow opacity-60 text-current">Careers</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/careers"
                className="inline-flex items-center gap-1 hover:text-[color:var(--gold-warm)]"
              >
                Join the interest list <ArrowRight size={13} />
              </Link>
            </li>
          </ul>
        </div>
        )}

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

        {/* Contact. Every address and the phone number stay on ONE line (Phil, 2026-11-14:
            "partners@tassytrucks.co / m"). Phones: the column spans the full width, so the
            179px address fits even at 320px (FIX_PROD_143 had made it break instead). Tablets
            (2 columns) have room; large screens size this column to its content. */}
        <div className="col-span-2 sm:col-span-1">
          <div className="eyebrow opacity-60 text-current">Contact</div>
          <ul className="mt-3 space-y-2 text-sm whitespace-nowrap">
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
