import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { HOTEL_ZONES } from '@/lib/hotel-zones';
import { hotelCardsEnabled } from '@/lib/hotel-card';
import { isOpsAuthed } from '@/lib/ops-auth';

/**
 * /hotels — every listed hotel with its printable card. Behind the /ops password (the site's
 * existing admin check). Off unless HOTEL_QR_CARDS_ENABLED=true. Not indexed.
 */
export const metadata: Metadata = {
  title: 'Hotel cards',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function HotelsIndexPage() {
  if (!hotelCardsEnabled()) notFound();
  if (!isOpsAuthed()) redirect('/ops');

  return (
    <section className="container-x py-10">
      <h1 className="h-display serif">Hotel concierge cards</h1>
      <p className="ink-soft mt-2">Each card links to that hotel&apos;s airport page. No price is printed.</p>
      <table className="mt-6 w-full text-left" data-testid="hotel-card-index">
        <thead>
          <tr>
            <th className="py-2">Hotel</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Zone</th>
            <th className="py-2">Card</th>
          </tr>
        </thead>
        <tbody>
          {HOTEL_ZONES.map((h) => (
            <tr key={h.slug} className="border-t">
              <td className="py-2">{h.label}</td>
              <td className="py-2"><code>{h.slug}</code></td>
              <td className="py-2">{h.zone}</td>
              <td className="py-2">
                <Link className="underline tap-target" href={`/hotels/${h.slug}/card`}>Print card</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
