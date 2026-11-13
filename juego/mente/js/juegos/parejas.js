// Memoria visual: encuentra todas las parejas con el menor numero de intentos.
import { cursor, SIMBOLOS } from './util.js';
export default {
  id: 'parejas', area: 'memoria', nombre: 'Parejas', icono: '▣', desc: 'Voltea las cartas y encuentra todas las parejas con pocos intentos.', esc: { subir: 1 },
  tutorial: ['Toca dos cartas para voltearlas. Si son iguales se quedan. Verás una vista previa y la pista.', 'Un tablero algo mayor: recuerda dónde está cada símbolo.', 'Prueba final: completa 3 tableros.'],
  init(cx) {
    const e = cx.e;
    function ensayo() {
      cx.zona.replaceChildren();
      const pares = Math.min(10, 3 + Math.floor(cx.nivel / 2.4)), cols = pares <= 4 ? 3 : pares <= 6 ? 4 : 5;
      const sim = cx.rng.muestra(SIMBOLOS, pares), cartas = cx.rng.barajar([...sim, ...sim]);
      const rej = cx.h('div', { cls: 'rejilla', style: `--cols:${cols}` }); cx.zona.appendChild(rej);
      const info = cx.h('p', { cls: 'nota' }); cx.zona.appendChild(info);
      e.abiertas = []; e.hechas = 0; e.intentos = 0; e.bloq = true;
      const btns = cartas.map((s, i) => {
        const b = cx.h('button', { type: 'button', cls: 'carta', 'data-f': 1, 'aria-label': 'Carta ' + (i + 1), on: { click: () => voltear(i) } }, cx.h('span', { txt: '?' }));
        rej.appendChild(b); return b;
      });
      const cur = cursor(btns, cols); e.cur = cur;
      const mostrar = (i, v) => { btns[i].classList.toggle('abierta', v); btns[i].firstChild.textContent = v ? cartas[i] : '?'; btns[i].setAttribute('aria-label', v ? 'Carta ' + (i + 1) + ': ' + cartas[i] : 'Carta ' + (i + 1)); };
      const previa = cx.nivel < 12 || cx.tut;
      if (previa) { cartas.forEach((_, i) => mostrar(i, true)); cx.consigna('Memoriza…'); }
      cx.en(previa ? cx.tx(900 + pares * 220) : 50, () => { cartas.forEach((_, i) => mostrar(i, false)); e.bloq = false; cx.consigna('Encuentra las parejas'); info.textContent = 'Intentos: 0'; });
      function voltear(i) {
        if (e.bloq || e.abiertas.includes(i) || btns[i].classList.contains('hecha')) return;
        mostrar(i, true); e.abiertas.push(i); cx.sonido.clic();
        if (e.abiertas.length < 2) return;
        e.intentos++; info.textContent = 'Intentos: ' + e.intentos;
        const [a, b] = e.abiertas; e.bloq = true;
        if (cartas[a] === cartas[b]) {
          btns[a].classList.add('hecha'); btns[b].classList.add('hecha'); e.abiertas = []; e.bloq = false; e.hechas++;
          if (e.hechas === pares) { cx.reportar(e.intentos <= Math.ceil(pares * 1.9)); cx.en(900, ensayo); }
        } else cx.en(cx.tx(850), () => { mostrar(a, false); mostrar(b, false); e.abiertas = []; e.bloq = false; });
      }
    }
    ensayo();
  },
  entrada(cx, a) { return cx.e.cur ? cx.e.cur.entrada(a) : false; }
};
