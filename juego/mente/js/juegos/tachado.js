// Tachado rapido: toca todos los simbolos objetivo lo mas rapido posible (cancelacion).
import { cursor } from './util.js';
const PARES = [['O', ['Q', 'C', 'D']], ['E', ['F', 'L', 'T']], ['M', ['N', 'W', 'H']], ['b', ['d', 'p', 'q']], ['8', ['B', '3', '6']], ['I', ['l', '1', 'J']]];
export default {
  id: 'tachado', area: 'velocidad', nombre: 'Tachado rápido', icono: '✔', desc: 'Toca todos los símbolos objetivo cuanto antes, sin equivocarte.',
  tutorial: ['Toca cada símbolo igual al objetivo de arriba. Te los marcamos.', 'Más símbolos y más parecidos.', 'Prueba final: completa 3 tableros sin errores.'],
  init(cx) {
    const e = cx.e;
    function ensayo() {
      cx.zona.replaceChildren();
      const par = PARES[Math.min(PARES.length - 1, Math.floor((cx.nivel - 1) / 3.4))], objetivo = par[0];
      const total = Math.min(36, 12 + Math.floor(cx.nivel * 1.2)), cols = 6, nObj = Math.min(14, 4 + Math.floor(cx.nivel / 2));
      const pos = new Set(cx.rng.muestra(Array.from({ length: total }, (_, i) => i), nObj));
      cx.consigna('Toca todas las «' + objetivo + '» (' + nObj + ')');
      const rej = cx.h('div', { cls: 'rejilla busca', style: `--cols:${cols}` }); cx.zona.appendChild(rej);
      let quedan = nObj, malos = 0; e.hecho = false;
      const btns = Array.from({ length: total }, (_, i) => { const es = pos.has(i); const b = cx.h('button', { type: 'button', cls: 'celda', 'data-f': 1, txt: es ? objetivo : cx.rng.pick(par[1]), 'aria-label': (es ? 'Objetivo ' : 'Símbolo ') + (i + 1), on: { click: () => tocar(i, b) } }); if (es) cx.resaltar(b); rej.appendChild(b); return b; });
      e.cur = cursor(btns, cols);
      function tocar(i, b) {
        if (e.hecho || b.disabled) return;
        if (pos.has(i)) { b.disabled = true; b.classList.add('acierto'); b.textContent = '✓'; quedan--; cx.sonido.clic(); if (!quedan) { e.hecho = true; cx.reportar(malos === 0); cx.en(500, ensayo); } }
        else { malos++; b.classList.add('fallo'); cx.sonido.mal(); cx.vibrar(40); }
      }
    }
    ensayo();
  },
  entrada(cx, a) { return cx.e.cur ? cx.e.cur.entrada(a) : false; }
};
