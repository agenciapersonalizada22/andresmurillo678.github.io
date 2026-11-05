'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraerJsonLd, ofertasDeHtml } = require('../lib/jsonld');
const { parsearRobots, permitido, retraso, GestorRobots, aRegex } = require('../lib/robots');
const { crearHttp } = require('../lib/http');
const { leer, crearFetch } = require('../fixtures/router');

test('jsonld: Product con Offer, ListPrice, moneda, vencimiento e imagen', () => {
  const o = ofertasDeHtml(leer('html/producto_ssd.html'), 'https://tienda.example/x');
  assert.equal(o.length, 1);
  assert.equal(o[0].titulo, 'SSD NVMe 2TB & Disipador');
  assert.equal(o[0].precio, 89.9);
  assert.equal(o[0].precioAntes, 149.9);
  assert.equal(o[0].descuentoPct, 40);
  assert.equal(o[0].moneda, 'EUR');
  assert.equal(o[0].vence, '2026-12-31T00:00:00.000Z');
  assert.equal(o[0].marca, 'Marca X');
  assert.equal(o[0].imagen, 'https://tienda.example/img/ssd.jpg');
});

test('jsonld: @graph + ItemList, coma final, comentario HTML, AggregateOffer, agotados excluidos, URL relativa', () => {
  const o = ofertasDeHtml(leer('html/listado_ofertas.html'), 'https://tienda.example/ofertas/listado');
  const por = Object.fromEntries(o.map((x) => [x.titulo, x]));
  assert.ok(por['Monitor 27 pulgadas 4K']);
  assert.equal(por['Monitor 27 pulgadas 4K'].precio, 249);
  assert.equal(por['Monitor 27 pulgadas 4K'].precioAntes, 399);
  assert.equal(por['Monitor 27 pulgadas 4K'].url, 'https://tienda.example/producto/monitor-4k');
  assert.equal(por['Teclado agotado'], undefined);
  assert.equal(por['Raton sin descuento'].precioAntes, null);
  assert.equal(o.length, 2);
});

test('jsonld: Offer suelto con itemOffered, JSON roto se ignora, precios en texto', () => {
  const html = `<script type="application/ld+json">{"@type":"Offer","price":"1.299,00","priceCurrency":"eur","itemOffered":{"@type":"Product","name":"TV"},"url":"https://t.example/tv"}</script>
  <script type="application/ld+json">{ esto no es json </script>
  <script type='application/ld+json'>[{"@type":["Product","Thing"],"name":"Lampara","offers":[{"@type":"Offer","price":12.5,"priceCurrency":"USD"}]}]</script>`;
  const o = ofertasDeHtml(html, 'https://t.example/');
  assert.equal(o.length, 2);
  assert.equal(o[0].precio, 1299);
  assert.equal(o[0].moneda, 'EUR');
  assert.equal(o[1].titulo, 'Lampara');
  assert.equal(extraerJsonLd('<html>sin json</html>').length, 0);
});

const R = parsearRobots(`
# comentario
User-agent: *
Disallow: /privado/
Disallow: /*?sesion=
Disallow: /fin$
Allow: /privado/publico
Crawl-delay: 2
Sitemap: https://t.example/sitemap.xml

User-agent: datos-bot
User-agent: otro-bot
Disallow: /solo-bot/

User-agent: MalaBot
Disallow: /
`);

test('robots: parseo de grupos, sitemap y crawl-delay', () => {
  assert.equal(R.grupos.length, 3);
  assert.deepEqual(R.grupos[1].agentes, ['datos-bot', 'otro-bot']);
  assert.deepEqual(R.sitemaps, ['https://t.example/sitemap.xml']);
  assert.equal(retraso(R, 'cualquiera/1.0'), 2);
  assert.equal(retraso(R, 'datos-bot/1.0'), null);
});

test('robots: regla mas larga gana, Allow mas especifico, comodines y $', () => {
  const ua = 'cualquiera/1.0';
  assert.equal(permitido(R, ua, '/'), true);
  assert.equal(permitido(R, ua, '/privado/x'), false);
  assert.equal(permitido(R, ua, '/privado/publico/a'), true);
  assert.equal(permitido(R, ua, '/a?sesion=1'), false);
  assert.equal(permitido(R, ua, '/fin'), false);
  assert.equal(permitido(R, ua, '/fin/mas'), true);
  assert.equal(permitido(R, ua, '/finanzas'), true);
});

test('robots: grupo especifico del agente sustituye al *; MalaBot bloqueado entero', () => {
  assert.equal(permitido(R, 'datos-bot/1.0 (+https://x)', '/privado/x'), true);
  assert.equal(permitido(R, 'datos-bot/1.0', '/solo-bot/x'), false);
  assert.equal(permitido(R, 'MalaBot/2', '/lo-que-sea'), false);
});

test('robots: vacio permite todo; Disallow vacio permite; empate Allow/Disallow favorece Allow', () => {
  assert.equal(permitido(parsearRobots(''), 'x', '/a'), true);
  assert.equal(permitido(parsearRobots('User-agent: *\nDisallow:'), 'x', '/a'), true);
  assert.equal(permitido(parsearRobots('User-agent: *\nDisallow: /a\nAllow: /a'), 'x', '/a'), true);
  assert.equal(permitido(parsearRobots('User-agent: *\r\nDisallow: /\r\n'), 'x', '/a'), false);
  assert.ok(aRegex('/a*b$').test('/aXXb'));
  assert.ok(!aRegex('/a*b$').test('/aXXbc'));
});

function gestor(handler, extra = {}) {
  const f = async (url) => handler(url);
  const http = crearHttp({ fetchImpl: f, esperar: async () => {}, reintentos: 0, ua: 'datos-bot/1.0' });
  return new GestorRobots({ http, agente: 'datos-bot/1.0', ...extra });
}

test('GestorRobots con fixtures: bloquea /privado/, permite el resto, crawl-delay y cache', async () => {
  const fx = crearFetch();
  const http = crearHttp({ fetchImpl: fx, esperar: async () => {}, reintentos: 0, ua: 'cualquiera/1.0' });
  const g = new GestorRobots({ http, agente: 'cualquiera/1.0' });
  assert.equal(await g.permite('https://tienda.example/producto/ssd-2tb'), true);
  assert.equal(await g.permite('https://tienda.example/privado/panel'), false);
  assert.equal(await g.permite('https://tienda.example/privado/publico'), true);
  assert.equal(await g.retrasoMs('https://tienda.example/x'), 2000);
  assert.equal(fx.registro.filter((r) => r.url.endsWith('/robots.txt')).length, 1);
});

test('GestorRobots: 404 => permitido; 500 => prohibido (inalcanzable); error de red => prohibido; respetar=false', async () => {
  assert.equal(await gestor(() => new Response('', { status: 404 })).permite('https://a.example/x'), true);
  assert.equal(await gestor(() => new Response('', { status: 403 })).permite('https://a.example/x'), true);
  assert.equal(await gestor(() => new Response('', { status: 500 })).permite('https://a.example/x'), false);
  assert.equal(await gestor(() => { throw new TypeError('red'); }).permite('https://a.example/x'), false);
  assert.equal(await gestor(() => new Response('', { status: 500 }), { respetar: false }).permite('https://a.example/x'), true);
  assert.equal(await gestor(() => new Response('User-agent: *\nDisallow: /'), {}).permite('ftp://a.example/x'), false);
});
