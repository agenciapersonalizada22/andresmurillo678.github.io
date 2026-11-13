// Calculo mental con cuatro opciones.
import { generar } from '../logica/calculo.js';
export default {
  id: 'calculo', area: 'logica', nombre: 'Cálculo relámpago', icono: '÷', desc: 'Resuelve operaciones de cabeza y elige el resultado correcto.',
  tutorial: ['Resuelve la operación y pulsa el resultado correcto.', 'Operaciones un poco más largas.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    const est = cx.h('div', { cls: 'est grande' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const p = generar(cx.rng, cx.nivel); est.textContent = p.texto.replace(/x/g, '×').replace(/ \/ /g, ' ÷ ') + ' = ?'; est.setAttribute('aria-label', p.texto + ' igual a qué');
      cx.consigna('Elige el resultado');
      const inst = cx.opciones(p.opciones.map(String), (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar(i === p.correcta); cx.en(280, ensayo); }, { cols: 2, destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[p.correcta]);
      e.to = cx.en(cx.tx(cx.tut ? 60000 : Math.max(3500, 9000 - cx.nivel * 250)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(280, ensayo); } });
    }
    ensayo();
  }
};
