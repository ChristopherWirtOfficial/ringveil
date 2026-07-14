/** Each scene OWNS one of these — one canvas, one loop, one lifecycle.
 *  There is deliberately no shared scene controller: the Proving and the
 *  Hush are unrelated components that happen to use the same primitives. */
export class CanvasLoop {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private running = false;

  constructor(cssClass: string, private draw: (ctx: CanvasRenderingContext2D, dt: number, w: number, h: number, t: number) => void) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = cssClass;
    this.ctx = this.canvas.getContext('2d')!;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number): void => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.fit();
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw(this.ctx, dt, w, h, now / 1000);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private fit(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (w > 0 && h > 0 && (this.canvas.width !== w || this.canvas.height !== h)) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }
}

export const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** frame-rate independent easing toward a target */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}
