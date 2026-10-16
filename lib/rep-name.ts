/**
 * How a facility sees its account manager on the welcome screen.
 *
 * facilities.account_manager stores the rep's link slug ("testr"), which is
 * not a name a person would recognise. The display name comes from the rep's
 * profile instead: first name and last initial ("Test R."). With no profile we
 * only fall back to the slug when it is a hyphenated full name from the older
 * accounts ("marcus-bell"); a bare slug shows nothing, and the page says the
 * account manager is being assigned.
 */
export function formatRepName(fullName: string | null | undefined): string | null {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const cap = (w: string) => w[0]!.toUpperCase() + w.slice(1);
  if (parts.length === 1) return cap(parts[0]!);
  return `${cap(parts[0]!)} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

export function legacySlugName(slug: string | null | undefined): string | null {
  const s = (slug ?? '').trim();
  if (!/[-_]/.test(s)) return null;
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}
