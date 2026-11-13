// Logica pura de partidas: puntos por puesto, modos (rapido, elegir, mejor de N, torneo de 10) y duelos. Sin DOM.
import { puestos } from './util.js';

const TABLA = { 1: [1], 2: [3, 0], 3: [3, 1, 0], 4: [4, 2, 1, 0] };
export function puntosRonda(places) {
  const n = places.length, t = TABLA[n] || TABLA[4];
  return places.map((p) => {
    const iguales = places.filter((q) => q === p).length;
    let s = 0; for (let k = 0; k < iguales; k++) s += t[Math.min(p - 1 + k, t.length - 1)];
    return Math.floor(s / iguales);
  });
}
export const objetivoVictorias = (N) => Math.floor(N / 2) + 1;
export const MODOS = ['rapido', 'elegir', 'mejorde', 'torneo'];

export function crear(modo, parts, o) {
  const n = parts.length, ids = o.catalogo || [], rnd = o.rnd || Math.random;
  const baraja = (l) => { const r = l.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const T = { v: 1, modo, parts, N: 1, juegos: [], ronda: 0, pts: Array(n).fill(0), vic: Array(n).fill(0), hist: [], fin: false, campeones: [], catalogo: ids };
  if (modo === 'rapido') { T.juegos = [baraja(ids)[0]]; }
  else if (modo === 'elegir') { T.N = o.N || 1; T.juegos = Array(T.N).fill(o.juego); }
  else if (modo === 'mejorde') { T.N = o.N || 3; T.juegos = baraja(ids).slice(0, T.N); while (T.juegos.length < T.N) T.juegos.push(baraja(ids)[0]); }
  else { T.N = Math.min(10, ids.length); T.juegos = baraja(ids).slice(0, T.N); }
  return T;
}
export const juegoActual = (T) => T.juegos[T.ronda] || null;
export const total = (T) => (T.modo === 'torneo' ? T.juegos.length : T.modo === 'rapido' ? 1 : T.N);

function cerrar(T) {
  const n = T.parts.length, mx = Math.max(...T.vic), mp = Math.max(...T.pts);
  if (T.modo === 'torneo' || T.modo === 'rapido') {
    const cand = T.modo === 'rapido' ? T.hist[0].places.map((p, i) => (p === 1 ? i : -1)).filter((i) => i >= 0) : [...Array(n).keys()].filter((i) => T.pts[i] === mp);
    const mv = Math.max(...cand.map((i) => T.vic[i]));
    T.campeones = cand.filter((i) => T.vic[i] === mv);
  } else {
    const cand = [...Array(n).keys()].filter((i) => T.vic[i] === mx);
    const mpc = Math.max(...cand.map((i) => T.pts[i]));
    T.campeones = cand.filter((i) => T.pts[i] === mpc);
  }
  T.fin = true;
}
/* Registra el resultado de la ronda (places: puesto de cada participante). Devuelve los puntos de torneo ganados. */
export function registrar(T, places) {
  const pr = puntosRonda(places);
  pr.forEach((p, i) => { T.pts[i] += p; if (places[i] === 1 && places.length > 1) T.vic[i]++; });
  T.hist.push({ juego: T.juegos[T.ronda], places, pts: pr });
  T.ronda++;
  if (T.modo === 'rapido') cerrar(T);
  else if (T.modo === 'torneo') { if (T.ronda >= T.juegos.length) cerrar(T); }
  else {
    const obj = objetivoVictorias(T.N), mx = Math.max(...T.vic);
    const lider = T.vic.filter((v) => v === mx).length === 1;
    if (mx >= obj && (lider || T.ronda >= T.N + 3)) cerrar(T);
    else if (T.ronda >= T.N && (lider || T.ronda >= T.N + 3)) cerrar(T);
    else if (T.ronda >= T.juegos.length) {
      if (T.modo === 'elegir') T.juegos.push(T.juegos[0]);
      else { const c = T.catalogo.filter((x) => x !== T.juegos[T.juegos.length - 1]); T.juegos.push(c[Math.floor(Math.random() * c.length)] || T.juegos[0]); }
    }
  }
  return pr;
}
/* Ronda de un juego de 2 jugadores con 3-4 participantes: duelos (3: todos contra todos; 4: semifinales y final). */
export async function porDuelos(n, jugarDuelo) {
  const gana = async (a, b) => { const r = await jugarDuelo(a, b); return r[0] === r[1] ? (Math.random() < 0.5 ? [a, b] : [b, a]) : (r[0] > r[1] ? [a, b] : [b, a]); };
  if (n === 3) {
    const w = [0, 0, 0];
    for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) { const [g] = await gana(a, b); w[g]++; }
    return puestos(w);
  }
  const [w1, l1] = await gana(0, 1), [w2, l2] = await gana(2, 3), [w, l] = await gana(w1, w2);
  const pl = Array(4).fill(3); pl[w] = 1; pl[l] = 2;
  void l1; void l2;
  return pl;
}
export function clasificacion(T) {
  return T.parts.map((p, i) => ({ i, pts: T.pts[i], vic: T.vic[i] })).sort((a, b) => b.pts - a.pts || b.vic - a.vic);
}
