// Unico modulo de almacenamiento. sudoku_ajustes_dispositivo (por dispositivo) y sudoku_partida (efimera) NO se sincronizan; sudoku_progreso si.
export const CLAVES = { dispositivo: 'sudoku_ajustes_dispositivo', progreso: 'sudoku_progreso', partida: 'sudoku_partida' };
export const CLAVES_NUBE = [CLAVES.progreso];

export function leer(clave, def = null) {
  try { const t = localStorage.getItem(clave); if (!t) return def; const o = JSON.parse(t); return o && typeof o === 'object' ? o : def; } catch (e) { return def; }
}
export function escribir(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); return true; } catch (e) { return false; } }
export function borrar(clave) { try { localStorage.removeItem(clave); } catch (e) { /* sin acceso */ } }

export function mezclar(base, o) {
  if (!o || typeof o !== 'object') return base;
  const r = { ...base };
  for (const k of Object.keys(base)) {
    if (!(k in o)) continue;
    const b = base[k], x = o[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) r[k] = mezclar(b, x);
    else if (typeof b === typeof x) r[k] = x;
  }
  return r;
}

export function exportar() {
  const o = { juego: 'sudoku', v: 1, dispositivo: leer(CLAVES.dispositivo, {}), progreso: leer(CLAVES.progreso, {}) };
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function importar(texto) {
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(String(texto).trim())))); } catch (e) { return false; }
  if (!o || o.juego !== 'sudoku') return false;
  if (o.dispositivo && typeof o.dispositivo === 'object') escribir(CLAVES.dispositivo, o.dispositivo);
  if (o.progreso && typeof o.progreso === 'object') escribir(CLAVES.progreso, o.progreso);
  return true;
}
export function borrarTodo() { Object.values(CLAVES).forEach(borrar); }
