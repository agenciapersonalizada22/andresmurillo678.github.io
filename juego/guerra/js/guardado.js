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

// El mapa por defecto conserva la clave antigua ("avion", "tanque"); los demás: "avion:desierto"
export function claveRecord(modo, mapa) {
  return !mapa || mapa === CONFIG.predeterminado.mapa ? modo : modo + ':' + mapa;
}

// Guarda si supera el récord de ese modo y mapa. Devuelve true si es nuevo récord.
export function guardarRecord(modo, mapa, puntaje, oleada) {
  const r = cargarRecords();
  const clave = claveRecord(modo, mapa);
  const antes = r[clave] ? r[clave].puntaje : 0;
  if (puntaje <= antes) return false;
  r[clave] = { puntaje, oleada };
  escribir(CONFIG.guardado.clave, r);
  return true;
}

// Mejor puntaje de un modo en cualquier mapa (para desbloquear aviones)
export function mejorPuntaje(modo) {
  let m = 0;
  for (const [k, v] of Object.entries(cargarRecords())) {
    if ((k === modo || k.startsWith(modo + ':')) && v && v.puntaje > m) m = v.puntaje;
  }
  return m;
}

export function cargarOpciones() { return leer(CONFIG.guardado.opciones); }
export function guardarOpciones(o) { escribir(CONFIG.guardado.opciones, o); }
