// Busqueda visual: encuentra el elemento distinto.
import { cursor } from './util.js';
const PARES = [['O', 'Q'], ['E', 'F'], ['M', 'N'], ['6', '9'], ['p', 'q'], ['b', 'd'], ['8', 'B'], ['C', 'G'], ['I', 'l'], ['m', 'n']];
export default {
  id: 'buscador', area: 'atencion', nombre: 'Ojo de lince', icono: '◎', desc: 'Encuentra el símbolo distinto entre muchos parecidos.',
  tutorial: ['Todos los símbolos son iguales menos uno. Tócalo; te lo marcamos al principio.', 'Más símbolos y más parecidos.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    function ensayo() {
      cx.zona.replaceChildren();
      const total = Math.min(36, 6 + Math.round(cx.nivel * 1.6)), cols = total <= 12 ? 4 : total <= 24 ? 5 : 6;
      const par = PARES[Math.min(PARES.length - 1, Math.floor((cx.nivel - 1) / 2))], inv = cx.rng.bool(), base = inv ? par[1] : par[0], raro = inv ? par[0] : par[1];
      const pos = cx.rng.int(0, total - 1);
      const rej = cx.h('div', { cls: 'rejilla busca', style: `--cols:${cols}` }); cx.zona.appendChild(rej);
      const btns = Array.from({ length: total }, (_, i) => { const b = cx.h('button', { type: 'button', cls: 'celda', 'data-f': 1, txt: i === pos ? raro : base, 'aria-label': 'Símbolo ' + (i + 1), on: { click: () => { if (e.hecho) return; e.hecho = true; cx.cancelar(e.to); cx.reportar(i === pos); btns[pos].classList.add('acierto'); cx.en(400, ensayo); } } }); rej.appendChild(b); return b; });
      e.cur = cursor(btns, cols); e.hecho = false; cx.resaltar(btns[pos]);
      cx.consigna('Toca el símbolo distinto');
      e.to = cx.en(cx.tx(cx.tut ? 60000 : 9000), () => { if (!e.hecho) { e.hecho = true; cx.reportar(false); btns[pos].classList.add('fallo'); cx.en(500, ensayo); } });
    }
    ensayo();
  },
  entrada(cx, a) { return cx.e.cur ? cx.e.cur.entrada(a) : false; }
};
