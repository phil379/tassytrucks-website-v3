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
  children,
}: {
  facilityName: string;
  active: ConsoleTab;
  /** Resolved server-side. Absent keys render no badge rather than a zero. */
  counts?: Partial<Record<ConsoleTab, number>>;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <p className="ink-mute text-[11px] uppercase tracking-[0.16em]">Tassy Transportation</p>
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
  );
}
