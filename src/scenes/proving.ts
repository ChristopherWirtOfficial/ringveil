import { drawRing, MONO, PAL, provingBackground, roundRect, SERIF } from '../canvas/draw';
import { Fx } from '../canvas/fx';
import { approach, CanvasLoop, REDUCED_MOTION } from '../canvas/loop';
import { effStats } from '../game/rings';
import { fold, trainSlots, type GameState } from '../game/state';
import type { Training } from '../game/training';
import type { TrainingEvent } from '../types';

interface Sprite {
  x: number;
  y: number;
  strikeT: number; // next visual strike (scene-local flavor)
  lunge: number; // 0..1 lunge phase toward the stone
}

/** The Proving: alive as long as the app. Rings circle the proving stone,
 *  striking it as they train; rotations drift out, entrants drift in.
 *  Owns its own canvas, loop, and effects — shares nothing with the Hush. */
export class ProvingScene {
  readonly loop: CanvasLoop;
  private fx = new Fx();
  private sprites = new Map<string, Sprite>();
  private unsub: () => void;

  constructor(private st: GameState, private training: Training) {
    this.loop = new CanvasLoop('scene-canvas proving', (ctx, dt, w, h, t) => this.draw(ctx, dt, w, h, t));
    this.unsub = training.events.on((e) => this.onEvent(e));
    this.loop.start();
  }

  get el(): HTMLCanvasElement {
    return this.loop.canvas;
  }

  destroy(): void {
    this.unsub();
    this.loop.stop();
  }

  private onEvent(e: TrainingEvent): void {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (e.t === 'rotate') {
      const s = this.sprites.get(e.ring.id);
      this.fx.float(`+${e.shards}◆`, s?.x ?? w / 2, (s?.y ?? h / 2) - 18, PAL.bronze);
      this.sprites.delete(e.ring.id);
    }
    if (e.t === 'swell') {
      this.fx.float('swell — quota +1', w / 2, h * 0.3, PAL.verdigris, 14, true);
      this.fx.burst(w / 2, h * 0.62, PAL.verdigris, 16, 70);
    }
    if (e.t === 'levelUp') {
      const s = this.sprites.get(e.ring.id);
      if (s) this.fx.float(`Lv ${e.ring.level}`, s.x, s.y - 20, PAL.ink);
    }
  }

  private draw(ctx: CanvasRenderingContext2D, dt: number, w: number, h: number, t: number): void {
    provingBackground(ctx, w, h);
    const cx = w / 2;
    const cy = h * 0.6;

    // the proving stone
    ctx.fillStyle = '#2a2d33';
    roundRect(ctx, cx - 16, cy - 30, 32, 52, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,228,216,0.18)';
    ctx.lineWidth = 1;
    roundRect(ctx, cx - 16, cy - 30, 32, 52, 7);
    ctx.stroke();

    const active = this.training.active;
    const cap = trainSlots(this.st);
    const f = fold(this.st);

    // orbit slots (dashed ghosts for empty / bonus capacity)
    const total = Math.max(cap + this.training.bonusQuota, active.length);
    for (let i = 0; i < total; i++) {
      const ang = -Math.PI / 2 + (i / Math.max(1, total)) * Math.PI * 2 + t * (REDUCED_MOTION ? 0 : 0.08);
      const ox = cx + Math.cos(ang) * Math.min(w * 0.32, 130);
      const oy = cy + Math.sin(ang) * Math.min(h * 0.28, 74);
      const slot = active[i];
      if (!slot) {
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = i >= cap ? 'rgba(99,165,140,0.5)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ox, oy, 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }
      let sp = this.sprites.get(slot.ring.id);
      if (!sp) {
        sp = { x: -20, y: oy, strikeT: t + 0.5 + Math.random() * 1.5, lunge: 0 };
        this.sprites.set(slot.ring.id, sp);
      }
      // visual strike beat (flavor only; XP is continuous in the engine)
      if (t >= sp.strikeT) {
        sp.strikeT = t + 1.4 + Math.random() * 1.4;
        sp.lunge = 1;
        this.fx.burst(cx + (ox - cx) * 0.22, cy + (oy - cy) * 0.22, PAL.dim, 5, 55, 1.8);
      }
      sp.lunge = approach(sp.lunge, 0, 6, dt);
      const lx = ox + (cx - ox) * sp.lunge * 0.55;
      const ly = oy + (cy - oy) * sp.lunge * 0.55;
      sp.x = approach(sp.x, lx, 8, dt);
      sp.y = approach(sp.y, ly, 8, dt);
      drawRing(ctx, slot.ring, sp.x, sp.y, 13, 1 - slot.wear, { glow: slot.bonus });
      ctx.fillStyle = PAL.dim;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(`Lv ${slot.ring.level}`, sp.x, sp.y + 26);
      void effStats(slot.ring, f); // reserved for future per-ring readouts
    }

    // header
    ctx.fillStyle = PAL.ink;
    ctx.font = `500 15px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText('The Proving', 14, 24);
    ctx.fillStyle = PAL.dim;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(
      `${active.length}/${cap}${this.training.bonusQuota > 0 ? ` +${this.training.bonusQuota}` : ''} sparring`,
      14,
      40,
    );

    this.fx.update(dt);
    this.fx.draw(ctx);
  }
}
