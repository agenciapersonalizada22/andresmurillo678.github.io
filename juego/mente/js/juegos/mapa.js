// Memoria espacial: recuerda que casillas se marcaron.
import { cursor } from './util.js';
export default {
  id: 'mapa', area: 'memoria', nombre: 'Mapa de puntos', icono: '▦', desc: 'Observa qué casillas se marcan y tócalas de memoria.',
  tutorial: ['Se marcan algunas casillas con un punto. Memorízalas y luego tócalas.', 'Más casillas y la cuadrícula crece.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    function ensayo() {
      cx.zona.replaceChildren();
      const n = cx.nivel < 6 ? 3 : cx.nivel < 13 ? 4 : 5, k = Math.min(Math.floor(n * n / 2.2), 2 + Math.floor(cx.nivel / 2.6));
      const rej = cx.h('div', { cls: 'rejilla celdas', style: `--cols:${n}` }); cx.zona.appendChild(rej);
      const meta = new Set(cx.rng.muestra(Array.from({ length: n * n }, (_, i) => i), k)), sel = new Set();
      e.bloq = true; e.hecho = false;
      const btns = Array.from({ length: n * n }, (_, i) => { const b = cx.h('button', { type: 'button', cls: 'celda', 'data-f': 1, 'aria-label': 'Casilla ' + (i + 1), on: { click: () => tocar(i) } }); rej.appendChild(b); return b; });
      e.cur = cursor(btns, n);
      btns.forEach((b, i) => { if (meta.has(i)) b.textContent = '●'; });
      cx.consigna('Memoriza las ' + k + ' casillas');
      meta.forEach((i) => cx.resaltar(btns[i]));
      cx.en(cx.tx(1000 + k * 450), () => { btns.forEach((b) => { b.textContent = ''; b.classList.remove('pista'); }); e.bloq = false; cx.consigna('Toca las ' + k + ' casillas'); });
      function tocar(i) {
        if (e.bloq || e.hecho || sel.has(i)) return;
        sel.add(i); btns[i].textContent = '●'; btns[i].classList.add('marcada'); cx.sonido.clic();
        if (sel.size < k) return;
        e.hecho = true;
        const ok = [...sel].every((x) => meta.has(x));
        btns.forEach((b, j) => { if (meta.has(j)) { b.textContent = '●'; b.classList.add(sel.has(j) ? 'acierto' : 'fallo'); } else if (sel.has(j)) { b.textContent = '✗'; b.classList.add('fallo'); } });
        cx.reportar(ok); cx.en(1000, ensayo);
      }
    }
    ensayo();
  },
  entrada(cx, a) { return cx.e.cur ? cx.e.cur.entrada(a) : false; }
};
