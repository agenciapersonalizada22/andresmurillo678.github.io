// Memoria verbal: memoriza una lista de palabras y reconocelas entre otras nuevas.
import { PALABRAS_COMUNES } from './util.js';
export default {
  id: 'lista', area: 'memoria', nombre: 'Lista de palabras', icono: '☰', desc: 'Memoriza unas palabras y reconoce cuáles estaban en la lista.',
  tutorial: ['Verás pocas palabras. Luego te diremos una a una: ¿estaba en la lista?', 'Una lista un poco más larga.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    function ronda() {
      cx.zona.replaceChildren();
      const n = Math.min(10, 3 + Math.floor(cx.nivel / 2.5));
      const todas = cx.rng.muestra(PALABRAS_COMUNES, n * 2), lista = todas.slice(0, n), nuevas = todas.slice(n);
      const caja = cx.h('div', { cls: 'palabras' }, lista.map((w) => cx.h('span', { cls: 'pal', txt: w })));
      cx.zona.appendChild(caja); cx.consigna('Memoriza estas ' + n + ' palabras');
      e.cola = cx.rng.barajar([...lista.map((w) => ({ w, si: true })), ...nuevas.slice(0, Math.max(2, Math.ceil(n * 0.8))).map((w) => ({ w, si: false }))]);
      cx.en(cx.tx(900 * n + 1200), pregunta);
    }
    function pregunta() {
      cx.zona.replaceChildren();
      const q = e.cola.shift();
      if (!q) { ronda(); return; }
      e.q = q; cx.consigna('¿Estaba en la lista?');
      cx.zona.appendChild(cx.h('div', { cls: 'est grande', txt: q.w.toUpperCase() }));
      const inst = cx.opciones(['Sí estaba', 'No estaba'], (i) => { inst.bloqueado = true; cx.reportar((i === 0) === q.si); cx.en(350, pregunta); }, { cols: 2 });
      cx.resaltar(inst.btns[q.si ? 0 : 1]);
    }
    ronda();
  }
};
