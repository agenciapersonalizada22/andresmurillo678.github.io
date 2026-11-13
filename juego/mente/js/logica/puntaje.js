// Puntuacion y normalizacion. Sin baremos poblacionales: todo se compara con tu propio historial.
export const NIVEL_A_INDICE = 50; // indice de area (0..1000) = nivel estimado medio x 50
export const MIN_HISTORIAL = 5;
export const puntosEnsayo = (nivel, racha) => Math.round(10 + nivel * 4 + Math.min(racha, 10) * 2);
export const suavizar = (previo, nuevo, a = 0.4) => (previo == null ? nuevo : Math.round((previo * (1 - a) + nuevo * a) * 100) / 100);
export function percentil(valor, historial) {
  const n = historial.length;
  if (n < MIN_HISTORIAL) return { pct: null, n, calibrando: true };
  let menos = 0, iguales = 0;
  for (const v of historial) { if (v < valor) menos++; else if (v === valor) iguales++; }
  return { pct: Math.round(((menos + iguales / 2) / n) * 100), n, calibrando: false };
}
export function indiceArea(ratings) {
  const v = ratings.filter((x) => typeof x === 'number' && isFinite(x));
  if (!v.length) return null;
  return Math.min(1000, Math.max(0, Math.round((v.reduce((a, b) => a + b, 0) / v.length) * NIVEL_A_INDICE)));
}
export function medalla(nivelEst) { return nivelEst >= 14 ? 'oro' : nivelEst >= 9 ? 'plata' : nivelEst >= 5 ? 'bronce' : null; }
export const monedasPartida = (puntos) => Math.max(1, Math.min(25, Math.floor(puntos / 80)));
// Racha diaria: dias consecutivos con sesion diaria completada. `dias` = lista 'AAAA-MM-DD'; `hoy` = 'AAAA-MM-DD'.
const num = (s) => { const [a, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(a, m - 1, d) / 86400000); };
export const diaNum = num;
export function rachaActual(dias, hoy) {
  const set = new Set(dias.map(num));
  let d = num(hoy);
  if (!set.has(d)) d -= 1; // si hoy aun no jugaste, la racha de ayer sigue viva
  let n = 0;
  while (set.has(d)) { n++; d--; }
  return n;
}
export function mejorRacha(dias) {
  const v = Array.from(new Set(dias.map(num))).sort((a, b) => a - b);
  let mejor = 0, act = 0, prev = null;
  for (const d of v) { act = prev !== null && d === prev + 1 ? act + 1 : 1; mejor = Math.max(mejor, act); prev = d; }
  return mejor;
}
