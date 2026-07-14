import { Expedition } from '../game/expedition';
import { parseSave, serialize } from '../game/persist';
import { effStats, meltValue, RARITY_COLORS, RARITY_NAMES } from '../game/rings';
import { attCap, fold, meltRing, newGame, tetherCap, type GameState, type Reveals } from '../game/state';
import { Training } from '../game/training';
import { HushScene } from '../scenes/hush';
import { ProvingScene } from '../scenes/proving';
import type { Rarity, Ring } from '../types';
import { clear, h } from './dom';
import { latticeView } from './latticeView';
import { ringCard, ringDetail, type RingStatus } from './ringCard';
import { ringGlyph } from './ringGlyph';

type Tab = 'proving' | 'hush' | 'rings' | 'lattice';

/** Shell only. The two scenes are siblings that share nothing:
 *  - ProvingScene lives as long as the app.
 *  - HushScene is created with an expedition and destroyed with it. */
const SAVE_KEY = 'ringveil_save';

export class App {
  st: GameState;
  training: Training;
  proving: ProvingScene;
  hush: HushScene | null = null;
  expedition: Expedition | null = null;
  tab: Tab = 'proving';
  selectedRing: string | null = null;
  selectedNode: string | null = null;
  root: HTMLElement;
  private walletEl: HTMLElement | null = null;
  /** live-refresh hooks for the Rings view (XP bars, status chips) —
   *  targeted pokes, never DOM churn; rebuilt on every render */
  private ringsUpdaters: Array<() => void> = [];
  /** when each tab was revealed, for the brief arrival pulse */
  private revealTimes = new Map<Tab, number>();
  private resetArmed = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.st = this.loadSave() ?? newGame();
    this.training = new Training(this.st);
    this.proving = new ProvingScene(this.st, this.training);
    // the first finished rotation is the moment the Lattice makes sense
    this.training.events.on((e) => {
      if (e.t === 'rotate' && !this.st.reveals.lattice) this.reveal('lattice');
    });
    setInterval(() => this.training.tick(), 500);
    setInterval(() => {
      if (this.expedition && !this.expedition.over) this.expedition.tick();
    }, 700);
    // slow, targeted refresh: numbers only, never DOM churn
    setInterval(() => {
      if (this.walletEl) this.walletEl.textContent = this.walletText();
      this.checkRevealFallbacks();
    }, 1000);
    setInterval(() => {
      if (this.tab === 'rings') for (const u of this.ringsUpdaters) u();
    }, 1500);
    // autosave: steady cadence plus every backgrounding/close
    setInterval(() => this.save(), 5000);
    addEventListener('pagehide', () => this.save());
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save();
    });
    this.render();
  }

  // ---------------- persistence ----------------

  private loadSave(): GameState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? parseSave(raw) : null;
    } catch {
      return null;
    }
  }

  /** set once the player wipes — the pagehide autosave must not
   *  resurrect the save on the way out */
  private wiped = false;

  private save(): void {
    if (this.wiped) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(this.st)));
    } catch {
      // storage unavailable (private mode, quota) — play on, in memory
    }
  }

  private wipeSave(): void {
    this.wiped = true;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // nothing to lose
    }
    location.reload();
  }

  // ---------------- progressive disclosure ----------------

  private reveal(k: keyof Reveals): void {
    if (this.st.reveals[k]) return;
    this.st.reveals[k] = true;
    this.revealTimes.set(k, Date.now());
    this.save();
    // don't stomp the veil-closing beat with a re-render
    const closing = this.expedition?.over && this.hush;
    if (!closing) this.render();
  }

  private checkRevealFallbacks(): void {
    // organic triggers: first rotation → Lattice; first node → Hush; first
    // crossing → Rings. These thresholds are safety valves so no path stalls.
    const r = this.st.reveals;
    if (!r.lattice && this.st.shards >= 60) this.reveal('lattice');
    if (!r.hush && (this.st.latticeOwned.length > 0 || this.st.shards >= 80)) this.reveal('hush');
    if (!r.rings && this.st.bestWave > 0) this.reveal('rings');
  }

  // ---------------- actions ----------------

  private beginExpedition(): void {
    const rings = this.st.loadout
      .map((id) => this.st.rings.find((r) => r.id === id))
      .filter((r): r is Ring => Boolean(r));
    if (rings.length === 0) return;
    this.training.setAway(this.st.loadout);
    this.expedition = new Expedition(this.st, rings);
    this.hush = new HushScene(this.st, this.expedition);
    this.expedition.events.on((e) => {
      if (e.t === 'end') {
        // the first crossing earns the Rings tab — flag it quietly now so
        // it's waiting behind the veil-closing beat, then show the summary
        if (!this.st.reveals.rings) {
          this.st.reveals.rings = true;
          this.revealTimes.set('rings', Date.now());
        }
        this.save();
        setTimeout(() => this.render(), 2200);
      }
    });
    this.render();
  }

  private closeExpedition(): void {
    this.hush?.destroy();
    this.hush = null;
    this.expedition = null;
    this.training.clearAway();
    this.save();
    this.render();
  }

  // ---------------- render ----------------

  render(): void {
    const prevScroll = this.root.querySelector('main')?.scrollTop ?? 0;
    clear(this.root);
    const body = this.body();
    this.root.append(this.header(), body, this.tabbar());
    body.scrollTop = prevScroll;
  }

  private walletText(): string {
    return `◆ ${Math.floor(this.st.shards)}`;
  }

  private header(): HTMLElement {
    this.walletEl = h('span', { class: 'mono' }, this.walletText());
    return h(
      'header',
      {},
      h('div', { class: 'brand' }, h('span', { class: 'brand-ring' }, '◯'), 'RINGVEIL'),
      h('div', { class: 'wallet' }, this.walletEl, h('span', { class: 'dim mono small' }, `  ⟟${attCap(this.st)} ◈${tetherCap(this.st)}`)),
    );
  }

  private tabbar(): HTMLElement {
    const mk = (t: Tab, label: string) => {
      const fresh = (Date.now() - (this.revealTimes.get(t) ?? -Infinity)) < 6000;
      return h(
        'button',
        {
          class: `tab ${this.tab === t ? 'active' : ''} ${fresh ? 'tab-new' : ''}`,
          onclick: () => {
            this.tab = t;
            this.render();
          },
        },
        label,
      );
    };
    const tabs: HTMLElement[] = [mk('proving', 'Proving')];
    if (this.st.reveals.hush) tabs.push(mk('hush', 'Hush'));
    if (this.st.reveals.rings) tabs.push(mk('rings', 'Rings'));
    if (this.st.reveals.lattice) tabs.push(mk('lattice', 'Lattice'));
    return h('nav', { class: 'tabbar' }, ...tabs);
  }

  private body(): HTMLElement {
    const main = h('main', {});
    if (this.tab === 'proving') main.append(this.viewProving());
    if (this.tab === 'hush') main.append(this.viewHush());
    if (this.tab === 'rings') main.append(this.viewRings());
    if (this.tab === 'lattice') main.append(this.viewLattice());
    return main;
  }

  // ---------------- Proving (training canvas) ----------------

  private viewProving(): HTMLElement {
    const v = h('section', {});
    v.append(this.proving.el);
    v.append(
      h('p', { class: 'dim small note' },
        'Rings prove themselves on their own — no cost but the queue. A ring spars until it drops, cycles to the back, and the next steps in.'),
    );
    return v;
  }

  // ---------------- Hush (battle canvas / calling / summary) ----------------

  private viewHush(): HTMLElement {
    if (this.expedition && !this.expedition.over && this.hush) return this.viewBattle();
    if (this.expedition && this.expedition.over) return this.viewSummary(this.expedition);
    return this.viewCalling();
  }

  private viewBattle(): HTMLElement {
    const ex = this.expedition!;
    const v = h('section', {});
    v.append(this.hush!.el);
    const actions = h('div', { class: 'actions' });
    if (!this.st.autoPull) {
      actions.append(h('button', { class: 'mini', onclick: () => { ex.summonNext(); } }, 'Summon next'));
    }
    actions.append(h('button', { onclick: () => { ex.retreat(); this.render(); } }, 'Retreat'));
    v.append(actions);
    return v;
  }

  private viewCalling(): HTMLElement {
    const f = fold(this.st);
    const v = h('section', {});
    v.append(
      h('div', { class: 'section-head' }, h('h2', {}, 'The Calling'), h('div', { class: 'dim small' }, `best: wave ${this.st.bestWave}`)),
      h('p', { class: 'dim small note' },
        'Order is pull order. Every summon costs Tether — the openers too — and the pool barely comes back.'),
    );
    const list = h('div', { class: 'calling-list' });
    this.st.loadout.forEach((id, i) => {
      const ring = this.st.rings.find((r) => r.id === id);
      if (!ring) return;
      const s = effStats(ring, f);
      list.append(
        h(
          'div',
          { class: 'calling-row' },
          h('span', { class: 'mono dim' }, String(i + 1)),
          ringGlyph(ring, 1, 30),
          h('span', { class: 'calling-name' }, ring.name),
          h('span', { class: 'mono dim small' }, `⟟${s.attCost} ◈${s.tetherCost}`),
          h('button', { class: 'mini', onclick: () => this.moveLoadout(i, -1) }, '↑'),
          h('button', { class: 'mini', onclick: () => this.moveLoadout(i, 1) }, '↓'),
          h('button', { class: 'mini', onclick: () => this.toggleLoadout(id) }, '✕'),
        ),
      );
    });
    v.append(list);
    // opener preview: mirror the engine's greedy fill (skip what doesn't fit)
    if (this.st.loadout.length > 0) {
      const cap = attCap(this.st);
      const pool = tetherCap(this.st);
      let att = 0;
      let teth = 0;
      let openers = 0;
      for (const id of this.st.loadout) {
        const ring = this.st.rings.find((r) => r.id === id);
        if (!ring) continue;
        const s = effStats(ring, f);
        if (teth + s.tetherCost <= pool && att + s.attCost <= cap) {
          teth += s.tetherCost;
          att += s.attCost;
          openers += 1;
        }
      }
      v.append(
        h(
          'p',
          { class: 'mono dim small opener-preview' },
          `openers: ${openers} rings · ⟟${att}/${cap} window · ◈${teth} spent, ◈${pool - teth} left for re-summons`,
        ),
      );
    }
    const bench = this.st.rings.filter((r) => !this.st.loadout.includes(r.id));
    if (bench.length > 0) {
      const benchRow = h('div', { class: 'bench-row' });
      for (const r of bench.slice(0, 12)) {
        benchRow.append(h('button', { class: 'chip', onclick: () => this.toggleLoadout(r.id) }, `+ ${r.name.split(' ').slice(0, 2).join(' ')}`));
      }
      v.append(h('div', { class: 'dim small', style: 'margin-top:10px' }, 'Add to the Calling:'), benchRow);
    }
    const auto = h('input', {
      type: 'checkbox',
      onchange: (e: Event) => {
        this.st.autoPull = (e.target as HTMLInputElement).checked;
      },
    }) as HTMLInputElement;
    auto.checked = this.st.autoPull;
    v.append(
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'primary', onclick: () => this.beginExpedition() }, 'Cross the veil'),
        h('label', { class: 'small dim toggle' }, auto, ' auto-summon'),
      ),
    );
    return v;
  }

  private viewSummary(ex: Expedition): HTMLElement {
    this.hush?.destroy();
    this.hush = null;
    const f = fold(this.st);
    const v = h('section', {});
    v.append(
      h(
        'div',
        { class: 'section-head' },
        h('h2', {}, 'The veil closes'),
        ex.newBest ? h('span', { class: 'best-callout' }, '✦ a new best') : null,
      ),
      h('p', {}, `You held for ${ex.wave} waves.`),
      h(
        'p',
        { class: 'mono dim small' },
        `+${ex.shardsEarned}◆ shards · ${ex.kills} demons unmade` +
          (ex.meltedCount > 0 ? ` · ${ex.meltedCount} drop${ex.meltedCount > 1 ? 's' : ''} melted (+${ex.meltedShards}◆)` : ''),
      ),
    );
    if (ex.drops.length > 0) {
      v.append(h('h3', { class: 'cluster-label' }, 'Kept from the crossing'));
      for (const r of ex.drops) v.append(ringCard(r, f));
    } else {
      v.append(h('p', { class: 'dim small' }, 'No rings kept from this crossing.'));
    }
    v.append(h('div', { class: 'actions' }, h('button', { class: 'primary', onclick: () => this.closeExpedition() }, 'Return home')));
    return v;
  }

  private moveLoadout(i: number, dir: number): void {
    const j = i + dir;
    if (j < 0 || j >= this.st.loadout.length) return;
    const a = this.st.loadout[i]!;
    this.st.loadout[i] = this.st.loadout[j]!;
    this.st.loadout[j] = a;
    this.render();
  }

  private toggleLoadout(id: string): void {
    if (this.st.loadout.includes(id)) this.st.loadout = this.st.loadout.filter((x) => x !== id);
    else this.st.loadout.push(id);
    this.render();
  }

  // ---------------- Rings ----------------

  private ringStatus(id: string): RingStatus {
    if (this.training.away.has(id)) return 'away';
    if (this.training.active.some((a) => a.ring.id === id)) return 'sparring';
    return 'waiting';
  }

  private viewRings(): HTMLElement {
    this.ringsUpdaters = [];
    const f = fold(this.st);
    const v = h('section', {});

    // header: count + rarity spread at a glance
    const counts = new Map<Rarity, number>();
    for (const r of this.st.rings) counts.set(r.rarity, (counts.get(r.rarity) ?? 0) + 1);
    const dots = h('span', { class: 'rarity-dots' });
    ([4, 3, 2, 1, 0] as Rarity[]).forEach((r) => {
      const n = counts.get(r);
      if (!n) return;
      dots.append(h('span', { class: 'rd', title: RARITY_NAMES[r]! }, h('i', { style: `background:${RARITY_COLORS[r]}` }), String(n)));
    });
    v.append(h('div', { class: 'section-head' }, h('h2', {}, 'Collection'), dots));
    v.append(
      h('p', { class: 'dim small note' },
        'New rings fall in the Hush — cross the veil to find them. Bronze-edged marks are the rare knobs that warp a build.'),
    );

    const thresh = h('select', {
      onchange: (e: Event) => {
        this.st.keepThreshold = Number((e.target as HTMLSelectElement).value) as Rarity;
      },
    }) as HTMLSelectElement;
    ([0, 1, 2, 3] as Rarity[]).forEach((r) => {
      const opt = h('option', { value: r }, `auto-melt drops below ${RARITY_NAMES[r]}`) as HTMLOptionElement;
      if (r === this.st.keepThreshold) opt.selected = true;
      thresh.append(opt);
    });
    v.append(h('div', { class: 'small dim threshold' }, thresh));

    const sorted = [...this.st.rings].sort(
      (a, b) => b.rarity - a.rarity || b.level - a.level || a.name.localeCompare(b.name),
    );
    if (sorted.length === 0) v.append(h('p', { class: 'empty' }, 'No rings. The Hush provides — cross the veil.'));
    for (const ring of sorted) {
      v.append(
        ringCard(ring, f, {
          status: this.ringStatus(ring.id),
          inCalling: this.st.loadout.includes(ring.id),
          live: {
            status: () => this.ringStatus(ring.id),
            register: (fn) => this.ringsUpdaters.push(fn),
          },
          onClick: () => {
            this.selectedRing = this.selectedRing === ring.id ? null : ring.id;
            this.render();
          },
        }),
      );
      if (this.selectedRing === ring.id) {
        const inLoadout = this.st.loadout.includes(ring.id);
        v.append(
          h(
            'div',
            { class: 'ring-expanded' },
            ringDetail(ring, f),
            h(
              'div',
              { class: 'actions' },
              h('button', { class: 'mini', onclick: () => this.toggleLoadout(ring.id) }, inLoadout ? 'Remove from Calling' : 'Add to Calling'),
              h('button', { class: 'mini danger', onclick: () => { meltRing(this.st, ring.id); this.selectedRing = null; this.render(); } }, `Melt +${meltValue(ring)}◆`),
            ),
          ),
        );
      }
    }
    return v;
  }

  // ---------------- Lattice ----------------

  private viewLattice(): HTMLElement {
    return latticeView(this.st, {
      selected: this.selectedNode,
      onSelect: (id) => {
        this.selectedNode = id;
        this.render();
      },
      onChanged: () => {
        this.save();
        this.checkRevealFallbacks();
        this.render();
      },
      resetArmed: this.resetArmed,
      onReset: () => {
        if (!this.resetArmed) {
          this.resetArmed = true;
          this.render();
          setTimeout(() => {
            this.resetArmed = false;
            this.render();
          }, 3500);
        } else {
          this.wipeSave();
        }
      },
    });
  }
}
