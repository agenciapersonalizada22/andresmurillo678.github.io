// =============================================================
//  AJUSTES: datos guardados (clave guerra_ajustes) y el panel con pestañas.
//  Lo que ya existía (sens, invertir, ratón, vibración) sigue en guerra_opciones.
// =============================================================
import { CONFIG } from './config.js';
import { cargarOpciones, guardarOpciones } from './guardado.js';
import { Progreso } from './progreso.js';

export const PRESETS = {
  baja: { sombras: 0, distancia: 0.6, resolucion: 0.75, nubes: 'simple', agua: 'simple', detalle: false, particulas: 0.5, arboles: 0.45 },
  media: { sombras: 1024, distancia: 0.8, resolucion: 1, nubes: 'simple', agua: 'simple', detalle: true, particulas: 0.75, arboles: 0.75 },
  alta: { sombras: 2048, distancia: 1, resolucion: 1, nubes: 'vol', agua: 'shader', detalle: true, particulas: 1, arboles: 1 },
  ultra: { sombras: 4096, distancia: 1.25, resolucion: 1.5, nubes: 'vol', agua: 'shader', detalle: true, particulas: 1, arboles: 1, antialias: true },
};
export const ORDEN_PRESETS = ['baja', 'media', 'alta', 'ultra'];

// Acciones remapeables: código lógico por defecto -> nombre
export const ACCIONES = [
  ['KeyS', 'Nariz arriba'], ['KeyW', 'Nariz abajo / avanzar'], ['KeyA', 'Alabeo izquierda / girar'], ['KeyD', 'Alabeo derecha / girar'],
  ['KeyQ', 'Guiñada izquierda'], ['KeyE', 'Guiñada derecha'], ['ShiftLeft', 'Más empuje'], ['ControlLeft', 'Menos empuje'],
  ['Space', 'Disparar'], ['KeyF', 'Cohete / misil / ametralladora'], ['KeyB', 'Bomba'], ['KeyG', 'Bengalas'], ['KeyX', 'Freno aerodinámico'],
  ['KeyR', 'Extintor'], ['KeyT', 'Tipo de munición (tanque)'], ['KeyV', 'Cambiar cámara'], ['KeyN', 'Cámara de arma'], ['KeyM', 'Mapa grande'],
  ['Tab', 'Marcador'], ['KeyH', 'Ocultar interfaz'], ['KeyY', 'Chat rápido'],
];

export const PALETAS = {
  ninguno: { aliado: '#3df5ff', enemigo: '#ff4d6d', objetivo: '#ff9d3d', neutro: '#ffffff' },
  protanopia: { aliado: '#4aa3ff', enemigo: '#ffd23d', objetivo: '#ff8bf0', neutro: '#ffffff' },
  deuteranopia: { aliado: '#5aa0ff', enemigo: '#ffb000', objetivo: '#d070ff', neutro: '#ffffff' },
  tritanopia: { aliado: '#3df58a', enemigo: '#ff4d6d', objetivo: '#ffe066', neutro: '#ffffff' },
};

const BASE = (tactil) => ({
  grafico: { preset: tactil ? 'baja' : 'alta', ...PRESETS[tactil ? 'baja' : 'alta'], antialias: !tactil, fps: 0, mostrarFps: false, auto: true },
  audio: { maestro: 1, musica: 1, efectos: 1, silencio: false, pausaOculto: true },
  controles: { zona: 0.15, vibInt: 1, teclas: {}, tactilEsc: 1, tactilOp: 0.75, tactilSep: 0, tactilAlt: 0, zurdo: false, camAuto: false },
  acces: { texto: false, daltonismo: 'ninguno', reducir: false },
  tutorial: true,
});

let datos = null;
export const Ajustes = {
  alCambiar: null, // (grupo, clave)
  cargar(tactil) {
    const b = BASE(tactil);
    let o = {};
    try { o = JSON.parse(localStorage.getItem(CONFIG.guardado.ajustes) || '{}') || {}; } catch (e) { o = {}; }
    datos = {};
    for (const g in b) datos[g] = typeof b[g] === 'object' ? { ...b[g], ...(o[g] || {}) } : (o[g] !== undefined ? o[g] : b[g]);
    return datos;
  },
  d() { return datos; },
  guardar() { try { localStorage.setItem(CONFIG.guardado.ajustes, JSON.stringify(datos)); } catch (e) { /* nada */ } },
  poner(grupo, clave, valor) {
    datos[grupo][clave] = valor;
    this.guardar();
    if (this.alCambiar) this.alCambiar(grupo, clave);
  },
  preset(nombre) {
    Object.assign(datos.grafico, PRESETS[nombre], { preset: nombre });
    this.guardar();
    if (this.alCambiar) this.alCambiar('grafico', 'preset');
  },
};

const el = (tag, clase, texto) => {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
};

const PESTANAS = [['grafico', 'GRÁFICOS'], ['audio', 'AUDIO'], ['controles', 'CONTROLES'], ['acces', 'ACCESIBILIDAD'], ['datos', 'DATOS']];

// Panel dentro de #contAjustes
export class PanelAjustes {
  constructor(raiz, contexto) {
    this.raiz = raiz;
    this.c = contexto; // { opciones, entrada, tactil, aplicarOpciones(), refrescarPerfil(), exportar(), importar(txt), borrar() }
    this.tab = 'grafico';
    this.esperando = null;
    this.barra = el('div', 'tabs');
    this.cuerpo = el('div', 'tabCuerpo');
    raiz.append(this.barra, this.cuerpo);
    this.botonesTab = {};
    for (const [id, n] of PESTANAS) {
      const b = el('button', 'tab', n);
      b.type = 'button';
      b.addEventListener('click', () => this.ir(id));
      this.barra.appendChild(b);
      this.botonesTab[id] = b;
    }
    addEventListener('keydown', (e) => this._tecla(e), true);
    this.ir('grafico');
  }

  ciclar(dir) {
    const ids = PESTANAS.map((p) => p[0]);
    this.ir(ids[(ids.indexOf(this.tab) + dir + ids.length) % ids.length]);
  }

  ir(id) {
    this.tab = id;
    for (const k in this.botonesTab) this.botonesTab[k].classList.toggle('sel', k === id);
    this.esperando = null;
    this.dibujar();
  }

  dibujar() {
    const c = this.cuerpo;
    c.textContent = '';
    this['_' + this.tab](c);
  }

  // ---- componentes
  _rango(cont, texto, min, max, paso, valor, alCambiar, fmt = (v) => v.toFixed(2)) {
    const l = el('label', 'sens');
    const b = el('b', '', fmt(valor));
    l.append(el('span', '', texto + ' '), b);
    const i = el('input');
    i.type = 'range'; i.min = min; i.max = max; i.step = paso; i.value = valor;
    i.addEventListener('input', () => { const v = parseFloat(i.value); b.textContent = fmt(v); alCambiar(v); });
    l.appendChild(i);
    cont.appendChild(l);
  }

  _opcion(cont, texto, valores, actual, alCambiar) {
    const b = el('button');
    b.type = 'button';
    const pon = () => { const v = valores.find((x) => x[0] === actual); b.textContent = texto + ': ' + (v ? v[1] : '?'); };
    pon();
    b.addEventListener('click', () => {
      const i = valores.findIndex((x) => x[0] === actual);
      actual = valores[(i + 1) % valores.length][0];
      pon();
      alCambiar(actual);
    });
    cont.appendChild(b);
    return b;
  }

  _si(cont, texto, actual, alCambiar) {
    return this._opcion(cont, texto, [[false, 'NO'], [true, 'SÍ']], !!actual, alCambiar);
  }

  // ---- pestañas
  _grafico(c) {
    const G = Ajustes.d().grafico;
    const P = (k, v) => { Ajustes.poner('grafico', k, v); G.preset = 'personalizado'; Ajustes.guardar(); };
    const fila = el('div', 'fila presets');
    for (const p of ORDEN_PRESETS) {
      const b = el('button', G.preset === p ? 'sel' : '', p.toUpperCase());
      b.type = 'button';
      b.addEventListener('click', () => { Ajustes.preset(p); this.dibujar(); });
      fila.appendChild(b);
    }
    c.appendChild(fila);
    c.appendChild(el('p', 'pista', G.preset === 'personalizado' ? 'Ajuste personalizado' : 'Preset: ' + G.preset.toUpperCase()));
    this._opcion(c, 'SOMBRAS', [[0, 'NO'], [1024, 'MEDIAS'], [2048, 'ALTAS'], [4096, 'ULTRA']], G.sombras, (v) => P('sombras', v));
    this._opcion(c, 'DISTANCIA DE RENDER', [[0.6, 'CORTA'], [0.8, 'MEDIA'], [1, 'LARGA'], [1.25, 'MÁXIMA']], G.distancia, (v) => P('distancia', v));
    this._opcion(c, 'RESOLUCIÓN', [[0.5, '50 %'], [0.75, '75 %'], [1, '100 %'], [1.25, '125 %'], [1.5, '150 %']], G.resolucion, (v) => P('resolucion', v));
    const aa = this._si(c, 'ANTIALIAS (RECARGA)', G.antialias, (v) => { P('antialias', v); this.c.avisoRecarga(); });
    void aa;
    this._opcion(c, 'LÍMITE DE FPS', [[0, 'SIN LÍMITE'], [30, '30'], [45, '45'], [60, '60'], [120, '120']], G.fps, (v) => Ajustes.poner('grafico', 'fps', v));
    this._opcion(c, 'NUBES', [['simple', 'SIMPLES'], ['vol', 'VOLUMÉTRICAS']], G.nubes, (v) => P('nubes', v));
    this._opcion(c, 'AGUA', [['simple', 'SIMPLE'], ['shader', 'CON SHADER']], G.agua, (v) => P('agua', v));
    this._si(c, 'DETALLE DE TERRENO', G.detalle, (v) => P('detalle', v));
    this._opcion(c, 'PARTÍCULAS', [[0.4, 'POCAS'], [0.7, 'MEDIAS'], [1, 'MUCHAS']], G.particulas, (v) => P('particulas', v));
    this._opcion(c, 'ÁRBOLES', [[0.3, 'POCOS'], [0.6, 'MEDIOS'], [1, 'TODOS']], G.arboles, (v) => P('arboles', v));
    this._si(c, 'MOSTRAR FPS', G.mostrarFps, (v) => Ajustes.poner('grafico', 'mostrarFps', v));
    this._si(c, 'BAJAR CALIDAD SI VA LENTO', G.auto, (v) => Ajustes.poner('grafico', 'auto', v));
  }

  _audio(c) {
    const A = Ajustes.d().audio;
    this._rango(c, 'VOLUMEN GENERAL', 0, 1, 0.05, A.maestro, (v) => Ajustes.poner('audio', 'maestro', v), (v) => Math.round(v * 100) + '%');
    this._rango(c, 'MÚSICA', 0, 1, 0.05, A.musica, (v) => Ajustes.poner('audio', 'musica', v), (v) => Math.round(v * 100) + '%');
    this._rango(c, 'EFECTOS', 0, 1, 0.05, A.efectos, (v) => Ajustes.poner('audio', 'efectos', v), (v) => Math.round(v * 100) + '%');
    this._si(c, 'SILENCIAR TODO', A.silencio, (v) => Ajustes.poner('audio', 'silencio', v));
    this._si(c, 'PAUSAR AUDIO AL OCULTAR LA PESTAÑA', A.pausaOculto, (v) => Ajustes.poner('audio', 'pausaOculto', v));
  }

  _controles(c) {
    const K = Ajustes.d().controles, O = this.c.opciones;
    this._rango(c, 'SENSIBILIDAD', 0.3, 2.5, 0.1, O.sens || 1, (v) => { O.sens = v; this.c.aplicarOpciones(); }, (v) => v.toFixed(1));
    this._si(c, 'INVERTIR EJE Y', O.invertido, (v) => { O.invertido = v; this.c.aplicarOpciones(); });
    this._opcion(c, 'RATÓN EN VUELO', [['apuntar', 'APUNTAR (ESTILO WAR THUNDER)'], ['joystick', 'JOYSTICK VIRTUAL']], O.raton === 'joystick' ? 'joystick' : 'apuntar', (v) => { O.raton = v; this.c.aplicarOpciones(); });
    this._rango(c, 'ZONA MUERTA DEL MANDO', 0, 0.4, 0.01, K.zona, (v) => Ajustes.poner('controles', 'zona', v), (v) => Math.round(v * 100) + '%');
    this._si(c, 'VIBRACIÓN', O.vibracion !== false, (v) => { O.vibracion = v; this.c.aplicarOpciones(); if (v) this.c.entrada.vibrar(0.6, 0.6, 200, 'prueba', 0); });
    this._rango(c, 'INTENSIDAD DE VIBRACIÓN', 0.2, 1, 0.1, K.vibInt, (v) => Ajustes.poner('controles', 'vibInt', v), (v) => Math.round(v * 100) + '%');
    this._si(c, 'CÁMARA AUTOMÁTICA DE MISIL', K.camAuto, (v) => Ajustes.poner('controles', 'camAuto', v));
    c.appendChild(el('h4', 'subt', 'CONTROLES TÁCTILES'));
    this._rango(c, 'TAMAÑO', 0.7, 1.4, 0.05, K.tactilEsc, (v) => Ajustes.poner('controles', 'tactilEsc', v), (v) => Math.round(v * 100) + '%');
    this._rango(c, 'OPACIDAD', 0.2, 1, 0.05, K.tactilOp, (v) => Ajustes.poner('controles', 'tactilOp', v), (v) => Math.round(v * 100) + '%');
    this._rango(c, 'SEPARACIÓN LATERAL', 0, 80, 4, K.tactilSep, (v) => Ajustes.poner('controles', 'tactilSep', v), (v) => v + ' px');
    this._rango(c, 'ALTURA', 0, 80, 4, K.tactilAlt, (v) => Ajustes.poner('controles', 'tactilAlt', v), (v) => v + ' px');
    this._si(c, 'MODO ZURDO', K.zurdo, (v) => Ajustes.poner('controles', 'zurdo', v));
    c.appendChild(el('h4', 'subt', 'TECLAS (clic y pulsa la nueva)'));
    const lista = el('div', 'teclas');
    for (const [def, nombre] of ACCIONES) {
      const b = el('button', 'tecla');
      b.type = 'button';
      const act = K.teclas[def] || def;
      b.append(el('span', '', nombre), el('b', '', this.esperando === def ? '...' : nombreTecla(act)));
      b.addEventListener('click', () => { this.esperando = def; this.dibujar(); });
      lista.appendChild(b);
    }
    c.appendChild(lista);
    const r = el('button', '', 'RESTABLECER TECLAS');
    r.type = 'button';
    r.addEventListener('click', () => { K.teclas = {}; Ajustes.poner('controles', 'teclas', {}); this.dibujar(); });
    c.appendChild(r);
  }

  _tecla(e) {
    if (this.esperando === null) return;
    e.preventDefault();
    e.stopPropagation();
    const K = Ajustes.d().controles, def = this.esperando;
    this.esperando = null;
    if (e.code !== 'Escape' && e.code !== 'F5') {
      // si otra acción ya usa esa tecla, se intercambian
      for (const [d2] of ACCIONES) {
        if (d2 !== def && (K.teclas[d2] || d2) === e.code) K.teclas[d2] = K.teclas[def] || def;
      }
      K.teclas[def] = e.code;
      Ajustes.poner('controles', 'teclas', K.teclas);
    }
    this.dibujar();
  }

  _acces(c) {
    const A = Ajustes.d().acces;
    this._si(c, 'TEXTO GRANDE', A.texto, (v) => Ajustes.poner('acces', 'texto', v));
    this._opcion(c, 'MODO DALTÓNICO', [['ninguno', 'NINGUNO'], ['protanopia', 'PROTANOPIA'], ['deuteranopia', 'DEUTERANOPIA'], ['tritanopia', 'TRITANOPIA']], A.daltonismo, (v) => Ajustes.poner('acces', 'daltonismo', v));
    this._si(c, 'REDUCIR MOVIMIENTO Y EFECTOS', A.reducir, (v) => Ajustes.poner('acces', 'reducir', v));
    this._si(c, 'PISTAS DE AYUDA / TUTORIAL', Ajustes.d().tutorial, (v) => { Ajustes.d().tutorial = v; Ajustes.guardar(); });
  }

  _datos(c) {
    c.appendChild(el('h4', 'subt', 'RANURAS DE GUARDADO'));
    for (let n = 1; n <= 3; n++) {
      const f = el('div', 'fila');
      const b = el('button', Progreso.ranura() === n ? 'sel' : '', `RANURA ${n}: ${Progreso.resumenRanura(n)}`);
      b.type = 'button';
      b.addEventListener('click', () => { Progreso.cambiarRanura(n); this.c.refrescarPerfil(); this.dibujar(); });
      const x = el('button', '', 'BORRAR');
      x.type = 'button';
      x.style.flex = '0 0 90px';
      let seguro = false;
      x.addEventListener('click', () => {
        if (!seguro) { seguro = true; x.textContent = '¿SEGURO?'; return; }
        Progreso.borrarRanura(n); this.c.refrescarPerfil(); this.dibujar();
      });
      f.append(b, x);
      c.appendChild(f);
    }
    c.appendChild(el('h4', 'subt', 'COPIA DE SEGURIDAD'));
    const ta = el('textarea');
    ta.rows = 3;
    ta.placeholder = 'Aquí aparece el texto exportado o pega uno para importar';
    c.appendChild(ta);
    const f = el('div', 'fila');
    const ex = el('button', '', 'EXPORTAR');
    ex.type = 'button';
    ex.addEventListener('click', () => { ta.value = this.c.exportar(); ta.select(); try { navigator.clipboard.writeText(ta.value); } catch (e) { /* manual */ } });
    const im = el('button', '', 'IMPORTAR');
    im.type = 'button';
    im.addEventListener('click', () => { const ok = this.c.importar(ta.value.trim()); ta.value = ''; ta.placeholder = ok ? 'Datos importados' : 'Texto no válido'; if (ok) this.c.refrescarPerfil(); });
    f.append(ex, im);
    c.appendChild(f);
    const bo = el('button', '', 'BORRAR TODOS LOS DATOS');
    bo.type = 'button';
    let seguro = false;
    bo.addEventListener('click', () => { if (!seguro) { seguro = true; bo.textContent = 'PULSA OTRA VEZ PARA CONFIRMAR'; return; } this.c.borrar(); });
    c.appendChild(bo);
  }
}

export function nombreTecla(c) {
  return c.replace(/^Key/, '').replace(/^Digit/, '').replace('Left', ' izq').replace('Right', ' der').replace('Space', 'Espacio').replace('Arrow', '↑↓←→ ').trim();
}

// Mapa físico -> lógico para Entrada
export function mapaTeclas(teclas) {
  const m = {};
  for (const [def] of ACCIONES) { const f = teclas[def]; if (f && f !== def) m[def] = '_'; }
  for (const [def] of ACCIONES) { const f = teclas[def]; if (f && f !== def) m[f] = def; }
  return m;
}
void guardarOpciones; void cargarOpciones;
