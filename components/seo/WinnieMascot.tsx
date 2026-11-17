/**
 * Winnie's portrait for the Meet Winnie section — the Tassy family's rescue
 * French bulldog, the dog Winnie Ride is named for. Not a PagePhoto: that
 * component serves real photographs from /photos as full-width bands, and
 * this is a transparent-cutout illustration drawn small inside the prose.
 *
 * Same discipline as PagePhoto, though: alt text is required and a missing
 * one throws, the width and height are the image's real pixel size
 * (207 x 224, the asset in lib/winnie-mascot.ts) so the browser reserves the
 * exact box, and it is lazy-loaded below the fold
 * (scripts/test-page-photos.ts checks the same rules).
 */
import { WINNIE_MASCOT } from '@/lib/winnie-mascot';

export default function WinnieMascot({
  alt,
  className,
}: {
  alt: string;
  className?: string;
}) {
  if (!alt || !alt.trim()) throw new Error('WinnieMascot needs alt text');
  return (
    <img
      src={WINNIE_MASCOT}
      width={207}
      height={224}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
