'use strict';
// robots.txt (RFC 9309): parseo, coincidencia por la regla mas larga, comodines * y $, Crawl-delay.

function parsearRobots(texto) {
  const grupos = [];
  const sitemaps = [];
  let g = null, ultimoFueAgente = false;
  for (let linea of String(texto || '').replace(/^﻿/, '').split(/\r?\n/)) {
    linea = linea.replace(/#.*/, '').trim();
    const i = linea.indexOf(':');
    if (i < 0) continue;
    const k = linea.slice(0, i).trim().toLowerCase();
    const v = linea.slice(i + 1).trim();
    if (k === 'user-agent') {
      if (!g || !ultimoFueAgente) { g = { agentes: [], reglas: [], retraso: null }; grupos.push(g); }
      g.agentes.push(v.toLowerCase());
      ultimoFueAgente = true;
      continue;
    }
    ultimoFueAgente = false;
    if (k === 'sitemap') { if (v) sitemaps.push(v); continue; }
    if (!g) continue;
    if (k === 'allow' || k === 'disallow') {
      if (v !== '') g.reglas.push({ permitir: k === 'allow', patron: v });
      else if (k === 'disallow') g.reglas.push({ permitir: true, patron: '' });
    } else if (k === 'crawl-delay') {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) g.retraso = n;
    }
  }
  return { grupos, sitemaps };
}

function aRegex(patron) {
  const ancla = patron.endsWith('$');
  if (ancla) patron = patron.slice(0, -1);
  const re = patron.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + re + (ancla ? '$' : ''));
}

function gruposPara(robots, agente) {
  const ag = String(agente || '').toLowerCase();
  let mejor = 0, sel = [];
  for (const g of robots.grupos) {
    for (const a of g.agentes) {
      if (a === '*' || !a) continue;
      if (ag.startsWith(a) || ag === a) {
        if (a.length > mejor) { mejor = a.length; sel = [g]; }
        else if (a.length === mejor) sel.push(g);
      }
    }
  }
  if (sel.length) return sel;
  return robots.grupos.filter((g) => g.agentes.includes('*'));
}

function permitido(robots, agente, ruta) {
  const grupos = gruposPara(robots, agente);
  let mejor = { len: -1, permitir: true };
  for (const g of grupos) {
    for (const r of g.reglas) {
      if (r.patron === '') continue;
      if (aRegex(r.patron).test(ruta)) {
        const len = r.patron.length;
        if (len > mejor.len || (len === mejor.len && r.permitir)) mejor = { len, permitir: r.permitir };
      }
    }
  }
  return mejor.permitir;
}

function retraso(robots, agente) {
  const g = gruposPara(robots, agente).find((x) => x.retraso !== null);
  return g ? g.retraso : null;
}

const ESTADOS_4XX = Array.from({ length: 100 }, (_, i) => 400 + i).filter((s) => s !== 429);
const TODO_PERMITIDO = { grupos: [], sitemaps: [] };
const TODO_PROHIBIDO = { grupos: [{ agentes: ['*'], reglas: [{ permitir: false, patron: '/' }], retraso: null }], sitemaps: [] };

class GestorRobots {
  constructor({ http, agente, respetar = true, retrasoMaxMs = 30000 }) {
    this.http = http;
    this.agente = agente;
    this.respetar = respetar;
    this.retrasoMaxMs = retrasoMaxMs;
    this.cache = new Map();
  }
  async cargar(origen) {
    if (this.cache.has(origen)) return this.cache.get(origen);
    const p = (async () => {
      try {
        const r = await this.http.pedir(origen + '/robots.txt', { reintentos: 1, estadosOk: ESTADOS_4XX, limiteBytes: 512 * 1024 });
        if (r.status >= 200 && r.status < 300) return parsearRobots(r.texto);
        return TODO_PERMITIDO; // 4xx: sin robots (RFC 9309)
      } catch {
        return TODO_PROHIBIDO; // inalcanzable/5xx: prohibido por prudencia
      }
    })();
    this.cache.set(origen, p);
    return p;
  }
  async permite(url) {
    if (!this.respetar) return true;
    let u;
    try { u = new URL(url); } catch { return false; }
    if (!/^https?:$/.test(u.protocol)) return false;
    const robots = await this.cargar(u.origin);
    return permitido(robots, this.agente, u.pathname + u.search);
  }
  async retrasoMs(url) {
    try {
      const u = new URL(url);
      const d = retraso(await this.cargar(u.origin), this.agente);
      return d === null ? null : Math.min(d * 1000, this.retrasoMaxMs);
    } catch { return null; }
  }
}

module.exports = { parsearRobots, permitido, retraso, GestorRobots, aRegex };
