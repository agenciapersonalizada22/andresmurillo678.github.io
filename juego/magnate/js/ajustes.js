// Modelo de ajustes. General (audio, accesibilidad, reglas por defecto) en `magnate_ajustes`;
// graficos y controles por dispositivo en `magnate_ajustes_dispositivo`.
import { leer, guardar, CLAVES } from './almacen.js';

const tactil = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };

export const PRESETS = {
  baja: { pixel: 1, antialias: false, sombras: false, texTablero: 1024, particulas: false, fpsMax: 30 },
  media: { pixel: 1.25, antialias: false, sombras: false, texTablero: 1536, particulas: true, fpsMax: 60 },
  alta: { pixel: 1.75, antialias: true, sombras: true, texTablero: 2048, particulas: true, fpsMax: 60 },
  ultra: { pixel: 2.5, antialias: true, sombras: true, texTablero: 4096, particulas: true, fpsMax: 0 }
};
export const TECLAS_BASE = { accion: ' ', propiedades: 'p', tratos: 't', registro: 'l', chat: 'c', vista: 'v', pausa: 'escape', sonido: 'm', pantalla: 'f' };

const GEN = () => ({
  vol: { maestro: 0.8, musica: 0.45, efectos: 0.9 }, musica: true, pausaOculta: true,
  texto: 'normal', simbolos: false, altoContraste: false, reducirMov: false, velocidad: 1, camaraAuto: true
});
const DISP = () => ({
  gfx: Object.assign({ preset: tactil() ? 'media' : 'alta', mostrarFps: false, autoCalidad: true }, PRESETS[tactil() ? 'media' : 'alta']),
  ctl: { sens: 1, zonaMuerta: 0.18, vibracion: true, vibInt: 1, tamBotones: 1, opBotones: 1, posBotones: 'abajo', zurdo: false, teclas: Object.assign({}, TECLAS_BASE) }
});
function fusionar(base, o) {
  if (!o || typeof o !== 'object') return base;
  for (const k in base) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = fusionar(base[k], o[k]);
    else if (k in o && typeof o[k] === typeof base[k]) base[k] = o[k];
  }
  return base;
}
export const A = fusionar(GEN(), leer(CLAVES.ajustes, null));
export const D = fusionar(DISP(), leer(CLAVES.disp, null));
const oyentes = [];
export const alCambiar = (fn) => { oyentes.push(fn); };
export function guardarAjustes() {
  guardar(CLAVES.ajustes, A); guardar(CLAVES.disp, D);
  oyentes.forEach((f) => f());
}
export function aplicarPreset(nombre) {
  if (!PRESETS[nombre]) return;
  Object.assign(D.gfx, PRESETS[nombre], { preset: nombre });
  guardarAjustes();
}
export function restablecer() {
  Object.assign(A, GEN()); const d = DISP(); D.gfx = d.gfx; D.ctl = d.ctl; guardarAjustes();
}
export const esTactil = tactil;
