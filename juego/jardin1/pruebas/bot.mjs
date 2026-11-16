// Bot sencillo para balance: juega un nivel con el motor puro.
import * as M from '../js/motor.js';
import { P, FILAS } from '../js/datos.js';

export function jugarBot(niv, semillas, o = {}) {
  const s = M.crear({ nivel: niv, semillas, dif: o.dif || 'normal', seed: o.seed || 7, tienda: o.tienda });
  const tiene = (id) => semillas.includes(id);
  const idxCarta = (id) => semillas.indexOf(id);
  const cuenta = (id) => s.plantas.filter((p) => p.id === id).length;
  const intenta = (id, r, c) => { const i = idxCarta(id); if (i < 0) return false; if (M.cartaListaEn(s, i) > 0 || s.sol < P[id].c) return false; if (!M.puedePlantarEn(s, id, r, c)) return false; return M.plantar(s, i, r, c).ok; };
  const base = (r) => (s.celdas[r * 9].agua ? 'agua' : s.niv.tejado ? 'tejado' : null);
  const poner = (id, r, c) => { const cel = s.celdas[r * 9 + c]; if (!cel.base && (cel.agua || s.niv.tejado) && !cel.p) { const b = cel.agua ? 'lirio' : 'maceta'; if (tiene(b)) { if (M.cartaListaEn(s, idxCarta(b)) <= 0) return intenta(b, r, c); } return false; } return intenta(id, r, c); };
  const dt = 0.1; let n = 0; const rows = [2, 1, 3, 0, 4];
  while (!s.fin && s.t < (o.max || 1500)) {
    M.recogerTodo(s);
    const hay = (r) => s.zombis.some((z) => !z.hip && z.estado !== 'muere' && z.r === r && z.x < 9.4);
    const sinTiro = (r) => !s.plantas.some((p) => p.r === r && P[p.id].t === 'tiro' && p.c >= 2);
    const giras = () => { for (const c of [0, 1]) for (const r of rows) { if (s.celdas[r * 9].agua) continue; if (poner('giras', r, c)) return true; } return false; };
    let hecho = false;
    for (const r of rows) if (hay(r) && sinTiro(r)) { poner('dispa', r, 2); hecho = true; break; }
    if (!hecho && tiene('giras') && cuenta('giras') < 2) hecho = giras();
    if (!hecho) for (const r of rows) if (sinTiro(r)) { if (poner('dispa', r, 2)) { hecho = true; break; } }
    if (!hecho && tiene('giras') && cuenta('giras') < Math.min(9, 2 + Math.floor(s.t / 40))) giras();
    const todasTiro = rows.every((r) => !sinTiro(r));
    if (!hecho && todasTiro) for (const r of rows) { if (s.plantas.filter((p) => p.r === r && P[p.id].t === 'tiro').length < 2 + Math.floor(s.t / 90)) { let ok = false; for (const c of [3, 4, 5]) if (poner(tiene('hielo') && c === 3 && r % 2 ? 'hielo' : 'dispa', r, c)) { ok = true; break; } if (ok) break; } }
    if (!hecho && tiene('nogal')) for (const r of rows) { if (hay(r) && !sinTiro(r) && !s.plantas.some((p) => p.r === r && p.id === 'nogal')) { poner('nogal', r, 5); hecho = true; break; } }
    if (tiene('cereza')) { for (const r of rows) { const g = s.zombis.filter((z) => z.r === r && z.x < 8 && z.x > 3 && z.estado !== 'muere').length; if (g >= 2 && intenta('cereza', r, Math.min(8, Math.floor(s.zombis.find((z) => z.r === r).x) + 0))) break; } }
    M.paso(s, dt); n++;
  }
  return { fin: s.fin, t: s.t, soles: s.stats.soles, plantadas: s.stats.plantadas, cort: s.stats.cortadoras, matados: s.stats.matados, s };
}
