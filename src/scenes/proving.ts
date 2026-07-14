import { drawRing, hexA, MONO, PAL, PROVING_HORIZON, provingBackground, SERIF } from '../canvas/draw';
import { Fx } from '../canvas/fx';
import { approach, CanvasLoop, REDUCED_MOTION } from '../canvas/loop';
import { RARITY_COLORS, xpToNext } from '../game/rings';
import { trainSlots, type GameState } from '../game/state';
import type { Training } from '../game/training';
import type { TrainingEvent } from '../types';

/** One sprite per home ring — active OR waiting. Targets derive from engine
 *  state each frame; easing between them IS the rotation animation. A ring
 *  rotating out glides to the back of the queue while the next lifts off the
 *  apron, with no event bookkeeping — motion emerges from state change the
 *  way rotation emerges from wear. */
interface Sprite {
  x: number;
  y: number;
  strikeT: number; // next visual strike beat (scene flavor; engine XP is continuous)
  period: number; // this ring's own strike rhythm, from its id
  phase: number; // bob phase, from its id
  lunge: number; // 0..1 lunge toward the stone
  wearD: number; // displayed endurance arc, eased toward engine truth
  xpD: number; // displayed xp arc, eased toward engine truth
}

interface Mote {
  fx: number; // 0..1 of width
  y: number; // 0..1 of height, drifts upward
  spd: number;
  ph: number;
}

/** Stable 0..1 from a ring id — gives each ring its own rhythm and sway. */
function idHash(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) % 997;
  return n / 997;
}

/** The Proving: alive as long as the app. Rings spar against the proving
 *  stone in a flanking arc, wear down, and cycle through a visible queue on
 *  the apron. Owns its own canvas, loop, and effects — shares nothing with
 *  the Hush. */
export class ProvingScene {
  readonly loop: CanvasLoop;
  private fx = new Fx();
  private sprites = new Map<string, Sprite>();
  private motes: Mote[] = [];
  private heat = 0; // stone emblem warmth, fed by strikes
  private shake = 0; // stone recoil
  private prevBonus = 0; // for detecting a bubble pop
  private swellFxPending = false;
  private lastRotate: { x: number; y: number } | null = null;
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
    if (e.t === 'rotate') {
      const s = this.sprites.get(e.ring.id);
      if (s) {
        this.lastRotate = { x: s.x, y: s.y };
        this.fx.float(`+${e.shards}◆`, s.x, s.y - 18, PAL.bronze);
        this.fx.burst(s.x, s.y, PAL.bronze, 6, 55, 1.8);
      }
      // sprite survives: state now says "queued", and easing carries it home
    }
    if (e.t === 'swell') {
      this.swellFxPending = true; // bloom once layout is known, in draw()
    }
    if (e.t === 'levelUp') {
      const s = this.sprites.get(e.ring.id);
      if (s) {
        this.fx.float(`Lv ${e.ring.level}`, s.x, s.y - 20, PAL.ink);
        this.fx.pulse(s.x, s.y, 22, RARITY_COLORS[e.ring.rarity]!, 1.5);
      }
    }
  }

  private mkSprite(id: string, x: number, y: number, t: number): Sprite {
    const h1 = idHash(id);
    const sp: Sprite = {
      x,
      y,
      strikeT: t + 0.4 + h1 * 1.2,
      period: 1.15 + h1 * 1.3,
      phase: h1 * Math.PI * 2,
      lunge: 0,
      wearD: 1,
      xpD: 0,
    };
    this.sprites.set(id, sp);
    return sp;
  }

  private draw(ctx: CanvasRenderingContext2D, dt: number, w: number, h: number, t: number): void {
    provingBackground(ctx, w, h);
    const cx = w / 2;
    const groundY = h * PROVING_HORIZON;
    const qy = groundY + (h - groundY) * 0.46; // the apron, where the queue rests

    // ---- stone geometry & mood ----
    const stoneH = Math.max(78, Math.min(118, h * 0.3));
    const baseW = 40;
    const topW = 26;
    const emblemY = groundY - stoneH * 0.58;
    this.heat = approach(this.heat, 0, 0.9, dt);
    this.shake = approach(this.shake, 0, 7, dt);
    const sx = REDUCED_MOTION ? 0 : Math.sin(t * 55) * 1.6 * this.shake;
    const bx = cx + sx;

    // ---- the proving circle, inscribed in the ground ----
    const rxSpar = Math.min(w * 0.33, 150);
    ctx.strokeStyle = hexA(PAL.bronze, 0.1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 6, rxSpar * 1.12, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = hexA(PAL.bronze, 0.05);
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 6, rxSpar * 0.72, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ---- ember motes rising off the grounds ----
    if (!REDUCED_MOTION) {
      if (this.motes.length === 0) {
        for (let i = 0; i < 12; i++) {
          this.motes.push({ fx: Math.random(), y: 0.3 + Math.random() * 0.65, spd: 0.02 + Math.random() * 0.03, ph: Math.random() * 6 });
        }
      }
      for (const m of this.motes) {
        m.y -= m.spd * dt;
        if (m.y < 0.26) {
          m.y = 0.9 + Math.random() * 0.08;
          m.fx = Math.random();
        }
        const a = 0.14 * Math.min(1, (m.y - 0.26) / 0.12, (0.98 - m.y) / 0.12);
        if (a <= 0) continue;
        ctx.fillStyle = hexA(PAL.bronze, a);
        ctx.beginPath();
        ctx.arc(m.fx * w + Math.sin(t * 0.5 + m.ph) * 7, m.y * h, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- the proving stone ----
    if (this.heat > 0.02) {
      // strike-warmth spills onto the ground at its base
      const gl = ctx.createRadialGradient(bx, groundY, 4, bx, groundY, 60);
      gl.addColorStop(0, hexA(PAL.bronze, 0.07 * this.heat));
      gl.addColorStop(1, hexA(PAL.bronze, 0));
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.ellipse(bx, groundY + 4, 60, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const sg = ctx.createLinearGradient(0, groundY - stoneH, 0, groundY);
    sg.addColorStop(0, '#2e3138');
    sg.addColorStop(1, '#232529');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(bx - baseW / 2, groundY);
    ctx.lineTo(bx - topW / 2, groundY - stoneH + 10);
    ctx.quadraticCurveTo(bx - topW / 2 + 1, groundY - stoneH, bx - topW / 2 + 8, groundY - stoneH);
    ctx.lineTo(bx + topW / 2 - 8, groundY - stoneH);
    ctx.quadraticCurveTo(bx + topW / 2 - 1, groundY - stoneH, bx + topW / 2, groundY - stoneH + 10);
    ctx.lineTo(bx + baseW / 2, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,228,216,0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // chisel scars
    ctx.strokeStyle = 'rgba(233,228,216,0.08)';
    ctx.beginPath();
    ctx.moveTo(bx - 8, groundY - stoneH * 0.28);
    ctx.lineTo(bx - 2, groundY - stoneH * 0.22);
    ctx.moveTo(bx + 5, groundY - stoneH * 0.82);
    ctx.lineTo(bx + 10, groundY - stoneH * 0.74);
    ctx.stroke();
    // the carved annulus, warming with every strike
    if (this.heat > 0.02) {
      const eg = ctx.createRadialGradient(bx, emblemY, 2, bx, emblemY, 26);
      eg.addColorStop(0, hexA(PAL.bronze, 0.25 * this.heat));
      eg.addColorStop(1, hexA(PAL.bronze, 0));
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(bx, emblemY, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(233,228,216,0.20)';
    ctx.beginPath();
    ctx.arc(bx, emblemY, 8, 0, Math.PI * 2);
    ctx.stroke();
    if (this.heat > 0.02) {
      ctx.strokeStyle = hexA(PAL.bronze, 0.6 * this.heat);
      ctx.beginPath();
      ctx.arc(bx, emblemY, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ---- layout for sparring slots: flanking ranks around the stone ----
    const active = this.training.active;
    const cap = trainSlots(this.st);
    const totalSlots = Math.max(cap + this.training.bonusQuota, active.length);
    const yTop = emblemY + 4;
    const yBot = groundY - 14;
    const maxRank = Math.floor(Math.max(0, totalSlots - 1) / 2);
    const stepY = maxRank > 0 ? Math.min(34, (yBot - yTop) / maxRank) : 0;
    const slotPos = (i: number): { x: number; y: number } => {
      const side = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor(i / 2);
      return { x: cx + side * rxSpar * (1 - rank * 0.16), y: yTop + stepY * rank };
    };

    // swell flourishes (deferred from events until layout is known)
    if (this.swellFxPending) {
      this.swellFxPending = false;
      const p = slotPos(totalSlots - 1);
      this.fx.pulse(p.x, p.y, 30, PAL.verdigris);
      this.fx.float('the quota swells +1', p.x, p.y - 26, PAL.verdigris, 12, true);
    }
    if (this.training.bonusQuota < this.prevBonus && this.lastRotate) {
      this.fx.pulse(this.lastRotate.x, this.lastRotate.y, 20, PAL.verdigris, 1.5);
      this.fx.float('the bubble pops', this.lastRotate.x, this.lastRotate.y - 30, PAL.verdigris, 11, true);
    }
    this.prevBonus = this.training.bonusQuota;

    const drawn = new Set<string>();

    // ---- empty slots: dashed ghosts (verdigris when swell-granted) ----
    for (let i = active.length; i < totalSlots; i++) {
      const p = slotPos(i);
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = i >= cap ? 'rgba(99,165,140,0.5)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- active rings: sparring ----
    for (let i = 0; i < active.length; i++) {
      const slot = active[i]!;
      const pos = slotPos(i);
      drawn.add(slot.ring.id);
      const sp = this.sprites.get(slot.ring.id) ?? this.mkSprite(slot.ring.id, 22, qy, t);
      // visual strike beat (flavor only; engine XP is continuous)
      if (t >= sp.strikeT) {
        sp.strikeT = t + sp.period * (0.8 + Math.random() * 0.5);
        sp.lunge = 1;
        const ddx = bx - pos.x;
        const ddy = emblemY - pos.y;
        const dist = Math.hypot(ddx, ddy) || 1;
        const ix = bx - (ddx / dist) * (baseW * 0.55);
        const iy = emblemY - (ddy / dist) * (baseW * 0.55);
        this.fx.burst(ix, iy, PAL.bronze, 3, 60, 1.6);
        this.fx.burst(ix, iy, PAL.dim, 3, 45, 1.5);
        this.heat = Math.min(1, this.heat + 0.45);
        this.shake = Math.min(1, this.shake + 0.5);
      }
      sp.lunge = approach(sp.lunge, 0, 6, dt);
      const bob = REDUCED_MOTION ? 0 : Math.sin(t * 1.7 + sp.phase) * 2.2;
      const lx = pos.x + (bx - pos.x) * sp.lunge * 0.62;
      const ly = pos.y + (emblemY - pos.y) * sp.lunge * 0.62;
      sp.x = approach(sp.x, lx, 8, dt);
      sp.y = approach(sp.y, ly + bob, 8, dt);
      // ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(sp.x, groundY + 3, 9, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // swell bubble around the surplus slots — the quota's swollen edge.
      // (positional, not slot.bonus: the engine flag marks admission history
      // for pop bookkeeping and proliferates with churn)
      if (i >= cap) {
        const ba = REDUCED_MOTION ? 0.06 : 0.05 + 0.035 * Math.sin(t * 2.2 + sp.phase);
        ctx.fillStyle = hexA(PAL.verdigris, Math.max(0.02, ba));
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hexA(PAL.verdigris, 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      // arcs ease toward engine truth; snap across resets instead of easing
      const wearTarget = 1 - slot.wear;
      sp.wearD = wearTarget > sp.wearD + 0.25 ? wearTarget : approach(sp.wearD, wearTarget, 5, dt);
      const xpFrac = slot.ring.xp / xpToNext(slot.ring.level);
      sp.xpD = xpFrac < sp.xpD - 0.25 ? xpFrac : approach(sp.xpD, xpFrac, 4, dt);
      drawRing(ctx, slot.ring, sp.x, sp.y, 13, sp.wearD, { glow: slot.ring.rarity >= 3, inner: sp.xpD });
      ctx.fillStyle = PAL.dim;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(`Lv ${slot.ring.level}`, sp.x, sp.y + 27);
    }

    // ---- the queue: waiting on the apron, front of the line leftmost ----
    const queued = this.training.queued;
    const maxDrawnQ = 8;
    queued.slice(0, maxDrawnQ).forEach((ring, j) => {
      drawn.add(ring.id);
      const tx = 22 + j * 19;
      const sp = this.sprites.get(ring.id) ?? this.mkSprite(ring.id, tx, h + 14, t);
      const breathe = REDUCED_MOTION ? 0 : Math.sin(t * 1.1 + sp.phase) * 0.8;
      sp.x = approach(sp.x, tx, 6, dt);
      sp.y = approach(sp.y, qy + breathe, 6, dt);
      sp.lunge = 0;
      sp.wearD = approach(sp.wearD, 1, 0.8, dt); // rest reads as recovery
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y + 10, 6, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      drawRing(ctx, ring, sp.x, sp.y, 7, sp.wearD);
      ctx.globalAlpha = 1;
    });
    if (queued.length > maxDrawnQ) {
      ctx.fillStyle = PAL.dim;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillText(`+${queued.length - maxDrawnQ}`, 22 + maxDrawnQ * 19, qy + 3);
    }
    if (queued.length > 0) {
      ctx.fillStyle = 'rgba(162,155,140,0.55)';
      ctx.font = `9px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillText('waiting', 15, qy + 22);
    }

    // ---- quiet grounds (everyone away or nothing owned) ----
    if (active.length === 0 && queued.length === 0) {
      ctx.fillStyle = PAL.dim;
      ctx.font = `500 13px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText('the grounds are quiet', cx, qy);
    }

    // ---- header ----
    ctx.fillStyle = PAL.ink;
    ctx.font = `500 15px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText('The Proving', 14, 24);
    ctx.fillStyle = PAL.dim;
    ctx.font = `11px ${MONO}`;
    const bonusTxt = this.training.bonusQuota > 0 ? ` +${this.training.bonusQuota}` : '';
    const waitTxt = queued.length > 0 ? ` · ${queued.length} waiting` : '';
    ctx.fillText(`${active.length}/${cap}${bonusTxt} sparring${waitTxt}`, 14, 40);

    this.fx.update(dt);
    this.fx.draw(ctx);

    // sprites for rings no longer home (melted, away) fade from the map
    for (const id of this.sprites.keys()) {
      if (!drawn.has(id)) this.sprites.delete(id);
    }
  }
}
