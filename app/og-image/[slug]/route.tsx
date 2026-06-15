import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Winnie pages get the sage accent variant; everything else stays gold.
const WINNIE_SLUGS = new Set([
  'pet-transport',
  'vet-appointment-rides',
  'post-surgery-pet-transport',
  'pet-boarding-transport',
  'calm-pet-transport',
  'dog-grooming-pickup',
  'veterinary',
  'winnie-vs-uber-pet-vs-lyft-pet',
  'winnie',
]);

const prettify = (slug: string) =>
  slug
    .split('-')
    .map((w) => (w === 'nemt' ? 'NEMT' : w === 'vs' ? 'vs' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? prettify(params.slug);
  const accent = WINNIE_SLUGS.has(params.slug) ? '#7C9A5C' : '#C8932E'; // FIX_PROD_023 gold solid (was #E5A93B)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#1B1A17',
          color: '#F4EFE0',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1B1A17',
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 30, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.8 }}>
            Tassy Transportation
          </div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.08, maxWidth: 980 }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 26, opacity: 0.85 }}>
          <div style={{ width: 64, height: 6, background: accent }} />
          <div>Charlotte, NC · SDVOSB · (704) 941-8508</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
