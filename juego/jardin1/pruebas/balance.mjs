import { nivelAventura } from '../js/niveles.js';
import { plantasDe } from '../js/datos.js';
import { jugarBot } from './bot.mjs';
const ids = process.argv.slice(2);
for (const id of ids) {
  const [w, n] = id.split('-').map(Number), i = (w - 1) * 10 + n;
  const done = new Set(); for (let k = 1; k < i; k++) done.add(k);
  const pl = plantasDe(done);
  const pref = ['giras', 'dispa', 'hielo', 'nogal', 'cereza', 'lirio', 'melon', 'mina', 'pincho', 'maceta'];
  const sem = pref.filter((p) => pl.includes(p)).slice(0, 8); if (i === 1) sem.splice(0, 9, 'dispa');
  for (const dif of ['facil', 'normal', 'desafiante']) { const r = jugarBot(nivelAventura(w, n), sem, { dif }); console.log(id, dif, r.fin, 't=' + r.t.toFixed(0), 'cort=' + r.cort, 'mat=' + r.matados, sem.join(',')); }
}
