// Seleccion de la sesion diaria (5 juegos). Algoritmo (se explica al jugador en la app):
// 1) Debilidad de cada area = que tan por debajo de TU propia media de areas esta tu indice (area sin datos = maxima).
// 2) Frescura = dias desde que entrenaste el area (7 dias o mas = maxima).
// 3) Peso = 0.65*debilidad + 0.35*frescura + 0.05.
// 4) Reparto de los 5 cupos por divisores (D'Hondt) con maximo 2 por area: peso/(cupos+1). Asi las areas debiles
//    reciben mas, pero casi siempre entrenas 4-5 areas distintas.
// 5) Dentro de cada area se eligen los juegos menos recientes; el orden evita dos juegos del mismo area seguidos.
import { crearRng } from '../azar.js';
const acotar = (x, a, b) => Math.max(a, Math.min(b, x));
export function pesosAreas(areas, estado, hoyNum) {
  const ids = areas.map((a) => a.id);
  const idx = ids.map((id) => (estado.areas[id] || {}).idx).filter((v) => typeof v === 'number');
  const media = idx.length ? idx.reduce((a, b) => a + b, 0) / idx.length : 0;
  return ids.map((id) => {
    const s = estado.areas[id] || {};
    const debil = typeof s.idx !== 'number' ? 1 : acotar(0.5 + (media - s.idx) / Math.max(100, media), 0.1, 1);
    const fresco = s.ultimoDia == null ? 1 : acotar((hoyNum - s.ultimoDia) / 7, 0, 1);
    return { id, debil, fresco, peso: 0.65 * debil + 0.35 * fresco + 0.05 };
  });
}
export function elegir({ areas, juegosPorArea, estado, hoyNum, semilla, n = 5, maxPorArea = 2 }) {
  const rng = crearRng(semilla);
  const pesos = pesosAreas(areas, estado, hoyNum);
  const cupos = {};
  pesos.forEach((p) => { cupos[p.id] = 0; });
  const total = Math.min(n, areas.length * maxPorArea);
  for (let k = 0; k < total; k++) {
    let mejor = null, mejorV = -1;
    for (const p of rng.barajar(pesos)) {
      if (cupos[p.id] >= maxPorArea) continue;
      const v = p.peso / (cupos[p.id] + 1);
      if (v > mejorV + 1e-9) { mejorV = v; mejor = p; }
    }
    cupos[mejor.id]++;
  }
  const elegidos = [];
  for (const p of pesos) {
    const lista = rng.barajar(juegosPorArea[p.id] || []).sort((a, b) => ((estado.juegos[a] || {}).ultima || 0) - ((estado.juegos[b] || {}).ultima || 0));
    lista.slice(0, cupos[p.id]).forEach((id) => elegidos.push({ id, area: p.id }));
  }
  const orden = [];
  const resto = rng.barajar(elegidos);
  while (resto.length) {
    const ultimo = orden.length ? orden[orden.length - 1].area : null;
    let i = resto.findIndex((e) => e.area !== ultimo);
    if (i < 0) i = 0;
    orden.push(resto.splice(i, 1)[0]);
  }
  const razones = pesos.filter((p) => cupos[p.id] > 0).map((p) => ({
    area: p.id, cupos: cupos[p.id], debil: Math.round(p.debil * 100), fresco: Math.round(p.fresco * 100), peso: Math.round(p.peso * 100) / 100
  }));
  return { juegos: orden.map((e) => e.id), areas: orden.map((e) => e.area), cupos, razones };
}
