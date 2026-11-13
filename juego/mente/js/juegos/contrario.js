// Al reves: segun la consigna pulsa la MISMA direccion o la OPUESTA a la flecha.
const G = ['←', '↑', '→', '↓'], N = ['izquierda', 'arriba', 'derecha', 'abajo'];
export default {
  id: 'contrario', area: 'flexibilidad', nombre: 'Al revés', icono: '↯', desc: 'Pulsa la misma dirección o la contraria según la consigna, que va cambiando.',
  tutorial: ['Si dice IGUAL pulsa la misma flecha; si dice OPUESTO, la contraria.', 'La consigna cambia más a menudo.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e; e.modo = 0; e.cuenta = 0;
    const cartel = cx.h('div', { cls: 'regla', 'aria-live': 'assertive' }); cx.zona.appendChild(cartel);
    const est = cx.h('div', { cls: 'est grande' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const cada = cx.tut === 1 ? 99 : Math.max(2, 6 - Math.floor(cx.nivel / 4));
      if (e.cuenta >= cada) { e.modo = 1 - e.modo; e.cuenta = 0; cartel.classList.remove('cambia'); void cartel.offsetWidth; cartel.classList.add('cambia'); } e.cuenta++;
      const d = cx.nivel < 5 ? [0, 2][cx.rng.int(0, 1)] : cx.rng.int(0, 3), opuesto = [2, 3, 0, 1][d], meta = e.modo ? opuesto : d;
      cartel.textContent = e.modo ? 'OPUESTO: pulsa la dirección contraria' : 'IGUAL: pulsa la misma dirección';
      est.textContent = G[d]; est.setAttribute('aria-label', 'Flecha hacia ' + N[d]);
      const inst = cx.opciones(G.map((g, i) => ({ txt: g, aria: N[i] })), (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar(i === meta); cx.en(260, ensayo); }, { cols: 4, cls: 'flechas-op', destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[meta]);
      e.to = cx.en(cx.tx(cx.tut ? 40000 : Math.max(1000, 3000 - cx.nivel * 95)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(260, ensayo); } });
    }
    ensayo();
  }
};
