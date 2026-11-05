'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { crearHttp } = require('./http');
const { validarArchivo } = require('./contrato');
const { mensajeError } = require('./util');

const MODULOS = ['cripto', 'divisas', 'acciones', 'nft', 'cuotas', 'noticias', 'ofertas'];

function leerJson(ruta, defecto = null) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return defecto; }
}
function escribirJson(ruta, obj) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const tmp = ruta + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, ruta);
}

function userAgent(cfg, env) {
  const repo = env.GITHUB_REPOSITORY || 'agenciapersonalizada22/andresmurillo678.github.io';
  return cfg.http.userAgent.replace('{repo}', repo);
}

function crearContexto({ config, env = process.env, salida, ahora = new Date(), fetchImpl, esperar, log = () => {} }) {
  const h = config.http || {};
  const http = crearHttp({
    fetchImpl, esperar, ua: userAgent(config, env), timeoutMs: h.timeoutMs, reintentos: h.reintentos, backoffMs: h.backoffMs,
    msPorDominio: h.msPorDominio, retrasosPorDominio: h.retrasosPorDominio
  });
  const limpio = {};
  for (const k of ['COINGECKO_KEY', 'COINCAP_KEY', 'FINNHUB_KEY', 'TWELVEDATA_KEY', 'ALPHAVANTAGE_KEY', 'RESERVOIR_KEY', 'ODDS_API_KEY', 'BRAVE_SEARCH_KEY']) {
    if (env[k] && String(env[k]).trim()) limpio[k] = String(env[k]).trim();
  }
  return { config, http, env: limpio, ahora, salida, log, prev: (ruta) => leerJson(path.join(salida, ruta)) };
}

function conTiempo(promesa, ms, etiqueta) {
  let t;
  const limite = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`tiempo maximo de ${Math.round(ms / 1000)}s agotado en ${etiqueta}`)), ms); });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(t));
}

async function ejecutarTareas(ctx, grupos, { solo, tareas: personalizadas } = {}) {
  const estado = leerJson(path.join(ctx.salida, 'estado.json'), { fuentes: {} });
  estado.fuentes = estado.fuentes || {};
  const resumen = [];
  const tareas = (personalizadas || MODULOS.flatMap((m) => require(`../recolectores/${m}`).tareas))
    .filter((t) => grupos.includes(t.grupo) && (!solo || solo.includes(t.id)));
  for (const t of tareas) {
    if (!t.activo(ctx.config)) continue;
    const previa = estado.fuentes[t.id] || {};
    const ahoraISO = ctx.ahora.toISOString();
    try {
      const r = await conTiempo(t.ejecutar(ctx), ctx.config.tiempoMaximoPorFuenteMs || 240000, t.id);
      const problemas = [];
      for (const [ruta, datos] of Object.entries(r.archivos || {})) {
        const errs = validarArchivo(ruta, datos);
        if (errs.length) problemas.push(...errs.slice(0, 5));
      }
      if (problemas.length) throw new Error('la salida no cumple el contrato (no se publica, se conservan los datos anteriores): ' + problemas.slice(0, 5).join('; '));
      for (const [ruta, datos] of Object.entries(r.archivos || {})) escribirJson(path.join(ctx.salida, ruta), datos);
      estado.fuentes[t.id] = { ok: true, ultimo: ahoraISO, items: r.items || 0 };
      if (r.detalle) estado.fuentes[t.id].detalle = r.detalle;
      resumen.push({ id: t.id, ok: true, items: r.items || 0, detalle: r.detalle });
    } catch (e) {
      const msg = mensajeError(e);
      estado.fuentes[t.id] = { ok: false, ultimo: previa.ultimo || null, error: msg, items: previa.items || 0 };
      resumen.push({ id: t.id, ok: false, error: msg });
    }
  }
  estado.generado = ctx.ahora.toISOString();
  estado.fuente = 'proceso programado (GitHub Actions)';
  const errs = validarArchivo('estado.json', estado);
  if (errs.length) throw new Error('estado.json invalido: ' + errs.join('; '));
  escribirJson(path.join(ctx.salida, 'estado.json'), estado);
  const leeme = path.join(ctx.salida, 'LEEME.txt');
  if (!fs.existsSync(leeme)) fs.writeFileSync(leeme, 'Rama generada automaticamente por el proceso programado de datos (scripts/datos). No edites a mano: se reemplaza en cada ejecucion.\n');
  return { resumen, estado };
}

module.exports = { crearContexto, ejecutarTareas, leerJson, escribirJson, conTiempo, MODULOS };
