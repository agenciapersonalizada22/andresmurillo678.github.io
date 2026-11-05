// Evaluador de manos de poker (5 a 7+ cartas) para barajas de 52, 48 y 40. Devuelve un entero comparable.
import { parse } from '../../marco/barajas.js';

const ORD = (vs) => vs.concat([1]); // el as al final (mas alto) y tambien bajo en la rueda
export const PERFILES = {
  fr52: { orden: ORD([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]), colorGanaFull: false },
  es48: { orden: ORD([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), colorGanaFull: false },
  es40: { orden: ORD([2, 3, 4, 5, 6, 7, 10, 11, 12]), colorGanaFull: true }, // con 40 cartas el color es mas raro que el full
};
export const CATEGORIAS = ['Carta alta', 'Pareja', 'Doble pareja', 'Trio', 'Escalera', 'Color', 'Full', 'Poker', 'Escalera de color'];

const cacheMapa = {};
function mapa(perfil) {
  if (cacheMapa[perfil.orden.join()]) return cacheMapa[perfil.orden.join()];
  const m = {}; perfil.orden.forEach((v, i) => { m[v] = i; });
  return (cacheMapa[perfil.orden.join()] = m);
}
const SUIT = { S: 0, H: 1, D: 2, C: 3, o: 0, c: 1, e: 2, b: 3 };

// mejor racha de 5 en una mascara de rangos (bit i = rango i; el as, rango n-1, cuenta tambien como bajo). Devuelve rango mas alto o -1
function racha5(mask, n) {
  const ext = (mask << 1) | ((mask >> (n - 1)) & 1);
  let run = 0, mejor = -1;
  for (let p = 0; p <= n; p++) {
    if ((ext >> p) & 1) { run++; if (run >= 5) mejor = p - 1; } else run = 0;
  }
  return mejor;
}
const pack = (cat, k) => { let s = cat; for (let i = 0; i < 5; i++) s = s * 16 + (k[i] || 0); return s; };

// cartas: lista de codigos. perfil: PERFILES[...]. Los comodines no se admiten en poker.
export function evaluar(cartas, perfil) {
  const n = perfil.orden.length, m = mapa(perfil), cnt = new Array(n).fill(0), masks = [0, 0, 0, 0], sc = [0, 0, 0, 0];
  for (let i = 0; i < cartas.length; i++) {
    const c = parse(cartas[i]), r = m[c.v], s = SUIT[c.p];
    cnt[r]++; masks[s] |= 1 << r; sc[s]++;
  }
  const fl = perfil.colorGanaFull ? 6 : 5, fu = perfil.colorGanaFull ? 5 : 6;
  let palo = -1;
  for (let s = 0; s < 4; s++) if (sc[s] >= 5) palo = s;
  if (palo >= 0) {
    const t = racha5(masks[palo], n);
    if (t >= 0) return pack(8, [t]);
  }
  const quads = [], trios = [], pares = [], solos = [];
  for (let r = n - 1; r >= 0; r--) {
    if (cnt[r] >= 4) quads.push(r); else if (cnt[r] === 3) trios.push(r); else if (cnt[r] === 2) pares.push(r); else if (cnt[r] === 1) solos.push(r);
  }
  const resto = (...usados) => {
    const out = [];
    for (let r = n - 1; r >= 0; r--) if (cnt[r] && usados.indexOf(r) < 0) out.push(r);
    return out;
  };
  if (quads.length) return pack(7, [quads[0], resto(quads[0])[0]]);
  const tr2 = trios.length > 1 ? trios[1] : pares.length ? pares[0] : -1;
  const full = trios.length && tr2 >= 0 ? pack(fu === 6 ? 6 : 5, [trios[0], tr2]) : -1;
  let color = -1;
  if (palo >= 0) {
    const ks = []; for (let r = n - 1; r >= 0 && ks.length < 5; r--) if ((masks[palo] >> r) & 1) ks.push(r);
    color = pack(fl, ks);
  }
  // el orden entre color y full depende de la baraja: se devuelve el mayor
  const mejorFC = Math.max(full, color);
  if (mejorFC >= 0) return mejorFC;
  let all = 0; for (let r = 0; r < n; r++) if (cnt[r]) all |= 1 << r;
  const e = racha5(all, n);
  if (e >= 0) return pack(4, [e]);
  if (trios.length) return pack(3, [trios[0]].concat(resto(trios[0]).slice(0, 2)));
  if (pares.length >= 2) return pack(2, [pares[0], pares[1], resto(pares[0], pares[1])[0]]);
  if (pares.length === 1) return pack(1, [pares[0]].concat(resto(pares[0]).slice(0, 3)));
  return pack(0, solos.slice(0, 5));
}
// los codigos de categoria dependen del perfil (color/full se intercambian en es40)
export function categoria(score, perfil) {
  const c = Math.floor(score / 1048576);
  if (perfil && perfil.colorGanaFull && (c === 5 || c === 6)) return c === 5 ? 6 : 5;
  return c;
}
export const nombreMano = (score, perfil) => CATEGORIAS[categoria(score, perfil)];
