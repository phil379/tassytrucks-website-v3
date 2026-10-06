/**
 * The status ladder for the ops queue.
 *
 * Lives outside app/ops/actions.ts because that file is 'use server' and may
 * only export async functions — a sync helper there is a build error.
 */
export const ADVANCE: Record<string, string> = {
  new: 'quoted',
  quoted: 'confirmed',
  confirmed: 'assigned',
  assigned: 'completed',
  completed: 'closed',
};

/** The next step, or null when the row is at the end of the ladder. */
export function nextStatus(current: string): string | null {
  return ADVANCE[current] ?? null;
}

/**
 * A trip may not be marked `assigned` while no driver is on it.
 *
 * `assigned` is read aloud to the customer: the facility console renders it as
 * "Driver assigned". A one-tap advance used to write the status and nothing
 * else, so a vet clinic was told a van was coming for a trip whose driver_id
 * was NULL. Real assignment (driver_id + vehicle_id + driver_name) happens in
 * the dispatch app; this console can only move the label, so it must not move
 * it to a status that claims a person exists.
 *
 * `driver_id` is the truth here, not `driver_name`, which is free text.
 * Returns the reason to refuse, or null when the move is fine.
 */
export function assignmentBlocker(
  to: string,
  driverId: string | null | undefined,
): string | null {
  if (to !== 'assigned' || driverId) return null;
  return (
    'No driver is assigned to this trip, so it cannot be marked "assigned". ' +
    'Assign a driver in the dispatch board first. Until then "confirmed" is the honest status.'
  );
}
