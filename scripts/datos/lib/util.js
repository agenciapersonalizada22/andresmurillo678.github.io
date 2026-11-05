'use strict';
const crypto = require('node:crypto');

const hash = (s, n = 12) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, n);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const sinAcentos = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[%,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function redondear(n, d = 2) {
  n = num(n);
  if (n === null) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
function cifras(n, sig = 6) {
  n = num(n);
  return n === null ? null : Number(n.toPrecision(sig));
}
function fechaISO(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const t = typeof valor === 'number' ? valor : Date.parse(String(valor).trim());
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
function recortar(texto, max) {
  texto = String(texto || '').replace(/\s+/g, ' ').trim();
  if (texto.length <= max) return texto;
  let corte = texto.slice(0, max - 1);
  const sp = corte.lastIndexOf(' ');
  if (sp > max * 0.6) corte = corte.slice(0, sp);
  return corte.replace(/[\s.,;:!¡¿?\-–—]+$/, '') + '…';
}
function dominio(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
const PARAMS_RASTREO = /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|ref|ref_|referrer|source|cmpid|campaign|affid|aff_id|tag|igshid|_ga|spm)$/i;
function normalizarUrl(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    x.hostname = x.hostname.toLowerCase();
    const ps = [...x.searchParams.keys()];
    for (const k of ps) if (PARAMS_RASTREO.test(k)) x.searchParams.delete(k);
    x.searchParams.sort();
    let s = x.toString();
    if (x.pathname !== '/' && s.endsWith('/') && !x.search) s = s.slice(0, -1);
    return s;
  } catch { return String(u || '').trim(); }
}
function redactarUrl(u) {
  return String(u).replace(/([?&](?:api[_-]?key|apikey|token|key|appid|access_key|apiKey)=)[^&#]*/gi, '$1***');
}
function mensajeError(e) {
  return redactarUrl((e && e.message) || String(e)).slice(0, 300);
}
function aMapa(arr, f) { const m = new Map(); for (const x of arr) m.set(f(x), x); return m; }

module.exports = { hash, esperar, sinAcentos, num, redondear, cifras, fechaISO, recortar, dominio, normalizarUrl, redactarUrl, mensajeError, aMapa };
