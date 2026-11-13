// Unico modulo de almacenamiento. minijuegos_ajustes_dispositivo NO se sincroniza; minijuegos_progreso si; minijuegos_torneo es efimero (partida en curso).
export const CLAVES = { dispositivo: 'minijuegos_ajustes_dispositivo', progreso: 'minijuegos_progreso', torneo: 'minijuegos_torneo' };

export function leer(clave, def = null) {
  try {
    const t = localStorage.getItem(clave);
    if (!t) return def;
    const o = JSON.parse(t);
    return o && typeof o === 'object' ? o : def;
  } catch (e) { return def; }
}
export function escribir(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); return true; } catch (e) { return false; } }
export function borrar(clave) { try { localStorage.removeItem(clave); } catch (e) { /* sin acceso */ } }

export const mezclar = (base, o) => {
  if (!o || typeof o !== 'object') return base;
  const r = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(base)) {
    if (!(k in o)) continue;
    const b = base[k], x = o[k];
    if (Array.isArray(b)) { if (Array.isArray(x)) r[k] = b.map((e, i) => (e && typeof e === 'object' && x[i] && typeof x[i] === 'object' ? mezclar(e, x[i]) : (typeof x[i] === typeof e ? x[i] : e))); }
    else if (b && typeof b === 'object') r[k] = mezclar(b, x);
    else if (typeof b === typeof x) r[k] = x;
  }
  return r;
};

export function exportar() {
  const o = { juego: 'minijuegos', v: 1 };
  for (const k of [CLAVES.progreso, CLAVES.dispositivo]) o[k] = leer(k, {});
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function importar(texto) {
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(String(texto).trim())))); } catch (e) { return false; }
  if (!o || o.juego !== 'minijuegos') return false;
  for (const k of [CLAVES.progreso, CLAVES.dispositivo]) if (o[k] && typeof o[k] === 'object') escribir(k, o[k]);
  borrar(CLAVES.torneo);
  return true;
}
export function borrarTodo() { for (const k of Object.values(CLAVES)) borrar(k); }
