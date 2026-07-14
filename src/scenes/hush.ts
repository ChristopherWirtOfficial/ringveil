import { drawDemon, drawRing, drawVeil, hexA, hpBar, HUSH_GROUND, hushBackground, MONO, PAL, SERIF } from '../canvas/draw';
import { Fx } from '../canvas/fx';
import { approach, CanvasLoop, REDUCED_MOTION } from '../canvas/loop';
import type { Expedition } from '../game/expedition';
import { attCap, tetherCap, type GameState } from '../game/state';
import type { ExpeditionEvent, Ring } from '../types';

interface Pos {
  x: number;
  y: number;
  lunge: number;
}

/** A summon pulls a visible thread from the veil to the arrival point. */
interface Thread {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
}

/** A ring going dull falls out of the fight toward the discard pile. */
interface DullFall {
  ring: Ring;
  x: number;
  y: number;
  life: number;
}

interface Mote {
  fx: number;
  y: number; // 0..1, drifts DOWN — silence settles
  spd: number;
  ph: number;
}

const THREAD_LIFE = 0.55;
const FALL_LIFE = 0.9;
const CLOSE_TIME = 1.7;

/** The Hush: born with an expedition, dies with it. The veil is the seat of
 *  the Tether pool — pips live on it, summons pull threads from it, and when
 *  the pool runs dry it flickers. Death is a scene beat, not a screen swap.
 *  Owns its own canvas, loop, and effects — a sibling of the Proving. */
export class HushScene {
  readonly loop: CanvasLoop;
  private fx = new Fx();
  private worn = new Map<string, Pos>();
  private demons = new Map<string, Pos>();
  private threads: Thread[] = [];
  private falls: DullFall[] = [];
  private motes: Mote[] = [];
  private waveFlash = 0;
  private waveN = 1;
  private waveHasStillness = false;
  private pipFlash = 0; // brightens the pips briefly when the pool changes
  private closing = -1; // scene-time when the end began; -1 = fighting
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

  private veilX(): number {
    return (this.el.clientWidth || 340) * 0.075;
  }

  private onEvent(e: ExpeditionEvent): void {
    const w = this.el.clientWidth || 340;
    const h = this.el.clientHeight || 300;
    const vx = this.veilX();
    switch (e.t) {
      case 'summon': {
        const p: Pos = { x: vx, y: h * 0.45, lunge: 0 };
        this.worn.set(e.ring.id, p);
        this.threads.push({ x1: vx, y1: h * 0.3, x2: w * 0.24, y2: h * 0.45, life: 0 });
        this.fx.burst(vx + 10, h * 0.45, PAL.verdigris, 12, 55);
        this.fx.float(`−${e.cost}◈`, vx + 16, h * 0.24, PAL.verdigris, 12);
        this.pipFlash = 1;
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
          this.fx.pulse(d.x, d.y, 34, PAL.ink, 2);
          this.fx.float(`${e.dmg}`, d.x, d.y - 26, PAL.bronze, 19, true);
          this.fx.float('shatter', d.x, d.y - 44, PAL.dim, 11, true);
        }
        break;
      }
      case 'kill': {
        const d = this.demons.get(e.demonId);
        if (d) {
          this.fx.burst(d.x, d.y, PAL.demon, 18, 110);
          this.fx.pulse(d.x, d.y, 22, PAL.demon, 1.5);
        }
        this.demons.delete(e.demonId);
        break;
      }
      case 'knell': {
        this.fx.float(`+${e.amount}◈`, vx + 16, h * 0.16, PAL.verdigris, 13);
        this.fx.pulse(vx, h * 0.16, 14, PAL.verdigris, 1.5);
        this.pipFlash = 1;
        break;
      }
      case 'ringDown': {
        const a = this.worn.get(e.ring.id);
        if (a) {
          this.fx.burst(a.x, a.y, 'rgba(160,160,160,0.8)', 10, 60);
          this.fx.float(`${e.ring.name.split(' ').slice(0, 2).join(' ')} goes dull`, a.x + 24, a.y - 14, PAL.dim, 11, true);
          this.falls.push({ ring: e.ring, x: a.x, y: a.y, life: 0 });
        }
        this.worn.delete(e.ring.id);
        break;
      }
      case 'demonHit': {
        const a = this.worn.get(e.ring.id);
        const d = this.demons.get(e.demonId);
        if (a) this.fx.burst(a.x, a.y, PAL.danger, 4, 45, 1.6);
        if (d) d.lunge = 1;
        break;
      }
      case 'steal': {
        this.fx.float('−1◈ swallowed', vx + 16, h * 0.2, PAL.danger, 12);
        this.fx.pulse(vx, h * 0.2, 12, PAL.danger, 1.5);
        this.pipFlash = 1;
        break;
      }
      case 'wave': {
        this.waveN = e.n;
        this.waveFlash = 1.8;
        this.waveHasStillness = this.ex.demons.some((d) => d.def.trait === 'stillness');
        break;
      }
      case 'drop': {
        if (!e.melted) {
          this.fx.float(`drop: ${e.ring.name}`, w / 2, h * 0.18, PAL.bronze, 13, true);
          this.fx.pulse(w / 2, h * 0.22, 20, PAL.bronze, 1.5);
        } else {
          this.fx.float(`melted +${e.shards}◆`, w / 2, h * 0.18, PAL.dim, 11);
        }
        break;
      }
      case 'end':
        this.closing = 0; // armed; stamped with scene time on the next frame
        break;
    }
  }

  private draw(ctx: CanvasRenderingContext2D, dt: number, w: number, h: number, t: number): void {
    if (this.closing === 0) this.closing = t; // stamp the moment the veil began to close
    const closeK = this.closing > 0 ? Math.min(1, (t - this.closing) / CLOSE_TIME) : 0;

    hushBackground(ctx, w, h, t);
    const groundY = h * HUSH_GROUND;
    const vx = this.veilX();
    const tCap = tetherCap(this.st);
    const tetherK = this.ex.tether / Math.max(1, tCap);

    // ---- silence settles: cold motes drifting down ----
    if (!REDUCED_MOTION) {
      if (this.motes.length === 0) {
        for (let i = 0; i < 10; i++) {
          this.motes.push({ fx: Math.random(), y: Math.random() * 0.8, spd: 0.015 + Math.random() * 0.02, ph: Math.random() * 6 });
        }
      }
      for (const m of this.motes) {
        m.y += m.spd * dt;
        if (m.y > 0.82) {
          m.y = 0.05 + Math.random() * 0.05;
          m.fx = Math.random();
        }
        const a = 0.1 * Math.min(1, (0.82 - m.y) / 0.1, (m.y - 0.04) / 0.1);
        if (a <= 0) continue;
        ctx.fillStyle = hexA('#8f86a8', a);
        ctx.beginPath();
        ctx.arc(m.fx * w + Math.sin(t * 0.4 + m.ph) * 5, m.y * h, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- the veil, dimming as the pool drains, closing at the end ----
    const flicker = !REDUCED_MOTION && this.closing < 0 && this.ex.tether <= 2;
    drawVeil(ctx, vx, h, t, { intensity: Math.max(0, tetherK * (1 - closeK)), flicker });

    // ---- Tether pips live on the veil: the pool is the thread home ----
    this.pipFlash = approach(this.pipFlash, 0, 4, dt);
    const pipStep = Math.min(12, (h * 0.55) / Math.max(1, tCap));
    for (let i = 0; i < tCap; i++) {
      const py = h * 0.14 + i * pipStep;
      const filled = i < this.ex.tether;
      const size = filled ? 3.2 : 2.4;
      ctx.save();
      ctx.translate(vx, py);
      ctx.rotate(Math.PI / 4);
      if (filled) {
        ctx.fillStyle = hexA(PAL.verdigris, (0.75 + 0.25 * this.pipFlash) * (1 - closeK));
        ctx.fillRect(-size / 2, -size / 2, size, size);
      } else {
        ctx.strokeStyle = hexA(PAL.verdigris, 0.3 * (1 - closeK));
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-size / 2, -size / 2, size, size);
      }
      ctx.restore();
    }

    // ---- summon threads, fading fast ----
    for (const th of this.threads) {
      th.life += dt;
      const k = th.life / THREAD_LIFE;
      if (k >= 1) continue;
      ctx.strokeStyle = hexA(PAL.verdigris, 0.5 * (1 - k));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(th.x1, th.y1);
      const mx = (th.x1 + th.x2) / 2;
      ctx.quadraticCurveTo(mx, Math.min(th.y1, th.y2) - 18 * (1 - k), th.x2, th.y2);
      ctx.stroke();
    }
    this.threads = this.threads.filter((th) => th.life < THREAD_LIFE);

    // ---- worn rings: arc on the left ----
    const worn = this.ex.worn;
    worn.forEach((wr, i) => {
      const n = worn.length;
      const ty = h * (n === 1 ? 0.5 : 0.24 + (0.52 * i) / Math.max(1, n - 1));
      const tx = w * 0.26 + Math.sin((i / Math.max(1, n - 1) || 0.5) * Math.PI) * w * 0.045;
      let p = this.worn.get(wr.ring.id);
      if (!p) {
        p = { x: vx, y: ty, lunge: 0 };
        this.worn.set(wr.ring.id, p);
      }
      p.lunge = approach(p.lunge, 0, 5, dt);
      const bob = REDUCED_MOTION ? 0 : Math.sin(t * 1.7 + i) * 2;
      p.x = approach(p.x, tx + p.lunge * w * 0.12, 6, dt);
      p.y = approach(p.y, ty + bob, 6, dt);
      drawRing(ctx, wr.ring, p.x, p.y, 12, wr.luster / wr.s.maxLuster);
      if (wr.cresc > 0) {
        ctx.fillStyle = PAL.bronze;
        ctx.font = `10px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.fillText('▲'.repeat(wr.cresc), p.x, p.y + 25);
      }
    });

    // ---- demons: loose column on the right, lunging when they strike ----
    const ds = this.ex.demons;
    ds.forEach((d, i) => {
      const n = ds.length;
      const ty = h * (n === 1 ? 0.48 : 0.22 + (0.5 * i) / Math.max(1, n - 1));
      const tx = w * (0.74 + 0.08 * ((i % 2) * 2 - 1) * 0.5) + (REDUCED_MOTION ? 0 : Math.sin(t * 0.7 + i * 2) * 4);
      let p = this.demons.get(d.id);
      if (!p) {
        p = { x: w + 30, y: ty, lunge: 0 };
        this.demons.set(d.id, p);
      }
      p.lunge = approach(p.lunge, 0, 5, dt);
      p.x = approach(p.x, tx - p.lunge * w * 0.09, 3.5, dt);
      p.y = approach(p.y, ty, 3.5, dt);
      const size = d.def.trait === 'stillness' ? 15 : 11;
      drawDemon(ctx, d.def.id, p.x, p.y, size, t + i, d.cracks);
      hpBar(ctx, p.x, p.y + size * (d.def.trait === 'stillness' ? 2 : 1.5), size * 2.6, d.hp / d.maxHp);
    });

    // ---- dull rings falling out of the fight ----
    const discCount = this.ex.discard.length;
    const discX = (j: number): number => w * 0.16 + j * 7;
    for (const f of this.falls) {
      f.life += dt;
      const k = Math.min(1, f.life / FALL_LIFE);
      const ease = 1 - (1 - k) * (1 - k);
      const fx0 = f.x + (discX(discCount - 1) - f.x) * ease;
      const fy0 = f.y + (groundY + 6 - f.y) * ease;
      ctx.globalAlpha = 1 - k * 0.5;
      drawRing(ctx, f.ring, fx0, fy0, 8 - 3 * k, 1, { dull: true });
      ctx.globalAlpha = 1;
    }
    this.falls = this.falls.filter((f) => f.life < FALL_LIFE);

    // ---- queue at the veil, discard dulled on the ground ----
    const q = this.ex.queue.length;
    for (let i = 0; i < Math.min(q, 6); i++) {
      ctx.strokeStyle = 'rgba(99,165,140,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(vx - 8, h * 0.78 - i * 12, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (q > 0) {
      ctx.fillStyle = PAL.dim;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillText(`queue ${q}`, vx - 14, h * 0.87);
    }
    if (discCount > 0) {
      for (let i = 0; i < Math.min(discCount, 5); i++) {
        ctx.strokeStyle = 'rgba(150,150,150,0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(discX(i), groundY + 6, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = PAL.dim;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillText(`dull ${discCount}`, w * 0.14, groundY + 20);
    }

    // ---- the deep grows heavier with every wave ----
    const vigAlpha = Math.min(0.32, (this.waveN - 1) * 0.02) +
      (this.waveHasStillness && this.closing < 0 && !REDUCED_MOTION ? 0.04 + 0.03 * Math.sin(t * 1.4) : 0);
    if (vigAlpha > 0.005) {
      const vig = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.42, w / 2, h * 0.45, Math.max(w, h) * 0.75);
      vig.addColorStop(0, 'rgba(5,5,9,0)');
      vig.addColorStop(1, `rgba(5,5,9,${vigAlpha})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }

    // ---- HUD ----
    ctx.fillStyle = PAL.ink;
    ctx.font = `500 16px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText(`Wave ${this.waveN}`, 14, 26);
    const used = worn.reduce((a, x) => a + x.s.attCost, 0);
    ctx.textAlign = 'right';
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = PAL.dim;
    ctx.fillText(`attune ${used}/${attCap(this.st)}`, w - 12, 24);

    // wave banner
    if (this.waveFlash > 0 && this.closing < 0) {
      this.waveFlash -= dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, this.waveFlash));
      ctx.fillStyle = PAL.ink;
      ctx.font = `500 26px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText(`Wave ${this.waveN}`, w / 2, h * 0.13);
      if (this.waveHasStillness) {
        ctx.fillStyle = PAL.dim;
        ctx.font = `italic 13px ${SERIF}`;
        ctx.fillText('a stillness comes', w / 2, h * 0.13 + 20);
      }
      ctx.globalAlpha = 1;
    }

    this.fx.update(dt);
    this.fx.draw(ctx);

    // ---- the veil closes: the death beat ----
    if (closeK > 0) {
      ctx.fillStyle = `rgba(5,5,9,${0.72 * closeK})`;
      ctx.fillRect(0, 0, w, h);
      const textA = Math.max(0, (closeK - 0.25) / 0.75);
      ctx.globalAlpha = textA;
      ctx.fillStyle = PAL.ink;
      ctx.font = `500 24px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText('the veil closes', w / 2, h * 0.44);
      ctx.fillStyle = PAL.dim;
      ctx.font = `13px ${SERIF}`;
      ctx.fillText(`you held for ${this.ex.wave} waves`, w / 2, h * 0.44 + 24);
      ctx.globalAlpha = 1;
    }

    // prune position maps the engine no longer knows
    const wornIds = new Set(worn.map((x) => x.ring.id));
    for (const id of this.worn.keys()) if (!wornIds.has(id)) this.worn.delete(id);
    const demonIds = new Set(ds.map((x) => x.id));
    for (const id of this.demons.keys()) if (!demonIds.has(id)) this.demons.delete(id);
  }
}
