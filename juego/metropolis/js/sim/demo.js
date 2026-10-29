// Ciudad de muestra para el fondo del título (no se guarda).
import * as C from './ciudad.js';
import { recalcular } from './recalculo.js';
import { ITEM } from './datos.js';
import { hash2 } from './util.js';

export function ciudadDemo(semilla) {
  const c = C.nuevaCiudad(semilla, 'Demo');
  c.parc.fill(0);
  for (let py = 2; py <= 5; py++) for (let px = 2; px <= 5; px++) c.parc[py * C.NP + px] = 1;
  c.dinero = 1e9; c.tier = 4;
  for (const t of ['avenidas', 'solar', 'rascacielos', 'educacion', 'medicina', 'depuradora', 'metro']) c.tech[t] = 1;
  const vias = [];
  for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) if (x % 5 === 1 || y % 5 === 1) vias.push([x, y]);
  C.trazarVia(c, vias, 'calle');
  const av = []; for (let x = 16; x < 48; x++) av.push([x, 31]); C.trazarVia(c, av, 'avenida');
  const zs = ['zonaR', 'zonaC', 'zonaI'];
  for (let k = 0; k < 3; k++) {
    const cs = [];
    for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) {
      if (c.via[y * C.N + x] || C.edifEn(c, x, y)) continue;
      const bx = Math.floor((x - 16) / 5), by = Math.floor((y - 16) / 5);
      const tipo = (bx + by * 2) % 7 < 3 ? 0 : (bx + by * 2) % 7 < 5 ? 1 : 2;
      if (tipo === k && hash2(x, y, 4) > 0.12) cs.push([x, y]);
    }
    C.zonificar(c, cs, zs[k]);
  }
  for (const b of c.edif.values()) if (b.t.startsWith('zona')) {
    const r = hash2(b.x, b.y, 8), d = Math.hypot(b.x - 32, b.y - 32);
    b.n = Math.max(1, Math.min(4, 1 + Math.floor((1 - d / 20) * 3 + r * 1.4)));
    if (b.t === 'zonaR') b.pop = 5 * b.n;
  }
  const poner = (id, x, y) => { const e = C.evaluarEdificio(c, ITEM[id], x, y); if (e.ok) C.construir(c, id, x, y); };
  poner('parque', 26, 32); poner('plaza', 37, 26); poner('eolica', 20, 20); poner('solar', 41, 41); poner('bomba', 22, 40);
  poner('torre', 40, 20); poner('carbon', 43, 44); poner('bomberos', 28, 38); poner('escuela', 36, 36); poner('universidad', 18, 34);
  poner('obelisco', 38, 31); poner('hospital', 24, 26); poner('estadio', 29, 18);
  c.undo.length = 0; c.fx.length = 0; c.notas.length = 0;
  recalcular(c);
  for (const b of c.edif.values()) { b.falta = false; b.sE = b.sA = b.sV = false; }
  return c;
}
