# Ringveil (working title)

An incremental auto battler where the units are rings. Train them at home in
the Proving; summon them across the veil into demon territory and watch them
fight, fall dull, and cycle. Prototype v0.

## Play

Run `pnpm build`, then open `dist/index.html` in any browser. It is a single
self-contained file — no server, no dependencies.

## Develop

Requires [pnpm](https://pnpm.io) (`npm install -g pnpm`).

```
pnpm install
pnpm dev         # Vite dev server with HMR at localhost:5173
pnpm typecheck   # strict tsc --noEmit
pnpm build       # bundle → dist/index.html (single self-contained file)
pnpm smoke       # headless engine sanity (exercises every primitive)
```

`pnpm freshcheck` is a pacing harness: sims 20 fresh-start expeditions and
prints waves survived. Run it after tuning.

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
