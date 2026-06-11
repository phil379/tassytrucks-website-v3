import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Veteran Medical Transport in Charlotte NC | Tassy Trucks',
  description:
    'Veteran medical transport in Charlotte NC from a Service-Disabled Veteran-Owned company. Rides to VA and community care appointments. Call (704) 941-8508.',
  alternates: { canonical: '/charlotte/veteran-transport' },
  openGraph: { images: ['/og-image/veteran-transport'] },
};

const CTA_HREF = seoBook('nemt', { source: 'seo-veteran', payer: 'va' });

export default function VeteranTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="veteran medical transport charlotte"
      eyebrow="Veteran Transport · Charlotte, North Carolina"
      h1="Veteran Medical Transport in Charlotte — Driven by a Veteran-Owned Company"
      heroSubtitle="Scheduled rides to VA and community care appointments across the Charlotte area, from a Service-Disabled Veteran-Owned Small Business that treats every rider like one of our own."
      quickAnswer="Tassy Trucks provides veteran medical transport across Charlotte and Mecklenburg County — scheduled, door-to-door rides to VA appointments and VA-authorized community care visits. We are a Service-Disabled Veteran-Owned Small Business (SDVOSB), so the company driving you is veteran-owned itself. Dispatch answers 24/7 at (704) 941-8508."
      ctaText="Book veteran transport"
      ctaHref={CTA_HREF}
      schemaServiceType="Veteran Medical Transportation"
      trustExtras={['Veteran-owned', 'Charlotte-based', '24/7 dispatch']}
      sections={[
        {
          h2: 'A veteran-owned company driving veterans',
          body: (
            <>
              <p>
                Tassy Trucks is a certified <strong>Service-Disabled
                Veteran-Owned Small Business</strong> operating under USDOT
                #3104152 and MC #79222, based right here in Charlotte. That is
                not a logo we added for marketing — it is who founded the
                company and how it runs. When a veteran books a ride with us,
                they are riding with a company built by someone who has worn the
                uniform, filled out the same paperwork, and sat in the same
                waiting rooms.
              </p>
              <p>
                That shows up in small, practical ways. Drivers who show up
                early instead of on time. Pickups confirmed the day before, not
                left to chance. Straight answers from dispatch instead of a
                phone tree. Veterans in the Charlotte area have earned reliable
                transportation to their medical care, and our job is simply to
                provide it — professionally, punctually, and without fuss.
              </p>
            </>
          ),
        },
        {
          h2: 'Rides to VA appointments and community care visits',
          body: (
            <>
              <p>
                Much of a veteran&rsquo;s care happens at VA facilities — and
                getting to those appointments is the trip we run most. We
                provide scheduled, door-to-door transport to VA clinics and
                medical centers serving the Charlotte area, including trips that
                start early and run long. Your driver helps you from your front
                door to the vehicle, gets you to check-in with time to spare,
                and confirms the return pickup before leaving.
              </p>
              <p>
                Veterans also receive care outside VA walls. At a high level,
                the VA Community Care Network allows the VA to authorize care
                with community providers when a VA facility can&rsquo;t provide
                the needed care in a timely manner or within a reasonable
                distance. That means many Charlotte veterans have appointments
                at local hospitals, specialty clinics, and imaging centers
                around town — the same kinds of trips we run every day as part
                of our{' '}
                <a href="/charlotte/nemt-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  NEMT service in Charlotte
                </a>
                . Wherever the VA sends you for care, we can get you there.
              </p>
            </>
          ),
          subSections: [
            {
              h3: 'What to expect on ride day',
              body: (
                <p>
                  Booking takes about two minutes online or one phone call. We
                  confirm the trip the day before, and your driver arrives ahead
                  of the pickup window — not inside it. You ride in a clean,
                  properly insured vehicle with a driver who knows the
                  destination, including which entrance the clinic actually uses.
                  After the appointment, the return pickup is already arranged;
                  if your visit runs long, dispatch adjusts rather than leaving
                  you waiting at the curb. No pity, no fuss, no being treated
                  like cargo — just a dependable ride handled the way a mission
                  brief would be: planned, confirmed, and executed on time.
                </p>
              ),
            },
          ],
        },
        {
          h2: 'Ambulatory and wheelchair-accessible vehicles',
          body: (
            <>
              <p>
                Some riders walk to the vehicle with a steady arm; others use a
                wheelchair full-time. We run both ambulatory and
                wheelchair-accessible vehicles, and dispatch will ask a few
                quick questions when you book to put you in the right one the
                first time. Door-to-door is our standard on every trip — drivers
                help with entryways, steps, and getting checked in, not just the
                curb. Details on accessible vehicles are on our{' '}
                <a href="/charlotte/wheelchair-transport" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  wheelchair transport page
                </a>
                .
              </p>
              <p>
                For veterans with standing appointments — physical therapy
                blocks, recurring specialty visits, regular lab work — we set
                the whole series at once with recurring scheduling. Same pickup
                window, same routine, no re-booking every week.
              </p>
            </>
          ),
        },
        {
          h2: 'For VA case managers and care coordinators',
          body: (
            <>
              <p>
                If you coordinate care for veterans in the Charlotte area, you
                know the failure mode: an appointment that took weeks to secure,
                missed because the ride fell through. We work with facility and
                program coordinators who need a transport partner that confirms
                trips in advance, communicates by phone and email, and reports
                honestly when something changes. Our 24/7 dispatch line, (704)
                941-8508, is answered by a person — which matters when a pickup
                needs to move at 6 a.m.
              </p>
              <p>
                We support standing schedules, multi-stop days, and
                wheelchair-accessible trips, and we document what coordinators
                need documented. If your organization arranges transport for
                multiple veterans, our{' '}
                <a href="/partners" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  facility partnership page
                </a>{' '}
                explains how a standing arrangement works, or email{' '}
                <a href="mailto:booking@tassytrucks.com" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  booking@tassytrucks.com
                </a>{' '}
                and we will set up a call.
              </p>
            </>
          ),
        },
        {
          h2: 'Where we drive',
          body: (
            <p>
              Our home base is Charlotte, and we cover all of Mecklenburg County
              plus the surrounding towns where Charlotte-area veterans actually
              live: Matthews, Pineville, Huntersville, Concord, and Gastonia.
              Whether your appointment is at a VA clinic, a major hospital
              campus like Atrium Health or Novant Health, or a community
              specialist in Ballantyne or University City, it is a route we
              know. For trips beyond our standard range, call dispatch and we
              will quote it case by case — see our{' '}
              <a href="/pricing" className="underline decoration-[color:var(--gold)] underline-offset-2">
                pricing page
              </a>{' '}
              for how fares work.
            </p>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Will the VA or Community Care Network pay for my ride?',
          a: 'Coverage and authorization come through the VA and your case manager, not through us — we cannot authorize VA benefits ourselves. The honest answer is: it depends on your situation. Call us at (704) 941-8508, tell us what your case manager has said, and we will walk through your options, including private-pay if authorization is not available.',
        },
        {
          q: 'Is Tassy Trucks actually veteran-owned?',
          a: 'Yes. Tassy Trucks is a certified Service-Disabled Veteran-Owned Small Business (SDVOSB) operating under USDOT #3104152 and MC #79222. The company is veteran-founded and Charlotte-based, and medical transport is our core business.',
        },
        {
          q: 'Can you handle recurring rides to ongoing treatment?',
          a: 'Yes — recurring scheduling is standard. We book the full series in one call, whether that is weekly physical therapy, recurring specialty visits, or any other standing appointment, with the same pickup window each time.',
        },
        {
          q: 'Do you have wheelchair-accessible vehicles?',
          a: 'Yes. We run both ambulatory and wheelchair-accessible vehicles. Tell dispatch about any mobility equipment when you book and we will assign the right vehicle the first time.',
        },
        {
          q: 'Can a family member or case manager book on my behalf?',
          a: 'Absolutely. Family members and care coordinators book for veterans every day. The person booking gets the confirmation and driver updates; the veteran gets the ride. Call (704) 941-8508 or email booking@tassytrucks.com to set it up.',
        },
      ]}
      relatedLinks={[
        { label: 'NEMT in Charlotte', href: '/charlotte/nemt-rides' },
        { label: 'Wheelchair transport', href: '/charlotte/wheelchair-transport' },
        { label: 'Facility partnerships', href: '/partners' },
        { label: 'NEMT service overview', href: '/nemt' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
