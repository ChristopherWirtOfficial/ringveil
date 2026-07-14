import { AFFIX_BY_ID } from '../data/affixes';
import { UNIQUE_BY_ID } from '../data/uniques';
import { effStats, RARITY_COLORS, RARITY_NAMES, xpToNext } from '../game/rings';
import type { LatticeFold, Ring } from '../types';
import { h } from './dom';
import { ringGlyph } from './ringGlyph';

export function affixLines(ring: Ring): string[] {
  if (ring.uniqueId) {
    const u = UNIQUE_BY_ID.get(ring.uniqueId)!;
    return [u.desc, `“${u.lore}”`];
  }
  return ring.affixes.map((r) => {
    const d = AFFIX_BY_ID.get(r.id)!;
    return d.desc(r.mag);
  });
}

export function ringCard(ring: Ring, fold: LatticeFold, opts?: { frac?: number; onClick?: () => void }): HTMLElement {
  const s = effStats(ring, fold);
  const card = h(
    'div',
    { class: 'ring-card', ...(opts?.onClick ? { onclick: opts.onClick } : {}) },
    ringGlyph(ring, opts?.frac ?? 1),
    h(
      'div',
      { class: 'ring-card-body' },
      h('div', { class: 'ring-name' }, ring.name),
      h(
        'div',
        { class: 'ring-meta' },
        h('span', { class: 'rarity', style: `color:${RARITY_COLORS[ring.rarity]}` }, RARITY_NAMES[ring.rarity]!),
        ` · ${ring.aspect} · Lv ${ring.level}`,
      ),
      h('div', { class: 'ring-costs mono' }, `⟟${s.attCost} attune · ◈${s.tetherCost} tether · ${s.dmg.toFixed(1)} dmg`),
    ),
  );
  return card;
}

export function ringDetail(ring: Ring, fold: LatticeFold): HTMLElement {
  const s = effStats(ring, fold);
  return h(
    'div',
    { class: 'ring-detail' },
    h(
      'div',
      { class: 'mono dim small' },
      `${s.dmg.toFixed(1)} dmg every ${s.interval} ticks · ${Math.round(s.maxLuster)} luster`,
    ),
    h('div', { class: 'mono dim small' }, `XP ${Math.floor(ring.xp)} / ${xpToNext(ring.level)}`),
    ...affixLines(ring).map((line) => h('div', { class: 'affix-line' }, line)),
  );
}
