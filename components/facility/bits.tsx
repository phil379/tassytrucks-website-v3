import { serviceLabel } from '@/lib/trip-request';
import { tripCents, type FacilityTrip } from '@/lib/facility-dashboard.server';

/** Charlotte, always. The server runs in UTC; a 6:45am pickup rendered in UTC
 *  reads as 10:45, which is the most alarming thing a coordinator could see. */
const TZ = 'America/New_York';

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: TZ, hour: 'numeric', minute: '2-digit',
  });
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: TZ, month: 'short', day: 'numeric',
  });
}

/** "in 18 min" / "2 h ago". Relative to now, computed on the server at render. */
export function relativeLabel(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.round(Math.abs(diff) / 60000);
  const unit = mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`;
  if (mins < 1) return 'now';
  return diff > 0 ? `in ${unit}` : `${unit} ago`;
}

/**
 * What the status ladder means to a FACILITY, in their words rather than ours.
 *
 * The walkthrough showed "En route", "At pickup", "3 min from pickup". We have
 * no GPS feed and trip_events is empty, so those would be invented. These are
 * the real statuses, said plainly. "Driver assigned" is true and useful;
 * "3 min from pickup" would be the "assigned within minutes" promise that was
 * deleted from the homepage on 2026-10-01 for not being true.
 */
export const STATUS_COPY: Record<string, { label: string; tone: 'wait' | 'go' | 'done' | 'off' }> = {
  new:       { label: 'With dispatch',  tone: 'wait' },
  quoted:    { label: 'Quoted',         tone: 'wait' },
  confirmed: { label: 'Confirmed',      tone: 'go'   },
  assigned:  { label: 'Driver assigned', tone: 'go'  },
  completed: { label: 'Completed',      tone: 'done' },
  closed:    { label: 'Completed',      tone: 'done' },
  cancelled: { label: 'Cancelled',      tone: 'off'  },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_COPY[status] ?? { label: status, tone: 'wait' as const };
  const style =
    s.tone === 'go'   ? { background: 'rgba(200,169,106,.18)', color: 'var(--gold-warm)' } :
    s.tone === 'done' ? { background: 'rgba(120,200,140,.14)', color: '#86c89a' } :
    s.tone === 'off'  ? { background: 'rgba(248,113,113,.14)', color: '#f87171' } :
                        { background: 'rgba(244,239,224,.09)', color: 'var(--ink-soft)' };
  return (
    <span className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium" style={style}>
      {s.label}
    </span>
  );
}

export function TripRow({ trip, noun }: { trip: FacilityTrip; noun: string }) {
  const cents = tripCents(trip);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 border-b border-[color:var(--line)] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{whenLabel(trip.requested_at)}</span>
          <span className="ink-mute text-xs">{relativeLabel(trip.requested_at)}</span>
        </div>
        {/* The PASSENGER goes here, not the person who filled the form.
            contact_name is the coordinator, and printing it in this slot meant
            a vet clinic's list read "Sarah Coordinator" nine times over with
            no sign of which animal was moving. The breed follows it for a pet
            account — it is how a driver knows which crate to bring, the same
            reason the destination is on this row. Human accounts set no breed. */}
        <div className="ink-soft text-sm">
          {trip.passenger_name || trip.contact_name}
          {trip.passenger_detail ? (
            <span className="ink-mute text-xs"> · {trip.passenger_detail}</span>
          ) : null}
          {trip.facility_ref ? <span className="ink-mute text-xs"> · {trip.facility_ref}</span> : null}
        </div>
        {trip.passenger_name && trip.contact_name && trip.passenger_name !== trip.contact_name ? (
          <div className="ink-mute text-xs">Booked by {trip.contact_name}</div>
        ) : null}
        <div className="ink-soft truncate text-xs">
          {trip.pickup_address} → {trip.dropoff_address}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        <span className="ink-soft">{serviceLabel(trip.service_line)}</span>
        {trip.payer === 'passenger' ? (
          // Said plainly: the difference decides who gets chased for money. The
          // facility never sees the passenger's card and the passenger never
          // sees the facility's rate.
          <span className="ink-mute">{noun} pays</span>
        ) : cents === null ? (
          <span className="ink-mute">price to come</span>
        ) : (
          <span className="ink-soft tabular-nums">{money(cents)}</span>
        )}
        <StatusPill status={trip.status} />
      </div>
    </li>
  );
}

export function Empty({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--line)] px-6 py-10 text-center">
      <p className="serif text-lg font-semibold">{title}</p>
      <p className="ink-soft mx-auto mt-2 max-w-md text-sm leading-relaxed">{body}</p>
      {cta ? <div className="mt-5">{cta}</div> : null}
    </div>
  );
}
