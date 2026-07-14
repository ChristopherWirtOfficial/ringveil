import type { Aspect } from '../types';

/** The Hush is ZONE ONE of the demon realm — the region that happens to
 *  oppose the resonance cluster. Future zones are new arrays, not rewrites. */
export interface DemonDef {
  id: string;
  name: string;
  hp: number;
  dmg: number; // luster damage per hit
  interval: number; // ticks between attacks
  weakness?: Aspect; // +40% damage taken from this aspect
  trait?: 'damper' | 'stillness';
  traitDesc?: string;
}

export const HUSH: DemonDef[] = [
  {
    id: 'murmur',
    name: 'Murmur',
    hp: 8,
    dmg: 1,
    interval: 3,
    weakness: 'bright',
  },
  {
    id: 'damper',
    name: 'Damper',
    hp: 14,
    dmg: 1,
    interval: 4,
    weakness: 'keen',
    trait: 'damper',
    traitDesc: 'while alive, worn rings deal -15% damage',
  },
  {
    id: 'hollow',
    name: 'Hollow',
    hp: 30,
    dmg: 2,
    interval: 4,
    weakness: 'deep',
  },
  {
    id: 'stillness',
    name: 'Stillness',
    hp: 60,
    dmg: 2,
    interval: 4,
    trait: 'stillness',
    traitDesc: 'its blows can swallow 1 Tether',
  },
];

const BY_ID = new Map(HUSH.map((d) => [d.id, d]));

/** Wave composition: cycles simple mixes, boss every 5th wave. */
export function waveComposition(wave: number): DemonDef[] {
  const out: DemonDef[] = [];
  const add = (id: string, n: number) => {
    for (let i = 0; i < n; i++) out.push(BY_ID.get(id)!);
  };
  if (wave % 5 === 0) {
    add('stillness', 1);
    add('murmur', Math.min(2, 1 + Math.floor(wave / 10)));
    return out;
  }
  const step = wave % 5;
  if (step === 1) add('murmur', 2 + Math.floor(wave / 6));
  else if (step === 2) {
    add('murmur', 2);
    add('damper', 1);
  } else if (step === 3) {
    add('hollow', 1);
    add('murmur', 1 + Math.floor(wave / 8));
  } else {
    add('damper', 1);
    add('hollow', 1);
  }
  return out.slice(0, 4);
}

export function waveHpScale(wave: number): number {
  return Math.pow(1.11, wave - 1);
}
export function waveDmgScale(wave: number): number {
  return Math.pow(1.07, wave - 1);
}
