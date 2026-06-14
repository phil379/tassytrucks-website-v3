import type { Metadata } from 'next';
import LandingPageShell from '@/components/seo/LandingPageShell';
import { seoBook } from '@/lib/saas-links';

export const metadata: Metadata = {
  title: 'Post-Surgery Transport in Charlotte NC | Tassy Transportation',
  description:
    'Post-surgery transport in Charlotte NC. A driver who walks you in, waits through your procedure, and escorts you home. 24/7 dispatch (704) 941-8508.',
  alternates: { canonical: '/charlotte/post-surgery-transport' },
  openGraph: { images: ['/og-image/post-surgery-transport'] },
};

const CTA_HREF = seoBook('vip', { source: 'seo-postop', tier: 'recovery' });

export default function PostSurgeryTransportPage() {
  return (
    <LandingPageShell
      primaryKeyword="post-surgery transport"
      eyebrow="Recovery Transport · Charlotte, North Carolina"
      h1="Post-Surgery Transport in Charlotte — A Real Person to Get You Home"
      heroSubtitle="Door-through-door rides for outpatient procedures, with a driver who walks you in, stays reachable during your procedure, and sees you safely back inside your own front door."
      quickAnswer="Surgery centers generally will not discharge a patient who received anesthesia or sedation without a responsible adult to take them home — and a rideshare driver waiting at the curb usually does not count. Tassy Transportation provides scheduled post-surgery transport across Charlotte and Mecklenburg County: we walk you in, wait through variable discharge times, and escort you to your door. Dispatch answers 24/7 at (704) 941-8508."
      ctaText="Book recovery transport"
      ctaHref={CTA_HREF}
      schemaServiceType="Post-Surgery Patient Transportation"
      sections={[
        {
          h2: 'Why your surgery center asks who is driving you home',
          body: (
            <>
              <p>
                If you have an outpatient procedure scheduled anywhere in
                Charlotte, you have probably already heard it from the scheduling
                nurse: <strong>you cannot drive yourself home, and you need a
                responsible adult to be released to.</strong> This is standard
                practice after anesthesia or sedation, reflected in{' '}
                <a
                  href="https://www.asahq.org/madeforthismoment/preparing-for-surgery/recovery"
                  className="underline decoration-[color:var(--gold)] underline-offset-2"
                  rel="noopener"
                >
                  American Society of Anesthesiologists discharge guidance
                </a>
                . Sedation affects judgment, reflexes, and balance for hours
                after you feel &ldquo;fine,&rdquo; so facilities will not simply
                hand you your keys and wave goodbye.
              </p>
              <p>
                For a lot of patients, that requirement is the hardest part of
                scheduling the procedure. A spouse who can&rsquo;t take the day
                off. Adult children in another city. A neighbor you don&rsquo;t
                want to ask to sit in a waiting room for four hours. That gap —
                not the procedure itself — is what keeps people postponing care.
                It is exactly the gap our post-surgery transport service exists
                to close.
              </p>
            </>
          ),
        },
        {
          h2: "Why a rideshare usually doesn't satisfy the requirement",
          body: (
            <>
              <p>
                Plenty of patients try to book an Uber or Lyft home from a
                procedure, and plenty of surgery centers turn that plan down.
                The reason is simple: a rideshare driver is a stranger at the
                curb. They will not come inside to collect you, they will not
                wait through a discharge that runs long, they will not listen to
                the nurse&rsquo;s instructions, and they certainly will not walk
                you up your front steps when you are still woozy. Many
                facilities want a specific person they can release you to — and
                an anonymous driver who may cancel mid-procedure does not meet
                that bar.
              </p>
              <p>
                A scheduled medical transport service is a different
                arrangement. When you book post-surgery transport with Tassy
                Trucks, the facility gets a named company with USDOT and MC
                authority on file, a confirmed pickup, and a driver whose entire
                job is you. Before you book, it is worth a quick call to your
                surgery center to confirm their discharge policy — then call us
                at (704) 941-8508 and we will set the ride up around it. You can
                see how our service tiers compare on the{' '}
                <a href="/pricing" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  pricing page
                </a>
                .
              </p>
            </>
          ),
        },
        {
          h2: 'Door-through-door, with wait service built in',
          body: (
            <>
              <p>
                &ldquo;Door-to-door&rdquo; is our standard on every ride. For
                post-surgery transport, we go further — what we call
                door-through-door. Your driver meets you inside your home or
                lobby, helps with the entryway and any steps, and walks you into
                the facility to check-in. On the way home, the driver receives
                you at discharge, helps you into the vehicle, and escorts you
                back through your own front door before leaving. Not a honk from
                the driveway. Through the door.
              </p>
              <p>
                Wait service is the other half. Discharge times after sedation
                are genuinely unpredictable — recovery can take longer than
                planned, and no one can tell you at 7 a.m. exactly when
                you&rsquo;ll be released. We schedule your return as a window,
                not a fixed minute, and your driver stays reachable so the
                recovery nurse isn&rsquo;t calling a stranger. If you want a
                higher-touch version of this — a single dedicated driver for the
                entire day — that is our{' '}
                <a href="/vip" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  VIP concierge service
                </a>
                .
              </p>
            </>
          ),
          subSections: [
            {
              h3: "A note on what drivers do — and don't do",
              body: (
                <p>
                  Our drivers provide courtesy assistance: a steady arm, help
                  with doors and steps, carrying your discharge folder and
                  belongings. They are not clinicians and do not provide medical
                  care. If your care team says you need clinical support during
                  transport or at home, follow their guidance — and for
                  patients in ongoing treatment, ask us about{' '}
                  <a href="/recover" className="underline decoration-[color:var(--gold)] underline-offset-2">
                    Tassy Recover
                  </a>
                  , our oncology-focused transport program.
                </p>
              ),
            },
          ],
        },
        {
          h2: 'How to schedule around a procedure',
          body: (
            <>
              <p>
                Book online in about two minutes or call (704) 941-8508 — a
                person answers 24/7, which matters when your facility calls the
                day before with a changed arrival time. Tell us the procedure
                location, your check-in time, and your best guess at discharge.
                We plan the morning pickup so you arrive early and unrushed, and
                we keep the afternoon flexible because discharge will move.
              </p>
              <p>
                Caregivers book for other people constantly — a daughter in
                Raleigh arranging her father&rsquo;s cataract procedure in
                Charlotte, for example. You get the confirmation and driver
                updates; your family member gets the ride. If recovery involves
                follow-up visits, we can set the whole series — surgery day plus
                post-op checks — as recurring rides in one call, the same way our{' '}
                <a href="/charlotte/nemt-rides" className="underline decoration-[color:var(--gold)] underline-offset-2">
                  NEMT riders
                </a>{' '}
                schedule dialysis.
              </p>
            </>
          ),
        },
        {
          h2: 'Where we drive in and around Charlotte',
          body: (
            <p>
              We are based in Charlotte and cover all of Mecklenburg County,
              plus Matthews, Pineville, Huntersville, Concord, and Gastonia.
              Whether your procedure is at a major hospital campus like Atrium
              Health Carolinas Medical Center or Novant Health Presbyterian, or
              at one of the freestanding surgery and endoscopy centers scattered
              across SouthPark, Ballantyne, and University City, we have driven
              that route. Wheelchair-accessible vehicles are available if you
              expect to need one going home — just tell dispatch when you book.
            </p>
          ),
        },
      ]}
      faqs={[
        {
          q: 'Will the surgery center accept Tassy Transportation as my ride home?',
          a: 'Policies vary by facility, so confirm with your surgery center first — some require a personal escort, while many accept a scheduled transport service with a driver who signs you out and escorts you home. Call us at (704) 941-8508 and we will coordinate directly with the facility so there are no surprises on procedure day.',
        },
        {
          q: 'What happens if my discharge runs late?',
          a: 'We expect it to. Post-surgery return trips are scheduled as a window, not a fixed time, and your driver stays reachable by phone so the recovery nurse can update us directly. You are not charged a no-show fee because anesthesia recovery took longer than planned.',
        },
        {
          q: 'Can the driver wait at the facility during a short procedure?',
          a: 'Yes. For shorter procedures we offer wait-and-return service, and for longer days our VIP recovery tier assigns one dedicated driver from morning pickup through evening drop-off. Dispatch will recommend the right option based on your schedule.',
        },
        {
          q: 'Why not just take an Uber home after surgery?',
          a: 'Many facilities will not release a sedated patient to a rideshare driver, because that driver will not come inside, wait through a delayed discharge, or escort you into your home. A scheduled post-surgery transport with door-through-door service is built to satisfy the responsible-adult release that surgery centers expect.',
        },
        {
          q: 'Do you provide medical care during the ride?',
          a: 'No — our drivers provide courtesy assistance such as a steady arm, help with steps and doors, and carrying your belongings, but they are not medical providers. If your care team says you need clinical supervision in transit, follow their instructions; for patients in ongoing treatment, ask us about the Tassy Recover program.',
        },
      ]}
      relatedLinks={[
        { label: 'VIP concierge transport', href: '/vip' },
        { label: 'Tassy Recover (oncology)', href: '/recover' },
        { label: 'NEMT in Charlotte', href: '/charlotte/nemt-rides' },
        { label: 'Concierge medical transport', href: '/charlotte/concierge-medical-transport' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
