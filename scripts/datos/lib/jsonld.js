'use strict';
// Extraccion de ofertas desde JSON-LD schema.org (Product/Offer/AggregateOffer/ItemList).
const { fechaISO } = require('./util');
const { parsePrecio, descuentoPct } = require('./precios');
const { decodificar } = require('./xml');

function limpiarJson(s) {
  return s.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\*<!\[CDATA\[\*\//, '').replace(/\/\*\]\]>\*\/\s*$/, '').trim();
}
function intentarParsear(s) {
  try { return JSON.parse(s); } catch { /* reintento tolerante */ }
  try {
    return JSON.parse(s.replace(/[\u0000-\u001f]+/g, ' ').replace(/,\s*([}\]])/g, '$1'));
  } catch { return undefined; }
}

function extraerJsonLd(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const v = intentarParsear(limpiarJson(m[1]));
    if (v !== undefined) out.push(v);
  }
  return out;
}

const tipos = (n) => [].concat(n && n['@type'] ? n['@type'] : []).map((t) => String(t).replace(/^.*[\/#]/, ''));
const esTipo = (n, t) => tipos(n).includes(t);

function aplanar(v, salida = [], prof = 0) {
  if (!v || prof > 8) return salida;
  if (Array.isArray(v)) { v.forEach((x) => aplanar(x, salida, prof + 1)); return salida; }
  if (typeof v !== 'object') return salida;
  salida.push(v);
  if (v['@graph']) aplanar(v['@graph'], salida, prof + 1);
  if (esTipo(v, 'ItemList') && v.itemListElement) {
    for (const el of [].concat(v.itemListElement)) aplanar(el && el.item ? el.item : el, salida, prof + 1);
  }
  return salida;
}

const texto = (v) => (v === undefined || v === null ? '' : decodificar(String(typeof v === 'object' ? v.name || '' : v)).trim());
function imagenDe(v) {
  const x = Array.isArray(v) ? v[0] : v;
  if (!x) return null;
  return typeof x === 'string' ? x : x.url || x.contentUrl || null;
}
function precioDe(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return v;
  return parsePrecio(String(v));
}

function datosOferta(of) {
  let precio = precioDe(of.price);
  if (precio === null) precio = precioDe(of.lowPrice);
  let antes = null;
  for (const ps of [].concat(of.priceSpecification || [])) {
    const tipo = String(ps.priceType || '');
    const p = precioDe(ps.price);
    if (p === null) continue;
    if (/ListPrice|Strikethrough|SRP|MSRP/i.test(tipo)) antes = p;
    else if (precio === null) precio = p;
  }
  const moneda = String(of.priceCurrency || [].concat(of.priceSpecification || []).map((p) => p.priceCurrency).find(Boolean) || '').toUpperCase() || null;
  return {
    precio, precioAntes: antes, moneda,
    url: of.url || null,
    vence: fechaISO(of.priceValidUntil),
    disponibilidad: String(of.availability || '').replace(/^.*\//, '') || null
  };
}

function ofertasDeHtml(html, urlPagina) {
  const nodos = extraerJsonLd(html).flatMap((v) => aplanar(v));
  const res = [];
  const base = (u) => { try { return new URL(u, urlPagina).toString(); } catch { return urlPagina; } };
  const procesar = (prod, ofertas) => {
    for (const of of [].concat(ofertas || [])) {
      if (!of || typeof of !== 'object') continue;
      const lista = of.offers && !of.price ? [].concat(of.offers) : [of];
      for (const o of lista) {
        const d = datosOferta(o);
        if (d.precio === null || d.precio <= 0) continue;
        if (/OutOfStock|SoldOut|Discontinued/i.test(d.disponibilidad || '')) continue;
        const titulo = texto(prod.name);
        if (!titulo) continue;
        res.push({
          titulo, precio: d.precio, precioAntes: d.precioAntes && d.precioAntes > d.precio ? d.precioAntes : null,
          descuentoPct: d.precioAntes && d.precioAntes > d.precio ? descuentoPct(d.precioAntes, d.precio) : null,
          moneda: d.moneda, url: base(d.url || prod.url || urlPagina), imagen: imagenDe(prod.image),
          vence: d.vence, marca: texto(prod.brand) || null, sku: texto(prod.sku) || null,
          disponibilidad: d.disponibilidad
        });
        break;
      }
    }
  };
  for (const n of nodos) {
    if (esTipo(n, 'Product') || esTipo(n, 'ProductGroup') || esTipo(n, 'IndividualProduct')) procesar(n, n.offers);
    else if ((esTipo(n, 'Offer') || esTipo(n, 'AggregateOffer')) && n.itemOffered) procesar(n.itemOffered, n);
  }
  const vistos = new Set();
  return res.filter((r) => { const k = r.url + '|' + r.precio; if (vistos.has(k)) return false; vistos.add(k); return true; });
}

module.exports = { extraerJsonLd, ofertasDeHtml, aplanar };
