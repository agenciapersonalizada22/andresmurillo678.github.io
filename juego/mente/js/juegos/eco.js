// Memoria de secuencias: repite la secuencia de luces y tonos (cada boton tiene simbolo y tono propios: no depende solo del color).
import { SIMBOLOS } from './util.js';
const TONOS = [262, 330, 392, 523, 659, 784];
const GLIFOS = ['●', '■', '▲', '◆', '★', '✚'];
export default {
  id: 'eco', area: 'memoria', nombre: 'Eco de luces', icono: '◆', desc: 'Observa la secuencia de luces y repítela en el mismo orden.',
  tutorial: ['Mira cómo se iluminan los botones y repite el orden. Aquí te marcamos el siguiente.', 'Ahora sin ayuda: la secuencia es un poco más larga.', 'Prueba final: logra al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e; e.n = cx.nivel < 9 ? 4 : 6;
    const inst = cx.opciones(GLIFOS.slice(0, e.n).map((g, i) => ({ nodo: cx.h('span', { cls: 'glifo', txt: g }), aria: 'Botón ' + (i + 1) + ' ' + g })), (i) => pulsar(i), { cols: e.n === 4 ? 2 : 3, cls: 'pads' });
    e.inst = inst;
    function luz(i, ms) { inst.btns[i].classList.add('luz'); cx.sonido.tono(TONOS[i], ms / 1000 * 0.9); cx.en(ms, () => inst.btns[i].classList.remove('luz')); }
    function ensayo() {
      e.seq = []; e.pos = 0; inst.bloqueado = true;
      const L = 2 + Math.floor(cx.nivel / 2.2);
      for (let k = 0; k < L; k++) e.seq.push(cx.rng.int(0, e.n - 1));
      cx.consigna('Mira…');
      const dur = cx.tx(Math.max(260, 620 - cx.nivel * 14));
      e.seq.forEach((s, k) => cx.en(700 + k * (dur + 160), () => luz(s, dur)));
      cx.en(700 + L * (dur + 160) + 100, () => { inst.bloqueado = false; cx.consigna('Tu turno: repite (' + L + ' pasos)'); cx.resaltar(inst.btns[e.seq[0]]); });
    }
    function pulsar(i) {
      if (inst.bloqueado) return;
      luz(i, 200);
      if (i !== e.seq[e.pos]) { inst.bloqueado = true; cx.reportar(false); cx.consigna('Era otro botón'); cx.en(900, ensayo); return; }
      inst.btns.forEach((b) => b.classList.remove('pista'));
      e.pos++;
      if (e.pos >= e.seq.length) { inst.bloqueado = true; cx.reportar(true); cx.en(800, ensayo); }
      else if (cx.tut === 1) cx.resaltar(inst.btns[e.seq[e.pos]]);
    }
    ensayo();
  }
};
