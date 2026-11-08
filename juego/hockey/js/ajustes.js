// Menu de Ajustes con pestanas (Graficos, Audio, Controles, Accesibilidad, Datos).
import { h } from './dom.js';
import { modal, btn, seg, toast, cerrarTodos } from './ui.js';
import { A, guardarAjustes, aplicarPreset, exportar, importar, borrarTodo, TECLAS_DEF, P } from './almacen.js';
import { volumenes, musica } from './sonido.js';
import * as CH from './cuenta-hockey.js';
const D = window.HkDatos;

export const hooks = { alCambiar: null };
const cambio = () => { guardarAjustes(); volumenes(); hooks.alCambiar && hooks.alCambiar(); };

function slider(c, nombre, obj, k, min, max, step, fmt) {
  const val = h('span', { cls: 'val', txt: fmt(obj[k]) });
  const inp = h('input', { type: 'range', min, max, step, value: obj[k], 'data-f': 1, 'aria-label': nombre, on: { input: (e) => { obj[k] = +e.target.value; val.textContent = fmt(obj[k]); cambio(); } } });
  c.appendChild(h('label', { cls: 'fila s' }, [h('span', { txt: nombre }), inp, val]));
  return inp;
}
function interruptor(c, nombre, obj, k, extra) {
  const b = h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, role: 'switch', 'aria-checked': String(!!obj[k]), txt: obj[k] ? 'Sí' : 'No', on: { click: () => { obj[k] = !obj[k]; b.setAttribute('aria-checked', String(obj[k])); b.textContent = obj[k] ? 'Sí' : 'No'; cambio(); extra && extra(); } } });
  c.appendChild(h('div', { cls: 'fila' }, [h('span', { txt: nombre }), b]));
}
const pct = (v) => Math.round(v * 100) + '%';

const PEST = {
  Gráficos(c) {
    c.appendChild(h('div', { cls: 'sub', txt: 'Calidad' }));
    const grupo = h('div');
    const pintar = () => {
      grupo.textContent = '';
      grupo.appendChild(seg([['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], A.graf.preset, (v) => { aplicarPreset(v); cambio(); pintarOpc(); }));
    };
    const opc = h('div'); const pintarOpc = () => {
      opc.textContent = '';
      opc.appendChild(h('div', { cls: 'fila' }, [h('span', { txt: 'Partículas' }), seg([[0, 'Ninguna'], [1, 'Pocas'], [2, 'Normal'], [3, 'Muchas'], [4, 'Máx.']], A.graf.particulas, (v) => { A.graf.particulas = v; A.graf.preset = 'personalizado'; cambio(); })]));
      interruptor(opc, 'Estela del disco', A.graf, 'estela'); interruptor(opc, 'Brillos (glow)', A.graf, 'brillo'); interruptor(opc, 'Sombras', A.graf, 'sombras');
      slider(opc, 'Resolución', A.graf, 'res', 0.5, 1.5, 0.25, (v) => Math.round(v * 100) + '%');
      opc.appendChild(h('div', { cls: 'fila' }, [h('span', { txt: 'Límite de FPS' }), seg([[30, '30'], [60, '60'], [0, 'Sin límite']], A.graf.fps, (v) => { A.graf.fps = v; cambio(); })]));
      interruptor(opc, 'Mostrar FPS', A.graf, 'mostrarFps'); interruptor(opc, 'Bajar calidad automáticamente si hay pocos FPS', A.graf, 'auto');
    };
    pintar(); pintarOpc(); c.appendChild(grupo); c.appendChild(opc);
  },
  Audio(c) {
    slider(c, 'Volumen general', A.audio, 'maestro', 0, 1, 0.05, pct);
    slider(c, 'Música', A.audio, 'musica', 0, 1, 0.05, pct);
    slider(c, 'Efectos', A.audio, 'efectos', 0, 1, 0.05, pct);
    interruptor(c, 'Silenciar todo', A.audio, 'mute', () => musica(true));
    interruptor(c, 'Pausar el audio al ocultar la pestaña', A.audio, 'pausaOculta');
  },
  Controles(c) {
    slider(c, 'Sensibilidad (teclado y mando)', A.ctrl, 'sens', 0.4, 2, 0.1, (v) => v.toFixed(1) + '×');
    slider(c, 'Zona muerta del mando', A.ctrl, 'zona', 0, 0.4, 0.02, pct);
    slider(c, 'Desplazamiento del dedo (táctil)', A.ctrl, 'offset', 0, 120, 6, (v) => v + ' px');
    interruptor(c, 'Vibración', A.ctrl, 'vibracion'); slider(c, 'Intensidad de vibración', A.ctrl, 'vibInt', 0.1, 1, 0.1, pct);
    c.appendChild(h('div', { cls: 'sub', txt: 'Teclas (pulsa y luego la tecla nueva)' }));
    const nom = { arriba: 'Jugador 1 · arriba', abajo: 'Jugador 1 · abajo', izq: 'Jugador 1 · izquierda', der: 'Jugador 1 · derecha', arriba2: 'Jugador 2 · arriba', abajo2: 'Jugador 2 · abajo', izq2: 'Jugador 2 · izquierda', der2: 'Jugador 2 · derecha', pausa: 'Pausa' };
    const etq = (code) => code.replace('Key', '').replace('Arrow', '↔ ').replace('Digit', '');
    Object.keys(nom).forEach((a) => {
      const b = h('button', { type: 'button', cls: 'btn sec tecla', 'data-f': 1, txt: etq(A.ctrl.teclas[a]) });
      b.addEventListener('click', () => {
        b.textContent = 'Pulsa una tecla…';
        const f = (ev) => { ev.preventDefault(); ev.stopPropagation(); removeEventListener('keydown', f, true); if (ev.code !== 'Escape') { A.ctrl.teclas[a] = ev.code; cambio(); } b.textContent = etq(A.ctrl.teclas[a]); };
        addEventListener('keydown', f, true);
      });
      c.appendChild(h('div', { cls: 'fila' }, [h('span', { txt: nom[a] }), b]));
    });
    c.appendChild(btn('Restablecer teclas', () => { A.ctrl.teclas = Object.assign({}, TECLAS_DEF); cambio(); cerrarTodos(); toast('Teclas restablecidas'); }, 'sec'));
  },
  Accesibilidad(c) {
    interruptor(c, 'Texto grande', A.acc, 'texto', () => document.body.classList.toggle('texto-grande', A.acc.texto));
    interruptor(c, 'Modo daltónico (azul y naranja)', A.acc, 'dalto');
    interruptor(c, 'Reducir movimiento y efectos', A.acc, 'reducir', () => document.body.classList.toggle('reducir', A.acc.reducir));
    interruptor(c, 'Mostrar pistas de controles', A.acc, 'ayuda');
  },
  Datos(c) {
    c.appendChild(CH.bloqueNube());
    c.appendChild(h('div', { cls: 'sub', txt: 'Copia de seguridad' }));
    const area = h('textarea', { cls: 'campo', rows: 4, placeholder: 'Aquí aparece el código exportado; pega uno para importar', 'data-f': 1, spellcheck: 'false' });
    c.appendChild(area);
    c.appendChild(h('div', { cls: 'seg' }, [
      btn('Exportar', () => { area.value = exportar(); area.select(); try { navigator.clipboard.writeText(area.value); toast('Código copiado'); } catch (e) { /* manual */ } }),
      btn('Importar', () => { if (importar(area.value)) { toast('Datos importados'); setTimeout(() => location.reload(), 600); } else toast('Código no válido'); }, 'sec')
    ]));
    c.appendChild(btn('Borrar todos los datos', () => { if (confirm('Se borrarán monedas, desbloqueos, logros y ajustes de este dispositivo. ¿Continuar?')) { borrarTodo(); location.reload(); } }, 'peligro'));
  }
};

export function abrirAjustes(inicial) {
  modal('Ajustes', (c) => {
    const nombres = Object.keys(PEST), cuerpo = h('div', { cls: 'pest-cuerpo' }), barra = h('div', { cls: 'pestanas', role: 'tablist' });
    const bs = nombres.map((n) => { const b = h('button', { type: 'button', cls: 'btn sec', role: 'tab', 'data-f': 1, txt: n, on: { click: () => ir(n) } }); barra.appendChild(b); return b; });
    function ir(n) { bs.forEach((b) => b.setAttribute('aria-selected', String(b.textContent === n))); cuerpo.textContent = ''; PEST[n](cuerpo); }
    c.appendChild(barra); c.appendChild(cuerpo); ir(inicial || nombres[0]);
  }, { ancha: true });
}
