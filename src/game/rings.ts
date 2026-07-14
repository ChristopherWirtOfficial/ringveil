import { AFFIXES, AFFIX_BY_ID, type AffixDef } from '../data/affixes';
import { UNIQUES, UNIQUE_BY_ID } from '../data/uniques';
import type { AffixRoll, Aspect, EffStats, LatticeFold, Rarity, Ring } from '../types';
import { ASPECTS } from '../types';
import { Rng, uid } from '../core/rng';

export const RARITY_NAMES = ['Common', 'Attuned', 'Resonant', 'Radiant', 'Unique'] as const;
export const RARITY_COLORS = ['#98a0ac', '#6fa3d8', '#a986e0', '#e08a2e', '#d9b95c'] as const;

interface RarityBase {
  dmg: number;
  interval: number;
  luster: number;
  attCost: number;
  tetherCost: number;
  affixCount: number;
  meltValue: number;
}

/** Attunement cost and Tether cost are correlated but distinct on purpose —
 *  they scale differently and affixes bend them independently. */
export const RARITY_BASE: RarityBase[] = [
  { dmg: 3, interval: 3, luster: 20, attCost: 1, tetherCost: 2, affixCount: 1, meltValue: 2 },
  { dmg: 5, interval: 3, luster: 28, attCost: 2, tetherCost: 3, affixCount: 2, meltValue: 6 },
  { dmg: 8, interval: 3, luster: 40, attCost: 4, tetherCost: 5, affixCount: 3, meltValue: 18 },
  { dmg: 13, interval: 3, luster: 60, attCost: 8, tetherCost: 8, affixCount: 4, meltValue: 50 },
  { dmg: 12, interval: 3, luster: 55, attCost: 6, tetherCost: 7, affixCount: 0, meltValue: 80 },
];

const BANDS = ['Bronze', 'Ashen', 'Braided', 'Hollowcast', 'Silvered', 'Graven', 'Pale', 'Thrice-cast'];
const FORMS = ['Band', 'Signet', 'Coil', 'Loop', 'Knurl', 'Seal', 'Torus', 'Circlet'];

export function xpToNext(level: number): number {
  return Math.round(10 * Math.pow(1.35, level));
}

export function grantXp(ring: Ring, amount: number): boolean {
  ring.xp += amount;
  let leveled = false;
  while (ring.xp >= xpToNext(ring.level)) {
    ring.xp -= xpToNext(ring.level);
    ring.level += 1;
    leveled = true;
  }
  return leveled;
}

/** Loot skew, never a gate: affixes tied to unlocked nodes / attuned aspects
 *  roll at 3x weight. Off-build affixes keep appearing — texture, variance,
 *  and latent value for the next respec. */
function affixWeight(a: AffixDef, fold: LatticeFold): number {
  let w = a.baseWeight;
  if (a.wantsNode && fold.unlocked.has(a.wantsNode)) w *= 3;
  if (a.aspect && fold.unlocked.has(`attune_${a.aspect}`)) w *= 3;
  return w;
}

export function rollAffixes(rarity: Rarity, fold: LatticeFold, rng: Rng): AffixRoll[] {
  const count = RARITY_BASE[rarity]!.affixCount;
  const out: AffixRoll[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < 50) {
    const pool = AFFIXES.filter((a) => !used.has(a.id));
    if (pool.length === 0) break;
    const def = rng.weighted(pool, (a) => affixWeight(a, fold));
    used.add(def.id);
    out.push({ id: def.id, mag: rng.int(def.roll[0], def.roll[1]) });
  }
  return out;
}

export function ringName(ring: Ring, rng: Rng): string {
  if (ring.uniqueId) return UNIQUE_BY_ID.get(ring.uniqueId)!.name;
  const base = `${rng.pick(BANDS)} ${rng.pick(FORMS)}`;
  const prefix = ring.affixes.map((r) => AFFIX_BY_ID.get(r.id)!).find((d) => d.kind === 'prefix');
  const suffix = ring.affixes.map((r) => AFFIX_BY_ID.get(r.id)!).find((d) => d.kind === 'suffix');
  const suffixRoll = suffix ? ring.affixes.find((r) => r.id === suffix.id)! : undefined;
  return [prefix ? prefix.name(0) : '', base, suffix && suffixRoll ? suffix.name(suffixRoll.mag) : '']
    .filter(Boolean)
    .join(' ');
}

export function generateRing(rarity: Rarity, fold: LatticeFold, rng: Rng, aspect?: Aspect): Ring {
  const ring: Ring = {
    id: uid('ring'),
    name: '',
    rarity,
    aspect: aspect ?? rng.pick(ASPECTS),
    level: 0,
    xp: 0,
    affixes: rarity === 4 ? [] : rollAffixes(rarity, fold, rng),
  };
  if (rarity === 4) {
    const u = rng.pick(UNIQUES);
    ring.uniqueId = u.id;
    ring.aspect = u.aspect;
  }
  ring.name = ringName(ring, rng);
  return ring;
}

/** Drop rarity odds deepen with wave. */
export function rollDropRarity(wave: number, rng: Rng): Rarity {
  const uniqueChance = wave >= 5 ? 0.005 : 0;
  if (rng.chance(uniqueChance)) return 4;
  const shift = Math.min(wave * 1.2, 40);
  const weights = [Math.max(70 - shift, 12), 24 + shift * 0.5, 5 + shift * 0.35, 1 + shift * 0.15];
  let total = 0;
  for (const w of weights) total += w;
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i as Rarity;
  }
  return 0;
}

/** Fold rarity base + level + affixes + unique + lattice into effective stats. */
export function effStats(ring: Ring, fold: LatticeFold): EffStats {
  const base = RARITY_BASE[ring.rarity]!;
  const s: EffStats = {
    dmg: base.dmg * (1 + 0.06 * ring.level),
    interval: base.interval,
    maxLuster: base.luster * (1 + 0.04 * ring.level),
    aspectDmg: { keen: 1, deep: 1, bright: 1 },
    echoChance: 0,
    echoRepeats: 0,
    echoPower: 0.5,
    fracChance: 0,
    fracThresh: 5,
    shatterBonus: 0,
    crescChance: 0,
    crescCap: 3,
    crescPer: 0.3,
    knellChance: 0,
    knellAmount: 1,
    attCost: base.attCost,
    tetherCost: base.tetherCost,
    xpMult: 1,
  };
  // primitives exist only once the lattice turns them on
  if (fold.unlocked.has('fracture')) s.fracChance = 0.25 + fold.fracChance;
  if (fold.unlocked.has('echo')) s.echoChance = 0.15 + fold.echoChance;
  if (fold.unlocked.has('crescendo')) s.crescChance = 0.2;
  if (fold.unlocked.has('knell')) s.knellChance = 0.25;
  for (const roll of ring.affixes) AFFIX_BY_ID.get(roll.id)?.fold(s, roll.mag);
  if (ring.uniqueId) UNIQUE_BY_ID.get(ring.uniqueId)?.fold(s);
  s.dmg *= fold.dmgMult;
  s.maxLuster *= fold.lusterMult;
  s.aspectDmg.keen *= fold.aspectDmg.keen;
  s.aspectDmg.deep *= fold.aspectDmg.deep;
  s.aspectDmg.bright *= fold.aspectDmg.bright;
  // affix knobs above primitives only matter when the primitive is live
  if (!fold.unlocked.has('fracture')) s.fracChance = 0;
  if (!fold.unlocked.has('echo')) s.echoChance = 0;
  if (!fold.unlocked.has('crescendo')) s.crescChance = 0;
  if (!fold.unlocked.has('knell')) s.knellChance = 0;
  return s;
}

export function meltValue(ring: Ring): number {
  return RARITY_BASE[ring.rarity]!.meltValue + ring.level * 2;
}
