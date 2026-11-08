// =============================================================
//  ⚙️  AJUSTES
//  Todo lo que el jugador puede cambiar en el menú de ajustes vive
//  aquí, con su valor por defecto. Se guarda en localStorage con
//  la clave 'bloques_ajustes_v2'. Si es la primera vez, se traen
//  las opciones sueltas de la versión anterior (calidad, distancia,
//  sonido…) para que nadie pierda lo que ya había elegido.
//  El perfil (nombre y color) se comparte entre juegos: 'juego_perfil'.
// =============================================================
import { Bus } from './bus.js';

const CLAVE = 'bloques_ajustes_v2';

export const DEFECTO = {
  // gráficos
  calidad: 'auto', distancia: 0, sombras: 'auto', resolucion: 'auto', limiteFps: 0, mostrarFps: false,
  autoCalidad: true, antialias: true, fov: 75, particulas: true, minimapa: true, minimapaZoom: 2,
  // espacio y otras dimensiones
  efectosEspacio: 'auto', eclipses: true, tierraVisible: true, vibracionCohete: true, distanciaDim: 0,
  // audio
  volMaestro: 80, volMusica: 60, volEfectos: 80, silencio: false, pausaOculto: true,
  // controles
  sensRaton: 5, sensTactil: 5, invertirY: false, sensMando: 5, zonaMuerta: 0, vibrar: true, vibracion: 70,
  tamTactil: 100, opTactil: 80, zurdo: false, saltoAuto: true, teclas: {},
  // accesibilidad
  textoGrande: false, daltonismo: 'no', reducirMov: false, flashDano: true,
  // juego
  dificultad: 'normal', conservarInv: true, autoguardado: 15, ayudaControles: true, depuracion: false,
};

export const ACCIONES_TECLA = [
  ['adelante', 'Adelante', 'KeyW'], ['atras', 'Atrás', 'KeyS'], ['izquierda', 'Izquierda', 'KeyA'], ['derecha', 'Derecha', 'KeyD'],
  ['saltar', 'Saltar', 'Space'], ['correr', 'Correr / bajar', 'ShiftLeft'], ['volar', 'Volar', 'KeyF'],
  ['inventario', 'Inventario', 'KeyI'], ['usar', 'Usar / vehículo', 'KeyE'], ['camara', 'Vista del vehículo', 'KeyC'],
  ['luces', 'Luces', 'KeyL'], ['repostar', 'Combustible', 'KeyG'], ['chat', 'Chat', 'KeyT'], ['datos', 'Datos (F3)', 'F3'],
  ['musica', 'Música', 'KeyM'], ['minimapa', 'Minimapa', 'KeyN'], ['foto', 'Modo foto', 'F2'],
];
export const TECLA_DEFECTO = Object.fromEntries(ACCIONES_TECLA.map((a) => [a[0], a[2]]));

export function nombreTecla(code) {
  if (!code) return '—';
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift der.')
    .replace('Space', 'Espacio').replace('Arrow', 'Flecha ').replace('ControlLeft', 'Ctrl').replace('Backquote', '`');
}

function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

function migrar() {
  const v = {};
  try {
    const o = JSON.parse(leer('bloques_opciones') || 'null');
    if (o && typeof o === 'object') {
      if (typeof o.calidad === 'string') v.calidad = o.calidad;
      if (Number.isFinite(o.distancia)) v.distancia = o.distancia | 0;
      if (o.depuracion) v.depuracion = true;
      if (Number.isFinite(o.mandoSens)) v.sensMando = o.mandoSens | 0;
      if (o.mandoInvertirY) v.invertirY = true;
    }
  } catch (e) { /* nada */ }
  if (leer('bloques_efectos') === '0') v.volEfectos = 0;
  if (leer('bloques_musica') === '0') v.volMusica = 0;
  return v;
}

export function perfil() {
  try {
    const p = JSON.parse(leer('juego_perfil') || 'null');
    if (p && typeof p === 'object') {
      return { nombre: String(p.nombre || 'Jugador').slice(0, 20), color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#3df5ff' };
    }
  } catch (e) { /* nada */ }
  return { nombre: 'Jugador', color: '#3df5ff' };
}

export function guardarPerfil(nombre) {
  const p = perfil();
  p.nombre = String(nombre || 'Jugador').trim().slice(0, 20) || 'Jugador';
  try { localStorage.setItem('juego_perfil', JSON.stringify(p)); } catch (e) { /* nada */ }
  return p;
}

class Ajustes {
  constructor() {
    this.bus = new Bus();
    this.v = { ...DEFECTO, teclas: {} };
    let t = leer(CLAVE);
    if (t) {
      try { Object.assign(this.v, JSON.parse(t)); } catch (e) { /* se usan los de siempre */ }
    } else Object.assign(this.v, migrar());
    if (!this.v.teclas || typeof this.v.teclas !== 'object') this.v.teclas = {};
  }

  get(k) { return this.v[k]; }

  set(k, valor) {
    if (this.v[k] === valor) return;
    this.v[k] = valor;
    this.guardar();
    this.bus.emitir('cambio', { clave: k, valor });
  }

  ponerTecla(accion, code) {
    const t = { ...this.v.teclas };
    for (const a of Object.keys(t)) if (t[a] === code && a !== accion) t[a] = '';   // se le quita a la otra acción
    if (!code || code === TECLA_DEFECTO[accion]) delete t[accion]; else t[accion] = code;
    this.v.teclas = t;
    this.guardar();
    this.bus.emitir('cambio', { clave: 'teclas', valor: t });
  }

  teclaDe(accion) {
    const u = this.v.teclas[accion];
    return u === undefined ? TECLA_DEFECTO[accion] : u;
  }

  guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(this.v)); } catch (e) { /* nada */ } }

  restablecer() {
    this.v = { ...DEFECTO, teclas: {} };
    this.guardar();
    this.bus.emitir('cambio', { clave: '*', valor: null });
  }

  exportar() { return JSON.stringify({ tipo: 'bloques-ajustes', version: 2, ajustes: this.v }); }

  importar(texto) {
    try {
      const o = JSON.parse(texto);
      const a = o && o.tipo === 'bloques-ajustes' ? o.ajustes : null;
      if (!a || typeof a !== 'object') return false;
      for (const k of Object.keys(DEFECTO)) if (k in a && typeof a[k] === typeof DEFECTO[k]) this.v[k] = a[k];
      this.guardar();
      this.bus.emitir('cambio', { clave: '*', valor: null });
      return true;
    } catch (e) { return false; }
  }
}

export const Aj = new Ajustes();
