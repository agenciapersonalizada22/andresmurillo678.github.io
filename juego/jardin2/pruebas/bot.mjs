// Bot sencillo que juega niveles con el motor puro (para balance).
import * as M from '../js/motor.js';
import { P, IDS_P, Z, FILAS, COLS } from '../js/datos.js';
const PREF_TIRO = ['rafaga', 'trebol', 'doblebrote', 'brote', 'espina', 'escarcha', 'bumeran', 'arpon', 'eco', 'veneno', 'magma', 'prisma', 'rayo', 'ballesta'];
export function elegirSemillas(hechos, n = 6) {
  const ok = (id) => !P[id].g && hechos >= P[id].u;
  const sel = []; const add = (id) => { if (ok(id) && !sel.includes(id) && sel.length < n) sel.push(id); };
  ['chispera', 'luciernaga'].forEach(add); const t = PREF_TIRO.filter(ok); t.slice(0, 2).forEach(add);
  ['roble', 'petardo', 'nenufar', 'escarcha', 'mina', 'pinchos'].forEach(add); PREF_TIRO.forEach(add); return sel;
}
export function jugar(niv, o = {}) {
  const semillas = niv.semillasFijas || o.semillas || elegirSemillas(o.hechos || 0, o.slots || 6);
  const s = M.crear({ niv, seed: o.seed || 7, semillas: niv.cintaPool ? [] : semillas, tienda: {}, dif: o.dif || 'normal', potenc: o.potenc, bonusCh: o.bonusCh });
  const dt = 0.1; let n = 0, tk = 0;
  const prods = semillas.filter((i) => P[i].k === 'prod'), tiros = semillas.filter((i) => ['tira', 'lob', 'rayo', 'tormenta'].includes(P[i].k));
  while (!s.fin && s.t < 600) {
    M.paso(s, dt); s.ev.length = 0; tk += dt; if (tk < 0.3) continue; tk = 0;
    M.recogerTodo(s); if (o.dump && Math.abs(s.t - o.dump) < 0.16) console.log(JSON.stringify(s.zombis.filter(M.vivo).map((z) => ({ r: z.r, x: z.x, hp: z.hp, fr: z.fr, cong: z.cong, at: z.at, dorm: z.dorm, inv: z.inv, fase: z.fase, com: z.comiendo, pl: s.plantas.filter((p) => p.r === z.r).map((p) => p.id + p.c + ':' + Math.round(p.hp)) }))));
    if (o.trace && Math.floor(s.t) % 10 === 0 && Math.abs(s.t - Math.round(s.t)) < 0.31) console.log(s.t.toFixed(0), 'ch', s.ch, s.plantas.map((p) => p.id.slice(0, 2) + p.r + p.c).join(' '), '|', s.zombis.filter(M.vivo).map((z) => z.r + '@' + z.x.toFixed(1)).join(' '));
    const cuenta = (f) => s.plantas.filter(f).length;
    const accion = () => {
      const colocarCarta = (i, r, c) => { const k = s.cartas[i]; if (!k) return false; if (!s.cinta && (k.listo > s.t || s.ch < k.coste)) return false; return M.plantar(s, i, r, c); };
      const idxDe = (id) => s.cartas.findIndex((k) => k.id === id);
      const conZ = [...Array(FILAS).keys()].filter((r) => M.hayZombiFila(s, r, 0));
      const nProd = cuenta((p) => p.k === 'prod');
      // cinta: planta lo que haya
      if (s.cinta) { for (let i = 0; i < s.cartas.length; i++) { const id = s.cartas[i].id, k = P[id].k; const rows = conZ.length ? conZ : [2]; for (const r of rows) for (let c = (k === 'muro' ? 4 : k === 'tira' ? 2 : 1); c < COLS - 2; c++) if (M.puedePlantar(s, id, r, c) && (k !== 'bomba' || conZ.includes(r)) && !(k !== 'mina' && k !== 'bomba' && M.plantaEn(s, r, c))) { if (M.plantar(s, i, r, c)) return true; } } return false; }
      const nec = (n.maxProd || 4);
      if (prods.length && nProd < 5 && s.t < 120) { for (let c = 0; c < 3; c++) for (let r = 0; r < FILAS; r++) for (const id of prods) { const i = idxDe(id); if (i >= 0 && M.puedePlantar(s, id, r, c) && s.ch >= s.cartas[i].coste && s.cartas[i].listo <= s.t) { if (M.plantar(s, i, r, c)) return true; } } }
      const amen = (r) => Math.min(99, ...s.zombis.filter((z) => z.r === r && M.golpeable(z)).map((z) => z.x));
      const orden = [...Array(FILAS).keys()].sort((a, b) => amen(a) - amen(b));
      for (const pasada of [1, 2, 3]) for (const r of orden) {
        const agua = M.celda(s, r, 3).ter === 'agua';
        if (agua) { const j = idxDe('nenufar'); for (let c = 2; c < 6; c++) { if (j >= 0 && M.puedePlantar(s, 'nenufar', r, c)) { const cl = M.celda(s, r, c); if (!cl.base && !cl.p && colocarCarta(j, r, c)) return true; } } }
        const nT = cuenta((p) => p.r === r && ['tira', 'lob', 'rayo', 'tormenta'].includes(p.k));
        if ((conZ.includes(r) || s.t > 25) && nT < pasada && (pasada < 2 || conZ.includes(r) || s.t > 90)) for (const id of tiros) { const i = idxDe(id); if (i < 0) continue; for (let c = 1 + nT; c < 6; c++) if (M.puedePlantar(s, id, r, c)) { if (colocarCarta(i, r, c)) return true; break; } }
      }
      for (const r of conZ) {
        const zs = s.zombis.filter((z) => z.r === r && M.golpeable(z)); const front = Math.min(...zs.map((z) => z.x));
        const mu = idxDe('roble'); if (mu >= 0 && front < 6.5 && !s.plantas.some((p) => p.r === r && p.k === 'muro')) for (let c = 5; c >= 3; c--) if (M.puedePlantar(s, 'roble', r, c) && colocarCarta(mu, r, c)) return true;
        const pe = idxDe('petardo'); if (pe >= 0 && zs.length >= 2 && front < 5) { for (let c = 3; c < 8; c++) if (Math.abs(c + 0.5 - front) < 1.2 && M.puedePlantar(s, 'petardo', r, c) && colocarCarta(pe, r, c)) return true; }
      }
      // mejora
      for (const p of s.plantas) if (p.nv < 3 && s.ch > 400 && (p.k === 'tira') && M.mejorar(s, p)) return true;
      return false;
    };
    for (let q = 0; q < 3; q++) if (!accion()) break;
    if (s.en > 0 && s.zombis.filter(M.vivo).length >= 4) { const cand = s.plantas.filter((p) => P[p.id].en && !p.tmp && ['tira', 'lob', 'rayo', 'bomba'].includes(p.k) || p.k === 'muro').filter((p) => M.puedeEnergia(s, p)); if (cand.length) M.energia(s, cand[0]); }
  }
  return { s, fin: s.fin, t: s.t, perdidas: s.st.perdidas, pulsos: s.st.pulsos, semillas };
}
