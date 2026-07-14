# Ringveil — Roadmap

Rough sequencing. Playtest feel decides most forks before code does.

## Near

- **Calling UX** — cost preview shipped; drag ordering still wanted.
- **Crescendo banking order** — decide pre- vs post-bank from feel.
- **Offline training** — persistence ships state-only; the away-time
  question is now open in DESIGN.md and needs a human call.

## Shipped from this list

- **Persistence** — v1 save in localStorage: autosave (5s + on hide),
  versioned, defensive parse; smoke covers the round-trip. Mid-fight
  state is deliberately not saved.
- **Progressive disclosure** — first session is the Proving alone; the
  first rotation reveals the Lattice, the first node reveals the Hush,
  the first crossing reveals Rings (with threshold safety valves).

## Mid

- **Resurrection archetype** — "summon from discard at discounted Tether";
  fenced by the pool, so ship it broken-leaning and observe.
- **Aspect depth** — weaknesses exist; aspects may want one real mechanic
  each before a second cluster arrives.
- **XP arrival** — if training strikes should *be* the XP (not represent
  it), engine and scene meet in the middle.
- **Uniques** — grow the roster; decide the double-training-slot question.

## Far

- **Second cluster + second zone** — the architecture's first real test:
  should be data + one engine primitive, no rewrites.
- **Loot relevance narrowing** — the deliberately unsolved problem. Revisit
  only with real play data; hard filters and optimizer UI remain off the
  table per design philosophy.
