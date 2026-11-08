// Unico modulo de almacenamiento (localStorage con prefijo "bolos_"). Sincroniza con la nube solo bolos_progreso;
// bolos_ajustes_dispositivo (graficos/controles) y las claves de partida/sala son locales.
export const CLAVES = {
  dispositivo: 'bolos_ajustes_dispositivo', progreso: 'bolos_progreso', partida: 'bolos_partida',
  sala: 'bolos_sala', asiento: 'bolos_asiento', tutorial: 'bolos_tutorial'
};
export function leer(clave, def = null) {
  try { const t = localStorage.getItem(clave); if (!t) return def; const o = JSON.parse(t); return o && typeof o === 'object' ? o : def; } catch (e) { return def; }
}
export function escribir(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); return true; } catch (e) { return false; } }
export function borrar(clave) { try { localStorage.removeItem(clave); } catch (e) { /* sin acceso */ } }
export function mezclar(base, o) {
  if (!o || typeof o !== 'object') return base;
  const r = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(base)) {
    if (!(k in o)) continue;
    const b = base[k], x = o[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) r[k] = mezclar(b, x);
    else if (typeof b === typeof x) r[k] = x;
  }
  return r;
}
export function exportar() {
  const o = { juego: 'bolos', v: 1, progreso: leer(CLAVES.progreso, {}) };
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function importar(texto) {
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(String(texto).trim())))); } catch (e) { return false; }
  if (!o || o.juego !== 'bolos' || !o.progreso || typeof o.progreso !== 'object') return false;
  escribir(CLAVES.progreso, o.progreso);
  return true;
}
export function borrarTodo() { for (const k of Object.values(CLAVES)) borrar(k); }
