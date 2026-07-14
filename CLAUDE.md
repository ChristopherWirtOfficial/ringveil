# Ringveil

Incremental auto battler prototype; the units are rings. Vanilla TS strict +
canvas 2D, esbuild → one self-contained HTML, zero runtime deps, aggressive
file decomposition.

## Commands

```
npm install
npx tsc                # strict check (noEmit) — must stay clean
node build.mjs         # → dist/ringveil.html + dist/smoke.cjs
node dist/smoke.cjs    # headless engine sanity — run after engine changes
npx esbuild src/freshcheck.ts --bundle --platform=node --format=cjs \
  --outfile=dist/fresh.cjs && node dist/fresh.cjs   # pacing after tuning
```

## Read before working

- `docs/DESIGN.md` — settled decisions AND open questions. Open questions
  stay open: ask the human before resolving one, even implicitly.
- `docs/ARCHITECTURE.md` — the six invariants are binding. In brief:
  engines DOM-free; renderers read state each frame, events are flourishes
  only; the Proving and the Hush are two canvases with unrelated lifecycles,
  never one mode-switched surface; primitives live in engines, affixes and
  lattice nodes only turn their knobs; the emitter observes, never sequences
  logic; engines tick on coarse beats, scenes ease toward truth at rAF.
- `docs/ROADMAP.md` — sequencing.

## Working conventions

- Design-affecting choices get discussed first, not embedded in a diff. The
  human steers top-down; when in doubt, propose and ask.
- Flavor: no traditional status mechanics (burn/poison/etc.). Conceits are
  clusters/zones, never the game's whole identity.
- Balance is non-competitive; low skill floor is sacred; no optimizer UI
  ("you'd gain X by swapping" is forbidden); no wall-clock gates.
- Fresh-start pacing target: naked first run dies around waves 5–7.
- Git identity in this repo's local config is a placeholder — fix before
  pushing.
