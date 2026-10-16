import Link from 'next/link';
import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoRequest } from '@/lib/request-links';
// Derived, never typed — see the note in app/page.tsx. This page sells the
// Tassy Care card as it is; there is deliberately no separate "treatment"
// price, so there is nothing here that can drift from lib/quote.ts.
import { CARE, dollars } from '@/lib/quote';

const FROM = dollars(CARE.bands[0].cents);
const TOP = dollars(CARE.bands[CARE.bands.length - 1].cents);

export const metadata: Metadata = {
  title: 'Chemotherapy & Infusion Rides in Charlotte NC',
  description: `Rides to and from chemotherapy, infusion and radiation in Charlotte NC. Flat rate by distance from ${FROM} each way, set up once for the whole course. Veteran-owned. (704) 941-8508.`,
  alternates: { canonical: '/charlotte/chemotherapy-transport' },
  openGraph: { url: '/charlotte/chemotherapy-transport' },
};

const CTA_HREF = seoRequest('nemt', { source: 'seo-treatment', recurring: '1' });

export default function ChemotherapyTransportPage() {
  return (
    <LandingPageShell
      canonicalPath="/charlotte/chemotherapy-transport"
      primaryKeyword="chemotherapy transportation charlotte"
      eyebrow="Treatment-day rides · Charlotte, North Carolina"
      h1="Rides to Chemotherapy and Infusion in Charlotte — Calm, Clean, and Set Up Once"
      heroSubtitle="Door-to-door rides to and from chemotherapy, infusion and radiation, booked for the whole course at a flat price you know before the first appointment."
      quickAnswer={`Tassy Transportation drives Charlotte patients to and from chemotherapy, infusion and radiation. It is Tassy Care: a flat price by distance, from ${FROM} to ${TOP} each way inside 30 miles, agreed before we move. A round trip is two rides. Weekly or recurring treatment can be booked once as a series, with dispatch answering at (704) 941-8508.`}
      ctaText="Set up treatment-day rides"
      ctaHref={CTA_HREF}
      schemaServiceType="Treatment Day Patient Transportation"
      sections={[
        {
          h2: 'What a treatment day asks of a ride',
          body: (
            <>
              <p>
                A treatment day is long and it is tiring. You may leave the
                house early, sit in a chair for hours, and come out wanting
                nothing except to be home. The ride should be the easiest part
                of the day, not another thing to manage — a clean car, a
                driver who is on time and calm, and a price that is not a
                surprise.
              </p>
              <p>
                That is what we build the ride around. It is our standard{' '}
                <Link href="/nemt" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Tassy Care
                </Link>{' '}
                service, planned in advance and priced by distance, with a few
                things we do on purpose for treatment days: we keep the car
                fragrance-free, we come to the door, and we help you inside and
                seated at the other end.
              </p>
            </>
          ),
        },
        {
          h2: 'The price, plainly',
          body: (
            <>
              <p>
                There is no separate &ldquo;cancer care&rdquo; surcharge.
                Treatment rides cost what every Tassy Care ride costs: {FROM}{' '}
                for anything inside 3 miles, rising by distance to {TOP} for
                runs up to 30 miles. The number is agreed before we move and it
                does not change because traffic was slow.
              </p>
              <p>
                A round trip is two rides, priced separately, so the ride home
                is quoted before you leave and you are not paying for a driver
                to sit in a parking lot while you are in the chair. If you
                treat every week, ask about the standing ride plan on our{' '}
                <Link href="/pricing" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  pricing page
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'Set up the whole course once',
          body: (
            <>
              <p>
                Most treatment runs on a rhythm: every week, every other week,
                five days in a row for radiation. Tell us the pattern and the
                cancer center or infusion clinic and we set up the series in
                one booking, with the same pickup window each time and, when
                schedules allow, the same driver, so the face at your door is a
                familiar one.
              </p>
              <p>
                Infusion times are hard to predict. Give us your estimated
                finish time when you book, and call dispatch at (704) 941-8508
                when you are close to done or running long — it is answered all
                day and night.
              </p>
            </>
          ),
        },
        {
          h2: 'What we do not do',
          body: (
            <>
              <p>
                Our drivers provide courtesy assistance — an arm to hold, help
                with doors and steps, carrying a bag — not medical care, and
                they are not nurses or aides. Anything clinical stays with your
                care team.
              </p>
              <p>
                We do not carry stretcher or bed-level passengers, and we do
                not publish a rate for hospice or palliative transport, because
                what those riders need varies too much to price from a form.
                Call (704) 941-8508 and we will tell you honestly whether we
                are the right ride, and quote it on the call if we are. We also
                never ask for a diagnosis, a drug name, or a medical record
                number — only where to pick you up and where you are going.
              </p>
            </>
          ),
        },
        {
          h2: 'For family members and cancer-center social workers',
          body: (
            <p>
              Many of these rides are arranged by a son, daughter or a
              hospital social worker rather than the patient. You can book on
              someone&rsquo;s behalf and receive the confirmations yourself —
              the patient just gets the ride. Centers that send us patients
              regularly can set up an account with monthly invoicing; see our{' '}
              <Link href="/partners" className="underline decoration-[color:var(--gold)] underline-offset-2">
                facility partnership page
              </Link>{' '}
              or email book@tassytrucks.com.
            </p>
          ),
        },
      ]}
      faqs={[
        {
          q: 'How much does a ride to chemotherapy cost in Charlotte?',
          a: `It is a flat price by distance, from ${FROM} one way inside 3 miles up to ${TOP} for runs up to 30 miles, agreed before the ride. There is no extra charge for treatment rides. A round trip is two rides.`,
        },
        {
          q: 'Can you set up rides for my whole course of treatment?',
          a: 'Yes. Tell us the pattern and the treatment center and we book the series once, with the same pickup window each day. If your schedule changes, one call updates it.',
        },
        {
          q: 'What if my infusion runs longer than expected?',
          a: 'Call dispatch at (704) 941-8508 when you know. We re-time the ride home around you. Give us your estimated finish when you book so the first plan is close.',
        },
        {
          q: 'Do your drivers provide medical care or help with a port or IV?',
          a: 'No. Drivers give courtesy help — an arm, a door, a bag — and are not medical staff. Anything clinical stays with your care team at the center.',
        },
        {
          q: 'Do you take stretcher or hospice patients?',
          a: 'We do not carry stretcher or bed-level passengers and we do not print a rate for hospice transport. Call (704) 941-8508 and we will tell you plainly whether we can help.',
        },
        {
          q: 'Do I have to tell you my diagnosis?',
          a: 'No. We never ask for a diagnosis, a medication, or a medical record number. We only need the pickup address, the destination, and the time.',
        },
      ]}
      relatedLinks={[
        { label: 'Dialysis transport', href: '/charlotte/dialysis-transport' },
        { label: 'NEMT in Charlotte', href: '/charlotte/nemt-rides' },
        { label: 'Tassy Care overview', href: '/nemt' },
        { label: 'Facility partnerships', href: '/partners' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
