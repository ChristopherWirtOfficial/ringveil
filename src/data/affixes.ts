import type { Aspect, Cluster, EffStats } from '../types';

/** Affixes are pure data + a stats fold. Dynamic behavior (echo, fracture,
 *  crescendo, knell) lives in the engine as primitives; affixes only turn
 *  the knobs. New-dynamics affixes are integer knobs — the "+1 that is
 *  insane if it synergizes" class. */
export interface AffixDef {
  id: string;
  kind: 'prefix' | 'suffix';
  cluster: Cluster;
  /** aspect-tagged affixes get weighted by aspect attunement nodes */
  aspect?: Aspect;
  /** which lattice node makes this affix "live" (weighting, not gating) */
  wantsNode?: string;
  /** integer/dynamics affixes are rarer by nature */
  baseWeight: number;
  /** [min,max] rolled magnitude */
  roll: [number, number];
  integer?: boolean;
  name: (mag: number) => string;
  desc: (mag: number) => string;
  fold: (s: EffStats, mag: number) => void;
}

export const AFFIXES: AffixDef[] = [
  // ---- stat prefixes (the floor: common, mildly useful) ----
  {
    id: 'heavy',
    kind: 'prefix',
    cluster: 'core',
    baseWeight: 14,
    roll: [15, 40],
    name: () => 'Heavy',
    desc: (m) => `+${m}% damage`,
    fold: (s, m) => {
      s.dmg *= 1 + m / 100;
    },
  },
  {
    id: 'quick',
    kind: 'prefix',
    cluster: 'core',
    baseWeight: 10,
    roll: [1, 1],
    integer: true,
    name: () => 'Quick',
    desc: () => `attacks 1 tick sooner`,
    fold: (s) => {
      s.interval = Math.max(2, s.interval - 1);
    },
  },
  {
    id: 'lasting',
    kind: 'prefix',
    cluster: 'core',
    baseWeight: 14,
    roll: [20, 50],
    name: () => 'Lasting',
    desc: (m) => `+${m}% luster`,
    fold: (s, m) => {
      s.maxLuster *= 1 + m / 100;
    },
  },
  {
    id: 'quiet',
    kind: 'prefix',
    cluster: 'core',
    baseWeight: 7,
    roll: [1, 1],
    integer: true,
    name: () => 'Quiet',
    desc: () => `-1 Tether to summon`,
    fold: (s) => {
      s.tetherCost = Math.max(1, s.tetherCost - 1);
    },
  },
  {
    id: 'studious',
    kind: 'prefix',
    cluster: 'core',
    baseWeight: 10,
    roll: [25, 60],
    name: () => 'Studious',
    desc: (m) => `+${m}% training XP`,
    fold: (s, m) => {
      s.xpMult *= 1 + m / 100;
    },
  },
  {
    id: 'keenforged',
    kind: 'prefix',
    cluster: 'core',
    aspect: 'keen',
    baseWeight: 8,
    roll: [20, 45],
    name: () => 'Keen-forged',
    desc: (m) => `+${m}% keen damage`,
    fold: (s, m) => {
      s.aspectDmg.keen *= 1 + m / 100;
    },
  },
  {
    id: 'deepforged',
    kind: 'prefix',
    cluster: 'core',
    aspect: 'deep',
    baseWeight: 8,
    roll: [20, 45],
    name: () => 'Deep-forged',
    desc: (m) => `+${m}% deep damage`,
    fold: (s, m) => {
      s.aspectDmg.deep *= 1 + m / 100;
    },
  },
  {
    id: 'brightforged',
    kind: 'prefix',
    cluster: 'core',
    aspect: 'bright',
    baseWeight: 8,
    roll: [20, 45],
    name: () => 'Bright-forged',
    desc: (m) => `+${m}% bright damage`,
    fold: (s, m) => {
      s.aspectDmg.bright *= 1 + m / 100;
    },
  },
  // ---- resonance-cluster dynamics suffixes (the tail: rare, build-warping) ----
  {
    id: 'of_echoes',
    kind: 'suffix',
    cluster: 'resonance',
    wantsNode: 'echo',
    baseWeight: 3,
    roll: [1, 1],
    integer: true,
    name: () => 'of Echoes',
    desc: () => `+1 echo repeat`,
    fold: (s) => {
      s.echoRepeats += 1;
    },
  },
  {
    id: 'of_the_fault',
    kind: 'suffix',
    cluster: 'resonance',
    wantsNode: 'fracture',
    baseWeight: 6,
    roll: [10, 25],
    name: (m) => `of the Fault`,
    desc: (m) => `+${m}% fracture chance`,
    fold: (s, m) => {
      s.fracChance += m / 100;
    },
  },
  {
    id: 'of_deep_cracks',
    kind: 'suffix',
    cluster: 'resonance',
    wantsNode: 'fracture',
    baseWeight: 3,
    roll: [1, 1],
    integer: true,
    name: () => 'of Deep Cracks',
    desc: () => `+1 fracture threshold (bigger shatters)`,
    fold: (s) => {
      s.fracThresh += 1;
    },
  },
  {
    id: 'of_crescendo',
    kind: 'suffix',
    cluster: 'resonance',
    wantsNode: 'crescendo',
    baseWeight: 3,
    roll: [1, 1],
    integer: true,
    name: () => 'of Crescendo',
    desc: () => `+1 crescendo cap`,
    fold: (s) => {
      s.crescCap += 1;
    },
  },
  {
    id: 'of_the_knell',
    kind: 'suffix',
    cluster: 'resonance',
    wantsNode: 'knell',
    baseWeight: 6,
    roll: [15, 30],
    name: () => 'of the Knell',
    desc: (m) => `+${m}% knell chance`,
    fold: (s, m) => {
      s.knellChance += m / 100;
    },
  },
  {
    id: 'of_the_long_toll',
    kind: 'suffix',
    cluster: 'resonance',
    wantsNode: 'knell',
    baseWeight: 3,
    roll: [1, 1],
    integer: true,
    name: () => 'of the Long Toll',
    desc: () => `+1 Tether per knell`,
    fold: (s) => {
      s.knellAmount += 1;
    },
  },
];

export const AFFIX_BY_ID = new Map(AFFIXES.map((a) => [a.id, a]));
