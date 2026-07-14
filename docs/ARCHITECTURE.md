# Ringveil — Architecture

Pipeline: TypeScript strict → Vite (esbuild under the hood) → one
self-contained HTML via `vite-plugin-singlefile`. Vanilla DOM + canvas 2D,
zero runtime dependencies. Aggressive file decomposition.

## Module map

    src/
      types.ts            core types; every primitive/affix/node is cluster-tagged
      core/
        rng.ts            seeded RNG (sims are reproducible), uid()
        emitter.ts        typed pub/sub — for OBSERVATION, never game logic
      data/               pure data; adding content should mostly land here
        affixes.ts        affix defs: cluster tag, loot weight, stat fold
        uniques.ts        handcrafted uniques
        demons.ts         zone one (the Hush): species + wave composition
        lattice.ts        tree nodes by cluster + fold to global modifiers
      game/               DOM-free engines — runnable headless in node
        rings.ts          generation, naming, XP, melt, effective-stat fold
        state.ts          GameState, Foundry upgrades, respec, salvage policy
        expedition.ts     the wearing battle: queue → worn → discard
        training.ts       the Proving: emergent rotation, swell bubbles
      canvas/             shared drawing primitives (the "design system")
        loop.ts           CanvasLoop: one per scene; DPR, rAF, lifecycle
        draw.ts           ring annuli, demon silhouettes, veil, backgrounds
        fx.ts             per-scene particle + floating-text pools
      scenes/             SIBLING components; two canvases, zero shared surface
        proving.ts        lives as long as the app
        hush.ts           born with an expedition, destroyed with it
      ui/                 DOM shell: tabs, sheets, cards
      smoke.ts            headless sanity across every primitive
      freshcheck.ts       fresh-start pacing harness (20 seeds)

## Invariants

1. **Engines are DOM-free.** Everything in `game/` runs in node. Smoke and
   pacing harnesses depend on this; keep it true.
2. **Renderers read state; events are flourishes.** Each frame, a scene draws
   from engine state as the source of truth. Engine events trigger only
   transient effects (bursts, floaters, lunges). Animation can therefore
   never desync from the sim.
3. **Two canvases, never one.** The Proving and the Hush are unrelated
   components with unrelated lifecycles. They share `canvas/*` primitives the
   way siblings share a design system — no mode-switched surface, ever.
4. **Primitives live in engines; affixes turn knobs.** A mechanic (echo,
   fracture, crescendo, knell, swell) is engine code gated by a lattice
   unlock. Affixes and nodes only adjust its numbers. Integer affixes exist
   because primitives are first-class.
5. **The bus observes.** Affix folds are called deterministically by engines;
   `Emitter` exists for UI/scenes to watch, never to sequence game logic.
6. **Tick ≠ frame.** Engines tick on coarse beats (training 500ms, battle
   700ms); scenes render at rAF and ease toward truth.

## Extension recipes

**New cluster**: add primitive state/logic to the relevant engine behind a
lattice unlock; add nodes in `data/lattice.ts` and affixes in
`data/affixes.ts` with the new cluster tag. Loot skew picks them up
automatically via `wantsNode`.

**New zone**: a new `DemonDef[]` + wave composition in `data/`. Species
silhouettes go in `canvas/draw.ts`.

**New unique**: one entry in `data/uniques.ts` — a fold over `EffStats`.

## Testing

- `pnpm smoke` — buys the full resonance cluster, runs training 600 ticks +
  a full expedition, asserts every primitive fired.
- Fresh-start pacing target: a naked first run should die around waves 5–7
  (first Stillness), funding roughly one Lattice node. Re-run `freshcheck`
  after any tuning change.
