import type { Aspect, Cluster, LatticeFold } from '../types';

/** The Lattice: resettable progression. Nodes UNLOCK primitives and turn
 *  global knobs; ring affixes then scale what's unlocked. Unlocks also
 *  3x-weight their related affixes in loot rolls (skew, never gate).
 *  Respec is free by design — a respec re-contextualizes the collection. */
export interface LatticeNode {
  id: string;
  cluster: Cluster;
  name: string;
  cost: number;
  requires?: string;
  desc: string;
  aspect?: Aspect;
  fold: (f: LatticeFold) => void;
}

export const LATTICE: LatticeNode[] = [
  // ---- resonance cluster (the starting cluster) ----
  {
    id: 'fracture',
    cluster: 'resonance',
    name: 'Fracture',
    cost: 30,
    desc: 'Hits have 25% chance to crack a demon. At 5 cracks it shatters for burst damage. Higher thresholds shatter harder.',
    fold: (f) => f.unlocked.add('fracture'),
  },
  {
    id: 'fault_lines',
    cluster: 'resonance',
    name: 'Fault Lines',
    cost: 50,
    requires: 'fracture',
    desc: '+15% fracture chance.',
    fold: (f) => {
      f.unlocked.add('fault_lines');
      f.fracChance += 0.15;
    },
  },
  {
    id: 'echo',
    cluster: 'resonance',
    name: 'Echo',
    cost: 30,
    desc: 'Attacks have 15% chance to repeat at 50% power.',
    fold: (f) => f.unlocked.add('echo'),
  },
  {
    id: 'reverberation',
    cluster: 'resonance',
    name: 'Reverberation',
    cost: 50,
    requires: 'echo',
    desc: '+10% echo chance.',
    fold: (f) => {
      f.unlocked.add('reverberation');
      f.echoChance += 0.1;
    },
  },
  {
    id: 'crescendo',
    cluster: 'resonance',
    name: 'Crescendo',
    cost: 30,
    desc: 'Attacks have 20% chance to bank a crescendo (cap 3). The next attack releases all banked crescendo for +30% damage each.',
    fold: (f) => f.unlocked.add('crescendo'),
  },
  {
    id: 'knell',
    cluster: 'resonance',
    name: 'Knell',
    cost: 40,
    desc: 'Killing blows have 25% chance to restore 1 Tether. The only sustain the veil allows.',
    fold: (f) => f.unlocked.add('knell'),
  },
  {
    id: 'swell_1',
    cluster: 'resonance',
    name: 'Swell I',
    cost: 35,
    desc: 'Training rotations have +15% chance to briefly raise the training quota by 1.',
    fold: (f) => {
      f.unlocked.add('swell_1');
      f.swellChance += 0.15;
    },
  },
  {
    id: 'swell_2',
    cluster: 'resonance',
    name: 'Swell II',
    cost: 70,
    requires: 'swell_1',
    desc: 'A further +15% swell chance.',
    fold: (f) => {
      f.unlocked.add('swell_2');
      f.swellChance += 0.15;
    },
  },
  // ---- aspect attunements (neutral axis, cluster-agnostic) ----
  {
    id: 'attune_keen',
    cluster: 'core',
    name: 'Attune: Keen',
    cost: 25,
    aspect: 'keen',
    desc: '+20% keen damage. Keen-forged affixes roll 3x as often.',
    fold: (f) => {
      f.unlocked.add('attune_keen');
      f.aspectDmg.keen *= 1.2;
    },
  },
  {
    id: 'attune_deep',
    cluster: 'core',
    name: 'Attune: Deep',
    cost: 25,
    aspect: 'deep',
    desc: '+20% deep damage. Deep-forged affixes roll 3x as often.',
    fold: (f) => {
      f.unlocked.add('attune_deep');
      f.aspectDmg.deep *= 1.2;
    },
  },
  {
    id: 'attune_bright',
    cluster: 'core',
    name: 'Attune: Bright',
    cost: 25,
    aspect: 'bright',
    desc: '+20% bright damage. Bright-forged affixes roll 3x as often.',
    fold: (f) => {
      f.unlocked.add('attune_bright');
      f.aspectDmg.bright *= 1.2;
    },
  },
  // ---- neutral stat nodes ----
  {
    id: 'vigor',
    cluster: 'core',
    name: 'Vigor',
    cost: 25,
    desc: '+10% damage for all rings.',
    fold: (f) => {
      f.unlocked.add('vigor');
      f.dmgMult *= 1.1;
    },
  },
  {
    id: 'temper',
    cluster: 'core',
    name: 'Temper',
    cost: 25,
    desc: '+15% luster for all rings.',
    fold: (f) => {
      f.unlocked.add('temper');
      f.lusterMult *= 1.15;
    },
  },
];

export const NODE_BY_ID = new Map(LATTICE.map((n) => [n.id, n]));

export function emptyFold(): LatticeFold {
  return {
    unlocked: new Set<string>(),
    dmgMult: 1,
    lusterMult: 1,
    echoChance: 0,
    fracChance: 0,
    aspectDmg: { keen: 1, deep: 1, bright: 1 },
    swellChance: 0,
  };
}

export function foldLattice(owned: string[]): LatticeFold {
  const f = emptyFold();
  for (const id of owned) NODE_BY_ID.get(id)?.fold(f);
  return f;
}
