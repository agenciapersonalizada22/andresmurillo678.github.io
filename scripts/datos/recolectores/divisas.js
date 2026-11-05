'use strict';
const { num, cifras } = require('../lib/util');

function parsearFrankfurter(resp) {
  if (!resp || typeof resp.rates !== 'object' || !resp.rates) throw new Error('respuesta de Frankfurter inesperada');
  const tasas = {};
  for (const [k, v] of Object.entries(resp.rates)) if (num(v) > 0) tasas[k] = cifras(v, 8);
  return { fecha: resp.date, tasas };
}
function parsearSerieFrankfurter(resp) {
  if (!resp || typeof resp.rates !== 'object' || !resp.rates) throw new Error('serie de Frankfurter inesperada');
  const hist = {};
  for (const fecha of Object.keys(resp.rates).sort()) {
    for (const [m, v] of Object.entries(resp.rates[fecha])) {
      if (num(v) > 0) (hist[m] = hist[m] || []).push([fecha, cifras(v, 6)]);
    }
  }
  return hist;
}
function parsearErApi(resp) {
  if (!resp || resp.result !== 'success' || !resp.rates) throw new Error('respuesta de open.er-api.com inesperada' + (resp && resp['error-type'] ? ': ' + resp['error-type'] : ''));
  const tasas = {};
  for (const [k, v] of Object.entries(resp.rates)) if (num(v) > 0) tasas[k] = cifras(v, 8);
  return { fecha: resp.time_last_update_utc ? new Date(resp.time_last_update_utc).toISOString().slice(0, 10) : null, tasas };
}

const fechaCorta = (d) => d.toISOString().slice(0, 10);

async function ejecutar(ctx) {
  const c = ctx.config.divisas;
  const quiero = c.monedas.filter((m) => m !== 'USD');
  const previo = ctx.prev('mercados/divisas.json') || {};
  const tasas = {};
  const hist = {};
  const fuentes = [];
  const detalle = {};

  let soportadas = null;
  try { soportadas = Object.keys(await ctx.http.json(`${c.frankfurter.base}/currencies`)); } catch (e) { detalle.frankfurterMonedas = e.message; }
  const paraFrank = soportadas ? quiero.filter((m) => soportadas.includes(m)) : quiero;

  let fechaFrank = null;
  if (paraFrank.length) {
    try {
      const r = parsearFrankfurter(await ctx.http.json(`${c.frankfurter.base}/latest?base=USD&symbols=${paraFrank.join(',')}`));
      Object.assign(tasas, r.tasas);
      fechaFrank = r.fecha;
      if (Object.keys(r.tasas).length) fuentes.push('Frankfurter (BCE)');
    } catch (e) { detalle.frankfurter = e.message; }
    const ph = previo.hist || {};
    const reutil = fechaFrank && paraFrank.every((m) => !tasas[m] || (ph[m] && ph[m].length > 100 && ph[m][ph[m].length - 1][0] === fechaFrank));
    if (reutil) { for (const m of paraFrank) if (ph[m]) hist[m] = ph[m]; }
    else if (Object.keys(tasas).length) {
      try {
        const fin = ctx.ahora, ini = new Date(fin.getTime() - c.histDias * 86400000);
        const serie = parsearSerieFrankfurter(await ctx.http.json(`${c.frankfurter.base}/${fechaCorta(ini)}..${fechaCorta(fin)}?base=USD&symbols=${paraFrank.join(',')}`, { timeoutMs: 30000 }));
        Object.assign(hist, serie);
      } catch (e) { detalle.frankfurterHist = e.message; }
    }
  }

  const faltan = quiero.filter((m) => !(m in tasas));
  if (faltan.length) {
    try {
      const r = parsearErApi(await ctx.http.json(`${c.erapi.base}/latest/USD`));
      for (const m of faltan) if (r.tasas[m]) tasas[m] = r.tasas[m];
      fuentes.push('open.er-api.com');
    } catch (e) { detalle.erapi = e.message; }
  }

  // Monedas sin serie historica del BCE: acumular una muestra diaria sobre el historico previo.
  const hoy = fechaCorta(ctx.ahora);
  for (const m of quiero) {
    if (!tasas[m]) continue;
    if (!hist[m] || !hist[m].length) {
      const prev = ((previo.hist || {})[m] || []).filter((p) => p[0] !== hoy);
      hist[m] = prev.concat([[hoy, tasas[m]]]);
      const vistos = new Set();
      hist[m] = hist[m].filter((p) => (vistos.has(p[0]) ? false : vistos.add(p[0]))).slice(-c.histDias);
    }
  }
  const sinDato = quiero.filter((m) => !tasas[m]);
  if (sinDato.length === quiero.length) throw new Error('ninguna fuente de divisas respondio: ' + Object.values(detalle).join(' | '));
  // Conserva ultimo valor bueno de monedas que fallaron esta vez.
  for (const m of sinDato) if (previo.tasas && previo.tasas[m]) { tasas[m] = previo.tasas[m]; if (previo.hist && previo.hist[m]) hist[m] = previo.hist[m]; }
  if (sinDato.length) detalle.sinDatoNuevo = sinDato;

  tasas.USD = 1;
  const ordenadas = {};
  for (const m of ['USD'].concat(quiero)) if (tasas[m]) ordenadas[m] = tasas[m];
  return {
    items: Object.keys(ordenadas).length,
    archivos: { 'mercados/divisas.json': { generado: ctx.ahora.toISOString(), fuente: fuentes.join(' + ') || 'conservado', base: 'USD', tasas: ordenadas, hist } },
    detalle: Object.keys(detalle).length ? detalle : undefined
  };
}

module.exports = {
  parsearFrankfurter, parsearSerieFrankfurter, parsearErApi,
  tareas: [{ id: 'divisas', grupo: 'rapidos', activo: (c) => c.divisas.activo, ejecutar }]
};
