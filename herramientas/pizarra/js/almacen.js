// Almacenamiento unico de Pizarra. Toda la persistencia pasa por aqui (interfaz simple para
// sincronizar con la nube en la fase 2): tableros en IndexedDB como registro de operaciones
// (log) + metadatos + imagenes + versiones; ajustes en localStorage con prefijo "pizarra_".
// Sin IndexedDB (modo privado antiguo) cae a memoria.
import { PAPELERA_DIAS } from './config.js';
import { compactarOps } from './modelo.js';

const PFX = 'pizarra_';
export const ls = {
  leer(k, def) { try { const t = localStorage.getItem(PFX + k); return t == null ? def : JSON.parse(t); } catch (e) { return def; } },
  escribir(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  borrar(k) { try { localStorage.removeItem(PFX + k); } catch (e) {} },
  claves() { try { return Object.keys(localStorage).filter(k => k.startsWith(PFX)); } catch (e) { return []; } }
};

// ---- capa minima sobre IndexedDB / memoria ----
let bd = null, mem = null;
const STORES = { tableros: { keyPath: 'id' }, log: { autoIncrement: true, idx: 'tab' }, assets: { keyPath: 'k', idx: 'tab' }, versiones: { autoIncrement: true, idx: 'tab' } };

function abrir() {
  if (bd) return bd;
  bd = new Promise(res => {
    let usado = false;
    const memoria = () => { if (usado) return; usado = true; mem = { tableros: new Map(), log: [], assets: new Map(), versiones: [], n: 1 }; res(null); };
    try {
      if (!window.indexedDB) return memoria();
      const rq = indexedDB.open('pizarra', 1);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        for (const [n, o] of Object.entries(STORES)) {
          const s = db.createObjectStore(n, o.keyPath ? { keyPath: o.keyPath } : { autoIncrement: true });
          if (o.idx) s.createIndex(o.idx, o.idx);
        }
      };
      rq.onsuccess = () => { usado = true; res(rq.result); };
      rq.onerror = rq.onblocked = () => memoria();
      setTimeout(() => { if (!usado) memoria(); }, 4000);
    } catch (e) { memoria(); }
  });
  return bd;
}
const prom = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const fin = t => new Promise((ok, ko) => { t.oncomplete = () => ok(); t.onerror = t.onabort = () => ko(t.error); });

async function put(store, val) {
  const db = await abrir();
  if (!db) {
    if (store === 'tableros') mem.tableros.set(val.id, val);
    else if (store === 'assets') mem.assets.set(val.k, val);
    else mem[store].push({ ...val, _k: mem.n++ });
    return;
  }
  const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); return fin(t);
}
async function todos(store, tab) {
  const db = await abrir();
  if (!db) {
    if (store === 'tableros') return [...mem.tableros.values()];
    if (store === 'assets') return [...mem.assets.values()].filter(a => a.tab === tab);
    return mem[store].filter(r => r.tab === tab);
  }
  const s = db.transaction(store).objectStore(store);
  if (store === 'tableros') return prom(s.getAll());
  return new Promise((ok, ko) => {
    const r = [], c = s.index('tab').openCursor(IDBKeyRange.only(tab));
    c.onsuccess = () => { const cur = c.result; if (cur) { r.push({ ...cur.value, _k: cur.primaryKey }); cur.continue(); } else ok(r); };
    c.onerror = () => ko(c.error);
  });
}
async function borrarDe(store, tab, soloClaves) {
  const db = await abrir();
  if (!db) {
    if (store === 'assets') { for (const [k, a] of mem.assets) if (a.tab === tab) mem.assets.delete(k); }
    else mem[store] = mem[store].filter(r => r.tab !== tab || (soloClaves && !soloClaves.has(r._k)));
    return;
  }
  const filas = await todos(store, tab);
  const t = db.transaction(store, 'readwrite'), s = t.objectStore(store);
  for (const r of filas) if (!soloClaves || soloClaves.has(r._k)) s.delete(store === 'assets' ? r.k : r._k);
  return fin(t);
}

export const memoriaSolo = async () => !(await abrir());

// ---- tableros ----
const nuevoMeta = (id, titulo) => ({ id, titulo: titulo || 'Tablero sin título', creado: Date.now(), mod: Date.now(), borrado: 0, mini: '', n: 0, paginas: 1 });

export async function listar(papelera = false) {
  const r = (await todos('tableros')).filter(t => !!t.borrado === papelera);
  return r.sort((a, b) => (papelera ? b.borrado - a.borrado : b.mod - a.mod));
}
export async function meta(id) { return (await todos('tableros')).find(t => t.id === id) || null; }
export async function guardarMeta(m) { await put('tableros', m); return m; }
export async function crear(id, titulo) { const m = nuevoMeta(id, titulo); await put('tableros', m); return m; }

export async function cargar(id) {
  const m = await meta(id); if (!m) return null;
  const log = (await todos('log', id)).sort((a, b) => a._k - b._k);
  const ops = []; for (const r of log) for (const o of r.ops) ops.push(o);
  const assets = {}; for (const a of await todos('assets', id)) assets[a.id] = a.data;
  return { meta: m, ops, assets, registros: log.length };
}
export async function anexar(id, ops) {
  if (!ops.length) return;
  await put('log', { tab: id, ops: compactarOps(ops) });
}
// Reescribe el log como un unico registro (tras cargar o cuando crece demasiado).
export async function compactar(id, opsCompletas) {
  const antes = (await todos('log', id)).map(r => r._k);
  await put('log', { tab: id, ops: opsCompletas });
  await borrarDe('log', id, new Set(antes));
}
export async function guardarAsset(tab, id, data) { await put('assets', { k: tab + '|' + id, tab, id, data }); }

export async function actualizarMeta(id, cambios) {
  const m = await meta(id); if (!m) return null;
  Object.assign(m, cambios); await put('tableros', m); return m;
}
export async function aPapelera(id) { return actualizarMeta(id, { borrado: Date.now() }); }
export async function restaurar(id) { return actualizarMeta(id, { borrado: 0, mod: Date.now() }); }
export async function eliminar(id) {
  const db = await abrir();
  if (!db) mem.tableros.delete(id);
  else { const t = db.transaction('tableros', 'readwrite'); t.objectStore('tableros').delete(id); await fin(t); }
  await borrarDe('log', id); await borrarDe('assets', id); await borrarDe('versiones', id);
}
export async function purgarPapelera() {
  const lim = Date.now() - PAPELERA_DIAS * 86400000;
  for (const t of await listar(true)) if (t.borrado < lim) await eliminar(t.id);
}
export async function vaciarPapelera() { for (const t of await listar(true)) await eliminar(t.id); }
export async function duplicar(id, nuevoId, titulo) {
  const d = await cargar(id); if (!d) return null;
  const m = await crear(nuevoId, titulo);
  await put('log', { tab: nuevoId, ops: d.ops });
  for (const [aid, data] of Object.entries(d.assets)) await guardarAsset(nuevoId, aid, data);
  return actualizarMeta(nuevoId, { mini: d.meta.mini, n: d.meta.n, paginas: d.meta.paginas });
}

// ---- versiones ----
export async function guardarVersion(tab, ops, etiqueta, max = 30) {
  await put('versiones', { tab, ts: Date.now(), etiqueta: etiqueta || '', n: ops.length, ops });
  const vs = (await todos('versiones', tab)).sort((a, b) => a._k - b._k);
  if (vs.length > max) await borrarDe('versiones', tab, new Set(vs.slice(0, vs.length - max).map(v => v._k)));
}
export async function versiones(tab) { return (await todos('versiones', tab)).sort((a, b) => b.ts - a.ts).map(v => ({ k: v._k, ts: v.ts, etiqueta: v.etiqueta, n: v.n })); }
export async function leerVersion(tab, k) { const v = (await todos('versiones', tab)).find(x => x._k === k); return v ? v.ops : null; }
export async function estimar() { try { const e = await navigator.storage.estimate(); return e; } catch (e) { return null; } }
