import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DAY_MAP_BG, DAY_MAP_LABEL } from '../lib/day-map-colors';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

// WCAG 2.x relative luminance and contrast ratio.
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map(channel) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

// The page canvas token, read from the real stylesheet rather than copied here.
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const pageBg = /--bg:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1];
assert.ok(pageBg, '--bg token not found in app/globals.css');

const backgrounds = { ...DAY_MAP_BG, pageBg: pageBg! };

t('the contrast function matches known WCAG values', () => {
  assert.ok(Math.abs(contrast('#000000', '#FFFFFF') - 21) < 1e-9);
  assert.ok(Math.abs(contrast('#777777', '#FFFFFF') - 4.48) < 0.01);
});

t('every day-map label reaches 4.5:1 on every background it can sit on', () => {
  for (const [label, color] of Object.entries(DAY_MAP_LABEL)) {
    for (const [bgName, bg] of Object.entries(backgrounds)) {
      const ratio = contrast(color, bg);
      assert.ok(ratio >= 4.5, `${label} ${color} on ${bgName} ${bg} is ${ratio.toFixed(2)}:1, needs 4.5`);
    }
  }
});

t('the labels keep their hue family: still a cool blue-grey, not a new color', () => {
  const hue = (hex: string) => {
    const [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
    const mx = Math.max(r, g, b);
    const d = mx - Math.min(r, g, b);
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const before = { ticks: '#4B535E', where: '#5A626D', when: '#6B7380' };
  for (const key of ['ticks', 'where', 'when'] as const) {
    assert.ok(Math.abs(hue(DAY_MAP_LABEL[key]) - hue(before[key])) < 6, key);
  }
});

t('the component takes its label and background colors from that file, not literals', () => {
  const src = readFileSync(new URL('../components/CharlotteDayMap.tsx', import.meta.url), 'utf8');
  for (const ref of [
    'DAY_MAP_LABEL.ticks',
    'DAY_MAP_LABEL.where',
    'DAY_MAP_LABEL.when',
    'DAY_MAP_BG.cardTop',
    'DAY_MAP_BG.cardBottom',
    'DAY_MAP_BG.legendCell}',
    'DAY_MAP_BG.legendCellOn',
  ]) {
    assert.ok(src.includes(ref), `${ref} is not used in CharlotteDayMap.tsx`);
  }
  for (const old of ['#4B535E', '#5A626D', '#6B7380']) {
    assert.ok(!src.includes(old), `${old} (the old low-contrast color) is back in CharlotteDayMap.tsx`);
  }
});

console.log(`${n} passed`);
