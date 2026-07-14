import { RARITY_COLORS } from '../game/rings';
import type { Ring } from '../types';

const SVG = 'http://www.w3.org/2000/svg';

/** Signature element: rings ARE rings. An SVG annulus whose stroke arc is
 *  the ring's remaining luster (or training wear). Rarity is the metal. */
export function ringGlyph(ring: Ring, frac: number, size = 44): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.classList.add('ring-glyph');

  const track = document.createElementNS(SVG, 'circle');
  track.setAttribute('cx', '22');
  track.setAttribute('cy', '22');
  track.setAttribute('r', '17');
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', 'rgba(255,255,255,0.08)');
  track.setAttribute('stroke-width', '5');
  svg.append(track);

  const arc = document.createElementNS(SVG, 'circle');
  const c = 2 * Math.PI * 17;
  arc.setAttribute('cx', '22');
  arc.setAttribute('cy', '22');
  arc.setAttribute('r', '17');
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', RARITY_COLORS[ring.rarity]!);
  arc.setAttribute('stroke-width', '5');
  arc.setAttribute('stroke-linecap', 'round');
  arc.setAttribute('stroke-dasharray', `${Math.max(0, Math.min(1, frac)) * c} ${c}`);
  arc.setAttribute('transform', 'rotate(-90 22 22)');
  svg.append(arc);

  // aspect notch at 12 o'clock: keen = line, deep = dot, bright = double dot
  const mark = document.createElementNS(SVG, 'g');
  mark.setAttribute('fill', 'var(--ink-dim)');
  if (ring.aspect === 'keen') {
    const l = document.createElementNS(SVG, 'rect');
    l.setAttribute('x', '21');
    l.setAttribute('y', '9');
    l.setAttribute('width', '2');
    l.setAttribute('height', '6');
    mark.append(l);
  } else if (ring.aspect === 'deep') {
    const d = document.createElementNS(SVG, 'circle');
    d.setAttribute('cx', '22');
    d.setAttribute('cy', '12');
    d.setAttribute('r', '2');
    mark.append(d);
  } else {
    for (const x of [19, 25]) {
      const d = document.createElementNS(SVG, 'circle');
      d.setAttribute('cx', String(x));
      d.setAttribute('cy', '12');
      d.setAttribute('r', '1.6');
      mark.append(d);
    }
  }
  svg.append(mark);
  return svg;
}
