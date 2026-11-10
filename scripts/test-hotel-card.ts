import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { hotelBySlug, hotelQuote } from '../lib/hotel-price';
import { CLT_TERMINAL, HOTEL_ZONES } from '../lib/hotel-zones';
import { CARD_LINE, attributionSlug, cardTargetUrl, hotelCardsEnabled } from '../lib/hotel-card';
import HotelCard from '../components/hotels/HotelCard';
import { qrSvg } from '../lib/qr.server';

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const CLT = { lat: CLT_TERMINAL.lat, lng: CLT_TERMINAL.lng };
const at = (slug: string) => {
  const h = hotelBySlug(slug)!;
  return { lat: h.lat, lng: h.lng };
};
const DOLLAR = /\$\s?\d|\d+\s?(usd|dollars)/i;

await t('the card flag is OFF unless HOTEL_QR_CARDS_ENABLED is exactly "true"', () => {
  const before = process.env.HOTEL_QR_CARDS_ENABLED;
  for (const v of [undefined, '', '1', 'TRUE', 'yes']) {
    if (v === undefined) delete process.env.HOTEL_QR_CARDS_ENABLED; else process.env.HOTEL_QR_CARDS_ENABLED = v;
    assert.equal(hotelCardsEnabled(), false, `"${v}" is off`);
  }
  process.env.HOTEL_QR_CARDS_ENABLED = 'true';
  assert.equal(hotelCardsEnabled(), true);
  if (before === undefined) delete process.env.HOTEL_QR_CARDS_ENABLED; else process.env.HOTEL_QR_CARDS_ENABLED = before;
});

await t('the QR points to /airport?hotel=<slug> on our own site, and an unknown slug has no card', () => {
  for (const h of HOTEL_ZONES) {
    const url = cardTargetUrl(h.slug)!;
    assert.ok(url.endsWith(`/airport?hotel=${h.slug}`), url);
    assert.ok(url.startsWith('https://'), url);
  }
  assert.equal(cardTargetUrl('not-a-hotel'), null);
  assert.equal(cardTargetUrl('<script>'), null);
});

await t('attribution keeps only a listed slug, normalised; anything else is dropped', () => {
  assert.equal(attributionSlug('jw'), 'jw');
  assert.equal(attributionSlug(' JW '), 'jw');
  assert.equal(attributionSlug('omni'), 'omni');
  for (const bad of ['', 'nope', 'jw; drop table', null, undefined, 42, {}]) assert.equal(attributionSlug(bad), null);
});

await t('the slug cannot change the price: the quote takes coordinates only, whatever slug came in', () => {
  // A JW Marriott trip quoted while the link said SouthPark (a $109 hotel) is still the Uptown price.
  const fromJw = hotelQuote({ serviceLine: 'concierge', pickup: at('jw'), dropoff: CLT, introRidesUsed: 99 })!;
  const southpark = hotelQuote({ serviceLine: 'concierge', pickup: at('ac-southpark'), dropoff: CLT, introRidesUsed: 99 })!;
  assert.notEqual(fromJw.chargedCents, southpark.chargedCents, 'the two hotels really do price differently');
  // hotelQuote has no slug input at all, so passing one is a type error and is ignored at runtime.
  const withSlug = hotelQuote({ serviceLine: 'concierge', pickup: at('jw'), dropoff: CLT, introRidesUsed: 99, ...({ slug: 'ac-southpark', sourceHotelSlug: 'ac-southpark' } as object) })!;
  assert.equal(withSlug.chargedCents, fromJw.chargedCents);
  assert.equal(withSlug.slug, 'jw', 'the hotel that prices the ride is the one at the pickup point');
  // A non-hotel address with a hotel slug attached gets no hotel price.
  assert.equal(hotelQuote({ serviceLine: 'concierge', pickup: { lat: 35.3, lng: -80.7 }, dropoff: CLT, ...({ sourceHotelSlug: 'jw' } as object) }), null);
});

await t('the slug never reaches pricing in the booking route or the pricing modules', () => {
  const route = readFileSync('app/api/trip-request/route.ts', 'utf8');
  const hotelCall = route.slice(route.indexOf('const hotel = await hotelQuoteServer('), route.indexOf('});', route.indexOf('const hotel = await hotelQuoteServer(')));
  assert.ok(hotelCall.length > 0 && !/sourceHotelSlug|hotel_slug|source_hotel/.test(hotelCall), 'hotelQuoteServer gets no slug');
  const estimateCall = route.slice(route.indexOf('estimateTrip('), route.indexOf('});', route.indexOf('estimateTrip(')));
  assert.ok(!/sourceHotelSlug|source_hotel/.test(estimateCall), 'estimateTrip gets no slug');
  for (const f of ['lib/hotel-price.ts', 'lib/hotel-price.server.ts', 'lib/quote.ts']) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/hotel-card|sourceHotelSlug|source_hotel_slug/.test(src), `${f} does not know about attribution`);
  }
  assert.ok(/source_hotel_slug: sourceHotelSlug/.test(route), 'the route stores the attribution in trip_details');
});

await t('two hotels in the same zone quote the same price, one way and round trip', () => {
  const zones = new Map<string, string[]>();
  for (const h of HOTEL_ZONES) zones.set(h.zone, [...(zones.get(h.zone) ?? []), h.slug]);
  const uptown = zones.get('uptown')!;
  assert.ok(uptown.length >= 2);
  for (const returnTrip of [false, true]) {
    const prices = uptown.map((s) => hotelQuote({ serviceLine: 'concierge', pickup: at(s), dropoff: CLT, returnTrip, introRidesUsed: 0 })!.chargedCents);
    assert.equal(new Set(prices).size, 1, `uptown ${returnTrip ? 'round trip' : 'one way'}: ${prices.join(', ')}`);
  }
  assert.equal(
    hotelQuote({ serviceLine: 'concierge', pickup: at('jw'), dropoff: CLT })!.chargedCents,
    hotelQuote({ serviceLine: 'concierge', pickup: at('omni'), dropoff: CLT })!.chargedCents,
  );
});

await t('no price on the card: the rendered card and the printed line carry no dollar amount', async () => {
  assert.ok(!DOLLAR.test(CARD_LINE));
  for (const h of HOTEL_ZONES) {
    const svg = await qrSvg(cardTargetUrl(h.slug)!);
    const html = renderToStaticMarkup(HotelCard({ hotelName: h.label, qrSvg: svg, line: CARD_LINE }));
    const esc = h.label.replace(/&/g, '&amp;').replace(/'/g, '&#x27;');
    assert.ok(html.includes(esc), `${h.slug} name on card`);
    assert.ok(html.includes('<svg'), 'the QR is an inline SVG made on the server');
    assert.ok(!DOLLAR.test(html.replace(/<svg[\s\S]*<\/svg>/, '')), `${h.slug}: no price on the card`);
  }
});

await t('the whole card page renders with the flag on, four cards, no price, not indexed', async () => {
  process.env.HOTEL_QR_CARDS_ENABLED = 'true';
  const mod = await import('../app/hotels/[slug]/card/page');
  const el = await mod.default({ params: { slug: 'jw' } });
  const html = renderToStaticMarkup(el);
  assert.equal((html.match(/data-testid="hotel-card"/g) ?? []).length, 4, 'four per sheet');
  assert.ok(html.includes('@media print'), 'print stylesheet');
  assert.ok(!DOLLAR.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')), 'no price anywhere on the page');
  assert.deepEqual(mod.metadata.robots, { index: false, follow: false });
  delete process.env.HOTEL_QR_CARDS_ENABLED;
});

await t('the QR is generated locally, no third-party QR service is referenced', () => {
  for (const f of ['lib/qr.server.ts', 'app/hotels/[slug]/card/page.tsx', 'components/hotels/HotelCard.tsx']) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/https?:\/\/(?!www\.w3\.org)[^\s'"`]*(qr|chart)/i.test(src), `${f} calls no QR service`);
  }
});

await t('/hotels sits behind the existing /ops password check and is not indexed', () => {
  const src = readFileSync('app/hotels/page.tsx', 'utf8');
  assert.ok(/if \(!isOpsAuthed\(\)\) redirect\('\/ops'\)/.test(src));
  assert.ok(/robots: \{ index: false, follow: false \}/.test(src));
  assert.ok(/if \(!hotelCardsEnabled\(\)\) notFound\(\)/.test(src));
});

console.log(`${n} hotel card checks passed`);
