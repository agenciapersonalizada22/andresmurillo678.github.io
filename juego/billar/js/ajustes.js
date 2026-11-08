// Ajustes: modelo (compartido y por dispositivo) y panel con pestanas navegables por raton, tactil, teclado y mando.
import { CLAVES, leer, escribir, mezclar, exportar, importar, borrarTodo } from './almacen.js';
import { h } from './dom.js';
import { Sonido } from './sonido.js';
import { bloqueNube } from './cuenta-billar.js';

const BASE = {
  sonido: { maestro: 0.8, musica: 0.25, efectos: 0.9, musicaOn: false, pausaOculta: true },
  acc: { textoGrande: false, reducirMov: false, altoContraste: false, daltonismo: false },
  juego: { guia: 'larga', guiaRebote: true, ayudaTronera: true, vista: '3d', bots: 2, modo: 'bola8', objetivo: 15, velocidad: 1 }
};
export const TECLAS_BASE = { izq: 'arrowleft', der: 'arrowright', masFuerza: 'arrowup', menosFuerza: 'arrowdown', tirar: ' ', vista: 'v', menu: 'escape', centrar: 'c', efArriba: 'w', efAbajo: 's', efIzq: 'a', efDer: 'd', zoomMas: '+', zoomMenos: '-' };
const NOMBRES_TECLAS = { izq: 'Girar a la izquierda', der: 'Girar a la derecha', masFuerza: 'Más fuerza', menosFuerza: 'Menos fuerza', tirar: 'Tirar', vista: 'Cambiar vista 3D / cenital', menu: 'Pausa', centrar: 'Efecto al centro', efArriba: 'Efecto: arriba (seguir)', efAbajo: 'Efecto: abajo (retroceso)', efIzq: 'Efecto: izquierda', efDer: 'Efecto: derecha', zoomMas: 'Acercar cámara', zoomMenos: 'Alejar cámara' };
const BASE_DISP = {
  calidad: 'alta', fps: false, autoBajada: true, sombras: true, antialias: true, pixelRatio: 2, detalle: 1, limiteFps: 0, reflejos: true,
  sens: 1, invertirY: false, zonaMuerta: 0.2, vibracion: true, vibInt: 0.7, zurdo: false, tamControles: 100, opControles: 100, posControles: 'auto',
  soltarParaTirar: true, teclas: { ...TECLAS_BASE }
};
export const PRESETS = {
  baja: { sombras: false, antialias: false, pixelRatio: 1, detalle: 0, reflejos: false },
  media: { sombras: true, antialias: false, pixelRatio: 1.5, detalle: 1, reflejos: false },
  alta: { sombras: true, antialias: true, pixelRatio: 2, detalle: 1, reflejos: true },
  ultra: { sombras: true, antialias: true, pixelRatio: 3, detalle: 2, reflejos: true }
};
export const A = { ...mezclar(BASE, leer(CLAVES.ajustes, {})) };
export const D = { ...mezclar(BASE_DISP, leer(CLAVES.dispositivo, {})) };
D.teclas = { ...TECLAS_BASE, ...(D.teclas || {}) };
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
  const r = document.documentElement.style;
  r.setProperty('--ctl-k', String(D.tamControles / 100));
  r.setProperty('--op-ctl', String(D.opControles / 100));
  document.documentElement.dataset.botones = D.posControles;
  Sonido.ajustar(A.sonido);
}
export const reducirMov = () => A.acc.reducirMov;

/* ---------- panel ---------- */
const PESTANAS = [['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['juego', 'Juego'], ['acc', 'Accesibilidad'], ['datos', 'Datos']];

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
    const rehacer = () => { c.textContent = ''; CONSTRUCTORES.graficos(c); };
    const manual = (obj, k) => { D.calidad = 'personalizada'; guardar(); };
    c.appendChild(fila('Calidad', opciones(D, 'calidad', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], (q) => { Object.assign(D, PRESETS[q]); guardar(); rehacer(); }), D.calidad === 'personalizada' ? 'Personalizada (ajustada a mano).' : ''));
    c.appendChild(fila('Sombras', interruptor(D, 'sombras', () => manual())));
    c.appendChild(fila('Reflejos y brillo de las bolas', interruptor(D, 'reflejos', () => manual())));
    c.appendChild(fila('Suavizado de bordes (antialias)', interruptor(D, 'antialias', () => manual()), 'Se aplica al instante recreando el lienzo.'));
    c.appendChild(fila('Resolución máxima', opciones(D, 'pixelRatio', [[1, '1x'], [1.5, '1.5x'], [2, '2x'], [3, '3x']], () => manual()), 'Más resolución se ve más nítido pero exige más a la GPU.'));
    c.appendChild(fila('Detalle de las bolas', opciones(D, 'detalle', [[0, 'Bajo'], [1, 'Medio'], [2, 'Alto']], () => manual())));
    c.appendChild(fila('Límite de FPS', opciones(D, 'limiteFps', [[0, 'Libre'], [30, '30'], [60, '60'], [120, '120']])));
    c.appendChild(fila('Bajar calidad si va lento', interruptor(D, 'autoBajada'), 'Reduce la calidad automáticamente si los cuadros por segundo caen.'));
    c.appendChild(fila('Mostrar FPS', interruptor(D, 'fps')));
  },
  audio(c) {
    c.appendChild(fila('Volumen general', deslizador(A.sonido, 'maestro', 0, 1, 0.05, (x) => Math.round(x * 100) + '%')));
    c.appendChild(fila('Efectos', deslizador(A.sonido, 'efectos', 0, 1, 0.05, (x) => Math.round(x * 100) + '%', () => { Sonido.despertar(); Sonido.fx('bola', 3); })));
    c.appendChild(fila('Música ambiental', interruptor(A.sonido, 'musicaOn', (on) => { Sonido.despertar(); Sonido.musica(on); })));
    c.appendChild(fila('Volumen de música', deslizador(A.sonido, 'musica', 0, 1, 0.05, (x) => Math.round(x * 100) + '%')));
    c.appendChild(fila('Pausar sonido al ocultar la pestaña', interruptor(A.sonido, 'pausaOculta')));
  },
  controles(c) {
    c.appendChild(fila('Modo zurdo', interruptor(D, 'zurdo'), 'Intercambia el lado de la fuerza y del efecto.'));
    c.appendChild(fila('Tamaño de los controles táctiles', deslizador(D, 'tamControles', 70, 140, 5, (x) => x + '%')));
    c.appendChild(fila('Opacidad de los controles', deslizador(D, 'opControles', 40, 100, 5, (x) => x + '%')));
    c.appendChild(fila('Posición de la barra de fuerza', opciones(D, 'posControles', [['auto', 'Automática'], ['izq', 'Izquierda'], ['der', 'Derecha']])));
    c.appendChild(fila('Sensibilidad al apuntar', deslizador(D, 'sens', 0.3, 2.5, 0.1, (x) => 'x' + x.toFixed(1)), 'Menor valor = giro más fino al arrastrar.'));
    c.appendChild(fila('Invertir giro vertical de la cámara', interruptor(D, 'invertirY')));
    c.appendChild(fila('Tirar al soltar la barra de fuerza', interruptor(D, 'soltarParaTirar'), 'Desliza la fuerza hacia abajo y suelta. Si lo apagas usa el botón TIRAR.'));
    c.appendChild(fila('Zona muerta del mando', deslizador(D, 'zonaMuerta', 0.1, 0.6, 0.05, (x) => Math.round(x * 100) + '%')));
    c.appendChild(fila('Vibración del mando', interruptor(D, 'vibracion')));
    c.appendChild(fila('Intensidad de la vibración', deslizador(D, 'vibInt', 0.1, 1, 0.1, (x) => Math.round(x * 100) + '%')));
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
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'Mando Xbox: stick izquierdo gira · stick derecho ↑↓ fuerza · cruceta efecto · LT apuntado fino · A tirar · X vista · Y efecto al centro · MENÚ pausa. Ratón: arrastra para apuntar, rueda = fuerza, clic derecho arrastrando = cámara. Táctil: arrastra para apuntar, desliza la barra de fuerza.' }));
  },
  juego(c) {
    c.appendChild(fila('Línea guía', opciones(A.juego, 'guia', [['ninguna', 'Ninguna'], ['corta', 'Corta'], ['media', 'Media'], ['larga', 'Larga']]), 'Cuánto de la trayectoria se dibuja. «Ninguna» es el reto máximo.'));
    c.appendChild(fila('Mostrar rebote en banda', interruptor(A.juego, 'guiaRebote')));
    c.appendChild(fila('Vista inicial', opciones(A.juego, 'vista', [['3d', '3D'], ['cenital', 'Cenital']])));
    c.appendChild(fila('Velocidad de simulación', opciones(A.juego, 'velocidad', [[0.5, 'Lenta'], [1, 'Normal'], [2, 'Rápida']]), 'Solo cambia la rapidez con la que ves rodar las bolas, no el resultado.'));
  },
  acc(c) {
    c.appendChild(fila('Texto grande', interruptor(A.acc, 'textoGrande')));
    c.appendChild(fila('Reducir movimiento', interruptor(A.acc, 'reducirMov'), 'Sin animaciones de cámara ni destellos.'));
    c.appendChild(fila('Alto contraste', interruptor(A.acc, 'altoContraste')));
    c.appendChild(fila('Modo daltónico', interruptor(A.acc, 'daltonismo'), 'Bolas con números grandes y paleta distinguible (azul/naranja).'));
  },
  datos(c) {
    const area = h('textarea', { cls: 'aj-texto', rows: 4, 'data-f': 1, placeholder: 'Aquí aparece o se pega el texto de tu guardado', spellcheck: 'false' });
    const msg = h('div', { cls: 'aj-msg', 'aria-live': 'polite' });
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'El guardado incluye monedas, tienda, estadísticas y logros (no los gráficos/controles de este dispositivo).' }));
    c.appendChild(area);
    c.appendChild(h('div', { cls: 'aj-botones' }, [
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Exportar', on: { click: () => { guardarYa(); area.value = exportar(); area.select(); try { navigator.clipboard.writeText(area.value); msg.textContent = 'Texto copiado.'; } catch (e) { msg.textContent = 'Copia el texto manualmente.'; } } } }),
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Importar', on: { click: () => { if (importar(area.value)) { msg.textContent = 'Importado. Recargando…'; setTimeout(() => location.reload(), 600); } else msg.textContent = 'Texto no válido.'; } } }),
      h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todo', on: { click: () => { if (confirm('¿Borrar progreso, tienda, ajustes y partida guardada de este dispositivo? Si tienes sesión, la copia de tu cuenta en la nube se conserva y puede volver a bajarse al sincronizar.')) { borrarTodo(); location.reload(); } } } })
    ]));
    c.appendChild(msg);
    c.appendChild(bloqueNube());
  }
};
function nombreTecla(k) { return ({ ' ': 'Espacio', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', enter: 'Enter', escape: 'Esc' })[k] || String(k).toUpperCase(); }
export { nombreTecla };
