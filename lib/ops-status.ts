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
