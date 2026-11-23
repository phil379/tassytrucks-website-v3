import { ImageResponse } from 'next/og';
import { LOGO_DATA_URI } from './og-logo-data';

export const runtime = 'edge';
export const alt = 'Tassy Trucks — We Transport With Care';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Site-wide share image (Phil, Nov 22, 2026): the oval logo alone,
// centered on black — no "Tassy Transportation" text block beside it.
// The artwork arrives as an embedded data URI (see og-logo-data.ts):
// fetching the logo at render time, same-origin or as a bundled asset,
// produced an empty render in this deployment.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img src={LOGO_DATA_URI} width={760} height={505} />
      </div>
    ),
    { ...size },
  );
}
