import { LATTICE } from '../data/lattice';
import { Expedition } from '../game/expedition';
import { effStats, RARITY_NAMES } from '../game/rings';
import {
  attCap,
  buyNode,
  buyUpgrade,
  fold,
  meltRing,
  newGame,
  respec,
  tetherCap,
  trainSlots,
  upgradeCost,
  type GameState,
  type Upgrades,
} from '../game/state';
import { Training } from '../game/training';
import { HushScene } from '../scenes/hush';
import { ProvingScene } from '../scenes/proving';
import type { Rarity, Ring } from '../types';
import { clear, h } from './dom';
import { ringCard, ringDetail } from './ringCard';
import { ringGlyph } from './ringGlyph';

type Tab = 'proving' | 'hush' | 'rings' | 'lattice';

/** Shell only. The two scenes are siblings that share nothing:
 *  - ProvingScene lives as long as the app.
 *  - HushScene is created with an expedition and destroyed with it. */
export class App {
  st: GameState = newGame();
  training = new Training(this.st);
  proving: ProvingScene;
  hush: HushScene | null = null;
  expedition: Expedition | null = null;
  tab: Tab = 'proving';
  selectedRing: string | null = null;
  root: HTMLElement;
  private walletEl: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.proving = new ProvingScene(this.st, this.training);
    setInterval(() => this.training.tick(), 500);
    setInterval(() => {
      if (this.expedition && !this.expedition.over) this.expedition.tick();
    }, 700);
    // slow, targeted refresh: numbers only, never DOM churn
    setInterval(() => {
      if (this.walletEl) this.walletEl.textContent = this.walletText();
    }, 1000);
    this.render();
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
      if (e.t === 'end') this.render();
    });
    this.render();
  }

  private closeExpedition(): void {
    this.hush?.destroy();
    this.hush = null;
    this.expedition = null;
    this.training.clearAway();
    this.render();
  }

  // ---------------- render ----------------

  render(): void {
    clear(this.root);
    this.root.append(this.header(), this.body(), this.tabbar());
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
    const mk = (t: Tab, label: string) =>
      h(
        'button',
        {
          class: `tab ${this.tab === t ? 'active' : ''}`,
          onclick: () => {
            this.tab = t;
            this.render();
          },
        },
        label,
      );
    return h('nav', { class: 'tabbar' }, mk('proving', 'Proving'), mk('hush', 'Hush'), mk('rings', 'Rings'), mk('lattice', 'Lattice'));
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
    return h(
      'section',
      {},
      h('h2', {}, 'The veil closes'),
      h('p', {}, `You held for ${ex.wave} waves.`),
      h('p', { class: 'mono' }, `+${ex.shardsEarned} ◆ shards`),
      ex.drops.length > 0
        ? h('div', {}, ...ex.drops.map((r) => ringCard(r, fold(this.st))))
        : h('p', { class: 'dim small' }, 'No rings kept from this crossing.'),
      h('div', { class: 'actions' }, h('button', { class: 'primary', onclick: () => this.closeExpedition() }, 'Return home')),
    );
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

  private viewRings(): HTMLElement {
    const f = fold(this.st);
    const v = h('section', {});
    v.append(h('div', { class: 'section-head' }, h('h2', {}, 'Collection'), h('div', { class: 'dim small' }, `${this.st.rings.length} rings`)));
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
    for (const ring of this.st.rings) {
      v.append(
        ringCard(ring, f, {
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
              h('button', { class: 'mini danger', onclick: () => { meltRing(this.st, ring.id); this.selectedRing = null; this.render(); } }, 'Melt'),
            ),
          ),
        );
      }
    }
    return v;
  }

  // ---------------- Lattice ----------------

  private viewLattice(): HTMLElement {
    const v = h('section', {});
    v.append(
      h(
        'div',
        { class: 'section-head' },
        h('h2', {}, 'The Lattice'),
        h('button', { class: 'mini', onclick: () => { respec(this.st); this.render(); } }, 'Respec (free)'),
      ),
      h('p', { class: 'dim small note' },
        'Nodes unlock primitives; affixes scale what is unlocked, and unlocks skew loot (3×) without gating it. Resonance is the starting cluster.'),
    );
    const clusters: Array<['resonance' | 'core', string]> = [
      ['resonance', 'Resonance — the starting cluster'],
      ['core', 'Core'],
    ];
    for (const [cl, label] of clusters) {
      v.append(h('h3', { class: 'cluster-label' }, label));
      for (const node of LATTICE.filter((n) => n.cluster === cl)) {
        const owned = this.st.latticeOwned.includes(node.id);
        const blocked = node.requires && !this.st.latticeOwned.includes(node.requires);
        const card = h(
          'div',
          { class: `node ${owned ? 'owned' : ''}` },
          h('div', { class: 'node-head' }, h('strong', {}, node.name), h('span', { class: 'mono dim' }, owned ? '●' : `◆${node.cost}`)),
          h('div', { class: 'small dim' }, node.desc),
        );
        if (!owned && !blocked) card.append(h('button', { class: 'mini', onclick: () => { buyNode(this.st, node.id); this.render(); } }, 'Learn'));
        if (blocked) card.append(h('div', { class: 'tiny dim' }, `requires ${node.requires}`));
        v.append(card);
      }
    }
    v.append(h('h3', { class: 'cluster-label' }, 'The Foundry — permanent'));
    const ups: Array<[keyof Upgrades, string, string]> = [
      ['attCap', 'Widen attunement', `⟟ window +1 (now ${attCap(this.st)})`],
      ['tetherCap', 'Deepen the pool', `◈ Tether +2 (now ${tetherCap(this.st)})`],
      ['trainSlots', 'Raise the quota', `training slots +1 (now ${trainSlots(this.st)})`],
    ];
    for (const [kind, name, desc] of ups) {
      const cost = upgradeCost(kind, this.st.upgrades[kind]);
      v.append(
        h(
          'div',
          { class: 'node' },
          h('div', { class: 'node-head' }, h('strong', {}, name), h('span', { class: 'mono dim' }, `◆${cost}`)),
          h('div', { class: 'small dim' }, desc + ' · never resets'),
          h('button', { class: 'mini', onclick: () => { buyUpgrade(this.st, kind); this.render(); } }, 'Forge'),
        ),
      );
    }
    return v;
  }
}
