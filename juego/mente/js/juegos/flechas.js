// Flanker: indica hacia donde apunta la flecha central, ignorando las de los lados.
export default {
  id: 'flechas', area: 'atencion', nombre: 'Flechas en fila', icono: '↔', desc: 'Indica hacia dónde apunta la flecha del centro e ignora las demás.',
  tutorial: ['Mira la flecha del centro y pulsa su dirección. Las demás apuntan igual.', 'A veces las flechas de los lados apuntan al revés: ignóralas.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    const est = cx.h('div', { cls: 'est flechas' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const lados = cx.nivel < 6 ? 1 : cx.nivel < 13 ? 2 : 3, dir = cx.rng.bool() ? 1 : 0; // 0 izq, 1 der
      const inc = (!cx.tut || cx.tut > 1) && cx.rng.bool(Math.min(0.8, 0.3 + cx.nivel * 0.03));
      const g = (d) => (d ? '→' : '←'), lado = inc ? 1 - dir : dir;
      const fila = [];
      for (let i = 0; i < lados; i++) fila.push(g(lado)); fila.push(g(dir)); for (let i = 0; i < lados; i++) fila.push(g(lado));
      est.textContent = fila.join(' '); est.setAttribute('aria-label', 'Flecha central hacia ' + (dir ? 'la derecha' : 'la izquierda'));
      cx.consigna('¿Hacia dónde apunta la del centro?');
      const inst = cx.opciones([{ txt: '← Izquierda' }, { txt: 'Derecha →' }], (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar(i === dir); cx.en(280, ensayo); }, { cols: 2, destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[dir]);
      e.to = cx.en(cx.tx(cx.tut ? 30000 : Math.max(900, 2600 - cx.nivel * 80)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(280, ensayo); } });
    }
    ensayo();
  }
};
