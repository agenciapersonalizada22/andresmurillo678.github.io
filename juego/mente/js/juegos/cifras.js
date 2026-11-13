// Simbolos y cifras: usa la tabla para teclear la cifra que corresponde a cada simbolo.
const SIM = ['Ω', 'Σ', 'Δ', 'π', 'λ', 'Ψ', 'ξ', 'φ', 'θ'];
export default {
  id: 'cifras', area: 'velocidad', nombre: 'Símbolos y cifras', icono: 'Ω', desc: 'Traduce cada símbolo a su cifra usando la tabla, lo más rápido posible.',
  tutorial: ['Mira el símbolo y pulsa la cifra de la tabla que le corresponde.', 'La tabla tiene más símbolos.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e; e.k = cx.tut ? 4 : Math.min(9, 4 + Math.floor(cx.nivel / 3.5));
    e.tabla = cx.rng.barajar(SIM).slice(0, 9);
    const tabla = cx.h('div', { cls: 'tabla-sim' }, e.tabla.slice(0, e.k).map((s, i) => cx.h('span', { cls: 'ts' }, [cx.h('i', { txt: s }), cx.h('b', { txt: String(i + 1) })])));
    cx.zona.appendChild(tabla);
    const est = cx.h('div', { cls: 'est grande' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const i = cx.rng.int(0, e.k - 1); est.textContent = e.tabla[i]; cx.consigna('¿Qué cifra le corresponde?');
      const inst = cx.opciones(Array.from({ length: e.k }, (_, j) => String(j + 1)), (j) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar(j === i); cx.en(200, ensayo); }, { cols: e.k <= 4 ? 4 : 5, destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[i]);
      e.to = cx.en(cx.tx(cx.tut ? 30000 : Math.max(1100, 3200 - cx.nivel * 90)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(200, ensayo); } });
    }
    ensayo();
  }
};
