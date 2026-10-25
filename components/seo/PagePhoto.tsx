/**
 * One real photograph on a landing page, drawn as a <picture> with a WebP source and a JPEG
 * fallback in three widths. The width and height attributes are the image's real pixel size, so
 * the browser reserves the exact box before a byte arrives and nothing on the page moves when it
 * loads. It is lazy-loaded because it sits below the opening section.
 *
 * Alt text is required. An empty alt or a missing size throws, so a page that forgets one fails
 * the build instead of shipping an unlabelled or layout-shifting image
 * (scripts/test-page-photos.ts checks the same rules).
 */
export type PagePhotoProps = {
  /** File stem under /photos, e.g. "pet-transport-french-bulldog" (files are <stem>-<width>.webp|jpg). */
  stem: string;
  /** Widths that exist on disk, smallest first. The largest is the fallback <img> source. */
  widths: readonly number[];
  /** Pixel size of the largest file; its ratio is the box that gets reserved. */
  width: number;
  height: number;
  alt: string;
  /** The `sizes` attribute: how wide the image is drawn at each viewport width. */
  sizes: string;
};

export default function PagePhoto({ stem, widths, width, height, alt, sizes }: PagePhotoProps) {
  if (!alt || !alt.trim()) throw new Error(`PagePhoto "${stem}" needs alt text`);
  if (!(width > 0) || !(height > 0)) throw new Error(`PagePhoto "${stem}" needs a width and a height`);
  const largest = widths[widths.length - 1];
  const set = (ext: 'webp' | 'jpg') => widths.map((w) => `/photos/${stem}-${w}.${ext} ${w}w`).join(', ');
  return (
    <section className="border-b border-line">
      <div className="container-x py-8 lg:py-10">
        <picture>
          <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
          <img
            src={`/photos/${stem}-${largest}.jpg`}
            srcSet={set('jpg')}
            sizes={sizes}
            width={width}
            height={height}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full max-w-md rounded-card border border-line"
          />
        </picture>
      </div>
    </section>
  );
}
