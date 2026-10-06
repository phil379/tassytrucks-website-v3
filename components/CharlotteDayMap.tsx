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
 * nothing that is not true: it is a schematic of WHEN each service line runs
 * and the KINDS of places it goes, labelled as an illustration. Phil's own
 * Uber week had twenty-three trips between 4 and 7 AM and none at all between
 * 10 and 4. That empty middle is exactly where Care, Recovery and Winnie live.
 * One fleet, two demand peaks, visible in half a minute.
 *
 * Each service line owns a colour, a set of places it serves, and a few
 * vehicles that drive between those places while the line is running:
 *   Concierge  gold    airport, hotels, golf, the best addresses
 *   Scholar    orange  schools
 *   Care       blue    hospitals and clinics
 *   Recovery   purple  hospital to home
 *   Winnie     green   vet, groomer, boarding, pet store
 *
 * Place names are landmarks for orientation. They are not partners and the
 * caption says so. Only CityVet Uptown is a named pet place; the rest are generic on purpose.
 *
 * Hand-drawn SVG and one rAF loop: no Mapbox, no map tiles, no API key, no
 * per-view billing. The whole panel is lighter than a single map tile.
 * ─────────────────────────────────────────────────────────────────────────
 */

type LineId = 'concierge' | 'scholar' | 'care' | 'recovery' | 'winnie';

type Service = {
  id: LineId;
  name: string;
  color: string;
  /** Hours of the day this line runs, as [from, to) in 24h decimal. */
  windows: [number, number][];
  when: string;
  /** The kinds of places this line goes, shown under its name. */
  where: string;
  /** How many vehicles are drawn driving this line's legs. */
  vehicles: number;
  /** Body shape: the SUV lines (Concierge, Recovery) are full-size, the rest are sedans. */
  vehicle: 'suv' | 'sedan';
};

const SERVICES: Service[] = [
  { id: 'concierge', name: 'Tassy Concierge', color: 'var(--gold)', windows: [[4, 8.5], [17, 20]], when: '4–8 AM · eve', where: 'Airport · golf · top addresses', vehicles: 3, vehicle: 'suv' },
  { id: 'scholar',   name: 'Tassy Scholar',   color: '#E08A3C',     windows: [[7, 9], [14, 16]],   when: '7–9 · 2–4',    where: 'Schools',                        vehicles: 3, vehicle: 'sedan' },
  { id: 'care',      name: 'Tassy Care',      color: '#5B9DD9',     windows: [[9, 16.5]],          when: '9–4:30',       where: 'Hospitals · clinics',            vehicles: 3, vehicle: 'sedan' },
  { id: 'recovery',  name: 'Tassy Recovery',  color: '#8A78D9',     windows: [[10, 17]],           when: '10–5',         where: 'Hospital to home',               vehicles: 2, vehicle: 'suv' },
  { id: 'winnie',    name: 'Winnie Ride',     color: '#4FB286',     windows: [[9, 16]],            when: '9–4',          where: 'Vet · groomer · boarding',       vehicles: 2, vehicle: 'sedan' },
];

/**
 * Places. `big` places are neighbourhood hubs and get the larger label; the rest
 * are specific kinds of destination. `line` colours the dot. Coordinates are a
 * schematic of Mecklenburg County, Uptown at the centre, not a survey.
 */
type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  line: LineId | 'hub' | 'neutral';
  anchor: 'start' | 'middle' | 'end';
  dx?: number;
  dy: number;
  big?: boolean;
};

const NODES: Node[] = [
  // hubs
  { id: 'uptown',     label: 'Uptown',          x: 225, y: 190, line: 'hub',       anchor: 'middle', dy: -13, big: true },
  { id: 'huntersville', label: 'Huntersville',  x: 204, y: 34,  line: 'neutral',   anchor: 'middle', dy: -9,  big: true },
  { id: 'university', label: 'University City', x: 362, y: 84,  line: 'care',      anchor: 'end',    dy: -9,  big: true },
  { id: 'airport',    label: 'CLT Airport',     x: 74,  y: 240, line: 'concierge', anchor: 'middle', dy: 18,  big: true },
  { id: 'southend',   label: 'South End',       x: 190, y: 246, line: 'concierge', anchor: 'middle', dy: 15,  big: true },
  { id: 'southpark',  label: 'SouthPark',       x: 266, y: 314, line: 'concierge', anchor: 'start',  dx: 9, dy: 4, big: true },
  { id: 'matthews',   label: 'Matthews',        x: 396, y: 322, line: 'recovery',  anchor: 'middle', dy: -11, big: true },
  { id: 'pineville',  label: 'Pineville',       x: 204, y: 412, line: 'care',      anchor: 'middle', dy: 17,  big: true },
  { id: 'ballantyne', label: 'Ballantyne',      x: 272, y: 424, line: 'concierge', anchor: 'middle', dy: 17,  big: true },
  // Care and Recovery: hospitals
  { id: 'cmc',        label: 'Atrium CMC',      x: 258, y: 214, line: 'care',      anchor: 'start',  dx: 8, dy: 3 },
  { id: 'presby',     label: 'Novant Presbyterian', x: 272, y: 172, line: 'care',  anchor: 'start',  dx: 8, dy: 3 },
  // Concierge: golf
  { id: 'quail',      label: 'Quail Hollow Club', x: 298, y: 372, line: 'concierge', anchor: 'start', dx: 8, dy: 3 },
  // Scholar: schools
  { id: 'myerspark',  label: 'Myers Park HS',   x: 248, y: 262, line: 'scholar',   anchor: 'start',  dx: 8, dy: 3 },
  { id: 'latin',      label: 'Charlotte Latin', x: 332, y: 268, line: 'scholar',   anchor: 'start',  dx: 7, dy: 3 },
  { id: 'provday',    label: 'Providence Day',  x: 338, y: 348, line: 'scholar',   anchor: 'start',  dx: 7, dy: -5 },
  { id: 'catholic',   label: 'Charlotte Catholic', x: 314, y: 395, line: 'scholar', anchor: 'start', dx: 7, dy: 3 },
  { id: 'ardrey',     label: 'Ardrey Kell HS',  x: 338, y: 418, line: 'scholar',   anchor: 'start',  dx: 7, dy: 3 },
  // Winnie: pet places. CityVet is a real Uptown clinic (Brooklyn Village); the rest are generic.
  { id: 'cityvet',    label: 'CityVet Uptown',  x: 206, y: 219, line: 'winnie',    anchor: 'end',    dx: -8, dy: 3 },
  { id: 'vet',        label: 'Vet clinic',      x: 140, y: 318, line: 'winnie',    anchor: 'start',  dx: 8, dy: 3 },
  { id: 'groomer',    label: 'Groomer',         x: 96,  y: 356, line: 'winnie',    anchor: 'start',  dx: 8, dy: 3 },
  { id: 'boarding',   label: 'Pet boarding',    x: 176, y: 368, line: 'winnie',    anchor: 'start',  dx: 8, dy: 3 },
  { id: 'petstore',   label: 'Pet store',       x: 112, y: 408, line: 'winnie',    anchor: 'start',  dx: 8, dy: 3 },
];

const NODE = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, Node>;

/**
 * The legs each line drives: from a place to a place. Vehicles cycle through
 * their line's legs, so different cars are going between different places.
 */
const LEGS: Record<LineId, [string, string][]> = {
  concierge: [['airport', 'uptown'], ['uptown', 'quail'], ['southend', 'airport'], ['southpark', 'airport'], ['uptown', 'ballantyne'], ['quail', 'southpark']],
  scholar:   [['ballantyne', 'ardrey'], ['southpark', 'myerspark'], ['matthews', 'latin'], ['southpark', 'provday'], ['uptown', 'myerspark'], ['quail', 'provday'], ['southpark', 'catholic'], ['ballantyne', 'catholic']],
  care:      [['matthews', 'cmc'], ['pineville', 'cmc'], ['university', 'presby'], ['southend', 'cmc'], ['huntersville', 'presby'], ['uptown', 'university']],
  recovery:  [['cmc', 'matthews'], ['presby', 'southpark'], ['cmc', 'ballantyne'], ['presby', 'university']],
  winnie:    [['southend', 'cityvet'], ['pineville', 'groomer'], ['cityvet', 'petstore'], ['southpark', 'vet'], ['uptown', 'cityvet'], ['pineville', 'boarding']],
};

/** Soft hotspot glows behind each cluster, lit while their line is running. */
const GLOWS: { line: LineId; x: number; y: number; r: number }[] = [
  { line: 'concierge', x: 225, y: 190, r: 78 },
  { line: 'concierge', x: 74,  y: 240, r: 60 },
  { line: 'concierge', x: 298, y: 372, r: 50 },
  { line: 'care',      x: 262, y: 194, r: 62 },
  { line: 'care',      x: 362, y: 84,  r: 48 },
  { line: 'care',      x: 204, y: 412, r: 46 },
  { line: 'winnie',    x: 130, y: 350, r: 78 },
  { line: 'scholar',   x: 296, y: 288, r: 84 },
  { line: 'scholar',   x: 338, y: 418, r: 46 },
  { line: 'recovery',  x: 396, y: 322, r: 44 },
];

const colorOf = (id: LineId) => SERVICES.find((s) => s.id === id)!.color;

/** A gently bent line between two places. Alternates the bend so legs do not stack. */
function legPath(a: Node, b: Node, k: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = len * 0.12 * (k % 2 === 0 ? 1 : -1);
  const cx = (a.x + b.x) / 2 + (-dy / len) * bend;
  const cy = (a.y + b.y) / 2 + (dx / len) * bend;
  return `M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
}

const START = 4;
const END = 20;
const CYCLE_SECONDS = 30;
/** Seconds a vehicle spends on one leg, and how long it rests at the end of it. */
const LEG_SECONDS = 7;
const REST_SECONDS = 2.2;

function phaseFor(h: number) {
  if (h < 8.5) return 'airport window';
  if (h < 10) return 'school run';
  if (h < 16) return 'the midday hours';
  if (h < 17) return 'school run';
  return 'evening';
}

const isActive = (s: Service, h: number) => s.windows.some(([a, b]) => h >= a && h < b);

/**
 * A vehicle seen from above, nose pointing along +x (the parent rotates it to the
 * direction of travel). Two body shapes: a full-size SUV for Concierge and Recovery,
 * a sedan for the rest. Drawn in the service colour with dark glass, so it reads as
 * a car at 15px and still belongs to its line.
 */
function Vehicle({ color, kind }: { color: string; kind: 'suv' | 'sedan' }) {
  const L = kind === 'suv' ? 17 : 15;      // length
  const W = kind === 'suv' ? 8 : 7;        // width
  const x0 = -L / 2;
  const glass = '#0E1115';
  return (
    <g transform="scale(1.2)">
      {/* body */}
      <rect x={x0} y={-W / 2} width={L} height={W} rx={kind === 'suv' ? 2.4 : 3.2} fill={color} />
      {/* windscreen and rear window */}
      <path d={`M${x0 + L * 0.58} ${-W / 2 + 1.1} L${x0 + L * 0.72} ${-W / 2 + 1.7} L${x0 + L * 0.72} ${W / 2 - 1.7} L${x0 + L * 0.58} ${W / 2 - 1.1} Z`} fill={glass} opacity=".72" />
      <path d={`M${x0 + L * 0.2} ${-W / 2 + 1.5} L${x0 + L * 0.3} ${-W / 2 + 1.2} L${x0 + L * 0.3} ${W / 2 - 1.2} L${x0 + L * 0.2} ${W / 2 - 1.5} Z`} fill={glass} opacity=".6" />
      {/* roof */}
      <rect x={x0 + L * 0.31} y={-W / 2 + 1.1} width={L * 0.26} height={W - 2.2} rx="0.9" fill={glass} opacity=".22" />
      {/* headlights */}
      <rect x={x0 + L - 1.1} y={-W / 2 + 0.9} width="1.1" height="1.5" rx=".4" fill="#F2EEE4" opacity=".9" />
      <rect x={x0 + L - 1.1} y={W / 2 - 2.4} width="1.1" height="1.5" rx=".4" fill="#F2EEE4" opacity=".9" />
    </g>
  );
}

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

  // Put every vehicle on its current leg for this frame.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const period = LEG_SECONDS + REST_SECONDS;
    SERVICES.forEach((s) => {
      const legs = LEGS[s.id];
      const on = isActive(s, hour);
      for (let i = 0; i < s.vehicles; i++) {
        const g = svg.querySelector<SVGGElement>(`#cdm-car-${s.id}-${i}`);
        if (!g) continue;
        if (!on) { g.setAttribute('opacity', '0'); continue; }
        // Each vehicle starts on a different leg and a different beat.
        const t = elapsed + i * 2.6;
        const step = Math.floor(t / period) + i * 2;
        const within = t % period;
        if (within > LEG_SECONDS) { g.setAttribute('opacity', '0'); continue; } // resting at the destination
        const leg = (step % legs.length + legs.length) % legs.length;
        const path = svg.querySelector<SVGPathElement>(`#cdm-leg-${s.id}-${leg}`);
        if (!path) continue;
        const len = path.getTotalLength();
        const p = within / LEG_SECONDS;
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease in and out
        const at = eased * len;
        const pt = path.getPointAtLength(at);
        const ahead = path.getPointAtLength(Math.min(len, at + 2));
        const behind = path.getPointAtLength(Math.max(0, at - 2));
        const deg = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
        g.setAttribute('transform', `translate(${pt.x.toFixed(2)},${pt.y.toFixed(2)}) rotate(${deg.toFixed(1)})`);
        const fade = p < 0.06 ? p / 0.06 : p > 0.94 ? (1 - p) / 0.06 : 1;
        g.setAttribute('opacity', fade.toFixed(2));
      }
    });
  }, [hour, elapsed]);

  const H = Math.floor(hour);
  const M = Math.floor((hour - H) * 60);
  const h12 = H % 12 === 0 ? 12 : H % 12;
  const activeCount = SERVICES.filter((s) => isActive(s, hour)).length;
  const activeIds = new Set(SERVICES.filter((s) => isActive(s, hour)).map((s) => s.id));

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
        .cdm-stage{position:relative;aspect-ratio:22/23}
        .cdm-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}
        .cdm-node{font-size:8.6px;fill:#878D97;letter-spacing:.07em;text-transform:uppercase;
             paint-order:stroke;stroke:#13161B;stroke-width:2.6px;stroke-linejoin:round}
        .cdm-node[data-big="1"]{font-size:10.2px;fill:#A3A9B3;letter-spacing:.09em}
        .cdm-road{fill:none;stroke:#20262E;stroke-linecap:round}
        .cdm-rl{font-size:8px;fill:#39424D;letter-spacing:.04em}
        .cdm-leg{fill:none;stroke-linecap:round;opacity:.1;transition:opacity .6s ease}
        .cdm-leg[data-on="1"]{opacity:.3}
        .cdm-glow{opacity:.16;transition:opacity .9s ease}
        .cdm-glow[data-on="1"]{opacity:1}
        .cdm-dot{transition:opacity .5s ease,r .5s ease}
        .cdm-strip{padding:14px 18px 8px;border-top:1px solid var(--line)}
        .cdm-strip-head{display:flex;justify-content:space-between;font-size:10px;letter-spacing:.14em;
             text-transform:uppercase;color:#878D97;margin-bottom:8px}
        .cdm-track{position:relative;height:6px;background:#1B2027;border-radius:99px}
        .cdm-band{position:absolute;top:0;bottom:0;border-radius:99px;opacity:.55}
        .cdm-play{position:absolute;top:-4px;width:2px;height:14px;background:#F2EEE4;border-radius:2px}
        .cdm-ticks{display:flex;justify-content:space-between;margin-top:6px;font-size:9px;
             color:#4B535E;letter-spacing:.04em;font-variant-numeric:tabular-nums}
        .cdm-legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));
             gap:1px;background:var(--line);border-top:1px solid var(--line)}
        .cdm-leg-item{background:#13161B;padding:11px 14px;display:flex;align-items:flex-start;gap:9px;
             transition:background .4s ease}
        .cdm-leg-item[data-on="1"]{background:#181C22}
        .cdm-swatch{width:8px;height:8px;border-radius:99px;flex:none;margin-top:5px;opacity:.3;transition:opacity .4s ease}
        .cdm-leg-item[data-on="1"] .cdm-swatch{opacity:1}
        .cdm-text{display:flex;flex-direction:column;gap:2px;min-width:0}
        .cdm-name{font-size:12.5px;color:#878D97;transition:color .4s ease;white-space:nowrap}
        .cdm-leg-item[data-on="1"] .cdm-name{color:#F2EEE4}
        .cdm-where{font-size:10.5px;color:#5A626D;line-height:1.3}
        .cdm-when{font-size:10px;color:#6B7380;font-variant-numeric:tabular-nums;white-space:nowrap}
        .cdm-cap{padding:11px 18px 14px;font-size:11px;color:#5F6773;line-height:1.5;border-top:1px solid var(--line)}
        @media (prefers-reduced-motion:reduce){.cdm-leg,.cdm-glow,.cdm-leg-item,.cdm-swatch,.cdm-dot{transition:none}}
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
          viewBox="0 0 440 460"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Schematic map of Charlotte showing where each Tassy service line goes and when it runs: Concierge to the airport, golf and top addresses; Scholar to schools; Care to hospitals; Recovery from hospital to home; Winnie Ride to the vet, groomer and boarding. Vehicles drive between those places while their line is running."
        >
          <defs>
            {SERVICES.map((s) => (
              <radialGradient key={s.id} id={`cdm-glow-${s.id}`}>
                <stop offset="0" style={{ stopColor: s.color }} stopOpacity=".34" />
                <stop offset="1" style={{ stopColor: s.color }} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {/* hotspot glows */}
          {GLOWS.map((g, i) => (
            <circle
              key={i}
              className="cdm-glow"
              data-on={activeIds.has(g.line) ? '1' : '0'}
              cx={g.x} cy={g.y} r={g.r}
              fill={`url(#cdm-glow-${g.line})`}
            />
          ))}

          {/* roads */}
          <ellipse className="cdm-road" cx="222" cy="238" rx="190" ry="205" strokeWidth="1.1" strokeDasharray="3 5" />
          <path className="cdm-road" d="M206 16 C 200 110, 214 250, 232 446" strokeWidth="2.2" />
          <path className="cdm-road" d="M30 150 C 140 128, 280 132, 420 96" strokeWidth="2" />
          <ellipse className="cdm-road" cx="226" cy="191" rx="30" ry="26" strokeWidth="1.4" />
          <text className="cdm-rl" x="176" y="96">77</text>
          <text className="cdm-rl" x="44" y="152">85</text>
          <text className="cdm-rl" x="52" y="316">485</text>
          <text className="cdm-rl" x="184" y="160">277</text>

          {/* the legs each line drives */}
          {SERVICES.flatMap((s) =>
            LEGS[s.id].map(([a, b], k) => (
              <path
                key={`${s.id}-${k}`}
                id={`cdm-leg-${s.id}-${k}`}
                className="cdm-leg"
                data-on={isActive(s, hour) ? '1' : '0'}
                stroke={s.color}
                strokeWidth="1.5"
                d={legPath(NODE[a], NODE[b], k)}
              />
            )),
          )}

          {/* places */}
          {NODES.map((n) => {
            const hub = n.line === 'hub';
            const lineId: LineId | null = n.line === 'hub' || n.line === 'neutral' ? null : n.line;
            const lineColor = hub ? 'var(--gold)' : lineId ? colorOf(lineId) : '#39424D';
            const lit = lineId ? activeIds.has(lineId) : true;
            return (
              <g key={n.id}>
                <circle
                  className="cdm-dot"
                  cx={n.x} cy={n.y}
                  r={hub ? 4.6 : n.big ? 3.2 : 2.6}
                  fill={lineColor}
                  opacity={!lineId ? 1 : lit ? 0.95 : 0.35}
                  stroke={hub ? 'rgba(200,147,46,.25)' : 'none'}
                  strokeWidth={hub ? 5 : 0}
                />
                <text
                  x={n.x + (n.dx ?? 0)} y={n.y + n.dy} textAnchor={n.anchor}
                  className="cdm-node" data-big={n.big ? '1' : '0'}
                  style={hub ? { fill: 'var(--gold)' } : undefined}
                >
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* vehicles */}
          {SERVICES.flatMap((s) =>
            Array.from({ length: s.vehicles }, (_, i) => (
              <g key={`${s.id}-${i}`} id={`cdm-car-${s.id}-${i}`} opacity="0">
                <circle r="13" fill={s.color} opacity=".12" />
                <Vehicle color={s.color} kind={s.vehicle} />
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
          <div key={s.id} className="cdm-leg-item" data-on={isActive(s, hour) ? '1' : '0'}>
            <span className="cdm-swatch" style={{ background: s.color }} />
            <span className="cdm-text">
              <span className="cdm-name">{s.name}</span>
              <span className="cdm-where">{s.where}</span>
              <span className="cdm-when">{s.when}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="cdm-cap">
        Illustration of when each service line operates across Mecklenburg County and the kinds of places it
        serves. Not live vehicle positions. Place names are landmarks for orientation only and imply no
        affiliation.
      </p>
    </div>
  );
}
