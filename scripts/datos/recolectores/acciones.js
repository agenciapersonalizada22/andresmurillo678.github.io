'use strict';
const { num, redondear, fechaISO } = require('../lib/util');

const ORDEN = ['finnhub', 'twelvedata', 'alphavantage'];
const ORDEN_HIST = ['twelvedata', 'alphavantage', 'finnhub'];
const VAR_CLAVE = { finnhub: 'FINNHUB_KEY', twelvedata: 'TWELVEDATA_KEY', alphavantage: 'ALPHAVANTAGE_KEY' };

function elegirProveedor(pedido, env, orden = ORDEN) {
  const tiene = (p) => !!(env[VAR_CLAVE[p]] && String(env[VAR_CLAVE[p]]).trim());
  if (pedido && pedido !== 'auto') {
    if (!tiene(pedido)) throw new Error(`sin_clave: el proveedor "${pedido}" requiere el secreto ${VAR_CLAVE[pedido]}`);
    return pedido;
  }
  const p = orden.find(tiene);
  if (!p) throw new Error('sin_clave: define FINNHUB_KEY, TWELVEDATA_KEY o ALPHAVANTAGE_KEY como secreto del repositorio (ver herramientas/datos/CONFIGURAR-DATOS.md)');
  return p;
}

const base = (ref, extra) => ({
  simbolo: ref.simbolo, nombre: ref.nombre, bolsa: ref.bolsa || null, precio: null, cambio: null, cambioPct: null,
  apertura: null, max: null, min: null, cierreAnt: null, volumen: null, hora: null, ...extra
});

function parsearFinnhubQuote(q, ref) {
  if (!q || typeof q !== 'object' || (q.error)) throw new Error('respuesta de Finnhub inesperada' + (q && q.error ? ': ' + q.error : ''));
  if (!num(q.c) || (!q.t && !q.pc)) throw new Error(`Finnhub sin datos para ${ref.simbolo}`);
  return base(ref, {
    precio: num(q.c), cambio: redondear(q.d, 4), cambioPct: redondear(q.dp, 2), apertura: num(q.o), max: num(q.h), min: num(q.l),
    cierreAnt: num(q.pc), hora: q.t ? new Date(q.t * 1000).toISOString() : null
  });
}
function parsearFinnhubPerfil(p) {
  if (!p || typeof p !== 'object') return {};
  return { nombre: p.name || undefined, bolsa: p.exchange ? String(p.exchange).split(' ')[0] : undefined, capitalizacion: num(p.marketCapitalization) ? num(p.marketCapitalization) * 1e6 : undefined };
}

function parsearTwelveQuote(q, ref) {
  if (!q || typeof q !== 'object' || q.status === 'error' || q.code >= 400) throw new Error(`Twelve Data: ${(q && q.message) || 'respuesta inesperada'}`.slice(0, 200));
  const ts = num(q.timestamp);
  return base(ref, {
    nombre: ref.nombre || q.name, bolsa: ref.bolsa || q.exchange || null,
    precio: num(q.close), cambio: redondear(q.change, 4), cambioPct: redondear(q.percent_change, 2), apertura: num(q.open), max: num(q.high),
    min: num(q.low), cierreAnt: num(q.previous_close), volumen: num(q.volume),
    hora: ts ? new Date(ts * 1000).toISOString() : fechaISO(q.datetime)
  });
}
function repartirTwelve(resp, refs) {
  const out = new Map(), errores = [];
  if (!resp || typeof resp !== 'object') throw new Error('respuesta de Twelve Data inesperada');
  if (refs.length === 1 && !(refs[0].simbolo in resp)) resp = { [refs[0].simbolo]: resp };
  for (const r of refs) {
    try { out.set(r.simbolo, parsearTwelveQuote(resp[r.simbolo], r)); } catch (e) { errores.push(`${r.simbolo}: ${e.message}`); }
  }
  return { out, errores };
}

function parsearAlphaQuote(resp, ref) {
  if (resp && (resp.Note || resp.Information)) throw new Error('Alpha Vantage: limite de tasa del plan alcanzado');
  if (resp && resp['Error Message']) throw new Error('Alpha Vantage: simbolo no valido');
  const g = resp && resp['Global Quote'];
  if (!g || !num(g['05. price'])) throw new Error(`Alpha Vantage sin datos para ${ref.simbolo}`);
  const dia = g['07. latest trading day'];
  return base(ref, {
    precio: num(g['05. price']), cambio: redondear(g['09. change'], 4), cambioPct: redondear(g['10. change percent'], 2), apertura: num(g['02. open']),
    max: num(g['03. high']), min: num(g['04. low']), cierreAnt: num(g['08. previous close']), volumen: num(g['06. volume']),
    hora: dia ? fechaISO(dia + 'T21:00:00Z') : null
  });
}

// ---- Historico ----
function parsearVelasFinnhub(r) {
  if (!r || r.s !== 'ok' || !Array.isArray(r.t)) throw new Error('Finnhub candle no disponible (suele requerir plan de pago)');
  return r.t.map((t, i) => [t * 1000, r.o[i], r.h[i], r.l[i], r.c[i], r.v ? r.v[i] : null]);
}
function parsearVelasTwelve(r) {
  if (!r || r.status === 'error' || !Array.isArray(r.values)) throw new Error(`Twelve Data: ${(r && r.message) || 'serie inesperada'}`.slice(0, 200));
  return r.values.map((v) => [Date.parse(v.datetime + 'T00:00:00Z'), num(v.open), num(v.high), num(v.low), num(v.close), num(v.volume)]).sort((a, b) => a[0] - b[0]);
}
function parsearVelasAlpha(r) {
  if (r && (r.Note || r.Information)) throw new Error('Alpha Vantage: limite de tasa o endpoint premium');
  const s = r && r['Time Series (Daily)'];
  if (!s) throw new Error('Alpha Vantage: serie inesperada');
  return Object.keys(s).sort().map((d) => [Date.parse(d + 'T00:00:00Z'), num(s[d]['1. open']), num(s[d]['2. high']), num(s[d]['3. low']), num(s[d]['4. close']), num(s[d]['5. volume'])]);
}
function unirVelas(previas, nuevas, dias) {
  const m = new Map();
  for (const v of (previas || []).concat(nuevas)) if (v.slice(0, 5).every(Number.isFinite)) m.set(v[0], v);
  return [...m.values()].sort((a, b) => a[0] - b[0]).slice(-dias);
}

async function cotizar(ctx, prov, refs) {
  const cfg = ctx.config.acciones.proveedores[prov];
  const key = encodeURIComponent(ctx.env[VAR_CLAVE[prov]]);
  const out = new Map(), errores = [];
  if (prov === 'twelvedata') {
    const lista = refs.map((r) => r.simbolo).join(',');
    const resp = await ctx.http.json(`${cfg.base}/quote?symbol=${encodeURIComponent(lista)}&apikey=${key}`);
    const r = repartirTwelve(resp, refs);
    return { out: r.out, errores: r.errores };
  }
  for (const ref of refs) {
    try {
      if (prov === 'finnhub') {
        out.set(ref.simbolo, parsearFinnhubQuote(await ctx.http.json(`${cfg.base}/quote?symbol=${encodeURIComponent(ref.simbolo)}&token=${key}`), ref));
      } else {
        out.set(ref.simbolo, parsearAlphaQuote(await ctx.http.json(`${cfg.base}/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ref.simbolo)}&apikey=${key}`), ref));
      }
    } catch (e) {
      errores.push(`${ref.simbolo}: ${e.message}`);
      if (/limite de tasa|HTTP 429/.test(e.message)) break;
    }
  }
  return { out, errores };
}

async function tareaCotizaciones(ctx) {
  const c = ctx.config.acciones;
  const prov = elegirProveedor(c.proveedor, ctx.env);
  const previo = ctx.prev('mercados/acciones.json') || {};
  const prevMap = new Map((previo.items || []).concat(previo.indices || []).map((i) => [i.simbolo, i]));
  const refs = c.simbolos.map((s) => ({ ...s, esIndice: false })).concat((c.indices || []).map((s) => ({ ...s, esIndice: true })));
  const hora = (r) => { const p = prevMap.get(r.simbolo); return p && p.hora ? Date.parse(p.hora) || 0 : -1; };
  const pendientes = refs.slice().sort((a, b) => hora(a) - hora(b)).slice(0, c.proveedores[prov].porEjecucion);
  const { out, errores } = await cotizar(ctx, prov, pendientes);
  if (!out.size) throw new Error(`${prov}: ninguna cotizacion obtenida -> ${errores.slice(0, 3).join(' | ')}`);

  for (const it of out.values()) if (!it.hora) it.hora = ctx.ahora.toISOString();
  if (prov === 'finnhub') { // perfil (capitalizacion) una sola vez por simbolo, con tope por ejecucion
    let n = 0;
    for (const [s, it] of out) {
      const p = prevMap.get(s);
      if (p && p.capitalizacion) { it.capitalizacion = p.capitalizacion; continue; }
      if (n >= 4 || it.esIndice) continue;
      n++;
      try {
        const perfil = parsearFinnhubPerfil(await ctx.http.json(`${c.proveedores.finnhub.base}/stock/profile2?symbol=${encodeURIComponent(s)}&token=${encodeURIComponent(ctx.env.FINNHUB_KEY)}`));
        if (perfil.capitalizacion) it.capitalizacion = perfil.capitalizacion;
      } catch { /* opcional */ }
    }
  } else {
    for (const [s, it] of out) { const p = prevMap.get(s); if (p && p.capitalizacion) it.capitalizacion = p.capitalizacion; if (p && p.pe) it.pe = p.pe; }
  }

  const armar = (lista) => lista.map((r) => out.get(r.simbolo) || prevMap.get(r.simbolo)).filter(Boolean);
  const items = armar(c.simbolos), indices = armar(c.indices || []);
  const detalle = { proveedor: prov, actualizados: out.size, rotacion: `${pendientes.length}/${refs.length} simbolos por ejecucion` };
  if (errores.length) detalle.errores = errores.slice(0, 8);
  return {
    items: items.length + indices.length,
    archivos: { 'mercados/acciones.json': { generado: ctx.ahora.toISOString(), fuente: { finnhub: 'Finnhub', twelvedata: 'Twelve Data', alphavantage: 'Alpha Vantage' }[prov], moneda: c.moneda, items, indices } },
    detalle
  };
}

async function tareaHist(ctx) {
  const h = ctx.config.acciones.hist;
  const prov = elegirProveedor(h.proveedor, ctx.env, ORDEN_HIST);
  const cfg = ctx.config.acciones.proveedores[prov];
  const key = encodeURIComponent(ctx.env[VAR_CLAVE[prov]]);
  const ahora = ctx.ahora.getTime();
  const cand = h.simbolos.map((s) => {
    const ruta = `mercados/acciones_hist/${s}.json`;
    const p = ctx.prev(ruta);
    return { s, ruta, p, edad: p && p.generado ? ahora - Date.parse(p.generado) : Infinity };
  }).filter((x) => x.edad > h.cadaHoras * 3600000).sort((a, b) => b.edad - a.edad).slice(0, h.maxPorEjecucion);
  const archivos = {}, errores = [];
  for (const { s, ruta, p } of cand) {
    try {
      const sim = encodeURIComponent(s);
      let velas;
      if (prov === 'twelvedata') velas = parsearVelasTwelve(await ctx.http.json(`${cfg.base}/time_series?symbol=${sim}&interval=1day&outputsize=${h.dias}&apikey=${key}`));
      else if (prov === 'alphavantage') velas = parsearVelasAlpha(await ctx.http.json(`${cfg.base}/query?function=TIME_SERIES_DAILY&symbol=${sim}&outputsize=compact&apikey=${key}`));
      else {
        const hasta = Math.floor(ahora / 1000);
        velas = parsearVelasFinnhub(await ctx.http.json(`${cfg.base}/stock/candle?symbol=${sim}&resolution=D&from=${hasta - h.dias * 86400}&to=${hasta}&token=${key}`));
      }
      archivos[ruta] = { simbolo: s, generado: ctx.ahora.toISOString(), fuente: prov, velas: unirVelas(p && p.velas, velas, h.dias) };
    } catch (e) { errores.push(`${s}: ${e.message}`); if (/limite de tasa|HTTP 429/.test(e.message)) break; }
  }
  if (!Object.keys(archivos).length && errores.length) throw new Error(errores.slice(0, 3).join(' | '));
  return { items: Object.keys(archivos).length, archivos, detalle: errores.length ? { proveedor: prov, errores } : { proveedor: prov } };
}

module.exports = {
  elegirProveedor, parsearFinnhubQuote, parsearFinnhubPerfil, parsearTwelveQuote, repartirTwelve, parsearAlphaQuote,
  parsearVelasFinnhub, parsearVelasTwelve, parsearVelasAlpha, unirVelas,
  tareas: [
    { id: 'acciones', grupo: 'rapidos', activo: (c) => c.acciones.activo, ejecutar: tareaCotizaciones },
    { id: 'acciones_hist', grupo: 'lentos', activo: (c) => c.acciones.activo && c.acciones.hist.activo, ejecutar: tareaHist }
  ]
};
