// Bots: prueban lanzamientos candidatos con la propia fisica y aplican error segun su habilidad (0..1).
import { P, nuevaSim, correr, mascara, contar } from './fisica.js';
import { BOLAS } from './catalogo.js';

const gauss = () => { let s = 0; for (let k = 0; k < 4; k++) s += Math.random(); return (s - 2) * 1.7; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function decidir(layout, hab, bolaId) {
  const bola = BOLAS.find((b) => b.id === bolaId) || BOLAS[0];
  const cand = 3 + Math.round(hab * 30), mitad = layout.length <= 7;
  let mejor = null, mp = -1;
  for (let k = 0; k < cand; k++) {
    let x = (Math.random() - 0.5) * 0.8, ang = (Math.random() - 0.5) * 0.05, w = (Math.floor(Math.random() * 5) - 2) / 2;
    if (mitad && layout.length) { // spare: apunta a un pino en pie
      const t = layout[Math.floor(Math.random() * layout.length)], tx = t.x != null ? t.x : 0;
      x = clamp(tx * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.3, -0.42, 0.42); ang = clamp((tx - x) / P.Z1, -0.04, 0.04); w = (Math.floor(Math.random() * 3) - 1) * 0.5;
    }
    const prm = { x, ang, v: 8 + Math.random() * 2, w, dt: 1 / 120 };
    const s = nuevaSim(layout, prm, bola); correr(s);
    const n = contar(mascara(s)) + (contar(mascara(s)) === layout.length ? 5 : 0);
    if (n > mp) { mp = n; mejor = prm; }
  }
  const e = 1 - hab, ruido = 0.012 + 0.11 * e * e + 0.04 * e;
  return {
    x: clamp(mejor.x + gauss() * ruido, -0.43, 0.43), ang: clamp(mejor.ang + gauss() * (0.0015 + 0.012 * e), -0.07, 0.07),
    v: clamp(mejor.v + gauss() * (0.2 + 1.2 * e), 5.5, 11), w: clamp(mejor.w + gauss() * 0.25 * e, -1, 1)
  };
}
