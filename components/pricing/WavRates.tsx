import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CARE_WAV } from '@/lib/quote';
import { WAV_ON_THE_CALL, WAV_PARTNER_LINE, wavLive } from '@/lib/wav';
import RateTable, { returnRows } from '@/components/pricing/RateTable';

/**
 * The Tassy Care WAV rate table, or, while the switch in lib/wav.ts is off, the plain statement
 * that a dispatcher gives the price. Both /pricing and /charlotte/wheelchair-transport render this
 * so neither can print the card early. The rows come from CARE_WAV; nothing here takes a number.
 */
export default function WavRates({
  id,
  heading,
  href,
  cta,
}: {
  id: string;
  heading: string;
  href: string;
  cta: string;
}) {
  if (wavLive()) {
    return (
      <RateTable
        id={id}
        heading={heading}
        note={`${WAV_PARTNER_LINE} You stay in your chair for the whole trip. Priced by distance like every other line, so you know the number before you book. ${CARE_WAV.waitIncludedMin} minutes of on-site wait included.`}
        colA="One way"
        colASub="ramp-equipped vehicle"
        colB="There and back"
        colBSub={`${CARE_WAV.waitIncludedMin} min wait included`}
        rows={returnRows(CARE_WAV)}
        href={href}
        cta={cta}
      />
    );
  }
  return (
    <div id={id} className="card-tile scroll-mt-24" data-testid="wav-on-the-call">
      <h3 className="serif text-2xl font-semibold">{heading}</h3>
      <p className="ink-soft mt-2 text-sm leading-relaxed">
        {WAV_PARTNER_LINE} You stay in your chair for the whole trip. {WAV_ON_THE_CALL}
      </p>
      <Link href={href} className="btn-gold mt-4 inline-flex items-center gap-2">
        {cta} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
