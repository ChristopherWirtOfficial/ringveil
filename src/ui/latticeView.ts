import { LATTICE, NODE_BY_ID, type LatticeNode } from '../data/lattice';
import {
  attCap,
  buyNode,
  buyUpgrade,
  respec,
  tetherCap,
  trainSlots,
  upgradeCost,
  type GameState,
  type Upgrades,
} from '../game/state';
import { h, s } from './dom';

/** Hand-laid constellation positions on a 0–100 × 0–80 sky. Presentation
 *  only — engines never read these. Nodes missing a position fall into a
 *  spare row at the bottom, so new data can't break the map. */
const POS: Record<string, [number, number]> = {
  fracture: [14, 19],
  fault_lines: [7, 33],
  echo: [32, 13],
  reverberation: [27, 29],
  crescendo: [50, 17],
  knell: [68, 13],
  swell_1: [85, 19],
  swell_2: [92, 33],
  attune_keen: [26, 52],
  attune_deep: [50, 47],
  attune_bright: [74, 52],
  vigor: [38, 66],
  temper: [62, 66],
};

/** Decorative constellation strokes — the shape of each cluster. */
const CHAINS: string[][] = [
  ['fracture', 'echo', 'crescendo', 'knell', 'swell_1'],
  ['attune_keen', 'attune_deep', 'attune_bright', 'attune_keen'],
  ['vigor', 'temper'],
];

/** A fixed scatter of background stars. */
const STARS: Array<[number, number]> = [
  [5, 8], [22, 6], [41, 25], [59, 7], [77, 24], [95, 9], [12, 44],
  [45, 36], [88, 47], [30, 72], [70, 36], [93, 68], [8, 62], [55, 73],
];

const CLUSTER_COLOR: Record<string, string> = { resonance: '#63a58c', core: '#a29b8c' };

function nodePos(node: LatticeNode, spare: { n: number }): [number, number] {
  const p = POS[node.id];
  if (p) return p;
  return [8 + (spare.n++ % 8) * 12, 76];
}

interface NodeState {
  owned: boolean;
  blocked: boolean;
  poor: boolean;
}

function nodeState(st: GameState, node: LatticeNode): NodeState {
  const owned = st.latticeOwned.includes(node.id);
  const blocked = !!node.requires && !st.latticeOwned.includes(node.requires);
  return { owned, blocked, poor: st.shards < node.cost };
}

function constellation(st: GameState, selected: string | null, onSelect: (id: string | null) => void): SVGSVGElement {
  const svg = s('svg', { viewBox: '0 0 100 80', class: 'lattice-map', role: 'img' });
  const spare = { n: 0 };
  const posOf = (id: string): [number, number] | null => {
    const node = NODE_BY_ID.get(id);
    return node ? nodePos(node, spare) : null;
  };

  for (const [x, y] of STARS) svg.append(s('circle', { cx: x, cy: y, r: 0.5, fill: 'rgba(233,228,216,0.10)' }));

  svg.append(
    s('text', { x: 50, y: 5, class: 'lattice-cluster-label', fill: 'rgba(99,165,140,0.55)', 'text-anchor': 'middle', 'font-size': 2.6 }, 'R E S O N A N C E'),
    s('text', { x: 50, y: 41.5, class: 'lattice-cluster-label', fill: 'rgba(162,155,140,0.5)', 'text-anchor': 'middle', 'font-size': 2.6 }, 'C O R E'),
  );

  // the shapes of the clusters, barely there
  for (const chain of CHAINS) {
    for (let i = 0; i + 1 < chain.length; i++) {
      const a = posOf(chain[i]!);
      const b = posOf(chain[i + 1]!);
      if (!a || !b) continue;
      svg.append(s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'rgba(233,228,216,0.06)', 'stroke-width': 0.4 }));
    }
  }

  // requires-edges: the real dependencies
  for (const node of LATTICE) {
    if (!node.requires) continue;
    const a = posOf(node.requires);
    const b = posOf(node.id);
    if (!a || !b) continue;
    const { owned, blocked } = nodeState(st, node);
    svg.append(
      s('line', {
        x1: a[0], y1: a[1], x2: b[0], y2: b[1],
        stroke: owned ? 'rgba(99,165,140,0.55)' : 'rgba(233,228,216,0.18)',
        'stroke-width': 0.5,
        ...(blocked ? { 'stroke-dasharray': '1.6 1.6' } : {}),
      }),
    );
  }

  const spare2 = { n: 0 };
  for (const node of LATTICE) {
    const [x, y] = nodePos(node, spare2);
    const color = CLUSTER_COLOR[node.cluster] ?? '#a29b8c';
    const { owned, blocked, poor } = nodeState(st, node);
    const ready = !owned && !blocked && !poor;
    const g = s('g', { class: 'lattice-node', onclick: () => onSelect(selected === node.id ? null : node.id) });
    // generous invisible hit target for thumbs
    g.append(s('circle', { cx: x, cy: y, r: 8, fill: 'rgba(0,0,0,0)' }));
    if (ready) g.append(s('circle', { cx: x, cy: y, r: 6, fill: 'none', stroke: 'rgba(201,145,63,0.55)', 'stroke-width': 0.6, class: 'node-pulse' }));
    if (selected === node.id) g.append(s('circle', { cx: x, cy: y, r: 6.4, fill: 'none', stroke: 'rgba(233,228,216,0.7)', 'stroke-width': 0.5 }));
    if (owned) {
      g.append(s('circle', { cx: x, cy: y, r: 4, fill: color, 'fill-opacity': 0.9, stroke: color, 'stroke-width': 0.6 }));
      g.append(s('circle', { cx: x, cy: y, r: 1.2, fill: '#14161d' }));
    } else if (blocked) {
      g.append(s('circle', { cx: x, cy: y, r: 4, fill: 'none', stroke: color, 'stroke-opacity': 0.35, 'stroke-width': 0.8, 'stroke-dasharray': '1.4 1.4' }));
    } else {
      g.append(s('circle', { cx: x, cy: y, r: 4, fill: '#1d2029', stroke: color, 'stroke-opacity': poor ? 0.45 : 0.95, 'stroke-width': 1 }));
    }
    g.append(
      s('text', {
        x, y: y + 8.2,
        'text-anchor': 'middle',
        'font-size': 3,
        fill: owned ? '#e9e4d8' : '#a29b8c',
        'fill-opacity': blocked ? 0.55 : 1,
      }, node.name),
    );
    svg.append(g);
  }
  return svg;
}

function nodeDetail(st: GameState, selected: string | null, onChanged: () => void): HTMLElement {
  if (!selected) {
    return h('div', { class: 'lattice-detail dim small' }, 'Tap a star to read it. Learned nodes unlock primitives; respec refunds everything, freely.');
  }
  const node = NODE_BY_ID.get(selected)!;
  const { owned, blocked, poor } = nodeState(st, node);
  const head = h(
    'div',
    { class: 'node-head' },
    h('strong', {}, node.name),
    h('span', { class: 'mono dim' }, owned ? '● known' : `◆${node.cost}`),
  );
  const cluster = h('div', { class: 'tiny', style: `color:${CLUSTER_COLOR[node.cluster]}` }, node.cluster);
  const body = h('div', { class: 'small dim', style: 'margin-top:4px' }, node.desc);
  const detail = h('div', { class: 'lattice-detail' }, head, cluster, body);
  if (owned) {
    detail.append(h('div', { class: 'tiny dim', style: 'margin-top:8px' }, 'known · a respec refunds it in full'));
  } else if (blocked) {
    detail.append(h('div', { class: 'tiny dim', style: 'margin-top:8px' }, `requires ${NODE_BY_ID.get(node.requires!)?.name ?? node.requires}`));
  } else {
    const learn = h('button', { class: 'mini', onclick: () => { if (buyNode(st, node.id)) onChanged(); } }, `Learn ◆${node.cost}`);
    if (poor) learn.setAttribute('disabled', '');
    detail.append(h('div', { class: 'actions', style: 'margin-top:8px' }, learn, poor ? h('span', { class: 'tiny dim' }, 'not enough shards') : null));
  }
  return detail;
}

function foundry(st: GameState, onChanged: () => void): HTMLElement[] {
  const ups: Array<[keyof Upgrades, string, string]> = [
    ['attCap', 'Widen attunement', `⟟ window +1 (now ${attCap(st)})`],
    ['tetherCap', 'Deepen the pool', `◈ Tether +2 (now ${tetherCap(st)})`],
    ['trainSlots', 'Raise the quota', `training slots +1 (now ${trainSlots(st)})`],
  ];
  return ups.map(([kind, name, desc]) => {
    const cost = upgradeCost(kind, st.upgrades[kind]);
    const forge = h('button', { class: 'mini', onclick: () => { if (buyUpgrade(st, kind)) onChanged(); } }, `Forge ◆${cost}`);
    if (st.shards < cost) forge.setAttribute('disabled', '');
    return h(
      'div',
      { class: 'node' },
      h('div', { class: 'node-head' }, h('strong', {}, name), h('span', { class: 'mono dim' }, `owned ${st.upgrades[kind]}`)),
      h('div', { class: 'small dim' }, `${desc} · never resets`),
      forge,
    );
  });
}

export function latticeView(
  st: GameState,
  opts: { selected: string | null; onSelect: (id: string | null) => void; onChanged: () => void },
): HTMLElement {
  const v = h('section', {});
  v.append(
    h(
      'div',
      { class: 'section-head' },
      h('h2', {}, 'The Lattice'),
      h('button', { class: 'mini', onclick: () => { respec(st); opts.onChanged(); } }, 'Respec (free)'),
    ),
    h('p', { class: 'dim small note' },
      'Nodes unlock primitives; affixes scale what is unlocked, and unlocks skew loot (3×) without gating it.'),
    constellation(st, opts.selected, opts.onSelect),
    nodeDetail(st, opts.selected, opts.onChanged),
    h('h3', { class: 'cluster-label' }, 'The Foundry — permanent'),
    ...foundry(st, opts.onChanged),
  );
  return v;
}
