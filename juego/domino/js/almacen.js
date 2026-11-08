// Unico modulo de almacenamiento (localStorage con prefijo "domino_"), pensado para sincronizarse luego con la nube.
// domino_ajustes_dispositivo NO se sincroniza (graficos/controles por dispositivo); el resto si.
export const CLAVES = {
  ajustes: 'domino_ajustes', dispositivo: 'domino_ajustes_dispositivo', progreso: 'domino_progreso',
  mesa: 'domino_mesa_host', apuesta: 'domino_apuesta', asiento: 'domino_asiento', tutorial: 'domino_tutorial'
};

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

const mezclar = (base, o) => {
  if (!o || typeof o !== 'object') return base;
  const r = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(base)) {
    if (!(k in o)) continue;
    const b = base[k], x = o[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) r[k] = mezclar(b, x);
    else if (typeof b === typeof x) r[k] = x;
  }
  return r;
};
export { mezclar };

const sync = [CLAVES.ajustes, CLAVES.progreso];
export function exportar() {
  const o = { juego: 'domino', v: 1 };
  for (const k of sync) o[k] = leer(k, {});
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function importar(texto) {
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(String(texto).trim())))); } catch (e) { return false; }
  if (!o || o.juego !== 'domino') return false;
  for (const k of sync) if (o[k] && typeof o[k] === 'object') escribir(k, o[k]);
  return true;
}
export function borrarTodo() { for (const k of Object.values(CLAVES)) borrar(k); }
