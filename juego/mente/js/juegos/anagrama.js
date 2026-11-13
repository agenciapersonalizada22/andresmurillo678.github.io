// Anagramas en espanol (sin tildes ni enie) con diccionario propio: ordena las letras para formar una palabra.
import { generar, validar } from '../logica/anagramas.js';
export default {
  id: 'anagrama', area: 'logica', nombre: 'Anagramas', icono: 'Ab', desc: 'Ordena las letras revueltas para formar una palabra en español.',
  tutorial: ['Toca las letras en orden para formar una palabra (sin tildes). Te marcamos la primera.', 'Palabras más largas.', 'Prueba final: al menos 3 aciertos.'],
  init(cx) {
    const e = cx.e;
    const salida = cx.h('div', { cls: 'est grande slots', 'aria-live': 'polite' }), fichas = cx.h('div', { cls: 'fichas' });
    const acc = cx.h('div', { cls: 'fila-btn' }, [cx.h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Borrar', on: { click: borrar } }), cx.h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Mezclar', on: { click: mezclar } }), cx.h('button', { type: 'button', cls: 'btn sec peq', 'data-f': 1, txt: 'Saltar', on: { click: saltar } })]);
    cx.zona.appendChild(salida); cx.zona.appendChild(fichas); cx.zona.appendChild(acc);
    function nuevo() { e.a = generar(cx.rng, cx.tut ? (cx.tut === 1 ? 1 : cx.tut === 2 ? 4 : 7) : cx.nivel); e.letras = e.a.letras.slice(); e.usadas = []; e.cerrado = false; pintar(); cx.consigna('Forma la palabra (' + e.a.palabra.length + ' letras)'); }
    function pintar() {
      salida.replaceChildren(...Array.from({ length: e.a.palabra.length }, (_, i) => cx.h('span', { cls: 'slot', txt: e.usadas[i] != null ? e.letras[e.usadas[i]].toUpperCase() : '·' })));
      fichas.replaceChildren(...e.letras.map((l, i) => { const b = cx.h('button', { type: 'button', cls: 'ficha', 'data-f': 1, txt: l.toUpperCase(), disabled: e.usadas.includes(i) || null, on: { click: () => poner(i) } }); if (cx.tut === 1 && !e.usadas.length && l === e.a.palabra[0] && !fichas.querySelector('.pista')) cx.resaltar(b); return b; }));
    }
    function poner(i) {
      if (e.cerrado || e.usadas.includes(i)) return; e.usadas.push(i); cx.sonido.clic(); pintar();
      if (e.usadas.length === e.letras.length) {
        e.cerrado = true; const ok = validar(e.letras, e.usadas.map((k) => e.letras[k]).join(''));
        cx.reportar(ok); if (!ok) cx.consigna('Una solución era: ' + e.a.palabra.toUpperCase()); cx.en(ok ? 400 : 1400, nuevo);
      }
    }
    function borrar() { if (e.cerrado) return; e.usadas = []; pintar(); }
    function mezclar() { if (e.cerrado) return; e.letras = cx.rng.barajar(e.letras); e.usadas = []; pintar(); }
    function saltar() { if (e.cerrado) return; e.cerrado = true; cx.reportar(false); cx.consigna('Era: ' + e.a.palabra.toUpperCase()); cx.en(1300, nuevo); }
    e.poner = poner; e.borrar = borrar; e.nuevo = nuevo; nuevo();
  },
  tecla(cx, k) {
    const e = cx.e; if (e.cerrado) return false;
    if (k === 'backspace') { e.borrar(); return true; }
    if (!/^[a-z]$/.test(k)) return false;
    const i = e.letras.findIndex((l, j) => l === k && !e.usadas.includes(j));
    if (i >= 0) { e.poner(i); return true; }
    return false;
  },
  entrada(cx, a) { return false; }
};
