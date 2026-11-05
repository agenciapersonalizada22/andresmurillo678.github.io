'use strict';
const { parsearFeed } = require('../lib/feed');
const { hash, recortar, normalizarUrl, sinAcentos, dominio, fechaISO } = require('../lib/util');
const { sentimiento } = require('../lib/sentimiento');
const { extraerTickers, construir } = require('../lib/tickers');

const claveTitulo = (t) => sinAcentos(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Convierte un feed ya parseado en noticias. Solo conserva titular, resumen corto y enlace.
function noticiasDeFeed(feed, fuenteCfg, { ahora = new Date(), resumenMax = 220, porFuente = 15, indiceTickers } = {}) {
  const out = [];
  for (const it of feed.items) {
    if (out.length >= porFuente) break;
    const enlace = normalizarUrl(it.enlace);
    if (!/^https?:\/\//i.test(enlace) || !it.titulo) continue;
    const titulo = recortar(it.titulo, 200);
    let resumen = it.descripcion || '';
    if (claveTitulo(resumen).startsWith(claveTitulo(titulo)) && resumen.length < titulo.length + 20) resumen = '';
    resumen = recortar(resumen, resumenMax);
    let t = it.fecha ? Date.parse(it.fecha) : NaN;
    if (!Number.isFinite(t)) t = ahora.getTime();
    if (t > ahora.getTime()) t = ahora.getTime();
    out.push({
      id: hash(enlace), titulo, resumen, enlace, fuente: fuenteCfg.nombre, fecha: new Date(t).toISOString(), categoria: fuenteCfg.categoria,
      tickers: extraerTickers(`${titulo} ${resumen}`, { indice: indiceTickers }), sentimiento: sentimiento(`${titulo}. ${resumen}`),
      _fechaReal: !!it.fecha
    });
  }
  return out;
}

function fusionar(nuevas, previas, { maxItems, maxDias, ahora }) {
  const limite = ahora.getTime() - maxDias * 86400000;
  const porId = new Map();
  for (const p of previas) porId.set(p.id, p);
  for (const n of nuevas) {
    const p = porId.get(n.id);
    if (p && !n._fechaReal) n.fecha = p.fecha; // conserva la primera vez que se vio si el feed no trae fecha
    porId.set(n.id, n);
  }
  const vistosTitulo = new Set();
  const lista = [...porId.values()].filter((n) => Date.parse(n.fecha) >= limite).sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
  const out = [];
  for (const n of lista) {
    const k = claveTitulo(n.titulo);
    if (k && vistosTitulo.has(k)) continue;
    vistosTitulo.add(k);
    const { _fechaReal, ...limpio } = n;
    out.push(limpio);
  }
  return out.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha)).slice(0, maxItems);
}

async function ejecutar(ctx) {
  const c = ctx.config.noticias;
  const fuentes = c.fuentes.filter((f) => f.activo !== false);
  const indice = construir(c.tickersExtra);
  const previo = ctx.prev('mercados/noticias.json') || { items: [] };
  const nuevas = [];
  const fallos = {};
  let ok = 0;
  const lote = 4;
  for (let i = 0; i < fuentes.length; i += lote) {
    await Promise.all(fuentes.slice(i, i + lote).map(async (f) => {
      try {
        const r = await ctx.http.pedir(f.url, { accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5', timeoutMs: 20000, reintentos: 2 });
        const feed = parsearFeed(r.texto, { max: c.porFuente * 3 });
        const ns = noticiasDeFeed(feed, f, { ahora: ctx.ahora, resumenMax: c.resumenMax, porFuente: c.porFuente, indiceTickers: indice });
        nuevas.push(...ns);
        ok++;
      } catch (e) { fallos[f.id] = e.message.slice(0, 160); }
    }));
  }
  if (!ok) throw new Error(`ninguna de las ${fuentes.length} fuentes RSS respondio`);
  const items = fusionar(nuevas, previo.items, { maxItems: c.maxItems, maxDias: c.maxDias, ahora: ctx.ahora });
  return {
    items: items.length,
    archivos: { 'mercados/noticias.json': { generado: ctx.ahora.toISOString(), fuente: `RSS/Atom (${ok}/${fuentes.length} fuentes)`, items } },
    detalle: { fuentesOk: ok, fuentesFallidas: Object.keys(fallos).length, fallos: Object.keys(fallos).length ? fallos : undefined }
  };
}

module.exports = { noticiasDeFeed, fusionar, claveTitulo, tareas: [{ id: 'noticias', grupo: 'lentos', activo: (c) => c.noticias.activo, ejecutar }] };
