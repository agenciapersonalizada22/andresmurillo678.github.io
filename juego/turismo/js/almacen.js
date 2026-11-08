// Unico modulo de almacenamiento local (claves con prefijo turismo_). Facil de sincronizar luego: todo pasa por aqui.
const P = 'turismo_';
export const CLAVES = {
  ajustes: P + 'ajustes', disp: P + 'ajustes_dispositivo', progreso: P + 'progreso',
  partida: P + 'partida', asiento: P + 'asiento', setup: P + 'setup'
};
export function leer(clave, def) {
  try { const t = localStorage.getItem(clave); return t ? JSON.parse(t) : def; } catch (e) { return def; }
}
export function guardar(clave, v) {
  try { localStorage.setItem(clave, JSON.stringify(v)); return true; } catch (e) { return false; }
}
export function borrar(clave) { try { localStorage.removeItem(clave); } catch (e) { /* nada */ } }

const SINC = ['ajustes', 'progreso', 'partida', 'setup'];
export function exportarTodo() {
  const o = { v: 1 };
  SINC.forEach((k) => { o[k] = leer(CLAVES[k], null); });
  return 'TURISMO1:' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function importarTodo(txt) {
  try {
    const t = String(txt).trim();
    if (!t.startsWith('TURISMO1:')) return false;
    const o = JSON.parse(decodeURIComponent(escape(atob(t.slice(9)))));
    if (!o || o.v !== 1) return false;
    SINC.forEach((k) => { if (o[k] != null) guardar(CLAVES[k], o[k]); else borrar(CLAVES[k]); });
    return true;
  } catch (e) { return false; }
}
export function borrarTodo(incluirDispositivo) {
  SINC.forEach((k) => borrar(CLAVES[k]));
  borrar(CLAVES.asiento);
  if (incluirDispositivo) borrar(CLAVES.disp);
}
