// Récords y opciones en localStorage (si no se puede, el juego sigue sin recordar)
import { CONFIG } from './config.js';

function leer(clave) {
  try {
    const t = localStorage.getItem(clave);
    const o = t ? JSON.parse(t) : null;
    return o && typeof o === 'object' ? o : {};
  } catch (e) {
    return {};
  }
}

function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* nada */ }
}

export function cargarRecords() { return leer(CONFIG.guardado.clave); }

// Guarda si supera el récord de ese modo. Devuelve true si es nuevo récord.
export function guardarRecord(modo, puntaje, oleada) {
  const r = cargarRecords();
  const antes = r[modo] ? r[modo].puntaje : 0;
  if (puntaje <= antes) return false;
  r[modo] = { puntaje, oleada };
  escribir(CONFIG.guardado.clave, r);
  return true;
}

export function cargarOpciones() { return leer(CONFIG.guardado.opciones); }
export function guardarOpciones(o) { escribir(CONFIG.guardado.opciones, o); }
