/* Headless sanity: engines are DOM-free by design, so we can sim them in node. */
import { Expedition } from './game/expedition';
import { parseSave, serialize } from './game/persist';
import { generateRing } from './game/rings';
import { buyNode, fold, newGame } from './game/state';
import { Training } from './game/training';

const st = newGame(1234);
st.shards = 500;

// buy the resonance cluster to exercise every primitive path
for (const id of ['fracture', 'echo', 'crescendo', 'knell', 'swell_1', 'attune_deep', 'vigor']) {
  if (!buyNode(st, id)) throw new Error(`could not buy ${id}`);
}

// seed a real roster including a unique
for (let i = 0; i < 4; i++) st.rings.push(generateRing(1, fold(st), st.rng));
st.rings.push(generateRing(2, fold(st), st.rng));
st.rings.push(generateRing(4, fold(st), st.rng));
st.loadout = st.rings.map((r) => r.id);

const training = new Training(st);
let rotations = 0;
let swells = 0;
training.events.on((e) => {
  if (e.t === 'rotate') rotations++;
  if (e.t === 'swell') swells++;
});
for (let i = 0; i < 600; i++) training.tick();
if (rotations === 0) throw new Error('training never rotated');

const ex = new Expedition(st, st.rings);
let shatters = 0;
let knells = 0;
let echoes = 0;
let summons = 0;
ex.events.on((e) => {
  if (e.t === 'shatter') shatters++;
  if (e.t === 'knell') knells++;
  if (e.t === 'attack' && e.echo) echoes++;
  if (e.t === 'summon') summons++;
});
let ticks = 0;
while (!ex.over && ticks++ < 3000) ex.tick();
if (summons === 0) throw new Error('no rings were ever summoned');
if (ex.wave < 2) throw new Error(`expedition died on wave ${ex.wave} — tuning is off`);

// persistence round-trip: the save must reproduce the state, RNG stream included
const restored = parseSave(JSON.stringify(serialize(st)));
if (!restored) throw new Error('save did not parse back');
if (restored.rings.length !== st.rings.length) throw new Error('rings lost in round-trip');
if (restored.latticeOwned.join() !== st.latticeOwned.join()) throw new Error('lattice lost in round-trip');
if (Math.floor(restored.shards) !== Math.floor(st.shards)) throw new Error('shards lost in round-trip');
if (restored.rng.next() !== st.rng.next()) throw new Error('rng stream diverged after restore');
if (parseSave('{"v":999}') !== null || parseSave('not json') !== null) throw new Error('bad saves must yield null');

console.log(
  JSON.stringify(
    {
      training: { rotations, swells, topLevel: Math.max(...st.rings.map((r) => r.level)) },
      expedition: { waves: ex.wave, ticks, shatters, knells, echoes, discard: ex.discard.length, shards: ex.shardsEarned, drops: ex.drops.length },
    },
    null,
    2,
  ),
);
console.log('SMOKE OK');
