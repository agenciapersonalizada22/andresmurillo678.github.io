// Cambio de reglas: responde por FORMA o por CANTIDAD segun la regla activa, que cambia sin avisar con antelacion (se anuncia al cambiar).
const FORMAS = [{ g: '●', n: 'Círculo' }, { g: '■', n: 'Cuadrado' }, { g: '▲', n: 'Triángulo' }];
export default {
  id: 'cambio', area: 'flexibilidad', nombre: 'Cambio de reglas', icono: '⇋', desc: 'Responde según la regla vigente (forma o cantidad), que cambia cada cierto tiempo.',
  tutorial: ['La regla de arriba dice si debes responder la FORMA o la CANTIDAD de figuras.', 'La regla ahora cambia de vez en cuando: fíjate en el cartel.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e; e.regla = 'forma'; e.cuenta = 0;
    const cartel = cx.h('div', { cls: 'regla', 'aria-live': 'assertive' }); cx.zona.appendChild(cartel);
    const est = cx.h('div', { cls: 'est grande' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const cada = cx.tut === 1 ? 99 : Math.max(2, 7 - Math.floor(cx.nivel / 3.5));
      if (e.cuenta >= cada) { e.regla = e.regla === 'forma' ? 'cantidad' : 'forma'; e.cuenta = 0; cartel.classList.remove('cambia'); void cartel.offsetWidth; cartel.classList.add('cambia'); }
      e.cuenta++;
      const f = cx.rng.int(0, 2), c = cx.rng.int(1, 3);
      cartel.textContent = e.regla === 'forma' ? 'Regla: FORMA (¿qué figura es?)' : 'Regla: CANTIDAD (¿cuántas hay?)';
      est.textContent = Array(c).fill(FORMAS[f].g).join(' '); est.setAttribute('aria-label', c + ' ' + FORMAS[f].n);
      const items = e.regla === 'forma' ? FORMAS.map((x) => x.g + ' ' + x.n) : ['1', '2', '3'];
      const correcta = e.regla === 'forma' ? f : c - 1;
      const inst = cx.opciones(items, (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar(i === correcta); cx.en(300, ensayo); }, { cols: 3, destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[correcta]);
      e.to = cx.en(cx.tx(cx.tut ? 40000 : Math.max(1200, 3600 - cx.nivel * 100)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(300, ensayo); } });
    }
    ensayo();
  }
};
