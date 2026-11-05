// Modelo de datos replicado (CRDT por operaciones): cada propiedad es un registro
// "ultimo escribe gana" con sello (reloj de Lamport, actor). Aplicar operaciones es
// conmutativo, asociativo e idempotente: todas las replicas convergen sin importar el orden.
// Operacion: { k: 'o'|'p'|'l'|'m', id, p: {campo: valor}, c: reloj, a: actor }
//   o = objetos del lienzo, p = paginas, l = capas, m = metadatos (titulo, temporizador).
export const KINDS = ['m', 'l', 'p', 'o'];
const ESTRUCT = { tipo: 1, pg: 1, z: 1, cap: 1, del: 1, ord: 1 };

export function nuevoId(n = 8) {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = null, s = '';
  try { if (typeof crypto !== 'undefined' && crypto.getRandomValues) r = crypto.getRandomValues(new Uint8Array(n)); } catch (e) {}
  for (let i = 0; i < n; i++) s += a[(r ? r[i] : (Math.random() * 256) | 0) % 36];
  return s;
}
export const cmp = (c1, a1, c2, a2) => (c1 !== c2 ? c1 - c2 : a1 < a2 ? -1 : a1 > a2 ? 1 : 0);

// Quita campos que otra operacion posterior (de la misma lista) ya sobrescribe.
export function compactarOps(ops) {
  const vistos = new Set(), res = [];
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i], p = {};
    let n = 0;
    for (const f in op.p) {
      const key = op.k + '|' + op.id + '|' + f;
      if (vistos.has(key)) continue;
      vistos.add(key); p[f] = op.p[f]; n++;
    }
    if (n) res.push({ k: op.k, id: op.id, p, c: op.c, a: op.a });
  }
  return res.reverse();
}

export class Doc {
  constructor(actor) {
    this.actor = actor || nuevoId(6);
    this.reloj = 0; this.version = 0; this.estructura = 0;
    this.ent = { o: new Map(), p: new Map(), l: new Map(), m: new Map() };
    this.undo = []; this.redo = []; this.grupo = null; this.prof = 0;
    this.oyentes = new Set(); this.alCambiarLocal = null;
    this._lista = new Map(); this._listaEst = -1;
  }
  vaciar() {
    for (const k of KINDS) this.ent[k].clear();
    this.undo.length = 0; this.redo.length = 0; this.grupo = null; this.prof = 0; this.reloj = 0;
    this.estructura++; this.version++;
  }
  on(fn) { this.oyentes.add(fn); return () => this.oyentes.delete(fn); }

  // ----- aplicar (local o remoto) -----
  aplicar(op, local = false) {
    if (op.c > this.reloj) this.reloj = op.c;
    const m = this.ent[op.k]; if (!m || !op.p) return false;
    let e = m.get(op.id), nuevo = false;
    if (!e) { e = { id: op.id, v: {}, s: {}, rev: 0 }; m.set(op.id, e); nuevo = true; }
    let cam = null;
    for (const f in op.p) {
      const st = e.s[f];
      if (st && cmp(op.c, op.a, st[0], st[1]) <= 0) continue;
      e.s[f] = [op.c, op.a]; e.v[f] = op.p[f];
      (cam || (cam = {}))[f] = 1;
      if (ESTRUCT[f]) this.estructura++;
    }
    if (nuevo) this.estructura++;
    if (!cam) return false;
    e.rev++; this.version++;
    for (const fn of this.oyentes) fn(op.k, e, cam, local, nuevo);
    return true;
  }
  aplicarVarias(ops) { let n = 0; for (const op of ops) if (this.aplicar(op)) n++; return n; }

  // ----- cambios locales con historial por usuario -----
  _ejecutar(lista, entrada) {
    const ops = [];
    for (const ch of lista) {
      const e = this.ent[ch.k].get(ch.id);
      const vivo = !!e && (ch.k === 'm' || e.v.del === false);
      const p = {};
      let n = 0;
      for (const f in ch.p) {
        const val = ch.p[f];
        if (e && f in e.v && e.v[f] === val && (val === null || typeof val !== 'object')) continue;
        p[f] = val; n++;
      }
      if (!n) continue;
      if (entrada) {
        const key = ch.k + '|' + ch.id;
        let r = entrada.get(key);
        if (!r) { r = { k: ch.k, id: ch.id, ant: {}, des: {} }; entrada.set(key, r); }
        for (const f in p) {
          if (!(f in r.ant)) {
            if (f === 'del') r.ant.del = vivo ? false : true;
            else if (vivo) r.ant[f] = f in e.v ? e.v[f] : null;
          }
          r.des[f] = p[f];
        }
      }
      const op = { k: ch.k, id: ch.id, p, c: ++this.reloj, a: this.actor };
      this.aplicar(op, true);
      ops.push(op);
    }
    if (ops.length && this.alCambiarLocal) this.alCambiarLocal(ops);
    return ops;
  }
  cambiar(lista, opts = {}) {
    if (opts.sinHistorial) return this._ejecutar(lista, null);
    const entrada = this.grupo || new Map();
    const ops = this._ejecutar(lista, entrada);
    if (!this.grupo && entrada.size) { this.undo.push(entrada); this.redo.length = 0; }
    else if (this.grupo) this.redo.length = 0;
    return ops;
  }
  abrirGrupo() { if (this.prof++ === 0) this.grupo = new Map(); }
  cerrarGrupo() {
    if (this.prof > 0 && --this.prof === 0) { const g = this.grupo; this.grupo = null; if (g.size) { this.undo.push(g); this.redo.length = 0; } }
  }
  agrupar(fn) { this.abrirGrupo(); try { return fn(); } finally { this.cerrarGrupo(); } }
  deshacer() {
    const en = this.undo.pop(); if (!en) return false;
    this._ejecutar([...en.values()].map(x => ({ k: x.k, id: x.id, p: x.ant })), null);
    this.redo.push(en); return true;
  }
  rehacer() {
    const en = this.redo.pop(); if (!en) return false;
    this._ejecutar([...en.values()].map(x => ({ k: x.k, id: x.id, p: x.des })), null);
    this.undo.push(en); return true;
  }

  // ----- consultas -----
  obj(id) { const e = this.ent.o.get(id); return e && e.v.del === false && e.v.tipo ? e : null; }
  paginas() {
    const r = [];
    for (const e of this.ent.p.values()) if (e.v.del === false) r.push(e);
    return r.sort((a, b) => (a.v.ord - b.v.ord) || (a.id < b.id ? -1 : 1));
  }
  capas() {
    const r = [];
    for (const e of this.ent.l.values()) if (e.v.del === false) r.push(e);
    return r.sort((a, b) => (a.v.ord - b.v.ord) || (a.id < b.id ? -1 : 1));
  }
  capaOrden(id) { const e = this.ent.l.get(id); return e && e.v.ord != null ? e.v.ord : 1; }
  capaBloqueada(id) { const e = this.ent.l.get(id || 'c1'); return !!(e && e.v.lock); }
  capaVisible(id) { const e = this.ent.l.get(id || 'c1'); return !(e && e.v.vis === false); }
  // objetos vivos de una pagina en orden de pintado (capa, z, id)
  lista(pg) {
    if (this._listaEst !== this.estructura) { this._lista.clear(); this._listaEst = this.estructura; }
    let r = this._lista.get(pg);
    if (r) return r;
    r = [];
    for (const e of this.ent.o.values()) if (e.v.del === false && e.v.tipo && e.v.pg === pg) r.push(e);
    const co = new Map();
    const ord = id => { id = id || 'c1'; let v = co.get(id); if (v === undefined) { v = this.capaOrden(id); co.set(id, v); } return v; };
    r.sort((a, b) => (ord(a.v.cap) - ord(b.v.cap)) || ((a.v.z || 0) - (b.v.z || 0)) || (a.id < b.id ? -1 : 1));
    this._lista.set(pg, r);
    return r;
  }
  maxZ(pg) { let m = this.reloj; for (const e of this.lista(pg)) if ((e.v.z || 0) > m) m = e.v.z; return m; }
  meta(f) { const e = this.ent.m.get('m'); return e ? e.v[f] : undefined; }
  votos(e) { let n = 0; for (const f in e.v) if (f.charCodeAt(0) === 118 && f.charCodeAt(1) === 58 && e.v[f] > 0) n += e.v[f]; return n; }

  // ----- serializacion -----
  aOps(opts = {}) {
    const out = [];
    for (const k of KINDS) for (const e of this.ent[k].values()) {
      const g = new Map();
      for (const f in e.v) {
        if (opts.soloVivos && e.v.del === true && f !== 'del') continue;
        const s = e.s[f], key = s[0] + '|' + s[1];
        let op = g.get(key);
        if (!op) { op = { k, id: e.id, p: {}, c: s[0], a: s[1] }; g.set(key, op); }
        op.p[f] = e.v[f];
      }
      for (const op of g.values()) out.push(op);
    }
    return out;
  }
  static deOps(ops, actor) { const d = new Doc(actor); d.aplicarVarias(ops); return d; }

  // Cambios locales necesarios para que este documento quede igual que `otro` (restaurar versiones).
  diffHacia(otro) {
    const lista = [];
    for (const k of KINDS) {
      const ids = new Set([...this.ent[k].keys(), ...otro.ent[k].keys()]);
      for (const id of ids) {
        const a = this.ent[k].get(id), b = otro.ent[k].get(id);
        const vivoA = a && (k === 'm' || a.v.del === false), vivoB = b && (k === 'm' || b.v.del === false);
        if (!vivoB) { if (vivoA && k !== 'm') lista.push({ k, id, p: { del: true } }); continue; }
        const p = {};
        for (const f in b.v) if (!a || JSON.stringify(a.v[f]) !== JSON.stringify(b.v[f])) p[f] = b.v[f];
        if (Object.keys(p).length) lista.push({ k, id, p });
      }
    }
    return lista;
  }
  huella() {   // resumen estable del estado para comparar replicas
    const r = [];
    for (const k of KINDS) for (const [id, e] of [...this.ent[k]].sort((x, y) => (x[0] < y[0] ? -1 : 1)))
      r.push(k + id + JSON.stringify(Object.keys(e.v).sort().map(f => [f, e.v[f], e.s[f]])));
    return r.join('\n');
  }
}

// Documento nuevo con una pagina y las capas base.
export function docNuevo(titulo, actor) {
  const d = new Doc(actor);
  d.cambiar([
    { k: 'm', id: 'm', p: { titulo: titulo || 'Tablero sin título', creado: Date.now() } },
    { k: 'p', id: 'p0', p: { ord: 0, del: false, fondo: 'cuadriculado', marco: true } },
    { k: 'l', id: 'c0', p: { nombre: 'Fondo', ord: 0, del: false } },
    { k: 'l', id: 'c1', p: { nombre: 'Contenido', ord: 1, del: false } },
    { k: 'l', id: 'c2', p: { nombre: 'Anotaciones', ord: 2, del: false } }
  ], { sinHistorial: true });
  return d;
}
