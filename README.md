# Ringveil (working title)

An incremental auto battler where the units are rings. Train them at home in
the Proving; summon them across the veil into demon territory and watch them
fight, fall dull, and cycle. Prototype v0.

## Play

Open `dist/ringveil.html` in any browser. It is a single self-contained file —
no server, no dependencies.

## Develop

```
npm install
npx tsc              # strict type check (noEmit)
node build.mjs       # bundle → dist/ringveil.html + dist/smoke.cjs
node dist/smoke.cjs  # headless engine sanity (exercises every primitive)
```

`src/freshcheck.ts` is a pacing harness: sims 20 fresh-start expeditions and
prints waves survived. Bundle it the same way smoke is bundled if tuning.

## Read first

- `docs/DESIGN.md` — what the game is, every settled decision, every open one
- `docs/ARCHITECTURE.md` — module map and the rules that keep it extensible
- `docs/ROADMAP.md` — near-term forks and next steps

## State of the prototype

Engines are complete for the v0 slice: expeditions (queue → worn → discard,
paid summons, attunement window, waves, drops, auto-melt), training (emergent
rotation, swell quota procs, XP/levels), the Lattice (free respec, 3× loot
skew), and the Foundry ratchet. Rendering is two independent canvas scenes.
No persistence yet — sessions are in-memory.
