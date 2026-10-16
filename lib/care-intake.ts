import { z } from 'zod';

/**
 * Tassy Care medical-booking intake.
 *
 * Shown on the shared /request form ONLY when a Tassy Care ride is billed to a
 * payer (Medicaid, insurance, VA, a facility). A self-pay ride asks none of it.
 * Ported from the TassyOps guest wizard so the public site and the back office
 * collect the same record, in one place.
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

export const CARE_PAYERS = [
  { value: 'medicaid', label: 'Medicaid' },
  { value: 'insurance', label: 'Private insurance' },
  { value: 'va', label: 'VA / Veteran benefit' },
  { value: 'facility', label: 'A facility pays' },
] as const;

export type CarePayer = (typeof CARE_PAYERS)[number]['value'];
export const CARE_PAYER_VALUES = CARE_PAYERS.map((p) => p.value) as [CarePayer, ...CarePayer[]];

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

/** True when this payer means the full medical intake is required. */
export function isMedicalPayer(payer: string | null | undefined): payer is CarePayer {
  return CARE_PAYER_VALUES.includes(payer as CarePayer);
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
    payer: z.enum(CARE_PAYER_VALUES),
    medicaidBroker: text(60).optional().nullable(),
    memberId: text(80).optional().nullable(),
    authorizationNumber: text(80).optional().nullable(),
    dob: z.string().trim().max(10),
    hipaa: z.literal(true, { message: 'Please acknowledge the privacy notice' }),
    transportConsent: z.literal(true, { message: 'Please confirm transport consent' }),
    signerName: text(160).min(2, 'Type your full name to sign'),
  })
  .superRefine((v, ctx) => {
    const age = checkAdult(v.dob);
    if (!age.ok) ctx.addIssue({ code: 'custom', path: ['dob'], message: age.message });
    if (v.payer === 'medicaid' && !v.medicaidBroker) {
      ctx.addIssue({ code: 'custom', path: ['medicaidBroker'], message: 'Choose or enter the Medicaid plan or broker' });
    }
  });

export type CareIntakeInput = z.infer<typeof careIntakeSchema>;

/** The record stored in trip_requests.care_intake. */
export interface CareIntakeRecord {
  payer: CarePayer;
  medicaid_broker: string | null;
  member_id: string | null;
  authorization_no: string | null;
  dob: string;
  consent: {
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
  return {
    payer: v.payer,
    medicaid_broker: v.payer === 'medicaid' ? v.medicaidBroker || null : null,
    member_id: v.memberId || null,
    authorization_no: v.authorizationNumber || null,
    dob: v.dob,
    consent: {
      version: CARE_CONSENT_VERSION,
      signer_name: v.signerName,
      hipaa: true,
      transport_consent: true,
      text_hash: signed.textHash,
      signed_at: signed.signedAt,
      ip: signed.ip,
      ua: signed.ua,
    },
  };
}
