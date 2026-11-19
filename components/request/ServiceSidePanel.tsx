import Image from 'next/image';
import { serviceLabel, serviceShortName, type ServiceLine } from '@/lib/trip-request';
import { careFrom } from '@/lib/price-table';

/**
 * The service panel beside the request form (Phil, 2026-11-17).
 *
 * The picture FOLLOWS the booking: whichever line is selected — by the URL,
 * the picker, or the thumbnails at the bottom of this panel — the panel shows
 * that line's picture, its name, one honest paragraph and its starting price.
 * A customer who switches from Recovery to Care mid-form sees the page agree
 * with the change they just made, instead of a generic form that could be
 * for anything.
 *
 * Copy is the homepage's own (app/page.tsx verticals), reused rather than
 * rewritten, so the panel and the homepage never tell two stories. Every
 * line's picture is its designed mascot — including Winnie's. Her real
 * photograph is reserved for one place only: introducing her on the Winnie
 * Ride page itself (Phil, 2026-11-17).
 *
 * Rendered only by RequestForm's panel mode (the public /request page).
 * The airport and facility forms do not pass the flag and never see this.
 */

type PanelInfo = {
  blurb: string;
  priceLine: string;
  image: { src: string; alt: string; width: number; height: number };
  thumb: string;
};

const PANEL: Partial<Record<ServiceLine, PanelInfo>> = {
  care: {
    blurb:
      'Dialysis, infusion, physical therapy, the specialist across town. Booked ahead, door to door, and you know the price before you book.',
    // Derived, not typed: this panel once said $59 while the engine's Care
    // floor — and /pricing, the homepage and /nemt — said $49 (audit, 2026-11-18).
    priceLine: `Flat rates from ${careFrom()}, one way`,
    image: { src: '/brand/care-mascot.webp', alt: 'A heart with a steady heartbeat line', width: 960, height: 593 },
    thumb: '/brand/care-mascot.webp',
  },
  recovery: {
    blurb:
      'Most surgery centers will not discharge you without a responsible adult. We meet you at the desk, wait, and take you home — with one pharmacy stop on the way.',
    priceLine: 'From $129 — there, the wait, and home',
    image: { src: '/brand/recovery-mascot.webp', alt: 'A heart with crossed bandages', width: 960, height: 706 },
    thumb: '/brand/recovery-mascot.webp',
  },
  concierge: {
    blurb:
      'Airport at 5am, a round of golf, dinner, the client you are collecting. A reserved car and a professional driver, booked for a time you chose.',
    priceLine: 'Flat rates from $89 — no surge, ever',
    image: { src: '/brand/concierge-mascot.webp', alt: 'A plane, a golf flag and a martini glass', width: 960, height: 678 },
    thumb: '/brand/concierge-mascot.webp',
  },
  winnie: {
    blurb:
      'Your pet gets there. You don’t have to leave work. Vet, groomer, daycare or boarding — we take them on their own and hand them over by name.',
    priceLine: 'From $59 one way, $106 there and back',
    image: {
      src: '/brand/winnie-mascot.webp',
      alt: 'Winnie, the Tassy French bulldog, in reindeer antlers',
      width: 960,
      height: 1036,
    },
    thumb: '/brand/winnie-mascot.webp',
  },
  scholar: {
    blurb:
      'School and after-school rides on a schedule that repeats — and your recurring schedule is reviewed and confirmed before service begins.',
    priceLine: 'From $850/month — full year, chosen days, or after-school',
    image: { src: '/brand/scholar-mascot.webp', alt: 'A graduation cap over an open book', width: 960, height: 637 },
    thumb: '/brand/scholar-mascot.webp',
  },
};

/** The descriptive half of a service label ("Tassy Care — medical appointments" → "medical appointments"). */
function labelTail(value: ServiceLine): string {
  const label = serviceLabel(value);
  const i = label.indexOf('—');
  return i === -1 ? '' : label.slice(i + 1).trim();
}

export default function ServiceSidePanel({
  service,
  options,
  onSelect,
}: {
  service: ServiceLine;
  /** The lines this visitor may pick — the panel's switch row offers exactly these. */
  options: readonly string[];
  onSelect: (next: ServiceLine) => void;
}) {
  const info = PANEL[service];
  if (!info) return null;
  const name = serviceShortName(service);
  const tail = labelTail(service);
  const switchable = options.filter(
    (o): o is ServiceLine => o in PANEL,
  ) as ServiceLine[];

  return (
    <aside className="card-tile p-6 sm:p-7 text-center" aria-label={`About ${name}`}>
      <div className="flex justify-center">
        <Image
          src={info.image.src}
          alt={info.image.alt}
          width={info.image.width}
          height={info.image.height}
          sizes="(min-width: 1024px) 320px, 240px"
          className="h-44 w-auto rounded-xl object-contain sm:h-52"
          priority={false}
        />
      </div>
      <p className="eyebrow mt-5">Now booking</p>
      <h2 className="serif mt-1 text-3xl">{name}</h2>
      {tail && <p className="ink-soft mt-1 capitalize">{tail}</p>}
      <p className="ink-soft mt-3 leading-relaxed">{info.blurb}</p>
      <p className="mt-4 font-semibold">{info.priceLine}</p>

      {switchable.length > 1 && (
        <div className="mt-6 border-t border-[color:var(--line)] pt-4">
          <p className="ink-mute text-xs tracking-[0.18em] uppercase">Switch service</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {switchable.map((line) => {
              const p = PANEL[line];
              if (!p) return null;
              const active = line === service;
              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => onSelect(line)}
                  aria-pressed={active}
                  className={`flex w-[76px] flex-col items-center gap-1 rounded-xl border px-2 py-2 transition ${
                    active
                      ? 'border-[color:var(--gold)] text-[color:var(--gold)]'
                      : 'border-[color:var(--line)] opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={p.thumb}
                    alt=""
                    width={96}
                    height={96}
                    className="h-10 w-10 rounded-lg object-contain"
                  />
                  <span className="text-[11px] leading-tight font-medium">
                    {serviceShortName(line).replace('Tassy ', '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
