import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { contact } from '@/lib/saas-links';
import HouseholdRequestForm from '@/components/school/HouseholdRequestForm';

export const metadata: Metadata = {
  title: { absolute: 'Tassy Scholar — coming soon' },
  description:
    'Tassy Scholar, daily school transport for Charlotte families, is coming soon. Join the list and we will contact you when it opens.',
  alternates: { canonical: '/school' },
  openGraph: { type: 'website', url: '/school', images: ['/og-image/school'] },
};

/**
 * Tassy Scholar — COMING SOON (Phil, 2026-11-17).
 *
 * Scholar does not launch with the four money lines. This page used to sell
 * three plans with prices and send parents into the booking flow; all of that
 * is parked until Scholar's own launch. What remains public is what it will
 * be — morning and afternoon school runs on one monthly plan — and the JOIN
 * LIST: the existing household-request form and plumbing
 * (scholar_household_requests, pending_review), reframed as registering
 * interest. The form collects a lead. It does not book, charge, subscribe or
 * quote, and nothing on this page may suggest it does: no price, no plan
 * cards, no enrollment promise, no launch date.
 *
 * The district / EverDriven work further down is a different, operating
 * business and stays described as such.
 */

const STANDARDS = [
  ['Curb-to-curb', 'Picked up and dropped at the door — never left to find their own way.'],
  ['5-minute no-show', 'Driver waits, then calls you — your child is never abandoned at a curb.'],
  ['Hygiene', 'Clean, climate-controlled vehicles maintained on our medical-fleet schedule.'],
  ['Trusted handoff', 'Released only to an approved adult or school staff on your list.'],
  ['Professional conduct', 'Driver screening and onboarding requirements apply before service assignment.'],
  ['Safety practices', 'Safety practices and vehicle procedures are designed to support a secure ride experience.'],
  ['Consistent driver assignments', 'We aim to provide consistent driver assignments whenever operationally possible.'],
];

export default function SchoolPage() {
  return (
    <>
      {/* HERO — coming soon, and what it will be */}
      <section className="border-b border-line">
        <div className="container-x py-16 lg:py-24">
          <div className="eyebrow gold-text">Service line · Coming soon</div>
          <h1 className="h-display mt-4 max-w-3xl">
            Daily school transport. <span className="serif italic gold-text">Coming soon.</span>
          </h1>
          <p className="mt-5 text-xl lg:text-2xl ink-soft serif max-w-2xl">
            When it opens, Tassy Scholar will take your child to school in the morning and home
            again in the afternoon on one monthly plan — a recurring schedule, reviewed and
            confirmed before the first ride. It is not enrolling yet.
          </p>
          <div className="mt-9 flex gap-3 flex-wrap">
            <a href="#join-list" className="btn-gold">Join the Scholar list <ArrowRight size={16} /></a>
            <a href={contact.phone} className="btn-call"><Phone size={15} /> Call {contact.phoneDisplay}</a>
          </div>
          {/* MEGA_TASSY_PUBLISH_READY — brand motto on every service-line hero */}
          <p className="mt-8 serif italic text-lg ink-soft">
            We Transport With Care<span className="gold-text">.</span>
          </p>
        </div>
      </section>

      {/* JOIN LIST — the household-request form, framed as registering interest */}
      <section id="join-list" className="bg-cream border-b border-line">
        <div className="container-x py-16 lg:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="serif text-3xl font-semibold text-center">Join the Scholar list</h2>
            <p className="mt-3 text-center text-sm ink-soft">
              Tell us about your family and the plan you have in mind, and we will contact you
              when Tassy Scholar opens. Joining the list is not a booking: it does not charge
              you, reserve a seat, or promise a start date — it is how we learn how many
              families are waiting, and how we reach you first.
            </p>
            <div className="mt-10">
              <HouseholdRequestForm initialReasons={[]} planSlug={null} />
            </div>
          </div>
        </div>
      </section>

      {/* 7 SAFETY STANDARDS — the standards every Scholar ride will run on */}
      <section className="bg-ink-section">
        <div className="container-x py-16 lg:py-20">
          <div className="eyebrow opacity-70 text-current">How every ride will work</div>
          <h2 className="h-section mt-3 max-w-2xl">Seven standards on every school ride.</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-7">
            {STANDARDS.map(([title, body], i) => (
              <div key={title} className="flex gap-3">
                <span className="number-bullet shrink-0">{i + 1}</span>
                <div>
                  <h3 className="serif text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-sm opacity-75 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DISTRICT WORK — operating today, and a different product from the family plan */}
      <article>
        <section className="bg-cream">
          <div className="container-x py-14 lg:py-16">
            <div className="h-1 w-12 bg-gold mb-5" />
            <h2 className="serif text-3xl lg:text-4xl font-semibold tracking-tight2 max-w-3xl">
              The school routes we already run
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed ink-soft">
              <p>
                Alongside the family plan we are preparing, Tassy already runs alternative student
                transportation — the small-vehicle, high-accountability service for students an
                IEP, McKinney-Vento status, foster placement, or out-of-zone address keeps off the
                yellow bus. We&rsquo;ve operated these routes since 2022, today as a subcontractor
                to EverDriven Technologies, who hold the district relationships and dispatch the work.
              </p>
              <p>
                The division of labor is clean: EverDriven manages district compliance and routing;
                Tassy is the local vehicle and driver provider that executes every pickup and
                drop-off safely, on time, and on protocol — four-plus years of mornings where the
                vehicle showed up and the school day started the way it was supposed to.
              </p>
              <p>
                Coordinating routes or alternative student transport for a district? Reach our
                team directly at{' '}
                <a href={contact.bookingEmail} className="underline underline-offset-2">book@tassytrucks.com</a>{' '}
                or {contact.phoneDisplay}.
              </p>
            </div>
            <p className="mt-10 text-sm">
              <Link href="/" className="inline-block py-2 underline underline-offset-2 opacity-75 hover:opacity-100">
                Back to all six lines of care
              </Link>
            </p>
          </div>
        </section>
      </article>
    </>
  );
}
