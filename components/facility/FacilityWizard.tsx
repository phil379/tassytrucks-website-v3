'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  BILLING_MODES,
  FACILITY_KINDS,
  facilityKind,
  passengerNoun,
} from '@/lib/facility';
import {
  inviteTeammates,
  saveFacilityBilling,
  saveFacilityProfile,
  type ActionResult,
} from '@/app/facility/welcome/actions';

/**
 * The four screens behind the magic link.
 *
 * COPY THAT IS NOT MINE TO EDIT. The Screen 3 credit-account wording and the
 * bridge checkbox label are Phil's, verbatim. They resolve a real conflict: the
 * wizard spec said "no approval", the schema says a weekly account is a credit
 * decision nobody opens without him. Both were true — "no approval" meant the
 * teammate approver role, not credit. So weekly stays pending AND the facility
 * can still book today on passenger-pays. Do not soften either string.
 *
 * NO CLINICAL DATA. No diagnosis, procedure, condition, medication, date of
 * birth, insurance id or medical record number is collected on any screen here,
 * and none should be added. The booking form's MRN guard
 * (`looksLikeMedicalRecordNumber`) covers the free-text field that actually
 * tempts it.
 */

const field =
  'w-full rounded-lg border border-[color:var(--line)] bg-[#0f141a] px-3 py-3 text-base text-[color:var(--ink)] outline-none focus-visible:outline-3 focus-visible:outline-[color:var(--gold-warm)]';
const label = 'block text-sm font-medium mb-1.5';
const err = 'mt-1.5 text-sm text-[#f87171]';

const STEPS = ['About your facility', 'Who books rides', 'How you pay', 'Your Tassy contact'] as const;

type Invite = { email: string; role: 'requester' | 'admin' };

export default function FacilityWizard({
  facilityName,
  accountManager,
  initialKind,
}: {
  facilityName: string;
  accountManager: string | null;
  initialKind: string;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Screen 1
  const [kind, setKind] = useState(initialKind || 'hospital');
  // Screen 2
  const [invites, setInvites] = useState<Invite[]>([{ email: '', role: 'requester' }]);
  // Screen 3
  const [billingMode, setBillingMode] = useState<'invoice_weekly' | 'patient_card'>('invoice_weekly');
  const [poRequired, setPoRequired] = useState(false);
  const [bridge, setBridge] = useState(false);

  const noun = useMemo(() => passengerNoun(kind), [kind]);
  const defaultLine = useMemo(() => facilityKind(kind).defaultLine, [kind]);

  function handle(result: ActionResult, onOk: () => void) {
    if (result.ok) {
      setErrors({});
      setFormError(null);
      onOk();
      return;
    }
    setErrors(result.fieldErrors ?? {});
    setFormError(result.error);
  }

  async function submitStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      handle(
        await saveFacilityProfile({
          kind,
          address: String(fd.get('address') ?? ''),
          addressPlaceId: null,
          phone: String(fd.get('phone') ?? ''),
          website: String(fd.get('website') ?? '') || null,
          primaryContactName: String(fd.get('primaryContactName') ?? ''),
          primaryContactPhone: String(fd.get('primaryContactPhone') ?? '') || null,
        }),
        () => setStep(1),
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitStep2() {
    setBusy(true);
    try {
      const cleaned = invites.filter((i) => i.email.trim() !== '');
      handle(await inviteTeammates({ invites: cleaned }), () => setStep(2));
    } finally {
      setBusy(false);
    }
  }

  async function submitStep3(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      handle(
        await saveFacilityBilling({
          billingMode,
          billingContactName: String(fd.get('billingContactName') ?? '') || null,
          billingEmail: String(fd.get('billingEmail') ?? '') || null,
          poRequired,
          bookNowOnPassengerPays: bridge,
        }),
        () => setStep(3),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-tile p-6 sm:p-8">
      {/* Progress. aria-current marks the live step for a screen reader. */}
      <ol className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? 'step' : undefined}
            className={
              i === step
                ? 'font-semibold text-[color:var(--gold)]'
                : i < step
                  ? 'text-[color:var(--ink-soft)]'
                  : 'text-[color:var(--ink-mute)]'
            }
          >
            {i < step ? <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> : `${i + 1}. `}
            {s}
          </li>
        ))}
      </ol>

      {formError && (
        <p role="alert" className="mb-6 rounded-lg border border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.08)] p-4 text-sm text-[#fca5a5]">
          {formError}
        </p>
      )}

      {/* ── SCREEN 1 ─────────────────────────────────────────────────────── */}
      {step === 0 && (
        <form onSubmit={submitStep1} noValidate className="space-y-6">
          <h2 className="serif text-2xl font-semibold">About {facilityName}</h2>

          <div>
            <label className={label} htmlFor="kind">
              What kind of facility?
            </label>
            <select id="kind" name="kind" className={field} value={kind} onChange={(e) => setKind(e.target.value)}>
              {FACILITY_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[color:var(--ink-mute)]">
              Sets what you book by default — every service is still offered on each ride.
              We will call your riders {noun}s.
            </p>
          </div>

          <div>
            <label className={label} htmlFor="address">
              Address <span aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input id="address" name="address" className={field} autoComplete="street-address" required />
            {errors.address && <p className={err}>{errors.address}</p>}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="phone">
                Main phone <span aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <input id="phone" name="phone" type="tel" className={field} required />
              {errors.phone && <p className={err}>{errors.phone}</p>}
            </div>
            <div>
              <label className={label} htmlFor="website">
                Website
              </label>
              <input id="website" name="website" className={field} />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="primaryContactName">
                Who should we ask for? <span aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <input id="primaryContactName" name="primaryContactName" className={field} required />
              {errors.primaryContactName && <p className={err}>{errors.primaryContactName}</p>}
            </div>
            <div>
              <label className={label} htmlFor="primaryContactPhone">
                Their direct line
              </label>
              <input id="primaryContactPhone" name="primaryContactPhone" type="tel" className={field} />
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : 'Continue'}
          </button>
        </form>
      )}

      {/* ── SCREEN 2 ─────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="serif text-2xl font-semibold">Who books rides</h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              Invite the people who will actually book. You can add more later, and you can skip this now.
            </p>
          </div>

          <ul className="space-y-3">
            {invites.map((inv, i) => (
              <li key={i} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <div>
                  <label className="sr-only" htmlFor={`invite-email-${i}`}>
                    Teammate email
                  </label>
                  <input
                    id={`invite-email-${i}`}
                    type="email"
                    placeholder="name@facility.org"
                    className={field}
                    value={inv.email}
                    onChange={(e) =>
                      setInvites((v) => v.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                    }
                  />
                  {errors[`invites.${i}.email`] && <p className={err}>{errors[`invites.${i}.email`]}</p>}
                </div>
                <div>
                  <label className="sr-only" htmlFor={`invite-role-${i}`}>
                    What they can do
                  </label>
                  <select
                    id={`invite-role-${i}`}
                    className={field}
                    value={inv.role}
                    onChange={(e) =>
                      setInvites((v) =>
                        v.map((x, j) => (j === i ? { ...x, role: e.target.value as Invite['role'] } : x)),
                      )
                    }
                  >
                    {/* Only two. `billing` waits until an AP clerk asks for it, and
                        `approver` is gone — there is no approval gate to approve. */}
                    <option value="requester">Books rides</option>
                    <option value="admin">Manages the account</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setInvites((v) => (v.length === 1 ? v : v.filter((_, j) => j !== i)))}
                  className="btn-ghost min-h-[48px] px-3"
                  aria-label={`Remove teammate ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setInvites((v) => [...v, { email: '', role: 'requester' }])}
            className="btn-ghost min-h-[44px]"
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add another
          </button>

          <div className="flex flex-wrap gap-3">
            <button onClick={submitStep2} disabled={busy} className="btn-primary justify-center disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : 'Continue'}
            </button>
            <button type="button" onClick={() => setStep(2)} className="btn-ghost">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* ── SCREEN 3 ─────────────────────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={submitStep3} noValidate className="space-y-6">
          <h2 className="serif text-2xl font-semibold">How you pay</h2>

          <fieldset className="space-y-3">
            <legend className="sr-only">Billing arrangement</legend>
            {BILLING_MODES.map((m) => (
              <label
                key={m.value}
                className={`block cursor-pointer rounded-lg border p-4 ${
                  billingMode === m.value
                    ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/10'
                    : 'border-[color:var(--line)]'
                }`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="billingMode"
                    value={m.value}
                    checked={billingMode === m.value}
                    onChange={() => setBillingMode(m.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">{m.label}</span>
                    <span className="mt-1 block text-sm text-[color:var(--ink-soft)]">{m.blurb}</span>

                    {/* Phil's copy, verbatim. Says the quiet part out loud so nobody
                        finishes onboarding expecting to book on account today. */}
                    {m.value === 'invoice_weekly' && (
                      <span className="mt-2 block text-sm text-[color:var(--ink-mute)]">
                        Weekly invoicing is a credit account, so we open it by hand. Phil reviews
                        and approves — usually the same business day.
                      </span>
                    )}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {billingMode === 'invoice_weekly' && (
            <>
              {/* Removes the dead window without touching the credit decision. */}
              <label className="flex min-h-[44px] items-center gap-3">
                <input
                  type="checkbox"
                  checked={bridge}
                  onChange={(e) => setBridge(e.target.checked)}
                  className="h-5 w-5"
                />
                <span className="text-sm">I need to book before then — use passenger-pays in the meantime</span>
              </label>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="billingEmail">
                    Where do invoices go? <span aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input id="billingEmail" name="billingEmail" type="email" className={field} />
                  {errors.billingEmail && <p className={err}>{errors.billingEmail}</p>}
                </div>
                <div>
                  <label className={label} htmlFor="billingContactName">
                    Accounts contact
                  </label>
                  <input id="billingContactName" name="billingContactName" className={field} />
                </div>
              </div>

              <label className="flex min-h-[44px] items-center gap-3">
                <input
                  type="checkbox"
                  checked={poRequired}
                  onChange={(e) => setPoRequired(e.target.checked)}
                  className="h-5 w-5"
                />
                <span className="text-sm">Do you require a PO number on invoices?</span>
              </label>
              {poRequired && (
                <p className="text-xs text-[color:var(--ink-mute)]">
                  We will ask for the PO on each invoice, so you can use a different one per period.
                </p>
              )}
            </>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : 'Finish setup'}
          </button>
        </form>
      )}

      {/* ── SCREEN 4 ─────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5 text-center" role="status" aria-live="polite">
          <Check className="mx-auto h-12 w-12 text-[color:var(--gold)]" aria-hidden="true" />
          <h2 className="serif text-2xl font-semibold">{facilityName} is set up</h2>

          <div className="rounded-lg border border-[color:var(--line)] p-4 text-left">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--ink-mute)]">
              Your Tassy contact
            </p>
            {/* Name only. There is no staff table, so there is no verified
                email to show and no service promise we can stand behind. */}
            {accountManager ? (
              <p className="mt-2">
                Your account manager is <strong>{titleCase(accountManager)}</strong>.
              </p>
            ) : (
              <p className="mt-2 text-[color:var(--ink-soft)]">
                We are assigning your account manager now and will introduce them by email.
              </p>
            )}
          </div>

          {billingMode === 'invoice_weekly' && !bridge ? (
            <p className="text-sm text-[color:var(--ink-soft)]">
              We&rsquo;ll email you the moment your account is open.
            </p>
          ) : (
            <p className="text-sm text-[color:var(--ink-soft)]">
              You can book your first ride now.
            </p>
          )}

          <p className="text-sm text-[color:var(--ink-mute)]">
            Anything at all —{' '}
            <a className="underline" href="tel:+17049418508">
              (704) 941-8508
            </a>
            .
          </p>
        </div>
      )}

      <p className="mt-8 text-xs text-[color:var(--ink-mute)]">
        We never ask for a diagnosis, a procedure, a date of birth or a medical record number —
        on this form or any other. Default service line for a {facilityKind(kind).label.toLowerCase()}:{' '}
        {defaultLine}.
      </p>
    </div>
  );
}

/** `marcus-bell` → `Marcus Bell`. Best available until a staff table exists. */
function titleCase(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}
