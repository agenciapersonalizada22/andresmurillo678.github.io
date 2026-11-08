/* Motor de automatizaciones (puro, sin DOM): plantillas {{var}}, condiciones, cron, planificador y ejecucion de flujos.
   Funciona en navegador, Service Worker y Node. Las acciones con efectos las inyecta quien llama (o.acciones). */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.AutoMotor = m; })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var M = {};

  /* ---------- rutas y plantillas ---------- */
  function partes(p) { var o = [], re = /([^.\[\]]+)|\[(\d+)\]/g, m; while ((m = re.exec(String(p)))) o.push(m[1] !== undefined ? m[1] : m[2]); return o; }
  M.ruta = function (obj, p) {
    var a = partes(p), v = obj;
    for (var i = 0; i < a.length; i++) { if (v == null || typeof v !== 'object' && typeof v !== 'string') return undefined; if (a[i] === '__proto__' || a[i] === 'constructor' || a[i] === 'prototype') return undefined; v = v[a[i]]; }
    return v;
  };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fechaTxt(v) { var d = new Date(typeof v === 'number' || /^\d+$/.test(String(v)) ? Number(v) : v); if (isNaN(d)) return String(v); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  var FILTROS = {
    mayus: function (v) { return String(v == null ? '' : v).toUpperCase(); }, minus: function (v) { return String(v == null ? '' : v).toLowerCase(); },
    json: function (v) { try { return JSON.stringify(v); } catch (e) { return String(v); } },
    redondear: function (v, a) { var n = Number(v); return isFinite(n) ? Number(n.toFixed(a === undefined ? 0 : Math.min(10, Number(a) || 0))) : v; },
    recortar: function (v, a) { var s = String(v == null ? '' : v), n = Number(a) || 50; return s.length > n ? s.slice(0, n) + '…' : s; },
    longitud: function (v) { return v == null ? 0 : (Array.isArray(v) || typeof v === 'string') ? v.length : typeof v === 'object' ? Object.keys(v).length : String(v).length; },
    def: function (v, a) { return v === undefined || v === null || v === '' ? a : v; },
    fecha: function (v) { return v == null || v === '' ? '' : fechaTxt(v); }, url: function (v) { return encodeURIComponent(String(v == null ? '' : v)); },
    unir: function (v, a) { return Array.isArray(v) ? v.map(function (x) { return typeof x === 'object' ? JSON.stringify(x) : x; }).join(a === undefined ? ', ' : a) : v; }
  };
  M.FILTROS = Object.keys(FILTROS);
  function resolver(datos, expr) {
    var ps = expr.split('|').map(function (x) { return x.trim(); }), ruta = ps.shift(), raiz = partes(ruta)[0], v;
    if (/^(["'])[\s\S]*\1$/.test(ruta)) v = ruta.slice(1, -1);
    else if (datos && Object.prototype.hasOwnProperty.call(datos, raiz) && raiz !== 'vars') v = M.ruta(datos, ruta);
    else if (datos && datos.vars) v = M.ruta(datos.vars, ruta);
    ps.forEach(function (fl) { var i = fl.indexOf(':'), n = i < 0 ? fl : fl.slice(0, i), a = i < 0 ? undefined : fl.slice(i + 1); if (FILTROS[n]) v = FILTROS[n](v, a); });
    return v;
  }
  function aTexto(v) { return v === undefined || v === null ? '' : typeof v === 'object' ? (function () { try { return JSON.stringify(v); } catch (e) { return ''; } })() : String(v); }
  var RE_TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;
  M.renderizar = function (s, datos) { return String(s == null ? '' : s).replace(RE_TOKEN, function (_, e) { return aTexto(resolver(datos, e)); }); };
  /* si la cadena es exactamente un {{...}} devuelve el valor crudo (lista, numero...) */
  M.evaluar = function (s, datos) {
    if (typeof s !== 'string') return s;
    var m = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/.exec(s); if (m) { var v = resolver(datos, m[1]); return v === undefined ? '' : v; }
    return M.renderizar(s, datos);
  };

  /* ---------- condiciones ---------- */
  M.OPS = ['eq', 'ne', 'gt', 'lt', 'ge', 'le', 'contiene', 'nocontiene', 'empieza', 'termina', 'vacio', 'novacio', 'regex'];
  function num(v) { if (typeof v === 'number') return isFinite(v) ? v : NaN; if (typeof v === 'boolean') return NaN; var s = String(v == null ? '' : v).trim().replace(',', '.'); return s !== '' && /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s) ? Number(s) : NaN; }
  M.comparar = function (a, op, b) {
    var x = num(a), y = num(b), nums = !isNaN(x) && !isNaN(y), sa = aTexto(a), sb = aTexto(b);
    switch (op) {
      case 'eq': return nums ? x === y : sa === sb; case 'ne': return nums ? x !== y : sa !== sb;
      case 'gt': return nums ? x > y : sa > sb; case 'lt': return nums ? x < y : sa < sb;
      case 'ge': return nums ? x >= y : sa >= sb; case 'le': return nums ? x <= y : sa <= sb;
      case 'contiene': return Array.isArray(a) ? a.some(function (e) { return aTexto(e) === sb; }) : sa.toLowerCase().indexOf(sb.toLowerCase()) >= 0;
      case 'nocontiene': return !M.comparar(a, 'contiene', b);
      case 'empieza': return sa.toLowerCase().indexOf(sb.toLowerCase()) === 0;
      case 'termina': return sa.toLowerCase().slice(-sb.length || undefined) === sb.toLowerCase() || sb === '';
      case 'vacio': return a === undefined || a === null || sa === '' || (Array.isArray(a) && !a.length);
      case 'novacio': return !M.comparar(a, 'vacio');
      case 'regex': try { return new RegExp(sb, 'i').test(sa.slice(0, 20000)); } catch (e) { throw new Error('Expresión regular no válida: ' + sb); }
      default: throw new Error('Operador desconocido: ' + op);
    }
  };
  /* cfg: {reglas:[{izq,op,der}], modo:'todas'|'alguna'} (tambien acepta izq/op/der sueltos) */
  M.condicion = function (cfg, datos) {
    var reglas = cfg.reglas && cfg.reglas.length ? cfg.reglas : [{ izq: cfg.izq, op: cfg.op || 'eq', der: cfg.der }];
    var rs = reglas.map(function (r) { return M.comparar(M.evaluar(r.izq, datos), r.op || 'eq', M.evaluar(r.der, datos)); });
    return cfg.modo === 'alguna' ? rs.some(Boolean) : rs.every(Boolean);
  };

  /* ---------- cron (5 campos, minuto hora dia mes dia-semana) ---------- */
  var MES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }, DSEM = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  var ALIAS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
  function campo(txt, min, max, nombres, nom) {
    var set = {}, comodin = false;
    txt.split(',').forEach(function (p) {
      var pr = p.split('/'), r = pr[0], paso = pr.length > 1 ? pr[1] : '1', a, b;
      if (pr.length > 2 || !/^\d+$/.test(paso) || +paso < 1) throw new Error('Cron inválido en ' + nom + ': paso «' + p + '»');
      function val(t) { var l = t.toLowerCase(); if (nombres && nombres[l] !== undefined) return nombres[l]; if (!/^\d+$/.test(t)) throw new Error('Cron inválido en ' + nom + ': «' + t + '»'); return +t; }
      if (r === '*' || r === '?') { a = min; b = max; comodin = true; }
      else if (r.indexOf('-') > 0) { var q = r.split('-'); if (q.length !== 2) throw new Error('Cron inválido en ' + nom + ': «' + p + '»'); a = val(q[0]); b = val(q[1]); }
      else { a = val(r); b = pr.length > 1 ? max : a; }
      if (a < min || b > max || a > b) throw new Error('Cron inválido en ' + nom + ': fuera de rango (' + min + '-' + max + ') «' + p + '»');
      for (var i = a; i <= b; i += +paso) set[nom === 'día de la semana' && i === 7 ? 0 : i] = 1;
    });
    return { set: set, comodin: comodin };
  }
  M.parseCron = function (expr) {
    var s = String(expr || '').trim().toLowerCase(); if (ALIAS[s]) s = ALIAS[s];
    var p = s.split(/\s+/); if (p.length !== 5) throw new Error('Cron inválido: se esperan 5 campos (minuto hora día mes día-semana).');
    var mi = campo(p[0], 0, 59, null, 'minuto'), ho = campo(p[1], 0, 23, null, 'hora'), di = campo(p[2], 1, 31, null, 'día del mes'), me = campo(p[3], 1, 12, MES, 'mes'), se = campo(p[4], 0, 7, DSEM, 'día de la semana');
    return { min: mi.set, hor: ho.set, dia: di.set, mes: me.set, sem: se.set, diaC: di.comodin, semC: se.comodin };
  };
  function partesFecha(d, utc) { return utc ? [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCDay()] : [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getDay()]; }
  function mk(utc, y, mo, d, h, mi) { return utc ? new Date(Date.UTC(y, mo, d, h, mi)) : new Date(y, mo, d, h, mi); }
  function diaOk(c, d, w) { var a = !!c.dia[d], b = !!c.sem[w]; return c.diaC && c.semC ? true : c.diaC ? b : c.semC ? a : (a || b); }
  M.coincide = function (expr, fecha, o) {
    var c = typeof expr === 'string' ? M.parseCron(expr) : expr, p = partesFecha(fecha, o && o.utc);
    return !!(c.min[p[4]] && c.hor[p[3]] && c.mes[p[1] + 1] && diaOk(c, p[2], p[5]));
  };
  M.proxima = function (expr, desde, o) {
    var c = typeof expr === 'string' ? M.parseCron(expr) : expr, utc = !!(o && o.utc), t = new Date(Math.floor(desde.getTime() / 60000) * 60000 + 60000);
    for (var i = 0; i < 100000; i++) {
      var p = partesFecha(t, utc);
      if (!c.mes[p[1] + 1]) { t = mk(utc, p[0], p[1] + 1, 1, 0, 0); continue; }
      if (!diaOk(c, p[2], p[5])) { t = mk(utc, p[0], p[1], p[2] + 1, 0, 0); continue; }
      if (!c.hor[p[3]]) { t = mk(utc, p[0], p[1], p[2], p[3] + 1, 0); continue; }
      if (!c.min[p[4]]) { t = new Date(t.getTime() + 60000); continue; }
      return t;
    }
    throw new Error('El cron nunca coincide (revisa día y mes).');
  };
  M.validarCron = function (expr) { try { M.parseCron(expr); return null; } catch (e) { return e.message; } };

  /* planificador: spec {cada: ms} o {cron, utc}. tick(ahora) -> ids vencidos (sin recuperar los perdidos) */
  M.planificador = function (reloj) {
    var items = {}, ahora = reloj || function () { return Date.now(); };
    function sig(s, t) { return s.cada ? t + s.cada : M.proxima(s.cron, new Date(t), { utc: s.utc }).getTime(); }
    return {
      poner: function (id, spec) { if (items[id] && JSON.stringify(items[id].spec) === JSON.stringify(spec)) return; items[id] = { spec: spec, sig: sig(spec, ahora()) }; },
      quitar: function (id) { delete items[id]; },
      ids: function () { return Object.keys(items); },
      proximo: function (id) { return items[id] ? items[id].sig : null; },
      tick: function (t) { t = t === undefined ? ahora() : t; var o = []; Object.keys(items).forEach(function (id) { if (items[id].sig <= t) { o.push(id); items[id].sig = sig(items[id].spec, t); } }); return o; }
    };
  };

  /* lista de dominios permitidos: «ejemplo.com» admite tambien sus subdominios; solo http(s)/ws(s) */
  M.hostDe = function (url) { try { var u = new URL(url); return /^(https?|wss?):$/.test(u.protocol) ? u.hostname.toLowerCase() : null; } catch (e) { return null; } };
  M.hostPermitido = function (url, lista) {
    var h = M.hostDe(url); if (!h) return false;
    return (lista || []).some(function (d) { d = String(d).trim().toLowerCase().replace(/^\*\./, ''); return d && (h === d || h.slice(-d.length - 1) === '.' + d); });
  };

  /* ---------- utilidades de datos ---------- */
  function aLista(v) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') return Array.isArray(v.valor) ? v.valor : Object.keys(v).map(function (k) { return v[k]; });
    if (typeof v === 'string') { var t = v.trim(); if (t[0] === '[') { try { var j = JSON.parse(t); if (Array.isArray(j)) return j; } catch (e) {} } return t === '' ? [] : t.split(/\r?\n|,/).map(function (x) { return x.trim(); }).filter(Boolean); }
    return v == null ? [] : [v];
  }
  M.aLista = aLista;
  function aObjeto(v) { if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { throw new Error('JSON no válido: ' + e.message); } } return v; }
  function resumir(v, d) {
    d = d || 0; if (v == null || typeof v === 'number' || typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.length > 2000 ? v.slice(0, 2000) + '… (' + v.length + ' car.)' : v;
    if (d > 5) return '…'; if (Array.isArray(v)) { var a = v.slice(0, 40).map(function (x) { return resumir(x, d + 1); }); if (v.length > 40) a.push('… +' + (v.length - 40)); return a; }
    if (typeof v === 'object') { var o = {}; Object.keys(v).slice(0, 60).forEach(function (k) { o[k] = resumir(v[k], d + 1); }); return o; }
    return String(v);
  }
  M.resumir = resumir;
  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /* ---------- nodos de logica ---------- */
  var LOGICA = {
    condicion: function (cfg, c) { var r = M.condicion(cfg, c.datos); return { salida: { valor: r, resultado: r }, puerto: r ? 'si' : 'no' }; },
    variable: function (cfg, c) {
      var n = String(cfg.nombre || '').trim(); if (!/^[A-Za-z_][\w]*$/.test(n)) throw new Error('Nombre de variable no válido: «' + n + '»');
      var v = M.evaluar(cfg.valor, c.datos), ant = c.ctx.vars[n], op = cfg.op || 'fijar';
      if (op === 'sumar') v = (num(ant) || 0) + (num(v) || 0); else if (op === 'restar') v = (num(ant) || 0) - (num(v) || 0);
      else if (op === 'añadir') { var l = aLista(ant === undefined ? [] : ant).slice(); l.push(v); v = l; }
      else if (typeof v === 'string' && /^\s*[\[{]/.test(v)) { try { v = JSON.parse(v); } catch (e) {} }
      if (aTexto(v).length > 200000) throw new Error('Valor demasiado grande.');
      c.ctx.vars[n] = v; return { salida: { nombre: n, valor: v } };
    },
    plantilla: function (cfg) { return { salida: { texto: cfg.texto, valor: cfg.texto } }; },
    json: function (cfg, c) {
      var src = M.evaluar(cfg.fuente, c.datos), m = cfg.modo || 'analizar', v;
      if (m === 'analizar') v = aObjeto(src);
      else if (m === 'texto') v = typeof src === 'string' ? src : JSON.stringify(src, null, cfg.sangrado ? 2 : 0);
      else if (m === 'extraer') { v = M.ruta(aObjeto(src), cfg.ruta); if (v === undefined) throw new Error('No existe la ruta «' + cfg.ruta + '».'); }
      else if (m === 'elegir') { var cs = String(cfg.campos || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean), pick = function (o) { var r = {}; cs.forEach(function (k) { r[k] = M.ruta(o, k); }); return r; }, o = aObjeto(src); v = Array.isArray(o) ? o.map(pick) : pick(o); }
      else if (m === 'contar') v = FILTROS.longitud(aObjeto(src));
      else if (m === 'unir') v = aLista(src).map(function (x) { return typeof x === 'object' ? JSON.stringify(x) : x; }).join(cfg.separador === undefined || cfg.separador === '' ? ', ' : String(cfg.separador).replace(/\\n/g, '\n'));
      else if (m === 'dividir') v = String(src == null ? '' : src).split(cfg.separador === undefined || cfg.separador === '' ? ',' : String(cfg.separador).replace(/\\n/g, '\n')).map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; });
      else throw new Error('Modo JSON desconocido: ' + m);
      return { salida: { valor: v } };
    },
    filtro: function (cfg, c) {
      var lista = aLista(M.evaluar(cfg.lista, c.datos)), reglas = (cfg.reglas || []).filter(function (r) { return r && (r.izq !== undefined && r.izq !== ''); }), out;
      out = reglas.length ? lista.filter(function (it) { return M.condicion({ reglas: reglas, modo: cfg.modo }, Object.assign({}, c.datos, { item: it })); }) : lista.slice();
      if (cfg.ordenarPor) { var d = cfg.orden === 'desc' ? -1 : 1; out.sort(function (a, b) { var x = M.ruta(a, cfg.ordenarPor), y = M.ruta(b, cfg.ordenarPor), nx = num(x), ny = num(y); return (!isNaN(nx) && !isNaN(ny) ? nx - ny : aTexto(x) < aTexto(y) ? -1 : aTexto(x) > aTexto(y) ? 1 : 0) * d; }); }
      var lim = Number(cfg.limite); if (lim > 0) out = out.slice(0, lim);
      return { salida: { valor: out, cantidad: out.length } };
    }
  };
  M.LOGICA = Object.keys(LOGICA).concat(['bucle', 'espera']);

  /* ---------- ejecucion ---------- */
  function esperarReal(ms, senal) {
    return new Promise(function (ok) { var t = setTimeout(ok, ms); if (senal) senal.alAbortar = function () { clearTimeout(t); ok(); }; });
  }
  function aristasPor(flujo) {
    var m = {}; (flujo.aristas || []).forEach(function (a) { var k = a.de + '|' + (a.sal || 'sal'); (m[k] = m[k] || []).push(a.a); }); return m;
  }
  M.aristasPor = aristasPor;
  M.ErrorEjecucion = function (msg, nodo) { var e = new Error(msg); e.nodo = nodo; e.name = 'ErrorEjecucion'; return e; };

  /* o: {inicio, disparo:{tipo,datos}, simulacion, catalogo, acciones:{tipo:fn(cfg,ctx,nodo)}, secretos, almacen, limitePasos, limiteBucle,
        esperar(ms,senal), maxEspera, puerta(paso,ctx) (depuracion), alPaso(paso), senal:{abortado}, faltante:'error'|'omitir'} */
  M.ejecutar = async function (flujo, o) {
    o = Object.assign({ limitePasos: 500, limiteBucle: 1000, maxEspera: 300000, esperar: esperarReal }, o || {});
    var cat = (o.catalogo && (o.catalogo.TIPOS || o.catalogo)) || (g.AutoCatalogo && g.AutoCatalogo.TIPOS) || {};
    var nodos = {}; (flujo.nodos || []).forEach(function (n) { nodos[n.id] = n; });
    var sal = aristasPor(flujo), ini = o.inicio || ((flujo.nodos || []).filter(function (n) { return cat[n.tipo] && cat[n.tipo].categoria === 'disparador'; })[0] || {}).id;
    var reg = { id: o.idEjecucion || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), flujo: flujo.id, nombre: flujo.nombre, disparo: { tipo: (o.disparo && o.disparo.tipo) || 'manual', nodo: ini }, simulacion: !!o.simulacion, ini: Date.now(), estado: 'ok', pasos: [], truncado: false };
    var secretos = o.secretos || {}, vals = Object.keys(secretos).map(function (k) { return String(secretos[k]); }).filter(function (v) { return v.length >= 4; });
    function redactar(v) {
      if (!vals.length) return v;
      if (typeof v === 'string') { vals.forEach(function (s) { v = v.split(s).join('***'); }); return v; }
      if (Array.isArray(v)) return v.map(redactar);
      if (v && typeof v === 'object') { var r = {}; Object.keys(v).forEach(function (k) { r[k] = redactar(v[k]); }); return r; }
      return v;
    }
    var entrada = copiar((o.disparo && o.disparo.datos)) || {}, ctx = { vars: copiar(flujo.vars) || {}, entrada: entrada, ultimo: entrada, nodos: {}, secreto: secretos, almacen: o.almacen || {}, ahora: null };
    function datos(extra) { var d = ctx; var ah = new Date(); ctx.ahora = { iso: ah.toISOString(), fecha: ah.getFullYear() + '-' + pad(ah.getMonth() + 1) + '-' + pad(ah.getDate()), hora: pad(ah.getHours()) + ':' + pad(ah.getMinutes()), ts: ah.getTime(), dia: ah.getDay() }; return extra ? Object.assign({}, d, extra) : d; }
    var pasos = 0, n = 0;
    if (!ini || !nodos[ini]) { reg.estado = 'error'; reg.error = 'El flujo no tiene disparador.'; reg.fin = Date.now(); return reg; }

    function abortado() { return o.senal && o.senal.abortado; }
    async function correrHijos(id, puerto, prof) { var t = sal[id + '|' + puerto] || []; for (var i = 0; i < t.length; i++) await correr(t[i], prof + 1); }
    async function correr(id, prof) {
      if (abortado()) { var ab = new Error('Ejecución detenida.'); ab.abortada = true; throw ab; }
      if (++pasos > o.limitePasos) throw M.ErrorEjecucion('Límite de ' + o.limitePasos + ' pasos alcanzado (¿hay un ciclo?).', id);
      if (prof > 100) throw M.ErrorEjecucion('Anidamiento demasiado profundo.', id);
      var nodo = nodos[id], def = cat[nodo.tipo]; if (!def) throw M.ErrorEjecucion('Tipo de nodo desconocido: ' + nodo.tipo, id);
      var d = datos(), cfg = {}, crudo = def.crudo || [];
      Object.keys(nodo.cfg || {}).forEach(function (k) { var v = nodo.cfg[k]; cfg[k] = typeof v === 'string' && crudo.indexOf(k) < 0 ? M.renderizar(v, d) : v; });
      var paso = { n: ++n, nodo: id, tipo: nodo.tipo, titulo: nodo.titulo || def.nombre, t: Date.now(), estado: 'ok', entrada: redactar(resumir(cfg)) };
      if (o.puerta) await o.puerta(paso, ctx);
      var t0 = Date.now(), res = null, puerto = 'sal';
      try {
        if (def.categoria === 'disparador') res = { salida: ctx.entrada };
        else if (nodo.tipo === 'bucle') res = null;
        else if (nodo.tipo === 'espera') {
          var ms = Math.max(0, Math.min(o.maxEspera, (Number(cfg.valor) || 0) * ({ ms: 1, s: 1000, min: 60000 }[cfg.unidad] || 1000)));
          if (o.simulacion) res = { salida: { esperado: ms, omitida: true }, estado: 'simulado' }; else { await o.esperar(ms, o.senal); res = { salida: { esperado: ms } }; }
        } else if (LOGICA[nodo.tipo]) {
          try { res = LOGICA[nodo.tipo](cfg, { datos: d, ctx: ctx, o: o }); }
          catch (e2) { if (o.simulacion && (nodo.tipo === 'json' || nodo.tipo === 'filtro') && ctx.ultimo && ctx.ultimo.simulado) res = { salida: { valor: nodo.tipo === 'filtro' ? [] : null, simulado: true, aviso: e2.message }, estado: 'simulado' }; else throw e2; }
        }
        else if (o.simulacion && def.externa) res = { salida: { simulado: true, accion: nodo.tipo, parametros: redactar(resumir(cfg)) }, estado: 'simulado' };
        else if (o.acciones && o.acciones[nodo.tipo]) { var r = await o.acciones[nodo.tipo](cfg, ctx, nodo); res = { salida: r && typeof r === 'object' && !Array.isArray(r) ? r : { valor: r } }; }
        else if (o.faltante === 'omitir') res = { salida: { omitido: true }, estado: 'omitido' };
        else throw new Error('Esta acción no está disponible en este entorno.');
      } catch (e) {
        if (e.abortada) throw e;
        paso.estado = 'error'; paso.error = redactar(e.message || String(e)); paso.ms = Date.now() - t0;
        if (sal[id + '|error']) { var es = { error: paso.error }; ctx.nodos[id] = es; ctx.ultimo = es; paso.salida = es; paso.puerto = 'error'; push(paso); return correrHijos(id, 'error', prof); }
        push(paso); throw M.ErrorEjecucion((paso.titulo + ': ' + paso.error), id);
      }
      if (nodo.tipo === 'bucle') {
        var lista = cfg.modo === 'veces' ? (function () { var k = Math.min(o.limiteBucle + 1, Math.max(0, Math.floor(num(M.evaluar(cfg.veces, d)) || 0))), r = []; for (var j = 1; j <= k; j++) r.push(j); return r; })() : aLista(M.evaluar(cfg.lista, d)), tope = Math.min(o.limiteBucle, Number(cfg.max) > 0 ? Number(cfg.max) : o.limiteBucle), nom = /^[A-Za-z_]\w*$/.test(cfg.var || '') ? cfg.var : 'item';
        var total = lista.length; if (lista.length > tope) lista = lista.slice(0, tope);
        paso.salida = { iteraciones: lista.length, total: total, recortado: total > lista.length }; paso.puerto = 'cuerpo'; paso.ms = Date.now() - t0; push(paso);
        for (var i = 0; i < lista.length; i++) { if (abortado()) break; ctx.vars[nom] = lista[i]; ctx.vars[nom + '_i'] = i; await correrHijos(id, 'cuerpo', prof); }
        ctx.nodos[id] = paso.salida; ctx.ultimo = paso.salida;
        return correrHijos(id, 'fin', prof);
      }
      if (res.estado) paso.estado = res.estado; puerto = res.puerto || 'sal'; paso.puerto = puerto; paso.ms = Date.now() - t0;
      var s = res.salida; ctx.nodos[id] = s; ctx.ultimo = s; paso.salida = redactar(resumir(s)); push(paso);
      if (nodo.cfg && nodo.cfg.guardarEn && /^[A-Za-z_]\w*$/.test(nodo.cfg.guardarEn) && def.categoria !== 'disparador') ctx.vars[nodo.cfg.guardarEn] = s && s.valor !== undefined ? s.valor : s;
      return correrHijos(id, puerto, prof);
    }
    function push(p) { if (reg.pasos.length < 300) reg.pasos.push(p); else reg.truncado = true; if (o.alPaso) try { o.alPaso(p, ctx); } catch (e) {} }
    try { await correr(ini, 0); }
    catch (e) { if (e.abortada) reg.estado = 'detenida'; else { reg.estado = 'error'; reg.error = redactar(e.message); reg.nodoError = e.nodo; } }
    reg.fin = Date.now(); reg.vars = redactar(resumir(ctx.vars)); reg.cantidadPasos = pasos;
    return reg;
  };
  return M;
});
