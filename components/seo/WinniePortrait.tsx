/**
 * Winnie's real photograph for the Meet Winnie section — the rescue French
 * bulldog Winnie Ride is named for, resting on a cream pet bed. Same files
 * as the page's PagePhoto (public/photos/pet-transport-french-bulldog-*),
 * drawn small inside the prose instead of as a full-width band.
 *
 * Same discipline as PagePhoto: alt text is required and a missing one
 * throws, the width and height are the image's real pixel size (the 800px
 * file is 800 x 1000) so the browser reserves the exact box, and it is
 * lazy-loaded below the fold (scripts/test-page-photos.ts checks the same
 * rules).
 */
const STEM = 'pet-transport-french-bulldog';
const WIDTHS = [480, 800] as const;

export default function WinniePortrait({
  alt,
  className,
}: {
  alt: string;
  className?: string;
}) {
  if (!alt || !alt.trim()) throw new Error('WinniePortrait needs alt text');
  const set = (ext: 'webp' | 'jpg') =>
    WIDTHS.map((w) => `/photos/${STEM}-${w}.${ext} ${w}w`).join(', ');
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={set('webp')}
        sizes="(min-width: 640px) 20rem, 16rem"
      />
      <img
        src={`/photos/${STEM}-800.jpg`}
        srcSet={set('jpg')}
        sizes="(min-width: 640px) 20rem, 16rem"
        width={800}
        height={1000}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={className}
      />
    </picture>
  );
}
