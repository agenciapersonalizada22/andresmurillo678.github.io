// Alternar tareas: el cuadro de arriba pide PAR/IMPAR, el de abajo MAYOR/MENOR que 5. Mismos dos botones.
export default {
  id: 'alterna', area: 'flexibilidad', nombre: 'Alternar tareas', icono: '⇅', desc: 'Según el cuadro donde aparece el número, decide par/impar o mayor/menor que 5.',
  tutorial: ['Si el número está en el cuadro de ARRIBA: ¿par o impar? Si está ABAJO: ¿mayor o menor que 5?', 'La tarea cambia más seguido.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e; e.tarea = 0; e.cuenta = 0;
    const a = cx.h('div', { cls: 'caja-tarea' }, [cx.h('small', { txt: 'ARRIBA · PAR o IMPAR' }), cx.h('b', { cls: 'num', txt: '' })]);
    const b = cx.h('div', { cls: 'caja-tarea' }, [cx.h('small', { txt: 'ABAJO · MAYOR o MENOR que 5' }), cx.h('b', { cls: 'num', txt: '' })]);
    cx.zona.appendChild(a); cx.zona.appendChild(b);
    const cont = cx.h('div'); cx.zona.appendChild(cont);
    function ensayo() {
      const cada = cx.nivel < 4 ? 4 : cx.nivel < 9 ? 2 : 1;
      if (e.cuenta >= cada) { e.tarea = 1 - e.tarea; e.cuenta = 0; } e.cuenta++;
      const n = cx.rng.pick([1, 2, 3, 4, 6, 7, 8, 9]);
      a.classList.toggle('activa', e.tarea === 0); b.classList.toggle('activa', e.tarea === 1);
      a.querySelector('.num').textContent = e.tarea === 0 ? n : ''; b.querySelector('.num').textContent = e.tarea === 1 ? n : '';
      const izq = e.tarea === 0 ? n % 2 === 1 : n < 5;
      cx.consigna(e.tarea === 0 ? 'Arriba: ¿par o impar?' : 'Abajo: ¿mayor o menor que 5?');
      const inst = cx.opciones(['Impar / Menor', 'Par / Mayor'], (i) => { inst.bloqueado = true; cx.cancelar(e.to); cx.reportar((i === 0) === izq); cx.en(250, ensayo); }, { cols: 2, destino: cont });
      cont.replaceChildren(inst.el); cx.resaltar(inst.btns[izq ? 0 : 1]);
      e.to = cx.en(cx.tx(cx.tut ? 40000 : Math.max(1100, 3300 - cx.nivel * 100)), () => { if (!inst.bloqueado) { inst.bloqueado = true; cx.reportar(false); cx.en(250, ensayo); } });
    }
    ensayo();
  }
};
