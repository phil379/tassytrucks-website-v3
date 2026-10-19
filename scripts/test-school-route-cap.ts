import assert from 'node:assert/strict';
import {
  SCHOLAR_MAX_LEG_MINUTES,
  judgeLegSeconds,
  nextSchoolMorning,
  routeCapEnforced,
  checkScholarLeg,
} from '../lib/school-route-cap';
import { __resetRoadDistanceCache, roadTimeByAddress } from '../lib/road-distance';
import {
  classifyHousehold,
  cleanReasons,
  hasRouteReason,
  householdRequestHref,
  reasonsFromQuery,
} from '../lib/school-household';

let n = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

const realFetch = globalThis.fetch;
const realKey = process.env.GOOGLE_MAPS_API_KEY;
function stubFetch(handler: (body: Record<string, unknown>) => Response) {
  const calls: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    calls.push(body);
    return handler(body);
  }) as typeof fetch;
  return calls;
}
const okRoute = (seconds: number, meters = 8000) =>
  new Response(JSON.stringify({ routes: [{ distanceMeters: meters, duration: `${seconds}s` }] }), { status: 200 });

(async () => {
  await t('the cap is 20 minutes', () => {
    assert.equal(SCHOLAR_MAX_LEG_MINUTES, 20);
  });

  await t('20:00 is within, 20:01 is too long (rounds up)', () => {
    assert.deepEqual(judgeLegSeconds(1200), { verdict: 'within', minutes: 20 });
    assert.deepEqual(judgeLegSeconds(1201), { verdict: 'too_long', minutes: 21 });
    assert.deepEqual(judgeLegSeconds(60), { verdict: 'within', minutes: 1 });
    assert.deepEqual(judgeLegSeconds(2400), { verdict: 'too_long', minutes: 40 });
  });

  await t('anything unmeasurable fails closed to unknown', () => {
    for (const bad of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.deepEqual(judgeLegSeconds(bad as number | null | undefined), { verdict: 'unknown', minutes: null });
    }
  });

  await t('nextSchoolMorning is a future weekday', () => {
    // Friday evening, Saturday and Sunday all roll to Monday; a Monday rolls to Tuesday.
    for (const from of ['2026-10-16T23:00:00Z', '2026-10-17T15:00:00Z', '2026-10-18T15:00:00Z']) {
      const d = nextSchoolMorning(new Date(from));
      assert.ok(d.getTime() > new Date(from).getTime());
      const dow = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(d);
      assert.equal(dow, 'Mon');
    }
    const tue = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(
      nextSchoolMorning(new Date('2026-10-19T15:00:00Z')),
    );
    assert.equal(tue, 'Tue');
  });

  await t('SCHOLAR_ROUTE_CAP=off turns enforcement off, anything else leaves it on', () => {
    const prev = process.env.SCHOLAR_ROUTE_CAP;
    delete process.env.SCHOLAR_ROUTE_CAP;
    assert.equal(routeCapEnforced(), true);
    process.env.SCHOLAR_ROUTE_CAP = 'off';
    assert.equal(routeCapEnforced(), false);
    process.env.SCHOLAR_ROUTE_CAP = 'OFF ';
    assert.equal(routeCapEnforced(), false);
    process.env.SCHOLAR_ROUTE_CAP = 'false';
    assert.equal(routeCapEnforced(), true);
    if (prev === undefined) delete process.env.SCHOLAR_ROUTE_CAP;
    else process.env.SCHOLAR_ROUTE_CAP = prev;
  });

  await t('system route reasons survive cleaning, in order, and unknown ones are dropped', () => {
    assert.deepEqual(cleanReasons(['route_unverified', 'multiple_children', 'bogus']), [
      'multiple_children',
      'route_unverified',
    ]);
    assert.deepEqual(cleanReasons(['route_too_long', 'route_too_long']), ['route_too_long']);
    assert.equal(hasRouteReason(['route_too_long']), true);
    assert.equal(hasRouteReason(['multiple_children']), false);
  });

  await t('a route reason alone sends the family to the custom request', () => {
    assert.equal(classifyHousehold(['route_too_long']).path, 'custom');
    assert.equal(classifyHousehold(['route_unverified']).path, 'custom');
    assert.equal(classifyHousehold([]).path, 'standard');
  });

  await t('the redirect carries the reason and plan, and reads back from the query', () => {
    const href = householdRequestHref(['route_too_long'], 'full-year');
    assert.equal(href, '/school/household-request?reasons=route_too_long&plan=full-year');
    const q = new URL(href, 'https://x.test').searchParams.get('reasons') ?? '';
    assert.deepEqual(reasonsFromQuery(q), ['route_too_long']);
  });

  await t('roadTimeByAddress returns null with no key and never calls the network', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    __resetRoadDistanceCache();
    const calls = stubFetch(() => okRoute(600));
    assert.equal(await roadTimeByAddress('1 A St, Charlotte, NC', '2 B St, Charlotte, NC'), null);
    assert.equal(calls.length, 0);
  });

  await t('roadTimeByAddress parses seconds and miles, sends addresses and a departure time, and caches', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    __resetRoadDistanceCache();
    const calls = stubFetch(() => okRoute(905, 16093.4));
    const depart = new Date('2026-10-19T11:30:00Z');
    const r = await roadTimeByAddress('1 A St, Charlotte, NC', '2 B St, Charlotte, NC', depart);
    assert.ok(r);
    assert.equal(r!.seconds, 905);
    assert.ok(Math.abs(r!.miles - 10) < 0.05);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].origin, { address: '1 A St, Charlotte, NC' });
    assert.equal(calls[0].departureTime, depart.toISOString());
    await roadTimeByAddress('1 a st, charlotte, nc', '2 B St, Charlotte, NC', depart);
    assert.equal(calls.length, 1, 'second identical lookup is served from cache');
  });

  await t('a failed or malformed response is null, and checkScholarLeg turns it into unknown', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    __resetRoadDistanceCache();
    stubFetch(() => new Response('nope', { status: 500 }));
    assert.equal(await roadTimeByAddress('3 C St', '4 D St'), null);
    __resetRoadDistanceCache();
    stubFetch(() => new Response(JSON.stringify({ routes: [] }), { status: 200 }));
    assert.deepEqual(await checkScholarLeg('3 C St', '4 D St'), { verdict: 'unknown', minutes: null });
  });

  await t('checkScholarLeg: 19 minutes is within, 25 minutes is too long', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    __resetRoadDistanceCache();
    stubFetch(() => okRoute(19 * 60));
    assert.deepEqual(await checkScholarLeg('5 E St', '6 F St'), { verdict: 'within', minutes: 19 });
    __resetRoadDistanceCache();
    stubFetch(() => okRoute(25 * 60));
    assert.deepEqual(await checkScholarLeg('7 G St', '8 H St'), { verdict: 'too_long', minutes: 25 });
  });

  globalThis.fetch = realFetch;
  if (realKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
  else process.env.GOOGLE_MAPS_API_KEY = realKey;
  console.log(`\n${n} tests passed`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
