'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from '@/components/request/AddressAutocomplete';
import SchoolPicker from '@/components/school/SchoolPicker';
import { PolicyBody } from '@/components/school/PolicyBody';
import {
  AM_TIMES,
  PM_TIMES,
  PROGRAMS,
  SCHOOL_POLICIES,
  STEP_TITLES,
  WEEKDAYS,
  SIBLING_NOTE,
  SAFETY_NOTE_HINT,
  SAFETY_NOTE_LABEL,
  restoreStep,
  wizardStorageKey,
  type PolicyKey,
  type SchoolPlan,
} from '@/lib/school-plans';

const field =
  'w-full rounded-lg border border-[color:var(--line)] bg-[#0f141a] px-3 py-3 text-base text-[color:var(--ink)] outline-none focus-visible:outline-3 focus-visible:outline-[color:var(--gold-warm)]';
const label = 'block text-sm font-medium mb-1.5';
const err = 'mt-1.5 text-sm text-[#f87171]';

type Policies = Record<PolicyKey, boolean>;

type ParentForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  home_address: string;
};

type ChildForm = {
  first_name: string;
  last_name: string;
  grade: string;
  school_name: string;
  school_id: string;
  school_address: string;
  /** True only when the address came from the school list, not the parent. */
  school_address_confirmed: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  safety_note: string;
};

type SchedForm = {
  am?: string;
  pm?: string;
  days: string[];
  program?: string;
  programDay?: string;
  programTime?: string;
  programLocation?: string;
};

/**
 * Tassy Scholar setup — six steps, ported from TassyOps 2026-09-29.
 *
 * Step 6 ("You're all set") is reachable ONLY from a response carrying a real
 * id. Do not add a fallback that treats a rejection, a missing id or an error
 * payload as success: the route this was ported from did exactly that, and a
 * parent could finish the whole wizard against a database that stored nothing.
 * `setDone(json.id ?? 'received')` is the same bug that shipped on 2026-09-25.
 *
 * Pricing is never a dollar amount.
 */
export default function SchoolSetupWizard({
  plan,
  googleMapsApiKey,
}: {
  plan: SchoolPlan;
  googleMapsApiKey: string | undefined;
}) {
  const router = useRouter();
  // Restore a prior in-progress snapshot for THIS plan. Read once, on mount.
  const [restored] = useState<Record<string, unknown> | null>(() => loadWizardState(plan.key));
  const [step, setStep] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  const [parent, setParent] = useState<ParentForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    home_address: '',
    ...((restored?.parent as object) ?? {}),
  });
  const [child, setChild] = useState<ChildForm>({
    first_name: '',
    last_name: '',
    grade: '',
    school_name: '',
    school_id: '',
    school_address: '',
    school_address_confirmed: false,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    safety_note: '',
    ...((restored?.child as object) ?? {}),
  });
  const [sched, setSched] = useState<SchedForm>(() => ({
    days: [],
    ...((restored?.sched as object) ?? {}),
  }));
  const [policies, setPolicies] = useState<Policies>(() => ({
    ...(Object.fromEntries(SCHOOL_POLICIES.map((p) => [p.key, false])) as Policies),
    ...((restored?.policies as object) ?? {}),
  }));
  const [commit, setCommit] = useState<boolean>(() => Boolean(restored?.commit));

  /**
   * Restore the step AFTER mount, never during render.
   *
   * The server renders step 1 because it cannot see sessionStorage; starting
   * the client on a restored step instead would make the first client render
   * disagree with the HTML and React would throw a hydration error. Moving it
   * into an effect costs one frame and is the only correct place for it.
   */
  useEffect(() => {
    const s = restoreStep(restored);
    if (s !== 1) setStep(s);
    // Once, on mount, from the snapshot read at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change; clear once submitted. sessionStorage (not local)
  // so it is tab-scoped and self-expires.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = wizardStorageKey(plan.key);
    if (step >= 6) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* private mode */
      }
      return;
    }
    try {
      window.sessionStorage.setItem(
        key,
        JSON.stringify({ step, parent, child, sched, policies, commit }),
      );
    } catch {
      /* private mode / quota — degrade to in-memory only */
    }
  }, [plan.key, step, parent, child, sched, policies, commit]);

  const canContinue = (() => {
    switch (step) {
      case 1:
        return Boolean(
          parent.first_name &&
            parent.last_name &&
            /.+@.+\..+/.test(parent.email) &&
            parent.phone &&
            parent.home_address,
        );
      case 2:
        return Boolean(
          child.first_name &&
            child.last_name &&
            child.school_name &&
            child.school_address &&
            child.emergency_contact_name &&
            child.emergency_contact_phone,
        );
      case 3:
        if (plan.key === 'after_school') return Boolean(sched.program && sched.programDay && sched.programTime);
        if (plan.key === 'weekly_pattern') return sched.days.length > 0 && Boolean(sched.am || sched.pm);
        return Boolean(sched.am && sched.pm);
      case 4:
        return SCHOOL_POLICIES.every((p) => policies[p.key]);
      case 5:
        return commit;
      default:
        return true;
    }
  })();

  async function onCommit() {
    setBusy(true);
    setFormError(null);
    const ts = new Date().toISOString();
    try {
      const res = await fetch('/api/school-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan.slug,
          parent,
          child: {
            ...child,
            grade: child.grade || null,
            safety_note: child.safety_note || null,
            school_id: child.school_id || null,
          },
          schedule: sched,
          policies: Object.fromEntries(
            SCHOOL_POLICIES.map((p) => [p.key, { accepted: true as const, ts }]),
          ),
          starts_on: nextSchoolStart(),
          hp_token: '',
          elapsedMs: Date.now() - startedAt,
        }),
      });

      const json = await res.json().catch(() => null);

      /**
       * A real id is the ONLY proof a booking exists. A 200 with a null id is
       * what the bot filter returns, and an error payload has no id at all —
       * both are failures and neither may reach step 6.
       */
      if (!res.ok || !json?.ok || typeof json?.id !== 'string' || json.id.length === 0) {
        setFormError(
          json?.error ??
            'We could not save your setup, and nothing has been booked. Please call (704) 941-8508.',
        );
        return;
      }

      setReference(json.reference ?? null);
      setStep(6);
    } catch {
      setFormError(
        'We could not reach the server, and nothing has been booked. Please call (704) 941-8508.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-tile p-6 sm:p-8">
      <ol className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {STEP_TITLES.map((title, i) => (
          <li
            key={title}
            aria-current={i + 1 === step ? 'step' : undefined}
            className={
              i + 1 === step
                ? 'font-semibold text-[color:var(--gold)]'
                : 'text-[color:var(--ink-mute)]'
            }
          >
            {i + 1}. {title}
          </li>
        ))}
      </ol>

      {formError && (
        <p role="alert" className="mb-5 rounded-lg border border-[#f87171] px-3 py-2.5 text-sm text-[#f87171]">
          {formError}
        </p>
      )}

      {step === 1 && <ParentStep parent={parent} setParent={setParent} apiKey={googleMapsApiKey} />}
      {step === 2 && <ChildStep child={child} setChild={setChild} apiKey={googleMapsApiKey} />}
      {step === 3 && <ScheduleStep plan={plan} sched={sched} setSched={setSched} />}
      {step === 4 && <PolicyStep policies={policies} setPolicies={setPolicies} />}
      {step === 5 && <CommitStep plan={plan} commit={commit} setCommit={setCommit} />}
      {step === 6 && <DoneStep reference={reference} childName={child.first_name} plan={plan} />}

      {step < 6 && (
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (step === 1 ? router.push('/school/book') : setStep((s) => Math.max(1, s - 1)))}
            className="min-h-[44px] rounded-full px-4 text-sm text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
          >
            {step === 1 ? 'All plans' : 'Back'}
          </button>
          {step < 5 ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary min-h-[44px] disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!canContinue || busy}
              onClick={onCommit}
              className="btn-primary min-h-[44px] disabled:opacity-40"
            >
              {busy ? 'Confirming…' : 'Confirm commitment'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Read a persisted snapshot. Kept here because it touches window directly. */
function loadWizardState(planKey: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(wizardStorageKey(planKey));
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** First ride defaults to the start of the school year. */
function nextSchoolStart(): string {
  return '2026-08-24';
}

function Field({
  htmlFor,
  labelText,
  hint,
  children,
}: {
  htmlFor: string;
  labelText: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={label} htmlFor={htmlFor}>
        {labelText}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-[color:var(--ink-mute)]">{hint}</p> : null}
    </div>
  );
}

function ParentStep({
  parent,
  setParent,
  apiKey,
}: {
  parent: ParentForm;
  setParent: React.Dispatch<React.SetStateAction<ParentForm>>;
  apiKey: string | undefined;
}) {
  const set = (k: keyof ParentForm, v: string) => setParent((prev) => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-5">
      <h2 className="serif text-2xl font-semibold">About you</h2>
      <p className="text-sm text-[color:var(--ink-soft)]">
        This creates your family account — you&rsquo;ll add your child next.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="parentFirst" labelText="First name">
          <input id="parentFirst" className={field} value={parent.first_name} onChange={(e) => set('first_name', e.target.value)} />
        </Field>
        <Field htmlFor="parentLast" labelText="Last name">
          <input id="parentLast" className={field} value={parent.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </Field>
      </div>
      <Field htmlFor="parentEmail" labelText="Email">
        <input id="parentEmail" type="email" className={field} value={parent.email} onChange={(e) => set('email', e.target.value)} />
      </Field>
      <Field htmlFor="parentPhone" labelText="Phone">
        <input id="parentPhone" className={field} value={parent.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(704) 555-0148" />
      </Field>
      <div>
        <AddressAutocomplete
          name="home_address"
          apiKey={apiKey}
          label="Home address"
          required
          defaultValue={parent.home_address}
          onText={(v: string) => set('home_address', v)}
          onResolve={(p) => p?.address && set('home_address', p.address)}
        />
        <p className="mt-1.5 text-xs text-[color:var(--ink-mute)]">Used as the default pickup point.</p>
      </div>
    </div>
  );
}

function ChildStep({
  child,
  setChild,
  apiKey,
}: {
  child: ChildForm;
  setChild: React.Dispatch<React.SetStateAction<ChildForm>>;
  apiKey: string | undefined;
}) {
  const set = (k: keyof ChildForm, v: string) => setChild((prev) => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-5">
      <h2 className="serif text-2xl font-semibold">Your child</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="childFirst" labelText="Child&rsquo;s first name">
          <input id="childFirst" className={field} value={child.first_name} onChange={(e) => set('first_name', e.target.value)} />
        </Field>
        {/* Required: students.last_name is NOT NULL, and a school needs it. */}
        <Field htmlFor="childLast" labelText="Child&rsquo;s last name">
          <input id="childLast" className={field} value={child.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </Field>
      </div>
      <Field htmlFor="grade" labelText="Grade" hint="Optional.">
        <input id="grade" className={field} value={child.grade} onChange={(e) => set('grade', e.target.value)} placeholder="3rd" />
      </Field>
      {/*
        Picked from the list, not typed. A run is several children going to the
        SAME school, so a free-typed name cannot be grouped — and grouping is
        where the margin in Scholar lives. Picking also fills the address, which
        is one fewer thing for a parent to look up.
      */}
      <SchoolPicker
        nameField="school_name_display"
        idField="school_id_display"
        label="School"
        required
        defaultName={child.school_name}
        defaultId={child.school_id}
        onPick={(hit, typed) =>
          setChild((prev) => ({
            ...prev,
            school_name: typed,
            school_id: hit?.id ?? '',
            /*
              Never carry the previous school's address forward. Changing school
              after picking one used to leave the old address sitting in a field
              the parent could no longer see the source of — a wrong destination
              that looks like a filled-in form.
            */
            school_address: hit?.address ?? '',
            school_address_confirmed: Boolean(hit?.address),
          }))
        }
      />
      {/*
        Asked for ONLY when we do not already hold it. 286 of 299 seeded schools
        carry an address, so for almost every parent this input never appears —
        the picker shows the address as confirmation instead. The remount key
        guarantees it comes back EMPTY after a school change rather than
        re-seeding itself from the address that has just been discarded.
      */}
      {!child.school_address_confirmed && (
        <AddressAutocomplete
          key={`school-address-${child.school_id || 'free'}`}
          name="school_address"
          apiKey={apiKey}
          label="School address"
          required
          defaultValue={child.school_address}
          onText={(v: string) => set('school_address', v)}
          onResolve={(p) => p?.address && set('school_address', p.address)}
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="ecName" labelText="Emergency contact">
          <input id="ecName" className={field} value={child.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} />
        </Field>
        <Field htmlFor="ecPhone" labelText="Emergency phone">
          <input id="ecPhone" className={field} value={child.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} />
        </Field>
      </div>
      {/*
        The one safety field. It replaced allergies / carries_medications /
        medication_details / special_needs_notes — a child's health record, tied
        to a home address and a daily pickup time, at a company with no BAA.
        The hint is not decoration: it is what keeps this field non-clinical.
      */}
      <Field htmlFor="safetyNote" labelText={SAFETY_NOTE_LABEL} hint={SAFETY_NOTE_HINT}>
        <textarea id="safetyNote" rows={3} className={field} value={child.safety_note} onChange={(e) => set('safety_note', e.target.value)} />
      </Field>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[44px] rounded-full px-4 text-sm font-medium transition-colors ${
        active
          ? 'bg-[color:var(--gold)] text-[#1B1A17]'
          : 'border border-[color:var(--line)] hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function ScheduleStep({
  plan,
  sched,
  setSched,
}: {
  plan: SchoolPlan;
  sched: SchedForm;
  setSched: React.Dispatch<React.SetStateAction<SchedForm>>;
}) {
  const update = (patch: Partial<SchedForm>) => setSched((prev) => ({ ...prev, ...patch }));

  if (plan.key === 'after_school') {
    return (
      <div className="space-y-6">
        <h2 className="serif text-2xl font-semibold">Schedule</h2>
        <div>
          <span className={label}>Program</span>
          <div className="flex flex-wrap gap-2">
            {PROGRAMS.map((p) => (
              <Chip key={p} active={sched.program === p} onClick={() => update({ program: p })}>{p}</Chip>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>Day of week</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <Chip key={d.label} active={sched.programDay === d.label} onClick={() => update({ programDay: d.label })}>
                {d.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>Pickup time</span>
          <div className="flex flex-wrap gap-2">
            {PM_TIMES.map((t) => (
              <Chip key={t} active={sched.programTime === t} onClick={() => update({ programTime: t })}>{t}</Chip>
            ))}
          </div>
        </div>
        <Field htmlFor="programLocation" labelText="Program location">
          <input
            id="programLocation"
            className={field}
            value={sched.programLocation ?? ''}
            onChange={(e) => update({ programLocation: e.target.value })}
            placeholder="Rec center, field, studio…"
          />
        </Field>
        <p className="text-xs text-[color:var(--ink-mute)]">
          Pay upfront for the season — {plan.price}, quoted once we have the schedule.
        </p>
      </div>
    );
  }

  const toggleDay = (d: string) => {
    const days = sched.days ?? [];
    update({ days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] });
  };

  return (
    <div className="space-y-6">
      <h2 className="serif text-2xl font-semibold">Schedule</h2>
      {plan.key === 'weekly_pattern' ? (
        <div>
          <span className={label}>Which days each week?</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <Chip key={d.label} active={(sched.days ?? []).includes(d.label)} onClick={() => toggleDay(d.label)}>
                {d.label}
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[color:var(--ink-mute)]">Same pattern every week.</p>
        </div>
      ) : (
        <p className="rounded-lg bg-[color:var(--gold)]/10 px-3 py-2.5 text-sm text-[color:var(--gold)]">
          Monday–Friday, the full school year. AM + PM every school day.
        </p>
      )}
      <div>
        <span className={label}>Morning pickup time</span>
        <div className="flex flex-wrap gap-2">
          {AM_TIMES.map((t) => (
            <Chip key={t} active={sched.am === t} onClick={() => update({ am: t })}>{t}</Chip>
          ))}
        </div>
      </div>
      <div>
        <span className={label}>Afternoon pickup time</span>
        <div className="flex flex-wrap gap-2">
          {PM_TIMES.map((t) => (
            <Chip key={t} active={sched.pm === t} onClick={() => update({ pm: t })}>{t}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function PolicyStep({
  policies,
  setPolicies,
}: {
  policies: Policies;
  setPolicies: React.Dispatch<React.SetStateAction<Policies>>;
}) {
  return (
    <div className="space-y-4">
      <h2 className="serif text-2xl font-semibold">Our standards</h2>
      <p className="text-sm text-[color:var(--ink-soft)]">
        These standards keep every child safe and on-time. Please acknowledge each.
      </p>
      {SCHOOL_POLICIES.map((p) => (
        <label
          key={p.key}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-[color:var(--line)] p-4 hover:bg-white/5"
        >
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={policies[p.key]}
            onChange={(e) => setPolicies((prev) => ({ ...prev, [p.key]: e.target.checked }))}
          />
          <span>
            <span className="block text-sm font-medium">{p.title}</span>
            <span className="mt-1 block text-sm text-[color:var(--ink-soft)]">
              <PolicyBody text={p.body} />
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function CommitStep({
  plan,
  commit,
  setCommit,
}: {
  plan: SchoolPlan;
  commit: boolean;
  setCommit: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="space-y-5">
      <h2 className="serif text-2xl font-semibold">Confirm your plan</h2>
      <p className="text-sm text-[color:var(--ink-soft)]">
        You&rsquo;re committing to the <strong>{plan.planLabel}</strong>. {plan.commitment}
      </p>
      <div className="rounded-lg border border-dashed border-[color:var(--line)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Your price</span>
          <span className="serif text-lg">{plan.price}</span>
        </div>
        <p className="mt-1 text-xs text-[color:var(--ink-mute)]">
          Set by school location before your first ride. {plan.billing}.
        </p>
      </div>
      <label className="flex min-h-[44px] items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={commit} onChange={(e) => setCommit(e.target.checked)} />
        <span>
          I authorize the {plan.planLabel} commitment and auto-renewal once pricing is confirmed for my
          school.
        </span>
      </label>
      <p className="text-xs text-[color:var(--ink-mute)]">
        How we handle your child&rsquo;s information and this auto-renewal:{' '}
        <a href="/privacy" target="_blank" rel="noreferrer" className="underline">Privacy Policy</a>
        {' · '}
        <a href="/terms" target="_blank" rel="noreferrer" className="underline">Terms</a>
      </p>
    </div>
  );
}

function DoneStep({
  reference,
  childName,
  plan,
}: {
  reference: string | null;
  childName: string;
  plan: SchoolPlan;
}) {
  return (
    <div className="space-y-4 text-center" role="status" aria-live="polite">
      <h2 className="serif text-2xl font-semibold">You&rsquo;re all set</h2>
      <p className="text-sm text-[color:var(--ink-soft)]">
        {childName ? `${childName} is booked on the ` : 'You are booked on the '}
        {plan.planLabel}. We&rsquo;ll confirm your pricing and your driver before the first ride.
      </p>
      {reference ? (
        <p className="text-xs text-[color:var(--ink-mute)]">
          Reference: <span className="font-mono">{reference}</span>
        </p>
      ) : null}
      <p className="text-sm">
        Questions? <a className="underline" href="tel:+17049418508">(704) 941-8508</a>
      </p>
    </div>
  );
}
