// Estado de la ciudad y acciones del jugador (sin Three.js).
import { N, P, NP, CENTRO, generarMapa, esConstruible } from './mapa.js';
import { ITEM, ITEMS, NIVELES, TECH } from './datos.js';
import { limitar } from './util.js';

export { N, P, NP };
export const idx = (x, y) => y * N + x;
export const dentro = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
export const parcelaDe = (x, y) => Math.floor(y / P) * NP + Math.floor(x / P);

export function azar(c) {
  let t = (c.rs = (c.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function xpNecesaria(l) { return Math.round(80 * Math.pow(l, 1.45)); }

export function nuevaCiudad(semilla, nombre) {
  const m = generarMapa(semilla);
  const c = {
    v: 1, nombre: nombre || 'Mi ciudad', semilla: semilla >>> 0, rs: (semilla ^ 0x9E3779B9) | 0,
    terr: m.terr, arbol: m.arbol, arbol0: m.arbol.slice(),
    parc: new Uint8Array(NP * NP),
    cB: new Int32Array(N * N).fill(-1), via: new Uint8Array(N * N),
    edif: new Map(), sigId: 1,
    dinero: 6000, xp: 0, nivelA: 1, puntos: 1, tech: {}, tier: 0,
    misDone: 0, logros: {}, cont: { incendios: 0, festivales: 0, apagones: 0 },
    impuesto: 10, t: { hora: 8, dia: 1, tickDia: 0 },
    evt: { apagon: 0, festival: 0, boom: 0, boomTipo: 0, pend: [] },
    hist: [], neto: 0, ingresoDia: 0, gastoDia: 0,
    diaria: { ultimo: 0, racha: 0 }, ult: 0, undo: [], fx: [], notas: [],
    sucio: true, r: null, s: null, dem: { R: 0.5, C: 0.3, I: 0.3 }, jr: null,
  };
  for (const [px, py] of [[3, 3], [4, 3], [3, 4], [4, 4]]) c.parc[py * NP + px] = 1;
  // ayuntamiento
  for (let y = CENTRO - 1; y <= CENTRO + 2; y++) for (let x = CENTRO - 1; x <= CENTRO + 2; x++) { c.arbol[idx(x, y)] = 0; c.arbol0[idx(x, y)] = 0; }
  crearEdif(c, 'ayuntamiento', CENTRO, CENTRO, 1);
  return c;
}

export function itemDe(b) { return ITEM[b.t]; }

export function crearEdif(c, itemId, x, y, n, id) {
  const it = ITEM[itemId];
  const b = { id: id || c.sigId++, t: itemId, x, y, n: n == null ? 0 : n, pop: 0, edad: 0, fuego: 0, sinS: 0 };
  if (b.id >= c.sigId) c.sigId = b.id + 1;
  for (let yy = y; yy < y + it.h; yy++) for (let xx = x; xx < x + it.w; xx++) c.cB[idx(xx, yy)] = b.id;
  c.edif.set(b.id, b);
  c.sucio = true;
  return b;
}

export function quitarEdif(c, b) {
  const it = ITEM[b.t];
  for (let yy = b.y; yy < b.y + it.h; yy++) for (let xx = b.x; xx < b.x + it.w; xx++) {
    if (c.cB[idx(xx, yy)] === b.id) c.cB[idx(xx, yy)] = -1;
  }
  c.edif.delete(b.id);
  c.sucio = true;
}

export function edifEn(c, x, y) {
  if (!dentro(x, y)) return null;
  const id = c.cB[idx(x, y)];
  return id < 0 ? null : c.edif.get(id) || null;
}

export function ayuntamiento(c) {
  for (const b of c.edif.values()) if (b.t === 'ayuntamiento') return b;
  return null;
}

export function esMia(c, x, y) { return dentro(x, y) && c.parc[parcelaDe(x, y)] === 1; }

export function disponibilidad(c, it) {
  if (it.cat === 'ninguna') return { ok: false, razon: '' };
  if (c.tier < it.nivel) return { ok: false, razon: 'Requiere ' + NIVELES[it.nivel].nombre };
  if (it.tech && !c.tech[it.tech]) return { ok: false, razon: 'Investiga ' + TECH[it.tech].nombre };
  return { ok: true, razon: '' };
}

export function precioParcela(c) {
  let k = -4;
  for (let i = 0; i < c.parc.length; i++) if (c.parc[i]) k++;
  let p = Math.round(800 * Math.pow(1 + 0.35 * k, 1.5) / 10) * 10;
  if (c.tech.planificacion) p = Math.round(p * 0.8 / 10) * 10;
  return p;
}

export function parcelaComprable(c, px, py) {
  if (px < 0 || py < 0 || px >= NP || py >= NP || c.parc[py * NP + px]) return false;
  const v = (a, b) => a >= 0 && b >= 0 && a < NP && b < NP && c.parc[b * NP + a] === 1;
  if (!(v(px - 1, py) || v(px + 1, py) || v(px, py - 1) || v(px, py + 1))) return false;
  let tierra = 0;
  for (let y = py * P; y < py * P + P; y++) for (let x = px * P; x < px * P + P; x++) if (esConstruible(c.terr, x, y)) tierra++;
  return tierra >= 8;
}

export function notar(c, m, t = 'info', x, y) { c.notas.push({ m, t, x, y }); if (c.notas.length > 40) c.notas.shift(); }
export function fx(c, o) { c.fx.push(o); if (c.fx.length > 200) c.fx.shift(); }

export function darXp(c, n, enJr) {
  if (enJr && c.jr) c.jr.xp += n;
  c.xp += n;
  let sube = false;
  while (c.xp >= xpNecesaria(c.nivelA)) {
    c.xp -= xpNecesaria(c.nivelA);
    c.nivelA++;
    c.dinero += 200 * c.nivelA;
    c.puntos += 1;
    sube = true;
    notar(c, 'Alcalde nivel ' + c.nivelA + ': +$' + 200 * c.nivelA + ' y 1 punto de mejora', 'ok');
  }
  if (sube) fx(c, { k: 'nivelA', v: c.nivelA });
}

// ---------------------------------------------------------------- diario de cambios (deshacer)
function abrir(c) { c.jr = { dinero: 0, xp: 0, nuevos: [], borrados: [], vias: [], arb: [], parc: null, nombre: '' }; }
function cerrar(c, nombre) {
  const j = c.jr; c.jr = null;
  if (!j) return;
  const hubo = j.nuevos.length || j.borrados.length || j.vias.length || j.parc != null;
  if (!hubo) return;
  j.nombre = nombre;
  c.undo.push(j);
  if (c.undo.length > 12) c.undo.shift();
}
function gastar(c, n) { c.dinero -= n; if (c.jr) c.jr.dinero += n; }
function setVia(c, i, v) { if (c.jr) c.jr.vias.push([i, c.via[i]]); c.via[i] = v; c.sucio = true; }
function limpiarArbol(c, i) { if (c.arbol[i]) { if (c.jr) c.jr.arb.push([i, c.arbol[i]]); c.arbol[i] = 0; } }

export function deshacer(c) {
  const j = c.undo.pop();
  if (!j) return { ok: false, razon: 'Nada que deshacer' };
  for (const id of j.nuevos) { const b = c.edif.get(id); if (b) quitarEdif(c, b); }
  for (const b of j.borrados) {
    const it = ITEM[b.t];
    for (let yy = b.y; yy < b.y + it.h; yy++) for (let xx = b.x; xx < b.x + it.w; xx++) c.cB[idx(xx, yy)] = b.id;
    c.edif.set(b.id, b);
  }
  for (let k = j.vias.length - 1; k >= 0; k--) c.via[j.vias[k][0]] = j.vias[k][1];
  for (const [i, v] of j.arb) c.arbol[i] = v;
  if (j.parc != null) c.parc[j.parc] = 0;
  c.dinero += j.dinero;
  c.xp = Math.max(0, c.xp - j.xp);
  c.sucio = true;
  fx(c, { k: 'sonido', n: 'deshacer' });
  return { ok: true, nombre: j.nombre };
}

// ---------------------------------------------------------------- evaluación (vista previa) y acciones
function ocupada(c, x, y) {
  const b = edifEn(c, x, y);
  return b && !(ITEM[b.t].tipo === 'zona' && b.n === 0) ? b : null;
}

export function evaluarVia(c, celdas, tipoId) {
  const it = ITEM[tipoId], nuevo = tipoId === 'avenida' ? 2 : 1;
  const out = []; let costo = 0, validas = 0;
  for (const [x, y] of celdas) {
    let ok = esMia(c, x, y) && esConstruible(c.terr, x, y) && !ocupada(c, x, y);
    let cobra = 0;
    if (ok) {
      const v = c.via[idx(x, y)];
      if (v >= nuevo) ok = true, cobra = 0;
      else cobra = v === 0 ? it.costo : it.costo - ITEM.calle.costo;
    }
    out.push({ x, y, ok, nada: ok && cobra === 0 });
    if (ok && cobra) { costo += cobra; validas++; }
  }
  return { celdas: out, costo, n: validas };
}

export function trazarVia(c, celdas, tipoId) {
  const it = ITEM[tipoId], d = disponibilidad(c, it);
  if (!d.ok) return { ok: false, razon: d.razon };
  const ev = evaluarVia(c, celdas, tipoId);
  if (ev.n === 0) return { ok: false, razon: 'No se puede construir ahí' };
  if (c.dinero < ev.costo) return { ok: false, razon: 'Dinero insuficiente' };
  abrir(c);
  const nuevo = tipoId === 'avenida' ? 2 : 1;
  for (const e of ev.celdas) {
    if (!e.ok || e.nada) continue;
    const i = idx(e.x, e.y);
    const lote = edifEn(c, e.x, e.y);
    if (lote) { c.jr.borrados.push(lote); quitarEdif(c, lote); }
    limpiarArbol(c, i);
    setVia(c, i, nuevo);
  }
  gastar(c, ev.costo);
  darXp(c, Math.min(10, 1 + Math.floor(ev.n / 6)), true);
  fx(c, { k: 'via', celdas: ev.celdas.filter((e) => e.ok && !e.nada) });
  fx(c, { k: 'dinero', x: ev.celdas[0].x + 0.5, y: ev.celdas[0].y + 0.5, v: -ev.costo });
  fx(c, { k: 'sonido', n: 'via' });
  cerrar(c, 'Vía');
  return { ok: true, n: ev.n, costo: ev.costo };
}

export function evaluarZona(c, celdas, zid) {
  const it = ITEM[zid]; const out = []; let costo = 0, n = 0;
  for (const [x, y] of celdas) {
    let ok = esMia(c, x, y) && esConstruible(c.terr, x, y) && !c.via[idx(x, y)];
    let nada = false;
    if (ok) {
      const b = edifEn(c, x, y);
      if (b) {
        if (ITEM[b.t].tipo !== 'zona') ok = false;
        else if (b.t === zid) nada = true;
        else if (b.n > 0) ok = false;
      }
    }
    out.push({ x, y, ok, nada });
    if (ok && !nada) { costo += it.costo; n++; }
  }
  return { celdas: out, costo, n };
}

export function zonificar(c, celdas, zid) {
  const it = ITEM[zid], d = disponibilidad(c, it);
  if (!d.ok) return { ok: false, razon: d.razon };
  const ev = evaluarZona(c, celdas, zid);
  if (ev.n === 0) return { ok: false, razon: 'No se puede zonificar ahí' };
  if (c.dinero < ev.costo) return { ok: false, razon: 'Dinero insuficiente' };
  abrir(c);
  for (const e of ev.celdas) {
    if (!e.ok || e.nada) continue;
    const prev = edifEn(c, e.x, e.y);
    if (prev) { c.jr.borrados.push(prev); quitarEdif(c, prev); }
    limpiarArbol(c, idx(e.x, e.y));
    c.jr.nuevos.push(crearEdif(c, zid, e.x, e.y, 0).id);
  }
  gastar(c, ev.costo);
  darXp(c, Math.min(8, 1 + Math.floor(ev.n / 8)), true);
  fx(c, { k: 'zona', celdas: ev.celdas.filter((e) => e.ok && !e.nada) });
  fx(c, { k: 'dinero', x: ev.celdas[0].x + 0.5, y: ev.celdas[0].y + 0.5, v: -ev.costo });
  fx(c, { k: 'sonido', n: 'zona' });
  cerrar(c, 'Zona');
  return { ok: true, n: ev.n, costo: ev.costo };
}

export function evaluarEdificio(c, it, x, y) {
  const celdas = [];
  let ok = true, razon = '';
  const d = disponibilidad(c, it);
  if (!d.ok) { ok = false; razon = d.razon; }
  for (let yy = y; yy < y + it.h; yy++) for (let xx = x; xx < x + it.w; xx++) {
    let bien = true;
    if (!dentro(xx, yy)) bien = false;
    else if (!esMia(c, xx, yy)) { bien = false; if (!razon) razon = 'Fuera de tu terreno'; }
    else if (!esConstruible(c.terr, xx, yy)) { bien = false; if (!razon) razon = 'Terreno no apto'; }
    else if (c.via[idx(xx, yy)]) { bien = false; if (!razon) razon = 'Hay una calle'; }
    else if (ocupada(c, xx, yy)) { bien = false; if (!razon) razon = 'Casilla ocupada'; }
    if (!bien) ok = false;
    celdas.push({ x: xx, y: yy, ok: bien });
  }
  if (ok && c.dinero < it.costo) { ok = false; razon = 'Dinero insuficiente'; }
  return { ok, razon, celdas, costo: it.costo };
}

export function construir(c, itemId, x, y) {
  const it = ITEM[itemId];
  const ev = evaluarEdificio(c, it, x, y);
  if (!ev.ok) return { ok: false, razon: ev.razon || 'No se puede construir ahí' };
  abrir(c);
  for (const e of ev.celdas) {
    const lote = edifEn(c, e.x, e.y);
    if (lote) { c.jr.borrados.push(lote); quitarEdif(c, lote); }
    limpiarArbol(c, idx(e.x, e.y));
  }
  const b = crearEdif(c, itemId, x, y, it.mej ? 1 : 0);
  c.jr.nuevos.push(b.id);
  gastar(c, it.costo);
  darXp(c, Math.min(40, 2 + Math.floor(it.costo / 250)), true);
  fx(c, { k: 'construido', x, y, w: it.w, h: it.h, id: b.id, t: itemId });
  fx(c, { k: 'dinero', x: x + it.w / 2, y: y + it.h / 2, v: -it.costo });
  fx(c, { k: 'sonido', n: it.serv === 'monumento' ? 'monumento' : 'construir' });
  cerrar(c, it.nombre);
  return { ok: true, id: b.id };
}

export function demoler(c, celdas) {
  const vistos = new Set(); let n = 0, refund = 0;
  abrir(c);
  for (const [x, y] of celdas) {
    if (!dentro(x, y) || !esMia(c, x, y)) continue;
    const i = idx(x, y);
    const b = edifEn(c, x, y);
    if (b && !vistos.has(b.id)) {
      if (b.t === 'ayuntamiento') { notar(c, 'No puedes demoler el Ayuntamiento', 'mal'); continue; }
      vistos.add(b.id);
      const it = ITEM[b.t];
      if (it.tipo !== 'zona') refund += Math.round(it.costo * 0.25);
      c.jr.borrados.push(b);
      quitarEdif(c, b);
      fx(c, { k: 'derribo', x: b.x, y: b.y, w: it.w, h: it.h, t: b.t });
      n++;
    } else if (!b && c.via[i]) {
      setVia(c, i, 0); n++;
      fx(c, { k: 'derribo', x, y, w: 1, h: 1, t: 'via' });
    }
  }
  if (!n) { c.jr = null; return { ok: false, razon: 'No hay nada que demoler' }; }
  gastar(c, -refund);
  if (refund) fx(c, { k: 'dinero', x: celdas[0][0] + 0.5, y: celdas[0][1] + 0.5, v: refund });
  fx(c, { k: 'sonido', n: 'derribo' });
  cerrar(c, 'Demolición');
  return { ok: true, n, refund };
}

export function comprarParcela(c, px, py) {
  if (!parcelaComprable(c, px, py)) return { ok: false, razon: 'Elige una parcela vecina a tu terreno' };
  const p = precioParcela(c);
  if (c.dinero < p) return { ok: false, razon: 'Dinero insuficiente' };
  abrir(c);
  c.parc[py * NP + px] = 1;
  c.jr.parc = py * NP + px;
  gastar(c, p);
  darXp(c, 15, true);
  fx(c, { k: 'parcela', px, py });
  fx(c, { k: 'sonido', n: 'parcela' });
  c.sucio = true;
  cerrar(c, 'Parcela');
  return { ok: true, costo: p };
}

export function costoMejora(c, b) {
  const it = ITEM[b.t];
  if (!it.mej) return 0;
  return it.id === 'ayuntamiento' ? 4000 * b.n : Math.round(it.costo * 0.7 * b.n);
}

export function puedeMejorar(c, b) {
  const it = ITEM[b.t];
  if (!it.mej) return { ok: false, razon: 'No mejorable' };
  if (b.n >= 3) return { ok: false, razon: 'Nivel máximo' };
  if (c.tier < b.n) return { ok: false, razon: 'Requiere ' + NIVELES[b.n].nombre };
  const cs = costoMejora(c, b);
  if (c.dinero < cs) return { ok: false, razon: 'Dinero insuficiente', costo: cs };
  return { ok: true, costo: cs };
}

export function mejorar(c, id) {
  const b = c.edif.get(id);
  if (!b) return { ok: false, razon: 'No existe' };
  const p = puedeMejorar(c, b);
  if (!p.ok) return p;
  c.dinero -= p.costo; b.n++;
  c.sucio = true;
  darXp(c, 10 + b.n * 10);
  fx(c, { k: 'mejora', x: b.x, y: b.y, w: ITEM[b.t].w, h: ITEM[b.t].h, id });
  fx(c, { k: 'sonido', n: 'nivel' });
  c.undo.length = 0;
  return { ok: true, costo: p.costo };
}

export function fijarImpuesto(c, v) { c.impuesto = limitar(Math.round(v), 5, 20); }

export function conteo(c) {
  let n = 0;
  for (let i = 0; i < c.parc.length; i++) n += c.parc[i];
  return n;
}
export { ITEMS };
