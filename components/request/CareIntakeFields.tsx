'use client';

import {
  CARE_CONSENT_CLAUSES,
  CARE_CONSENT_VERSION,
  CARE_PAYMENT_OPTIONS,
  CARE_PEDIATRIC_PHONE,
  checkAdult,
} from '@/lib/care-intake';
import type { CarePaymentValue } from '@/lib/care-intake';

/**
 * Payment method and age check on a Tassy Care request.
 *
 * Today only card (Stripe) is selectable; Medicaid, insurance and VA are listed
 * as "coming soon" and disabled (lib/care-intake.ts decides, one flag each). The
 * patient's date of birth is asked on every ride for the 18+ rule. The plan
 * details and privacy / transport consent below only appear for a plan payer, so
 * they stay hidden until one is enabled.
 *
 * NOT ASKED, on purpose: diagnosis, procedure, condition, medication.
 */

export type CareIntakeValues = {
  payer: CarePaymentValue;
  medicaidBroker: string;
  memberId: string;
  authorizationNumber: string;
  dob: string;
  hipaa: boolean;
  transportConsent: boolean;
  signerName: string;
};

export const EMPTY_CARE_INTAKE: CareIntakeValues = {
  payer: 'self',
  medicaidBroker: '',
  memberId: '',
  authorizationNumber: '',
  dob: '',
  hipaa: false,
  transportConsent: false,
  signerName: '',
};

const labelCls = 'block text-sm font-medium mb-1.5';

export default function CareIntakeFields({
  values,
  errors,
  onChange,
}: {
  values: CareIntakeValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<CareIntakeValues>) => void;
}) {
  const medical = values.payer !== 'self';
  const err = (k: string) => errors[`careIntake.${k}`];
  const Err = ({ k }: { k: string }) =>
    err(k) ? (
      <p id={`careIntake-${k}-error`} className="form-error">
        {err(k)}
      </p>
    ) : null;

  // Live age hint so a minor sees the phone number before they hit submit.
  const age = values.dob ? checkAdult(values.dob) : null;
  const dobMessage = err('dob') ?? (age && !age.ok ? age.message : null);

  return (
    <div className="border-t border-line pt-6 space-y-6" data-testid="care-intake">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className={labelCls} htmlFor="careIntake-payer">
            How will this ride be paid?
          </label>
          <select
            id="careIntake-payer"
            className="form-field"
            value={values.payer}
            onChange={(e) => onChange({ payer: e.target.value as CarePaymentValue })}
          >
            {CARE_PAYMENT_OPTIONS.map((p) => (
              <option key={p.value} value={p.value} disabled={!p.enabled}>
                {p.enabled ? p.label : `${p.label} (coming soon)`}
              </option>
            ))}
          </select>
          <p className="ink-soft mt-1.5 text-xs">
            We confirm your price first, then send a secure link to pay. No card is taken on this form.
          </p>
        </div>

        <div>
          <label className={labelCls} htmlFor="careIntake-dob">
            Patient date of birth <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="careIntake-dob"
            type="date"
            className="form-field"
            value={values.dob}
            onChange={(e) => onChange({ dob: e.target.value })}
            autoComplete="off"
            aria-invalid={dobMessage ? true : undefined}
            aria-describedby={dobMessage ? 'careIntake-dob-error' : undefined}
          />
          {dobMessage ? (
            <p id="careIntake-dob-error" className="form-error">
              {dobMessage}
            </p>
          ) : (
            <p className="ink-soft text-xs mt-1.5">
              Patients must be 18 or older. For pediatric rides call {CARE_PEDIATRIC_PHONE}. We check it and do not keep the date.
            </p>
          )}
          <Err k="payer" />
        </div>
      </div>

      {medical ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.payer === 'medicaid' ? (
              <div>
                <label className={labelCls} htmlFor="careIntake-broker">
                  Medicaid plan or broker <span aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id="careIntake-broker"
                  className="form-field"
                  maxLength={60}
                  value={values.medicaidBroker}
                  onChange={(e) => onChange({ medicaidBroker: e.target.value })}
                  aria-invalid={err('medicaidBroker') ? true : undefined}
                  aria-describedby={err('medicaidBroker') ? 'careIntake-medicaidBroker-error' : undefined}
                />
                <Err k="medicaidBroker" />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelCls} htmlFor="careIntake-member">
                Member ID
              </label>
              <input
                id="careIntake-member"
                className="form-field"
                maxLength={80}
                autoComplete="off"
                value={values.memberId}
                onChange={(e) => onChange({ memberId: e.target.value })}
              />
              <Err k="memberId" />
            </div>
            <div>
              <label className={labelCls} htmlFor="careIntake-auth">
                Authorization number
              </label>
              <input
                id="careIntake-auth"
                className="form-field"
                maxLength={80}
                autoComplete="off"
                value={values.authorizationNumber}
                onChange={(e) => onChange({ authorizationNumber: e.target.value })}
              />
              <p className="ink-soft text-xs mt-1.5">If you have one. We can look it up with your plan.</p>
              <Err k="authorizationNumber" />
            </div>
          </div>

          <div className="rounded-xl border border-line p-4 space-y-3" data-consent-text>
            <h3 className="serif text-base font-semibold">Privacy and transport consent</h3>
            {CARE_CONSENT_CLAUSES.map((c) => {
              const checked = c.key === 'hipaa' ? values.hipaa : values.transportConsent;
              const field = c.key === 'hipaa' ? 'hipaa' : 'transportConsent';
              return (
                <div key={c.key}>
                  <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      data-attestation={c.key}
                      className="mt-1 h-5 w-5 shrink-0"
                      checked={checked}
                      onChange={(e) =>
                        onChange(c.key === 'hipaa' ? { hipaa: e.target.checked } : { transportConsent: e.target.checked })
                      }
                    />
                    <span className="text-sm">
                      <span className="font-medium">{c.title}.</span>{' '}
                      <span className="ink-soft">{c.body}</span>
                    </span>
                  </label>
                  <Err k={field} />
                </div>
              );
            })}
            <div>
              <label className={labelCls} htmlFor="careIntake-signer">
                Type your full name to sign <span aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                id="careIntake-signer"
                className="form-field"
                maxLength={160}
                autoComplete="name"
                value={values.signerName}
                onChange={(e) => onChange({ signerName: e.target.value })}
                aria-invalid={err('signerName') ? true : undefined}
              />
              <Err k="signerName" />
            </div>
            <p className="ink-soft text-xs">
              The date, time and your connection are recorded with your signature. Agreement{' '}
              <span data-consent-version>{CARE_CONSENT_VERSION}</span>. We never ask for a diagnosis, procedure or medication.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
