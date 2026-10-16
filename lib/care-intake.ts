import { z } from 'zod';

/**
 * Tassy Care intake on the shared /request form.
 *
 * TODAY (Phil, 2026-10-16): every ride is paid by card through Stripe. Medicaid,
 * insurance and VA billing do not exist yet, so those payment choices are listed
 * but disabled ("coming soon"), and the server refuses them. The one thing every
 * Care ride does ask is the patient's date of birth, for the 18+ rule; only the
 * fact "18 or older" is stored, never the date itself.
 *
 * LATER: when Medicaid / insurance / VA billing is set up, flip that option's
 * `enabled` flag below. The fuller intake (plan details, HIPAA + transport
 * consent with signature, DOB stored) is already built and tested behind it.
 * Billing rules for each payer are a separate project and are NOT built here.
 *
 * PRIVACY — HARD REQUIREMENT (same as lib/trip-request.ts): no diagnosis,
 * procedure, condition or medication field. DOB, payer and consent are
 * administrative. The consent text says what we do and do not hold.
 *
 * The server builds the consent text and its hash itself; the browser only
 * says which boxes were ticked and what name was typed.
 */

export const CARE_CONSENT_VERSION = 'nemt-v1-2026-06-08';

export const CARE_PEDIATRIC_PHONE = '(704) 941-8508';

/**
 * How a Tassy Care ride is paid. `self` = card, via the secure Stripe link the
 * dispatcher sends after confirming the price. Flip `enabled` to open a payer.
 */
export const CARE_PAYMENT_OPTIONS = [
  { value: 'self', label: 'Card (secure Stripe link)', enabled: true },
  { value: 'medicaid', label: 'Medicaid', enabled: false },
  { value: 'insurance', label: 'Private insurance', enabled: false },
  { value: 'va', label: 'VA / Veteran benefit', enabled: false },
] as const;

export type CarePaymentValue = (typeof CARE_PAYMENT_OPTIONS)[number]['value'];
export type CarePlanPayer = Exclude<CarePaymentValue, 'self'>;
export const CARE_PAYMENT_VALUES = CARE_PAYMENT_OPTIONS.map((p) => p.value) as [CarePaymentValue, ...CarePaymentValue[]];

export function isPayerEnabled(value: string | null | undefined): boolean {
  return CARE_PAYMENT_OPTIONS.some((p) => p.value === value && p.enabled);
}

export const CARE_PLAN_NOT_AVAILABLE =
  'That payment method is not available yet. Choose card, or call (704) 941-8508.';

/** Verbatim clauses. Hashed on the server, so any edit needs a new version string. */
export const CARE_CONSENT_CLAUSES = [
  {
    key: 'hipaa',
    title: 'HIPAA Acknowledgment',
    body:
      'I acknowledge that Tassy Trucks LLC will handle limited protected health information (mobility needs, pickup/dropoff facility, appointment context) solely to schedule and perform this medical transport, and may share it with the paying broker/plan for billing and authorization. I have received notice of these privacy practices.',
  },
  {
    key: 'transport_consent',
    title: 'Patient Transport Consent',
    body:
      'I consent to non-emergency medical transport for the patient named in this booking. I confirm the mobility information provided is accurate, and I understand the driver is not a medical provider and does not administer treatment during transport.',
  },
] as const;

export function buildCareConsentText(signerName: string): string {
  const header = `NEMT PATIENT AGREEMENT — TASSY TRUCKS (${CARE_CONSENT_VERSION})\n\nAcknowledged by ${signerName || '[FULL NAME]'}:`;
  const body = CARE_CONSENT_CLAUSES.map((c) => `\n\n${c.title}\n${c.body}`).join('');
  return `${header}${body}`;
}

/** True when this payer is a plan (not card), so the fuller intake is required. */
export function isMedicalPayer(payer: string | null | undefined): payer is CarePlanPayer {
  return CARE_PAYMENT_VALUES.includes(payer as CarePaymentValue) && payer !== 'self';
}

export type AgeCheck = { ok: true } | { ok: false; message: string };

/**
 * 18+ hard block (Phil, 2026-06-19: "under any conditions an underage should be
 * able to book a ride, never"). Pediatric transport is booked by phone so a
 * coordinator can verify guardian authorization.
 *
 * `today` is injectable for tests. Dates are compared as calendar dates in
 * UTC, so a birthday is the birthday regardless of the server's zone.
 */
export function checkAdult(dob: string | null | undefined, today = new Date()): AgeCheck {
  if (!dob) return { ok: false, message: 'Patient date of birth is required.' };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return { ok: false, message: 'Enter a valid date of birth.' };
  const y = +m[1], mo = +m[2], d = +m[3];
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== mo - 1 || born.getUTCDate() !== d) {
    return { ok: false, message: 'Enter a valid date of birth.' };
  }
  const ty = today.getUTCFullYear(), tm = today.getUTCMonth(), td = today.getUTCDate();
  if (Date.UTC(y, mo - 1, d) > Date.UTC(ty, tm, td)) {
    return { ok: false, message: 'Date of birth cannot be in the future.' };
  }
  let age = ty - y;
  if (tm < mo - 1 || (tm === mo - 1 && td < d)) age -= 1;
  if (age > 120) return { ok: false, message: 'Date of birth is too far in the past.' };
  if (age < 18) {
    return {
      ok: false,
      message: `Patient must be 18 or older. For pediatric medical transport, please call ${CARE_PEDIATRIC_PHONE} to book through our coordinator.`,
    };
  }
  return { ok: true };
}

const text = (max: number) => z.string().trim().max(max);

/** What the browser sends. Everything else (text, hash, ip, ua, time) is server-made. */
export const careIntakeSchema = z
  .object({
    payer: z.enum(CARE_PAYMENT_VALUES),
    dob: z.string().trim().max(10),
    medicaidBroker: text(60).optional().nullable(),
    memberId: text(80).optional().nullable(),
    authorizationNumber: text(80).optional().nullable(),
    hipaa: z.boolean().optional(),
    transportConsent: z.boolean().optional(),
    signerName: text(160).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    const age = checkAdult(v.dob);
    if (!age.ok) ctx.addIssue({ code: 'custom', path: ['dob'], message: age.message });
    // Card needs nothing more. A plan payer needs the full intake.
    if (v.payer === 'self') return;
    if (v.payer === 'medicaid' && !v.medicaidBroker) {
      ctx.addIssue({ code: 'custom', path: ['medicaidBroker'], message: 'Choose or enter the Medicaid plan or broker' });
    }
    if (v.hipaa !== true) ctx.addIssue({ code: 'custom', path: ['hipaa'], message: 'Please acknowledge the privacy notice' });
    if (v.transportConsent !== true) {
      ctx.addIssue({ code: 'custom', path: ['transportConsent'], message: 'Please confirm transport consent' });
    }
    if (!v.signerName || v.signerName.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['signerName'], message: 'Type your full name to sign' });
    }
  });

export type CareIntakeInput = z.infer<typeof careIntakeSchema>;

/**
 * The record stored in trip_requests.care_intake.
 *
 * Card rides store only that the patient was confirmed 18+, not the date of
 * birth: there is nothing to bill, so there is nothing to keep it for. A plan
 * payer (when one is enabled) stores the full intake.
 */
export interface CareIntakeRecord {
  payer: CarePaymentValue;
  age_verified_18_plus: true;
  verified_at: string;
  dob?: string;
  medicaid_broker?: string | null;
  member_id?: string | null;
  authorization_no?: string | null;
  consent?: {
    version: string;
    signer_name: string;
    hipaa: true;
    transport_consent: true;
    text_hash: string;
    signed_at: string;
    ip: string | null;
    ua: string | null;
  };
}

export function buildCareIntakeRecord(
  v: CareIntakeInput,
  signed: { textHash: string; signedAt: string; ip: string | null; ua: string | null },
): CareIntakeRecord {
  if (v.payer === 'self') {
    return { payer: 'self', age_verified_18_plus: true, verified_at: signed.signedAt };
  }
  return {
    payer: v.payer,
    age_verified_18_plus: true,
    verified_at: signed.signedAt,
    dob: v.dob,
    medicaid_broker: v.payer === 'medicaid' ? v.medicaidBroker || null : null,
    member_id: v.memberId || null,
    authorization_no: v.authorizationNumber || null,
    consent: {
      version: CARE_CONSENT_VERSION,
      signer_name: v.signerName!.trim(),
      hipaa: true,
      transport_consent: true,
      text_hash: signed.textHash,
      signed_at: signed.signedAt,
      ip: signed.ip,
      ua: signed.ua,
    },
  };
}
