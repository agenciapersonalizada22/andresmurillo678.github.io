// Go/No-go: toca con el simbolo «GO» y NO toques con el simbolo «ALTO».
import { esOk } from '../motor.js';
export default {
  id: 'semaforo', area: 'flexibilidad', nombre: 'Alto o sigue', icono: '⛔', desc: 'Toca cuando aparezca ▲ y contén el impulso cuando aparezca ■.',
  tutorial: ['Toca la pantalla cuando veas ▲ (VA). Si ves ■ (ALTO), no toques.', 'Aparece más rápido y más veces ■.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    cx.consigna('Toca con ▲ · No toques con ■');
    const area = cx.h('button', { type: 'button', cls: 'reflejo espera', 'data-f': 1, on: { pointerdown: (ev) => { ev.preventDefault(); tocar(); }, click: (ev) => { if (ev.detail === 0) tocar(); } } }, [cx.h('b', { cls: 'r-sim', txt: '…' }), cx.h('span', { cls: 'r-txt', txt: 'Atento' })]);
    cx.zona.appendChild(area);
    e.go = false; e.vivo = false; e.respondio = false;
    function ensayo() {
      area.className = 'reflejo espera'; area.children[0].textContent = '…'; area.children[1].textContent = 'Atento';
      cx.en(cx.tx(380), () => {
        e.go = cx.rng.bool(Math.max(0.55, 0.78 - cx.nivel * 0.012)); e.vivo = true; e.respondio = false;
        area.className = 'reflejo ' + (e.go ? 'ya' : 'alto'); area.children[0].textContent = e.go ? '▲' : '■'; area.children[1].textContent = e.go ? 'VA' : 'ALTO';
        cx.resaltar(e.go ? area : null);
        e.fin = cx.en(cx.tx(cx.tut ? 1700 : Math.max(500, 1000 - cx.nivel * 25)), () => {
          if (!e.vivo) return; e.vivo = false;
          if (e.go && !e.respondio) cx.reportar(false); else if (!e.go) cx.reportar(true);
          area.className = 'reflejo espera'; ensayo();
        });
      });
    }
    function tocar() {
      if (!e.vivo || e.respondio) return; e.respondio = true;
      if (e.go) { e.vivo = false; cx.cancelar(e.fin); cx.reportar(true); area.className = 'reflejo bien'; area.children[0].textContent = '✓'; cx.en(250, ensayo); }
      else { e.vivo = false; cx.cancelar(e.fin); cx.reportar(false); area.className = 'reflejo error'; area.children[0].textContent = '✗'; area.children[1].textContent = 'Era ALTO'; cx.en(450, ensayo); }
    }
    e.tocar = tocar; ensayo();
  },
  entrada(cx, a) { if (esOk(a)) { cx.e.tocar(); return true; } return false; }
};
