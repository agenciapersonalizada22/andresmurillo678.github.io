'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const X = require('../lib/xml');
const { parsearFeed, parsearSitemap, htmlATexto } = require('../lib/feed');
const { leer } = require('../fixtures/router');

test('xml: entidades, CDATA, comentarios, DOCTYPE y atributos', () => {
  const r = X.parsear(`<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY x "y">]><!-- c --><a id='1' t="x &amp; y"><b>Hola &amp; &#233; &#x41; &eacute;</b><c><![CDATA[<p>raw & texto</p>]]></c><d/><e a=b></e></a>`);
  const a = X.hijo(r, 'a');
  assert.equal(a.attrs.id, '1');
  assert.equal(a.attrs.t, 'x & y');
  assert.equal(X.texto(a, 'b'), 'Hola & é A é');
  assert.equal(X.texto(a, 'c'), '<p>raw & texto</p>');
  assert.ok(X.hijo(a, 'd'));
  assert.equal(X.hijo(a, 'e').attrs.a, 'b');
});

test('xml: tolera etiquetas sin cerrar, cierres huerfanos y texto suelto', () => {
  const r = X.parsear('<rss><channel><title>T</title><item><title>Uno</title></item></oops><item><title>Dos</title>');
  const items = X.buscar(r, 'item');
  assert.equal(items.length, 2);
  assert.equal(X.texto(items[1], 'title'), 'Dos');
  assert.doesNotThrow(() => X.parsear(''));
  assert.doesNotThrow(() => X.parsear('<a attr="sin cerrar'));
});

test('xml: entidades desconocidas y numericas invalidas no rompen', () => {
  assert.equal(X.decodificar('&foo; &#0; &#99999999; &amp;'), '&foo;   &');
});

test('feed RSS 2.0: CDATA, content:encoded, media, dc, guid y fechas', () => {
  const f = parsearFeed(leer('feeds/rss_cripto.xml'));
  assert.equal(f.tipo, 'rss');
  assert.equal(f.titulo, 'Noticias Cripto Ejemplo');
  assert.equal(f.items.length, 4);
  const [a, b, , d] = f.items;
  assert.equal(a.titulo, 'Bitcoin surges to all-time high as ETH rallies');
  assert.match(a.enlace, /^https:\/\/noticias\.example\/cripto\/bitcoin-maximo/);
  assert.equal(a.fecha, '2026-11-04T18:30:00.000Z');
  assert.equal(a.imagen, 'https://noticias.example/img/btc-thumb.jpg');
  assert.ok(a.descripcion.startsWith('Bitcoin reached a new record'));
  assert.ok(!a.descripcion.includes('<'));
  assert.ok(a.descripcionHtml.includes('FULL ARTICLE BODY'));
  assert.deepEqual(a.categorias, ['Markets']);
  assert.equal(b.fecha, '2026-11-04T12:00:00.000Z');
  assert.ok(!b.descripcion.includes('<a'));
  assert.equal(d.fecha, null);
});

test('feed Atom: href alternate, zona horaria, enclosure, summary html escapado', () => {
  const f = parsearFeed(leer('feeds/atom_bolsa.xml'));
  assert.equal(f.tipo, 'atom');
  assert.equal(f.items.length, 2);
  const e = f.items[0];
  assert.equal(e.enlace, 'https://noticias.example/bolsa/acciones-caen');
  assert.equal(e.fecha, '2026-11-05T13:15:00.000Z');
  assert.equal(e.imagen, 'https://noticias.example/img/bolsa.jpg');
  assert.equal(e.descripcion, 'Wall Street opened lower — investors fear a recession as earnings disappoint.');
  assert.equal(f.items[1].enlace, 'https://noticias.example/bolsa/fed-mantiene');
  assert.equal(f.items[1].fecha, '2026-11-05T07:00:00.000Z');
});

test('feed RDF (RSS 1.0): items fuera del channel, entidades latinas', () => {
  const f = parsearFeed(leer('feeds/rdf_general.xml'));
  assert.equal(f.tipo, 'rdf');
  assert.equal(f.items.length, 2);
  assert.equal(f.items[0].titulo, 'La cumbre termina con un acuerdo histórico y optimismo');
  assert.equal(f.items[1].titulo, 'La inflación cae y la bolsa sube');
  assert.equal(f.items[0].fecha, '2026-11-05T06:30:00.000Z');
});

test('feed: HTML o vacio lanzan error claro; max limita', () => {
  assert.throws(() => parsearFeed(leer('feeds/pagina_no_feed.html')), /no es un feed/);
  assert.throws(() => parsearFeed(''), /no es un feed/);
  assert.equal(parsearFeed(leer('feeds/rss_cripto.xml'), { max: 2 }).items.length, 2);
});

test('feed: extension pepper:* queda en ns', () => {
  const f = parsearFeed(leer('feeds/deals_pepper.xml'));
  assert.equal(f.items[0].ns['pepper:merchant'].attrs.name, 'MediaMarkt');
  assert.equal(f.items[0].ns['pepper:merchant'].attrs.price, '24,99 €');
});

test('htmlATexto: quita etiquetas, scripts, decodifica doble escape', () => {
  assert.equal(htmlATexto('<p>Hola<br>mundo</p><script>x()</script><style>a{}</style> &lt;b&gt;ok&lt;/b&gt; &amp; fin'), 'Hola mundo ok & fin');
});

test('sitemap: urlset, indice y lastmod', () => {
  const s = parsearSitemap(leer('html/sitemap.xml'));
  assert.equal(s.indice, false);
  assert.equal(s.urls.length, 4);
  assert.equal(s.urls[0].lastmod, '2026-11-04T00:00:00.000Z');
  assert.equal(s.urls[3].lastmod, null);
  const idx = parsearSitemap('<sitemapindex><sitemap><loc>https://x.example/a.xml</loc></sitemap></sitemapindex>');
  assert.equal(idx.indice, true);
  assert.equal(idx.urls[0].loc, 'https://x.example/a.xml');
});
