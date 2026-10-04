import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { currentFacilitySession } from '@/lib/facility-auth';
import { facilityPatients, facilityUnreadCount } from '@/lib/facility-console.server';
import { canBook, passengerNoun, isPetFacility } from '@/lib/facility';
import { mobilityLabel } from '@/lib/trip-request';
import ConsoleShell from '@/components/facility/ConsoleShell';
import PatientForm from '@/components/facility/PatientForm';
import { dayLabel, Empty } from '@/components/facility/bits';

export const metadata: Metadata = {
  title: 'Saved passengers — Tassy Transportation',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export default async function FacilityPatientsPage() {
  const session = await currentFacilitySession();
  if (!session) redirect('/facility/link-expired');
  const facility = session.facility;
  if (facility.status === 'pending' && !canBook(facility)) redirect('/facility/welcome');

  const [patients, unread] = await Promise.all([
    facilityPatients(facility.id),
    facilityUnreadCount(facility.id),
  ]);
  const noun = passengerNoun(facility.kind);
  const isPet = isPetFacility(facility.kind);

  return (
    <ConsoleShell facilityName={facility.name} signedInAs={session.email} active="patients" counts={{ messages: unread }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="serif text-2xl font-semibold capitalize">{noun}s you book for</h2>
          <p className="ink-soft mt-1 text-sm">
            Save someone once and their next booking is two clicks.
          </p>
        </div>
        <PatientForm kind={facility.kind} />
      </div>

      {/* The one line a compliance officer will look for, said where they will
          look. Everything behind it -- the schema, the CHECK constraint, the
          form -- enforces it; this is just where the customer reads it. */}
      <p className="ink-mute mt-5 rounded-lg border border-[color:var(--line)] px-4 py-3 text-xs leading-relaxed">
        {isPet
          ? 'We store a name, species and breed, how the animal travels, and your own reference — what we need to send the right vehicle. We never ask why the animal is going to the vet.'
          : 'We store a name, how they travel, and your own reference. No date of birth, no medical record number, no diagnosis — not here and not anywhere in your account.'}
      </p>

      <div className="mt-6">
        {patients.length === 0 ? (
          <Empty
            title={`No saved ${noun}s yet`}
            body={
              isPet
                ? 'Add the animals you book for most — species, breed and how they travel come through on every trip without typing them again.'
                : 'Add the people you book for most and their mobility, reference and door instructions come through on every trip without typing them again.'
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {patients.map((p) => (
              <li key={p.id} className="card-tile flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ background: 'rgba(200,169,106,.16)', color: 'var(--gold-warm)' }}
                    aria-hidden="true"
                  >
                    {initials(p.display_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.display_name}</p>
                    {/* Breed leads for a vet account — it is how a coordinator
                        tells two dogs called Max apart, and it is what sizes
                        the vehicle. */}
                    <p className="ink-soft text-xs">
                      {[
                        p.breed,
                        p.mobility ? mobilityLabel(p.mobility) : null,
                        p.facility_ref,
                      ].filter(Boolean).join(' · ') || 'No details saved yet'}
                    </p>
                  </div>
                </div>

                {p.access_notes ? (
                  <p className="ink-soft mt-3 text-xs leading-relaxed">{p.access_notes}</p>
                ) : null}

                <div className="ink-mute mt-3 flex-1 text-xs">
                  {p.tripCount === 0
                    ? 'No trips yet'
                    : `${p.tripCount} trip${p.tripCount === 1 ? '' : 's'}`}
                  {p.lastTripAt ? ` · last ${dayLabel(p.lastTripAt)}` : ''}
                </div>

                {/* One-click rebook: the name and mobility ride the URL into
                    the request form, which is the entire reason to save a
                    profile at all. */}
                <Link
                  href={`/facility/request?patient=${encodeURIComponent(p.id)}`}
                  className="btn-ghost mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 text-sm"
                >
                  Request a ride <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ConsoleShell>
  );
}
