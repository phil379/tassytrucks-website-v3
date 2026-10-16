import type { Metadata } from 'next';
import Link from 'next/link';
import { PolicyBody } from '@/components/school/PolicyBody';
import { SCHOOL_PLANS, SCHOOL_POLICIES } from '@/lib/school-plans';
import {
  HOUSEHOLD_PROMPT_BODY,
  HOUSEHOLD_PROMPT_TITLE,
  householdRequestHref,
} from '@/lib/school-household';

export const metadata: Metadata = {
  title: 'Daily school transport in Charlotte NC · Tassy Scholar',
  description:
    'Committed daily school transport in Charlotte. Three recurring plans for one child, with a schedule reviewed and confirmed before service begins. Pricing varies by school.',
  alternates: { canonical: '/school/book' },
};

/**
 * Tassy Scholar plans.
 *
 * Ported from TassyOps (SchoolLanding.tsx) 2026-09-29. Commitment-based: a
 * parent picks one of three plans. Pricing is deliberately absent — there are
 * zero dollar amounts until Phil sets real ones, because a placeholder price
 * shown to a parent is a quote.
 */
export default function SchoolBookPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-mute)]">
        Tassy Scholar
      </p>
      <h1 className="serif mt-3 text-center text-3xl font-semibold sm:text-4xl">
        Daily school transport. Committed.
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-[color:var(--ink-soft)]">
        Parents commit to one of three plans for one child, one school and one pickup address.
        That commitment is what keeps your child&rsquo;s ride reliable and on time. We aim to
        provide consistent driver assignments whenever operationally possible.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {SCHOOL_PLANS.map((plan) => (
          <div key={plan.key} className="card-tile relative flex flex-col p-6">
            {plan.badge ? (
              <span className="absolute -top-3 right-5 rounded-full bg-[color:var(--gold)] px-3 py-1 text-[11px] font-semibold text-[#1B1A17]">
                {plan.badge}
              </span>
            ) : null}
            <h2 className="serif text-xl font-semibold">{plan.name}</h2>
            <p className="mt-1.5 text-sm text-[color:var(--ink-soft)]">{plan.tagline}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {plan.includes.map((inc) => (
                <li key={inc}>{inc}</li>
              ))}
            </ul>
            <div className="mt-5 rounded-lg border border-dashed border-[color:var(--line)] px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-mute)]">
                Pricing
              </div>
              <div className="serif text-base">{plan.price}</div>
              <div className="text-[11px] text-[color:var(--ink-mute)]">{plan.priceNote}</div>
              <div className="mt-1 text-[11px] text-[color:var(--ink-mute)]">{plan.billing}</div>
            </div>
            <Link href={`/school/book/${plan.slug}`} className="btn-primary mt-5 min-h-[44px] text-center">
              Get started
            </Link>
          </div>
        ))}
      </div>

      <div className="card-tile mt-10 p-6" data-testid="household-prompt">
        <h2 className="serif text-xl font-semibold">{HOUSEHOLD_PROMPT_TITLE}</h2>
        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{HOUSEHOLD_PROMPT_BODY}</p>
        <Link href={householdRequestHref([], null)} className="btn-primary mt-4 inline-flex min-h-[44px] items-center">
          Tell us about your family
        </Link>
      </div>

      <h2 className="serif mt-16 text-2xl font-semibold">How it works</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {SCHOOL_POLICIES.map((p) => (
          <div key={p.key} className="card-tile p-5">
            <div className="serif text-lg">{p.title}</div>
            <p className="mt-1.5 text-sm text-[color:var(--ink-soft)]">
              <PolicyBody text={p.body} />
            </p>
          </div>
        ))}
      </div>

      <div className="card-tile mt-12 p-6">
        <h3 className="serif text-xl font-semibold">
          We don&rsquo;t do random one-off school rides.
        </h3>
        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
          Tassy school transport is a committed service. Your recurring transportation schedule is
          reviewed and confirmed before service begins, so your driver knows your child&rsquo;s
          routine. Need a single ride instead?{' '}
          <Link href="/request?service=scholar" className="underline">
            Request a one-off ride
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
