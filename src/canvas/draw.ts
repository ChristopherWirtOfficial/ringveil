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

export function hushBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#101218');
  g.addColorStop(1, PAL.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // faint drifting silence lines
  ctx.strokeStyle = 'rgba(160,160,190,0.045)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = ((i * 0.23 + t * 0.008) % 1) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  // ground
  ctx.strokeStyle = 'rgba(233,228,216,0.12)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.86);
  ctx.lineTo(w, h * 0.86);
  ctx.stroke();
}

export function provingBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#191c21');
  g.addColorStop(1, '#1b1e17');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(233,228,216,0.1)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.82);
  ctx.lineTo(w, h * 0.82);
  ctx.stroke();
}

export function drawVeil(ctx: CanvasRenderingContext2D, x: number, h: number, t: number): void {
  const g = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
  g.addColorStop(0, 'rgba(99,165,140,0)');
  g.addColorStop(0.5, 'rgba(99,165,140,0.16)');
  g.addColorStop(1, 'rgba(99,165,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 18, 0, 36, h);
  ctx.strokeStyle = 'rgba(99,165,140,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 0; y <= h; y += 6) {
    const wob = Math.sin(y * 0.05 + t * 1.6) * 3;
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

/** The signature carries over: a ring is an annulus, its luster the arc. */
export function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: Ring,
  x: number,
  y: number,
  r: number,
  frac: number,
  opts?: { dull?: boolean; glow?: boolean },
): void {
  const color = opts?.dull ? 'rgba(160,160,160,0.4)' : RARITY_COLORS[ring.rarity]!;
  if (opts?.glow && !opts.dull) {
    const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.2);
    g.addColorStop(0, 'rgba(201,145,63,0.10)');
    g.addColorStop(1, 'rgba(201,145,63,0)');
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
