// Secuencias numericas: halla el siguiente numero.
import { generar } from '../logica/secuencias.js';
export default {
  id: 'serie', area: 'logica', nombre: 'Series', icono: '∞', desc: 'Descubre la regla de la serie y elige el número que sigue.',
  tutorial: ['Busca cómo cambia la serie y elige el número que sigue.', 'Reglas menos evidentes.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    const est = cx.h('div', { cls: 'est serie' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const s = generar(cx.rng, cx.nivel); est.textContent = s.terminos.join(',  ') + ',  ?'; est.setAttribute('aria-label', 'Serie ' + s.terminos.join(', ') + ' y luego qué número');
      cx.consigna('¿Qué número sigue?');
      const inst = cx.opciones(s.opciones.map(String), (i) => { inst.bloqueado = true; cx.cancelar(e.to); const ok = i === s.correcta; cx.reportar(ok); if (!ok) cx.consigna('Regla: ' + s.regla); cx.en(ok ? 300 : 1300, ensayo); }, { cols: 2, destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[s.correcta]);
      e.to = cx.en(cx.tx(cx.tut ? 90000 : Math.max(6000, 16000 - cx.nivel * 400)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(300, ensayo); } });
    }
    ensayo();
  }
};
