// Stroop: elige el COLOR de la tinta, no lo que dice la palabra. Con daltonismo activado cada color lleva ademas un simbolo.
const COL = [{ n: 'ROJO', v: '--c0', g: '●' }, { n: 'AZUL', v: '--c1', g: '■' }, { n: 'VERDE', v: '--c2', g: '▲' }, { n: 'AMARILLO', v: '--c3', g: '◆' }];
export default {
  id: 'tinta', area: 'atencion', nombre: 'Tinta engañosa', icono: 'A', desc: 'Elige el color con que está escrita la palabra, ignorando lo que dice.',
  tutorial: ['Mira de qué color está escrita la palabra (no lo que dice) y pulsa ese color.', 'Ahora la palabra a veces dice otro color. Ignora el texto.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e, dal = cx.daltonismo();
    const est = cx.h('div', { cls: 'est grande stroop' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const k = cx.nivel < 5 ? 3 : 4, cols = COL.slice(0, k);
      const tinta = cx.rng.pick(cols);
      const inc = !cx.tut || cx.tut > 1 ? cx.rng.bool(Math.min(0.8, 0.35 + cx.nivel * 0.025)) : false;
      let palabra = tinta; if (inc) palabra = cx.rng.pick(cols.filter((c) => c !== tinta));
      est.textContent = (dal ? tinta.g + ' ' : '') + palabra.n; est.style.color = `var(${tinta.v})`;
      est.setAttribute('aria-label', 'Palabra ' + palabra.n + ', tinta ' + tinta.n);
      cx.consigna('¿De qué color está escrita?');
      const inst = cx.opciones(cols.map((c) => ({ txt: (dal ? c.g + ' ' : '') + c.n, cls: 'c' + COL.indexOf(c) })), (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar(cols[i] === tinta); cx.en(300, ensayo); }, { cols: 2, destino: cont });
      cont.replaceChildren(inst.el);
      cx.resaltar(inst.btns[cols.indexOf(tinta)]);
      e.to = cx.en(cx.tx(cx.tut ? 30000 : Math.max(1300, 3800 - cx.nivel * 110)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(300, ensayo); } });
    }
    ensayo();
  }
};
