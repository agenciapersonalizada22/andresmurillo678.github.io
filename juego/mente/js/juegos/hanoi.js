// Torre de Hanoi: mueve la torre a la tercera varilla sin poner un disco grande sobre uno pequeno.
import { inicial, mover, resuelto, optimo, discosPara } from '../logica/hanoi.js';
export default {
  id: 'hanoi', area: 'logica', nombre: 'Torres', icono: '♜', desc: 'Traslada todos los discos a la varilla derecha sin poner uno grande sobre uno pequeño.', esc: { subir: 1 },
  tutorial: ['Toca una varilla para tomar su disco superior y otra para soltarlo. Meta: todo en la varilla 3.', 'Un disco más: planifica los movimientos.', 'Prueba final: resuelve 3 torres.'],
  init(cx) {
    const e = cx.e;
    const info = cx.h('p', { cls: 'nota', 'aria-live': 'polite' }), tablero = cx.h('div', { cls: 'hanoi' });
    cx.zona.appendChild(tablero); cx.zona.appendChild(info);
    const bReset = cx.h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Reiniciar torre', on: { click: () => nueva(e.n) } }); cx.zona.appendChild(bReset);
    function pintar() {
      tablero.replaceChildren();
      e.st.varillas.forEach((v, i) => {
        const b = cx.h('button', { type: 'button', cls: 'varilla' + (e.sel === i ? ' sel' : '') + (e.cur === i ? ' cur' : ''), 'data-f': 1, 'aria-label': 'Varilla ' + (i + 1) + ', ' + v.length + ' discos' + (e.sel === i ? ', seleccionada' : ''), on: { click: () => tocar(i) } },
          [cx.h('i', { cls: 'palo' }), ...v.slice().reverse().map((d) => cx.h('span', { cls: 'disco', style: `--w:${30 + d * (62 / e.n)}%`, txt: String(d) })).reverse().reverse()]);
        b.style.setProperty('--n', e.n); tablero.appendChild(b);
      });
      info.textContent = `Movimientos: ${e.st.movs} · Mínimo posible: ${optimo(e.n)}${e.sel != null ? ' · Disco tomado de la varilla ' + (e.sel + 1) : ''}`;
    }
    function nueva(n) { e.n = n; e.st = inicial(n); e.sel = null; e.cur = 0; e.fin = false; pintar(); cx.consigna('Mueve la torre a la varilla 3'); }
    function tocar(i) {
      if (e.fin) return;
      if (e.sel == null) { if (e.st.varillas[i].length) { e.sel = i; cx.sonido.clic(); } }
      else if (e.sel === i) e.sel = null;
      else {
        const r = mover(e.st, e.sel, i);
        if (r.ok) { e.st = r.estado; e.sel = null; cx.sonido.clic(); if (resuelto(e.st)) { e.fin = true; pintar(); cx.reportar(e.st.movs <= Math.ceil(optimo(e.n) * 1.5) + 1); cx.en(900, () => nueva(discosPara(cx.nivel))); return; } }
        else { cx.sonido.mal(); info.textContent = 'Movimiento no permitido: un disco grande no va sobre uno pequeño.'; e.sel = null; }
      }
      pintar();
    }
    e.tocar = tocar; e.pintar = pintar;
    nueva(cx.tut ? 2 + (cx.tut > 1 ? 1 : 0) : discosPara(cx.nivel));
  },
  entrada(cx, a) {
    const e = cx.e;
    if (a === 'izq') { e.cur = Math.max(0, e.cur - 1); e.pintar(); return true; }
    if (a === 'der') { e.cur = Math.min(2, e.cur + 1); e.pintar(); return true; }
    if (a === 'ok' || a === 'a') { e.tocar(e.cur); return true; }
    if (a === '1' || a === '2' || a === '3') { e.tocar(Number(a) - 1); return true; }
    return false;
  }
};
