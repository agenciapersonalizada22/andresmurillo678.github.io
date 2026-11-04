// =============================================================
//  ⚙  AJUSTES
//  Menú con pestañas generado desde una tabla: cada fila es un ajuste
//  (casilla, deslizador, fichas, tecla...). Se navega con ratón,
//  toque y mando (cruceta + A/B, LB/RB cambian de pestaña).
// =============================================================
import { CALIDADES } from './config.js';
import { TEMAS, ORDEN_TEMAS, SETS_3D } from './temas.js';

const F = (arr) => arr.map(([v, n]) => ({ v, n }));
const NOM_TECLA = { deshacer: 'Deshacer', rehacer: 'Rehacer', vista: 'Cambiar vista', pista: 'Pista', analisis: 'Análisis', girar: 'Girar tablero', pausa: 'Pausa / menú', atras: 'Jugada anterior', adelante: 'Jugada siguiente', pantalla: 'Pantalla completa' };

export const PESTANAS = [
  ['graficos', 'Gráficos'], ['audio', 'Audio'], ['controles', 'Controles'], ['acces', 'Accesibilidad'], ['juego', 'Juego'], ['datos', 'Datos'],
];

// tipo: check | rango (min, max, paso, fmt) | fichas (op) | tecla (accion)
const TABLA = [
  ['graficos', 'tema', 'fichas', 'Tema del tablero', { op: ORDEN_TEMAS.map((t) => [t, TEMAS[t].nombre]) }],
  ['graficos', 'set3d', 'fichas', 'Piezas (3D)', { op: Object.entries(SETS_3D).map(([k, v]) => [k, v.nombre]) }],
  ['graficos', 'set2d', 'fichas', 'Piezas (2D)', { op: [['clasico', 'Clásicas'], ['moderno', 'Modernas'], ['contorno', 'Contorno']] }],
  ['graficos', 'render', 'fichas', 'Modo de dibujo', { op: [['auto', 'Automático'], ['3d', '3D'], ['2d', '2D ligero']], info: 'El 2D es más rápido en celulares lentos. Cambiarlo recarga la página.' }],
  ['graficos', 'calidad', 'fichas', 'Calidad (preset)', { op: CALIDADES.map((c) => [c.id, c.nombre]) }],
  ['graficos', 'sombras', 'fichas', 'Sombras', { op: [['auto', 'Del preset'], [0, 'No'], [1, 'Duras'], [2, 'Suaves']] }],
  ['graficos', 'antialias', 'fichas', 'Antialias', { op: [['auto', 'Del preset'], [true, 'Sí'], [false, 'No']] }],
  ['graficos', 'particulas', 'fichas', 'Partículas', { op: [['auto', 'Del preset'], [true, 'Sí'], [false, 'No']] }],
  ['graficos', 'resolucion', 'rango', 'Resolución', { min: 50, max: 150, paso: 10, esc: 100, fmt: (v) => v + '%' }],
  ['graficos', 'limiteFps', 'fichas', 'Límite de FPS', { op: [[0, 'Libre'], [30, '30'], [60, '60'], [120, '120']] }],
  ['graficos', 'mostrarFps', 'check', 'Mostrar FPS'],
  ['graficos', 'autoCalidad', 'check', 'Bajar la calidad solo si hay pocos FPS'],
  ['graficos', 'coordenadas', 'check', 'Coordenadas del tablero'],
  ['audio', 'sonido', 'check', 'Sonidos'],
  ['audio', 'musica', 'check', 'Música ambiental'],
  ['audio', 'volumen', 'rango', 'Volumen maestro', { min: 0, max: 100, paso: 5, esc: 100, fmt: (v) => v + '%' }],
  ['audio', 'volMusica', 'rango', 'Volumen de la música', { min: 0, max: 100, paso: 5, esc: 100, fmt: (v) => v + '%' }],
  ['audio', 'volEfectos', 'rango', 'Volumen de efectos', { min: 0, max: 100, paso: 5, esc: 100, fmt: (v) => v + '%' }],
  ['audio', 'pausaOculta', 'check', 'Pausar el audio al ocultar la pestaña'],
  ['audio', 'sonidoReloj', 'check', 'Tic del reloj con poco tiempo'],
  ['controles', 'sens', 'rango', 'Sensibilidad de la cámara', { min: 30, max: 250, paso: 10, esc: 100, fmt: (v) => (v / 100).toFixed(1) + 'x' }],
  ['controles', 'invertirY', 'check', 'Invertir eje vertical de la cámara'],
  ['controles', 'zonaMuerta', 'rango', 'Zona muerta del mando', { min: 0, max: 40, paso: 2, esc: 100, fmt: (v) => v + '%' }],
  ['controles', 'vibracion', 'check', 'Vibración del mando'],
  ['controles', 'vibIntensidad', 'rango', 'Intensidad de la vibración', { min: 10, max: 100, paso: 10, esc: 100, fmt: (v) => v + '%' }],
  ['controles', 'tamBotones', 'rango', 'Tamaño de los botones táctiles', { min: 80, max: 140, paso: 10, esc: 100, fmt: (v) => v + '%' }],
  ['controles', 'opBotones', 'rango', 'Opacidad de los botones', { min: 40, max: 100, paso: 10, esc: 100, fmt: (v) => v + '%' }],
  ['controles', 'posBotones', 'fichas', 'Posición de los botones', { op: [['abajo', 'Abajo'], ['arriba', 'Arriba']] }],
  ['controles', 'zurdo', 'check', 'Modo zurdo (panel a la izquierda)'],
  ['controles', 'confirmarMov', 'check', 'Confirmar la jugada antes de hacerla'],
  ['controles', 'premov', 'check', 'Premovimientos (jugar mientras piensa el rival)'],
  ['controles', 'flechasDerecho', 'check', 'Clic derecho dibuja flechas y casillas'],
  ['controles', null, 'teclas', 'Teclas'],
  ['acces', 'textoGrande', 'check', 'Texto grande'],
  ['acces', 'daltonico', 'fichas', 'Modo daltónico', { op: [['no', 'No'], ['deuteranopia', 'Deuteranopia'], ['protanopia', 'Protanopia'], ['tritanopia', 'Tritanopia']] }],
  ['acces', 'altoContraste', 'check', 'Alto contraste (interfaz y tablero)'],
  ['acces', 'reducirMovimiento', 'check', 'Reducir movimiento y efectos'],
  ['acces', 'leerJugadas', 'check', 'Anunciar las jugadas en voz alta'],
  ['juego', 'ayuda', 'check', 'Mostrar jugadas posibles'],
  ['juego', 'mostrarApertura', 'check', 'Mostrar el nombre de la apertura'],
  ['juego', 'analisisVivo', 'check', 'Análisis en vivo (barra de evaluación)'],
  ['juego', 'multiPV', 'fichas', 'Líneas del análisis', { op: [[1, '1'], [2, '2'], [3, '3'], [4, '4']] }],
  ['juego', 'flechaMejor', 'check', 'Flecha con la mejor jugada (análisis)'],
  ['juego', 'girarAuto', 'check', 'Girar el tablero cada turno (2 jugadores)'],
];

const ESCALADAS = { volumen: 100, volMusica: 100, volEfectos: 100, sens: 100, zonaMuerta: 100, vibIntensidad: 100, tamBotones: 100, opBotones: 100, resolucion: 100 };

export class Ajustes {
  constructor(raiz, al) {
    this.raiz = raiz; this.al = al; this.tab = 'graficos'; this.esperando = null; this.opts = null;
    raiz.querySelector('.pestanas').innerHTML = PESTANAS.map(([id, n]) => `<button type="button" data-t="${id}">${n}</button>`).join('');
    raiz.querySelector('.pestanas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { this.tab = b.dataset.t; this.pintar(); this.al.alClic(); } });
    window.addEventListener('keydown', (e) => this._tecla(e), true);
  }

  cambiarPestana(d) {
    const i = PESTANAS.findIndex((p) => p[0] === this.tab);
    this.tab = PESTANAS[(i + d + PESTANAS.length) % PESTANAS.length][0];
    this.pintar();
  }

  actualizar(opts) { this.opts = opts; this.pintar(); }

  _val(k) {
    const v = this.opts[k], e = ESCALADAS[k];
    return e ? Math.round(v * e) : v;
  }

  pintar() {
    const o = this.opts; if (!o) return;
    const cuerpo = this.raiz.querySelector('.cuerpoAjustes');
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    this.raiz.querySelectorAll('.pestanas button').forEach((b) => b.classList.toggle('sel', b.dataset.t === this.tab));
    let h = '';
    for (const [tab, k, tipo, et, x] of TABLA) {
      if (tab !== this.tab) continue;
      if (tipo === 'check') h += `<div class="campo"><label class="check"><input type="checkbox" data-k="${k}" ${o[k] ? 'checked' : ''}> ${et}</label></div>`;
      else if (tipo === 'rango') h += `<div class="campo"><label>${et}: <b class="val">${x.fmt(this._val(k))}</b></label><input type="range" data-k="${k}" min="${x.min}" max="${x.max}" step="${x.paso}" value="${this._val(k)}"></div>`;
      else if (tipo === 'fichas') h += `<div class="campo"><label>${et}</label><div class="fichas" data-k="${k}">${x.op.map(([v, n]) => `<button type="button" data-v="${esc(v)}" class="${String(o[k]) === String(v) ? 'sel' : ''}">${esc(n).toUpperCase()}</button>`).join('')}</div>${x.info ? `<p class="info">${x.info}</p>` : ''}</div>`;
      else if (tipo === 'teclas') {
        h += '<div class="campo"><label>Atajos de teclado</label><div class="teclas">';
        for (const a of Object.keys(NOM_TECLA)) h += `<div class="fila-tecla"><span>${NOM_TECLA[a]}</span><button type="button" data-tecla="${a}">${this.esperando === a ? 'Pulsa una tecla…' : esc(nombreTecla(o.teclas[a]))}</button></div>`;
        h += '</div><button type="button" class="chico" data-acc="teclasBase">Restablecer teclas</button></div>';
      }
    }
    if (this.tab === 'datos') {
      h += `<div class="campo"><label>Guardado (perfil, partidas, rompecabezas, ajustes)</label><div class="fichas">
        <button type="button" data-d="exportar">EXPORTAR COMO TEXTO</button><button type="button" data-d="importar">IMPORTAR</button><button type="button" data-d="borrar">BORRAR TODO</button></div>
        <p class="info">Copia el texto para llevar tu progreso a otro dispositivo. La biblioteca de partidas hace de ranuras de guardado.</p></div>`;
    }
    cuerpo.innerHTML = h;
    cuerpo.onchange = (e) => {
      const i = e.target.closest('input'); if (!i) return;
      if (i.type === 'checkbox') this.al.alAjuste(i.dataset.k, i.checked);
      else if (i.type === 'range') { const k = i.dataset.k; this.al.alAjuste(k, ESCALADAS[k] ? i.value / ESCALADAS[k] : +i.value); }
    };
    cuerpo.oninput = (e) => {
      const i = e.target.closest('input[type=range]'); if (!i) return;
      const fila = TABLA.find((t) => t[1] === i.dataset.k); i.parentNode.querySelector('.val').textContent = fila[4].fmt(+i.value);
      const k = i.dataset.k; this.al.alAjuste(k, ESCALADAS[k] ? i.value / ESCALADAS[k] : +i.value, true);
    };
    cuerpo.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const f = b.closest('.fichas[data-k]');
      if (f) {
        const k = f.dataset.k, fila = TABLA.find((t) => t[1] === k), op = fila[4].op.find(([v]) => String(v) === b.dataset.v);
        this.al.alAjuste(k, op[0]); this.al.alClic(); return;
      }
      if (b.dataset.tecla) { this.esperando = b.dataset.tecla; this.pintar(); return; }
      if (b.dataset.acc === 'teclasBase') { this.al.alAjuste('teclas', null); return; }
      if (b.dataset.d) this.al.alDatos(b.dataset.d);
    };
  }

  _tecla(e) {
    if (!this.esperando) return;
    e.preventDefault(); e.stopPropagation();
    const k = e.key.toLowerCase();
    const a = this.esperando; this.esperando = null;
    if (k !== 'escape') this.al.alAjuste('teclas', { ...this.opts.teclas, [a]: k });
    else this.pintar();
  }
}

export function nombreTecla(k) {
  return { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', escape: 'Esc', ' ': 'Espacio' }[k] || String(k).toUpperCase();
}
