'use client';

import { useFormStatus } from 'react-dom';

/**
 * Submit button for the dispatcher's server-action forms. Confirming a trip
 * creates a payment link and sends an email, which takes several seconds; with
 * no feedback the dispatcher clicks again. This disables itself and says what is
 * happening while the action runs.
 */
export function PendingButton({
  children,
  pendingLabel = 'Working…',
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
