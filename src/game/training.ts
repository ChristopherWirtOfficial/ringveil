import { Emitter } from '../core/emitter';
import { effStats, grantXp } from './rings';
import { fold, trainSlots, type GameState } from './state';
import type { Ring, TrainingEvent } from '../types';

/** Training: continuous, uninterrupted, no Tether, no consequences beyond
 *  opportunity cost. Flat per-ring slots. Rotation is EMERGENT from wear —
 *  a ring spars until it drops, then cycles to the back and the next steps
 *  in. No wall-clock timers anywhere.
 *
 *  Swell (quota proc): rolls on rotation death. On success the quota rises
 *  by 1 for the next entrant; the bubble pops when that bonus ring rotates
 *  out. Churny rosters proc it more — that's the emergent lever, tunable. */

interface TrainingSlot {
  ring: Ring;
  wear: number; // 0..1 of a rotation
  bonus: boolean; // occupying a swell bubble
}

export class Training {
  readonly events = new Emitter<TrainingEvent>();
  active: TrainingSlot[] = [];
  bonusQuota = 0;
  /** ids currently away on expedition */
  away = new Set<string>();

  constructor(private st: GameState) {}

  private eligible(): Ring[] {
    const activeIds = new Set(this.active.map((a) => a.ring.id));
    return this.st.rings.filter((r) => !this.away.has(r.id) && !activeIds.has(r.id));
  }

  /** Read-only view for renderers: rings waiting at home, in rotation order.
   *  The front of this list is the next to step in. */
  get queued(): Ring[] {
    return this.eligible();
  }

  private capacity(): number {
    return trainSlots(this.st) + this.bonusQuota;
  }

  private admit(asBonus: boolean): void {
    const next = this.eligible()[0];
    if (!next) return;
    // least-recently-trained rotation: move to back of the roster order
    this.st.rings = this.st.rings.filter((r) => r.id !== next.id);
    this.st.rings.push(next);
    this.active.push({ ring: next, wear: 0, bonus: asBonus });
  }

  private fill(): void {
    while (this.active.length < this.capacity() && this.eligible().length > 0) {
      this.admit(this.active.length >= trainSlots(this.st));
    }
  }

  tick(): void {
    this.fill();
    const f = fold(this.st);
    for (const slot of [...this.active]) {
      const s = effStats(slot.ring, f);
      // wear rate: heavier rings last longer per rotation; a rotation is
      // roughly 25–60 ticks depending on luster
      slot.wear += 2 / s.maxLuster;
      const leveled = grantXp(slot.ring, 3 * s.xpMult);
      if (leveled) this.events.emit({ t: 'levelUp', ring: slot.ring });
      if (slot.wear >= 1) this.rotate(slot, f.swellChance);
    }
  }

  private rotate(slot: TrainingSlot, swellChance: number): void {
    this.active = this.active.filter((a) => a !== slot);
    const shards = 1 + slot.ring.rarity;
    this.st.shards += shards;
    this.events.emit({ t: 'rotate', ring: slot.ring, shards });
    if (slot.bonus && this.bonusQuota > 0) {
      // bubble pops when its occupant rotates out — unless it re-procs
      this.bonusQuota -= 1;
    }
    if (swellChance > 0 && this.st.rng.chance(swellChance)) {
      this.bonusQuota += 1;
      this.events.emit({ t: 'swell', bonusQuota: this.bonusQuota });
    }
    this.fill();
  }

  setAway(ids: string[]): void {
    this.away = new Set(ids);
    this.active = this.active.filter((a) => !this.away.has(a.ring.id));
  }

  clearAway(): void {
    this.away.clear();
  }
}
