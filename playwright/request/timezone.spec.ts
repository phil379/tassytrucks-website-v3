import { test, expect } from '@playwright/test';
import {
  OPERATING_TIME_ZONE,
  parseLocalDateTime,
  parseLocalDateTimeMs,
  toLocalDateTimeInput,
} from '../../lib/time';
import { tripRequestSchema, minDateTimeLocal } from '../../lib/trip-request';

/**
 * These are pure-function tests — no browser, no server. They exist because the
 * bug they cover produced no error anywhere: the form accepted the request, the
 * API returned 200, the row landed, and the stored time was four hours wrong.
 * The only way that surfaces is an assertion on the instant itself.
 */

test.describe('datetime-local is read as Charlotte time, never the process zone', () => {
  test('EDT: 3:00 PM on a summer day is 19:00 UTC', () => {
    const d = parseLocalDateTime('2026-09-26T15:00');
    expect(d?.toISOString()).toBe('2026-09-26T19:00:00.000Z');
  });

  test('EST: 3:00 PM on a winter day is 20:00 UTC', () => {
    const d = parseLocalDateTime('2026-12-15T15:00');
    expect(d?.toISOString()).toBe('2026-12-15T20:00:00.000Z');
  });

  test('the answer does not depend on the machine the test runs on', () => {
    // The whole class of bug: the same string, read two ways. If this ever
    // starts depending on TZ, the server and the browser have diverged again.
    const iso = parseLocalDateTime('2026-09-26T15:00')!.toISOString();
    expect(iso).not.toBe(new Date('2026-09-26T15:00:00Z').toISOString());
    expect(iso).toBe('2026-09-26T19:00:00.000Z');
  });

  test('a string that already carries a zone is left alone', () => {
    expect(parseLocalDateTime('2026-09-26T19:00:00Z')?.toISOString()).toBe(
      '2026-09-26T19:00:00.000Z',
    );
    expect(parseLocalDateTime('2026-09-26T15:00:00-04:00')?.toISOString()).toBe(
      '2026-09-26T19:00:00.000Z',
    );
  });

  test('junk is null, not Invalid Date', () => {
    expect(parseLocalDateTime('')).toBeNull();
    expect(parseLocalDateTime(null)).toBeNull();
    expect(parseLocalDateTime('not a date')).toBeNull();
    expect(Number.isNaN(parseLocalDateTimeMs('not a date'))).toBe(true);
  });

  test('round-trips through the input format', () => {
    const value = '2026-09-26T15:00';
    expect(toLocalDateTimeInput(parseLocalDateTime(value)!)).toBe(value);
  });

  test('DST spring-forward: 2:30 AM does not exist and does not throw', () => {
    // 2027-03-14 02:30 America/New_York is inside the gap.
    const d = parseLocalDateTime('2027-03-14T02:30');
    expect(d).not.toBeNull();
    expect(Number.isNaN(d!.getTime())).toBe(false);
  });

  test('the operating zone is Charlotte', () => {
    expect(OPERATING_TIME_ZONE).toBe('America/New_York');
  });
});

test.describe('lead-time validation agrees with what the customer picked', () => {
  const base = {
    serviceLine: 'care',
    pickupAddress: '100 Test Ave, Charlotte, NC',
    dropoffAddress: '200 Sample Blvd, Charlotte, NC',
    returnTrip: false,
    passengers: 1,
    contactName: 'Test Person',
    contactPhone: '555-0100',
    preferredContact: 'phone',
  };

  /** A Charlotte wall-clock string `hours` from now, on the 15-minute grid. */
  const localIn = (hours: number) =>
    toLocalDateTimeInput(new Date(Math.ceil((Date.now() + hours * 3_600_000) / 900_000) * 900_000));

  test('a trip 6 hours out is accepted', () => {
    const result = tripRequestSchema.safeParse({ ...base, requestedAt: localIn(6) });
    expect(result.success, JSON.stringify(result.success ? {} : result.error.issues)).toBe(true);
  });

  test('a trip 5 hours out is accepted — this is the case the bug rejected', () => {
    // Under `new Date(naiveString)` in a UTC process this read as 1 hour out
    // and failed the 4-hour rule, with no way for the customer to fix it.
    const result = tripRequestSchema.safeParse({ ...base, requestedAt: localIn(5) });
    expect(result.success, JSON.stringify(result.success ? {} : result.error.issues)).toBe(true);
  });

  test('a trip 1 hour out is still rejected', () => {
    const result = tripRequestSchema.safeParse({ ...base, requestedAt: localIn(1) });
    expect(result.success).toBe(false);
  });

  test('the picker floor is never earlier than the server floor', () => {
    const floor = parseLocalDateTimeMs(minDateTimeLocal());
    expect(floor).toBeGreaterThanOrEqual(Date.now() + 4 * 60 * 60 * 1000 - 1000);
  });

  test('a return trip before the pickup is rejected', () => {
    const result = tripRequestSchema.safeParse({
      ...base,
      requestedAt: localIn(8),
      returnTrip: true,
      returnAt: localIn(6),
    });
    expect(result.success).toBe(false);
  });

  test('a return trip after the pickup is accepted', () => {
    const result = tripRequestSchema.safeParse({
      ...base,
      requestedAt: localIn(6),
      returnTrip: true,
      returnAt: localIn(9),
    });
    expect(result.success, JSON.stringify(result.success ? {} : result.error.issues)).toBe(true);
  });
});
