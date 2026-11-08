// Ajustes: modelo (compartido y por dispositivo) y panel con pestanas navegables por raton, tactil, teclado y mando.
import { CLAVES, leer, escribir, mezclar, exportar, importar, borrarTodo } from './almacen.js';
import { h } from './dom.js';
import { Sonido } from './sonido.js';
import { bloqueNube } from './cuenta-colonos.js';

const BASE = {
  sonido: { maestro: 0.8, musica: 0.25, efectos: 0.9, musicaOn: false, pausaOculta: true },
  acc: { textoGrande: false, reducirMov: false, altoContraste: false, daltonico: false, anuncios: true },
  ayudas: { pips: true, calor: true, pistas: true, hover: true },
  setup: { n: 4, niveles: [1, 1, 1], cfg: { radio: 2, meta: 10, tablero: 'equilibrado', tiempo: 0, trato: true, bancoLimitado: true } }
};
export const TECLAS_BASE = { tirar: 'd', construir: 'b', comerciar: 'm', cartas: 'c', terminar: 'e', confirmar: 'enter', zoomMas: '+', zoomMenos: '-', centrar: 'h', calor: 'v', chat: 't', menu: 'p', ayuda: '?' };
const NOMBRES_TECLAS = { tirar: 'Tirar dados', construir: 'Menú construir', comerciar: 'Comerciar', cartas: 'Cartas de desarrollo', terminar: 'Terminar turno', confirmar: 'Confirmar selección', zoomMas: 'Acercar', zoomMenos: 'Alejar', centrar: 'Centrar tablero', calor: 'Mapa de probabilidades', chat: 'Chat', menu: 'Pausa', ayuda: 'Ayuda' };
const BASE_DISP = {
  calidad: 'alta', sombras: true, olas: true, particulas: true, antialias: true, resolucion: 'auto', fpsMax: 60, fps: false, autoBajada: true,
  vibracion: true, vibInt: 1, zonaMuerta: 0.2, sensPan: 1, sensZoom: 1, invertirY: false, zurdo: false, tamBotones: 100, opBotones: 100, posBotones: 'auto', confirmar: 'auto',
  teclas: { ...TECLAS_BASE }
};
export const PRESETS = {
  baja: { sombras: false, olas: false, particulas: false, antialias: false, resolucion: 0.75, fpsMax: 30 },
  media: { sombras: true, olas: false, particulas: false, antialias: true, resolucion: 1, fpsMax: 60 },
  alta: { sombras: true, olas: true, particulas: true, antialias: true, resolucion: 'auto', fpsMax: 60 },
  ultra: { sombras: true, olas: true, particulas: true, antialias: true, resolucion: 2, fpsMax: 0 }
};
export const A = { ...mezclar(BASE, leer(CLAVES.ajustes, {})) };
if (!Array.isArray(A.setup.niveles)) A.setup.niveles = [1, 1, 1];
export const D = { ...mezclar(BASE_DISP, leer(CLAVES.dispositivo, {})) };
if (!leer(CLAVES.dispositivo)) {
  try { if (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600) { D.calidad = 'media'; Object.assign(D, PRESETS.media); } } catch (e) { /* sin matchMedia */ }
}
const alCambiar = [];
export const suscribir = (fn) => alCambiar.push(fn);
let diferido = 0;
export function guardar() {
  clearTimeout(diferido);
  diferido = setTimeout(() => { escribir(CLAVES.ajustes, A); escribir(CLAVES.dispositivo, D); }, 250);
  aplicar();
  alCambiar.forEach((f) => f());
}
export function guardarYa() { clearTimeout(diferido); escribir(CLAVES.ajustes, A); escribir(CLAVES.dispositivo, D); }
export const esTactil = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
export const pedirConfirmacion = () => (D.confirmar === 'si' || (D.confirmar === 'auto' && esTactil()));

export function aplicar() {
  const c = document.body.classList, r = document.documentElement;
  c.toggle('texto-grande', A.acc.textoGrande);
  c.toggle('sinmov', A.acc.reducirMov);
  c.toggle('contraste', A.acc.altoContraste);
  c.toggle('zurdo', D.zurdo);
  c.toggle('sin-sombras', !D.sombras);
  for (const q of Object.keys(PRESETS)) c.toggle('q-' + q, D.calidad === q);
  r.style.setProperty('--tam-botones', String(D.tamBotones / 100));
  r.style.setProperty('--op-botones', String(D.opBotones / 100));
  r.dataset.botones = D.posBotones;
  Sonido.ajustar(A.sonido);
}
export const reducirMov = () => A.acc.reducirMov;

/* ---------- panel ---------- */
const PESTANAS = [['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['acc', 'Accesibilidad'], ['datos', 'Datos']];
export function panelAjustes(cont, opts = {}) {
  let pest = opts.pest || 'graficos';
  const cuerpo = h('div', { cls: 'aj-cuerpo' }), tabs = h('div', { cls: 'aj-tabs', role: 'tablist' }), botonesTab = {};
  PESTANAS.forEach(([id, nom]) => { const b = h('button', { type: 'button', cls: 'aj-tab', role: 'tab', 'data-f': 1, txt: nom, on: { click: () => ir(id) } }); botonesTab[id] = b; tabs.appendChild(b); });
  function ir(id) {
    pest = id;
    for (const k in botonesTab) { botonesTab[k].setAttribute('aria-selected', String(k === id)); botonesTab[k].classList.toggle('on', k === id); }
    cuerpo.textContent = ''; CONSTRUCTORES[id](cuerpo);
  }
  cont.appendChild(tabs); cont.appendChild(cuerpo); ir(pest);
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
  lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(obj[k] === val), on: { click: () => { obj[k] = val; Array.from(g.children).forEach((x, i) => x.setAttribute('aria-pressed', String(lista[i][0] === val))); guardar(); if (extra) extra(val); } } })));
  return g;
};
const pct = (x) => Math.round(x * 100) + '%';

const CONSTRUCTORES = {
  graficos(c) {
    const rehacer = () => { c.textContent = ''; CONSTRUCTORES.graficos(c); };
    c.appendChild(fila('Calidad', opciones(D, 'calidad', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], (q) => { Object.assign(D, PRESETS[q]); guardar(); rehacer(); })));
    c.appendChild(fila('Sombras y relieve', interruptor(D, 'sombras')));
    c.appendChild(fila('Olas y mar animado', interruptor(D, 'olas')));
    c.appendChild(fila('Partículas y brillos', interruptor(D, 'particulas')));
    c.appendChild(fila('Suavizado (antialias)', interruptor(D, 'antialias')));
    c.appendChild(fila('Resolución', opciones(D, 'resolucion', [[0.75, '75%'], [1, '100%'], ['auto', 'Auto'], [1.5, '150%'], [2, '200%']]), 'Más resolución se ve más nítido pero cuesta más GPU.'));
    c.appendChild(fila('Límite de FPS', opciones(D, 'fpsMax', [[30, '30'], [60, '60'], [120, '120'], [0, 'Sin límite']])));
    c.appendChild(fila('Bajar calidad si va lento', interruptor(D, 'autoBajada'), 'Reduce la calidad automáticamente si los FPS caen.'));
    c.appendChild(fila('Mostrar FPS', interruptor(D, 'fps')));
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Ayudas visuales' }));
    c.appendChild(fila('Puntos de probabilidad en las fichas', interruptor(A.ayudas, 'pips'), 'Los puntitos bajo cada número: más puntos, más probable.'));
    c.appendChild(fila('Mapa de calor al elegir poblado', interruptor(A.ayudas, 'calor'), 'Colorea los mejores lugares para fundar.'));
    c.appendChild(fila('Datos al pasar el ratón / mantener pulsado', interruptor(A.ayudas, 'hover')));
    c.appendChild(fila('Pistas de tutorial', interruptor(A.ayudas, 'pistas')));
  },
  audio(c) {
    c.appendChild(fila('Volumen general', deslizador(A.sonido, 'maestro', 0, 1, 0.05, pct)));
    c.appendChild(fila('Efectos', deslizador(A.sonido, 'efectos', 0, 1, 0.05, pct, () => Sonido.fx('click'))));
    c.appendChild(fila('Música ambiental', interruptor(A.sonido, 'musicaOn', (on) => { Sonido.despertar(); Sonido.musica(on); })));
    c.appendChild(fila('Volumen de música', deslizador(A.sonido, 'musica', 0, 1, 0.05, pct)));
    c.appendChild(fila('Pausar sonido al ocultar la pestaña', interruptor(A.sonido, 'pausaOculta')));
  },
  controles(c) {
    c.appendChild(fila('Confirmar antes de construir', opciones(D, 'confirmar', [['auto', 'Auto (táctil)'], ['si', 'Siempre'], ['no', 'Nunca']]), 'Evita construir donde no querías al tocar.'));
    c.appendChild(fila('Sensibilidad al arrastrar', deslizador(D, 'sensPan', 0.5, 2, 0.1, (x) => 'x' + x.toFixed(1))));
    c.appendChild(fila('Sensibilidad del zoom', deslizador(D, 'sensZoom', 0.5, 2, 0.1, (x) => 'x' + x.toFixed(1))));
    c.appendChild(fila('Invertir eje vertical del stick', interruptor(D, 'invertirY')));
    c.appendChild(fila('Modo zurdo', interruptor(D, 'zurdo'), 'Los botones de acción pasan al lado izquierdo.'));
    c.appendChild(fila('Tamaño de los botones', deslizador(D, 'tamBotones', 80, 130, 5, (x) => x + '%')));
    c.appendChild(fila('Opacidad de los botones', deslizador(D, 'opBotones', 40, 100, 5, (x) => x + '%')));
    c.appendChild(fila('Posición de los botones', opciones(D, 'posBotones', [['auto', 'Automática'], ['izq', 'Izquierda'], ['der', 'Derecha']])));
    c.appendChild(fila('Zona muerta del mando', deslizador(D, 'zonaMuerta', 0.05, 0.6, 0.05, pct)));
    c.appendChild(fila('Vibración del mando', interruptor(D, 'vibracion')));
    c.appendChild(fila('Intensidad de vibración', deslizador(D, 'vibInt', 0.2, 1, 0.1, pct)));
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
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'Flechas: mover selección o desplazar el mapa · Rueda / pellizco: zoom · Mando Xbox: stick izq. mueve la selección, stick der. desplaza, gatillos zoom, A confirmar/tirar, B cancelar, X comerciar, Y cartas, LB/RB elegir qué construir, VISTA terminar turno, MENÚ pausa.' }));
  },
  acc(c) {
    c.appendChild(fila('Texto grande', interruptor(A.acc, 'textoGrande')));
    c.appendChild(fila('Reducir movimiento y efectos', interruptor(A.acc, 'reducirMov'), 'Sin olas, destellos ni animaciones de dados.'));
    c.appendChild(fila('Alto contraste', interruptor(A.acc, 'altoContraste')));
    c.appendChild(fila('Modo daltónico', interruptor(A.acc, 'daltonico'), 'Paleta alternativa y marcas con el número de jugador en las piezas.'));
    c.appendChild(fila('Anunciar jugadas (lector de pantalla)', interruptor(A.acc, 'anuncios')));
  },
  datos(c) {
    const area = h('textarea', { cls: 'aj-texto', rows: 4, 'data-f': 1, placeholder: 'Aquí aparece o se pega el texto de tu guardado', spellcheck: 'false' });
    const msg = h('div', { cls: 'aj-msg', 'aria-live': 'polite' });
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'El guardado incluye progreso, logros y ajustes generales (no los gráficos/controles de este dispositivo ni la partida en curso).' }));
    c.appendChild(area);
    c.appendChild(h('div', { cls: 'aj-botones' }, [
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Exportar', on: { click: () => { guardarYa(); area.value = exportar(); area.select(); try { navigator.clipboard.writeText(area.value); msg.textContent = 'Texto copiado.'; } catch (e) { msg.textContent = 'Copia el texto manualmente.'; } } } }),
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Importar', on: { click: () => { if (importar(area.value)) { msg.textContent = 'Importado. Recargando…'; setTimeout(() => location.reload(), 600); } else msg.textContent = 'Texto no válido.'; } } }),
      h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todo', on: { click: () => { if (confirm('¿Borrar progreso, logros, ajustes y partida guardada de este dispositivo? Si tienes sesión, la copia de tu cuenta en la nube se conserva y puede volver a bajarse al sincronizar.')) { borrarTodo(); location.reload(); } } } })
    ]));
    c.appendChild(msg);
    c.appendChild(bloqueNube());
  }
};
export function nombreTecla(k) { return ({ ' ': 'Espacio', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', enter: 'Enter', escape: 'Esc' })[k] || String(k).toUpperCase(); }
