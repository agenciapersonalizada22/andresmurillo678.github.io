// IA de bots con 3 niveles. Solo usan la vista de su asiento (nunca el mazo real) y una memoria propia.
import { T, MAZO, N_TIPOS, clasificar, mismoEquipo, esGato } from './reglas.js';

export const NIVELES = [
  { id: 0, nombre: 'Gatito', retardo: [1100, 2200], nope: [650, 1200], pNope: 0.25 },
  { id: 1, nombre: 'Callejero', retardo: [800, 1700], nope: [500, 1000], pNope: 0.65 },
  { id: 2, nombre: 'Maestro', retardo: [650, 1400], nope: [380, 800], pNope: 0.92 }
];
export const nuevaMemoria = () => ({ bombPos: null, jugadas: 0, turnoSeq: -1 });

export function observar(mem, e) {
  if (e.t === 'robo') { if (e.bomba) mem.bombPos = null; else if (mem.bombPos != null) mem.bombPos--; if (mem.bombPos != null && mem.bombPos < 0) mem.bombPos = null; }
  else if (e.t === 'barajo') mem.bombPos = null;
  else if (e.t === 'reinserta' && !e.pd) mem.bombPos = null;
  else if (e.t === 'turno') mem.jugadas = 0;
}

const cuenta = (mano, t) => mano.filter((c) => MAZO[c] === t);
const primera = (mano, t) => mano.find((c) => MAZO[c] === t);
const tieneT = (mano, t) => mano.some((c) => MAZO[c] === t);
const pick = (a, az) => a[Math.floor(az() * a.length)];

function rivales(v) {
  const r = [];
  for (let j = 0; j < v.n; j++) if (j !== v.yo && v.vivo[j] && !mismoEquipo(v.equipo, v.yo, j)) r.push(j);
  return r;
}
function sigRival(v, desde) {
  for (let k = 1; k <= v.n; k++) { const x = (desde + k) % v.n; if (v.vivo[x]) return x; }
  return desde;
}
const masCartas = (v, lista) => lista.slice().sort((a, b) => v.conteos[b] - v.conteos[a])[0];

/* Riesgo de que la proxima carta sea bomba: siempre hay (vivos - 1) bombas en el mazo. */
function riesgo(v, mem) {
  if (v.futuro && v.futuro.length) return MAZO[v.futuro[0]] === T.BOMBA ? 1 : 0;
  if (mem.bombPos === 0) return 1;
  const vivos = v.vivo.filter(Boolean).length;
  let p = (vivos - 1) / Math.max(1, v.nMazo);
  if (mem.bombPos != null && mem.bombPos > 0) p = Math.min(p, 0.02);
  return Math.min(1, p);
}

export function decidir(v, mem, nivel, az) {
  const yo = v.yo, mano = v.mano;
  if (v.fase === 'favor') return { t: 'dar', carta: darCarta(v, nivel, az) };
  if (v.fase === 'bomba') return { t: 'reinsertar', pos: posBomba(v, mem, nivel, az, v.pend) };
  if (v.fase !== 'turno' || v.turno !== yo) return null;
  const robar = { t: 'robar' };
  if (mem.jugadas >= (nivel === 0 ? 1 : 3)) return robar;
  const defusa = tieneT(mano, T.DESACTIVAR), rv = rivales(v);
  const r = riesgo(v, mem);
  const ataque = primera(mano, T.ATAQUE), saltar = primera(mano, T.SALTAR), barajar = primera(mano, T.BARAJAR), futuro = primera(mano, T.FUTURO), favor = primera(mano, T.FAVOR);
  const jug = (c, extra) => { mem.jugadas++; return { t: 'jugar', carta: c, ...extra }; };
  const objFavor = () => masCartas(v, rv.filter((j) => v.conteos[j] > 0));
  const hayObjFavor = rv.some((j) => v.conteos[j] > 0);

  if (nivel === 0) {
    if (az() < 0.3) {
      const op = [ataque, saltar, barajar, futuro].filter((x) => x != null);
      if (favor != null && hayObjFavor) op.push(favor);
      if (op.length) { const c = pick(op, az); return MAZO[c] === T.FAVOR ? jug(c, { obj: pick(rv.filter((j) => v.conteos[j] > 0), az) }) : jug(c); }
    }
    return robar;
  }

  /* nivel 1 y 2 */
  const peligro = nivel === 2 ? (defusa ? 0.55 : 0.2) : (defusa ? 0.7 : 0.3);
  if (r >= 0.99 && !defusa || (r >= peligro && r < 0.99)) {
    // evitar el robo
    if (r >= 0.99 && !defusa) {
      if (saltar != null) return jug(saltar);
      if (ataque != null) return jug(ataque);
      if (barajar != null) return jug(barajar);
    } else if (r >= peligro) {
      if (nivel === 2 && futuro != null && !v.futuro && mem.bombPos == null) return jug(futuro);
      if (saltar != null && (nivel === 2 || az() < 0.7)) return jug(saltar);
      if (ataque != null && (nivel === 2 || az() < 0.5)) return jug(ataque);
      if (barajar != null && r < 0.99 && az() < 0.4) return jug(barajar);
    }
  }
  if (r >= 0.99 && defusa) return robar; // se desactiva
  if (nivel === 2 && futuro != null && !v.futuro && mem.bombPos == null && az() < 0.8) return jug(futuro);
  if (r === 0 || (v.futuro && v.futuro.length && MAZO[v.futuro[0]] !== T.BOMBA)) {
    if (favor != null && hayObjFavor && az() < 0.7) return jug(favor, { obj: objFavor() });
    if (nivel === 2 && ataque != null && v.futuro && az() < 0.25) return jug(ataque);
  }
  if (favor != null && hayObjFavor && mano.length <= 4 && az() < (nivel === 2 ? 0.8 : 0.45)) return jug(favor, { obj: objFavor() });
  // combos
  if (v.cfg.combos) {
    const objetivo = rv.filter((j) => v.conteos[j] > 0);
    const gruposT = [];
    for (let t = T.NOPE; t < N_TIPOS; t++) { const c = cuenta(mano, t); if (c.length >= 2) gruposT.push(c); }
    const grande = mano.length >= (nivel === 2 ? 6 : 7);
    if (gruposT.length && objetivo.length && (grande || az() < 0.25)) {
      const g = gruposT.sort((a, b) => b.length - a.length).filter((x) => nivel === 2 ? esGato(MAZO[x[0]]) || x.length >= 3 : true)[0];
      if (g) {
        mem.jugadas++;
        const o = masCartas(v, objetivo);
        if (g.length >= 3 && nivel === 2 && !defusa) return { t: 'combo', cartas: g.slice(0, 3), obj: o, pedir: T.DESACTIVAR };
        return { t: 'combo', cartas: g.slice(0, 2), obj: o };
      }
    }
    const distintos = []; const vistos = new Set();
    for (const c of mano) { const t = MAZO[c]; if (!vistos.has(t) && t !== T.DESACTIVAR) { vistos.add(t); distintos.push(c); } }
    if (distintos.length >= 5 && mano.length >= 8) {
      const cinco = distintos.slice(0, 5);
      const util = v.desc.filter((c) => !cinco.includes(c) && MAZO[c] !== T.BOMBA);
      const pref = util.find((c) => MAZO[c] === T.DESACTIVAR) ?? util.find((c) => MAZO[c] === T.SALTAR) ?? util.find((c) => MAZO[c] === T.ATAQUE) ?? util[0];
      if (pref != null) { mem.jugadas++; return { t: 'combo', cartas: cinco, pedir: pref }; }
    }
  }
  return robar;
}

function valor(v, c, mano) {
  const t = MAZO[c];
  if (t === T.DESACTIVAR) return 100;
  const base = { [T.NOPE]: 60, [T.SALTAR]: 55, [T.ATAQUE]: 50, [T.FUTURO]: 35, [T.FAVOR]: 30, [T.BARAJAR]: 25 }[t];
  if (base != null) return base;
  return 5 + (cuenta(mano, t).length >= 2 ? 25 : 0);
}
function darCarta(v, nivel, az) {
  const mano = v.mano;
  if (nivel === 0) return pick(mano, az);
  const ord = mano.slice().sort((a, b) => valor(v, a, mano) - valor(v, b, mano));
  const quien = v.pend ? v.pend.j : -1;
  if (nivel === 2 && quien >= 0 && mismoEquipo(v.equipo, v.yo, quien)) { const d = cuenta(mano, T.DESACTIVAR); if (d.length >= 2) return d[0]; return ord[0]; }
  return nivel === 1 && az() < 0.3 ? pick(ord.slice(0, 3), az) : ord[0];
}
function posBomba(v, mem, nivel, az, pend) {
  const m = v.nMazo; // antes de insertar
  if (nivel === 0) return Math.floor(az() * (m + 1));
  if (v.rest > 1) { const p = Math.min(m, Math.max(2, Math.floor(m * (0.5 + az() * 0.5)))); mem.bombPos = p; return p; }
  if (nivel === 1) { const p = Math.min(m, Math.floor(az() * 3)); mem.bombPos = p; return p; }
  // Maestro: que la robe un rival, no yo ni un companero
  let p = 0;
  for (let k = 0, quien = v.turno; k <= m; k++) {
    quien = sigRival(v, quien);
    if (quien !== v.yo && !mismoEquipo(v.equipo, v.yo, quien)) { p = k; break; }
  }
  p = Math.min(m, p + (az() < 0.35 ? v.vivo.filter(Boolean).length : 0));
  mem.bombPos = p; void pend;
  return p;
}

/* Hace falta un nope? Devuelve true si el bot decide anular (o contra-anular). */
export function decidirNope(v, mem, nivel, az) {
  const p = v.pend; if (!p || v.fase !== 'nope' || !tieneT(v.mano, T.NOPE)) return false;
  const yo = v.yo, resuelve = p.nopes.length % 2 === 0;
  const amigo = (j) => j === yo || mismoEquipo(v.equipo, yo, j);
  let danio = false, util = false;
  if (p.kind === 'carta') {
    if (p.t === T.ATAQUE) danio = amigo(sigRival(v, p.j)) && !amigo(p.j);
    else if (p.t === T.FAVOR) danio = amigo(p.obj) && !amigo(p.j);
    else if (amigo(p.j)) util = true;
  } else if (p.kind === 'cinco') util = amigo(p.j);
  else danio = amigo(p.obj) && !amigo(p.j);
  if (amigo(p.j) && p.kind !== 'carta') util = true;
  if (amigo(p.j) && p.kind === 'carta' && (p.t === T.ATAQUE || p.t === T.FAVOR)) util = true;
  const quiero = (resuelve && danio) || (!resuelve && util && !danio);
  if (!quiero) return nivel === 2 && resuelve && p.kind === 'carta' && p.t === T.FUTURO && !amigo(p.j) && az() < 0.08;
  if (nivel === 2 && p.nopes.length >= 3 && az() < 0.5) return false;
  return az() < NIVELES[nivel].pNope;
}
export { clasificar };
