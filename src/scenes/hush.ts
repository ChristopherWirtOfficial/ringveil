import { drawDemon, drawRing, drawVeil, hpBar, hushBackground, MONO, PAL, SERIF } from '../canvas/draw';
import { Fx } from '../canvas/fx';
import { approach, CanvasLoop } from '../canvas/loop';
import type { Expedition } from '../game/expedition';
import { attCap, tetherCap, type GameState } from '../game/state';
import type { ExpeditionEvent } from '../types';

interface Pos {
  x: number;
  y: number;
  lunge: number;
}

/** The Hush: born with an expedition, dies with it. Owns its own canvas,
 *  loop, and effects — a sibling of the Proving, never the same surface. */
export class HushScene {
  readonly loop: CanvasLoop;
  private fx = new Fx();
  private worn = new Map<string, Pos>();
  private demons = new Map<string, Pos>();
  private waveFlash = 0;
  private waveN = 1;
  private unsub: () => void;

  constructor(private st: GameState, private ex: Expedition) {
    this.loop = new CanvasLoop('scene-canvas hush', (ctx, dt, w, h, t) => this.draw(ctx, dt, w, h, t));
    this.unsub = ex.events.on((e) => this.onEvent(e));
    this.loop.start();
  }

  get el(): HTMLCanvasElement {
    return this.loop.canvas;
  }

  destroy(): void {
    this.unsub();
    this.loop.stop();
  }

  private onEvent(e: ExpeditionEvent): void {
    const w = this.el.clientWidth || 340;
    const h = this.el.clientHeight || 300;
    switch (e.t) {
      case 'summon': {
        // arrive through the veil
        this.worn.set(e.ring.id, { x: w * 0.06, y: h * 0.45, lunge: 0 });
        this.fx.burst(w * 0.08, h * 0.45, PAL.verdigris, 14, 60);
        break;
      }
      case 'attack': {
        const a = this.worn.get(e.ring.id);
        const d = this.demons.get(e.demonId);
        if (a) a.lunge = 1;
        if (d) {
          this.fx.burst(d.x, d.y, e.echo ? PAL.verdigris : PAL.ink, e.echo ? 5 : 8, 80, 2);
          this.fx.float(String(e.dmg), d.x + (Math.random() * 16 - 8), d.y - 16, e.echo ? PAL.verdigris : PAL.ink, e.echo ? 11 : 13);
          if (e.cresc > 0) this.fx.float(`crescendo ×${e.cresc}`, d.x, d.y - 34, PAL.bronze, 12, true);
        }
        break;
      }
      case 'shatter': {
        const d = this.demons.get(e.demonId);
        if (d) {
          this.fx.burst(d.x, d.y, PAL.ink, 26, 150, 2.6);
          this.fx.float(`${e.dmg}`, d.x, d.y - 26, PAL.bronze, 19, true);
          this.fx.float('shatter', d.x, d.y - 44, PAL.dim, 11, true);
        }
        break;
      }
      case 'kill': {
        const d = this.demons.get(e.demonId);
        if (d) this.fx.burst(d.x, d.y, PAL.demon, 18, 110);
        this.demons.delete(e.demonId);
        break;
      }
      case 'knell': {
        this.fx.float(`+${e.amount}◈`, this.el.clientWidth * 0.86, 26, PAL.verdigris, 13);
        break;
      }
      case 'ringDown': {
        const a = this.worn.get(e.ring.id);
        if (a) {
          this.fx.burst(a.x, a.y, 'rgba(160,160,160,0.8)', 10, 60);
          this.fx.float(`${e.ring.name.split(' ').slice(0, 2).join(' ')} goes dull`, a.x + 20, a.y - 14, PAL.dim, 11, true);
        }
        this.worn.delete(e.ring.id);
        break;
      }
      case 'demonHit': {
        const a = this.worn.get(e.ring.id);
        if (a) this.fx.burst(a.x, a.y, PAL.danger, 4, 45, 1.6);
        break;
      }
      case 'steal': {
        this.fx.float('−1◈ swallowed', w * 0.86, 26, PAL.danger, 12);
        break;
      }
      case 'wave': {
        this.waveN = e.n;
        this.waveFlash = 1.6;
        break;
      }
      case 'drop': {
        if (!e.melted) this.fx.float(`drop: ${e.ring.name}`, w / 2, h * 0.2, PAL.bronze, 13, true);
        else this.fx.float(`melted +${e.shards}◆`, w / 2, h * 0.2, PAL.dim, 11);
        break;
      }
      case 'end':
        break;
    }
  }

  private draw(ctx: CanvasRenderingContext2D, dt: number, w: number, h: number, t: number): void {
    hushBackground(ctx, w, h, t);
    drawVeil(ctx, w * 0.07, h, t);

    // ---- worn rings: arc on the left ----
    const worn = this.ex.worn;
    worn.forEach((wr, i) => {
      const n = worn.length;
      const ty = h * (n === 1 ? 0.5 : 0.24 + (0.52 * i) / Math.max(1, n - 1));
      const tx = w * 0.24 + Math.sin((i / Math.max(1, n - 1) || 0.5) * Math.PI) * w * 0.045;
      let p = this.worn.get(wr.ring.id);
      if (!p) {
        p = { x: w * 0.06, y: ty, lunge: 0 };
        this.worn.set(wr.ring.id, p);
      }
      p.lunge = approach(p.lunge, 0, 5, dt);
      const bob = Math.sin(t * 1.7 + i) * 2;
      p.x = approach(p.x, tx + p.lunge * w * 0.1, 6, dt);
      p.y = approach(p.y, ty + bob, 6, dt);
      drawRing(ctx, wr.ring, p.x, p.y, 12, wr.luster / wr.s.maxLuster);
      if (wr.cresc > 0) {
        ctx.fillStyle = PAL.bronze;
        ctx.font = `9px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.fillText('▲'.repeat(wr.cresc), p.x, p.y + 24);
      }
    });

    // ---- demons: loose column on the right ----
    const ds = this.ex.demons;
    ds.forEach((d, i) => {
      const n = ds.length;
      const ty = h * (n === 1 ? 0.5 : 0.24 + (0.5 * i) / Math.max(1, n - 1));
      const tx = w * (0.74 + 0.08 * ((i % 2) * 2 - 1) * 0.5) + Math.sin(t * 0.7 + i * 2) * 4;
      let p = this.demons.get(d.id);
      if (!p) {
        p = { x: w + 30, y: ty, lunge: 0 };
        this.demons.set(d.id, p);
      }
      p.x = approach(p.x, tx, 3.5, dt);
      p.y = approach(p.y, ty, 3.5, dt);
      const size = d.def.trait === 'stillness' ? 15 : 11;
      drawDemon(ctx, d.def.id, p.x, p.y, size, t + i, d.cracks);
      hpBar(ctx, p.x, p.y + size * (d.def.trait === 'stillness' ? 2 : 1.5), size * 2.6, d.hp / d.maxHp);
    });

    // ---- queue at the veil, discard pile at the ground ----
    const q = this.ex.queue.length;
    for (let i = 0; i < Math.min(q, 6); i++) {
      ctx.strokeStyle = 'rgba(99,165,140,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w * 0.045, h * 0.78 - i * 12, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (q > 0) {
      ctx.fillStyle = PAL.dim;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillText(`queue ${q}`, w * 0.025, h * 0.92);
    }
    const disc = this.ex.discard.length;
    if (disc > 0) {
      for (let i = 0; i < Math.min(disc, 5); i++) {
        ctx.strokeStyle = 'rgba(150,150,150,0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(w * 0.16 + i * 7, h * 0.895, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = PAL.dim;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillText(`dull ${disc}`, w * 0.14, h * 0.96);
    }

    // ---- HUD: wave, tether pips, attunement notches ----
    ctx.fillStyle = PAL.ink;
    ctx.font = `500 16px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText(`Wave ${this.waveN}`, 14, 26);
    const tCap = tetherCap(this.st);
    ctx.textAlign = 'right';
    ctx.font = `12px ${MONO}`;
    const pips: string[] = [];
    for (let i = 0; i < tCap; i++) pips.push(i < this.ex.tether ? '◆' : '◇');
    ctx.fillStyle = PAL.verdigris;
    ctx.fillText(pips.join(''), w - 12, 24);
    const used = worn.reduce((a, x) => a + x.s.attCost, 0);
    const cap = attCap(this.st);
    ctx.fillStyle = PAL.dim;
    ctx.fillText(`attune ${used}/${cap}`, w - 12, 40);

    // wave flash
    if (this.waveFlash > 0) {
      this.waveFlash -= dt;
      ctx.globalAlpha = Math.min(1, this.waveFlash);
      ctx.fillStyle = PAL.ink;
      ctx.font = `500 26px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText(`Wave ${this.waveN}`, w / 2, h * 0.14);
      ctx.globalAlpha = 1;
    }

    this.fx.update(dt);
    this.fx.draw(ctx);
  }
}
