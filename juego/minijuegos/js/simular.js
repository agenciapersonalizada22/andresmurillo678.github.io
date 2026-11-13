// Contexto de juego y simulacion sin pantalla (usada para bots contra bots y para las pruebas de Node). Sin DOM.
import { azar } from './util.js';
import { repartir } from './zonas.js';

export const entVacia = () => ({ dx: 0, dy: 0, wx: 0, wy: 0, a: false, b: false, aP: false, bP: false, aN: 0, bN: 0, izqP: false, derP: false, arrP: false, abaP: false });
export function armarCtx(parts, W, H, extra = {}) {
  const semilla = extra.semilla != null ? extra.semilla : (Math.random() * 4294967296) >>> 0;
  const nop = () => {};
  return {
    n: parts.length, W, H, jug: parts, zonas: extra.zonas || repartir(parts.length, W, H, 'auto'), semilla, rnd: azar(semilla),
    prac: !!extra.prac, reducir: !!extra.reducir, brillo: extra.brillo !== false,
    fx: Object.assign({ snd: nop, vib: nop, chispas: nop, chispasZ: nop }, extra.fx || {})
  };
}
export function simular(juego, parts, o = {}) {
  const W = o.W || 390, H = o.H || 700, dt = o.dt || 1 / 30, max = o.max || 240;
  const c = armarCtx(parts, W, H, o), inst = juego.crear(c), ent = parts.map(entVacia);
  let t = 0;
  while (!inst.fin && t < max) {
    if (o.humano) o.humano(ent, t, inst);
    inst.update(dt, ent); t += dt;
    ent.forEach((e) => { e.aN = e.bN = 0; e.aP = e.bP = e.izqP = e.derP = e.arrP = e.abaP = false; });
  }
  return { pts: inst.pts.slice(), t, fin: !!inst.fin, inst };
}
