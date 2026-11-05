'use strict';
const { num, redondear, fechaISO } = require('../lib/util');

function parsearDeportes(arr) {
  if (!Array.isArray(arr)) throw new Error('lista de deportes de The Odds API inesperada');
  return arr.filter((s) => s && s.key).map((s) => ({ clave: s.key, nombre: s.title || s.key, activo: s.active !== false, grupo: s.group || '' }));
}

function mercadosDe(casa, ev) {
  const m = {};
  for (const mk of casa.markets || []) {
    const outs = mk.outcomes || [];
    if (mk.key === 'h2h') {
      const l = outs.find((o) => o.name === ev.home_team), v = outs.find((o) => o.name === ev.away_team), e = outs.find((o) => /^draw$/i.test(o.name));
      if (l && v && num(l.price) && num(v.price)) { m.h2h = { local: num(l.price), visitante: num(v.price) }; if (e && num(e.price)) m.h2h.empate = num(e.price); }
    } else if (mk.key === 'totals') {
      const mas = outs.find((o) => /^over$/i.test(o.name)), menos = outs.find((o) => /^under$/i.test(o.name));
      if (mas && menos && num(mas.price) && num(menos.price) && num(mas.point) !== null) m.totales = { linea: num(mas.point), mas: num(mas.price), menos: num(menos.price) };
    } else if (mk.key === 'spreads') {
      const l = outs.find((o) => o.name === ev.home_team), v = outs.find((o) => o.name === ev.away_team);
      if (l && v && num(l.price) && num(v.price) && num(l.point) !== null) m.spreads = { linea: num(l.point), local: num(l.price), visitante: num(v.price) };
    }
  }
  return m;
}

function parsearEventos(arr, { maxCasas = 6, ahora = new Date(), diasAdelante = 7 } = {}) {
  if (!Array.isArray(arr)) throw new Error('eventos de The Odds API inesperados');
  const desde = ahora.getTime() - 3 * 3600000, hasta = ahora.getTime() + diasAdelante * 86400000;
  return arr.map((ev) => {
    const inicio = fechaISO(ev.commence_time);
    if (!inicio || !ev.id || !ev.home_team || !ev.away_team) return null;
    const t = Date.parse(inicio);
    if (t < desde || t > hasta) return null;
    const casas = (ev.bookmakers || []).map((b) => ({ casa: b.title || b.key, mercados: mercadosDe(b, ev) })).filter((c) => Object.keys(c.mercados).length);
    // Pinnacle (referencia de mercado) se conserva siempre con su nombre tal cual.
    const pin = casas.find((c) => /pinnacle/i.test(c.casa));
    const sel = casas.slice(0, maxCasas);
    if (pin && !sel.includes(pin)) sel[sel.length - 1] = pin;
    return sel.length ? { id: String(ev.id), inicio, local: ev.home_team, visitante: ev.away_team, casas: sel } : null;
  }).filter(Boolean).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
}

async function ejecutar(ctx) {
  const c = ctx.config.cuotas;
  const key = ctx.env.ODDS_API_KEY;
  if (!key) throw new Error('sin_clave: falta el secreto ODDS_API_KEY (ver herramientas/datos/CONFIGURAR-DATOS.md)');
  const k = encodeURIComponent(key);
  const previo = ctx.prev('apuestas/cuotas.json') || { deportes: [] };
  const prevMap = new Map(previo.deportes.map((d) => [d.clave, d]));
  const ahora = ctx.ahora.getTime();

  // La lista de deportes no consume cuota: sirve para llamar solo a los que estan en temporada.
  const activos = parsearDeportes(await ctx.http.json(`${c.base}/sports/?apiKey=${k}`));
  const nombres = new Map(activos.map((d) => [d.clave, d]));
  const enTemporada = c.deportes.filter((d) => nombres.has(d) && nombres.get(d).activo);

  const toca = enTemporada.filter((d) => {
    const p = prevMap.get(d);
    return !p || !p.actualizado || ahora - Date.parse(p.actualizado) >= c.minMinutosEntreActualizaciones * 60000;
  }).sort((a, b) => Date.parse((prevMap.get(a) || {}).actualizado || 0) - Date.parse((prevMap.get(b) || {}).actualizado || 0)).slice(0, c.maxDeportesPorEjecucion);

  let restantes = null, usadas = null;
  const errores = [];
  const nuevos = new Map();
  const costePorLlamada = c.regiones.length * c.mercados.length;
  for (const d of toca) {
    if (restantes !== null && restantes - costePorLlamada < c.reservaCreditos) { errores.push('se detuvo para conservar la cuota mensual (reservaCreditos)'); break; }
    try {
      const r = await ctx.http.pedirJson(`${c.base}/sports/${encodeURIComponent(d)}/odds/?apiKey=${k}&regions=${c.regiones.join(',')}&markets=${c.mercados.join(',')}&oddsFormat=decimal&dateFormat=iso`);
      const rest = num(r.headers.get('x-requests-remaining')), us = num(r.headers.get('x-requests-used'));
      if (rest !== null) restantes = rest;
      if (us !== null) usadas = us;
      nuevos.set(d, { clave: d, nombre: nombres.get(d).nombre, actualizado: ctx.ahora.toISOString(), eventos: parsearEventos(r.datos, { maxCasas: c.maxCasas, ahora: ctx.ahora, diasAdelante: c.diasAdelante }) });
    } catch (e) { errores.push(`${d}: ${e.message}`); if (/HTTP (401|403|429)/.test(e.message)) break; }
  }
  if (toca.length && !nuevos.size) throw new Error('ninguna llamada de cuotas tuvo exito: ' + errores.slice(0, 3).join(' | '));

  const deportes = [];
  for (const d of c.deportes) {
    const dep = nuevos.get(d) || prevMap.get(d);
    if (dep) deportes.push(dep);
  }
  const eventos = deportes.reduce((n, d) => n + d.eventos.length, 0);
  const detalle = { deportesEnTemporada: enTemporada.length, consultados: [...nuevos.keys()], creditosRestantes: restantes, creditosUsados: usadas };
  if (errores.length) detalle.errores = errores.slice(0, 8);
  return { items: eventos, archivos: { 'apuestas/cuotas.json': { generado: ctx.ahora.toISOString(), fuente: 'The Odds API', deportes } }, detalle };
}

module.exports = { parsearDeportes, parsearEventos, mercadosDe, tareas: [{ id: 'cuotas', grupo: 'rapidos', activo: (c) => c.cuotas.activo, ejecutar }] };
