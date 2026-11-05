// Unico modulo de almacenamiento (localStorage). Claves prefijadas con "cartas_".
// *_dispositivo (graficos/controles) es por dispositivo y NO debe sincronizarse a la nube; todo lo demas si.
import { monederoNuevo } from './economia.js';

const P = 'cartas_';
export const CLAVES = { ajustes: P + 'ajustes', dispositivo: P + 'ajustes_dispositivo', monedero: P + 'monedero', stats: P + 'stats', logros: P + 'logros', historial: P + 'historial', mesas: P + 'mesas', ultima: P + 'ultima', cobros: P + 'cobros' };
export const AJUSTES_DEF = {
  audio: { maestro: 0.8, efectos: 0.9, pausaOculta: true },
  accesibilidad: { textoGrande: false, daltonico: false, contraste: false, reducirMov: false },
  mesa: { reverso: 'azul', turnoSeg: 30, avatar: '', avisos: true },
  economia: { inicial: 5000, regalo: 500 },
};
export const DISPOSITIVO_DEF = {
  graficos: { preset: 'media', animaciones: true, sombras: true, fps: false, autoBajar: true },
  controles: { zurdo: false, vibracion: true, zonaMuerta: 0.18, sensibilidad: 1, tamBoton: 1, opacidad: 1, teclas: { fold: 'f', call: 'c', raise: 'r', allin: 'a', chat: 't', pausa: 'Escape' } },
};
const copiaProf = (o) => JSON.parse(JSON.stringify(o));
function mezclar(def, v) {
  const o = copiaProf(def);
  if (v && typeof v === 'object') for (const k of Object.keys(o)) { if (v[k] !== undefined) o[k] = (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) ? mezclar(o[k], v[k]) : v[k]; }
  return o;
}
export function leer(clave, def) {
  try { const t = localStorage.getItem(clave); return t == null ? def : JSON.parse(t); } catch (e) { return def; }
}
export function escribir(clave, valor) {
  try { localStorage.setItem(clave, typeof valor === 'string' ? valor : JSON.stringify(valor)); return true; } catch (e) { return false; }
}
export function quitar(clave) { try { localStorage.removeItem(clave); } catch (e) {} }
export function leerTexto(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }

export const ajustes = { obtener: () => mezclar(AJUSTES_DEF, leer(CLAVES.ajustes)), guardar: (a) => escribir(CLAVES.ajustes, a) };
export const dispositivo = { obtener: () => mezclar(DISPOSITIVO_DEF, leer(CLAVES.dispositivo)), guardar: (a) => escribir(CLAVES.dispositivo, a) };
export const monedero = {
  obtener() { const a = ajustes.obtener(); const m = leer(CLAVES.monedero); return m && typeof m.saldo === 'number' ? m : monederoNuevo(a.economia.inicial); },
  guardar(m) { escribir(CLAVES.monedero, m); },
};
export const stats = { obtener: () => leer(CLAVES.stats, {}), guardar: (s) => escribir(CLAVES.stats, s) };
export const logros = { obtener: () => leer(CLAVES.logros, {}), guardar: (l) => escribir(CLAVES.logros, l) };
export const historial = { obtener: () => leer(CLAVES.historial, []), guardar: (h) => escribir(CLAVES.historial, h.slice(-150)) };

// mesas: indice {id: {id, rol:'anfitrion'|'cliente', juego, nombre, t, mano, fichas, tok}}; estado completo del anfitrion en cartas_mesa_<id>
export const mesas = {
  indice: () => leer(CLAVES.mesas, {}),
  nota(id, datos) { const i = mesas.indice(); i[id] = Object.assign(i[id] || { id }, datos); escribir(CLAVES.mesas, i); },
  olvidar(id) { const i = mesas.indice(); delete i[id]; escribir(CLAVES.mesas, i); quitar(P + 'mesa_' + id); quitar(P + 'asiento_' + id); },
  guardarEstado(id, texto) { escribir(P + 'mesa_' + id, texto); },
  leerEstado: (id) => leerTexto(P + 'mesa_' + id),
  asiento: (id) => leer(P + 'asiento_' + id, null),
  guardarAsiento: (id, d) => escribir(P + 'asiento_' + id, d),
};
// cobros pendientes de una sesion (por si se recarga antes de acreditarlos)
export const cobros = {
  obtener: () => leer(CLAVES.cobros, {}),
  anotar(clave, n) { const c = cobros.obtener(); c[clave] = n; escribir(CLAVES.cobros, c); },
  hecho(clave) { const c = cobros.obtener(); delete c[clave]; escribir(CLAVES.cobros, c); },
};

// exportar / importar guardado como texto (sin ajustes de dispositivo ni estados de mesas ajenas)
export function exportar() {
  const o = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(P) && k !== CLAVES.dispositivo) o[k] = localStorage.getItem(k); } } catch (e) {}
  return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, juego: 'cartas', datos: o }))));
}
export function importar(texto) {
  let o; try { o = JSON.parse(decodeURIComponent(escape(atob(String(texto).trim())))); } catch (e) { return { ok: false, error: 'El texto no es un guardado valido' }; }
  if (!o || o.juego !== 'cartas' || !o.datos) return { ok: false, error: 'No es un guardado de Cartas' };
  let n = 0; Object.keys(o.datos).forEach((k) => { if (k.startsWith(P) && k !== CLAVES.dispositivo) { try { localStorage.setItem(k, o.datos[k]); n++; } catch (e) {} } });
  return { ok: true, n };
}
export function borrarTodo(conDispositivo) {
  try { Object.keys(localStorage).forEach((k) => { if (k.startsWith(P) && (conDispositivo || k !== CLAVES.dispositivo)) localStorage.removeItem(k); }); } catch (e) {}
}
