'use strict';
// fetch simulado para el modo --offline y las pruebas: responde con los archivos de esta carpeta.
const fs = require('node:fs');
const path = require('node:path');

const AHORA = new Date('2026-11-05T12:00:00.000Z');
const ENV_OFFLINE = { FINNHUB_KEY: 'test-finnhub', ODDS_API_KEY: 'test-odds', BRAVE_SEARCH_KEY: 'test-brave' };

const leer = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const json = (rel, cambios) => { let t = leer(rel); if (cambios) for (const [a, b] of Object.entries(cambios)) t = t.split(a).join(b); return { cuerpo: t, tipo: 'application/json' }; };
const xml = (rel) => ({ cuerpo: leer(rel), tipo: 'application/xml' });
const html = (rel) => ({ cuerpo: leer(rel), tipo: 'text/html' });
const estado = (status, cuerpo = '', tipo = 'text/plain', headers = {}) => ({ status, cuerpo, tipo, headers });
const titulo = (id) => id.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join(' ');

function reglas() {
  return [
    [/api\.coingecko\.com\/api\/v3\/coins\/markets/, () => json('api/coingecko_markets.json')],
    [/api\.coingecko\.com\/api\/v3\/coins\/[^/]+\/ohlc/, () => json('api/coingecko_ohlc.json')],
    [/api\.coingecko\.com\/api\/v3\/nfts\/([a-z0-9-]+)/, (u, m) => json('api/coingecko_nft.json', { __ID__: m[1], __NAME__: titulo(m[1]) })],
    [/data-api\.binance\.vision\/api\/v3\/ticker\/24hr/, () => json('api/binance_ticker24.json')],
    [/data-api\.binance\.vision\/api\/v3\/klines\?symbol=XYZUSDT/, () => estado(400, '{"code":-1121,"msg":"Invalid symbol."}', 'application/json')],
    [/data-api\.binance\.vision\/api\/v3\/klines/, () => json('api/binance_klines.json')],
    [/api\.coincap\.io\/v2\/assets/, () => json('api/coincap_assets.json')],
    [/api\.frankfurter\.dev\/v1\/currencies/, () => json('api/frankfurter_currencies.json')],
    [/api\.frankfurter\.dev\/v1\/latest/, () => json('api/frankfurter_latest.json')],
    [/api\.frankfurter\.dev\/v1\/\d{4}-\d{2}-\d{2}\.\./, () => json('api/frankfurter_series.json')],
    [/open\.er-api\.com\/v6\/latest\/USD/, () => json('api/erapi_latest.json')],
    [/finnhub\.io\/api\/v1\/quote\?symbol=ZZZZ/, () => json('api/finnhub_quote_vacio.json')],
    [/finnhub\.io\/api\/v1\/quote/, () => json('api/finnhub_quote.json')],
    [/finnhub\.io\/api\/v1\/stock\/profile2/, () => json('api/finnhub_profile.json')],
    [/finnhub\.io\/api\/v1\/stock\/candle/, () => json('api/finnhub_candle.json')],
    [/api\.twelvedata\.com\/quote\?symbol=([^&]+)/, (u, m) => {
      const syms = decodeURIComponent(m[1]).split(',');
      const base = JSON.parse(leer('api/twelvedata_quote.json'));
      const una = (s) => (s === 'ZZZZ' ? { code: 400, message: '**symbol** not found: ZZZZ', status: 'error' } : { ...base, symbol: s });
      return { cuerpo: JSON.stringify(syms.length === 1 ? una(syms[0]) : Object.fromEntries(syms.map((s) => [s, una(s)]))), tipo: 'application/json' };
    }],
    [/api\.twelvedata\.com\/time_series/, () => json('api/twelvedata_series.json')],
    [/alphavantage\.co\/query\?function=GLOBAL_QUOTE/, () => json('api/alphavantage_quote.json')],
    [/alphavantage\.co\/query\?function=TIME_SERIES_DAILY/, () => json('api/alphavantage_daily.json')],
    [/api\.reservoir\.tools\/collections\/v7/, () => json('api/reservoir_collections.json')],
    [/api\.the-odds-api\.com\/v4\/sports\/\?apiKey/, () => json('api/odds_sports.json')],
    [/api\.the-odds-api\.com\/v4\/sports\/[a-z_]+\/odds/, () => ({ ...json('api/odds_events.json'), headers: { 'x-requests-remaining': '480', 'x-requests-used': '20', 'x-requests-last': '2' } })],
    [/api\.search\.brave\.com\/res\/v1\/web\/search/, () => json('api/brave_search.json')],
    [/feeds\.example\/cripto\.xml/, () => xml('feeds/rss_cripto.xml')],
    [/feeds\.example\/bolsa\.atom/, () => xml('feeds/atom_bolsa.xml')],
    [/feeds\.example\/general\.rdf/, () => xml('feeds/rdf_general.xml')],
    [/feeds\.example\/deportes\.xml/, () => xml('feeds/rss_deportes.xml')],
    [/feeds\.example\/slickdeals\.xml/, () => xml('feeds/deals_slickdeals.xml')],
    [/feeds\.example\/pepper\.xml/, () => xml('feeds/deals_pepper.xml')],
    [/feeds\.example\/html\.xml/, () => html('feeds/pagina_no_feed.html')],
    [/feeds\.example\/caido\.xml/, () => { throw new TypeError('fetch failed'); }],
    [/feeds\.example\/404\.xml/, () => estado(404, 'Not Found')],
    [/tienda\.example\/robots\.txt/, () => ({ cuerpo: leer('html/robots_tienda.txt'), tipo: 'text/plain' })],
    [/tienda\.example\/sitemap\.xml/, () => xml('html/sitemap.xml')],
    [/tienda\.example\/producto\/ssd-2tb/, () => html('html/producto_ssd.html')],
    [/tienda\.example\/ofertas\/listado/, () => html('html/listado_ofertas.html')],
    [/tienda\.example\/privado\//, () => html('html/producto_ssd.html')],
    [/^https:\/\/[^/]+\.example\/robots\.txt/, () => estado(404, 'Not Found')]
  ];
}

function crearFetch() {
  const lista = reglas();
  const f = async (url, init = {}) => {
    f.registro.push({ url: String(url), headers: init.headers || {} });
    for (const [re, h] of lista) {
      const m = re.exec(String(url));
      if (!m) continue;
      const r = h(new URL(url), m);
      return new Response(r.cuerpo, { status: r.status || 200, headers: { 'content-type': r.tipo || 'text/plain', ...(r.headers || {}) } });
    }
    f.noMapeadas.push(String(url));
    return new Response('fixture no encontrada', { status: 404 });
  };
  f.registro = [];
  f.noMapeadas = [];
  f.agregar = (re, h) => lista.unshift([re, h]);
  return f;
}

module.exports = { AHORA, ENV_OFFLINE, crearFetch, leer };
