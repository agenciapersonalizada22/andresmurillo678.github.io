// =============================================================
//  💾  GUARDADO
//  Partida en curso, preferencias, estadísticas, perfil Elo,
//  biblioteca de partidas y progreso de rompecabezas y lecciones
//  viven en localStorage. Si el navegador no deja guardar (modo
//  privado), el juego sigue funcionando y no recuerda nada.
// =============================================================
import { CONFIG } from './config.js';

const leer = (clave) => {
  try {
    const t = localStorage.getItem(clave);
    const o = t ? JSON.parse(t) : null;
    return o && typeof o === 'object' ? o : null;
  } catch (e) {
    return null;
  }
};
const escribir = (clave, v) => {
  try { localStorage.setItem(clave, JSON.stringify(v)); return true; } catch (e) { return false; }
};
const borrar = (clave) => { try { localStorage.removeItem(clave); } catch (e) { /* nada */ } };

const esCelular = () => {
  try { return window.matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600; } catch (e) { return false; }
};

export const TECLAS_BASE = { deshacer: 'z', rehacer: 'y', vista: 'v', pista: 'h', analisis: 'a', girar: 'f', pausa: 'escape', atras: 'arrowleft', adelante: 'arrowright', pantalla: 'g' };

export const OPCIONES_BASE = () => ({
  // partida
  modo: 'ia', color: 'blancas', nivel: 'medio', reloj: 'sin', variante: 'estandar', ventaja: 'dama', ventajaLado: 'tu', practica: 0,
  // gráficos
  tema: 'clasico', calidad: esCelular() ? 'media' : 'alta', sombras: 'auto', antialias: 'auto', resolucion: 1, particulas: 'auto',
  limiteFps: 0, mostrarFps: false, autoCalidad: true, render: 'auto', set3d: 'tema', set2d: 'clasico', coordenadas: true,
  // audio
  sonido: true, musica: false, volumen: 0.7, volMusica: 0.5, volEfectos: 0.9, pausaOculta: true, sonidoReloj: true,
  // controles
  sens: 1, invertirY: false, zonaMuerta: 0.18, vibracion: true, vibIntensidad: 1, teclas: { ...TECLAS_BASE },
  tamBotones: 1, opBotones: 1, posBotones: 'abajo', zurdo: false, confirmarMov: false, premov: true, flechasDerecho: true,
  // accesibilidad
  textoGrande: false, daltonico: 'no', reducirMovimiento: false, altoContraste: false, leerJugadas: false,
  // juego
  ayuda: true, girarAuto: false, analisisVivo: false, multiPV: 3, flechaMejor: true, mostrarApertura: true, tutorialVisto: false,
});

export function cargarOpciones() {
  const g = leer(CONFIG.guardado.opciones) || {};
  const base = OPCIONES_BASE();
  const o = { ...base, ...g };
  o.teclas = { ...base.teclas, ...(g.teclas || {}) };
  return o;
}
export const guardarOpciones = (o) => escribir(CONFIG.guardado.opciones, o);

export const cargarPartida = () => {
  const d = leer(CONFIG.guardado.partida);
  return d && typeof d.fenInicial === 'string' && Array.isArray(d.movs) ? d : null;
};
export const guardarPartida = (d) => escribir(CONFIG.guardado.partida, d);
export const borrarPartida = () => borrar(CONFIG.guardado.partida);

// Estadísticas: { nivel: { v, t, d } }
export const cargarStats = () => leer(CONFIG.guardado.stats) || {};
export function sumarStat(nivel, resultado) {
  const s = cargarStats();
  const e = s[nivel] || { v: 0, t: 0, d: 0 };
  e[resultado]++;
  s[nivel] = e;
  escribir(CONFIG.guardado.stats, s);
  return s;
}
export const borrarStats = () => borrar(CONFIG.guardado.stats);

// Perfil Elo: { elo, partidas, historial: [{f, r, rival, er, d, ap, eco}], aperturas: {eco: {n, v, t, d}}, logros: {id: ts}, extra: {...} }
export const perfilBase = () => ({ elo: 1200, partidas: 0, historial: [], aperturas: {}, logros: {}, extra: {} });
export const cargarPerfil = () => ({ ...perfilBase(), ...(leer(CONFIG.guardado.perfil) || {}) });
export const guardarPerfil = (p) => escribir(CONFIG.guardado.perfil, p);

// Biblioteca de partidas: [{ id, t, titulo, blancas, negras, res, apertura, pgn, notas, ply }]
export function cargarBiblioteca() {
  try { const a = JSON.parse(localStorage.getItem(CONFIG.guardado.biblioteca) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
export const guardarBiblioteca = (a) => escribir(CONFIG.guardado.biblioteca, a);

// Progreso de rompecabezas y lecciones
export const cargarRompe = () => ({ elo: 800, resueltos: {}, fallados: {}, total: 0, aciertos: 0, racha: 0, mejorRacha: 0, mejorRachaModo: 0, diario: '', ...(leer(CONFIG.guardado.rompe) || {}) });
export const guardarRompe = (r) => escribir(CONFIG.guardado.rompe, r);
export const cargarLecciones = () => leer(CONFIG.guardado.lecciones) || {};
export const guardarLecciones = (l) => escribir(CONFIG.guardado.lecciones, l);

// Todo el progreso como texto (para copiar a otro dispositivo) y la operación inversa
const CLAVES = ['opciones', 'partida', 'stats', 'perfil', 'biblioteca', 'rompe', 'lecciones'];
export function exportarTodo() {
  const o = { juego: 'ajedrez', version: 1 };
  for (const k of CLAVES) {
    try { const t = localStorage.getItem(CONFIG.guardado[k]); if (t) o[k] = JSON.parse(t); } catch (e) { /* nada */ }
  }
  return JSON.stringify(o);
}
export function importarTodo(texto) {
  let o;
  try { o = JSON.parse(texto); } catch (e) { return 'El texto no es un guardado válido'; }
  if (!o || o.juego !== 'ajedrez') return 'Este texto no es un guardado de Ajedrez 3D';
  for (const k of CLAVES) if (o[k] !== undefined) escribir(CONFIG.guardado[k], o[k]);
  return null;
}
export function borrarTodo() { for (const k of CLAVES) borrar(CONFIG.guardado[k]); }

// Perfil compartido de la web
export function perfilCompartido() {
  try {
    const p = JSON.parse(localStorage.getItem('juego_perfil') || 'null');
    if (p && typeof p.nombre === 'string' && p.nombre.trim()) return { nombre: p.nombre.trim().slice(0, 16), color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#3df5ff' };
  } catch (e) { /* nada */ }
  return { nombre: 'Jugador', color: '#3df5ff' };
}
