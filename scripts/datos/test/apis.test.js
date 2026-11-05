'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { leer } = require('../fixtures/router');
const cripto = require('../recolectores/cripto');
const divisas = require('../recolectores/divisas');
const acciones = require('../recolectores/acciones');
const nft = require('../recolectores/nft');
const cuotas = require('../recolectores/cuotas');
const noticias = require('../recolectores/noticias');
const ofertas = require('../recolectores/ofertas');
const { parsearFeed } = require('../lib/feed');
const J = (rel) => JSON.parse(leer(rel));
const AHORA = new Date('2026-11-05T12:00:00Z');

test('CoinGecko: campos, simbolo en mayusculas, sparkline reducido, nulos', () => {
  const items = cripto.parsearCoingecko(J('api/coingecko_markets.json'), { puntos: 20 });
  assert.equal(items.length, 8);
  const btc = items[0];
  assert.equal(btc.id, 'bitcoin'); assert.equal(btc.simbolo, 'BTC');
  assert.equal(btc.cambio1h, 0.12); assert.equal(btc.cambio24h, 1.23); assert.equal(btc.cambio7d, -3.46);
  assert.equal(btc.sparkline7d.length, 20);
  assert.equal(items[7].cambio7d, null);
  assert.throws(() => cripto.parsearCoingecko({ error: 'rate' }), /inesperada/);
  assert.equal(cripto.reducir([1, 2, 3], 10).length, 3);
  assert.deepEqual(cripto.reducir([], 5), []);
});

test('Binance / CoinCap: filtros, orden por volumen, enriquecimiento con datos previos', () => {
  const previo = [{ id: 'bitcoin', simbolo: 'BTC', nombre: 'Bitcoin', cambio7d: 5, capitalizacion: 9, sparkline7d: [1, 2] }];
  const b = cripto.parsearBinance(J('api/binance_ticker24.json'), { top: 10, previo });
  assert.deepEqual(b.map((x) => x.simbolo), ['BTC', 'ETH', 'SOL', 'DOGE']);
  assert.equal(b[0].id, 'bitcoin'); assert.equal(b[0].nombre, 'Bitcoin'); assert.equal(b[0].capitalizacion, 9);
  assert.equal(b[1].id, 'eth'); assert.equal(b[1].cambio1h, null);
  const c = cripto.parsearCoincap(J('api/coincap_assets.json'), { top: 3 });
  assert.equal(c.length, 3); assert.equal(c[0].precio, 97250.12); assert.equal(c[0].cambio24h, 1.54);
  assert.throws(() => cripto.parsearCoincap({}), /inesperada/);
});

test('Velas cripto: klines Binance (volumen en USDT) y OHLC CoinGecko', () => {
  const k = cripto.parsearKlinesBinance(J('api/binance_klines.json'));
  assert.equal(k.length, 365); assert.equal(k[0].length, 6); assert.ok(k[0][5] > 7e7);
  const o = cripto.parsearOhlcCoingecko(J('api/coingecko_ohlc.json'));
  assert.equal(o.length, 365); assert.equal(o[0][5], null);
  assert.throws(() => cripto.parsearKlinesBinance({ code: -1121 }), /inesperados/);
});

test('Divisas: Frankfurter latest/serie y open.er-api', () => {
  const f = divisas.parsearFrankfurter(J('api/frankfurter_latest.json'));
  assert.equal(f.fecha, '2026-11-05'); assert.equal(f.tasas.EUR, 0.8651);
  const s = divisas.parsearSerieFrankfurter(J('api/frankfurter_series.json'));
  assert.equal(s.EUR.length, 4); assert.deepEqual(s.EUR[0], ['2026-11-02', 0.86]);
  const e = divisas.parsearErApi(J('api/erapi_latest.json'));
  assert.equal(e.tasas.COP, 3890.5); assert.equal(e.fecha, '2026-11-05');
  assert.throws(() => divisas.parsearErApi({ result: 'error', 'error-type': 'quota-reached' }), /quota-reached/);
});

test('Acciones: Finnhub quote/perfil, vacio y error', () => {
  const ref = { simbolo: 'AAPL', nombre: 'Apple', bolsa: 'NASDAQ' };
  const q = acciones.parsearFinnhubQuote(J('api/finnhub_quote.json'), ref);
  assert.equal(q.precio, 231.45); assert.equal(q.cambio, 1.23); assert.equal(q.cambioPct, 0.53); assert.equal(q.cierreAnt, 230.22);
  assert.equal(q.hora, '2026-11-05T11:00:00.000Z');
  assert.throws(() => acciones.parsearFinnhubQuote(J('api/finnhub_quote_vacio.json'), ref), /sin datos/);
  assert.throws(() => acciones.parsearFinnhubQuote({ error: 'API limit reached' }, ref), /API limit/);
  const p = acciones.parsearFinnhubPerfil(J('api/finnhub_profile.json'));
  assert.equal(p.capitalizacion, 3512345670000); assert.equal(p.bolsa, 'NASDAQ');
});

test('Acciones: Twelve Data individual, lote con error por simbolo, y error global', () => {
  const ref = { simbolo: 'AAPL', nombre: 'Apple' };
  const q = acciones.parsearTwelveQuote(J('api/twelvedata_quote.json'), ref);
  assert.equal(q.precio, 231.45); assert.equal(q.volumen, 48123400); assert.equal(q.cambioPct, 0.53); assert.equal(q.hora, '2026-11-05T11:00:00.000Z');
  const lote = { AAPL: J('api/twelvedata_quote.json'), ZZZZ: { code: 400, message: 'symbol not found', status: 'error' } };
  const r = acciones.repartirTwelve(lote, [ref, { simbolo: 'ZZZZ', nombre: 'Z' }]);
  assert.equal(r.out.size, 1); assert.equal(r.errores.length, 1);
  const uno = acciones.repartirTwelve(J('api/twelvedata_quote.json'), [ref]);
  assert.equal(uno.out.get('AAPL').precio, 231.45);
  assert.throws(() => acciones.parsearTwelveQuote(J('api/twelvedata_error.json'), ref), /credits/);
});

test('Acciones: Alpha Vantage quote, limite de tasa y series', () => {
  const ref = { simbolo: 'AAPL', nombre: 'Apple' };
  const q = acciones.parsearAlphaQuote(J('api/alphavantage_quote.json'), ref);
  assert.equal(q.precio, 231.45); assert.equal(q.cambioPct, 0.53); assert.equal(q.volumen, 48123400); assert.equal(q.cierreAnt, 230.22);
  assert.throws(() => acciones.parsearAlphaQuote(J('api/alphavantage_limite.json'), ref), /limite de tasa/);
  assert.throws(() => acciones.parsearAlphaQuote({}, ref), /sin datos/);
  const d = acciones.parsearVelasAlpha(J('api/alphavantage_daily.json'));
  assert.equal(d.length, 2); assert.ok(d[0][0] < d[1][0]); assert.deepEqual(d[1].slice(1, 5), [230.1, 232.9, 229.8, 231.45]);
  const t = acciones.parsearVelasTwelve(J('api/twelvedata_series.json'));
  assert.equal(t.length, 3); assert.ok(t[0][0] < t[2][0]);
  const f = acciones.parsearVelasFinnhub(J('api/finnhub_candle.json'));
  assert.equal(f.length, 3); assert.equal(f[0][0], 1793664000000);
  assert.throws(() => acciones.parsearVelasFinnhub({ s: 'no_data' }), /plan de pago/);
  assert.equal(acciones.unirVelas([[1, 1, 1, 1, 1, 1], [2, 1, 1, 1, 1, 1]], [[2, 9, 9, 9, 9, 9], [3, 1, 1, 1, 1, 1]], 2).length, 2);
});

test('Acciones: seleccion de proveedor por clave disponible', () => {
  const e = acciones.elegirProveedor;
  assert.equal(e('auto', { FINNHUB_KEY: 'a', TWELVEDATA_KEY: 'b' }), 'finnhub');
  assert.equal(e('auto', { TWELVEDATA_KEY: 'b', ALPHAVANTAGE_KEY: 'c' }), 'twelvedata');
  assert.equal(e('auto', { ALPHAVANTAGE_KEY: 'c' }), 'alphavantage');
  assert.equal(e('alphavantage', { FINNHUB_KEY: 'a', ALPHAVANTAGE_KEY: 'c' }), 'alphavantage');
  assert.throws(() => e('auto', {}), /sin_clave/);
  assert.throws(() => e('finnhub', { TWELVEDATA_KEY: 'x' }), /FINNHUB_KEY/);
  assert.throws(() => e('auto', { FINNHUB_KEY: '  ' }), /sin_clave/);
  assert.equal(e('auto', { FINNHUB_KEY: 'a', TWELVEDATA_KEY: 'b' }, ['twelvedata', 'alphavantage', 'finnhub']), 'twelvedata');
});

test('NFT: Reservoir (ratio a %), nulos y CoinGecko NFT', () => {
  const r = nft.parsearReservoir(J('api/reservoir_collections.json'), 'ethereum');
  assert.equal(r.length, 2);
  assert.equal(r[0].piso, 9.12); assert.equal(r[0].moneda, 'ETH'); assert.equal(r[0].volumen24h, 152.346); assert.equal(r[0].cambio24h, -2.69);
  assert.equal(r[0].ventas24h, 17); assert.equal(r[0].propietarios, 5987); assert.match(r[0].url, /opensea\.io\/collection\/boredapeyachtclub/);
  assert.equal(r[1].piso, null); assert.equal(r[1].cambio24h, null);
  assert.throws(() => nft.parsearReservoir({}), /inesperada/);
  const d = J('api/coingecko_nft.json'); d.id = 'cryptopunks'; d.name = 'CryptoPunks';
  const c = nft.parsearCoingeckoNft(d, 'cryptopunks');
  assert.equal(c.piso, 41.5); assert.equal(c.moneda, 'ETH'); assert.equal(c.cambio24h, -2.35); assert.equal(c.ventas24h, 6); assert.equal(c.url, 'https://www.coingecko.com/en/nft/cryptopunks');
  assert.throws(() => nft.parsearCoingeckoNft({}, 'x'), /sin datos/);
});

test('Cuotas: deportes activos, mercados h2h/totals/spreads, filtros de fecha y limite de casas', () => {
  const dep = cuotas.parsearDeportes(J('api/odds_sports.json'));
  assert.equal(dep.find((d) => d.clave === 'americanfootball_nfl').activo, false);
  const ev = cuotas.parsearEventos(J('api/odds_events.json'), { ahora: AHORA, maxCasas: 2, diasAdelante: 7 });
  assert.deepEqual(ev.map((e) => e.id), ['e1', 'e2']);
  assert.equal(ev[0].casas.length, 2);
  assert.ok(ev[0].casas.some((c) => c.casa === 'Pinnacle'), 'Pinnacle se conserva aunque exceda maxCasas');
  assert.deepEqual(ev[0].casas[0].mercados.spreads, { linea: -1.5, local: 1.91, visitante: 1.95 });
  assert.deepEqual(ev[0].casas[0].mercados.h2h, { local: 1.85, visitante: 3.4, empate: 3.5 });
  assert.deepEqual(ev[0].casas[0].mercados.totales, { linea: 2.5, mas: 1.9, menos: 1.95 });
  const sp = cuotas.mercadosDe({ markets: [{ key: 'spreads', outcomes: [{ name: 'A', price: 1.9, point: -1.5 }, { name: 'B', price: 1.9, point: 1.5 }] }, { key: 'h2h', outcomes: [{ name: 'A', price: 1.5 }, { name: 'B', price: 2.5 }] }] }, { home_team: 'A', away_team: 'B' });
  assert.deepEqual(sp.spreads, { linea: -1.5, local: 1.9, visitante: 1.9 });
  assert.equal(sp.h2h.empate, undefined);
  assert.throws(() => cuotas.parsearEventos({ message: 'Invalid key' }), /inesperados/);
});

test('Noticias: resumen recortado, sin cuerpo completo, ids, categoria de la fuente, fusion y deduplicacion', () => {
  const feed = parsearFeed(leer('feeds/rss_cripto.xml'));
  const fuente = { nombre: 'Cripto A', categoria: 'cripto' };
  const ns = noticias.noticiasDeFeed(feed, fuente, { ahora: AHORA, resumenMax: 80, porFuente: 10 });
  assert.equal(ns.length, 4);
  assert.ok(ns.every((n) => n.resumen.length <= 80));
  assert.ok(!JSON.stringify(ns).includes('FULL ARTICLE BODY'));
  assert.ok(!ns[0].enlace.includes('utm_'));
  assert.equal(ns[0].id.length, 12);
  assert.deepEqual(ns[0].tickers.sort(), ['BTC', 'ETH']);
  assert.ok(ns[0].sentimiento > 0.5);
  assert.equal(ns[3].fecha, AHORA.toISOString());
  const prev = [{ ...ns[3], fecha: '2026-11-04T01:00:00.000Z' }, { ...ns[1], id: 'viejo', titulo: 'Muy viejo', fecha: '2026-10-01T00:00:00.000Z' }];
  const f = noticias.fusionar(ns, prev, { maxItems: 100, maxDias: 10, ahora: AHORA });
  assert.equal(f.find((n) => n.id === ns[3].id).fecha, '2026-11-04T01:00:00.000Z');
  assert.ok(!f.find((n) => n.id === 'viejo'));
  assert.equal(f.filter((n) => n.titulo.startsWith('Bitcoin surges')).length, 1);
  assert.ok(f.every((n) => !('_fechaReal' in n)));
  assert.equal(noticias.fusionar(ns, [], { maxItems: 2, maxDias: 10, ahora: AHORA }).length, 2);
});

test('Ofertas (feed): precio, antes, %, cupon, vence, tienda; pepper; descartes', () => {
  const sd = parsearFeed(leer('feeds/deals_slickdeals.xml'));
  const src = { nombre: 'Slick', moneda: 'USD', idioma: 'en', categoria: 'otros' };
  const o = sd.items.map((i) => ofertas.ofertaDeFeedItem(i, src, { ahora: AHORA }));
  assert.equal(o[0].precio, 109.99); assert.equal(o[0].precioAntes, 179.99); assert.equal(o[0].descuentoPct, 39);
  assert.equal(o[0].cupon, 'SSD25'); assert.equal(o[0].tienda, 'Newegg'); assert.equal(o[0].vence, '2026-11-30T23:59:59.000Z');
  assert.equal(o[0].imagen, 'https://deals.example/img/ssd.jpg'); assert.ok(!o[0].url.includes('utm_'));
  assert.equal(o[1].tienda, 'Amazon');
  assert.equal(o[2].precio, 1299.5); assert.equal(o[2].descuentoPct, 25); assert.equal(o[2].categoria, 'juegos');
  assert.equal(o[3], null);
  assert.equal(o[4].id, o[0].id, 'mismo producto publicado de nuevo = misma clave');
  const pp = parsearFeed(leer('feeds/deals_pepper.xml'));
  const e = pp.items.map((i) => ofertas.ofertaDeFeedItem(i, { nombre: 'Chollos', moneda: 'EUR', idioma: 'es', categoria: 'otros' }, { ahora: AHORA }));
  assert.equal(e[0].precio, 24.99); assert.equal(e[0].precioAntes, 49.99); assert.equal(e[0].descuentoPct, 50); assert.equal(e[0].tienda, 'MediaMarkt');
  assert.equal(e[0].cupon, 'JBL20'); assert.equal(e[0].vence, '2026-11-30T23:59:59.000Z'); assert.equal(e[0].moneda, 'EUR');
  assert.equal(e[1].precio, 39.95); assert.equal(e[1].descuentoPct, 45); assert.equal(e[1].categoria, 'moda');
  assert.equal(e[2], null);
});

test('Ofertas: fusion (duplicados, vencidas, antiguas) e historial de precios', () => {
  const base = { id: 'a', titulo: 'T', tienda: 'S', precio: 10, precioAntes: null, descuentoPct: null, moneda: 'USD', url: 'https://x.example/1', imagen: null, categoria: 'otros', fecha: '2026-11-04T00:00:00.000Z', fuente: 'f', cupon: null, vence: null };
  const nuevas = [{ ...base, precio: 8, fecha: '2026-11-05T10:00:00.000Z', cupon: 'ABCD1' }];
  const previas = [base, { ...base, id: 'b', url: 'https://x.example/2', vence: '2026-11-01T00:00:00.000Z' }, { ...base, id: 'c', url: 'https://x.example/3', fecha: '2026-10-01T00:00:00.000Z' }, { ...base, id: 'd', url: 'https://x.example/1' }];
  const f = ofertas.fusionarOfertas(nuevas, previas, { maxItems: 10, maxDias: 14, ahora: AHORA });
  assert.deepEqual(f.map((x) => x.id), ['a']);
  assert.equal(f[0].precio, 8); assert.equal(f[0].cupon, 'ABCD1');
  const t = AHORA.getTime();
  let h = ofertas.actualizarHistorial({}, new Map([['a', 10]]), { ahora: AHORA, historialDias: 60, maxPuntos: 3 });
  assert.deepEqual(h, { a: [[t, 10]] });
  h = ofertas.actualizarHistorial(h, new Map([['a', 10]]), { ahora: new Date(t + 3600000), historialDias: 60, maxPuntos: 3 });
  assert.equal(h.a.length, 1, 'mismo precio y menos de 24 h: sin punto nuevo');
  h = ofertas.actualizarHistorial(h, new Map([['a', 9]]), { ahora: new Date(t + 7200000), historialDias: 60, maxPuntos: 3 });
  h = ofertas.actualizarHistorial(h, new Map([['a', 12]]), { ahora: new Date(t + 9000000), historialDias: 60, maxPuntos: 3 });
  h = ofertas.actualizarHistorial(h, new Map([['a', 13]]), { ahora: new Date(t + 9900000), historialDias: 60, maxPuntos: 3 });
  assert.deepEqual(h.a.map((p) => p[1]), [9, 12, 13], 'recorta a maxPuntos');
  h = ofertas.actualizarHistorial(h, new Map(), { ahora: new Date(t + 61 * 86400000), historialDias: 60, maxPuntos: 3 });
  assert.deepEqual(h, {});
});
