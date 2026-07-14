# Ringveil — Design

Working title. An incremental auto battler for mobile. The units are rings.

## Premise

You cross a veil into a demon dimension. Rings cannot be carried through —
they must be summoned across, and summoning costs from a pool (**Tether**)
that the far side barely lets you refill. At home, rings train themselves.

The overarching identity is the *architecture and feeling* — rings, the veil,
attunement, the two loops. Individual conceits (sound/resonance, whatever
comes next) live as **clusters** in the skill lattice and **zones** in the
demon realm. No single conceit is the game. Flavor rule: avoid traditional
status mechanics (burn, poison, etc.); invent world-specific ones per cluster.

## The two loops

**The Proving (training)** — expected to be the larger time commitment.
Continuous, uninterrupted auto-sparring. No Tether, no consequences beyond
opportunity cost. Capacity is a **flat per-ring slot count** (every ring
costs 1 regardless of rarity; gut thought, not commitment: uniques might
count 2). Rotation is *emergent from wear*: a ring spars until it drops,
cycles to the back, the next steps in. No wall-clock timers — accrual only.

**Hush expeditions (wearing battles)** — the payoff moment. The full cycle:

    queue → worn → discard

- Openers are paid from Tether on spawn. No free rides (balance).
- The **attunement window** caps concurrently worn ring power (rarity-
  weighted: one radiant ≈ several commons). A rolling window, not slots.
- **Tether** is spent per summon and is mostly gone for the fight. The pool
  IS your effective deck depth. Knell (kill-triggered restore) is the only
  sustain, deliberately rationed.
- Worn rings lose luster; at zero they go **dull → discard**: benched for
  the fight, never destroyed.
- Loss = nothing worn and nothing summonable.
- Attunement cost and Tether cost are **correlated but distinct** values
  that scale differently under affixes/effects.

Churn is the hidden economy: fragile boards bleed Tether through re-summons.
Durability protects your economy, not just your board.

## The Lattice (progression)

Resettable skill tree. **Nodes unlock primitives** — a mechanic does not
exist until its node is taken. Ring affixes then scale what's unlocked.
Respec is free: a respec should re-contextualize the whole collection
(hoarded off-build rings are latent value), never punish.

Nodes and affixes carry a **cluster tag**. Resonance is the *starting
cluster*: Fracture (threshold shatter, not a DoT — higher thresholds shatter
superlinearly harder), Echo (repeat attacks), Crescendo (banked release),
Knell (Tether on kill), Swell (training quota procs). Future clusters are
new constellations, paired loosely with future zones.

**The Foundry** is the permanent ratchet, separate from the Lattice: bought
with shards, never resets. Attunement cap, Tether pool, training slots.

**Swell / quota procs**: rolls on training rotation (death), never at spawn —
spawn only ever uses the regular quota. Additive % chance from tree nodes to
raise the quota for the next entrant; the bubble pops when that bonus
occupant rotates out. Churny many-basics rosters proc it more than all-unique
ones — an emergent strategy lever, not a targeted buff. Lives on the training
side; keeping it out of wearing battles protects the Tether economy.

## Itemization

PoE-style prefix/suffix, radically simplified for mobile. Two grades of
affix on purpose:

- **Stat boosts** (the floor): +damage, +luster, +aspect damage. Common,
  mildly useful, mostly fodder even on-theme.
- **Integer / new-dynamics affixes** (the tail): +1 echo repeat, +1 fracture
  threshold, +1 crescendo cap. Rare, build-warping when synergized. Rarity of
  the tail is the balance lever. Uniques are handcrafted members of this tail.

**Loot skew, never gate**: unlocked-primitive and attuned-aspect affixes roll
at 3× weight. Off-build affixes always remain possible.

**Auto-melt** applies at drop time only, below a player-set rarity threshold
(default: below Attuned). Owned/leveled rings are never auto-melted.

## Philosophies (binding)

- **Non-competitive balance.** Broken endgame builds are desired power
  fantasy. Even a bad player gets strong over time.
- **Low skill floor, long tail of not engaging.** Automation ships on and
  pre-configured; complex systems are optional optimization surface for
  players chasing the meta. "Automatically automated."
- **No optimizer UI.** No "you'd gain X by swapping" comparisons — objective
  evaluation deletes the thinking. Simple thinking preserved, not replaced.
- **No wall-clock gates.** Accrual timers (progress ticking up) are fine;
  waiting-to-act timers are not.
- **Aspects** (keen / deep / bright) are the neutral element axis. Clusters
  interpret them; zones assign weaknesses.

## Open questions

- **Loot relevance narrowing** — deliberately unsolved. Auto-filtered
  abundance vs. choice-skewed roll pools; hard filters collapse the loot
  game; graded relevance direction was shelved. Revisit with play data.
- **Crescendo banking order** — currently banks *after* striking, so a first
  release whiffs at ×0. Pre-bank vs post-bank changes the primitive's feel.
- **XP arrival** — engine XP is continuous; the Proving's strike beats are
  visual flavor. Making XP arrive per-strike is a real design fork.
- **Resurrection** — "summon from discard at discounted Tether" is fenced by
  the pool and probably safe as an archetype. Not yet built.
- **Mid-fight agency depth** — auto-pull ships default-on; manual summon
  exists. How much live decision the fight wants is untested.
- **Tether between fights** — currently resets full per expedition. Persist
  as semi-scarce resource? Untested.
- **Unique training cost** — count double? Depends whether unique leveling
  matters enough for the tax to bind.
- **Offline training** — the save stores state only; rings train only while
  the game is open. Whether time away should grant training (capped? at what
  efficiency?) is undecided — it pulls between "rings train on their own"
  and the no-wall-clock philosophy. Decide before mobile players decide
  for us.
- **Ring acquisition beyond drops** — the home side never grows the
  collection; a forge/gacha mechanic was sketched (melt↔forge symmetry,
  pity meter) and deliberately parked for its own discussion.
