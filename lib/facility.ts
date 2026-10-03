import { z } from 'zod';
// Mobility vocabulary is owned by the trip pipeline, not duplicated here — a
// saved passenger's mobility has to be a value the quote engine accepts, or a
// one-click rebook produces a trip nobody can price. trip-request.ts does not
// import this file, so there is no cycle.
import { MOBILITY_VALUES } from '@/lib/trip-request';

/**
 * Facility accounts — the shared domain module.
 *
 * Imported by BOTH the client form and the server route, so nothing here may
 * touch process.env, the Supabase client, or anything server-only. The same
 * split lib/trip-request.ts uses, for the same reason: one definition of what
 * a valid signup is, enforced in both places, so the browser and the server
 * can never disagree about it.
 */

/* ───────────────────────────────────────────────────────────── facility kind */

/**
 * `defaultLine` is the ONLY thing kind decides. A facility never picks a
 * vehicle tier — the mobility answer promotes care -> care_wav exactly as it
 * does for a retail booking. Asking a receptionist to understand your fleet
 * taxonomy is how a partner stops using the form.
 */
export const FACILITY_KINDS = [
  { value: 'hospital',       label: 'Hospital',                 defaultLine: 'care',     passenger: 'patient' },
  { value: 'dialysis',       label: 'Dialysis center',          defaultLine: 'care',     passenger: 'patient' },
  { value: 'surgery_center', label: 'Surgery center',           defaultLine: 'recovery', passenger: 'patient' },
  { value: 'dental',         label: 'Dental practice',          defaultLine: 'recovery', passenger: 'patient' },
  { value: 'clinic',         label: 'Clinic or physician group', defaultLine: 'care',    passenger: 'patient' },
  { value: 'veterinary',     label: 'Veterinary practice',      defaultLine: 'winnie',   passenger: 'pet' },
  { value: 'rehab',          label: 'Rehab or skilled nursing', defaultLine: 'care',     passenger: 'resident' },
  { value: 'senior_living',  label: 'Senior living',            defaultLine: 'care',     passenger: 'resident' },
  { value: 'other',          label: 'Something else',           defaultLine: 'care',     passenger: 'passenger' },
] as const;

export type FacilityKind = (typeof FACILITY_KINDS)[number]['value'];

const KIND_VALUES = FACILITY_KINDS.map((k) => k.value) as [FacilityKind, ...FacilityKind[]];

/**
 * `?type=` off a marketing URL, turned into a kind we will actually store.
 *
 * facilities.kind is NOT NULL DEFAULT 'other'. Before 2026-10-01 the vet
 * partner page passed `type=veterinary` to the SaaS and nothing on this side
 * read it, so every signup landed as 'other' with service_lines '{}' — the one
 * fact the page existed to capture, dropped at the insert.
 *
 * An unrecognised value falls back to 'other' instead of failing validation. A
 * stale or hand-edited link must never be the reason a real facility cannot
 * sign up; a wrong kind is a one-field correction, a blocked signup is a lost
 * partner.
 */
export function coerceFacilityKind(raw: unknown): FacilityKind {
  if (typeof raw !== 'string') return 'other';
  const v = raw.trim().toLowerCase();
  return (KIND_VALUES as readonly string[]).includes(v) ? (v as FacilityKind) : 'other';
}

/** The service line a kind starts with, for seeding facilities.service_lines. */
export function defaultLineForKind(kind: FacilityKind): string {
  return FACILITY_KINDS.find((k) => k.value === kind)?.defaultLine ?? 'care';
}

export function facilityKind(value: string) {
  return FACILITY_KINDS.find((k) => k.value === value) ?? FACILITY_KINDS[FACILITY_KINDS.length - 1];
}

/** What this kind of facility books unless the requester says otherwise. */
export function defaultServiceLineForKind(kind: string): string {
  return facilityKind(kind).defaultLine;
}

/** "patient" / "pet" / "resident" — used to word the form, not to store data. */
export function passengerNoun(kind: string): string {
  return facilityKind(kind).passenger;
}

/* ────────────────────────────────────────────────────────────────── billing */

export const BILLING_MODES = [
  {
    value: 'invoice_weekly',
    label: 'Bill us weekly',
    blurb: 'No card at booking. One invoice every Monday for the week before.',
  },
  {
    value: 'patient_card',
    label: 'The passenger pays',
    blurb: 'We send a secure payment link to the passenger. You never handle their card.',
  },
] as const;

export type BillingMode = (typeof BILLING_MODES)[number]['value'];

/** Who pays for ONE trip. Defaults from the facility, overridable per booking. */
export type Payer = 'facility' | 'passenger';

export function payerFromBillingMode(mode: string): Payer {
  return mode === 'patient_card' ? 'passenger' : 'facility';
}

/**
 * The payment_status a new facility trip starts in.
 *
 * `on_account` already exists in app/ops/actions.ts and already means "do not
 * mint a Stripe link, this is invoiced". Weekly facility billing is therefore
 * not a new payment path — it is the path that was already there.
 */
export function initialPaymentStatus(payer: Payer): 'on_account' | 'unpaid' {
  return payer === 'facility' ? 'on_account' : 'unpaid';
}

/**
 * Facility Account pricing, per the approved rate card: 5% preferred at 10-24
 * trips/month, 10% contract rate at 25+.
 *
 * The rate is STORED on the facility rather than recomputed from last month's
 * volume. A partner who negotiated 10% and then had a quiet February should not
 * silently get a price rise — that conversation belongs to a human.
 */
export function applyFacilityDiscount(cents: number, discountPct: number): {
  discountCents: number;
  totalCents: number;
} {
  const pct = Number.isFinite(discountPct) ? Math.max(0, Math.min(100, discountPct)) : 0;
  const discountCents = Math.round((cents * pct) / 100);
  return { discountCents, totalCents: cents - discountCents };
}

/* ──────────────────────────────────────────────────────────────────── roles */

export const FACILITY_USER_ROLES = [
  { value: 'requester', label: 'Books rides' },
  { value: 'approver',  label: 'Books and approves' },
  { value: 'billing',   label: 'Sees invoices only' },
  { value: 'admin',     label: 'Manages the account' },
] as const;

export type FacilityUserRole = (typeof FACILITY_USER_ROLES)[number]['value'];

/* ─────────────────────────────────────────────── the no-clinical-data guard */

/**
 * `facility_ref` is the FACILITY'S OWN booking reference — a job number, a
 * shift code, whatever they use internally. It is not a medical record number,
 * and this schema has no field that is.
 *
 * But a free text box next to a patient's name is exactly where a busy
 * receptionist pastes an MRN, and once it is in the database it is PHI we did
 * not agree to hold. So the label says not to, and this rejects the shape.
 *
 * Deliberately conservative: strip spaces and dashes, and refuse anything left
 * that is six or more digits and nothing else. That catches MRNs, SSNs and
 * member ids while leaving "DIAL-MWF", "Bay 3" and "PO 4417" alone.
 */
export function looksLikeMedicalRecordNumber(value: string): boolean {
  const bare = value.replace(/[\s\-.]/g, '');
  return /^\d{6,}$/.test(bare);
}

const facilityRef = z
  .string()
  .trim()
  .max(80)
  .optional()
  .nullable()
  .refine((v) => !v || !looksLikeMedicalRecordNumber(v), {
    message:
      'Please use your own booking reference rather than a medical record number.',
  });

/* ─────────────────────────────────────────────────────────────── the schemas */

const trimmed = (max: number) => z.string().trim().max(max);

/**
 * STEP 0 — the two fields on the public page.
 *
 * Kept to two on purpose: the page promises "60 seconds, no credit card" and
 * that promise is worth keeping. Everything else is asked AFTER the magic link,
 * where the person has already committed.
 *
 * hp_token and elapsedMs are the bot checks from lib/trip-request.ts, and they
 * are here for the same reason they were renamed there on 2026-09-25: a field
 * called `company` is an autofill category and browsers fill it even when it is
 * off-screen. Do not rename hp_token to anything a password manager recognises.
 */
export const facilitySignupSchema = z.object({
  facilityName: trimmed(200).min(2, 'Enter your facility name'),
  workEmail: z.string().trim().email('Enter a valid work email'),
  hp_token: z.string().optional().nullable(),
  elapsedMs: z.coerce.number().int().min(0).optional().nullable(),

  /**
   * The sales rep who owns this signup, from `/partners/signup?rep=<slug>`.
   *
   * Attribution rides the URL so a hospital never types a Tassy employee's
   * name — it cannot be faked or mistyped. Absent means nobody gets credit and
   * the account needs manual assignment, which is a real outcome, not an error,
   * so this is optional.
   *
   * Slug-shaped only. A stray value here would otherwise be written straight
   * into the column that drives residual commission.
   */
  /**
   * The facility kind, from `/partners/signup?type=<kind>`.
   *
   * Lenient on purpose: anything unrecognised becomes 'other' via
   * coerceFacilityKind rather than failing the form. The visitor did not type
   * this — it came off a link we control, and a link we got wrong is our
   * mistake to absorb, not theirs to be blocked by.
   */
  kind: z
    .unknown()
    .transform(coerceFacilityKind)
    .optional(),

  rep: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/, 'Unrecognised referral link')
    .optional()
    .nullable(),
});

export type FacilitySignupInput = z.infer<typeof facilitySignupSchema>;

/** STEP 1 — the facility itself, filled in behind the magic link. */
export const facilityProfileSchema = z.object({
  kind: z.enum(KIND_VALUES),
  address: trimmed(500).min(5, 'Enter the facility address'),
  addressPlaceId: z.string().optional().nullable(),
  phone: trimmed(40).min(7, 'Enter a phone number'),
  website: trimmed(200).optional().nullable(),
  primaryContactName: trimmed(120).min(2, 'Who should we ask for?'),
  primaryContactPhone: trimmed(40).optional().nullable(),
});

/** STEP 3 — billing. */
export const facilityBillingSchema = z.object({
  billingMode: z.enum(['invoice_weekly', 'patient_card']),
  billingContactName: trimmed(120).optional().nullable(),
  billingEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid billing email')])
    .optional()
    .nullable(),
  poRequired: z.boolean().default(false),
}).superRefine((v, ctx) => {
  // A weekly invoice with nowhere to send it is not a billing arrangement.
  if (v.billingMode === 'invoice_weekly' && !v.billingEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['billingEmail'],
      message: 'We need somewhere to send the weekly invoice.',
    });
  }
});

/** STEP 4 — attribution. Two fields, because they diverge the day you hire. */
export const facilityAttributionSchema = z.object({
  /** Who SOLD it. Never changes. This is the commission record. */
  referredByRep: trimmed(120).optional().nullable(),
  /** How they say they found you — a different question with a different answer. */
  referralSource: trimmed(200).optional().nullable(),
});

/**
 * A ride requested by a facility. Extends the retail trip, never replaces it.
 *
 * NOTE WHAT IS NOT HERE, and keep it that way: no diagnosis, no procedure, no
 * condition, no medication, no MRN, no insurance member id, no date of birth.
 * `facilityRef` carries the MRN-shape guard above because a free text box next
 * to a patient's name is where one gets pasted.
 *
 * `facility_id` IS NOT A FIELD. It comes from the session cookie in
 * /api/trip-request and nowhere else — a facility id accepted from a form body
 * is one coordinator billing another facility's account.
 *
 * `payer` is optional because resolvePayer() already owns the default (the
 * facility's billing mode) and its signature takes `override?: Payer | null`.
 * A client that predates the payer toggle must still be able to book; it gets
 * the facility's default, which is the right answer, not a 400.
 */
export const facilityTripExtrasSchema = z.object({
  facilityRef,
  authorizedBy: trimmed(120).optional().nullable(),
  payer: z.enum(['facility', 'passenger']).optional().nullable(),
});

/* ─────────────────────────────────────────────────────────────────── status */

export const FACILITY_STATUSES = ['pending', 'active', 'suspended', 'closed'] as const;
export type FacilityStatus = (typeof FACILITY_STATUSES)[number];

/**
 * Can this facility book right now?
 *
 * `pending` is deliberate and is the most important rule in this module. A
 * weekly-invoice account is a CREDIT DECISION — a stranger must not be able to
 * open one and start accruing charges. A patient_card account carries no credit
 * exposure, so it can be let through the moment the email is verified.
 */
export function canBook(facility: { status: string; billing_mode: string }): boolean {
  if (facility.status === 'active') return true;
  if (facility.status === 'pending' && facility.billing_mode === 'patient_card') return true;
  return false;
}

/* ────────────────────────────────────────────────── saved passenger profiles */

/**
 * A saved passenger, as the facility console stores one.
 *
 * READ THE OMISSIONS. Phil's Facility_Portal_Walkthrough.html listed, against
 * each named person, "78 · Wheelchair · DOB 1948-03-12 · MRN 442891". There is
 * no age field here, no date of birth, and no record number, and none should be
 * added: the standing rule is no diagnosis, procedure, condition, medication,
 * insurance member id, MRN or DOB anywhere in this system, and the facility
 * wizard promises exactly that to the customer on screen.
 *
 * Nothing operational is lost. A driver needs who is travelling, how they
 * travel, and where they are going. `facilityRef` carries the facility's own
 * code and is guarded against an MRN at BOTH ends -- here, and by a CHECK
 * constraint on the column (FACILITY_03), so a direct insert cannot get one in
 * either. `accessNotes` is logistics: "meet at the discharge desk", "needs the
 * ramp not the lift". Not a clinical note, and the label says so.
 */
export const facilityPatientSchema = z.object({
  displayName: trimmed(200).min(2, 'Enter the passenger’s name'),
  mobility: z.enum(MOBILITY_VALUES).optional().nullable(),
  facilityRef,
  accessNotes: trimmed(500).optional().nullable(),
});

export type FacilityPatientInput = z.infer<typeof facilityPatientSchema>;
