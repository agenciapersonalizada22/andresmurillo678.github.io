// Panel de ajustes con pestanas (graficos, audio, controles, accesibilidad, datos). Todo con botones: sirve con mando.
import { h, boton, abrirHoja, refrescarHojas, confirmar, aviso } from './dom.js';
import { A, D, PRESETS, TECLAS_BASE, aplicarPreset, guardarAjustes, restablecer } from './ajustes.js';
import { exportarTodo, importarTodo, borrarTodo } from './almacen.js';
import { bloqueNube } from './nube.js';

let tab = 'gfx';
const TABS = [['gfx', 'Gráficos'], ['aud', 'Audio'], ['ctl', 'Controles'], ['acc', 'Accesibilidad'], ['dat', 'Datos']];
const refrescar = () => refrescarHojas(['ajustes']);
const cambiar = (fn) => { fn(); guardarAjustes(); refrescar(); };

function fila(etq, ...ctl) { return h('div', { cls: 'ajuste' }, h('span', { cls: 'etq' }, etq), h('div', { cls: 'ctl' }, ctl)); }
function conmutar(etq, obj, k, nota) {
  return fila(etq + (nota ? ' ' + nota : ''), boton(obj[k] ? 'Sí' : 'No', () => cambiar(() => { obj[k] = !obj[k]; }), obj[k] ? 'on' : '', { 'aria-pressed': !!obj[k], 'data-k': 'c' + k }));
}
function opciones(etq, obj, k, lista, tras) {
  return fila(etq, lista.map(([v, t]) => boton(t, () => cambiar(() => { obj[k] = v; if (tras) tras(); }), obj[k] === v ? 'on' : '', { 'aria-pressed': obj[k] === v, 'data-k': 'o' + k + v })));
}
function paso(etq, obj, k, min, max, st, fmt) {
  const f = fmt || ((v) => Math.round(v * 100) / 100);
  const mod = (d) => cambiar(() => { obj[k] = Math.max(min, Math.min(max, Math.round((obj[k] + d) / st) * st)); });
  return fila(etq, boton('−', () => mod(-st), 'sec peq', { 'data-k': 'm' + k, 'aria-label': 'Menos ' + etq }), h('b', { cls: 'val' }, f(obj[k])), boton('+', () => mod(st), 'sec peq', { 'data-k': 'p' + k, 'aria-label': 'Más ' + etq }));
}
const pct = (v) => Math.round(v * 100) + '%';

function renderGfx(c) {
  const g = D.gfx;
  c.appendChild(fila('Preajuste', Object.keys(PRESETS).map((p) => boton(p[0].toUpperCase() + p.slice(1), () => { aplicarPreset(p); refrescar(); }, g.preset === p ? 'on' : '', { 'aria-pressed': g.preset === p }))));
  c.appendChild(opciones('Resolución', g, 'pixel', [[0.75, '0.75×'], [1, '1×'], [1.25, '1.25×'], [1.75, '1.75×'], [2.5, '2.5×']], () => { g.preset = 'personal'; }));
  c.appendChild(opciones('Textura del tablero', g, 'texTablero', [[1024, '1K'], [1536, '1.5K'], [2048, '2K'], [4096, '4K']], () => { g.preset = 'personal'; }));
  c.appendChild(conmutar('Sombras', g, 'sombras'));
  c.appendChild(conmutar('Suavizado de bordes', g, 'antialias', '(al recargar)'));
  c.appendChild(conmutar('Partículas', g, 'particulas'));
  c.appendChild(opciones('Límite de FPS', g, 'fpsMax', [[30, '30'], [60, '60'], [0, 'Sin límite']]));
  c.appendChild(conmutar('Mostrar FPS', g, 'mostrarFps'));
  c.appendChild(conmutar('Bajar calidad automáticamente', g, 'autoCalidad'));
}
function renderAud(c) {
  c.appendChild(paso('Volumen general', A.vol, 'maestro', 0, 1, 0.1, pct));
  c.appendChild(paso('Música', A.vol, 'musica', 0, 1, 0.1, pct));
  c.appendChild(paso('Efectos', A.vol, 'efectos', 0, 1, 0.1, pct));
  c.appendChild(conmutar('Música ambiental', A, 'musica'));
  c.appendChild(conmutar('Pausar audio al ocultar la pestaña', A, 'pausaOculta'));
}
let esperando = '';
const NOMBRES_TECLA = { accion: 'Acción principal', propiedades: 'Propiedades', tratos: 'Intercambios', registro: 'Historial', chat: 'Chat', vista: 'Vista cenital', pausa: 'Pausa', sonido: 'Sonido', pantalla: 'Pantalla completa' };
function renderCtl(c) {
  const k = D.ctl;
  c.appendChild(paso('Sensibilidad de cámara', k, 'sens', 0.4, 2, 0.1));
  c.appendChild(paso('Zona muerta del mando', k, 'zonaMuerta', 0.1, 0.5, 0.05, pct));
  c.appendChild(conmutar('Vibración', k, 'vibracion'));
  c.appendChild(paso('Intensidad de vibración', k, 'vibInt', 0.2, 1, 0.2, pct));
  c.appendChild(paso('Tamaño de botones táctiles', k, 'tamBotones', 0.8, 1.4, 0.1, pct));
  c.appendChild(paso('Opacidad de la barra', k, 'opBotones', 0.5, 1, 0.1, pct));
  c.appendChild(opciones('Posición de la barra', k, 'posBotones', [['abajo', 'Abajo'], ['arriba', 'Arriba']]));
  c.appendChild(conmutar('Modo zurdo', k, 'zurdo'));
  c.appendChild(h('h3', {}, 'Teclas'));
  Object.keys(TECLAS_BASE).forEach((n) => {
    const txt = esperando === n ? 'Pulsa una tecla…' : (k.teclas[n] === ' ' ? 'Espacio' : k.teclas[n].toUpperCase());
    c.appendChild(fila(NOMBRES_TECLA[n], boton(txt, () => {
      esperando = n; refrescar();
      const f = (ev) => { ev.preventDefault(); ev.stopPropagation(); window.removeEventListener('keydown', f, true); if (ev.key !== 'Escape') { Object.keys(k.teclas).forEach((o) => { if (k.teclas[o] === ev.key.toLowerCase()) k.teclas[o] = TECLAS_BASE[o] === ev.key.toLowerCase() ? '' : k.teclas[n]; }); k.teclas[n] = ev.key.toLowerCase(); guardarAjustes(); } esperando = ''; refrescar(); };
      window.addEventListener('keydown', f, true);
    }, 'sec', { 'data-k': 't' + n })));
  });
  c.appendChild(boton('Restablecer teclas', () => cambiar(() => { k.teclas = Object.assign({}, TECLAS_BASE); }), 'sec'));
  c.appendChild(h('p', { cls: 'peq' }, 'Mando: cruceta/stick mueve el foco o las casillas, A confirma, B cancela, X intercambios, Y propiedades, LB/RB cambia de jugador o propiedad, stick derecho gira/acerca la cámara, VISTA alterna entre acciones y casillas, MENÚ pausa.'));
}
function renderAcc(c) {
  c.appendChild(opciones('Tamaño del texto', A, 'texto', [['normal', 'Normal'], ['grande', 'Grande'], ['enorme', 'Enorme']]));
  c.appendChild(conmutar('Símbolos en los barrios (daltonismo)', A, 'simbolos'));
  c.appendChild(conmutar('Alto contraste', A, 'altoContraste'));
  c.appendChild(conmutar('Reducir movimiento', A, 'reducirMov'));
  c.appendChild(opciones('Velocidad de animaciones', A, 'velocidad', [[1, 'Normal'], [2, 'Rápida'], [4, 'Muy rápida']]));
  c.appendChild(conmutar('Cámara automática', A, 'camaraAuto'));
}
function renderDat(c) {
  bloqueNube(c);
  c.appendChild(h('h3', {}, 'Copia manual'));
  const salida = h('textarea', { readonly: true, rows: 3, 'data-f': 1, 'aria-label': 'Datos exportados' }); salida.value = exportarTodo();
  c.appendChild(h('p', { cls: 'peq' }, 'Exporta tu progreso, logros, ajustes generales y la partida en curso como texto. Los ajustes de gráficos y controles son de este dispositivo y no se incluyen.'));
  c.appendChild(salida);
  c.appendChild(boton('Copiar', () => { salida.select(); try { navigator.clipboard.writeText(salida.value); } catch (e) { document.execCommand('copy'); } aviso('Copiado'); }, 'sec'));
  const ent = h('textarea', { rows: 3, placeholder: 'Pega aquí un guardado MAGNATE1:…', 'data-f': 1, 'aria-label': 'Importar datos' });
  ent.addEventListener('keydown', (ev) => ev.stopPropagation());
  c.appendChild(ent);
  c.appendChild(boton('Importar', () => { if (importarTodo(ent.value)) { aviso('Guardado importado. Recargando…', '#6dff6d'); setTimeout(() => location.reload(), 700); } else aviso('Texto no válido', '#ff6b6b'); }, 'prim'));
  c.appendChild(h('div', { cls: 'fila' },
    boton('Borrar progreso y partida', () => confirmar('Se borrarán logros, estadísticas y la partida guardada.', () => { borrarTodo(false); location.reload(); }, 'Borrar'), 'mal'),
    boton('Restablecer ajustes', () => confirmar('Volver a los ajustes por defecto de este dispositivo.', () => { restablecer(); refrescar(); }, 'Restablecer'), 'sec')));
}
const RENDER = { gfx: renderGfx, aud: renderAud, ctl: renderCtl, acc: renderAcc, dat: renderDat };
export function abrirAjustes(t) {
  if (t) tab = t;
  abrirHoja({ id: 'ajustes', titulo: 'Ajustes', ancha: true, render: (c) => {
    c.appendChild(h('div', { cls: 'tabs', role: 'tablist' }, TABS.map(([id, n]) => boton(n, () => { tab = id; refrescar(); }, 'tab' + (tab === id ? ' on' : ''), { role: 'tab', 'aria-selected': tab === id, 'data-k': 'tab' + id }))));
    RENDER[tab](c);
  } });
}
