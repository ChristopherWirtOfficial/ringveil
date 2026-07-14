import { RARITY_COLORS } from '../game/rings';
import type { Aspect, Ring } from '../types';

export const PAL = {
  bg1: '#14161d',
  bg2: '#191b22',
  line: 'rgba(255,255,255,0.07)',
  ink: '#e9e4d8',
  dim: '#a29b8c',
  bronze: '#c9913f',
  verdigris: '#63a58c',
  danger: '#b0553f',
  demon: '#6b6478',
};

export const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
export const MONO = 'ui-monospace, Menlo, monospace';

/** '#rrggbb' → 'rgba(r,g,b,a)' — for alpha variants of palette colors. */
export function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Fraction of the canvas height where the Hush's dead ground sits. */
export const HUSH_GROUND = 0.84;

/** The far side of the veil: cold, airless, sound-dead. The inverse of the
 *  proving grounds — indigo dark, a too-close sky, nothing warm anywhere. */
export function hushBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const gy = h * HUSH_GROUND;
  // cold sky, darkest at the top — the ceiling feels low
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#0b0c12');
  sky.addColorStop(0.6, '#11131c');
  sky.addColorStop(1, '#151824');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, gy + 1);
  // slow silence bands, barely-lit columns of dead air
  ctx.lineWidth = 14;
  for (let i = 0; i < 4; i++) {
    const x = ((i * 0.27 + t * 0.006) % 1.1) * w;
    const band = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
    band.addColorStop(0, 'rgba(120,116,150,0)');
    band.addColorStop(0.5, 'rgba(120,116,150,0.03)');
    band.addColorStop(1, 'rgba(120,116,150,0)');
    ctx.strokeStyle = band;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gy);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  // far shapes on the dead horizon — not hills; something more still
  ctx.fillStyle = 'rgba(8,9,13,0.6)';
  ctx.beginPath();
  ctx.ellipse(w * 0.68, gy + 14, w * 0.34, 20, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(w * 0.81 - 2, gy - 16, 4, 16);
  ctx.fillRect(w * 0.9 - 1.5, gy - 9, 3, 9);
  // horizon
  ctx.strokeStyle = 'rgba(150,146,180,0.12)';
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(w, gy);
  ctx.stroke();
  // dead ground, cold all the way down
  const ground = ctx.createLinearGradient(0, gy, 0, h);
  ground.addColorStop(0, '#13141e');
  ground.addColorStop(1, '#0f1017');
  ctx.fillStyle = ground;
  ctx.fillRect(0, gy, w, h - gy);
  // hairline cracks in the ground
  ctx.strokeStyle = 'rgba(150,146,180,0.05)';
  for (const [fx1, fx2] of [
    [0.3, 0.36],
    [0.55, 0.58],
    [0.74, 0.81],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(w * fx1, gy + (h - gy) * 0.4);
    ctx.lineTo(w * fx2, gy + (h - gy) * 0.75);
    ctx.stroke();
  }
}

/** Fraction of the canvas height where the Proving's ground line sits.
 *  Shared between the background and the scene's layout. */
export const PROVING_HORIZON = 0.64;

/** The proving grounds at home: warm dusk, far hills, elder menhirs on the
 *  horizon. The counterpoint to the Hush — hearth-lit where the Hush is cold. */
export function provingBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const gy = h * PROVING_HORIZON;
  // dusk sky, warming toward the horizon
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#171a21');
  sky.addColorStop(0.72, '#1d1c1b');
  sky.addColorStop(1, '#242017');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, gy + 1);
  // far hills, barely darker than the sky
  ctx.fillStyle = 'rgba(15,17,22,0.55)';
  ctx.beginPath();
  ctx.ellipse(w * 0.28, gy + 20, w * 0.42, 30, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.82, gy + 22, w * 0.4, 27, 0, Math.PI, 0);
  ctx.fill();
  // elder menhirs — other rings proved here once
  ctx.fillStyle = 'rgba(10,11,15,0.5)';
  ctx.fillRect(w * 0.13 - 2.5, gy - 13, 5, 13);
  ctx.fillRect(w * 0.2 - 1.5, gy - 8, 3, 8);
  ctx.fillRect(w * 0.89 - 2, gy - 10, 4, 10);
  // horizon
  ctx.strokeStyle = 'rgba(233,228,216,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(w, gy);
  ctx.stroke();
  // ground apron, warm fading down to the app's own dark
  const ground = ctx.createLinearGradient(0, gy, 0, h);
  ground.addColorStop(0, '#201c12');
  ground.addColorStop(1, '#171922');
  ctx.fillStyle = ground;
  ctx.fillRect(0, gy, w, h - gy);
  // faint strata on the apron
  ctx.strokeStyle = 'rgba(233,228,216,0.03)';
  for (const f of [0.35, 0.68]) {
    ctx.beginPath();
    ctx.moveTo(0, gy + (h - gy) * f);
    ctx.lineTo(w, gy + (h - gy) * f);
    ctx.stroke();
  }
}

/** The veil: the only way home, and the visual seat of the Tether pool.
 *  `intensity` (0..1) is the pool's fullness — the veil IS the gauge.
 *  `flicker` warns when the thread is nearly spent. */
export function drawVeil(
  ctx: CanvasRenderingContext2D,
  x: number,
  h: number,
  t: number,
  opts?: { intensity?: number; flicker?: boolean },
): void {
  const k = opts?.intensity ?? 1;
  let a = 0.35 + 0.45 * k;
  if (opts?.flicker) a *= 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1));
  const glowW = 14 + 12 * k;
  const g = ctx.createLinearGradient(x - glowW, 0, x + glowW, 0);
  g.addColorStop(0, 'rgba(99,165,140,0)');
  g.addColorStop(0.5, hexA(PAL.verdigris, 0.1 + 0.12 * k));
  g.addColorStop(1, 'rgba(99,165,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - glowW, 0, glowW * 2, h);
  ctx.strokeStyle = hexA(PAL.verdigris, a);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let y = 0; y <= h; y += 6) {
    const wob = Math.sin(y * 0.05 + t * 1.6) * (2 + 2 * k);
    if (y === 0) ctx.moveTo(x + wob, y);
    else ctx.lineTo(x + wob, y);
  }
  ctx.stroke();
  // a second, fainter thread — the veil is woven
  ctx.strokeStyle = hexA(PAL.verdigris, a * 0.4);
  ctx.beginPath();
  for (let y = 0; y <= h; y += 6) {
    const wob = Math.sin(y * 0.045 + t * 1.1 + 2) * (3 + 2 * k);
    if (y === 0) ctx.moveTo(x + wob, y);
    else ctx.lineTo(x + wob, y);
  }
  ctx.stroke();
}

function aspectNotch(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, aspect: Aspect): void {
  ctx.fillStyle = 'rgba(233,228,216,0.7)';
  if (aspect === 'keen') {
    ctx.fillRect(x - 1, y - r - 5, 2, 5);
  } else if (aspect === 'deep') {
    ctx.beginPath();
    ctx.arc(x, y - r - 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (const dx of [-2.6, 2.6]) {
      ctx.beginPath();
      ctx.arc(x + dx, y - r - 3, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The signature carries over: a ring is an annulus, its luster the arc.
 *  `inner` draws a second, thinner arc inside — the Proving uses it for the
 *  engine's continuous XP truth. `glow` haloes in the ring's own rarity color. */
export function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: Ring,
  x: number,
  y: number,
  r: number,
  frac: number,
  opts?: { dull?: boolean; glow?: boolean; inner?: number },
): void {
  const color = opts?.dull ? 'rgba(160,160,160,0.4)' : RARITY_COLORS[ring.rarity]!;
  if (opts?.glow && !opts.dull) {
    const rc = RARITY_COLORS[ring.rarity]!;
    const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.2);
    g.addColorStop(0, hexA(rc, 0.12));
    g.addColorStop(1, hexA(rc, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = Math.max(3, r * 0.32);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, Math.min(1, frac)));
  ctx.stroke();
  if (opts?.inner !== undefined && !opts.dull) {
    const ir = r * 0.55;
    ctx.lineWidth = Math.max(1.5, r * 0.13);
    ctx.strokeStyle = 'rgba(233,228,216,0.14)';
    ctx.beginPath();
    ctx.arc(x, y, ir, 0, Math.PI * 2);
    ctx.stroke();
    if (opts.inner > 0.01) {
      ctx.strokeStyle = 'rgba(233,228,216,0.55)';
      ctx.beginPath();
      ctx.arc(x, y, ir, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, opts.inner));
      ctx.stroke();
    }
  }
  if (!opts?.dull) aspectNotch(ctx, x, y, r, ring.aspect);
}

/** Hush demons: simple procedural silhouettes, one per species. */
export function drawDemon(
  ctx: CanvasRenderingContext2D,
  species: string,
  x: number,
  y: number,
  size: number,
  t: number,
  cracks: number,
): void {
  ctx.save();
  if (species === 'murmur') {
    ctx.fillStyle = 'rgba(126,118,142,0.85)';
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const rr = size * (0.85 + 0.13 * Math.sin(a * 3 + t * 2.4));
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.9;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (species === 'damper') {
    ctx.fillStyle = 'rgba(96,104,88,0.9)';
    ctx.beginPath();
    ctx.ellipse(x, y, size * 1.5, size * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    // hanging drips
    for (const dx of [-size * 0.7, 0, size * 0.7]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + size * 0.85, size * 0.16, size * (0.3 + 0.08 * Math.sin(t * 2 + dx)), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (species === 'hollow') {
    ctx.strokeStyle = 'rgba(88,96,116,0.95)';
    ctx.lineWidth = size * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#0b0c10';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // stillness: a tall silent figure
    const bob = Math.sin(t * 0.9) * 2;
    ctx.fillStyle = 'rgba(38,39,48,0.98)';
    const w2 = size * 0.55;
    const h2 = size * 2.3;
    roundRect(ctx, x - w2 / 2, y - h2 / 2 + bob, w2, h2, w2 / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,228,216,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - h2 * 0.28 + bob);
    ctx.lineTo(x, y - h2 * 0.06 + bob);
    ctx.stroke();
  }
  // cracks (fracture stacks) as pale fissures
  ctx.strokeStyle = 'rgba(233,228,216,0.75)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < cracks; i++) {
    const a = i * 2.4 + 0.7;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * size * 0.2, y + Math.sin(a) * size * 0.2);
    ctx.lineTo(x + Math.cos(a) * size * 0.75, y + Math.sin(a) * size * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fillRect(x - w / 2, y, w, 3);
  ctx.fillStyle = PAL.danger;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), 3);
}
