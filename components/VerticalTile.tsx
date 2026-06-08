import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  bookHref: string;
  accent?: 'gold' | 'plum' | 'sage' | 'rose' | 'sand';
};

const accentBg: Record<NonNullable<Props['accent']>, string> = {
  gold:  'from-gold/15 to-cream',
  plum:  'from-[#6D4A66]/12 to-cream',
  sage:  'from-[#6F7F66]/12 to-cream',
  rose:  'from-[#A66B6B]/12 to-cream',
  sand:  'from-[#C4A86A]/12 to-cream',
};

export default function VerticalTile({
  eyebrow, title, description, href, bookHref, accent = 'gold',
}: Props) {
  return (
    <div className={`rounded-2xl p-8 bg-gradient-to-br ${accentBg[accent]} border border-charcoal/8 flex flex-col`}>
      <div className="eyebrow">{eyebrow}</div>
      <h3 className="mt-2 font-serif text-3xl tracking-tight">{title}</h3>
      <p className="mt-3 text-ink-muted text-sm leading-relaxed flex-1">{description}</p>
      <div className="mt-6 flex items-center gap-3">
        <Link href={href} className="btn-ghost text-sm py-2 px-4">
          Learn more
        </Link>
        <a href={bookHref} className="inline-flex items-center gap-1 text-sm font-semibold text-charcoal hover:text-gold-600">
          Book <ArrowUpRight size={14} />
        </a>
      </div>
    </div>
  );
}
