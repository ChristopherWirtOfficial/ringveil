import { foldLattice, NODE_BY_ID } from '../data/lattice';
import { generateRing, meltValue } from './rings';
import type { LatticeFold, Rarity, Ring } from '../types';
import { Rng } from '../core/rng';

/** Permanent upgrades are the ratchet: bought with shards, never reset.
 *  The Lattice respecs freely; these do not. */
export interface Upgrades {
  attCap: number; // levels above base
  tetherCap: number;
  trainSlots: number;
}

export interface GameState {
  rng: Rng;
  shards: number;
  rings: Ring[];
  loadout: string[]; // ordered ring ids — the Calling (pull order)
  latticeOwned: string[];
  upgrades: Upgrades;
  /** auto-melt fresh drops below this rarity; leveled/kept rings are never
   *  auto-melted. The floor: do nothing and your satchel stays clean. */
  keepThreshold: Rarity;
  autoPull: boolean;
  bestWave: number;
}

export const BASE_ATT_CAP = 4;
export const BASE_TETHER = 10;
export const BASE_TRAIN_SLOTS = 2;

export function attCap(st: GameState): number {
  return BASE_ATT_CAP + st.upgrades.attCap;
}
export function tetherCap(st: GameState): number {
  return BASE_TETHER + st.upgrades.tetherCap * 2;
}
export function trainSlots(st: GameState): number {
  return BASE_TRAIN_SLOTS + st.upgrades.trainSlots;
}

export function upgradeCost(kind: keyof Upgrades, owned: number): number {
  if (kind === 'attCap') return Math.round(40 * Math.pow(1.6, owned));
  if (kind === 'tetherCap') return Math.round(30 * Math.pow(1.5, owned));
  return Math.round(60 * Math.pow(1.8, owned));
}

export function fold(st: GameState): LatticeFold {
  return foldLattice(st.latticeOwned);
}

export function buyNode(st: GameState, id: string): boolean {
  const node = NODE_BY_ID.get(id);
  if (!node || st.latticeOwned.includes(id) || st.shards < node.cost) return false;
  if (node.requires && !st.latticeOwned.includes(node.requires)) return false;
  st.shards -= node.cost;
  st.latticeOwned.push(id);
  return true;
}

/** Free respec: refund everything. A respec should feel like re-reading your
 *  whole collection, not a punishment. */
export function respec(st: GameState): void {
  for (const id of st.latticeOwned) st.shards += NODE_BY_ID.get(id)?.cost ?? 0;
  st.latticeOwned = [];
}

export function buyUpgrade(st: GameState, kind: keyof Upgrades): boolean {
  const cost = upgradeCost(kind, st.upgrades[kind]);
  if (st.shards < cost) return false;
  st.shards -= cost;
  st.upgrades[kind] += 1;
  return true;
}

export function meltRing(st: GameState, id: string): number {
  const idx = st.rings.findIndex((r) => r.id === id);
  if (idx < 0) return 0;
  const value = meltValue(st.rings[idx]!);
  st.rings.splice(idx, 1);
  st.loadout = st.loadout.filter((l) => l !== id);
  st.shards += value;
  return value;
}

export function newGame(seed?: number): GameState {
  const rng = new Rng(seed);
  const st: GameState = {
    rng,
    shards: 40,
    rings: [],
    loadout: [],
    latticeOwned: [],
    upgrades: { attCap: 0, tetherCap: 0, trainSlots: 0 },
    keepThreshold: 1,
    autoPull: true,
    bestWave: 0,
  };
  const f = fold(st);
  for (let i = 0; i < 3; i++) st.rings.push(generateRing(0, f, rng));
  st.loadout = st.rings.map((r) => r.id);
  return st;
}
