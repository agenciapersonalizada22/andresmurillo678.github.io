// Ajustes: modelo (A = partida, D = por dispositivo) y panel con pestanas navegables por raton, tactil, teclado y mando.
import { CLAVES, leer, escribir, mezclar, exportar, importar, borrarTodo } from './almacen.js';
import { h } from './dom.js';
import { Sonido } from './sonido.js';
import { bloqueNube } from './cuenta-conquista.js';

const BASE = { setup: { n: 4, niveles: [1, 1, 1, 1, 1], cfg: { modo: 'dominacion', objetivos: false, tiempo: 0, rondaMax: 0 } } };
export const TECLAS_BASE = { aceptar: 'enter', atras: 'escape', blitz: 'b', terminar: 't', cartas: 'c', objetivo: 'o', mundo: 'm', cantidad: 'q', fortificar: 'f', menu: 'p', zmas: '+', zmenos: '-', todo: '0' };
const BASE_DISP = {
  calidad: 'alta', fps: false, limiteFps: 0, autoBajada: true, sombras: true, detalle: true, animRutas: true, efectos: true, bordesSuaves: true, tema: 'politico',
  velBots: 'normal', velAnim: 1, autoCamara: true, confirmarFin: true,
  sonido: { maestro: 0.8, musica: 0.25, efectos: 0.9, musicaOn: false, pausaOculta: true },
  sensZoom: 1, sensCamara: 1, invertirY: false, zonaMuerta: 0.25, vibracion: true, intensidadVib: 1, zurdo: false, tamBotones: 100, opBotones: 100, posBotones: 'auto', teclas: { ...TECLAS_BASE },
  acc: { textoGrande: false, dalto: false, reducirMov: false, altoContraste: false, anuncios: true }
};
export const PRESETS = {
  baja: { sombras: false, detalle: false, efectos: false, bordesSuaves: false, animRutas: false },
  media: { sombras: false, detalle: true, efectos: true, bordesSuaves: true, animRutas: false },
  alta: { sombras: true, detalle: true, efectos: true, bordesSuaves: true, animRutas: true },
  ultra: { sombras: true, detalle: true, efectos: true, bordesSuaves: true, animRutas: true }
};
export const A = mezclar(BASE, leer(CLAVES.ajustes, {}));
export const D = mezclar(BASE_DISP, leer(CLAVES.dispositivo, {}));
if (!leer(CLAVES.dispositivo)) {
  try { if (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600) { D.calidad = 'media'; Object.assign(D, PRESETS.media); } } catch (e) { /* sin matchMedia */ }
}
const alCambiar = [];
export const suscribir = (fn) => alCambiar.push(fn);
let diferido = 0;
export function guardar() {
  clearTimeout(diferido);
  diferido = setTimeout(() => { escribir(CLAVES.ajustes, A); escribir(CLAVES.dispositivo, D); }, 250);
  aplicar(); alCambiar.forEach((f) => f());
}
export function guardarYa() { clearTimeout(diferido); escribir(CLAVES.ajustes, A); escribir(CLAVES.dispositivo, D); }
export function aplicar() {
  const c = document.body.classList;
  c.toggle('texto-grande', D.acc.textoGrande); c.toggle('sinmov', D.acc.reducirMov); c.toggle('contraste', D.acc.altoContraste); c.toggle('dalto', D.acc.dalto);
  c.toggle('zurdo', D.zurdo); c.toggle('sin-suave', !D.bordesSuaves); c.toggle('sin-sombras', !D.sombras); c.toggle('sin-detalle', !D.detalle); c.toggle('sin-efectos', !D.efectos); c.toggle('sin-rutas', !D.animRutas);
  for (const q of Object.keys(PRESETS)) c.toggle('q-' + q, D.calidad === q);
  for (const t of ['politico', 'oscuro', 'claro']) c.toggle('tema-' + t, D.tema === t);
  const r = document.documentElement;
  r.style.setProperty('--op-botones', String(D.opBotones / 100)); r.style.setProperty('--tam-botones', String(D.tamBotones / 100));
  r.dataset.botones = D.posBotones;
  Sonido.ajustar(D.sonido);
}
export const reducirMov = () => D.acc.reducirMov;

const PESTANAS = [['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['juego', 'Partida'], ['acc', 'Accesibilidad'], ['datos', 'Datos']];
const NOMBRES_TECLAS = { aceptar: 'Aceptar / elegir', atras: 'Atrás / cancelar', blitz: 'Atacar hasta el final', terminar: 'Terminar fase o turno', cartas: 'Cartas', objetivo: 'Misión secreta', mundo: 'Panel del mundo', cantidad: 'Cantidad al reforzar', fortificar: 'Fortificar', menu: 'Menú / pausa', zmas: 'Acercar', zmenos: 'Alejar', todo: 'Ver todo el mapa' };

export function panelAjustes(cont, opts = {}) {
  let pest = opts.pest || 'graficos';
  const cuerpo = h('div', { cls: 'aj-cuerpo' });
  const tabs = h('div', { cls: 'aj-tabs', role: 'tablist' });
  const botonesTab = {};
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
    c.appendChild(fila('Tema del mapa', opciones(D, 'tema', [['politico', 'Político'], ['oscuro', 'Océano oscuro'], ['claro', 'Claro']])));
    c.appendChild(fila('Sombras y relieve', interruptor(D, 'sombras')));
    c.appendChild(fila('Detalle (nombres, olas, brillos)', interruptor(D, 'detalle')));
    c.appendChild(fila('Rutas marítimas animadas', interruptor(D, 'animRutas')));
    c.appendChild(fila('Efectos de batalla y confeti', interruptor(D, 'efectos')));
    c.appendChild(fila('Bordes suaves (antialias)', interruptor(D, 'bordesSuaves')));
    c.appendChild(fila('Límite de FPS', opciones(D, 'limiteFps', [[0, 'Sin límite'], [60, '60'], [30, '30']]), 'Menos cuadros ahorran batería en el móvil.'));
    c.appendChild(fila('Bajar calidad si va lento', interruptor(D, 'autoBajada'), 'Reduce la calidad automáticamente si los cuadros por segundo caen.'));
    c.appendChild(fila('Mostrar FPS', interruptor(D, 'fps')));
  },
  audio(c) {
    c.appendChild(fila('Volumen general', deslizador(D.sonido, 'maestro', 0, 1, 0.05, pct)));
    c.appendChild(fila('Efectos', deslizador(D.sonido, 'efectos', 0, 1, 0.05, pct, () => Sonido.fx('dados'))));
    c.appendChild(fila('Música ambiental', interruptor(D.sonido, 'musicaOn', (on) => { Sonido.despertar(); Sonido.musica(on); })));
    c.appendChild(fila('Volumen de música', deslizador(D.sonido, 'musica', 0, 1, 0.05, pct)));
    c.appendChild(fila('Pausar sonido al ocultar la pestaña', interruptor(D.sonido, 'pausaOculta')));
  },
  controles(c) {
    c.appendChild(fila('Modo zurdo', interruptor(D, 'zurdo'), 'Los botones y el zoom pasan al otro lado.'));
    c.appendChild(fila('Tamaño de los botones', deslizador(D, 'tamBotones', 80, 140, 5, (x) => x + '%')));
    c.appendChild(fila('Opacidad de los botones', deslizador(D, 'opBotones', 40, 100, 5, (x) => x + '%')));
    c.appendChild(fila('Posición de los botones', opciones(D, 'posBotones', [['auto', 'Automática'], ['izq', 'Izquierda'], ['der', 'Derecha']])));
    c.appendChild(fila('Sensibilidad del zoom', deslizador(D, 'sensZoom', 0.5, 2, 0.1, (x) => 'x' + x.toFixed(1))));
    c.appendChild(fila('Velocidad de la cámara (mando)', deslizador(D, 'sensCamara', 0.5, 2, 0.1, (x) => 'x' + x.toFixed(1))));
    c.appendChild(fila('Invertir eje vertical del stick', interruptor(D, 'invertirY')));
    c.appendChild(fila('Zona muerta del mando', deslizador(D, 'zonaMuerta', 0.1, 0.6, 0.05, pct)));
    c.appendChild(fila('Vibración del mando', interruptor(D, 'vibracion')));
    c.appendChild(fila('Intensidad de vibración', deslizador(D, 'intensidadVib', 0.2, 1, 0.1, pct)));
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
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'Mando Xbox: cruceta o stick izquierdo mueven el cursor entre territorios · A elige · B atrás · X cantidad / atacar hasta el final · Y siguiente fase · stick derecho mueve el mapa · LT/RT zoom · LB cartas · RB misión · VISTA mundo · MENÚ pausa. Ratón: arrastra, rueda para zoom, clic para elegir. Táctil: arrastra con un dedo, pellizca para zoom, toca para elegir.' }));
  },
  juego(c) {
    c.appendChild(fila('Velocidad de los bots', opciones(D, 'velBots', [['lenta', 'Lenta'], ['normal', 'Normal'], ['rapida', 'Rápida'], ['instantanea', 'Instantánea']]), 'Solo afecta a las partidas que tú alojas.'));
    c.appendChild(fila('Velocidad de animaciones', deslizador(D, 'velAnim', 0.5, 2.5, 0.25, (x) => 'x' + x.toFixed(2))));
    c.appendChild(fila('Centrar la cámara al empezar mi turno', interruptor(D, 'autoCamara')));
    c.appendChild(fila('Confirmar antes de terminar el turno', interruptor(D, 'confirmarFin'), 'Evita terminar el turno sin querer cuando aún tienes ataques.'));
  },
  acc(c) {
    c.appendChild(fila('Texto grande', interruptor(D.acc, 'textoGrande')));
    c.appendChild(fila('Modo daltónico', interruptor(D.acc, 'dalto'), 'Paleta segura y texturas distintas por jugador, además del número.'));
    c.appendChild(fila('Reducir movimiento', interruptor(D.acc, 'reducirMov'), 'Sin animaciones de dados, flechas ni destellos.'));
    c.appendChild(fila('Alto contraste', interruptor(D.acc, 'altoContraste')));
    c.appendChild(fila('Anunciar jugadas (lector de pantalla)', interruptor(D.acc, 'anuncios')));
  },
  datos(c) {
    const area = h('textarea', { cls: 'aj-texto', rows: 4, 'data-f': 1, placeholder: 'Aquí aparece o se pega el texto de tu guardado', spellcheck: 'false' });
    const msg = h('div', { cls: 'aj-msg', 'aria-live': 'polite' });
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'El guardado incluye progreso, logros y la última configuración de partida (no los gráficos, audio ni controles de este dispositivo).' }));
    c.appendChild(area);
    c.appendChild(h('div', { cls: 'aj-botones' }, [
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Exportar', on: { click: () => { guardarYa(); area.value = exportar(); area.select(); try { navigator.clipboard.writeText(area.value); msg.textContent = 'Texto copiado.'; } catch (e) { msg.textContent = 'Copia el texto manualmente.'; } } } }),
      h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Importar', on: { click: () => { if (importar(area.value)) { msg.textContent = 'Importado. Recargando…'; setTimeout(() => location.reload(), 600); } else msg.textContent = 'Texto no válido.'; } } }),
      h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todo', on: { click: () => { if (confirm('¿Borrar progreso, logros, ajustes y partida guardada de este dispositivo? Si tienes sesión, la copia de tu cuenta en la nube se conserva y puede volver a bajarse al sincronizar.')) { borrarTodo(); location.reload(); } } } })
    ]));
    c.appendChild(msg); c.appendChild(bloqueNube());
  }
};
export function nombreTecla(k) { return ({ ' ': 'Espacio', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', enter: 'Enter', escape: 'Esc' })[k] || String(k).toUpperCase(); }
