// n-back: ¿la letra actual es igual a la de hace n pasos?
const LETRAS = 'BCDFGHJKLMNPRSTV'.split('');
export default {
  id: 'recuerdo', area: 'memoria', nombre: 'Un paso atrás', icono: '↺', desc: 'Decide si la letra que ves es la misma que apareció hace 1, 2 o 3 pasos.',
  tutorial: ['Aparecen letras una a una. Si es igual a la anterior pulsa «Igual», si no «Distinta».', 'Sigue igual: compara con la letra anterior y responde rápido.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e; e.hist = []; e.n = cx.tut ? 1 : (cx.nivel < 9 ? 1 : cx.nivel < 16 ? 2 : 3);
    const est = cx.h('div', { cls: 'est grande', 'aria-live': 'polite' }); cx.zona.appendChild(est);
    cx.zona.appendChild(cx.h('p', { cls: 'nota', id: 'nb-nota' }));
    e.est = est; e.id = 0;
    function siguiente() {
      const n = cx.tut ? 1 : (cx.nivel < 9 ? 1 : cx.nivel < 16 ? 2 : 3);
      e.n = n;
      let l = cx.rng.pick(LETRAS);
      if (e.hist.length >= n && cx.rng.bool(0.35)) l = e.hist[e.hist.length - n];
      else while (e.hist.length >= n && l === e.hist[e.hist.length - n]) l = cx.rng.pick(LETRAS);
      e.es = e.hist.length >= n && l === e.hist[e.hist.length - n]; e.comparable = e.hist.length >= n;
      e.hist.push(l); est.textContent = l;
      cx.consigna(n === 1 ? '¿Igual a la letra anterior?' : `¿Igual a la de hace ${n} pasos?`);
      const inst = cx.opciones(['Igual', 'Distinta'], resp, { cols: 2, destino: (e.cont || (e.cont = cx.h('div'), cx.zona.appendChild(e.cont), e.cont)) });
      e.cont.replaceChildren(inst.el);
      e.inst = inst; e.t0 = cx.t;
      if (!e.comparable) { inst.bloqueado = true; cx.consigna('Memoriza…'); cx.en(cx.tx(1100), siguiente); return; }
      cx.resaltar(inst.btns[e.es ? 0 : 1]);
      const id = ++e.id; e.timeout = cx.en(cx.tx(cx.tut ? 20000 : Math.max(1200, 3000 - cx.nivel * 80)), () => { if (id === e.id && !inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.consigna('Tiempo agotado'); cx.en(500, siguiente); } });
    }
    function resp(i) { e.inst.bloqueado = true; e.id++; cx.cancelar(e.timeout); cx.reportar((i === 0) === e.es); cx.en(450, siguiente); }
    siguiente();
  }
};
