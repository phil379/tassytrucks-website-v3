import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Tassy Trucks — We Transport With Care';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Site-wide share image (Phil, Nov 22, 2026): the oval logo alone,
// centered on black — no "Tassy Transportation" text block beside it.
// The logo master is a 1024px square whose artwork spans x 111–912,
// y 226–752 (measured), so the img is scaled to 983px and positioned to
// center that artwork in the 1200×630 frame; the frame clips the
// master's black margins, leaving the logo seamless on black.
// The master is loaded as a bundled asset (import.meta.url): fetching
// it over HTTP from this same deployment returned an empty render.
export default async function OpengraphImage() {
  const logo = await fetch(
    new URL('../public/brand/logo-master.png', import.meta.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <img
          // @ts-expect-error — next/og accepts an ArrayBuffer image source
          src={logo}
          width={983}
          height={983}
          style={{ position: 'absolute', left: 109, top: -155 }}
        />
      </div>
    ),
    { ...size },
  );
}
