import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Car, HeartHandshake, Stethoscope, Briefcase } from 'lucide-react';
import { apply, contact } from '@/lib/saas-links';

/**
 * The careers hub. Shipped 2026-10-01 to retire a stopgap.
 *
 * components/Footer.tsx carried "View all careers" pointing at the SaaS
 * careers index, with a note on it since 2026-09-24 saying to replace it with a
 * local route the day one existed. It never did, so every candidate browsing
 * the site was handed off to a vercel.app domain before they had read a word
 * about the roles.
 *
 * WHY THE FOUR APPLY BUTTONS STILL CROSS TO THE SAAS, and why that is the
 * right call rather than an unfinished one:
 *
 *   The SaaS careers routes write to tassy_archive.*_applications on the TASSY
 *   project — the live database — and hold 16 real applications (driver 8, cna
 *   3, sales_rep 3, companion 2). On submit they mint an onboarding token via
 *   @/server/onboarding-tokens and email the applicant a magic link into the
 *   training wizard. There is no public.*_applications table to be kept out
 *   of: the archive IS the applications table.
 *
 *   That is the opposite of what facility signup was doing. A facility created
 *   in tassy_archive.accounts could never be joined to a trip, because
 *   trip_requests.facility_id is a FOREIGN KEY to public.facilities.id — so
 *   that funnel HAD to move in-house (lib/partner-links.ts). An application
 *   has no such break. Rebuilding these four forms here would fork the
 *   applicant onboarding flow to win nothing but a nicer URL.
 *
 * So this page's job is the reading, and the SaaS's job is the form. Revisit
 * only if the onboarding token flow ever moves into this repo.
 */

export const metadata: Metadata = {
  title: 'Careers — Drive, Care and Sell with Tassy Transportation',
  description:
    'Open roles at Tassy Transportation in Charlotte: drivers, ride companions, CNAs and sales reps. Veteran-owned, HIRE Vets Gold. Apply in about five minutes.',
  alternates: { canonical: '/careers' },
  robots: { index: true, follow: true },
};

const ROLES = [
  {
    icon: Car,
    title: 'Driver',
    href: apply.driver,
    line: 'Tassy Care, Scholar and Concierge',
    body:
      'You run scheduled trips — a dialysis run, a school route, an airport pickup — not a queue of strangers. Routes are assigned the day before, so you know your week. Own vehicle or ours, depending on the line.',
    needs: ['Clean driving record', 'Own insurance if you drive your own car', 'Comfortable with a phone app'],
  },
  {
    icon: HeartHandshake,
    title: 'Ride companion',
    href: apply.companion,
    line: 'Tassy Concierge',
    body:
      'You ride with the passenger, not instead of the driver. Walking someone from the waiting room to the car, carrying the bag, staying through the appointment when the family asked for it.',
    needs: ['Patient with older adults', 'Reliable to the minute', 'No medical licence required'],
  },
  {
    icon: Stethoscope,
    title: 'CNA',
    href: apply.cna,
    line: 'Tassy Recovery and Care',
    body:
      'Trips where the passenger needs a certified pair of hands — after a procedure, or a wheelchair transfer. You are assigned to the trip alongside a driver, so you are never doing both jobs at once.',
    needs: ['Current NC CNA listing', 'Transfer and securement experience', 'Clears a background check'],
  },
  {
    icon: Briefcase,
    title: 'Sales rep',
    href: apply.salesRep,
    line: 'Facility accounts',
    body:
      'You open clinics, dialysis centers, vet practices and senior living. Commission is residual — the accounts you bring keep paying while they keep riding, and the referral is tracked by your own link, not by memory.',
    needs: ['Sold into healthcare before', 'Charlotte metro', 'Works a pipeline without being chased'],
  },
] as const;

export default function CareersPage() {
  return (
    <section>
      <div className="container-x py-16 lg:py-24 max-w-4xl">
        <div className="eyebrow">Join us</div>
        <h1 className="h-section mt-3">Careers at Tassy Transportation</h1>

        <p className="mt-5 ink-soft leading-relaxed max-w-2xl">
          We are a veteran-owned Charlotte transportation company and a 2023 HIRE Vets Medallion
          Gold winner. We hire for reliability over experience, and we say the pay out loud before
          you apply. Veterans and military spouses are encouraged to apply.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {ROLES.map(({ icon: Icon, title, href, line, body, needs }) => (
            <div key={title} className="card-tile flex flex-col p-6">
              <Icon size={22} aria-hidden="true" style={{ color: 'var(--gold)' }} />
              <h2 className="serif mt-4 text-2xl font-semibold">{title}</h2>
              <div className="eyebrow mt-1 opacity-70">{line}</div>

              <p className="ink-soft mt-4 flex-1 text-sm leading-relaxed">{body}</p>

              <ul className="mt-5 space-y-1.5 text-sm ink-mute">
                {needs.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>

              {/* Crosses to the SaaS form on purpose — see the note at the top
                  of this file. rel=noopener because it leaves the origin. */}
              <a
                href={href}
                rel="noopener"
                className="btn-gold mt-6 inline-flex items-center justify-center gap-1.5 text-sm"
              >
                Apply <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-tile border border-line p-6">
          <h2 className="serif text-xl font-semibold">What happens after you apply</h2>
          <ol className="ink-soft mt-4 space-y-2 text-sm leading-relaxed">
            <li>
              <strong>1.</strong> You get an emailed link to the onboarding steps for your role.
              Open it when you have ten minutes — there is no password.
            </li>
            <li>
              <strong>2.</strong> We check the documents the role needs: licence, insurance,
              CNA listing. This is the step that takes the longest, so send clear photos.
            </li>
            <li>
              <strong>3.</strong> A short call, then your first assigned trip.
            </li>
          </ol>
          <p className="ink-mute mt-5 text-sm">
            Applied and heard nothing? That is on us, not you — call{' '}
            <a className="underline" href={contact.phone}>
              {contact.phoneDisplay}
            </a>{' '}
            or email{' '}
            <a className="underline" href={contact.bookingEmail}>
              book@tassytrucks.com
            </a>
            .
          </p>
        </div>

        <p className="ink-mute mt-10 text-sm">
          Running a clinic, practice or senior community instead?{' '}
          <Link className="underline" href="/partners">
            Partner with us
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
