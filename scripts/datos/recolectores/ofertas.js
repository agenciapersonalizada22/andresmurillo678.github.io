'use strict';
const { parsearFeed, parsearSitemap } = require('../lib/feed');
const { ofertasDeHtml } = require('../lib/jsonld');
const { analizarTexto, buscarPrecioAntes, extraerPrecios, categorizar, claveProducto, descuentoPct } = require('../lib/precios');
const { GestorRobots } = require('../lib/robots');
const { esBloqueado } = require('../lib/bloqueo');
const { hash, recortar, normalizarUrl, dominio, redondear, mensajeError } = require('../lib/util');

const REDIRECTORES = /(slickdeals|dealnews|reddit|chollometro|promodescuentos|dealabs|pepper|9to5toys|feedburner|bit\.ly|ow\.ly)/i;
const BRAVE = 'https://api.search.brave.com/res/v1/web/search';

function ofertaDeFeedItem(it, src, { ahora, minPrecio = 0.01 }) {
  const opts = { moneda: src.moneda || 'USD', ahora, idioma: src.idioma || 'en' };
  const desc = (it.descripcion || '').slice(0, 300);
  let a = analizarTexto(it.titulo, desc, opts);
  const pm = it.ns && it.ns['pepper:merchant'];
  let tienda = pm && pm.attrs && pm.attrs.name ? pm.attrs.name : null;
  if (a.precio === null && pm && pm.attrs && pm.attrs.price) {
    const p = extraerPrecios(pm.attrs.price, src.moneda || 'USD')[0];
    if (p) {
      const antes = buscarPrecioAntes(desc, p.moneda, p.valor);
      a = { ...a, precio: p.valor, moneda: p.moneda, precioAntes: antes ? antes.valor : null, descuentoPct: a.descuentoPct ?? (antes ? descuentoPct(antes.valor, p.valor) : null) };
    }
  }
  if (a.precio === null) {
    const b = analizarTexto(desc, '', opts);
    if (b.precio !== null) a = { ...a, precio: b.precio, precioAntes: a.precioAntes ?? b.precioAntes, moneda: b.moneda, descuentoPct: a.descuentoPct ?? b.descuentoPct };
  }
  if (a.precio === null || a.precio < minPrecio || a.precio > 1e6) return null;
  const host = dominio(it.enlace);
  tienda = tienda || a.tienda || (host && !REDIRECTORES.test(host) ? host : null) || src.nombre;
  const clave = claveProducto(it.titulo, tienda);
  const pct = a.descuentoPct ?? (a.precioAntes ? descuentoPct(a.precioAntes, a.precio) : null);
  return {
    clave, id: clave, titulo: recortar(it.titulo, 200), tienda: recortar(tienda, 60), precio: a.precio, precioAntes: a.precioAntes ?? null,
    descuentoPct: pct ?? null, moneda: a.moneda, url: normalizarUrl(it.enlace), imagen: it.imagen || null,
    categoria: src.categoria && src.categoria !== 'otros' ? src.categoria : categorizar(`${it.titulo} ${desc}`),
    fecha: it.fecha || ahora.toISOString(), fuente: src.nombre, cupon: a.cupon || null, vence: a.vence || null
  };
}

function ofertaDeJsonLd(o, src, { ahora, moneda }) {
  const host = dominio(o.url);
  const tienda = src.tienda || host || src.nombre;
  const clave = claveProducto(o.titulo, host || tienda);
  return {
    clave, id: clave, titulo: recortar(o.titulo, 200), tienda, precio: o.precio, precioAntes: o.precioAntes, descuentoPct: o.descuentoPct,
    moneda: o.moneda || src.moneda || moneda, url: normalizarUrl(o.url), imagen: o.imagen || null,
    categoria: src.categoria && src.categoria !== 'otros' ? src.categoria : categorizar(o.titulo),
    fecha: ahora.toISOString(), fuente: src.nombre, cupon: null, vence: o.vence || null
  };
}

function fusionarOfertas(nuevas, previas, { maxItems, maxDias, ahora }) {
  const limite = ahora.getTime() - maxDias * 86400000;
  const m = new Map();
  for (const p of previas) m.set(p.id, p);
  for (const n of nuevas) {
    const p = m.get(n.id);
    if (!p) { m.set(n.id, n); continue; }
    const mejor = Date.parse(n.fecha) >= Date.parse(p.fecha) ? n : p;
    const otro = mejor === n ? p : n;
    m.set(n.id, { ...mejor, cupon: mejor.cupon || otro.cupon, imagen: mejor.imagen || otro.imagen, vence: mejor.vence || otro.vence });
  }
  const urls = new Set();
  return [...m.values()]
    .filter((o) => Date.parse(o.fecha) >= limite && (!o.vence || Date.parse(o.vence) >= ahora.getTime()))
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
    .filter((o) => (urls.has(o.url) ? false : (urls.add(o.url), true)))
    .slice(0, maxItems);
}

function actualizarHistorial(hist, vistos, { ahora, historialDias, maxPuntos }) {
  const t = ahora.getTime();
  const out = {};
  for (const [k, pts] of Object.entries(hist || {})) if (pts.length && t - pts[pts.length - 1][0] <= historialDias * 86400000) out[k] = pts.slice();
  for (const [k, precio] of vistos) {
    const pts = out[k] || (out[k] = []);
    const ult = pts[pts.length - 1];
    if (!ult || ult[1] !== precio || t - ult[0] >= 86400000) pts.push([t, precio]);
    if (pts.length > maxPuntos) pts.splice(0, pts.length - maxPuntos);
  }
  return out;
}

class Paginas {
  constructor(ctx) {
    this.ctx = ctx;
    this.cfg = ctx.config.ofertas;
    this.robots = new GestorRobots({ http: ctx.http, agente: ctx.http.ua, respetar: this.cfg.respetarRobots });
    this.restan = this.cfg.maxPaginasPorEjecucion;
    this.omitidas = {};
  }
  omitir(url, motivo) { (this.omitidas[motivo] = this.omitidas[motivo] || []).push(dominio(url)); }
  async permitida(url) {
    if (esBloqueado(url, this.cfg.bloqueados)) { this.omitir(url, 'dominio_bloqueado'); return false; }
    if (!(await this.robots.permite(url))) { this.omitir(url, 'robots_txt'); return false; }
    return true;
  }
  async leer(url) {
    if (this.restan <= 0) { this.omitir(url, 'tope_paginas'); return null; }
    if (!(await this.permitida(url))) return null;
    this.restan--;
    const retrasoMs = await this.robots.retrasoMs(url);
    const r = await this.ctx.http.pedir(url, { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9', retrasoMs: retrasoMs || undefined, limiteBytes: 3 * 1024 * 1024, reintentos: 1 });
    return r.texto;
  }
}

async function ejecutar(ctx) {
  const c = ctx.config.ofertas;
  const previo = ctx.prev('ofertas/ofertas.json') || { items: [] };
  const histPrev = ctx.prev('ofertas/historial.json') || {};
  const tasas = (ctx.prev('mercados/divisas.json') || {}).tasas || {};
  const paginas = new Paginas(ctx);
  const nuevas = [];
  const vistos = new Map();
  const fallos = {};
  let fuentesOk = 0;
  const registrar = (o, conDescuentoMinimo) => {
    vistos.set(o.clave, o.precio);
    if (conDescuentoMinimo && (o.descuentoPct === null || o.descuentoPct < c.minDescuentoPct)) return;
    nuevas.push(o);
  };
  const usadas = new Set(previo.items.map((i) => i.url));

  for (const src of c.fuentes.filter((f) => f.activo !== false)) {
    try {
      if (src.tipo === 'feed') {
        if (esBloqueado(src.url, c.bloqueados)) { paginas.omitir(src.url, 'dominio_bloqueado'); continue; }
        const r = await ctx.http.pedir(src.url, { accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5', timeoutMs: 20000, reintentos: 2 });
        const feed = parsearFeed(r.texto, { max: 60 });
        for (const it of feed.items) {
          const o = ofertaDeFeedItem(it, src, { ahora: ctx.ahora });
          if (o) registrar(o, false);
        }
      } else {
        let urls = [];
        if (src.tipo === 'jsonld') urls = src.urls || [src.url];
        else {
          const xml = await paginas.leer(src.url);
          if (xml) {
            let sm = parsearSitemap(xml);
            if (sm.indice) {
              const hijos = [];
              for (const h of sm.urls.slice(0, 3)) { const x = await paginas.leer(h.loc); if (x) hijos.push(...parsearSitemap(x).urls); }
              sm = { urls: hijos };
            }
            const re = src.incluye ? new RegExp(src.incluye) : null;
            urls = sm.urls.filter((u) => !re || re.test(u.loc)).sort((a, b) => Date.parse(b.lastmod || 0) - Date.parse(a.lastmod || 0))
              .sort((a, b) => (usadas.has(a.loc) ? 1 : 0) - (usadas.has(b.loc) ? 1 : 0)).slice(0, src.maxUrls || 20).map((u) => u.loc);
          }
        }
        let leidas = 0;
        for (const u of urls) {
          try {
            const html = await paginas.leer(u);
            if (!html) continue;
            leidas++;
            for (const o of ofertasDeHtml(html, u)) registrar(ofertaDeJsonLd(o, src, { ahora: ctx.ahora, moneda: c.moneda }), true);
          } catch (e) { fallos[`${src.id}:${dominio(u)}`] = mensajeError(e); }
        }
        if (urls.length && !leidas && !Object.keys(paginas.omitidas).length) throw new Error('no se pudo leer ninguna pagina');
      }
      fuentesOk++;
    } catch (e) { fallos[src.id] = mensajeError(e); }
  }

  // Busqueda opcional por palabras clave (Brave Search API)
  const b = c.busqueda;
  if (b && b.activo) {
    const key = ctx.env.BRAVE_SEARCH_KEY;
    if (!key) fallos.busqueda = 'sin_clave: falta BRAVE_SEARCH_KEY';
    else {
      let usadasBusq = 0;
      for (const palabra of b.palabras) {
        if (usadasBusq >= b.maxPaginas) break;
        try {
          const r = await ctx.http.json(`${BRAVE}?q=${encodeURIComponent(palabra)}&count=${b.resultadosPorPalabra}&country=${b.pais || 'ES'}`, { headers: { 'X-Subscription-Token': key } });
          const res = (r.web && r.web.results) || [];
          for (const x of res) {
            if (usadasBusq >= b.maxPaginas) break;
            try {
              const html = await paginas.leer(x.url);
              if (!html) continue;
              usadasBusq++;
              for (const o of ofertasDeHtml(html, x.url)) registrar(ofertaDeJsonLd(o, { nombre: `Busqueda: ${palabra}`, categoria: 'otros' }, { ahora: ctx.ahora, moneda: c.moneda }), true);
            } catch (e) { fallos[`busqueda:${dominio(x.url)}`] = mensajeError(e); }
          }
        } catch (e) { fallos[`busqueda:${palabra}`] = mensajeError(e); }
      }
    }
  }

  const activas = c.fuentes.filter((f) => f.activo !== false).length;
  if (activas && !fuentesOk && !previo.items.length) throw new Error('ninguna fuente de ofertas respondio: ' + Object.values(fallos).slice(0, 3).join(' | '));
  if (activas && !fuentesOk) throw new Error('ninguna fuente de ofertas respondio (se conservan los datos anteriores): ' + Object.values(fallos).slice(0, 3).join(' | '));

  let items = fusionarOfertas(nuevas, previo.items, { maxItems: c.maxItems, maxDias: c.maxDias, ahora: ctx.ahora });
  items = items.map((o) => {
    const { clave, ...r } = o;
    const tasa = o.moneda === 'USD' ? 1 : tasas[o.moneda];
    const x = r;
    if (tasa) x.precioUsd = redondear(o.precio / tasa, 2);
    return x;
  });
  const historial = actualizarHistorial(histPrev, vistos, { ahora: ctx.ahora, historialDias: c.historialDias, maxPuntos: c.maxPuntosHistorial });
  const detalle = { fuentesOk, fuentesFallidas: Object.keys(fallos).length, paginasLeidas: c.maxPaginasPorEjecucion - paginas.restan };
  if (Object.keys(fallos).length) detalle.fallos = fallos;
  if (Object.keys(paginas.omitidas).length) detalle.omitidas = paginas.omitidas;
  return {
    items: items.length,
    archivos: {
      'ofertas/ofertas.json': { generado: ctx.ahora.toISOString(), fuente: `Feeds y paginas publicas (${fuentesOk}/${activas} fuentes)`, items },
      'ofertas/historial.json': historial
    },
    detalle
  };
}

module.exports = { ofertaDeFeedItem, ofertaDeJsonLd, fusionarOfertas, actualizarHistorial, Paginas, tareas: [{ id: 'ofertas', grupo: 'lentos', activo: (c) => c.ofertas.activo, ejecutar }] };
