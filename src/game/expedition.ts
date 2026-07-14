import { waveComposition, waveDmgScale, waveHpScale, type DemonDef } from '../data/demons';
import { Emitter } from '../core/emitter';
import { effStats, generateRing, meltValue, rollDropRarity } from './rings';
import { attCap, tetherCap, type GameState } from './state';
import { fold } from './state';
import type { EffStats, ExpeditionEvent, Ring } from '../types';
import { uid } from '../core/rng';

/** The full cycle: queue → worn → discard.
 *  - Openers are paid from the Tether pool on spawn. No free rides.
 *  - The attunement window caps concurrently worn power.
 *  - Rings that lose all luster go to discard: benched, never destroyed.
 *  - Tether barely regenerates (knell only) — the pool IS your depth. */

export interface Worn {
  ring: Ring;
  s: EffStats;
  luster: number;
  cd: number;
  cresc: number;
}

export interface DemonInst {
  id: string;
  def: DemonDef;
  hp: number;
  maxHp: number;
  cd: number;
  cracks: number;
  dmg: number;
}

export class Expedition {
  readonly events = new Emitter<ExpeditionEvent>();
  worn: Worn[] = [];
  queue: Ring[] = [];
  discard: Ring[] = [];
  demons: DemonInst[] = [];
  tether: number;
  wave = 0;
  shardsEarned = 0;
  drops: Ring[] = [];
  over = false;
  // recounting for the summary — the run should be able to tell its story
  kills = 0;
  meltedCount = 0;
  meltedShards = 0;
  newBest = false;

  constructor(private st: GameState, loadout: Ring[]) {
    this.queue = [...loadout];
    this.tether = tetherCap(st);
    this.spawnOpeners();
    this.nextWave();
  }

  private wornAtt(): number {
    return this.worn.reduce((a, w) => a + w.s.attCost, 0);
  }

  private canSummon(ring: Ring): { ok: boolean; s: EffStats } {
    const s = effStats(ring, fold(this.st));
    const ok = this.tether >= s.tetherCost && this.wornAtt() + s.attCost <= attCap(this.st);
    return { ok, s };
  }

  summonNext(): boolean {
    for (let i = 0; i < this.queue.length; i++) {
      const ring = this.queue[i]!;
      const { ok, s } = this.canSummon(ring);
      if (!ok) continue;
      this.queue.splice(i, 1);
      this.tether -= s.tetherCost;
      this.worn.push({ ring, s, luster: s.maxLuster, cd: s.interval, cresc: 0 });
      this.events.emit({ t: 'summon', ring, tether: this.tether, cost: s.tetherCost });
      return true;
    }
    return false;
  }

  private spawnOpeners(): void {
    // greedy fill in Calling order, paying Tether — spawn uses regular quota only
    let progressed = true;
    while (progressed) progressed = this.summonNext();
  }

  private nextWave(): void {
    this.wave += 1;
    const hpS = waveHpScale(this.wave);
    const dmgS = waveDmgScale(this.wave);
    this.demons = waveComposition(this.wave).map((def) => ({
      id: uid('d'),
      def,
      hp: Math.round(def.hp * hpS),
      maxHp: Math.round(def.hp * hpS),
      cd: def.interval,
      cracks: 0,
      dmg: Math.max(1, Math.round(def.dmg * dmgS)),
    }));
    this.events.emit({ t: 'wave', n: this.wave });
  }

  private damperAlive(): boolean {
    return this.demons.some((d) => d.def.trait === 'damper' && d.hp > 0);
  }

  private hitDemon(w: Worn, d: DemonInst, raw: number, echo: boolean, cresc: number): void {
    let dmg = raw * w.s.aspectDmg[w.ring.aspect];
    if (d.def.weakness === w.ring.aspect) dmg *= 1.4;
    if (this.damperAlive()) dmg *= 0.85;
    dmg = Math.max(1, Math.round(dmg));
    d.hp -= dmg;
    this.events.emit({ t: 'attack', ring: w.ring, demonId: d.id, demon: d.def.name, dmg, echo, cresc });
    // fracture: threshold detonation — not a DoT. Raising the threshold
    // makes shatters rarer but superlinearly bigger.
    if (w.s.fracChance > 0 && this.st.rng.chance(w.s.fracChance)) {
      d.cracks += 1;
      if (d.cracks >= w.s.fracThresh) {
        const shatter = Math.round((3 + w.s.fracThresh * w.s.fracThresh * 0.5) * (1 + w.s.shatterBonus));
        d.hp -= shatter;
        d.cracks = 0;
        this.events.emit({ t: 'shatter', demonId: d.id, demon: d.def.name, dmg: shatter });
      }
    }
    if (d.hp <= 0) this.onKill(w, d);
  }

  private onKill(w: Worn, d: DemonInst): void {
    this.demons = this.demons.filter((x) => x !== d);
    this.kills += 1;
    this.events.emit({ t: 'kill', demonId: d.id, demon: d.def.name, ring: w.ring });
    if (w.s.knellChance > 0 && this.st.rng.chance(w.s.knellChance)) {
      const amt = w.s.knellAmount;
      this.tether = Math.min(tetherCap(this.st), this.tether + amt);
      this.events.emit({ t: 'knell', ring: w.ring, amount: amt });
    }
  }

  private ringAttack(w: Worn): void {
    if (this.demons.length === 0) return;
    const target = this.demons[0]!;
    let bonus = 1;
    if (w.cresc > 0) {
      bonus += w.cresc * w.s.crescPer;
    }
    const consumed = w.cresc;
    w.cresc = 0;
    this.hitDemon(w, target, w.s.dmg * bonus, false, consumed);
    // bank crescendo after the strike
    if (w.s.crescChance > 0 && this.st.rng.chance(w.s.crescChance)) {
      w.cresc = Math.min(w.s.crescCap, w.cresc + 1);
    }
    // echoes: repeat at reduced power, +N repeats from integer affixes
    if (w.s.echoChance > 0 && this.st.rng.chance(w.s.echoChance)) {
      let power = w.s.echoPower;
      for (let i = 0; i <= w.s.echoRepeats; i++) {
        const t2 = this.demons[0];
        if (!t2) break;
        this.hitDemon(w, t2, w.s.dmg * power, true, 0);
        power *= 0.5;
      }
    }
  }

  private demonAttack(d: DemonInst): void {
    if (this.worn.length === 0) return;
    const idx = Math.floor(this.st.rng.next() * this.worn.length);
    const w = this.worn[idx]!;
    w.luster -= d.dmg;
    this.events.emit({ t: 'demonHit', demonId: d.id, demon: d.def.name, ring: w.ring, dmg: d.dmg });
    if (d.def.trait === 'stillness' && this.st.rng.chance(0.3) && this.tether > 0) {
      this.tether -= 1;
      this.events.emit({ t: 'steal', demon: d.def.name, amount: 1 });
    }
    if (w.luster <= 0) {
      this.worn.splice(idx, 1);
      this.discard.push(w.ring);
      this.events.emit({ t: 'ringDown', ring: w.ring });
    }
  }

  private rewards(): void {
    const shards = 3 + this.wave;
    this.shardsEarned += shards;
    if (this.st.rng.chance(0.35 + this.wave * 0.01)) {
      const rarity = rollDropRarity(this.wave, this.st.rng);
      const ring = generateRing(rarity, fold(this.st), this.st.rng);
      // salvage policy applies at drop time only; owned rings are never auto-melted
      if (ring.rarity < this.st.keepThreshold && ring.rarity !== 4) {
        const v = meltValue(ring);
        this.shardsEarned += v;
        this.meltedCount += 1;
        this.meltedShards += v;
        this.events.emit({ t: 'drop', ring, melted: true, shards: v });
      } else {
        this.drops.push(ring);
        this.events.emit({ t: 'drop', ring, melted: false, shards: 0 });
      }
    }
  }

  private finish(): void {
    this.over = true;
    this.st.shards += this.shardsEarned;
    this.st.rings.push(...this.drops);
    if (this.wave > this.st.bestWave) {
      this.st.bestWave = this.wave;
      this.newBest = true;
    }
    this.events.emit({ t: 'end', won: false, waves: this.wave, shards: this.shardsEarned });
  }

  retreat(): void {
    if (!this.over) this.finish();
  }

  tick(): void {
    if (this.over) return;
    for (const w of [...this.worn]) {
      w.cd -= 1;
      if (w.cd <= 0) {
        this.ringAttack(w);
        w.cd = w.s.interval;
      }
    }
    if (this.demons.length === 0) {
      this.rewards();
      this.nextWave();
      return;
    }
    for (const d of [...this.demons]) {
      if (d.hp <= 0) continue;
      d.cd -= 1;
      if (d.cd <= 0) {
        this.demonAttack(d);
        d.cd = d.def.interval;
      }
    }
    // refill open window from the queue (the low floor: on by default)
    if (this.st.autoPull) {
      let pulled = true;
      while (pulled) pulled = this.summonNext();
    }
    // loss: nothing worn and nothing summonable
    if (this.worn.length === 0) {
      const anyPossible = this.queue.some((r) => this.canSummon(r).ok);
      if (!anyPossible) this.finish();
    }
  }
}
