'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sentimiento } = require('../lib/sentimiento');
const { extraerTickers } = require('../lib/tickers');
const P = require('../lib/precios');
const U = require('../lib/util');
const { esBloqueado } = require('../lib/bloqueo');

test('sentimiento: positivo, negativo y neutro en ingles y espanol', () => {
  assert.ok(sentimiento('Bitcoin surges to all-time high as rally continues') > 0.8);
  assert.ok(sentimiento('Exchange hacked, token plunges after fraud') < -0.8);
  assert.ok(sentimiento('Bitcoin se dispara a un máximo histórico') > 0.7);
  assert.ok(sentimiento('La bolsa se desploma por temor a una recesión') < -0.7);
  assert.equal(sentimiento('El comité se reunirá el martes'), 0);
  assert.equal(sentimiento(''), 0);
  assert.equal(sentimiento(null), 0);
});

test('sentimiento: negacion invierte, acentos y rango', () => {
  assert.ok(sentimiento('stocks do not fall today') > 0);
  assert.ok(sentimiento('la bolsa no sube') < 0);
  assert.equal(sentimiento('CAÍDA'), sentimiento('caida'));
  for (const t of ['crash crash crash collapse panic', 'surge soar rally boom record']) {
    const v = sentimiento(t);
    assert.ok(v >= -1 && v <= 1);
  }
});

test('tickers: cashtags, simbolos, nombres propios, ambiguos y limite', () => {
  assert.deepEqual(extraerTickers('Bitcoin y ETH suben; Apple y $TSLA, NVDA').sort(), ['AAPL', 'BTC', 'ETH', 'NVDA', 'TSLA']);
  assert.deepEqual(extraerTickers('The apple pie and the V sign'), []);
  assert.deepEqual(extraerTickers('Chainlink avanza'), ['LINK']);
  assert.deepEqual(extraerTickers('el link roto'), []);
  assert.deepEqual(extraerTickers('Programa ONE y NEAR de la mañana'), []);
  assert.deepEqual(extraerTickers('$near sube'), ['NEAR']);
  assert.deepEqual(extraerTickers('XYZ sube y ABC baja', { extra: { XYZ: ['Xyz Corp'] } }), ['XYZ']);
  assert.equal(extraerTickers('BTC ETH SOL XRP ADA DOGE AVAX DOT', { max: 3 }).length, 3);
});

test('precios: parsePrecio con separadores en/es', () => {
  const c = [['109.99', 109.99], ['1,299.99', 1299.99], ['1.299,99', 1299.99], ['1.299', 1299], ['1,299', 1299], ['12,5', 12.5], ['0.999', 0.999], ['1.299.999', 1299999], ['$ 20', 20], ['39,95 €', 39.95], ['1 299,50', 1299.5]];
  for (const [t, v] of c) assert.equal(P.parsePrecio(t), v, t);
  assert.equal(P.parsePrecio('gratis'), null);
});

test('precios: extraerPrecios con simbolos, codigos y sufijos', () => {
  const r = P.extraerPrecios('TV $1,299.99 y 49,90€ o EUR 20 y R$ 100 y USD 5', 'MXN');
  assert.deepEqual(r.map((x) => [x.valor, x.moneda]), [[1299.99, 'MXN'], [49.9, 'EUR'], [20, 'EUR'], [100, 'BRL'], [5, 'USD']]);
  assert.deepEqual(P.extraerPrecios('Sin precio, 25% de descuento', 'USD'), []);
  assert.equal(P.extraerPrecios('US$ 50', 'MXN')[0].moneda, 'USD');
});

test('precios: analizarTexto extrae precio, antes, %, cupon, vencimiento y tienda', () => {
  const ahora = new Date('2026-11-05T12:00:00Z');
  const a = P.analizarTexto('Samsung 990 Pro 2TB SSD $109.99 (was $179.99) + Free Shipping at Newegg', 'Use code SSD25. Expires Nov 30.', { ahora });
  assert.equal(a.precio, 109.99);
  assert.equal(a.precioAntes, 179.99);
  assert.equal(a.descuentoPct, 39);
  assert.equal(a.moneda, 'USD');
  assert.equal(a.cupon, 'SSD25');
  assert.equal(a.vence, '2026-11-30T23:59:59.000Z');
  assert.equal(a.tienda, 'Newegg');
  const b = P.analizarTexto('Zapatillas por 39,95€ (-45%)', '', { ahora, moneda: 'EUR', idioma: 'es' });
  assert.equal(b.precio, 39.95);
  assert.equal(b.descuentoPct, 45);
  const c = P.analizarTexto('Cafetera $50 off, ahora $120', '', { ahora });
  assert.equal(c.precio, 120);
  const d = P.analizarTexto('Muestra gratis de café', '', { ahora });
  assert.equal(d.precio, null);
});

test('precios: fechaTexto numerica, ISO, nombres en es/en y ano siguiente', () => {
  const ahora = new Date('2026-11-05T12:00:00Z');
  assert.equal(P.fechaTexto('30/11/2026', ahora, 'es'), '2026-11-30T23:59:59.000Z');
  assert.equal(P.fechaTexto('11/30/2026', ahora, 'en'), '2026-11-30T23:59:59.000Z');
  assert.equal(P.fechaTexto('03/04/2026', ahora, 'es'), '2026-04-03T23:59:59.000Z');
  assert.equal(P.fechaTexto('2026-12-01', ahora), '2026-12-01T23:59:59.000Z');
  assert.equal(P.fechaTexto('15 de enero', ahora, 'es'), '2027-01-15T23:59:59.000Z');
  assert.equal(P.fechaTexto('Dec 3rd', ahora, 'en'), '2026-12-03T23:59:59.000Z');
  assert.equal(P.fechaTexto('31/02/2026', ahora, 'es'), null);
  assert.equal(P.fechaTexto('pronto', ahora), null);
});

test('precios: cupon solo mayusculas y sin palabras comunes', () => {
  assert.equal(P.extraerCupon('Código: AHORRA20 al pagar'), 'AHORRA20');
  assert.equal(P.extraerCupon('use coupon code'), null);
  assert.equal(P.extraerCupon('promo code summer10'), null);
});

test('precios: claveProducto estable ante precio/orden/tienda, distinta entre productos', () => {
  const a = P.claveProducto('Samsung 990 Pro 2TB SSD $109.99 + Free Shipping', 'Newegg');
  const b = P.claveProducto('SSD 2TB Samsung 990 Pro $99.00 free shipping', 'newegg');
  const c = P.claveProducto('Samsung 990 Pro 1TB SSD $79.99', 'Newegg');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, P.claveProducto('Samsung 990 Pro 2TB SSD $109.99', 'Amazon'));
  assert.equal(P.descuentoPct(200, 150), 25);
  assert.equal(P.descuentoPct(100, 120), null);
});

test('util: normalizarUrl, recortar, redactarUrl, fechaISO', () => {
  assert.equal(U.normalizarUrl('HTTPS://Ejemplo.COM/a/?utm_source=x&b=2&a=1&fbclid=z#frag'), 'https://ejemplo.com/a/?a=1&b=2');
  assert.equal(U.normalizarUrl('https://e.com/ruta/'), 'https://e.com/ruta');
  const t = U.recortar('palabra '.repeat(100), 50);
  assert.ok(t.length <= 50 && t.endsWith('…'));
  assert.equal(U.recortar('corto', 50), 'corto');
  assert.equal(U.redactarUrl('https://a.com/x?apikey=SECRETO&q=1&token=ABC'), 'https://a.com/x?apikey=***&q=1&token=***');
  assert.equal(U.fechaISO('Wed, 04 Nov 2026 18:30:00 +0000'), '2026-11-04T18:30:00.000Z');
  assert.equal(U.fechaISO('basura'), null);
});

test('bloqueo de dominios: comodin de TLD, subdominios y no coincidencias parciales', () => {
  const l = ['amazon.*', 'ebay.*', 'walmart.com'];
  for (const u of ['https://www.amazon.com/dp/1', 'https://amazon.es/x', 'https://smile.amazon.co.uk/y', 'https://www.ebay.com/itm', 'https://walmart.com/', 'https://tienda.walmart.com/']) assert.equal(esBloqueado(u, l), true, u);
  for (const u of ['https://notamazon.com/', 'https://amazonia.example/', 'https://mywalmart.com/', 'https://tienda.example/']) assert.equal(esBloqueado(u, l), false, u);
  assert.equal(esBloqueado('amazon.de', l), true);
});
