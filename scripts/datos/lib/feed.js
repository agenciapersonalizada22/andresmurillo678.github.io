'use strict';
// RSS 2.0 / Atom / RDF (RSS 1.0) -> estructura comun.
const X = require('./xml');
const { fechaISO } = require('./util');

function htmlATexto(html) {
  let s = String(html || '');
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<(br|\/p|\/div|\/li|\/h\d)\b[^>]*>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = X.decodificar(s);
  if (/<\/?[a-z][^>]*>/i.test(s)) s = s.replace(/<[^>]+>/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function primeraImagenHtml(html) {
  const m = /<img[^>]+src\s*=\s*["']([^"']+)["']/i.exec(String(html || ''));
  return m ? X.decodificar(m[1]) : null;
}

function enlaceDe(it) {
  const orig = X.texto(it, 'feedburner:origlink');
  if (orig) return orig;
  const ls = X.hijos(it, 'link');
  let alt = null;
  for (const l of ls) {
    if (l.texto.trim()) return l.texto.trim();
    const rel = (l.attrs.rel || 'alternate').toLowerCase();
    if (l.attrs.href && rel === 'alternate' && !alt) alt = l.attrs.href;
  }
  if (alt) return alt;
  const g = X.hijo(it, 'guid') || X.hijo(it, 'id');
  if (g && /^https?:\/\//i.test(g.texto.trim()) && g.attrs.ispermalink !== 'false') return g.texto.trim();
  const l0 = ls.find((l) => l.attrs.href);
  return l0 ? l0.attrs.href : '';
}

function imagenDe(it, html) {
  for (const m of X.hijos(it, 'media:content').concat(X.hijos(it, 'media:thumbnail'))) {
    const t = (m.attrs.type || '') + (m.attrs.medium || '');
    if (m.attrs.url && (!t || /image/i.test(t) || m.nombre === 'media:thumbnail')) return m.attrs.url;
  }
  for (const m of X.hijos(it, 'media:group')) {
    const c = X.hijo(m, 'media:content') || X.hijo(m, 'media:thumbnail');
    if (c && c.attrs.url) return c.attrs.url;
  }
  const e = X.hijos(it, 'enclosure').find((x) => /image/i.test(x.attrs.type || '') && x.attrs.url);
  if (e) return e.attrs.url;
  const ln = X.hijos(it, 'link').find((l) => /image/i.test(l.attrs.type || '') && l.attrs.href);
  if (ln) return ln.attrs.href;
  return primeraImagenHtml(html);
}

function itemA(it) {
  const html = X.texto(it, 'content:encoded') || X.texto(it, 'content') || X.texto(it, 'description') || X.texto(it, 'summary');
  const resumenHtml = X.texto(it, 'description') || X.texto(it, 'summary') || html;
  const ns = {};
  for (const h of it.hijos) {
    if (h.nombre.includes(':') && !ns[h.nombre]) ns[h.nombre] = { attrs: h.attrs, texto: h.texto.trim() };
  }
  const cats = [];
  for (const c of X.hijos(it, 'category').concat(X.hijos(it, 'dc:subject'))) {
    const v = (c.attrs.term || c.texto || '').trim();
    if (v) cats.push(htmlATexto(v));
  }
  const fecha = ['pubdate', 'dc:date', 'published', 'updated', 'a10:updated', 'date']
    .map((k) => fechaISO(X.texto(it, k))).find(Boolean) || null;
  const guid = X.texto(it, 'guid') || X.texto(it, 'id');
  return {
    titulo: htmlATexto(X.texto(it, 'title')),
    enlace: enlaceDe(it),
    descripcion: htmlATexto(resumenHtml),
    descripcionHtml: html,
    fecha,
    guid,
    categorias: cats,
    imagen: imagenDe(it, html),
    ns
  };
}

function parsearFeed(xml, { max = 100 } = {}) {
  const raiz = X.parsear(xml);
  const rss = X.buscar(raiz, 'rss')[0];
  const atom = X.buscar(raiz, 'feed')[0];
  const rdf = X.buscar(raiz, 'rdf:rdf')[0];
  let tipo, cont, lista;
  if (atom && !rss) { tipo = 'atom'; cont = atom; lista = X.hijos(atom, 'entry'); }
  else if (rss) { tipo = 'rss'; cont = X.hijo(rss, 'channel') || rss; lista = X.hijos(cont, 'item'); }
  else if (rdf) { tipo = 'rdf'; cont = X.hijo(rdf, 'channel') || rdf; lista = X.hijos(rdf, 'item'); }
  else throw new Error('no es un feed RSS/Atom/RDF valido');
  const titulo = htmlATexto(X.texto(cont, 'title'));
  const items = lista.slice(0, max).map(itemA).filter((i) => i.titulo || i.enlace);
  return { tipo, titulo, items };
}

function parsearSitemap(xml) {
  const raiz = X.parsear(xml);
  const idx = X.buscar(raiz, 'sitemapindex')[0];
  const filas = (idx ? X.buscar(idx, 'sitemap') : X.buscar(raiz, 'url')).map((u) => ({
    loc: X.texto(u, 'loc'),
    lastmod: fechaISO(X.texto(u, 'lastmod'))
  })).filter((u) => u.loc);
  return { indice: !!idx, urls: filas };
}

module.exports = { parsearFeed, parsearSitemap, htmlATexto };
