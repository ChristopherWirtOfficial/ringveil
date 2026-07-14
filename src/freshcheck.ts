import { Expedition } from './game/expedition';
import { newGame } from './game/state';
const results: number[] = [];
for (let seed = 1; seed <= 20; seed++) {
  const st = newGame(seed);
  const rings = st.loadout.map((id) => st.rings.find((r) => r.id === id)!);
  const ex = new Expedition(st, rings);
  let t = 0;
  while (!ex.over && t++ < 2000) ex.tick();
  results.push(ex.wave);
}
console.log('fresh-start waves over 20 seeds:', results.join(','), '| avg', (results.reduce((a,b)=>a+b,0)/results.length).toFixed(1));
