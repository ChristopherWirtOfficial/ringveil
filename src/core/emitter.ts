/** Minimal typed emitter. Engines publish; UI subscribes. Affix hooks are
 *  called directly by engines (deterministic order) — this bus is for
 *  observation, not game logic. */
export class Emitter<E> {
  private subs: Array<(e: E) => void> = [];
  on(fn: (e: E) => void): () => void {
    this.subs.push(fn);
    return () => {
      this.subs = this.subs.filter((s) => s !== fn);
    };
  }
  emit(e: E): void {
    for (const s of this.subs) s(e);
  }
}
