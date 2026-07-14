/** Small seeded RNG (mulberry32) so sims are reproducible in tests. */
export class Rng {
  private s: number;
  constructor(seed = Date.now() >>> 0) {
    this.s = seed >>> 0;
  }
  /** Snapshot / restore — persistence saves the stream mid-flight. */
  get state(): number {
    return this.s;
  }
  setState(s: number): void {
    this.s = s >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }
  weighted<T>(items: readonly T[], weight: (x: T) => number): T {
    let total = 0;
    for (const it of items) total += weight(it);
    let r = this.next() * total;
    for (const it of items) {
      r -= weight(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1]!;
  }
}

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
