'use strict';
// Cliente HTTP: User-Agent identificable, timeout, reintentos con backoff, Retry-After y limite de tasa por dominio.
const { esperar: esperarReal, redactarUrl } = require('./util');

class ErrorHttp extends Error {
  constructor(msg, estado) { super(msg); this.estado = estado; }
}
const REINTENTABLES = new Set([408, 425, 429, 500, 502, 503, 504]);

function retryAfterMs(h) {
  if (!h) return null;
  const n = Number(h);
  if (Number.isFinite(n)) return n * 1000;
  const t = Date.parse(h);
  return Number.isFinite(t) ? Math.max(0, t - Date.now()) : null;
}

function crearHttp(opts = {}) {
  const o = {
    fetchImpl: opts.fetchImpl || globalThis.fetch,
    esperar: opts.esperar || esperarReal,
    ahora: opts.ahora || Date.now,
    ua: opts.ua || 'datos-recolector/1.0',
    timeoutMs: opts.timeoutMs ?? 15000,
    reintentos: opts.reintentos ?? 3,
    backoffMs: opts.backoffMs ?? 800,
    msPorDominio: opts.msPorDominio ?? 600,
    retrasos: opts.retrasosPorDominio || {},
    maxEspera: opts.maxEsperaMs ?? 30000
  };
  const libreEn = new Map();
  const stats = { peticiones: 0, reintentos: 0, fallos: 0 };

  async function turno(host, extraMs) {
    const ms = Math.max(o.retrasos[host] ?? o.msPorDominio, extraMs || 0);
    const t = Math.max(o.ahora(), libreEn.get(host) || 0);
    libreEn.set(host, t + ms);
    const espera = t - o.ahora();
    if (espera > 0) await o.esperar(espera);
  }

  async function pedir(url, op = {}) {
    const seguro = redactarUrl(url);
    const host = new URL(url).hostname;
    const intentos = (op.reintentos ?? o.reintentos) + 1;
    const limite = op.limiteBytes ?? 8 * 1024 * 1024;
    let ultimo;
    for (let i = 0; i < intentos; i++) {
      await turno(host, op.retrasoMs);
      stats.peticiones++;
      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), op.timeoutMs ?? o.timeoutMs);
      let espera = null;
      try {
        const res = await o.fetchImpl(url, {
          method: op.metodo || 'GET',
          headers: { 'User-Agent': o.ua, Accept: op.accept || '*/*', 'Accept-Encoding': 'gzip, deflate', ...(op.headers || {}) },
          body: op.cuerpo,
          signal: ctl.signal,
          redirect: 'follow'
        });
        const len = Number(res.headers.get('content-length'));
        if (len > limite) throw new ErrorHttp(`respuesta demasiado grande (${len} bytes) en ${seguro}`, res.status);
        const texto = await res.text();
        if (texto.length > limite) throw new ErrorHttp(`respuesta demasiado grande en ${seguro}`, res.status);
        clearTimeout(tm);
        const ok = res.ok || (op.estadosOk || []).includes(res.status);
        if (ok) return { status: res.status, headers: res.headers, texto };
        ultimo = new ErrorHttp(`HTTP ${res.status} en ${seguro}`, res.status);
        if (!REINTENTABLES.has(res.status)) throw Object.assign(ultimo, { definitivo: true });
        espera = retryAfterMs(res.headers.get('retry-after'));
      } catch (e) {
        clearTimeout(tm);
        if (e && e.definitivo) { stats.fallos++; throw e; }
        if (e instanceof ErrorHttp && !REINTENTABLES.has(e.estado)) { stats.fallos++; throw e; }
        if (!(e instanceof ErrorHttp)) {
          const causa = e && e.name === 'AbortError' ? 'tiempo de espera agotado' : (e && e.cause && e.cause.code) || (e && e.message) || 'error de red';
          ultimo = new ErrorHttp(`${causa} en ${seguro}`, 0);
        } else ultimo = e;
      }
      if (i < intentos - 1) {
        stats.reintentos++;
        const backoff = o.backoffMs * 2 ** i + Math.floor(Math.random() * 250);
        await o.esperar(Math.min(o.maxEspera, Math.max(backoff, espera || 0)));
      }
    }
    stats.fallos++;
    throw ultimo;
  }

  async function pedirJson(url, op = {}) {
    const r = await pedir(url, { accept: 'application/json', ...op });
    try { return { datos: JSON.parse(r.texto), headers: r.headers, status: r.status }; }
    catch { throw new ErrorHttp(`JSON invalido en ${redactarUrl(url)}`, r.status); }
  }
  const json = async (url, op) => (await pedirJson(url, op)).datos;

  return { pedir, pedirJson, json, stats, ua: o.ua, ErrorHttp };
}

module.exports = { crearHttp, ErrorHttp };
