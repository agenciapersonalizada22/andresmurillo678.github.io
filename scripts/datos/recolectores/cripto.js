'use strict';
const { num, cifras, redondear, fechaISO } = require('../lib/util');

function reducir(arr, puntos) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const a = arr.map(Number).filter(Number.isFinite);
  if (a.length <= puntos) return a.map((x) => cifras(x, 6));
  const out = [];
  for (let i = 0; i < puntos; i++) out.push(cifras(a[Math.round((i * (a.length - 1)) / (puntos - 1))], 6));
  return out;
}

function parsearCoingecko(arr, { puntos = 84 } = {}) {
  if (!Array.isArray(arr)) throw new Error('respuesta de CoinGecko inesperada (no es un arreglo)');
  return arr.filter((c) => c && c.id && num(c.current_price) !== null).map((c) => ({
    id: String(c.id), simbolo: String(c.symbol || '').toUpperCase(), nombre: String(c.name || c.id),
    precio: cifras(c.current_price, 8),
    cambio1h: redondear(c.price_change_percentage_1h_in_currency, 2),
    cambio24h: redondear(c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h, 2),
    cambio7d: redondear(c.price_change_percentage_7d_in_currency, 2),
    capitalizacion: num(c.market_cap), volumen24h: num(c.total_volume),
    sparkline7d: reducir(c.sparkline_in_7d && c.sparkline_in_7d.price, puntos)
  }));
}

const IGNORAR_BINANCE = /(UP|DOWN|BULL|BEAR)USDT$/;
const STABLES = new Set(['USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'EUR', 'AEUR', 'BUSD', 'USDE', 'XUSD', 'PYUSD']);
function parsearBinance(arr, { top = 250, previo = [] } = {}) {
  if (!Array.isArray(arr)) throw new Error('respuesta de Binance inesperada');
  const porSimbolo = new Map(previo.map((p) => [p.simbolo, p]));
  return arr
    .filter((t) => t && /USDT$/.test(t.symbol) && !IGNORAR_BINANCE.test(t.symbol) && !STABLES.has(t.symbol.slice(0, -4)) && num(t.lastPrice) > 0)
    .sort((a, b) => num(b.quoteVolume) - num(a.quoteVolume)).slice(0, top)
    .map((t) => {
      const s = t.symbol.slice(0, -4);
      const p = porSimbolo.get(s);
      return {
        id: p ? p.id : s.toLowerCase(), simbolo: s, nombre: p ? p.nombre : s, precio: cifras(t.lastPrice, 8),
        cambio1h: null, cambio24h: redondear(t.priceChangePercent, 2), cambio7d: p ? p.cambio7d : null,
        capitalizacion: p ? p.capitalizacion : null, volumen24h: num(t.quoteVolume), sparkline7d: p ? p.sparkline7d : []
      };
    });
}

function parsearCoincap(resp, { top = 250, previo = [] } = {}) {
  const arr = resp && resp.data;
  if (!Array.isArray(arr)) throw new Error('respuesta de CoinCap inesperada');
  const porId = new Map(previo.map((p) => [p.id, p]));
  return arr.filter((a) => a && a.id && num(a.priceUsd) !== null).slice(0, top).map((a) => {
    const p = porId.get(a.id);
    return {
      id: String(a.id), simbolo: String(a.symbol).toUpperCase(), nombre: String(a.name), precio: cifras(a.priceUsd, 8),
      cambio1h: null, cambio24h: redondear(a.changePercent24Hr, 2), cambio7d: p ? p.cambio7d : null,
      capitalizacion: num(a.marketCapUsd), volumen24h: num(a.volumeUsd24Hr), sparkline7d: p ? p.sparkline7d : []
    };
  });
}

// Velas diarias [tMs,o,h,l,c,v]
function parsearKlinesBinance(arr) {
  if (!Array.isArray(arr)) throw new Error('klines de Binance inesperados');
  return arr.map((k) => [Number(k[0]), Number(k[1]), Number(k[2]), Number(k[3]), Number(k[4]), Number(k[7])]).filter((v) => v.every(Number.isFinite));
}
function parsearOhlcCoingecko(arr) {
  if (!Array.isArray(arr)) throw new Error('OHLC de CoinGecko inesperado');
  // La API devuelve 1 vela por dia cuando days>=91 (inicio de vela UTC).
  return arr.map((k) => [Number(k[0]), Number(k[1]), Number(k[2]), Number(k[3]), Number(k[4]), null]).filter((v) => v.slice(0, 5).every(Number.isFinite));
}

async function mercados(ctx) {
  const c = ctx.config.cripto;
  const previo = (ctx.prev('mercados/cripto.json') || {}).items || [];
  const fallos = [];
  for (const prov of c.proveedores) {
    try {
      if (prov === 'coingecko') {
        const key = ctx.env.COINGECKO_KEY;
        const url = `${c.coingecko.base}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${c.top}&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d`;
        const datos = await ctx.http.json(url, { headers: key ? { [c.coingecko.cabeceraClave]: key } : {} });
        const items = parsearCoingecko(datos, { puntos: c.sparklinePuntos });
        if (!items.length) throw new Error('CoinGecko devolvio una lista vacia');
        return { items, fuente: 'CoinGecko' + (key ? ' (clave demo)' : ''), fallos };
      }
      if (prov === 'binance') {
        const datos = await ctx.http.json(`${c.binance.base}/ticker/24hr`);
        const items = parsearBinance(datos, { top: c.top, previo });
        if (!items.length) throw new Error('Binance devolvio una lista vacia');
        return { items, fuente: 'Binance (respaldo)', fallos };
      }
      if (prov === 'coincap') {
        const key = ctx.env.COINCAP_KEY;
        const datos = await ctx.http.json(`${c.coincap.base}/assets?limit=${c.top}`, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
        const items = parsearCoincap(datos, { top: c.top, previo });
        if (!items.length) throw new Error('CoinCap devolvio una lista vacia');
        return { items, fuente: 'CoinCap (respaldo)', fallos };
      }
    } catch (e) { fallos.push(`${prov}: ${e.message}`); }
  }
  throw new Error('todos los proveedores fallaron -> ' + fallos.join(' | '));
}

async function historicos(ctx, items) {
  const h = ctx.config.cripto.hist;
  const archivos = {};
  const errores = [];
  if (!h.activo || !h.top) return { archivos, errores, items: 0 };
  const ahora = ctx.ahora.getTime();
  const candidatos = items.slice(0, h.top).map((it) => {
    const ruta = `mercados/cripto_hist/${it.id}.json`;
    const p = ctx.prev(ruta);
    const edad = p && p.generado ? ahora - Date.parse(p.generado) : Infinity;
    return { it, ruta, edad };
  }).filter((x) => x.edad > h.cadaHoras * 3600000 && /^[a-z0-9._-]+$/.test(x.it.id)).sort((a, b) => b.edad - a.edad).slice(0, h.maxPorEjecucion);
  let cg = 0;
  for (const { it, ruta } of candidatos) {
    let velas = null, fuente = null;
    try {
      const datos = await ctx.http.json(`${ctx.config.cripto.binance.base}/klines?symbol=${encodeURIComponent(it.simbolo)}USDT&interval=1d&limit=${h.dias}`);
      velas = parsearKlinesBinance(datos); fuente = 'Binance';
    } catch { /* simbolo no listado: probar CoinGecko */ }
    if ((!velas || !velas.length) && cg < h.maxCoingecko) {
      cg++;
      try {
        const key = ctx.env.COINGECKO_KEY;
        const cgc = ctx.config.cripto.coingecko;
        const datos = await ctx.http.json(`${cgc.base}/coins/${encodeURIComponent(it.id)}/ohlc?vs_currency=usd&days=${h.dias}`, { headers: key ? { [cgc.cabeceraClave]: key } : {} });
        velas = parsearOhlcCoingecko(datos); fuente = 'CoinGecko';
      } catch (e) { errores.push(`${it.id}: ${e.message}`); }
    }
    if (velas && velas.length) archivos[ruta] = { id: it.id, generado: ctx.ahora.toISOString(), fuente, velas: velas.slice(-h.dias) };
  }
  return { archivos, errores, items: Object.keys(archivos).length };
}

async function tareaMercados(ctx) {
  const m = await mercados(ctx);
  return {
    items: m.items.length,
    archivos: { 'mercados/cripto.json': { generado: ctx.ahora.toISOString(), fuente: m.fuente, items: m.items } },
    detalle: m.fallos.length ? { fallosProveedor: m.fallos } : undefined
  };
}
async function tareaHist(ctx) {
  const items = (ctx.prev('mercados/cripto.json') || {}).items;
  if (!items || !items.length) throw new Error('aun no hay mercados/cripto.json del que tomar el top');
  const r = await historicos(ctx, items);
  if (!r.items && r.errores.length) throw new Error(r.errores[0]);
  return { items: r.items, archivos: r.archivos, detalle: r.errores.length ? { errores: r.errores.slice(0, 10) } : undefined };
}

module.exports = {
  parsearCoingecko, parsearBinance, parsearCoincap, parsearKlinesBinance, parsearOhlcCoingecko, reducir,
  tareas: [
    { id: 'cripto', grupo: 'rapidos', activo: (c) => c.cripto.activo, ejecutar: tareaMercados },
    { id: 'cripto_hist', grupo: 'lentos', activo: (c) => c.cripto.activo && c.cripto.hist.activo, ejecutar: tareaHist }
  ]
};
