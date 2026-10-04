import Link from 'next/link';
import {
  Home, Plus, Bus, Users, MessageSquare, BarChart3, type LucideIcon,
} from 'lucide-react';

/**
 * The frame every facility screen sits in.
 *
 * Six tabs, matching Phil's Facility_Portal_Walkthrough.html, with one rename
 * he asked for: the demo's "Book a Trip" is "Request a Ride" here, because that
 * is what the whole V3 site calls it and a portal that invents its own verb for
 * the same action is a portal people ask questions about.
 *
 * Server component on purpose. The active tab comes from the page that renders
 * it rather than from usePathname, so nothing here needs to ship to the
 * browser and the badge counts are already resolved server-side.
 */

export type ConsoleTab =
  | 'dashboard' | 'request' | 'trips' | 'patients' | 'messages' | 'reports';

type Tab = { key: ConsoleTab; href: string; label: string; Icon: LucideIcon };

const TABS: Tab[] = [
  { key: 'dashboard', href: '/facility',          label: 'Dashboard',      Icon: Home },
  { key: 'request',   href: '/facility/request',  label: 'Request a Ride', Icon: Plus },
  { key: 'trips',     href: '/facility/trips',    label: 'Active Trips',   Icon: Bus },
  { key: 'patients',  href: '/facility/patients', label: 'Passengers',     Icon: Users },
  { key: 'messages',  href: '/facility/messages', label: 'Messages',       Icon: MessageSquare },
  { key: 'reports',   href: '/facility/reports',  label: 'Reports',        Icon: BarChart3 },
];

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: 'var(--gold)', color: 'var(--ink-on-gold, #13161B)' }}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function ConsoleShell({
  facilityName,
  active,
  counts,
  signedInAs,
  bare = false,
  children,
}: {
  facilityName: string;
  /** Not needed when `bare`: the setup flow has no tab to highlight. */
  active?: ConsoleTab;
  /** Resolved server-side. Absent keys render no badge rather than a zero. */
  counts?: Partial<Record<ConsoleTab, number>>;
  /** The signed-in coordinator's email, shown in the console bar. */
  signedInAs?: string;
  /**
   * Console header and footer only -- no tab rail, no title block. For
   * /facility/welcome, where the page is a four-step wizard with its own
   * heading. The tabs would be dead ends there: every one of them redirects a
   * not-yet-bookable facility straight back to /facility/welcome.
   */
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* The console is not a marketing page and must not wear the marketing
          chrome. Until now every facility screen rendered inside the public
          header — nine nav items, a Services dropdown, and a "Request a Ride"
          button pointing at the RETAIL form, which is the one place a
          coordinator must never be sent: it has no account on it, so the trip
          arrives unattached and unbilled.

          Hidden with CSS rather than a route-group refactor. Header and Footer
          live in the root layout, a Server Component cannot read the pathname,
          and making them client components to find out would ship their
          JavaScript to all 300-odd marketing pages to solve a problem on six.
          The attribute is set in components/Header.tsx and Footer.tsx. */}
      <style>{'[data-site-chrome]{display:none!important}'}</style>

      <header className="border-b border-[color:var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
          <Link href="/facility" className="serif text-sm font-semibold tracking-tight">
            Tassy Transportation
          </Link>
          <span className="ink-mute hidden text-xs sm:inline">Partner account</span>

          <div className="ml-auto flex items-center gap-3 text-xs">
            {signedInAs ? <span className="ink-mute hidden sm:inline">{signedInAs}</span> : null}
            {/* A form, not a link: GET sign-out gets fired by link prefetch and
                browser scanners, which logs people out at random. And it must
                exist at all — a discharge desk is a shared computer, and
                without this the next person to sit down had the account. */}
            <form action="/facility/signout" method="post">
              <button
                type="submit"
                className="ink-soft min-h-[32px] rounded-lg px-2.5 transition hover:bg-[color:var(--line)]/40"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {bare ? children : (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <p className="ink-mute text-[11px] uppercase tracking-[0.16em]">Partner console</p>
      <h1 className="serif mt-1 text-2xl font-semibold sm:text-3xl">{facilityName}</h1>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[210px_1fr]">
        {/* Horizontal and scrollable on a phone, a rail on a laptop. A
            coordinator checking a pickup from the discharge desk is on a
            phone, so the tabs must not stack into six full-width rows that
            push the content off the screen. */}
        {/* Sticky on a laptop. Without it the rail scrolls away on a long form
            and the content sits against a huge empty gutter, which is what
            Phil saw on /facility/request — it reads as a broken layout rather
            than a page that scrolled. */}
        <nav aria-label="Facility console" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
            {TABS.map(({ key, href, label, Icon }) => {
              const on = key === active;
              return (
                <li key={key} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={on ? 'page' : undefined}
                    className={`flex min-h-[44px] items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-sm transition ${
                      on
                        ? 'bg-[color:var(--gold)]/15 font-medium text-[color:var(--gold-warm)]'
                        : 'ink-soft hover:bg-[color:var(--line)]/40'
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" className="shrink-0" />
                    {label}
                    <Badge n={counts?.[key] ?? 0} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
      )}

      <footer className="mt-4 border-t border-[color:var(--line)]">
        <div className="ink-mute mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-5 py-6 text-xs">
          <span>Dispatch: <a className="underline" href="tel:+17049418508">(704) 941-8508</a></span>
          <span>
            <a className="underline" href="mailto:book@tassytrucks.com">book@tassytrucks.com</a>
          </span>
          <span className="ml-auto">Tassy Transportation &middot; Charlotte, NC &middot; SDVOSB</span>
        </div>
      </footer>
    </>
  );
}
