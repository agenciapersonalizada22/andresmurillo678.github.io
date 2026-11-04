// =============================================================
//  🧰  INVENTARIO
//  36 ranuras (las 9 primeras son la barra de abajo) y 4 de armadura.
//  Cada ranura es { id, n, d }: qué es (bloque u objeto), cuántos y,
//  si es una herramienta, cuánto se ha gastado. También sirve como
//  "mochila" para los vehículos (cuenta / quita bidones por su clave).
// =============================================================
import { esObjeto, objetoPorId, idInventario, pilaMaxima, resolverId, clavePara, POR_CLAVE_OBJ } from './objetos.js';
import { esValido } from './bloques.js';

export const NUM_RANURAS = 36;

export class Inventario {
  constructor() {
    this.ranuras = new Array(NUM_RANURAS).fill(null);
    this.armadura = [null, null, null, null];   // casco, peto, pantalones, botas
  }

  vaciar() {
    this.ranuras.fill(null);
    this.armadura = [null, null, null, null];
  }

  // Mete n unidades. Devuelve las que no cupieron.
  agregar(id, n = 1, durabilidad = 0) {
    id = resolverId(id);
    if (!id) return n;
    if (!esObjeto(id)) id = idInventario(id);
    const max = pilaMaxima(id);
    if (max > 1) {
      for (const r of this.ranuras) {
        if (r && r.id === id && r.n < max) {
          const m = Math.min(max - r.n, n);
          r.n += m; n -= m;
          if (!n) return 0;
        }
      }
    }
    for (let i = 0; i < NUM_RANURAS && n > 0; i++) {
      if (this.ranuras[i]) continue;
      const m = Math.min(max, n);
      this.ranuras[i] = { id, n: m, d: durabilidad };
      n -= m;
    }
    return n;
  }

  cuenta(x) {
    const id = resolverId(x);
    let t = 0;
    for (const r of this.ranuras) if (r && r.id === id) t += r.n;
    return t;
  }

  // Cuenta varios ids a la vez (para recetas con grupos)
  cuentaDe(ids) {
    let t = 0;
    for (const r of this.ranuras) if (r && ids.includes(r.id)) t += r.n;
    return t;
  }

  quitar(x, n = 1) {
    const id = resolverId(x);
    if (this.cuenta(id) < n) return false;
    for (let i = NUM_RANURAS - 1; i >= 0 && n > 0; i--) {
      const r = this.ranuras[i];
      if (!r || r.id !== id) continue;
      const m = Math.min(r.n, n);
      r.n -= m; n -= m;
      if (r.n <= 0) this.ranuras[i] = null;
    }
    return true;
  }

  // Quita n de entre varios ids posibles (el primero que haya)
  quitarDe(ids, n) {
    if (this.cuentaDe(ids) < n) return false;
    for (const id of ids) {
      const t = Math.min(this.cuenta(id), n);
      if (t) { this.quitar(id, t); n -= t; }
      if (!n) break;
    }
    return true;
  }

  cabe(id, n = 1) {
    id = resolverId(id);
    if (!esObjeto(id)) id = idInventario(id);
    const max = pilaMaxima(id);
    let libre = 0;
    for (const r of this.ranuras) {
      if (!r) libre += max;
      else if (r.id === id) libre += max - r.n;
    }
    return libre >= n;
  }

  quitarEn(i, n = 1) {
    const r = this.ranuras[i];
    if (!r) return;
    r.n -= n;
    if (r.n <= 0) this.ranuras[i] = null;
  }

  // Gasta durabilidad de la ranura i; devuelve true si se rompió
  gastar(i, cuanto = 1) {
    const r = typeof i === 'number' ? this.ranuras[i] : i;
    if (!r) return false;
    const o = objetoPorId(r.id);
    if (!o || !o.dur) return false;
    r.d = (r.d || 0) + cuanto;
    if (r.d >= o.dur) {
      if (typeof i === 'number') this.ranuras[i] = null;
      else { const k = this.armadura.indexOf(r); if (k >= 0) this.armadura[k] = null; }
      return true;
    }
    return false;
  }

  // Puntos de armadura (de 0 a 20)
  puntosArmadura() {
    let t = 0;
    for (const a of this.armadura) { const o = a && objetoPorId(a.id); if (o) t += o.defensa; }
    return t;
  }

  // Se pone la pieza de la ranura i; la que llevaba vuelve a la mochila
  equipar(i) {
    const r = this.ranuras[i];
    const o = r && objetoPorId(r.id);
    if (!o || o.tipo !== 'armadura') return false;
    const previa = this.armadura[o.pieza];
    this.armadura[o.pieza] = r;
    this.ranuras[i] = previa || null;
    return true;
  }

  desequipar(pieza) {
    const a = this.armadura[pieza];
    if (!a) return false;
    const i = this.ranuras.findIndex((r) => !r);
    if (i < 0) return false;
    this.ranuras[i] = a;
    this.armadura[pieza] = null;
    return true;
  }

  // ---- guardado: bloques como número, objetos como clave de texto
  exportar() {
    const f = (r) => (r ? [clavePara(r.id), r.n, r.d || 0] : 0);
    return { r: this.ranuras.map(f), a: this.armadura.map(f) };
  }

  importar(o) {
    this.vaciar();
    if (!o || typeof o !== 'object') return;
    const g = (e) => {
      if (!Array.isArray(e)) return null;
      const id = resolverId(e[0]);
      if (!id || (!esObjeto(id) && !esValido(id))) return null;
      const n = Math.max(1, Math.min(pilaMaxima(id), e[1] | 0));
      return { id, n, d: Math.max(0, e[2] | 0) };
    };
    if (Array.isArray(o.r)) for (let i = 0; i < NUM_RANURAS; i++) this.ranuras[i] = g(o.r[i]);
    if (Array.isArray(o.a)) for (let i = 0; i < 4; i++) this.armadura[i] = g(o.a[i]);
  }

  // Mochila de las partidas viejas: { bidon: 2, oro: 1… }
  importarMochilaVieja(m) {
    if (!m || typeof m !== 'object') return;
    for (const k of Object.keys(m)) if (POR_CLAVE_OBJ[k] && Number.isFinite(m[k]) && m[k] > 0) this.agregar(k, Math.min(999, m[k] | 0));
  }

  // Resumen { clave: cantidad } de los objetos "de tesoro" (para la lista de abajo a la izquierda)
  resumen() {
    const res = {};
    for (const r of this.ranuras) {
      if (!r || !esObjeto(r.id)) continue;
      const o = objetoPorId(r.id);
      if (o.tipo === 'material' || o.tipo === 'comida') res[o.clave] = (res[o.clave] || 0) + r.n;
    }
    return res;
  }
}

// ---- ranuras sueltas (cofres y hornos) para guardar y cargar
export function ranuraAArr(r) { return r ? [clavePara(r.id), r.n, r.d || 0] : 0; }

export function arrARanura(e) {
  if (!Array.isArray(e)) return null;
  const id = resolverId(e[0]);
  if (!id || (!esObjeto(id) && !esValido(id))) return null;
  return { id, n: Math.max(1, Math.min(pilaMaxima(id), e[1] | 0)), d: Math.max(0, e[2] | 0) };
}

// Mete una pila en una lista de ranuras (cofre). Devuelve lo que no cupo
export function meterEn(lista, id, n, d = 0) {
  const max = pilaMaxima(id);
  if (max > 1) for (const r of lista) if (r && r.id === id && r.n < max) { const m = Math.min(max - r.n, n); r.n += m; n -= m; if (!n) return 0; }
  for (let i = 0; i < lista.length && n > 0; i++) {
    if (lista[i]) continue;
    const m = Math.min(max, n);
    lista[i] = { id, n: m, d };
    n -= m;
  }
  return n;
}
