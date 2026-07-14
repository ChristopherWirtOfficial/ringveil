/** Ringveil core types.
 *
 * Architectural spine: every primitive, affix, and lattice node carries a
 * `cluster` tag. "resonance" is the STARTING cluster, not the game's identity.
 * Future clusters (and the zones that oppose them) are data, not rewrites.
 */

export type Cluster = 'resonance' | 'core'; // 'core' = cluster-neutral

/** Aspects are the neutral element axis. Clusters interpret them
 *  (resonance reads them as tones); zones assign weaknesses. */
export type Aspect = 'keen' | 'deep' | 'bright';
export const ASPECTS: Aspect[] = ['keen', 'deep', 'bright'];

/** 0 common, 1 attuned, 2 resonant, 3 radiant, 4 unique */
export type Rarity = 0 | 1 | 2 | 3 | 4;

export interface AffixRoll {
  id: string;
  /** rolled magnitude in the affix's own unit */
  mag: number;
}

export interface Ring {
  id: string;
  name: string;
  rarity: Rarity;
  aspect: Aspect;
  level: number;
  xp: number;
  affixes: AffixRoll[];
  uniqueId?: string;
}

/** Effective stats after rarity base + level + affixes + lattice fold. */
export interface EffStats {
  dmg: number;
  /** ticks between attacks (lower = faster) */
  interval: number;
  maxLuster: number;
  aspectDmg: Record<Aspect, number>; // multiplicative bonus per aspect
  // resonance-cluster primitives (zeroed until unlocked)
  echoChance: number;
  echoRepeats: number; // extra repeats beyond the first echo
  echoPower: number;
  fracChance: number;
  fracThresh: number;
  shatterBonus: number; // multiplicative bonus to shatter damage
  crescChance: number;
  crescCap: number;
  crescPer: number; // dmg bonus per consumed crescendo stack
  knellChance: number;
  knellAmount: number;
  // costs
  attCost: number;
  tetherCost: number;
  // training
  xpMult: number;
}

/** Lattice-derived global modifiers folded into every ring's stats. */
export interface LatticeFold {
  unlocked: Set<string>; // node ids
  dmgMult: number;
  lusterMult: number;
  echoChance: number;
  fracChance: number;
  aspectDmg: Record<Aspect, number>;
  swellChance: number; // training quota proc chance on rotation
}

// ---------------- events (engines emit, UI listens) ----------------

export type ExpeditionEvent =
  | { t: 'summon'; ring: Ring; tether: number }
  | { t: 'attack'; ring: Ring; demonId: string; demon: string; dmg: number; echo: boolean; cresc: number }
  | { t: 'shatter'; demonId: string; demon: string; dmg: number }
  | { t: 'kill'; demonId: string; demon: string; ring: Ring }
  | { t: 'knell'; ring: Ring; amount: number }
  | { t: 'ringDown'; ring: Ring }
  | { t: 'demonHit'; demonId: string; demon: string; ring: Ring; dmg: number }
  | { t: 'steal'; demon: string; amount: number }
  | { t: 'wave'; n: number }
  | { t: 'drop'; ring: Ring; melted: boolean; shards: number }
  | { t: 'end'; won: false; waves: number; shards: number };

export type TrainingEvent =
  | { t: 'rotate'; ring: Ring; shards: number }
  | { t: 'swell'; bonusQuota: number }
  | { t: 'levelUp'; ring: Ring };
