import type { DriverLocation, RideStatus, RideView } from '@/lib/ride-link';

/**
 * The "where is my ride" page body. Presentational only: it renders a RideView (lib/ride-link.ts),
 * which by construction holds no phone number, no full name, no house number and no price.
 */

const STEPS: RideStatus[] = ['assigned', 'on_the_way', 'arrived', 'in_progress', 'completed'];
const STEP_LABEL: Record<RideStatus, string> = {
  assigned: 'Assigned',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
  completed: 'Completed',
};

function headline(view: RideView): string {
  const who = view.driverFirstName ?? 'Your driver';
  switch (view.status) {
    case 'assigned':
      return `${who} is assigned to your ride`;
    case 'on_the_way':
      return `${who} is on the way`;
    case 'arrived':
      return `${who} has arrived`;
    case 'in_progress':
      return 'Your ride is in progress';
    case 'completed':
      return 'Your ride is complete';
  }
}

/** Drawn only when the view allows it (on the way / arrived, with a real location). Never today. */
export function RideMap({ location }: { location: DriverLocation }) {
  const q = `${location.lat.toFixed(5)},${location.lng.toFixed(5)}`;
  return (
    <div data-testid="ride-map" className="mt-6 rounded-xl border border-line p-4">
      <p className="text-sm font-medium">Driver location</p>
      <a
        className="underline text-sm tap-target"
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in maps
      </a>
    </div>
  );
}

export default function RideStatusView({ view }: { view: RideView }) {
  const current = STEPS.indexOf(view.status);
  return (
    <div data-testid="ride-status" data-status={view.status}>
      <p className="eyebrow text-sm ink-mute">{view.statusLabel}</p>
      <h1 className="h-display serif mt-2 text-3xl">{headline(view)}</h1>

      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Ride progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === current ? 'step' : undefined}
            className={`rounded-full border px-3 py-1 text-xs ${
              i === current
                ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/15 font-medium'
                : i < current
                  ? 'border-line ink-soft'
                  : 'border-line ink-mute'
            }`}
          >
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      <dl className="mt-6 grid grid-cols-1 gap-4 text-base">
        {view.driverFirstName && (
          <div>
            <dt className="text-sm ink-mute">Driver</dt>
            <dd className="font-medium">{view.driverFirstName}</dd>
          </div>
        )}
        {view.vehicle && (
          <div>
            <dt className="text-sm ink-mute">Vehicle</dt>
            <dd className="font-medium">{view.vehicle}</dd>
          </div>
        )}
        {view.pickupStreet && (
          <div>
            <dt className="text-sm ink-mute">Pickup</dt>
            <dd className="font-medium">{view.pickupStreet}</dd>
          </div>
        )}
        {view.scheduledLabel && (
          <div>
            <dt className="text-sm ink-mute">Scheduled pickup time</dt>
            <dd className="font-medium">{view.scheduledLabel}</dd>
            <dd className="text-xs ink-mute mt-1">This is the scheduled time, not a live estimate.</dd>
          </div>
        )}
      </dl>

      {view.showMap && view.location && <RideMap location={view.location} />}
    </div>
  );
}

/** The one page for a wrong link, an expired one, a cancelled ride, an error, or the feature off. */
export function NeutralRidePage() {
  return (
    <div data-testid="ride-neutral">
      <h1 className="h-display serif text-3xl">This ride link is not available</h1>
      <p className="ink-soft mt-4">
        Ride links work only for a short time around a trip. If you need help with a ride, contact Tassy
        Transportation.
      </p>
    </div>
  );
}
