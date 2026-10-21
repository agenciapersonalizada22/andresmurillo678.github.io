// =============================================================
//  💾  GUARDADO
//  Partida en curso, preferencias y estadísticas viven en
//  localStorage. Si el navegador no deja guardar (modo privado),
//  el juego sigue funcionando y simplemente no recuerda nada.
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

export const OPCIONES_BASE = () => ({
  tema: 'clasico', calidad: esCelular() ? 'media' : 'alta', sonido: true, musica: false, volumen: 0.7,
  ayuda: true, girarAuto: false, nivel: 'medio', modo: 'ia', color: 'blancas', reloj: 'sin',
});

export function cargarOpciones() {
  return { ...OPCIONES_BASE(), ...(leer(CONFIG.guardado.opciones) || {}) };
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
