// IA de Ve a pescar. novato: pide al azar; medio: pide el numero que mas repite y recuerda lo que pidieron; experto: recuerda lo pedido, lo entregado y los libros para acertar mas.
import { sig } from '../../marco/rng.js';
import { parse } from '../../marco/barajas.js';

const rango = (c) => parse(c).v;
// reconstruye lo que se sabe de las manos ajenas a partir del historial publico
export function creencias(hist, n) {
  const sabe = Array.from({ length: n }, () => new Set()), no = Array.from({ length: n }, () => new Set());
  for (const ev of hist) {
    if (ev.k === 'pide') {
      sabe[ev.por].add(ev.r); no[ev.por].delete(ev.r);
      if (ev.n > 0) { sabe[ev.a].delete(ev.r); } else { sabe[ev.a].delete(ev.r); no[ev.a].add(ev.r); }
    } else if (ev.k === 'libro') { sabe[ev.por].delete(ev.r); }
    else if (ev.k === 'pesca' && ev.ok) { sabe[ev.por].add(ev.r); no[ev.por].delete(ev.r); }
    else if (ev.k === 'pesca') { /* carta desconocida: lo que se sabia de "no" pierde certeza */ no[ev.por].clear(); }
    else if (ev.k === 'vacia') { no[ev.por].clear(); }
  }
  return { sabe, no };
}
export function bot(v, i, nivel, rng) {
  const L = v.legal; if (!L) return null;
  if (L.sub === 'pescar') return { t: 'pescar' };
  const azar = () => sig(rng), mano = v.jug[i].c, cnt = {};
  mano.forEach((c) => { cnt[rango(c)] = (cnt[rango(c)] || 0) + 1; });
  const rangos = L.rangos, objs = L.objetivos;
  if (nivel === 'novato') return { t: 'pedir', a: objs[Math.floor(azar() * objs.length)], r: rangos[Math.floor(azar() * rangos.length)] };
  if (nivel === 'medio') {
    const mx = Math.max(...rangos.map((r) => cnt[r])), mejores = rangos.filter((r) => cnt[r] === mx), { sabe } = creencias(v.hist, v.jug.length);
    const r = mejores[Math.floor(azar() * mejores.length)], conocidos = objs.filter((s) => sabe[s].has(r));
    const pool = conocidos.length ? conocidos : objs;
    return { t: 'pedir', a: pool[Math.floor(azar() * pool.length)], r };
  }
  // experto: puntua cada (objetivo, numero)
  const { sabe, no } = creencias(v.hist, v.jug.length), libro = v.cfg.libro;
  const vistos = {}; v.jug.forEach((p) => p.libros.forEach((r) => { vistos[r] = true; }));
  let mejor = null;
  for (const r of rangos) for (const s of objs) {
    let pr = sabe[s].has(r) ? 0.92 : no[s].has(r) ? 0.04 : Math.min(0.6, 0.25 + 0.05 * v.jug[s].n);
    const falta = libro - cnt[r];
    let valor = pr * (1 + cnt[r] * 0.6 + (falta <= 1 ? 2.5 : 0)) + (1 - pr) * 0.15 * (v.mazo > 0 ? 1 : 0);
    valor += azar() * 0.05;
    if (!mejor || valor > mejor.v) mejor = { t: 'pedir', a: s, r, v: valor };
  }
  return { t: 'pedir', a: mejor.a, r: mejor.r };
}
