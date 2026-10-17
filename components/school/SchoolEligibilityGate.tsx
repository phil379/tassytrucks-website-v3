'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SchoolSetupWizard from '@/components/school/SchoolSetupWizard';
import {
  HOUSEHOLD_PROMPT_BODY,
  HOUSEHOLD_PROMPT_TITLE,
  NONSTANDARD_REASONS,
  classifyHousehold,
  householdRequestHref,
  type NonstandardReason,
} from '@/lib/school-household';
import type { SchoolPlan } from '@/lib/school-plans';

/**
 * The door in front of the standard booking.
 *
 * Standard booking is ONE child, ONE pickup address, ONE school and a STANDARD
 * recurring schedule. Anything else goes to the Custom Household Request, which
 * saves a lead for a person to review and never subscribes, charges, reserves
 * or promises a driver, route, price or start date.
 *
 * The answer is remembered for the tab (sessionStorage, same lifetime as the
 * wizard's own snapshot) so a parent who refreshes mid-signup is not asked
 * again. Only a "none of these" answer is stored -- a family that ticked a box
 * is sent away and never lands in the wizard.
 */
const CONFIRM_KEY = (planKey: string) => `tassy:school:standard-confirmed:${planKey}`;

export default function SchoolEligibilityGate({
  plan,
  googleMapsApiKey,
}: {
  plan: SchoolPlan;
  googleMapsApiKey: string | undefined;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<NonstandardReason[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  // Until we have read sessionStorage we render the gate, never the wizard: the
  // server cannot see storage, and flashing the wizard at someone who is about
  // to be redirected is worse than flashing the gate at someone who is not.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(CONFIRM_KEY(plan.key)) === 'yes') setConfirmed(true);
    } catch {
      /* private mode: the gate simply asks again */
    }
    setReady(true);
  }, [plan.key]);

  if (confirmed) {
    return (
      <SchoolSetupWizard
        plan={plan}
        googleMapsApiKey={googleMapsApiKey}
        standardHouseholdConfirmed
      />
    );
  }

  const decision = classifyHousehold(picked);

  function toggle(key: NonstandardReason) {
    setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  function onContinue() {
    if (decision.path === 'custom') {
      router.push(householdRequestHref(decision.reasons, plan.slug));
      return;
    }
    try {
      window.sessionStorage.setItem(CONFIRM_KEY(plan.key), 'yes');
    } catch {
      /* not remembered; still proceeds */
    }
    setConfirmed(true);
  }

  return (
    <div className="card-tile p-6 sm:p-8" data-testid="school-eligibility-gate">
      <h2 className="serif text-xl font-semibold">A quick check before you start</h2>
      <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
        This booking is for <strong>one child</strong>, <strong>one pickup address</strong>,{' '}
        <strong>one school</strong> and a regular school-day schedule. If your family is
        different, tell us and we will plan it with you.
      </p>

      <fieldset className="mt-6" disabled={!ready}>
        <legend className="mb-3 text-sm font-medium">Does any of this apply to your family?</legend>
        <ul className="space-y-2.5">
          {NONSTANDARD_REASONS.map((r) => {
            const id = `gate-${r.key}`;
            return (
              <li key={r.key}>
                <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm">
                  <input
                    id={id}
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0"
                    checked={picked.includes(r.key)}
                    onChange={() => toggle(r.key)}
                  />
                  <span>{r.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {decision.path === 'custom' ? (
        <p
          role="status"
          className="mt-5 rounded-lg border border-[color:var(--line)] px-3 py-2.5 text-sm text-[color:var(--ink-soft)]"
        >
          {HOUSEHOLD_PROMPT_TITLE} {HOUSEHOLD_PROMPT_BODY}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Link
          href="/school/book"
          className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
        >
          All plans
        </Link>
        <button
          type="button"
          disabled={!ready}
          onClick={onContinue}
          className="btn-primary min-h-[44px] disabled:opacity-40"
          data-testid="school-gate-continue"
        >
          {decision.path === 'custom' ? 'Continue to a custom request' : 'None of these — start booking'}
        </button>
      </div>
    </div>
  );
}
