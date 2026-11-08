/* Telemetria (puro): normaliza tramas en vivo (JSON/NDJSON) y logs CSV/JSON de vuelo. window.DronTelem */
(function (g, f) { const m = f(g.DronGeo || require('./geo.js')); if (typeof module === 'object' && module.exports) module.exports = m; else g.DronTelem = m; })(typeof self !== 'undefined' ? self : this, function (Geo) {
  'use strict';
  const T = {};
  /* campo normalizado -> alias admitidos (minusculas, sin unidades) */
  const ALIAS = { lat: ['lat', 'latitude'], lon: ['lon', 'lng', 'long', 'longitude'], alt: ['alt', 'altitude', 'rel_alt', 'relative_alt', 'height_above_takeoff', 'height', 'altitude_above_takeoff', 'altura'],
    vel: ['vel', 'speed', 'groundspeed', 'ground_speed', 'gs', 'velocidad'], bat: ['bat', 'battery', 'battery_percent', 'battery_remaining', 'batt', 'bateria', 'remaining_pct'], volt: ['volt', 'voltage', 'battery_voltage', 'vbat'],
    rumbo: ['rumbo', 'heading', 'hdg', 'compass_heading', 'yaw'], pitch: ['pitch'], roll: ['roll'], sats: ['sats', 'satellites', 'gps_sats', 'satellite_count', 'numsats'], rssi: ['rssi', 'signal'], modo: ['modo', 'mode', 'flight_mode'],
    t: ['t', 'time', 'timestamp', 'tiempo', 'ts', 'time_ms'] };
  const INV = {}; Object.keys(ALIAS).forEach(k => ALIAS[k].forEach(a => { if (!INV[a]) INV[a] = k; }));
  T.DOC = '{"t":1712000000000,"lat":4.711,"lon":-74.0721,"alt":35.2,"vel":6.1,"rumbo":92,"bat":78,"volt":15.2,"sats":14,"pitch":-2,"roll":1,"modo":"AUTO"}';
  const UNID = [[/^(feet|ft)$/, 'alt', 0.3048], [/^(mph)$/, 'vel', 0.44704], [/^(km\/h|kph|kmh)$/, 'vel', 1 / 3.6], [/^(knots|kt)$/, 'vel', 0.514444], [/^(millisecond|milliseconds|ms)$/, 't', 0.001], [/^(second|seconds|s)$/, 't', 1]];
  function clave(k) {
    const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(String(k)); let base = (m ? m[1] : String(k)).trim().toLowerCase().replace(/[\s-]+/g, '_'), u = m ? m[2].trim().toLowerCase() : '', fac = 1;
    if (u) UNID.forEach(([re, , f]) => { if (re.test(u)) fac = f; });
    if (/_ms$/.test(base) && !m) { fac = 0.001; base = base.replace(/_ms$/, ''); }
    return { campo: INV[base] || null, fac };
  }
  T.normalizar = (o, mapa) => {         // objeto plano -> trama normalizada o null si no trae posicion ni nada util
    if (!o || typeof o !== 'object') return null;
    const s = {};
    Object.keys(o).forEach(k => {
      const c = mapa ? mapa[k] : clave(k); if (!c || !c.campo) return;
      let v = o[k]; if (c.campo === 'modo') { s.modo = String(v); return; }
      if (c.campo === 't' && typeof v === 'string' && isNaN(+v)) { const d = Date.parse(v); if (isFinite(d)) { s.t = d / 1000; } return; }
      v = parseFloat(v); if (!isFinite(v)) return; v *= c.fac;
      if ((c.campo === 'lat' || c.campo === 'lon') && Math.abs(v) > 1000) v /= 1e7;
      if (c.campo === 'rumbo' && s.rumbo != null && k.toLowerCase() === 'yaw') return;
      if (c.campo === 't' && !/ms|millisecond|second|^s$/i.test(k) && v > 1e11) v /= 1000;     // epoch ms sin unidad declarada
      s[c.campo] = v;
    });
    if (s.rumbo != null) s.rumbo = Geo.norm360(s.rumbo);
    return Object.keys(s).length ? s : null;
  };
  /* buffer de lineas para flujos serie: push(texto) -> lineas completas */
  T.Lineas = function () { let r = ''; return { push(t) { r += t; const p = r.split(/\r?\n/); r = p.pop(); if (r.length > 65536) r = ''; return p.filter(x => x.trim()); } }; };
  /* estado del Tello: "pitch:0;roll:0;yaw:10;vgx:0;h:30;bat:87;..." (h en cm) */
  T.parseTello = l => {
    const o = {}; String(l).trim().split(';').forEach(p => { const i = p.indexOf(':'); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
    if (o.bat == null && o.h == null && o.yaw == null) return null;
    const n = k => { const v = parseFloat(o[k]); return isFinite(v) ? v : undefined; }, s = {};
    if (n('bat') != null) s.bat = n('bat'); if (n('h') != null) s.alt = n('h') / 100; if (n('yaw') != null) s.rumbo = Geo.norm360(n('yaw')); if (n('pitch') != null) s.pitch = n('pitch'); if (n('roll') != null) s.roll = n('roll'); s.modo = 'TELLO';
    return s;
  };
  T.parseLinea = l => { l = String(l).trim(); if (!l) return null; if (l[0] === '{') { try { return T.normalizar(JSON.parse(l)); } catch (e) { return null; } } if (/bat:|yaw:|h:\d/.test(l) && l.indexOf(';') > 0) return T.parseTello(l); return null; };
  const mapaDe = cols => { const m = {}; cols.forEach(c => { m[c] = clave(c); }); return m; };
  function csvFilas(txt) {
    txt = String(txt).replace(/^﻿/, ''); const prim = txt.split(/\r?\n/)[0] || '', sep = [',', ';', '\t'].map(s => [s, prim.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const filas = []; let fila = [], cel = '', q = false;
    for (let i = 0; i < txt.length; i++) { const c = txt[i]; if (q) { if (c === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else q = false; } else cel += c; } else if (c === '"' && cel === '') q = true; else if (c === sep) { fila.push(cel); cel = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; fila.push(cel); cel = ''; filas.push(fila); fila = []; } else cel += c; }
    if (cel !== '' || fila.length) { fila.push(cel); filas.push(fila); }
    return filas.filter(f => f.some(x => x.trim() !== ''));
  }
  /* devuelve {muestras:[{t(s desde inicio),lat,lon,alt,vel,bat,...}], info, avisos[]} ; lanza Error con mensaje claro */
  T.parseLog = (txt, nombre) => {
    txt = String(txt == null ? '' : txt).trim(); if (!txt) throw new Error('El archivo está vacío.');
    let crudas = [], mapa = null, formato = '';
    if (txt[0] === '[' || txt[0] === '{') {
      let j = null; try { j = JSON.parse(txt); } catch (e) { j = null; }
      if (j == null) { formato = 'NDJSON'; crudas = txt.split(/\r?\n/).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); }
      else { formato = 'JSON'; crudas = Array.isArray(j) ? j : ['muestras', 'samples', 'frames', 'data', 'telemetria', 'log', 'puntos'].map(k => j[k]).filter(Array.isArray)[0] || []; }
      if (!crudas.length) throw new Error('No encontré muestras en el JSON (usa un arreglo o {"muestras":[...]}).');
    } else {
      formato = 'CSV'; const filas = csvFilas(txt); if (filas.length < 2) throw new Error('El CSV necesita encabezado y al menos una fila.');
      const cols = filas[0].map(c => c.trim()); mapa = mapaDe(cols);
      if (!cols.some(c => mapa[c].campo === 'lat') && !cols.some(c => mapa[c].campo === 'alt') && !cols.some(c => mapa[c].campo === 'vel')) throw new Error('No reconozco columnas (esperaba latitude/lat, longitude/lon, altitude/alt, speed/vel, battery/bat, time…).');
      crudas = filas.slice(1).map(f => { const o = {}; cols.forEach((c, i) => { o[c] = f[i]; }); return o; });
    }
    let t0 = null, mu = [], sinT = false, malas = 0;
    crudas.forEach((o, i) => {
      const s = T.normalizar(o, mapa); if (!s) { malas++; return; }
      if (s.t == null) { sinT = true; s.t = i; }
      mu.push(s);
    });
    if (!mu.length) throw new Error('Ninguna fila tenía datos reconocibles.');
    const avisos = []; if (sinT) avisos.push('Sin columna de tiempo: se asume 1 muestra por segundo.'); if (malas) avisos.push(malas + ' fila(s) ignoradas por no tener datos.');
    t0 = mu[0].t; mu.forEach(s => { s.t = Math.round((s.t - t0) * 1000) / 1000; });
    mu = mu.filter(s => isFinite(s.t)); mu.sort((a, b) => a.t - b.t);
    return { muestras: mu, info: T.resumen(mu), avisos, formato, nombre: nombre || '' };
  };
  T.resumen = mu => {
    let dist = 0, altMax = 0, velMax = 0, batIni = null, batFin = null, prev = null, conPos = 0;
    mu.forEach(s => {
      if (s.alt != null) altMax = Math.max(altMax, s.alt); if (s.vel != null) velMax = Math.max(velMax, s.vel);
      if (s.bat != null) { if (batIni == null) batIni = s.bat; batFin = s.bat; }
      if (s.lat != null && s.lon != null && (s.lat !== 0 || s.lon !== 0)) { conPos++; if (prev) dist += Geo.haversine(prev.lat, prev.lon, s.lat, s.lon); prev = s; }
    });
    return { n: mu.length, duracion: mu.length ? mu[mu.length - 1].t : 0, distancia: dist, altMax, velMax, batIni, batFin, conPos };
  };
  /* convierte a coordenadas locales respecto de un origen (o del primer punto) */
  T.aRuta = (mu, origen) => {
    const pts = mu.filter(s => s.lat != null && s.lon != null && (s.lat !== 0 || s.lon !== 0)); if (!pts.length) return { origen: null, ruta: [] };
    const o = origen && Geo.valido(origen) ? origen : { lat: pts[0].lat, lon: pts[0].lon };
    return { origen: o, ruta: pts.map(s => Object.assign({ idx: mu.indexOf(s) }, Geo.aLocal(o, s.lat, s.lon), { alt: s.alt, t: s.t })) };
  };
  T.enT = (mu, t) => { if (!mu.length) return null; let lo = 0, hi = mu.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (mu[m].t <= t) lo = m; else hi = m - 1; } return mu[lo]; };
  return T;
});
