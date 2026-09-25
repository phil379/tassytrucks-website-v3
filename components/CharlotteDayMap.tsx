'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The hero panel: a Tassy day in Charlotte, 4 AM to 8 PM, in thirty seconds.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS AND NOT A LIVE TRIP BOARD
 *
 * The panel this replaces announced "LIVE TRIP BOARD · Airport Transfer — CLT ·
 * En route". No such trip was happening. A visitor reads that as a vehicle
 * moving right now, and the gap between that and a small operation is what
 * they remember after they book.
 *
 * This makes the same point about range and capability while asserting
 * nothing that is not true: it is a schematic of WHEN each service line runs,
 * labelled as an illustration, and it is the one thing about this business no
 * competitor's homepage can copy. Phil's own Uber week had twenty-three trips
 * between 4 and 7 AM and none at all between 10 and 4. That empty middle is
 * exactly where Care, Recovery and Winnie live. One fleet, two demand peaks,
 * visible in half a minute.
 *
 * Hand-drawn SVG and one rAF loop: no Mapbox, no map tiles, no API key, no
 * per-view billing. The whole panel is lighter than a single map tile.
 * ─────────────────────────────────────────────────────────────────────────
 */

type Service = {
  id: string;
  name: string;
  color: string;
  /** Hours of the day this line runs, as [from, to) in 24h decimal. */
  windows: [number, number][];
  when: string;
  dots: number;
};

const SERVICES: Service[] = [
  { id: 'concierge', name: 'Tassy Concierge', color: 'var(--gold)', windows: [[4, 8.5], [17, 20]], when: '4–8 AM · eve', dots: 2 },
  { id: 'scholar',   name: 'Tassy Scholar',   color: '#E08A3C',     windows: [[7, 9], [14, 16]],   when: '7–9 · 2–4',   dots: 1 },
  { id: 'care',      name: 'Tassy Care',      color: '#5B9DD9',     windows: [[9, 16.5]],          when: '9–4:30',      dots: 2 },
  { id: 'recovery',  name: 'Tassy Recovery',  color: '#8A78D9',     windows: [[10, 17]],           when: '10–5',        dots: 1 },
  { id: 'winnie',    name: 'Winnie Ride',     color: '#4FB286',     windows: [[9, 16]],            when: '9–4',         dots: 1 },
];

const ROUTES: Record<string, string> = {
  concierge: 'M258 246 C 210 236, 150 224, 96 196',
  scholar:   'M186 44 C 190 78, 196 118, 205 160',
  care:      'M268 72 C 246 100, 222 130, 205 162',
  recovery:  'M205 166 C 252 186, 290 206, 330 228',
  winnie:    'M244 212 C 232 244, 218 268, 200 288',
};

const NODES = [
  { x: 186, y: 40,  label: 'Huntersville',    anchor: 'middle', dy: -9 },
  { x: 268, y: 68,  label: 'University City', anchor: 'start',  dy: -9 },
  { x: 96,  y: 194, label: 'CLT Airport',     anchor: 'middle', dy: 16 },
  { x: 205, y: 164, label: 'Uptown',          anchor: 'middle', dy: -11, hub: true },
  { x: 246, y: 210, label: 'SouthPark',       anchor: 'start',  dy: 13 },
  { x: 332, y: 230, label: 'Matthews',        anchor: 'end',    dy: 15 },
  { x: 198, y: 290, label: 'Pineville',       anchor: 'middle', dy: 15 },
] as const;

const START = 4;
const END = 20;
const CYCLE_SECONDS = 30;

function phaseFor(h: number) {
  if (h < 8.5) return 'airport window';
  if (h < 10) return 'school run';
  if (h < 16) return 'the midday hours';
  if (h < 17) return 'school run';
  return 'evening';
}

const isActive = (s: Service, h: number) => s.windows.some(([a, b]) => h >= a && h < b);

export default function CharlotteDayMap() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hour, setHour] = useState(11.5);
  const [elapsed, setElapsed] = useState(0.35);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let t0: number | null = null;
    const frame = (ts: number) => {
      if (t0 === null) t0 = ts;
      const secs = (ts - t0) / 1000;
      setElapsed(secs);
      setHour(START + ((secs % CYCLE_SECONDS) / CYCLE_SECONDS) * (END - START));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Position every traveller on its route for the current frame.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    SERVICES.forEach((s) => {
      const path = svg.querySelector<SVGPathElement>(`#cdm-route-${s.id}`);
      if (!path) return;
      const len = path.getTotalLength();
      const on = isActive(s, hour);
      for (let i = 0; i < s.dots; i++) {
        const g = svg.querySelector<SVGGElement>(`#cdm-dot-${s.id}-${i}`);
        if (!g) continue;
        if (!on) { g.setAttribute('opacity', '0'); continue; }
        const p = ((elapsed / 9) + i / s.dots) % 1;
        const pt = path.getPointAtLength(p * len);
        g.setAttribute('transform', `translate(${pt.x.toFixed(2)},${pt.y.toFixed(2)})`);
        const fade = p < 0.08 ? p / 0.08 : p > 0.92 ? (1 - p) / 0.08 : 1;
        g.setAttribute('opacity', fade.toFixed(2));
      }
    });
  }, [hour, elapsed]);

  const H = Math.floor(hour);
  const M = Math.floor((hour - H) * 60);
  const h12 = H % 12 === 0 ? 12 : H % 12;
  const activeCount = SERVICES.filter((s) => isActive(s, hour)).length;

  return (
    <div className="cdm">
      <style>{`
        .cdm{background:linear-gradient(180deg,#181C22,#13161B);border:1px solid var(--line);
             border-radius:24px;overflow:hidden;box-shadow:0 24px 60px -28px rgba(0,0,0,.9)}
        .cdm-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
             padding:16px 18px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}
        .cdm-title{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#878D97;margin:0}
        .cdm-clock{font-variant-numeric:tabular-nums;font-size:14px;color:#F2EEE4;letter-spacing:.02em}
        .cdm-clock b{color:var(--gold);font-weight:600}
        .cdm-stage{position:relative;aspect-ratio:5/4}
        .cdm-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}
        .cdm-node{font-size:9.5px;fill:#878D97;letter-spacing:.06em;text-transform:uppercase}
        .cdm-road{fill:none;stroke:#20262E;stroke-linecap:round}
        .cdm-rl{font-size:8px;fill:#39424D;letter-spacing:.04em}
        .cdm-route{fill:none;stroke-linecap:round;opacity:0;transition:opacity .6s ease}
        .cdm-route[data-on="1"]{opacity:.34}
        .cdm-strip{padding:14px 18px 8px;border-top:1px solid var(--line)}
        .cdm-strip-head{display:flex;justify-content:space-between;font-size:10px;letter-spacing:.14em;
             text-transform:uppercase;color:#878D97;margin-bottom:8px}
        .cdm-track{position:relative;height:6px;background:#1B2027;border-radius:99px}
        .cdm-band{position:absolute;top:0;bottom:0;border-radius:99px;opacity:.55}
        .cdm-play{position:absolute;top:-4px;width:2px;height:14px;background:#F2EEE4;border-radius:2px}
        .cdm-ticks{display:flex;justify-content:space-between;margin-top:6px;font-size:9px;
             color:#4B535E;letter-spacing:.04em;font-variant-numeric:tabular-nums}
        .cdm-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));
             gap:1px;background:var(--line);border-top:1px solid var(--line)}
        .cdm-leg{background:#13161B;padding:11px 14px;display:flex;align-items:center;gap:9px;
             transition:background .4s ease}
        .cdm-leg[data-on="1"]{background:#181C22}
        .cdm-swatch{width:8px;height:8px;border-radius:99px;flex:none;opacity:.3;transition:opacity .4s ease}
        .cdm-leg[data-on="1"] .cdm-swatch{opacity:1}
        .cdm-name{font-size:12.5px;color:#878D97;transition:color .4s ease;white-space:nowrap}
        .cdm-leg[data-on="1"] .cdm-name{color:#F2EEE4}
        .cdm-when{font-size:9.5px;color:#5A626D;margin-left:auto;font-variant-numeric:tabular-nums}
        .cdm-cap{padding:11px 18px 14px;font-size:11px;color:#5F6773;line-height:1.5;border-top:1px solid var(--line)}
        @media (max-width:640px){.cdm-stage{aspect-ratio:1/1}}
        @media (prefers-reduced-motion:reduce){.cdm-route,.cdm-leg,.cdm-swatch{transition:none}}
      `}</style>

      <div className="cdm-head">
        <p className="cdm-title">A Tassy day · Charlotte</p>
        <div className="cdm-clock">
          <b>{h12}:{M < 10 ? '0' : ''}{M}</b> {H < 12 ? 'AM' : 'PM'}
          &nbsp;<span style={{ color: '#878D97' }}>{phaseFor(hour)}</span>
        </div>
      </div>

      <div className="cdm-stage">
        <svg
          ref={svgRef}
          viewBox="0 0 400 320"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Schematic map of Charlotte showing which Tassy service line runs at each hour of the day"
        >
          <ellipse className="cdm-road" cx="205" cy="165" rx="150" ry="122" strokeWidth="1.1" strokeDasharray="3 5" />
          <path className="cdm-road" d="M186 18 C 178 88, 178 216, 202 305" strokeWidth="2.2" />
          <path className="cdm-road" d="M40 118 C 130 96, 250 104, 372 78" strokeWidth="2" />
          <path className="cdm-road" d="M205 165 C 260 188, 300 212, 348 240" strokeWidth="1.6" />
          <ellipse className="cdm-road" cx="206" cy="167" rx="29" ry="25" strokeWidth="1.4" />
          <text className="cdm-rl" x="162" y="72">77</text>
          <text className="cdm-rl" x="46" y="112">85</text>
          <text className="cdm-rl" x="60" y="250">485</text>
          <text className="cdm-rl" x="174" y="201">277</text>

          {SERVICES.map((s) => (
            <path
              key={s.id}
              id={`cdm-route-${s.id}`}
              className="cdm-route"
              data-on={isActive(s, hour) ? '1' : '0'}
              stroke={s.color}
              strokeWidth="1.8"
              d={ROUTES[s.id]}
            />
          ))}

          {NODES.map((n) => (
            <g key={n.label}>
              <circle
                cx={n.x} cy={n.y} r={'hub' in n && n.hub ? 4.2 : 2.6}
                fill={'hub' in n && n.hub ? 'var(--gold)' : '#39424D'}
                stroke={'hub' in n && n.hub ? 'rgba(200,147,46,.25)' : 'none'}
                strokeWidth={'hub' in n && n.hub ? 5 : 0}
              />
              <text
                x={n.x} y={n.y + n.dy} textAnchor={n.anchor} className="cdm-node"
                fill={'hub' in n && n.hub ? 'var(--gold)' : undefined}
              >
                {n.label}
              </text>
            </g>
          ))}

          {SERVICES.flatMap((s) =>
            Array.from({ length: s.dots }, (_, i) => (
              <g key={`${s.id}-${i}`} id={`cdm-dot-${s.id}-${i}`} opacity="0">
                <circle r="7" fill={s.color} opacity=".13" />
                <circle r="3.1" fill={s.color} />
              </g>
            )),
          )}
        </svg>
      </div>

      <div className="cdm-strip">
        <div className="cdm-strip-head">
          <span>When each service runs</span>
          <span>{activeCount === 1 ? '1 line active' : `${activeCount} lines active`}</span>
        </div>
        <div className="cdm-track">
          {SERVICES.flatMap((s) =>
            s.windows.map(([a, b], i) => (
              <div
                key={`${s.id}-${i}`}
                className="cdm-band"
                style={{
                  left: `${((a - START) / (END - START)) * 100}%`,
                  width: `${((b - a) / (END - START)) * 100}%`,
                  background: s.color,
                }}
              />
            )),
          )}
          <div className="cdm-play" style={{ left: `${((hour - START) / (END - START)) * 100}%` }} />
        </div>
        <div className="cdm-ticks"><span>4 AM</span><span>8</span><span>12</span><span>4 PM</span><span>8 PM</span></div>
      </div>

      <div className="cdm-legend">
        {SERVICES.map((s) => (
          <div key={s.id} className="cdm-leg" data-on={isActive(s, hour) ? '1' : '0'}>
            <span className="cdm-swatch" style={{ background: s.color }} />
            <span className="cdm-name">{s.name}</span>
            <span className="cdm-when">{s.when}</span>
          </div>
        ))}
      </div>

      <p className="cdm-cap">
        Illustration of when each service line operates across Mecklenburg County. Not live vehicle positions.
      </p>
    </div>
  );
}
