// Tiempo de reaccion: toca en cuanto aparezca «¡YA!» (cambia texto y simbolo, no solo color). Tocar antes de tiempo es error.
import { esOk } from '../motor.js';
export default {
  id: 'relampago', area: 'velocidad', nombre: 'Reflejo', icono: '⚡', desc: 'Toca lo más rápido posible cuando aparezca «¡YA!». Si te adelantas, fallas.',
  tutorial: ['Espera a que el cuadro diga «¡YA!» y tócalo. Verás tu tiempo en milisegundos.', 'Ahora el tiempo límite es menor. No te adelantes.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e; e.rts = [];
    const area = cx.h('button', { type: 'button', cls: 'reflejo espera', 'data-f': 1, on: { pointerdown: (ev) => { ev.preventDefault(); tocar(); }, click: (ev) => { if (ev.detail === 0) tocar(); } } }, [cx.h('b', { cls: 'r-sim', txt: '…' }), cx.h('span', { cls: 'r-txt', txt: 'Espera' })]);
    cx.zona.appendChild(area); const info = cx.h('p', { cls: 'nota', 'aria-live': 'polite' }); cx.zona.appendChild(info);
    e.area = area; e.estado = 'esperando';
    const poner = (cls, sim, txt) => { area.className = 'reflejo ' + cls; area.children[0].textContent = sim; area.children[1].textContent = txt; };
    function ensayo() {
      e.estado = 'esperando'; poner('espera', '…', 'Espera'); cx.consigna('Espera la señal…');
      e.lim = cx.tx(cx.tut ? 1500 : Math.round(950 - cx.nivel * 30));
      e.espera = cx.en(900 + Math.floor(cx.rng.f() * 2200), () => { e.estado = 'ya'; e.t0 = performance.now(); poner('ya', '✔', '¡YA!'); cx.consigna('¡Toca!'); e.tope = cx.en(e.lim + 900, () => { if (e.estado === 'ya') { e.estado = 'fin'; poner('espera', '✗', 'Muy lento'); info.textContent = 'Muy lento'; cx.reportar(false); cx.en(900, ensayo); } }); });
    }
    function tocar() {
      if (e.estado === 'esperando') { e.estado = 'fin'; cx.cancelar(e.espera); poner('error', '✗', 'Te adelantaste'); info.textContent = 'Te adelantaste'; cx.reportar(false); cx.en(1000, ensayo); }
      else if (e.estado === 'ya') {
        e.estado = 'fin'; cx.cancelar(e.tope);
        const rt = Math.round(performance.now() - e.t0); e.rts.push(rt);
        info.textContent = rt + ' ms (límite ' + Math.round(e.lim) + ')'; const ok = rt <= e.lim;
        poner(ok ? 'bien' : 'espera', ok ? '✓' : '✗', rt + ' ms');
        cx.reportar(ok, ok ? { pts: Math.round(10 + cx.nivel * 4 + Math.max(0, (e.lim - rt) / 25)) } : {}); cx.en(900, ensayo);
      }
    }
    e.tocar = tocar; ensayo();
  },
  entrada(cx, a) { if (esOk(a)) { cx.e.tocar(); return true; } return false; },
  resultado(cx, def) { const r = cx.e.rts.slice().sort((a, b) => a - b); def.mediana = r.length ? r[Math.floor(r.length / 2)] : null; return def; }
};
