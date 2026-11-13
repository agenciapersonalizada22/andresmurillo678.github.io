// Iguales o distintos: compara dos cadenas de caracteres.
const CAR = 'ABCDEFGHJKLMNPRSTUVXYZ2345679'.split('');
export default {
  id: 'gemelos', area: 'velocidad', nombre: 'Iguales o distintos', icono: '＝', desc: 'Compara dos cadenas y decide si son idénticas o hay una diferencia.',
  tutorial: ['Mira las dos cadenas y di si son iguales o distintas.', 'Cadenas más largas y diferencias pequeñas.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    const est = cx.h('div', { cls: 'est pares' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const L = Math.min(9, 4 + Math.floor(cx.nivel / 3));
      const a = Array.from({ length: L }, () => cx.rng.pick(CAR)); const b = a.slice(); const igual = cx.rng.bool();
      if (!igual) { const i = cx.rng.int(0, L - 1); let c = cx.rng.pick(CAR); while (c === b[i]) c = cx.rng.pick(CAR); b[i] = c; }
      est.replaceChildren(cx.h('div', { cls: 'cad', txt: a.join(' ') }), cx.h('div', { cls: 'cad', txt: b.join(' ') }));
      cx.consigna('¿Son idénticas?');
      const inst = cx.opciones(['Iguales', 'Distintas'], (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar((i === 0) === igual); cx.en(250, ensayo); }, { cols: 2, destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[igual ? 0 : 1]);
      e.to = cx.en(cx.tx(cx.tut ? 40000 : Math.max(1500, 4600 - cx.nivel * 130)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(250, ensayo); } });
    }
    ensayo();
  }
};
