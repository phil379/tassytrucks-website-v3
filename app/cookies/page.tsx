import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/legal/LegalPage';
import CookieSettingsButton from '@/components/CookieSettingsButton';
import { BUSINESS } from '@/lib/business';

export const metadata: Metadata = {
  title: 'Cookies & Visitor Counting',
  description:
    'What Tassy Transportation stores in your browser, which third parties load on our site, and how to change your choice.',
  alternates: { canonical: '/cookies' },
  robots: { index: true, follow: true },
};

const cell = 'border border-line px-3 py-2 align-top text-sm';

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies & Visitor Counting"
      updated="October 24, 2026"
      intro={
        <p>
          Short version: we do not use advertising cookies or advertising trackers. Booking and
          payment work without any optional tracking. The only optional thing is a visitor counter,
          and it stays off unless you press <strong>Accept</strong> on our banner. You can change
          your mind at any time with{' '}
          <CookieSettingsButton className="underline underline-offset-2" />.
        </p>
      }
      sections={[
        {
          id: 'optional',
          heading: 'Optional: visitor counting',
          children: (
            <>
              <p>
                If you press Accept, we load Vercel Web Analytics, which counts which pages are
                visited, where visitors came from, and the type of device and browser, so we can fix
                what is confusing. Vercel states that it does not use cookies for this. If you press
                Reject non-essential, or you do nothing, the script is never loaded.
              </p>
              <p>
                We remember your choice in your browser (one entry called{' '}
                <code>tassy-consent</code>) so we do not ask again on every page.
              </p>
            </>
          ),
        },
        {
          id: 'necessary',
          heading: 'What the site stores because it has to',
          children: (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${cell} text-left`} scope="col">What</th>
                    <th className={`${cell} text-left`} scope="col">Why</th>
                    <th className={`${cell} text-left`} scope="col">How long</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className={`${cell} text-left font-medium`} scope="row"><code>tassy-consent</code> (browser storage)</th>
                    <td className={cell}>Remembers your answer on the banner.</td>
                    <td className={cell}>Until you clear your browser data or change it.</td>
                  </tr>
                  <tr>
                    <th className={`${cell} text-left font-medium`} scope="row">Tassy Scholar sign-up progress (session storage)</th>
                    <td className={cell}>Keeps what you have typed if you refresh the page while signing a child up. Includes the details you entered for the parent and the child.</td>
                    <td className={cell}>Until you finish or close the tab.</td>
                  </tr>
                  <tr>
                    <th className={`${cell} text-left font-medium`} scope="row">Sign-in cookies</th>
                    <td className={cell}>Keep staff and facility partners signed in. Visitors who only browse or book a ride never receive them.</td>
                    <td className={cell}>For the length of the sign-in session.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: 'third-parties',
          heading: 'Other companies that load or are involved when you use the site',
          children: (
            <>
              <p>
                <strong>Google Maps.</strong> The address boxes on the ride request and Tassy Scholar
                sign-up pages load Google Maps address suggestions as soon as the page opens. Google
                receives your IP address and the address text you type, and may set its own cookies
                or storage. We do not control that; see Google&rsquo;s privacy policy. If you would
                rather not use it, our phone line books the same rides: {BUSINESS.phoneDisplay}.
              </p>
              <p>
                <strong>Stripe.</strong> When you pay, you leave our site for a page run by Stripe,
                which has its own cookies and policy.
              </p>
              <p>
                Our <Link href="/privacy" className="underline">Privacy Policy</Link> lists the other
                services that handle your information behind the scenes.
              </p>
            </>
          ),
        },
        {
          id: 'fonts',
          heading: 'Fonts',
          children: (
            <p>
              Our fonts are served from our own site. Your browser does not contact Google Fonts when
              you visit.
            </p>
          ),
        },
        {
          id: 'change',
          heading: 'Change your choice',
          children: (
            <p>
              Use <CookieSettingsButton className="underline underline-offset-2" /> here or in the
              footer of any page. You can also clear this site&rsquo;s data in your browser settings.
              Questions: {BUSINESS.bookingEmail}.
            </p>
          ),
        },
      ]}
    />
  );
}
