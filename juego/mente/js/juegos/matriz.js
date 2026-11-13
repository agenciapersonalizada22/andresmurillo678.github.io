// Matrices de patrones 3x3: elige la pieza que completa la matriz (formas, relleno y cantidad; sin depender del color).
import { generar, esCorrecta } from '../logica/matrices.js';
const FORMA = [(c) => `<circle cx="${c.x}" cy="${c.y}" r="${c.r}"`, (c) => `<rect x="${c.x - c.r}" y="${c.y - c.r}" width="${c.r * 2}" height="${c.r * 2}"`, (c) => `<polygon points="${c.x},${c.y - c.r} ${c.x + c.r},${c.y + c.r} ${c.x - c.r},${c.y + c.r}"`];
const REL = ['fill="none" stroke="currentColor" stroke-width="3"', 'fill="currentColor"', 'fill="url(#rayas)" stroke="currentColor" stroke-width="3"'];
export function dibujar(c) {
  if (!c) return '<svg viewBox="0 0 60 60"><text x="30" y="42" text-anchor="middle" font-size="36" fill="currentColor">?</text></svg>';
  const n = c.cantidad + 1, r = n === 1 ? 17 : n === 2 ? 12 : 9;
  const pos = n === 1 ? [[30, 30]] : n === 2 ? [[19, 30], [41, 30]] : [[30, 17], [17, 43], [43, 43]];
  const figs = pos.map(([x, y]) => FORMA[c.forma]({ x, y, r }) + ' ' + REL[c.relleno] + '/>' ).join('');
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><defs><pattern id="rayas" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="currentColor"/></pattern></defs>${figs}</svg>`;
}
const NOMBRE_F = ['círculo', 'cuadrado', 'triángulo'], NOMBRE_R = ['vacío', 'lleno', 'rayado'];
const aria = (c) => (c.cantidad + 1) + ' ' + NOMBRE_F[c.forma] + ' ' + NOMBRE_R[c.relleno];
export default {
  id: 'matriz', area: 'logica', nombre: 'Matrices', icono: '▦', desc: 'Descubre la regla de filas y columnas y elige la pieza que falta.',
  tutorial: ['Cada fila y columna sigue una regla (forma, relleno o cantidad). Elige la pieza que falta.', 'Más atributos cambian a la vez.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const m = generar(cx.rng, cx.nivel);
      const cel = m.visibles.map((c) => c).concat([null]);
      const rej = cx.h('div', { cls: 'matriz' }, cel.map((c) => { const d = cx.h('div', { cls: 'mcel', 'aria-label': c ? aria(c) : 'pieza que falta' }); d.innerHTML = dibujar(c); return d; }));
      cont.replaceChildren(rej);
      cx.consigna('¿Qué pieza falta?');
      const inst = cx.opciones(m.opciones.map((o) => { const d = cx.h('div', { cls: 'mcel op-fig' }); d.innerHTML = dibujar(o); return { nodo: d, aria: aria(o) }; }), (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar(esCorrecta(m, i)); cx.en(450, ensayo); }, { cols: m.opciones.length <= 4 ? 4 : 3, cls: 'figuras', destino: cont });
      cx.resaltar(inst.btns[m.correcta]);
      e.to = cx.en(cx.tx(cx.tut ? 90000 : Math.max(7000, 20000 - cx.nivel * 500)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(300, ensayo); } });
    }
    ensayo();
  }
};
