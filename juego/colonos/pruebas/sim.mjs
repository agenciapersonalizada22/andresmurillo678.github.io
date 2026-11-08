import { Mesa, relojVirtual } from '../js/mesa.js';
const niveles = process.argv[2] ? process.argv[2].split(',').map(Number) : [0,1,2,2];
const radio = +(process.argv[3]||2);
let ganadores = {}, turnos = [];
for (let s = 1; s <= (+process.argv[4]||5); s++) {
  const reloj = relojVirtual();
  const as = niveles.map((n, i) => ({ nombre: 'B' + i, color: '#fff', tipo: 'bot', nivel: n }));
  const m = new Mesa({ cfg: { radio, meta: 10 }, asientos: as, semilla: s * 7919, reloj, escala: 0.01 });
  m.iniciar();
  for (let k = 0; k < 400 && !m.est.fin; k++) reloj.avanzar(60000);
  const e = m.est;
  const g = e.fin ? e.fin.ganador : -1;
  ganadores[g] = (ganadores[g] || 0) + 1; turnos.push(e.numTurno);
  console.log('semilla', s, 'fin', g, 'turnos', e.numTurno, 'pts', e.fin ? e.fin.pts.join(',') : '-', 'fase', e.fase);
}
console.log(ganadores, 'media turnos', turnos.reduce((a,b)=>a+b,0)/turnos.length);
