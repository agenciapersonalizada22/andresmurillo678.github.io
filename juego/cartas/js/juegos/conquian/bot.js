// IA del Conquian: usa solo la vista. novato: a veces no baja y descarta al azar; medio: baja todo lo posible y descarta lo menos util;
// experto: ademas evita descartar cartas que los rivales pueden añadir a las combinaciones de la mesa y recuerda los descartes.
import { sig } from '../../marco/rng.js';
import { perfil, mejorPlan, puedeAgregarA, elegirDescarte, COMODIN } from './melds.js';

export function planVista(v, i, forzada, conTop) {
  const P = perfil(v.cfg), mano = v.jug[i].c.slice();
  if (conTop) mano.push(v.descarte);
  const plan = mejorPlan(mano, v.melds, P, { modoAgregar: v.cfg.agregar, yo: i, forzada });
  return { plan, mano, P };
}
export function sugerencia(v, i) { // para la ayuda de la interfaz: primer paso recomendado
  const L = v.legal; if (!L) return null;
  const P = perfil(v.cfg), mano = v.jug[i].c;
  if (L.sub === 'robar') {
    if (L.puedeTomar) { const t = tomar(v, i); if (t) return { tipo: 'tomar', accion: t, texto: 'Toma el descarte: te sirve para una combinación' }; }
    return { tipo: 'robar', accion: { t: 'robar' }, texto: 'Roba del mazo' };
  }
  const { plan } = planVista(v, i, null, false);
  if (plan.pasos.length) { const p = plan.pasos[0]; return { tipo: p.t, accion: p, texto: p.t === 'bajar' ? 'Baja estas cartas como combinación nueva' : 'Añade esta carta a una combinación de la mesa' }; }
  const d = elegirDescarte(mano, P, v.vistos.concat(...v.melds.map((m) => m.c)), null);
  return d ? { tipo: 'descartar', accion: { t: 'descartar', c: d.c }, texto: 'Descarta la carta menos útil' } : null;
}
function tomar(v, i) {
  const base = mejorPlan(v.jug[i].c, v.melds, perfil(v.cfg), { modoAgregar: v.cfg.agregar, yo: i }).cubre;
  const { plan, mano } = planVista(v, i, v.jug[i].c.length, true);
  if (!plan || plan.cubre < base + 1) return null;
  const top = v.descarte;
  for (const p of plan.pasos) {
    if (p.t === 'bajar' && p.cartas.includes(top)) { const cs = p.cartas.slice(); cs.splice(cs.indexOf(top), 1); return { t: 'tomar', cartas: cs, m: null }; }
    if (p.t === 'agregar' && p.cartas.includes(top)) return { t: 'tomar', cartas: [], m: p.m };
  }
  void mano; return null;
}
export function bot(v, i, nivel, rng) {
  const L = v.legal; if (!L) return null;
  const azar = () => sig(rng);
  if (L.sub === 'robar') {
    if (L.puedeTomar && !(nivel === 'novato' && azar() < 0.4)) { const t = tomar(v, i); if (t) return t; }
    return { t: 'robar' };
  }
  const P = perfil(v.cfg), mano = v.jug[i].c;
  let { plan } = planVista(v, i, null, false);
  if (nivel === 'novato' && plan.cubre < mano.length && azar() < 0.35) plan = { pasos: [], resto: mano.slice(), cubre: 0 };
  const pasos = plan.pasos.slice(), resto = plan.resto;
  if (!resto.length) return { t: 'plan', pasos };
  if (resto.length === 1 && !v.cfg.ganarDescarte) return { t: 'plan', pasos: pasos.concat([{ t: 'pasar' }]) };
  const ocultas = v.vistos.concat(...v.melds.map((m) => m.c));
  let vet = [];
  if (nivel === 'experto') vet = resto.filter((c) => c !== COMODIN && v.melds.some((m) => m.due !== i && puedeAgregarA(m, [c], P, v.cfg.agregar, -1)));
  if (vet.length >= resto.length) vet = [];
  let d;
  if (nivel === 'novato' && azar() < 0.4) d = { c: resto[Math.floor(azar() * resto.length)] };
  else d = elegirDescarte(resto, P, nivel === 'novato' ? null : ocultas, vet);
  pasos.push({ t: 'descartar', c: d.c });
  return { t: 'plan', pasos };
}
