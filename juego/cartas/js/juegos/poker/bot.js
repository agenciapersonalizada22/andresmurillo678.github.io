// IA de poker: solo usa vista(estado, asiento), asi que no puede ver cartas ocultas. Niveles: novato, medio, experto.
import { crearBaraja, parse } from '../../marco/barajas.js';
import { ent, sig } from '../../marco/rng.js';
import { evaluar, PERFILES, categoria } from './evaluador.js';

const MUESTRAS = { novato: 0, medio: 50, experto: 220 };
const FUERZA_CAT = [0.32, 0.52, 0.7, 0.78, 0.85, 0.88, 0.94, 0.98, 1];

function fuerzaPreflop(mano, pr) {
  const n = pr.orden.length, r = mano.map((c) => pr.orden.indexOf(parse(c).v)), s = mano.map((c) => parse(c).p);
  const hi = Math.max(r[0], r[1]) / (n - 1), lo = Math.min(r[0], r[1]) / (n - 1);
  let f = 0.18 + 0.42 * hi + 0.2 * lo;
  if (r[0] === r[1]) f = 0.5 + 0.5 * hi;
  else { if (s[0] === s[1]) f += 0.05; if (Math.abs(r[0] - r[1]) <= 2) f += 0.04; }
  return Math.min(0.97, f);
}
function rapida(v, mano, pr) {
  if (v.com.length < 3) return fuerzaPreflop(mano, pr);
  return FUERZA_CAT[categoria(evaluar(mano.concat(v.com), pr), pr)];
}
// Monte Carlo ligero: reparte al azar cartas desconocidas a los rivales y completa la mesa
export function equidad(v, i, rng, muestras) {
  const pr = PERFILES[v.baraja] || PERFILES.fr52, mano = v.jug[i].c;
  const rivales = v.jug.filter((p, k) => k !== i && (p.st === 'act' || p.st === 'allin')).length;
  if (!rivales) return 1;
  if (!muestras) return rapida(v, mano, pr);
  const conocidas = new Set(mano.concat(v.com));
  const mazo = crearBaraja(v.baraja).filter((c) => !conocidas.has(c)), faltan = 5 - v.com.length, k = rivales * 2 + faltan;
  let gana = 0;
  for (let s = 0; s < muestras; s++) {
    for (let a = 0; a < k; a++) { const b = a + ent(rng, mazo.length - a); const t = mazo[a]; mazo[a] = mazo[b]; mazo[b] = t; }
    const mesa = v.com.concat(mazo.slice(0, faltan)), mio = evaluar(mano.concat(mesa), pr);
    let mejor = -1, empates = 0;
    for (let r = 0; r < rivales; r++) {
      const sc = evaluar([mazo[faltan + 2 * r], mazo[faltan + 2 * r + 1]].concat(mesa), pr);
      if (sc > mejor) { mejor = sc; empates = 1; } else if (sc === mejor) empates++;
    }
    gana += mio > mejor ? 1 : mio === mejor ? 1 / (empates + 1) : 0;
  }
  return gana / muestras;
}

export function bot(v, i, nivel, rng, opts = {}) {
  const L = v.legal; if (!L) return null;
  const rivales = v.jug.filter((p, k) => k !== i && (p.st === 'act' || p.st === 'allin')).length;
  const muestras = opts.muestras != null ? opts.muestras : (MUESTRAS[nivel] != null ? MUESTRAS[nivel] : 50);
  const ruido = nivel === 'novato' ? 0.16 : nivel === 'medio' ? 0.05 : 0.015;
  const eq = equidad(v, i, rng, muestras) + (sig(rng) - 0.5) * 2 * ruido;
  const pot = v.bote, falta = L.falta, req = L.aIgualar / (pot + L.aIgualar || 1);
  const r = sig(rng), umbral = 0.52 + 0.07 * Math.max(0, rivales - 1);
  const subir = (frac) => {
    if (!L.raise) return L.call ? { t: 'call' } : { t: 'check' };
    let to = Math.round(v.ap + frac * (pot + falta));
    to = Math.max(L.minTo, Math.min(L.maxTo, to));
    if (to >= L.allinTo * 0.65) to = L.allinTo;
    return to >= L.allinTo ? { t: 'allin' } : { t: 'raise', a: to };
  };
  if (falta === 0) {
    if (eq > umbral + 0.08 && r < 0.9) return subir(0.45 + Math.min(0.6, (eq - umbral)));
    if (nivel === 'experto' && L.raise && r > 0.9 && rivales <= 2 && eq > 0.3) return subir(0.6);
    if (nivel === 'novato' && L.raise && r > 0.93) return subir(0.5);
    return { t: 'check' };
  }
  const gordo = L.aIgualar >= (L.allinTo - (v.jug[i].ap)) * 0.9; // pone casi toda la pila
  if (eq > 0.8 && L.raise && r < 0.85) return subir(0.6 + (eq - 0.8) * 2);
  if (eq > req + (nivel === 'novato' ? 0 : 0.04) + (gordo ? 0.08 : 0)) return { t: 'call' };
  if (nivel === 'novato' && r < 0.12) return { t: 'call' };
  if (nivel === 'experto' && L.raise && r < 0.04 && rivales <= 1) return subir(0.9);
  return { t: 'fold' };
}
