import Link from 'next/link';
import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoRequest } from '@/lib/request-links';
// Derived, never typed — see the note in app/page.tsx. This page sells the
// Tassy Care Treatment Day card (a flat round trip), so every price below is
// read from lib/quote.ts and cannot drift from what the request form charges.
import { TREATMENT_DAY, dollars } from '@/lib/quote';

const FROM = dollars(TREATMENT_DAY.bands[0].cents);
const TOP = dollars(TREATMENT_DAY.bands[TREATMENT_DAY.bands.length - 1].cents);

export const metadata: Metadata = {
  title: 'Chemotherapy & Infusion Rides in Charlotte NC',
  description: `Rides to and from chemotherapy, infusion and radiation in Charlotte NC. Flat round trip from ${FROM}, both legs included, set up once for the whole course. Veteran-owned. (704) 941-8508.`,
  alternates: { canonical: '/charlotte/chemotherapy-transport' },
  openGraph: { url: '/charlotte/chemotherapy-transport' },
};

// flat=1 pre-selects the flat round trip (the Treatment Day card) on the Care form.
const CTA_HREF = seoRequest('nemt', { source: 'seo-treatment', flat: '1' });

export default function ChemotherapyTransportPage() {
  return (
    <LandingPageShell
      canonicalPath="/charlotte/chemotherapy-transport"
      primaryKeyword="chemotherapy transportation charlotte"
      eyebrow="Treatment-day rides · Charlotte, North Carolina"
      h1="Rides to Chemotherapy and Infusion in Charlotte — Calm, Clean, and Set Up Once"
      heroSubtitle="Door-to-door rides to and from chemotherapy, infusion and radiation, booked for the whole course at a flat price you know before the first appointment."
      quickAnswer={`Tassy Transportation drives Charlotte patients to and from chemotherapy, infusion and radiation. It is Tassy Care, Treatment Day: one flat price for the round trip, both legs included, from ${FROM} inside 3 miles to ${TOP} for runs up to 30 miles, agreed before we move. A clean SUV takes you there and your driver comes back when you call. Weekly or recurring treatment can be booked once as a series, with dispatch answering at (704) 941-8508.`}
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
                That is what we build the ride around. It is{' '}
                <Link href="/nemt" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  Tassy Care
                </Link>
                , Treatment Day: planned in advance, one flat price for the round trip, a
                late-model SUV that is easy to get into, and a driver who comes to the door and
                helps you inside and seated at the other end.
              </p>
            </>
          ),
        },
        {
          h2: 'The price, plainly',
          body: (
            <>
              <p>
                One flat price covers both legs: {FROM} for a treatment center
                inside 3 miles, rising by distance to {TOP} for runs up to 30
                miles. The number is agreed before we move and it does not
                change because traffic was slow or your appointment ran long.
                A companion rides with you at no extra charge.
              </p>
              <p>
                We do not keep a driver waiting in a parking lot while you are
                in the chair. Your driver takes you there, and when you call
                that you are close to done, we send one back for you. Early
                mornings, nights, weekends and a short list of holidays carry
                the same flat add-ons as every Tassy ride, shown before you
                book. If you treat every week, ask about the standing ride plan
                on our{' '}
                <Link href="/pricing" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  pricing page
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'Our clean-ride standard',
          body: (
            <>
              <p>
                Treatment can leave you tired and more sensitive to the people
                and things around you. For every Treatment Day ride we do these
                things, on purpose:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>The seats, belts, door handles and handrails are wiped down with a disinfectant before your ride.</li>
                <li>Your driver wears a mask and will offer you one.</li>
                <li>Hand sanitizer is in the car, and the car is fragrance-free.</li>
                <li>A driver who feels unwell does not take treatment rides.</li>
                <li>You get a late-model SUV, and the same driver when schedules allow.</li>
              </ul>
              <p>
                These are things we do, not medical promises. If your care team
                has asked for anything more, tell us when you book.
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
          a: `One flat price covers the round trip: from ${FROM} inside 3 miles up to ${TOP} for runs up to 30 miles, agreed before the ride. Your driver takes you there and comes back when you call. A companion rides free.`,
        },
        {
          q: 'Can you set up rides for my whole course of treatment?',
          a: 'Yes. Tell us the pattern and the treatment center and we book the series once, with the same pickup window each day. If your schedule changes, one call updates it.',
        },
        {
          q: 'What do you do to keep the car clean?',
          a: 'Before each treatment ride we wipe down the seats, belts, door handles and handrails with a disinfectant. Your driver wears a mask and will offer you one, there is hand sanitizer in the car, and the car is fragrance-free. A driver who is unwell does not take treatment rides. These are things we do, not medical promises.',
        },
        {
          q: 'What if my infusion runs longer than expected?',
          a: 'Call dispatch at (704) 941-8508 when you know. Your ride home is dispatched when you call, so a long day costs you nothing extra. Give us your estimated finish when you book so the first plan is close.',
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
