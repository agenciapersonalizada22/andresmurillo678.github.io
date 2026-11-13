// Clasificacion rapida de numeros segun una regla fija durante todo el juego.
export default {
  id: 'clasifica', area: 'velocidad', nombre: 'Clasificador', icono: '⇄', desc: 'Clasifica números lo más rápido que puedas según la regla del juego.',
  tutorial: ['Sigue la regla de arriba y pulsa «Sí» o «No» para cada número.', 'Más rápido: el tiempo por número se acorta.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    const reglas = [{ t: 'es PAR', f: (n) => n % 2 === 0 }, { t: 'es MAYOR que 50', f: (n) => n > 50 }, { t: 'es múltiplo de 3', f: (n) => n % 3 === 0 }];
    const compuestas = [{ t: 'es PAR y MAYOR que 40', f: (n) => n % 2 === 0 && n > 40 }, { t: 'es IMPAR y MENOR que 60', f: (n) => n % 2 === 1 && n < 60 }, { t: 'es múltiplo de 3 o de 5', f: (n) => n % 3 === 0 || n % 5 === 0 }];
    e.regla = cx.nivel >= 9 && !cx.tut ? cx.rng.pick(compuestas) : cx.rng.pick(reglas);
    cx.zona.appendChild(cx.h('div', { cls: 'regla', txt: '¿El número ' + e.regla.t + '?' }));
    const est = cx.h('div', { cls: 'est grande' }); cx.zona.appendChild(est);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      let n = cx.rng.int(1, 99); const si = cx.rng.bool(); for (let i = 0; i < 40 && e.regla.f(n) !== si; i++) n = cx.rng.int(1, 99);
      est.textContent = String(n); const ok = e.regla.f(n);
      const inst = cx.opciones(['Sí', 'No'], (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar((i === 0) === ok); cx.en(220, ensayo); }, { cols: 2, destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[ok ? 0 : 1]);
      e.to = cx.en(cx.tx(cx.tut ? 30000 : Math.max(900, 2600 - cx.nivel * 85)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(220, ensayo); } });
    }
    ensayo();
  }
};
