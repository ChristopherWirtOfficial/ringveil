import { Rng } from '../core/rng';
import type { Rarity, Ring } from '../types';
import type { GameState, Reveals, Upgrades } from './state';

/** Persistence is split on purpose: this module is PURE serialization
 *  (runs headless in node, covered by smoke), and the UI layer owns the
 *  localStorage I/O and autosave timing. Engines never touch storage.
 *
 *  Scope: the durable meta-state only. Live engine state (training wear,
 *  swell bubbles, a mid-flight expedition) is deliberately not saved —
 *  reloading mid-fight abandons the crossing and its earnings. */

export const SAVE_VERSION = 1 as const;

export interface SaveV1 {
  v: typeof SAVE_VERSION;
  rng: number;
  shards: number;
  rings: Ring[];
  loadout: string[];
  latticeOwned: string[];
  upgrades: Upgrades;
  keepThreshold: Rarity;
  autoPull: boolean;
  bestWave: number;
  reveals: Reveals;
}

export function serialize(st: GameState): SaveV1 {
  return {
    v: SAVE_VERSION,
    rng: st.rng.state,
    shards: st.shards,
    rings: st.rings,
    loadout: st.loadout,
    latticeOwned: st.latticeOwned,
    upgrades: st.upgrades,
    keepThreshold: st.keepThreshold,
    autoPull: st.autoPull,
    bestWave: st.bestWave,
    reveals: st.reveals,
  };
}

/** Restore a GameState from parsed save data. Defensive: anything that
 *  doesn't look like a v1 save yields null and the caller starts fresh —
 *  a broken save must never brick the game. */
export function deserialize(raw: unknown): GameState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Partial<SaveV1>;
  if (s.v !== SAVE_VERSION) return null;
  if (typeof s.rng !== 'number' || typeof s.shards !== 'number') return null;
  if (!Array.isArray(s.rings) || !Array.isArray(s.loadout) || !Array.isArray(s.latticeOwned)) return null;
  if (typeof s.upgrades !== 'object' || s.upgrades === null) return null;
  const rng = new Rng(0);
  rng.setState(s.rng);
  return {
    rng,
    shards: s.shards,
    rings: s.rings,
    loadout: s.loadout,
    latticeOwned: s.latticeOwned,
    upgrades: {
      attCap: s.upgrades.attCap ?? 0,
      tetherCap: s.upgrades.tetherCap ?? 0,
      trainSlots: s.upgrades.trainSlots ?? 0,
    },
    keepThreshold: (s.keepThreshold ?? 1) as Rarity,
    autoPull: s.autoPull ?? true,
    bestWave: s.bestWave ?? 0,
    reveals: {
      lattice: s.reveals?.lattice ?? true,
      hush: s.reveals?.hush ?? true,
      rings: s.reveals?.rings ?? true,
    },
  };
}

export function parseSave(json: string): GameState | null {
  try {
    return deserialize(JSON.parse(json));
  } catch {
    return null;
  }
}
