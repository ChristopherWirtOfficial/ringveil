import { AFFIX_BY_ID } from '../data/affixes';
import { NODE_BY_ID } from '../data/lattice';
import { UNIQUE_BY_ID } from '../data/uniques';
import { effStats, RARITY_COLORS, RARITY_NAMES, xpToNext } from '../game/rings';
import type { LatticeFold, Ring } from '../types';
import { h } from './dom';
import { ringGlyph } from './ringGlyph';

export type RingStatus = 'sparring' | 'waiting' | 'away';

const STATUS_TEXT: Record<RingStatus, string> = {
  sparring: 'sparring',
  waiting: 'waiting',
  away: 'in the Hush',
};

/** An affix is dormant when the primitive it turns a knob on has no lattice
 *  unlock yet — the engine zeroes it. Stating that fact is comprehension,
 *  not an optimizer: the player still decides what to do about it. */
function dormantNode(affixId: string, fold: LatticeFold): string | null {
  const d = AFFIX_BY_ID.get(affixId);
  if (!d?.wantsNode || fold.unlocked.has(d.wantsNode)) return null;
  return NODE_BY_ID.get(d.wantsNode)?.name ?? d.wantsNode;
}

export function affixLines(ring: Ring, fold: LatticeFold): string[] {
  if (ring.uniqueId) {
    const u = UNIQUE_BY_ID.get(ring.uniqueId)!;
    return [u.desc, `“${u.lore}”`];
  }
  return ring.affixes.map((r) => {
    const d = AFFIX_BY_ID.get(r.id)!;
    const dorm = dormantNode(r.id, fold);
    return d.desc(r.mag) + (dorm ? ` — dormant until ${dorm} is learned` : '');
  });
}

/** Compact affix chips: the two grades on purpose. Stat boosts stay quiet;
 *  integer / new-dynamics affixes (and unique lines) read bronze — the tail
 *  is the point. Dormant knobs render dashed. */
function affixChips(ring: Ring, fold: LatticeFold): HTMLElement | null {
  const chips: HTMLElement[] = [];
  if (ring.uniqueId) {
    const u = UNIQUE_BY_ID.get(ring.uniqueId)!;
    for (const part of u.desc.split(' · ')) chips.push(h('span', { class: 'chip-affix tail' }, part));
  } else {
    for (const roll of ring.affixes) {
      const d = AFFIX_BY_ID.get(roll.id)!;
      const dorm = dormantNode(roll.id, fold);
      chips.push(
        h(
          'span',
          {
            class: `chip-affix${d.integer ? ' tail' : ''}${dorm ? ' dormant' : ''}`,
            ...(dorm ? { title: `dormant — learn ${dorm}` } : {}),
          },
          d.desc(roll.mag),
        ),
      );
    }
  }
  if (chips.length === 0) return null;
  return h('div', { class: 'affix-chips' }, ...chips);
}

export interface RingCardLive {
  status: () => RingStatus;
  register: (update: () => void) => void;
}

export function ringCard(
  ring: Ring,
  fold: LatticeFold,
  opts?: {
    frac?: number;
    onClick?: () => void;
    status?: RingStatus;
    inCalling?: boolean;
    live?: RingCardLive;
  },
): HTMLElement {
  const s0 = effStats(ring, fold);
  const xpFrac = () => Math.min(1, ring.xp / xpToNext(ring.level));

  const statusChip = opts?.status ? h('span', { class: `status-chip ${opts.status}` }, STATUS_TEXT[opts.status]) : null;
  const lvEl = h('span', {}, `Lv ${ring.level}`);
  const xpFill = h('div', { class: 'xp-fill', style: `width:${(xpFrac() * 100).toFixed(1)}%` });

  if (opts?.live) {
    const live = opts.live;
    live.register(() => {
      lvEl.textContent = `Lv ${ring.level}`;
      xpFill.style.width = `${(xpFrac() * 100).toFixed(1)}%`;
      if (statusChip) {
        const st = live.status();
        statusChip.className = `status-chip ${st}`;
        statusChip.textContent = STATUS_TEXT[st];
      }
    });
  }

  const meta = h(
    'div',
    { class: 'ring-meta' },
    h('span', { class: 'rarity', style: `color:${RARITY_COLORS[ring.rarity]}` }, RARITY_NAMES[ring.rarity]!),
    ` · ${ring.aspect} · `,
    lvEl,
    opts?.inCalling ? h('span', { class: 'calling-chip' }, '✦ Calling') : null,
  );

  return h(
    'div',
    { class: 'ring-card', ...(opts?.onClick ? { onclick: opts.onClick } : {}) },
    ringGlyph(ring, opts?.frac ?? 1),
    h(
      'div',
      { class: 'ring-card-body' },
      h(
        'div',
        { class: 'ring-head' },
        h('div', { class: 'ring-name', ...(ring.rarity === 4 ? { style: `color:${RARITY_COLORS[4]}` } : {}) }, ring.name),
        statusChip,
      ),
      meta,
      h('div', { class: 'xp-bar' }, xpFill),
      affixChips(ring, fold),
      h('div', { class: 'ring-costs mono' }, `⟟${s0.attCost} attune · ◈${s0.tetherCost} tether · ${s0.dmg.toFixed(1)} dmg`),
    ),
  );
}

export function ringDetail(ring: Ring, fold: LatticeFold): HTMLElement {
  const s0 = effStats(ring, fold);
  return h(
    'div',
    { class: 'ring-detail' },
    h(
      'div',
      { class: 'mono dim small' },
      `${s0.dmg.toFixed(1)} dmg every ${s0.interval} ticks · ${Math.round(s0.maxLuster)} luster`,
    ),
    h('div', { class: 'mono dim small' }, `XP ${Math.floor(ring.xp)} / ${xpToNext(ring.level)}`),
    ...affixLines(ring, fold).map((line) => h('div', { class: 'affix-line' }, line)),
  );
}
