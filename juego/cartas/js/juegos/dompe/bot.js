// IA del Dompe: usa solo la vista. novato: voraz y poco atento; medio: compara descarte/mazo con una estimacion; experto: simulaciones de las manos rivales para decidir cuando dompear.
import { crearBaraja } from '../../marco/barajas.js';
import { mezclar, sig } from '../../marco/rng.js';
import { perfil, evaluar, mascara, valor, cmpClave, distancia } from './combos.js';

const quitar = (c, carta) => { const k = c.indexOf(carta); const o = c.slice(); if (k >= 0) o.splice(k, 1); return o; };
export function noVistas(v, mano) {
  const resto = crearBaraja(v.cfg.baraja, { comodines: v.cfg.baraja === 'fr52' && v.cfg.comodin ? 2 : 0 });
  const sacar = (c) => { const k = resto.indexOf(c); if (k >= 0) resto.splice(k, 1); };
  mano.forEach(sacar); v.vistos.forEach(sacar);
  if (v.descarte && !v.vistos.includes(v.descarte)) sacar(v.descarte);
  return resto;
}
function mejor(mano, Pf, gana, vetada) { // mejor valor al descartar una de las cartas
  let b = null;
  for (let k = 0; k < mano.length; k++) {
    if (mano.indexOf(mano[k]) !== k) continue;
    if (vetada && mano[k] === vetada && mano.filter((x) => x === vetada).length === 1) continue;
    const val = valor(quitar(mano, mano[k]), Pf, gana);
    if (!b || val > b.v) b = { c: mano[k], v: val };
  }
  return b;
}
export function probGanar(v, mano, Pf, rng, muestras) {
  const gana = v.cfg.gana, mk = mascara(gana), rivales = [];
  v.jug.forEach((p, k) => { if (k !== v.yo && p.st === 'activo') rivales.push(k); });
  const unseen = noVistas(v, mano), T = Math.min(Math.max(0, v.vuelta - 1), 5), miClave = evaluar(mano, Pf).clave;
  let pts = 0;
  for (let s = 0; s < muestras; s++) {
    const m = mezclar(unseen.slice(), rng); let q = 0, perdi = false, empate = false;
    for (const r of rivales) {
      let h = m.slice(q, q + 6); q += 6;
      for (let t = 0; t < T; t++) { const c = m[q++ % m.length]; const b = mejor(h.concat([c]), Pf, gana); h = quitar(h.concat([c]), b.c); }
      const c = m[q++ % m.length], h7 = h.concat([c]), b = mejor(h7, Pf, gana), fin = quitar(h7, b.c), ev = evaluar(fin, Pf);
      if (ev.props & mk) { perdi = true; break; }
      const k = cmpClave(ev.clave, miClave);
      if (k > 0) { perdi = true; break; } if (k === 0) empate = true;
    }
    if (!perdi) pts += empate ? 0.5 : 1;
  }
  return pts / muestras;
}
export function bot(v, i, nivel, rng, opt = {}) {
  const Pf = perfil(v.cfg), gana = v.cfg.gana, mk = mascara(gana), mano = v.jug[i].c;
  const azar = () => sig(rng);
  const L = v.legal; if (!L) return null;
  const muestras = opt.muestras || (nivel === 'experto' ? 24 : 8);
  if (L.sub === 'robar') {
    const top = v.descarte;
    if (!top) return { t: 'robar', de: 'mazo' };
    const actual = valor(mano, Pf, gana), conD = mano.concat([top]);
    const vD = evaluar(quitar(conD, top).concat([top]), Pf).props & mk ? 1e6 : mejor(conD, Pf, gana, top).v;
    if (vD >= 1e6) return { t: 'robar', de: 'descarte' };
    if (nivel === 'novato') return { t: 'robar', de: azar() < 0.2 ? (azar() < 0.5 ? 'descarte' : 'mazo') : vD > actual + 0.8 ? 'descarte' : 'mazo' };
    const unseen = nivel === 'experto' ? noVistas(v, mano) : crearBaraja(v.cfg.baraja, { comodines: v.cfg.baraja === 'fr52' && v.cfg.comodin ? 2 : 0 });
    const base = mezclar(unseen.slice(), rng).slice(0, muestras); let suma = 0;
    base.forEach((c) => { const h7 = mano.concat([c]); suma += evaluar(h7, Pf).props & mk ? 400 : mejor(h7, Pf, gana).v; });
    const vM = suma / Math.max(1, base.length);
    return { t: 'robar', de: vD > vM + (nivel === 'experto' ? 0.3 : 0.9) ? 'descarte' : 'mazo' };
  }
  // descartar (y decidir si se dompea)
  let b = mejor(mano, Pf, gana, v.tomada);
  if (nivel === 'novato' && azar() < 0.3) { const opc = mano.filter((c) => c !== v.tomada); b = { c: opc[Math.floor(azar() * opc.length)] }; }
  const fin = quitar(mano, b.c);
  const acc = { t: 'descartar', c: b.c };
  if (L.dompe && !(evaluar(fin, Pf).props & mk)) {
    const ev = evaluar(fin, Pf), sc = (c) => Pf.score[c];
    if (nivel === 'novato') { if (ev.clave[0] >= sc('dosPares') && azar() < 0.2) acc.dompe = true; }
    else if (nivel === 'medio') {
      const cerca = Math.min(...gana.map((g) => distancia(fin, g, Pf)));
      if (ev.clave[0] >= sc('tercia') && cerca >= 2 && azar() < 0.7) acc.dompe = true;
      else if (ev.clave[0] >= sc('dosPares') && v.vuelta >= 4 && azar() < 0.5) acc.dompe = true;
    } else {
      const p = probGanar(v, fin, Pf, rng, opt.muestras || 28), n = v.jug.filter((x) => x.st === 'activo').length;
      const cerca = Math.min(...gana.map((g) => distancia(fin, g, Pf)));
      const umbral = 0.48 + (v.cfg.penal > 0 ? Math.min(0.2, v.cfg.penal / Math.max(1, v.bote + 1)) : 0) + (cerca <= 1 ? 0.2 : 0);
      if (p >= umbral || (v.vuelta >= 12 && p >= 0.3 * (1 + 1 / n))) acc.dompe = true;
    }
  }
  return acc;
}
