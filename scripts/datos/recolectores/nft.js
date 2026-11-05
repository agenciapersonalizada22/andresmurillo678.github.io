'use strict';
const { num, redondear } = require('../lib/util');

function parsearReservoir(resp, cadena) {
  const cols = resp && resp.collections;
  if (!Array.isArray(cols)) throw new Error('respuesta de Reservoir inesperada');
  return cols.filter((c) => c && c.id && c.name).map((c) => {
    const precio = c.floorAsk && c.floorAsk.price;
    const cambio = c.floorSaleChange && num(c.floorSaleChange['1day']);
    return {
      id: String(c.id), nombre: String(c.name), cadena,
      piso: precio && precio.amount ? num(precio.amount.decimal) : null,
      moneda: precio && precio.currency ? String(precio.currency.symbol || 'ETH') : 'ETH',
      volumen24h: c.volume ? redondear(c.volume['1day'], 3) : null,
      cambio24h: cambio !== null && cambio !== undefined ? redondear((cambio - 1) * 100, 2) : null,
      ventas24h: c.salesCount ? num(c.salesCount['1day']) : null,
      propietarios: num(c.ownerCount),
      imagen: c.image || null,
      url: c.slug ? `https://opensea.io/collection/${c.slug}` : `https://explorer.reservoir.tools/collection/${c.id}`
    };
  });
}

function parsearCoingeckoNft(d, id) {
  if (!d || !d.name) throw new Error(`CoinGecko NFT sin datos para ${id}`);
  const nativo = (o) => (o && num(o.native_currency) !== null ? num(o.native_currency) : null);
  return {
    id: String(d.id || id), nombre: String(d.name), cadena: String(d.asset_platform_id || 'ethereum'),
    piso: nativo(d.floor_price), moneda: String(d.native_currency_symbol || (d.native_currency || 'eth')).toUpperCase(),
    volumen24h: nativo(d.volume_24h), cambio24h: redondear(d.floor_price_in_usd_24h_percentage_change, 2),
    ventas24h: num(d.one_day_sales), propietarios: num(d.number_of_unique_addresses),
    imagen: d.image && (d.image.small || d.image.small_2x) || null,
    url: `https://www.coingecko.com/en/nft/${d.id || id}`
  };
}

async function viaReservoir(ctx) {
  const c = ctx.config.nft;
  const todas = [];
  for (const ch of c.reservoir.cadenas) {
    const resp = await ctx.http.json(`${ch.base}/collections/v7?sortBy=1DayVolume&limit=${Math.min(c.maxColecciones, 50)}&includeMintStats=false`, { headers: { 'x-api-key': ctx.env.RESERVOIR_KEY } });
    todas.push(...parsearReservoir(resp, ch.nombre));
  }
  if (!todas.length) throw new Error('Reservoir devolvio una lista vacia');
  return todas.slice(0, c.maxColecciones);
}

async function viaCoingecko(ctx) {
  const c = ctx.config.nft;
  const previo = new Map(((ctx.prev('mercados/nft.json') || {}).colecciones || []).map((x) => [x.id, x]));
  const ids = c.coingecko.colecciones.slice(0, c.maxColecciones);
  const key = ctx.env.COINGECKO_KEY;
  const cab = key ? { [ctx.config.cripto.coingecko.cabeceraClave]: key } : {};
  const res = [], errores = [];
  // Rotacion: refresca primero las mas antiguas; las demas conservan el ultimo dato bueno.
  const orden = ids.slice().sort((a, b) => (previo.has(a) ? 1 : 0) - (previo.has(b) ? 1 : 0));
  const lote = key ? 20 : 8;
  const refrescar = new Set(orden.slice(0, lote));
  for (const id of ids) {
    if (refrescar.has(id)) {
      try { res.push(parsearCoingeckoNft(await ctx.http.json(`${c.coingecko.base}/nfts/${encodeURIComponent(id)}`, { headers: cab }), id)); continue; }
      catch (e) { errores.push(`${id}: ${e.message}`); }
    }
    if (previo.has(id)) res.push(previo.get(id));
  }
  if (!res.length) throw new Error('CoinGecko NFT sin datos: ' + errores.slice(0, 3).join(' | '));
  return { res, errores };
}

async function ejecutar(ctx) {
  const c = ctx.config.nft;
  const hayReservoir = !!ctx.env.RESERVOIR_KEY;
  const orden = c.proveedor === 'auto' ? (hayReservoir ? ['reservoir', 'coingecko'] : ['coingecko']) : [c.proveedor];
  const fallos = [];
  for (const prov of orden) {
    try {
      if (prov === 'reservoir') {
        if (!hayReservoir) throw new Error('sin_clave: falta RESERVOIR_KEY');
        const cols = await viaReservoir(ctx);
        return { items: cols.length, archivos: { 'mercados/nft.json': { generado: ctx.ahora.toISOString(), fuente: 'Reservoir', colecciones: cols } }, detalle: fallos.length ? { fallos } : undefined };
      }
      const { res, errores } = await viaCoingecko(ctx);
      const detalle = {};
      if (fallos.length) detalle.fallos = fallos;
      if (errores.length) detalle.errores = errores.slice(0, 8);
      return { items: res.length, archivos: { 'mercados/nft.json': { generado: ctx.ahora.toISOString(), fuente: 'CoinGecko NFT', colecciones: res } }, detalle: Object.keys(detalle).length ? detalle : undefined };
    } catch (e) { fallos.push(`${prov}: ${e.message}`); }
  }
  throw new Error(fallos.join(' | '));
}

module.exports = { parsearReservoir, parsearCoingeckoNft, tareas: [{ id: 'nft', grupo: 'lentos', activo: (c) => c.nft.activo, ejecutar }] };
