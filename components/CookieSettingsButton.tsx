'use client';

import { OPEN_SETTINGS_EVENT } from '@/lib/consent';

/** Footer control that reopens the cookie banner so the choice can be changed. */
export default function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
    >
      Cookie settings
    </button>
  );
}
