'use strict';
// Normalizacion de precios, monedas, descuentos, cupones y fechas de vencimiento en textos de ofertas.
const { hash, sinAcentos, redondear } = require('./util');

const SIMBOLOS = { 'US$': 'USD', 'MX$': 'MXN', 'R$': 'BRL', 'CA$': 'CAD', 'C$': 'CAD', 'A$': 'AUD', 'AR$': 'ARS', 'COL$': 'COP', 'CL$': 'CLP', 'S/': 'PEN', 'S/.': 'PEN', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };
const CODIGOS = 'USD|EUR|GBP|MXN|COP|ARS|BRL|CLP|PEN|DOP|CAD|AUD|CHF|JPY|UYU';
const NUM = '\\d{1,3}(?:[.,\\u00a0\\u202f]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?';
const SIM = 'US\\$|MX\\$|R\\$|CA\\$|AR\\$|COL\\$|CL\\$|C\\$|A\\$|S\\/\\.?|[$€£¥]';

function parsePrecio(s) {
  s = String(s).replace(/[  \s]/g, '').replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;
  const pc = s.lastIndexOf('.'), cm = s.lastIndexOf(',');
  let dec = -1;
  if (pc >= 0 && cm >= 0) dec = Math.max(pc, cm);
  else {
    const sep = pc >= 0 ? pc : cm;
    if (sep >= 0) {
      const cuenta = (s.match(/[.,]/g) || []).length;
      const tras = s.length - sep - 1;
      const entero = s.slice(0, sep);
      if (cuenta > 1) dec = -1;
      else if (tras === 3 && entero !== '0' && entero.length <= 3) dec = -1;
      else dec = sep;
    }
  }
  const ent = (dec >= 0 ? s.slice(0, dec) : s).replace(/[.,]/g, '');
  const frac = dec >= 0 ? s.slice(dec + 1) : '';
  const n = Number(ent + (frac ? '.' + frac : ''));
  return Number.isFinite(n) ? n : null;
}

function monedaDe(simbolo, defecto) {
  if (!simbolo) return defecto;
  const s = simbolo.trim();
  if (SIMBOLOS[s]) return SIMBOLOS[s];
  if (/^[A-Z]{3}$/.test(s.toUpperCase()) && CODIGOS.includes(s.toUpperCase())) return s.toUpperCase();
  return defecto; // "$" -> moneda por defecto de la fuente
}

function extraerPrecios(texto, defecto = 'USD') {
  texto = String(texto || '');
  const res = [];
  const pref = new RegExp(`(${SIM}|\\b(?:${CODIGOS}))\\s?(${NUM})`, 'g');
  const suf = new RegExp(`(${NUM})\\s?(€|£|\\b(?:${CODIGOS})\\b)`, 'g');
  let m;
  while ((m = pref.exec(texto))) {
    res.push({ valor: parsePrecio(m[2]), moneda: monedaDe(m[1], defecto), indice: m.index, fin: m.index + m[0].length });
  }
  while ((m = suf.exec(texto))) {
    if (res.some((r) => m.index < r.fin && m.index + m[0].length > r.indice)) continue;
    res.push({ valor: parsePrecio(m[1]), moneda: monedaDe(m[2], defecto), indice: m.index, fin: m.index + m[0].length });
  }
  return res.filter((r) => r.valor !== null && r.valor > 0).sort((a, b) => a.indice - b.indice);
}

function descuentoPct(antes, ahora) {
  if (!antes || !ahora || antes <= ahora) return null;
  return redondear((1 - ahora / antes) * 100, 0);
}

const MESES = { jan: 0, ene: 0, enero: 0, january: 0, feb: 1, febrero: 1, february: 1, mar: 2, marzo: 2, march: 2, apr: 3, abr: 3, abril: 3, april: 3, may: 4, mayo: 4, jun: 5, junio: 5, june: 5, jul: 6, julio: 6, july: 6, aug: 7, ago: 7, agosto: 7, august: 7, sep: 8, sept: 8, septiembre: 8, setiembre: 8, september: 8, oct: 9, octubre: 9, october: 9, nov: 10, noviembre: 10, november: 10, dec: 11, dic: 11, diciembre: 11, december: 11 };

function fechaTexto(s, ahora, idioma = 'en') {
  s = sinAcentos(String(s)).toLowerCase();
  let m;
  const mk = (y, mo, d) => {
    const dt = new Date(Date.UTC(y, mo, d, 23, 59, 59));
    return dt.getUTCMonth() === mo ? dt.toISOString() : null;
  };
  if ((m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return mk(+m[1], +m[2] - 1, +m[3]);
  if ((m = /(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/.exec(s))) {
    let a = +m[1], b = +m[2], y = +m[3];
    if (y < 100) y += 2000;
    const dmy = a > 12 ? true : b > 12 ? false : idioma === 'es';
    return dmy ? mk(y, b - 1, a) : mk(y, a - 1, b);
  }
  const nombre = '([a-z]{3,10})';
  const posible = (mes, dia, y) => {
    const mo = MESES[mes];
    if (mo === undefined) return null;
    let yy = y ? +y : ahora.getUTCFullYear();
    let r = mk(yy, mo, +dia);
    if (!y && r && Date.parse(r) < ahora.getTime() - 86400000) r = mk(yy + 1, mo, +dia);
    return r;
  };
  if ((m = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:de\\s+)?${nombre}(?:\\s+(?:de\\s+)?(\\d{4}))?`).exec(s)) && MESES[m[2]] !== undefined) return posible(m[2], m[1], m[3]);
  if ((m = new RegExp(`${nombre}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`).exec(s)) && MESES[m[1]] !== undefined) return posible(m[1], m[2], m[3]);
  return null;
}

const PALABRAS_NO_CUPON = new Set(['CODE', 'FREE', 'COUPON', 'CUPON', 'APPLY', 'PROMO', 'AUTO', 'NONE', 'HERE', 'DEAL', 'SHIPPING']);

function extraerCupon(texto) {
  const re = /(?:c[oó]digo|code|cup[oó]n|coupon|promo)\s*(?:code)?\s*[:"“'\-]?\s*([A-Za-z0-9][A-Za-z0-9_-]{3,24})/gi;
  let m;
  while ((m = re.exec(texto))) {
    const c = m[1];
    if (c === c.toUpperCase() && /[A-Z]/.test(c) && !PALABRAS_NO_CUPON.has(c)) return c;
  }
  return null;
}

function extraerVence(texto, ahora, idioma) {
  const m = /(?:expires?|expira|expiran|vence|v[aá]lid[oa]\s+hasta|valid\s+(?:until|through|thru)|hasta\s+el|ends?|ending|termina)\s*(?:on|el|:)?\s*([^.;()|]{3,30})/i.exec(texto);
  return m ? fechaTexto(m[1], ahora, idioma) : null;
}

function extraerStore(titulo) {
  const m = /(?:\bat|@|\bfrom|\ben)\s+([A-Z0-9][\w&'.]*(?:\s+[A-Z0-9][\w&'.]*){0,2})\s*(?:[+,(\-–|]|$)/.exec(titulo.replace(/\s+/g, ' ').trim());
  return m ? m[1].trim() : null;
}

const CATEGORIAS = [
  ['juegos', /\b(ps5|ps4|xbox|nintendo|switch|steam|juego|game|gaming|playstation|epic games)\b/i],
  ['tecnologia', /\b(ssd|laptop|portatil|tablet|iphone|samsung|monitor|tv|oled|router|airpods|auricular|headphone|camera|camara|gpu|cpu|ram|usb|smartphone|movil|ipad|macbook|echo|kindle|cable|charger|cargador)\b/i],
  ['hogar', /\b(hogar|home|kitchen|cocina|vacuum|aspirador|robot|mattress|colchon|sofa|mueble|furniture|air fryer|freidora|lamp|garden|jardin|tool|herramienta)\b/i],
  ['moda', /\b(zapatilla|shoe|sneaker|nike|adidas|camisa|shirt|jacket|chaqueta|jeans|reloj|watch|ropa|clothing|bolso)\b/i],
  ['viajes', /\b(vuelo|flight|hotel|viaje|travel|airline|crucero|cruise)\b/i],
  ['comida', /\b(pizza|burger|food|comida|restaurante|restaurant|coffee|cafe|grocery|supermercado)\b/i],
  ['salud', /\b(vitamin|vitamina|gym|fitness|salud|health|perfume|beauty|belleza)\b/i]
];
function categorizar(texto, defecto = 'otros') {
  for (const [c, re] of CATEGORIAS) if (re.test(texto)) return c;
  return defecto;
}

function buscarPrecioAntes(texto, moneda, precioValor) {
  const ps = extraerPrecios(texto, moneda);
  for (const p of ps) {
    const ctx = sinAcentos(texto.slice(Math.max(0, p.indice - 18), p.indice)).toLowerCase();
    if (/(was|antes|before|reg\.?|regular|list|msrp|pvp|habitual|normally|usually|from|de)\s*:?\s*\(?\s*$/.test(ctx) && p.valor > precioValor) return p;
  }
  return null;
}

function analizarTexto(titulo, extra = '', { moneda = 'USD', ahora = new Date(), idioma = 'en' } = {}) {
  const todo = `${titulo} ${extra}`;
  const precios = extraerPrecios(titulo, moneda);
  const util = precios.filter((p) => !/^\s*(?:off|de\s+descuento|dto|de\s+dto)\b/i.test(titulo.slice(p.fin, p.fin + 14)));
  let precio = util[0] || null, antes = null;
  for (const p of util.slice(1)) {
    const ctx = sinAcentos(titulo.slice(Math.max(0, p.indice - 18), p.indice)).toLowerCase();
    if (/(was|antes|before|reg\.?|regular|list|msrp|pvp|habitual|normally|usually|from|de)\s*:?\s*\(?\s*$/.test(ctx) && p.valor > precio.valor) { antes = p; break; }
  }
  if (!antes && precio) {
    const ctx0 = sinAcentos(titulo.slice(precio.fin, precio.fin + 30)).toLowerCase();
    const mm = /^\s*\(?\s*(?:was|antes|reg\.?|regular|list)\s*:?\s*/.exec(ctx0);
    if (mm) {
      const o = extraerPrecios(titulo.slice(precio.fin + mm[0].length, precio.fin + mm[0].length + 20), moneda)[0];
      if (o && o.valor > precio.valor) antes = o;
    }
  }
  let pct = null;
  const mp = /(?:-\s*(\d{1,2})\s?%|(\d{1,2})\s?%\s*(?:off|de\s+descuento|dto\.?|descuento|discount))/i.exec(todo);
  if (mp) pct = +(mp[1] || mp[2]);
  if (pct !== null && (pct < 1 || pct > 95)) pct = null;
  const pctCalc = precio && antes ? descuentoPct(antes.valor, precio.valor) : null;
  return {
    precio: precio ? precio.valor : null,
    precioAntes: antes ? antes.valor : null,
    descuentoPct: pctCalc !== null ? pctCalc : pct,
    moneda: precio ? precio.moneda : moneda,
    cupon: extraerCupon(todo),
    vence: extraerVence(todo, ahora, idioma),
    tienda: extraerStore(titulo)
  };
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'with', 'for', 'of', 'in', 'on', 'at', 'to', 'free', 'shipping', 'off', 'was', 'now', 'el', 'la', 'los', 'las', 'de', 'del', 'y', 'con', 'para', 'en', 'por', 'envio', 'gratis', 'oferta', 'deal', 'prime', 'reg', 'coupon', 'code', 'cupon', 'codigo', 'plus', 'via']);
function claveProducto(titulo, tienda = '') {
  const limpio = sinAcentos(titulo).toLowerCase()
    .replace(new RegExp(`(?:${SIM})\\s?(?:${NUM})|(?:${NUM})\\s?(?:€|£|usd|eur)`, 'gi'), ' ')
    .replace(/\d+\s?%/g, ' ').replace(/[^a-z0-9]+/g, ' ');
  const toks = [...new Set(limpio.split(' ').filter((t) => t.length >= 2 && !STOP.has(t)))].slice(0, 9).sort();
  return hash(sinAcentos(tienda).toLowerCase() + '|' + toks.join(' '), 12);
}

module.exports = { parsePrecio, monedaDe, extraerPrecios, descuentoPct, fechaTexto, extraerCupon, extraerVence, extraerStore, categorizar, analizarTexto, buscarPrecioAntes, claveProducto };
