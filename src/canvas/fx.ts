import { REDUCED_MOTION } from './loop';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

interface Floater {
  text: string;
  x: number;
  y: number;
  life: number;
  max: number;
  size: number;
  color: string;
  serif: boolean;
}

const MONO = 'ui-monospace, Menlo, monospace';
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

/** One Fx instance per scene — effects are scene-local, like everything else. */
export class Fx {
  private particles: Particle[] = [];
  private floaters: Floater[] = [];

  burst(x: number, y: number, color: string, n = 10, speed = 90, size = 2.4): void {
    const count = REDUCED_MOTION ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life: 0,
        max: 0.5 + Math.random() * 0.4,
        size: size * (0.6 + Math.random() * 0.8),
        color,
      });
    }
  }

  float(text: string, x: number, y: number, color: string, size = 13, serif = false): void {
    this.floaters.push({ text, x, y, life: 0, max: 1.1, size, color, serif });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
      p.vx *= 1 - 2 * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const f of this.floaters) {
      f.life += dt;
      f.y -= 26 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life < f.max);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) {
      const a = f.life < 0.15 ? f.life / 0.15 : 1 - (f.life - 0.15) / (f.max - 0.15);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `${f.serif ? '500 ' : ''}${f.size}px ${f.serif ? SERIF : MONO}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}
