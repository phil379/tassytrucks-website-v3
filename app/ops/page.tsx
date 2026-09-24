import type { Metadata } from 'next';
import Link from 'next/link';
import { isOpsAuthed } from '@/lib/ops-auth';
import { supabaseAdmin, TRIP_REQUESTS_TABLE, TRIP_STATUSES, type TripRequestRow } from '@/lib/supabase-admin';
import { mobilityLabel, serviceLabel } from '@/lib/trip-request';
import { describeDetails } from '@/lib/trip-details';
import { login, logout, updateRow, advanceStatus } from './actions';
import { nextStatus } from '@/lib/ops-status';
import ElapsedSince from '@/components/ops/ElapsedSince';

export const metadata: Metadata = {
  title: 'Ops queue',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Shared control style: dark-themed, 48px min height, 16px text (no iOS zoom).
const input = 'form-field';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

function LoginGate({ error }: { error?: string }) {
  return (
    <div className="bg-cream min-h-screen">
      <section className="container-x py-16">
        <div className="max-w-sm mx-auto card-tile p-6">
          <h1 className="serif text-2xl font-semibold">Ops queue</h1>
          <p className="ink-mute text-sm mt-2">Enter the shared password.</p>

          <form action={login} className="mt-6 space-y-4">
            <label className="block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" className={input} autoFocus required />

            {error === 'bad' && (
              <p role="alert" className="form-error">
                Incorrect password.
              </p>
            )}
            {error === 'unconfigured' && (
              <p role="alert" className="form-error">
                OPS_PASSWORD is not configured on the server.
              </p>
            )}

            <button type="submit" className="btn-primary w-full justify-center min-h-[52px] text-base">
              Sign in
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: { status?: string; error?: string };
}) {
  if (!isOpsAuthed()) return <LoginGate error={searchParams.error} />;

  const statusFilter =
    searchParams.status && (TRIP_STATUSES as readonly string[]).includes(searchParams.status)
      ? searchParams.status
      : null;

  let rows: TripRequestRow[] = [];
  let loadError: string | null = null;

  try {
    let query = supabaseAdmin()
      .from(TRIP_REQUESTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter) query = query.eq('status', statusFilter);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Newest first from the query; then pin 'new' to the top. An untouched
    // request is the only thing on this screen that is actually waiting on the
    // operator, so it should never be below a row that is already handled.
    rows = ((data ?? []) as TripRequestRow[]).sort((a, b) => {
      const aNew = a.status === 'new' ? 0 : 1;
      const bNew = b.status === 'new' ? 0 : 1;
      return aNew - bNew;
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Could not load requests.';
  }

  return (
    <div className="bg-cream min-h-screen">
      <section className="container-x py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="serif text-2xl font-semibold">
            Ops queue{' '}
            <span className="ink-mute text-base font-normal">
              ({rows.length}
              {statusFilter ? ` ${statusFilter}` : ''})
            </span>
          </h1>
          <form action={logout}>
            <button type="submit" className="btn-ghost px-4 min-h-[44px] text-sm">
              Sign out
            </button>
          </form>
        </div>

        {/* Status filter — large tap targets, horizontally scrollable on a phone. */}
        <nav className="mt-4 -mx-4 px-4 overflow-x-auto">
          <ul className="flex gap-2 min-w-max pb-1">
            <li>
              <Link
                href="/ops"
                className={`inline-flex items-center rounded-full border px-5 min-h-[44px] text-sm ${
                  !statusFilter
                    ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/20 font-medium'
                    : 'border-line'
                }`}
              >
                All
              </Link>
            </li>
            {TRIP_STATUSES.map((s) => (
              <li key={s}>
                <Link
                  href={`/ops?status=${s}`}
                  className={`inline-flex items-center rounded-full border px-5 min-h-[44px] text-sm capitalize ${
                    statusFilter === s
                      ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/20 font-medium'
                      : 'border-line'
                  }`}
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {loadError && (
          <p role="alert" className="mt-6 form-alert">
            {loadError}
          </p>
        )}

        {!loadError && rows.length === 0 && (
          <p className="ink-mute mt-10 text-center">No requests{statusFilter ? ` with status “${statusFilter}”` : ''} yet.</p>
        )}

        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <article key={row.id} className="card-tile p-5">
              <header className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wider ink-mute">{serviceLabel(row.service_line)}</p>
                  <h2 className="serif text-xl font-semibold mt-0.5">{row.contact_name}</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {row.status === 'new' && <ElapsedSince iso={row.created_at} />}
                  <span className="rounded-full border border-line px-3 py-1 text-xs capitalize">{row.status}</span>
                </div>
              </header>

              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="ink-soft">Phone</dt>
                  <dd>
                    <a className="underline text-base inline-flex items-center min-h-[44px]" href={`tel:${row.contact_phone}`}>
                      {row.contact_phone}
                    </a>
                    <span className="ink-mute"> · prefers {row.preferred_contact ?? 'phone'}</span>
                  </dd>
                </div>
                <div>
                  <dt className="ink-soft">Email</dt>
                  <dd>{row.contact_email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="ink-soft">Pickup</dt>
                  <dd>
                    <a
                      className="underline inline-flex items-center min-h-[44px]"
                      href={`https://maps.google.com/?q=${encodeURIComponent(row.pickup_address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.pickup_address}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="ink-soft">Destination</dt>
                  <dd>
                    <a
                      className="underline inline-flex items-center min-h-[44px]"
                      href={`https://maps.google.com/?q=${encodeURIComponent(row.dropoff_address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.dropoff_address}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="ink-soft">Requested</dt>
                  <dd>{fmt(row.requested_at)}</dd>
                </div>
                <div>
                  <dt className="ink-soft">Return</dt>
                  <dd>{row.return_trip ? fmt(row.return_at) : 'No'}</dd>
                </div>
                <div>
                  <dt className="ink-soft">Passengers / mobility</dt>
                  <dd>
                    {row.passengers ?? 1} · {mobilityLabel(row.mobility)}
                  </dd>
                </div>
                <div>
                  <dt className="ink-soft">Submitted</dt>
                  <dd>{fmt(row.created_at)}</dd>
                </div>
              </dl>

              {/* Who or what is travelling. Labelled from the same spec the
                  customer filled in, so a dispatcher reads "Door through door"
                  and never has to know it was stored as `through`. */}
              {describeDetails(row.service_line, row.trip_details).length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-line bg-cream p-3 text-sm sm:grid-cols-3">
                  {describeDetails(row.service_line, row.trip_details).map((item) => (
                    <div key={item.key}>
                      <dt className="ink-soft text-xs">{item.label}</dt>
                      <dd className="whitespace-pre-wrap break-words">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {row.vehicle_notes && (
                <p className="mt-3 rounded-lg bg-cream border border-line p-3 text-sm">
                  <span className="ink-mute">Vehicle notes: </span>
                  {row.vehicle_notes}
                </p>
              )}

              {row.source && <p className="ink-mute text-xs mt-3">Source: {row.source}</p>}

              {nextStatus(row.status) && (
                <form action={advanceStatus} className="mt-5">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="from" value={row.status} />
                  <button type="submit" className="btn-gold w-full justify-center min-h-[52px] text-base">
                    Mark {nextStatus(row.status)}
                  </button>
                </form>
              )}

              <details className="mt-3 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-medium min-h-[44px] flex items-center">
                  Quote, notes, or another status
                </summary>
              <form action={updateRow} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={row.id} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor={`status-${row.id}`}>
                      Status
                    </label>
                    <select id={`status-${row.id}`} name="status" className={input} defaultValue={row.status}>
                      {TRIP_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor={`quote-${row.id}`}>
                      Quoted price (USD)
                    </label>
                    <input
                      id={`quote-${row.id}`}
                      name="quotedDollars"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="—"
                      className={input}
                      defaultValue={row.quoted_cents != null ? (row.quoted_cents / 100).toFixed(2) : ''}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor={`notes-${row.id}`}>
                    Internal notes
                  </label>
                  <textarea
                    id={`notes-${row.id}`}
                    name="internalNotes"
                    rows={2}
                    className={input}
                    defaultValue={row.internal_notes ?? ''}
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center min-h-[52px] text-base">
                  Save
                </button>
              </form>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
