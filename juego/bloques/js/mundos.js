// =============================================================
//  🌍  LISTA DE MUNDOS
//  Cada mundo es una "ranura" con su nombre, semilla, tipo, modo y
//  dificultad. Se guardan en localStorage: una lista pequeñita
//  ('bloques_mundos_v2') y un archivo por mundo ('bloques_mundo2_<id>').
//  Se pueden crear, renombrar, borrar, exportar (texto) e importar.
//  El mundo de la versión anterior ('bloques_mundo_v1') se convierte
//  solo en "Mi mundo" (en modo creativo, como se jugaba antes).
// =============================================================
const IDX = 'bloques_mundos_v2';
const PREF = 'bloques_mundo2_';
const VIEJO = 'bloques_mundo_v1';
export const VERSION_GUARDADO = 3;

function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function escribir(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function quitar(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }

function indice() {
  try {
    const o = JSON.parse(leer(IDX) || 'null');
    if (o && Array.isArray(o.lista)) return o;
  } catch (e) { /* se crea uno nuevo */ }
  return { version: 2, lista: [], ultimo: null };
}
function guardarIndice(o) { return escribir(IDX, JSON.stringify(o)); }

const nuevoId = () => 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);

// Pone al día un guardado de cualquier versión (rellena lo que falte)
export function actualizarDatos(d, meta) {
  if (!d || typeof d !== 'object' || !Number.isFinite(d.semilla)) return null;
  const v = d.version | 0;
  d.version = VERSION_GUARDADO;
  d.modo = ['supervivencia', 'creativo', 'aventura'].includes(d.modo) ? d.modo : (v < 3 ? 'creativo' : (meta && meta.modo) || 'creativo');
  d.dificultad = ['pacifico', 'facil', 'normal', 'dificil'].includes(d.dificultad) ? d.dificultad : (meta && meta.dificultad) || 'normal';
  d.tipo = d.tipo === 'plano' ? 'plano' : 'normal';
  d.dias = Number.isFinite(d.dias) ? d.dias : 0;
  return d;
}

export const Mundos = {
  // Convierte el guardado viejo en la primera ranura (una sola vez)
  migrar() {
    const viejo = leer(VIEJO);
    if (!viejo) return;
    const idx = indice();
    if (idx.lista.some((m) => m.id === 'viejo')) { quitar(VIEJO); return; }
    try {
      const d = JSON.parse(viejo);
      if (!d || !Number.isFinite(d.semilla)) return;
      const meta = { id: 'viejo', nombre: 'Mi mundo', semilla: d.semilla, tipo: 'normal', modo: 'creativo', dificultad: 'normal', creado: d.fecha || Date.now(), jugado: d.fecha || Date.now(), cambios: 0 };
      d.version = 2;
      if (!escribir(PREF + 'viejo', JSON.stringify(d))) return;     // sin espacio: se queda el viejo
      idx.lista.push(meta);
      idx.ultimo = 'viejo';
      if (guardarIndice(idx)) quitar(VIEJO);
    } catch (e) { /* guardado dañado: se ignora */ }
  },

  listar() {
    return indice().lista.slice().sort((a, b) => (b.jugado || 0) - (a.jugado || 0));
  },

  ultimo() {
    const idx = indice();
    return idx.lista.find((m) => m.id === idx.ultimo) || null;
  },

  meta(id) { return indice().lista.find((m) => m.id === id) || null; },

  crear({ nombre, semilla, tipo, modo, dificultad }) {
    const idx = indice();
    const meta = {
      id: nuevoId(), nombre: String(nombre || 'Mundo nuevo').trim().slice(0, 28) || 'Mundo nuevo', semilla: semilla | 0,
      tipo: tipo === 'plano' ? 'plano' : 'normal', modo: modo || 'supervivencia', dificultad: dificultad || 'normal',
      creado: Date.now(), jugado: Date.now(), cambios: 0,
    };
    idx.lista.push(meta);
    idx.ultimo = meta.id;
    guardarIndice(idx);
    return meta;
  },

  cargar(id) {
    try {
      const t = leer(PREF + id);
      if (!t) return null;
      return actualizarDatos(JSON.parse(t), this.meta(id));
    } catch (e) { return null; }
  },

  guardar(id, datos, cambios = 0) {
    const ok = escribir(PREF + id, JSON.stringify(datos));
    if (ok) {
      const idx = indice();
      const m = idx.lista.find((x) => x.id === id);
      if (m) { m.jugado = Date.now(); m.cambios = cambios; m.modo = datos.modo || m.modo; m.dificultad = datos.dificultad || m.dificultad; }
      idx.ultimo = id;
      guardarIndice(idx);
    }
    return ok;
  },

  editar(id, campos) {
    const idx = indice();
    const m = idx.lista.find((x) => x.id === id);
    if (!m) return;
    if (campos.nombre !== undefined) m.nombre = String(campos.nombre).trim().slice(0, 28) || m.nombre;
    for (const k of ['modo', 'dificultad']) if (campos[k]) m[k] = campos[k];
    guardarIndice(idx);
  },

  borrar(id) {
    const idx = indice();
    idx.lista = idx.lista.filter((m) => m.id !== id);
    if (idx.ultimo === id) idx.ultimo = idx.lista.length ? idx.lista[0].id : null;
    guardarIndice(idx);
    quitar(PREF + id);
  },

  exportar(id) {
    const meta = this.meta(id), d = leer(PREF + id);
    if (!meta || !d) return null;
    return JSON.stringify({ tipo: 'bloques-mundo', version: VERSION_GUARDADO, meta, datos: JSON.parse(d) });
  },

  // Devuelve la ranura nueva o null si el texto no sirve
  importar(texto) {
    try {
      const o = JSON.parse(texto);
      let meta, datos;
      if (o && o.tipo === 'bloques-mundo' && o.datos) { meta = o.meta || {}; datos = o.datos; }
      else if (o && Number.isFinite(o.semilla)) { meta = { nombre: 'Mundo importado' }; datos = o; }   // un guardado suelto de la versión vieja
      else return null;
      datos = actualizarDatos(datos, meta);
      if (!datos) return null;
      const nueva = this.crear({ nombre: (meta.nombre || 'Mundo') + ' (importado)', semilla: datos.semilla, tipo: datos.tipo, modo: datos.modo, dificultad: datos.dificultad });
      if (!escribir(PREF + nueva.id, JSON.stringify(datos))) { this.borrar(nueva.id); return null; }
      return nueva;
    } catch (e) { return null; }
  },

  tamano(id) { const t = leer(PREF + id); return t ? t.length : 0; },

  borrarTodo() {
    for (const m of indice().lista) quitar(PREF + m.id);
    quitar(IDX);
  },
};
