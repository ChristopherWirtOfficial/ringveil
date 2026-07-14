import type { Aspect, EffStats } from '../types';

/** Uniques are handcrafted: fixed identity, build-warping by design.
 *  Balance is non-competitive — broken is a feature at the tail. */
export interface UniqueDef {
  id: string;
  name: string;
  aspect: Aspect;
  lore: string;
  desc: string;
  fold: (s: EffStats) => void;
}

export const UNIQUES: UniqueDef[] = [
  {
    id: 'mourningtide',
    name: 'Mourningtide',
    aspect: 'deep',
    lore: 'It tolls once for every death, and the veil thins to listen.',
    desc: 'Knell always triggers · +2 Tether per knell · +20% damage',
    fold: (s) => {
      s.knellChance = 1;
      s.knellAmount += 2;
      s.dmg *= 1.2;
    },
  },
  {
    id: 'the_stammer',
    name: 'The Stammer',
    aspect: 'bright',
    lore: 'It never says a thing only once.',
    desc: '+2 echo repeats · echoes at 65% power · attacks 1 tick sooner',
    fold: (s) => {
      s.echoRepeats += 2;
      s.echoPower = Math.max(s.echoPower, 0.65);
      s.interval = Math.max(2, s.interval - 1);
    },
  },
];

export const UNIQUE_BY_ID = new Map(UNIQUES.map((u) => [u.id, u]));
