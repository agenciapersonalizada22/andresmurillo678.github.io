// Unico modulo de almacenamiento (localStorage, prefijo "mente_"). mente_progreso se sincroniza con la nube;
// mente_ajustes_dispositivo (graficos, audio, controles, accesibilidad) y mente_partida (efimera) NO.
export const CLAVES = { progreso: 'mente_progreso', dispositivo: 'mente_ajustes_dispositivo', partida: 'mente_partida' };
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
export const hoy = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
