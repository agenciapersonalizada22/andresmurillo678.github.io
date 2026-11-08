// Ajustes: modelo (compartido y por dispositivo) y panel con pestanas navegables por raton, tactil, teclado y mando.
import { CLAVES, leer, escribir, mezclar, exportar, importar, borrarTodo } from './almacen.js';
import { h } from './dom.js';
import { TEMAS_FICHA, TEMAS_MESA } from './dibujo.js';
import { Sonido } from './sonido.js';
import { bloqueNube } from './cuenta-domino.js';

const BASE = {
  tema: 'marfil', mesa: 'fieltro', pips: 'negro',
  sonido: { maestro: 0.8, musica: 0.2, efectos: 0.9, musicaOn: false, pausaOculta: true },
  acc: { textoGrande: false, reducirMov: false, altoContraste: false, anuncios: true, numeros: false },
  juego: { paseAuto: true, confirmar: true, pistas: true, ayudaExtremos: true, ordenar: true },
  setup: { reglas: {}, niveles: [1, 1, 1], juntos: true }
};
export const TECLAS_BASE = { izq: 'arrowleft', der: 'arrowright', jugar: 'enter', extremo: 'tab', pasar: 'p', robar: 'r', chat: 't', menu: 'escape', zoomMas: '+', zoomMenos: '-', ajustar: '0' };
const BASE_DISP = {
  calidad: 'alta', fps: false, fpsMax: 0, autoBajada: true, particulas: true, sombras: true, detalle: true, resolucion: 100, vibracion: true, zonaMuerta: 0.25,
  zurdo: false, tamFicha: 100, opBotones: 100, posBotones: 'auto', sensZoom: 1, teclas: { ...TECLAS_BASE }
};
export const PRESETS = {
  baja: { particulas: false, sombras: false, detalle: false, resolucion: 70 },
  media: { particulas: false, sombras: true, detalle: false, resolucion: 100 },
  alta: { particulas: true, sombras: true, detalle: true, resolucion: 100 },
  ultra: { particulas: true, sombras: true, detalle: true, resolucion: 150 }
};
export const A = { ...mezclar(BASE, leer(CLAVES.ajustes, {})) };
export const D = { ...mezclar(BASE_DISP, leer(CLAVES.dispositivo, {})) };
if (!leer(CLAVES.dispositivo)) {
  try { if (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600) { D.calidad = 'media'; Object.assign(D, PRESETS.media); } } catch (e) { /* sin matchMedia */ }
}
let alCambiar = [];
export const suscribir = (fn) => alCambiar.push(fn);
let diferido = 0;
export function guardar() {
  clearTimeout(diferido);
  diferido = setTimeout(() => { escribir(CLAVES.ajustes, A); escribir(CLAVES.dispositivo, D); }, 250);
  aplicar();
  alCambiar.forEach((f) => f());
}
export function guardarYa() { clearTimeout(diferido); escribir(CLAVES.ajustes, A); escribir(CLAVES.dispositivo, D); }

export function aplicar() {
  const c = document.body.classList;
  c.toggle('texto-grande', A.acc.textoGrande);
  c.toggle('sinmov', A.acc.reducirMov);
  c.toggle('contraste', A.acc.altoContraste);
  c.toggle('zurdo', D.zurdo);
  c.toggle('sin-sombras', !D.sombras);
  for (const q of Object.keys(PRESETS)) c.toggle('q-' + q, D.calidad === q);
  document.documentElement.style.setProperty('--op-botones', String(D.opBotones / 100));
  document.documentElement.dataset.botones = D.posBotones;
  Sonido.ajustar(A.sonido);
}
export const reducirMov = () => A.acc.reducirMov;

/* ---------- panel ---------- */
const PESTANAS = [['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['acc', 'Accesibilidad'], ['juego', 'Juego'], ['datos', 'Datos']];
const NOMBRES_TECLAS = { izq: 'Ficha a la izquierda', der: 'Ficha a la derecha', jugar: 'Jugar ficha', extremo: 'Cambiar extremo', pasar: 'Pasar', robar: 'Robar del pozo', chat: 'Chat', menu: 'Menú / pausa', zoomMas: 'Acercar tablero', zoomMenos: 'Alejar tablero', ajustar: 'Ajustar vista' };

export function panelAjustes(cont, opts = {}) {
  let pest = opts.pest || 'graficos';
  const cuerpo = h('div', { cls: 'aj-cuerpo' });
  const tabs = h('div', { cls: 'aj-tabs', role: 'tablist' });
  const botonesTab = {};
  PESTANAS.forEach(([id, nom]) => {
    const b = h('button', { type: 'button', cls: 'aj-tab', role: 'tab', 'data-f': 1, txt: nom, on: { click: () => ir(id) } });
    botonesTab[id] = b; tabs.appendChild(b);
  });
  function ir(id) {
    pest = id;
    for (const k in botonesTab) { botonesTab[k].setAttribute('aria-selected', String(k === id)); botonesTab[k].classList.toggle('on', k === id); }
    cuerpo.textContent = '';
    CONSTRUCTORES[id](cuerpo);
  }
  cont.appendChild(tabs); cont.appendChild(cuerpo);
  ir(pest);
  return { ir, siguiente: (d) => { const ids = PESTANAS.map((p) => p[0]); ir(ids[(ids.indexOf(pest) + d + ids.length) % ids.length]); } };
}

const fila = (etq, ctl, ayuda) => h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq' }, [etq, ayuda ? h('small', { txt: ayuda }) : null]), ctl]);
const interruptor = (obj, k, extra) => {
  const b = h('button', { type: 'button', cls: 'aj-sw', role: 'switch', 'data-f': 1, 'aria-checked': String(!!obj[k]), on: { click: () => { obj[k] = !obj[k]; b.setAttribute('aria-checked', String(obj[k])); guardar(); if (extra) extra(obj[k]); } } }, [h('i')]);
  return b;
};
const deslizador = (obj, k, min, max, paso, fmt, extra) => {
  const out = h('output', { txt: fmt ? fmt(obj[k]) : String(obj[k]) });
  const i = h('input', { type: 'range', min, max, step: paso, value: obj[k], 'data-f': 1, on: { input: () => { obj[k] = +i.value; out.textContent = fmt ? fmt(obj[k]) : String(obj[k]); guardar(); if (extra) extra(obj[k]); } } });
  return h('div', { cls: 'aj-rango' }, [i, out]);
};
const opciones = (obj, k, lista, extra) => {
  const g = h('div', { cls: 'aj-opc', role: 'group' });
  lista.forEach(([val, nom]) => {
    const b = h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(obj[k] === val), on: { click: () => { obj[k] = val; Array.from(g.children).forEach((x, i) => x.setAttribute('aria-pressed', String(lista[i][0] === val))); guardar(); if (extra) extra(val); } } });
    g.appendChild(b);
  });
  return g;
};

const CONSTRUCTORES = {
  graficos(c) {
    c.appendChild(fila('Calidad', opciones(D, 'calidad', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], (q) => { Object.assign(D, PRESETS[q]); guardar(); c.textContent = ''; CONSTRUCTORES.graficos(c); })));
    c.appendChild(fila('Fichas', opciones(A, 'tema', Object.keys(TEMAS_FICHA).map((k) => [k, TEMAS_FICHA[k].nombre]))));
    c.appendChild(fila('Mesa', opciones(A, 'mesa', Object.keys(TEMAS_MESA).map((k) => [k, TEMAS_MESA[k].nombre]))));
    c.appendChild(fila('Color de los puntos', opciones(A, 'pips', [['negro', 'Clásico'], ['color', 'Por número'], ['dalto', 'Daltónico']]), 'Cada número con su color; «Daltónico» usa una paleta distinguible.'));
    c.appendChild(fila('Sombras', interruptor(D, 'sombras')));
    c.appendChild(fila('Detalle de fichas y mesa', interruptor(D, 'detalle'), 'Degradados, brillos y textura de fieltro.'));
    c.appendChild(fila('Partículas y celebraciones', interruptor(D, 'particulas')));
    c.appendChild(fila('Resolución del tablero', deslizador(D, 'resolucion', 50, 200, 10, (x) => x + '%'), 'Más alto = más nítido y más consumo (200% solo en equipos potentes).'));
    c.appendChild(fila('Límite de FPS', opciones(D, 'fpsMax', [[0, 'Sin límite'], [60, '60'], [30, '30']])));
    c.appendChild(fila('Bajar calidad si va lento', interruptor(D, 'autoBajada'), 'Reduce la calidad automáticamente si los cuadros por segundo caen.'));
    c.appendChild(fila('Mostrar FPS', interruptor(D, 'fps')));
  },
  audio(c) {
    c.appendChild(fila('Volumen general', deslizador(A.sonido, 'maestro', 0, 1, 0.05, (x) => Math.round(x * 100) + '%')));
    c.appendChild(fila('Efectos', deslizador(A.sonido, 'efectos', 0, 1, 0.05, (x) => Math.round(x * 100) + '%', () => Sonido.fx('ficha'))));
    c.appendChild(fila('Música ambiental', interruptor(A.sonido, 'musicaOn', (on) => { Sonido.despertar(); Sonido.musica(on); })));
    c.appendChild(fila('Volumen de música', deslizador(A.sonido, 'musica', 0, 1, 0.05, (x) => Math.round(x * 100) + '%')));
    c.appendChild(fila('Pausar sonido al ocultar la pestaña', interruptor(A.sonido, 'pausaOculta')));
  },
  controles(c) {
    c.appendChild(fila('Modo zurdo', interruptor(D, 'zurdo'), 'Los botones de acción pasan al lado izquierdo.'));
    c.appendChild(fila('Tamaño de las fichas de tu mano', deslizador(D, 'tamFicha', 70, 130, 5, (x) => x + '%')));
    c.appendChild(fila('Opacidad de los botones', deslizador(D, 'opBotones', 40, 100, 5, (x) => x + '%')));
    c.appendChild(fila('Posición de los botones', opciones(D, 'posBotones', [['auto', 'Automática'], ['izq', 'Izquierda'], ['der', 'Derecha']])));
    c.appendChild(fila('Sensibilidad del zoom', deslizador(D, 'sensZoom', 0.5, 2, 0.1, (x) => 'x' + x.toFixed(1))));
    c.appendChild(fila('Zona muerta del mando', deslizador(D, 'zonaMuerta', 0.1, 0.6, 0.05, (x) => Math.round(x * 100) + '%')));
    c.appendChild(fila('Vibración del mando', interruptor(D, 'vibracion')));
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Teclas (toca una y pulsa la nueva)' }));
    for (const k of Object.keys(TECLAS_BASE)) {
      const b = h('button', { type: 'button', cls: 'aj-tecla', 'data-f': 1, txt: nombreTecla(D.teclas[k]) });
      b.addEventListener('click', () => {
        b.textContent = 'Pulsa una tecla…';
        const f = (e) => { e.preventDefault(); e.stopPropagation(); if (e.key !== 'Escape') { D.teclas[k] = e.key.toLowerCase(); guardar(); } b.textContent = nombreTecla(D.teclas[k]); window.removeEventListener('keydown', f, true); };
        window.addEventListener('keydown', f, true);
      });
      c.appendChild(fila(NOMBRES_TECLAS[k], b));
    }
    c.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Restablecer teclas', on: { click: () => { D.teclas = { ...TECLAS_BASE }; guardar(); c.textContent = ''; CONSTRUCTORES.controles(c); } } }));
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'Mando Xbox: cruceta o stick izquierdo recorren tu mano · A jugar · LB/RB cambian de extremo · X robar · Y pasar · stick derecho mueve el tablero · LT/RT zoom · L3 ajusta la vista · ARRIBA chat · MENÚ pausa.' }));
  },
  acc(c) {
    c.appendChild(fila('Texto grande', interruptor(A.acc, 'textoGrande')));
    c.appendChild(fila('Reducir movimiento', interruptor(A.acc, 'reducirMov'), 'Sin animaciones de vuelo ni celebraciones.'));
    c.appendChild(fila('Alto contraste', interruptor(A.acc, 'altoContraste')));
    c.appendChild(fila('Números en lugar de puntos', interruptor(A.acc, 'numeros'), 'Muestra el número de cada mitad de la ficha.'));
    c.appendChild(fila('Paleta daltónica de puntos', opciones(A, 'pips', [['negro', 'Normal'], ['dalto', 'Daltónica']])));
    c.appendChild(fila('Anunciar jugadas (lector de pantalla)', interruptor(A.acc, 'anuncios')));
  },
  juego(c) {
    c.appendChild(fila('Pasar automáticamente', interruptor(A.juego, 'paseAuto'), 'Si no tienes ficha jugable (y no hay pozo) se pasa solo.'));
    c.appendChild(fila('Confirmar cada jugada', interruptor(A.juego, 'confirmar'), 'Con esto activo hay que tocar la ficha dos veces (elegir y jugar). Sin él, una ficha con un único extremo posible se juega al primer toque.'));
    c.appendChild(fila('Resaltar extremos y fichas jugables', interruptor(A.juego, 'ayudaExtremos')));
    c.appendChild(fila('Ordenar mi mano', interruptor(A.juego, 'ordenar'), 'Por valor; si no, en el orden en que las recibiste.'));
    c.appendChild(fila('Pistas de ayuda en las primeras partidas', interruptor(A.juego, 'pistas')));
    c.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Ver el tutorial de nuevo', on: { click: () => { window.dispatchEvent(new CustomEvent('domino-tutorial')); } } }));
  },
  datos(c) {
    const area = h('textarea', { cls: 'aj-texto', rows: 4, 'data-f': 1, placeholder: 'Aquí aparece o se pega el texto de tu guardado', spellcheck: 'false' });
    const msg = h('div', { cls: 'aj-msg', 'aria-live': 'polite' });
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'El guardado incluye progreso, logros, fichas virtuales y ajustes generales (no los gráficos/controles de este dispositivo).' }));
    c.appendChild(area);
    c.appendChild(h('div', { cls: 'aj-botones' }, [
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Exportar', on: { click: () => { guardarYa(); area.value = exportar(); area.select(); try { navigator.clipboard.writeText(area.value); msg.textContent = 'Texto copiado.'; } catch (e) { msg.textContent = 'Copia el texto manualmente.'; } } } }),
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Importar', on: { click: () => { if (importar(area.value)) { msg.textContent = 'Importado. Recargando…'; setTimeout(() => location.reload(), 600); } else msg.textContent = 'Texto no válido.'; } } }),
      h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todo', on: { click: () => { if (confirm('¿Borrar progreso, logros, fichas, ajustes y partida guardada de este dispositivo? Si tienes sesión, la copia de tu cuenta en la nube se conserva y puede volver a bajarse al sincronizar.')) { borrarTodo(); location.reload(); } } } })
    ]));
    c.appendChild(msg);
    c.appendChild(bloqueNube());
  }
};
function nombreTecla(k) { return ({ ' ': 'Espacio', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', enter: 'Enter', escape: 'Esc' })[k] || String(k).toUpperCase(); }
export { nombreTecla };
