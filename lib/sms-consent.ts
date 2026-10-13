/**
 * Text-message consent captured on the booking form.
 *
 * WHY THIS LIVES INSIDE trip_details AND NOT IN ITS OWN COLUMN: a new column on
 * trip_requests would need a migration to be applied before the first booking that
 * carries it, and this route's insert is the one that silently dropped two bookings on
 * 2026-09-25. trip_details is jsonb and already exists, so consent travels with the row
 * it was given for -- and a booking can never fail because of it.
 *
 * Consent is PER REQUEST and tied to the number it was given for. TassyOps only texts
 * the rider while the contact phone still equals `sms_consent_phone`.
 *
 * The wording below is what the visitor saw. Change it and bump SMS_CONSENT_VERSION so
 * old rows still point at the words they agreed to.
 */
export const SMS_CONSENT_VERSION = 'v1';

export const SMS_CONSENT_LABEL = 'Text me updates about this ride';

export const SMS_CONSENT_DISCLOSURE =
  'By checking this box you agree to receive text messages from Tassy Transportation about this ride: ' +
  'confirmation, driver assigned, driver on the way, arrival, and a rating request. ' +
  'Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. ' +
  'Consent is not a condition of booking.';

/** Flat primitives only, because trip_details is typed Record<string, string | number | boolean>. */
export type SmsConsentFields = {
  sms_consent: true;
  sms_consent_at: string;
  sms_consent_v: string;
  sms_consent_phone: string;
};

/** Returns the fields to merge into trip_details, or null when the visitor did not opt in. */
export function buildSmsConsent(
  optedIn: unknown,
  contactPhone: string,
  now: Date = new Date(),
): SmsConsentFields | null {
  if (optedIn !== true) return null;
  const phone = contactPhone.trim();
  if (phone.replace(/\D/g, '').length < 10) return null; // no usable number, nothing to consent to
  return {
    sms_consent: true,
    sms_consent_at: now.toISOString(),
    sms_consent_v: SMS_CONSENT_VERSION,
    sms_consent_phone: phone,
  };
}
