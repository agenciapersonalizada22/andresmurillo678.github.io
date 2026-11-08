/* Utilidades comunes de Trabajos: DOM, tema, avisos, descargas, ZIP (sin compresion) y CSV. Script clasico: window.Tr. */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.Tr = m; })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var Tr = {};
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  Tr.ls = ls;
  Tr.h = function (tag, p, kids) {
    var e = document.createElement(tag);
    for (var k in p || {}) { if (k === 'cls') e.className = p[k]; else if (k === 'txt') e.textContent = p[k]; else if (k === 'on') { for (var ev in p.on) e.addEventListener(ev, p.on[ev]); } else if (p[k] === false || p[k] == null) continue; else e.setAttribute(k, p[k] === true ? '' : p[k]); }
    (kids || []).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };
  Tr.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  Tr.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
  Tr.hash = function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  /* tema claro/oscuro/auto (ajuste del dispositivo, no se sincroniza) */
  var TEMAS = ['auto', 'claro', 'oscuro'];
  Tr.tema = function (boton) {
    var t = ls('trabajos_tema_dispositivo'); if (TEMAS.indexOf(t) < 0) t = 'auto';
    function aplicar() { if (t === 'auto') document.documentElement.removeAttribute('data-tema'); else document.documentElement.setAttribute('data-tema', t); if (boton) { var s = boton.querySelector('span'); if (s) s.textContent = 'Tema: ' + t; boton.setAttribute('aria-label', 'Cambiar tema (actual: ' + t + ')'); } }
    aplicar();
    if (boton) boton.addEventListener('click', function () { t = TEMAS[(TEMAS.indexOf(t) + 1) % 3]; ls('trabajos_tema_dispositivo', t); aplicar(); });
  };
  /* aviso accesible (aria-live) */
  Tr.aviso = function (msg, tipo) {
    var r = document.getElementById('tr-avisos');
    if (!r) { r = document.createElement('div'); r.id = 'tr-avisos'; r.className = 'tr-avisos'; r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
    var d = document.createElement('div'); d.className = 'tr-aviso' + (tipo ? ' tr-' + tipo : ''); d.textContent = msg; r.appendChild(d);
    setTimeout(function () { d.remove(); }, tipo === 'error' ? 7000 : 3500);
  };
  Tr.descargar = function (blob, nombre) {
    var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  };
  Tr.nombreArchivo = function (s, max) { return (String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'archivo').slice(0, max || 40); };
  Tr.bytes = function (s) { return new TextEncoder().encode(s); };
  Tr.dataUrlABlob = function (u) { var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream', b = atob(p[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: mime }); };

  /* ZIP "store" (sin comprimir): archivos = [{nombre, datos: Uint8Array}] */
  var CRC = null;
  function crc32(d) {
    if (!CRC) { CRC = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
    var c2 = 0xFFFFFFFF; for (var i = 0; i < d.length; i++) c2 = CRC[(c2 ^ d[i]) & 255] ^ (c2 >>> 8); return (c2 ^ 0xFFFFFFFF) >>> 0;
  }
  Tr.crc32 = crc32;
  Tr.zip = function (archivos) {
    var partes = [], central = [], pos = 0, ahora = new Date(), dt = ((ahora.getFullYear() - 1980) << 9 | (ahora.getMonth() + 1) << 5 | ahora.getDate()) & 0xFFFF, hr = (ahora.getHours() << 11 | ahora.getMinutes() << 5 | ahora.getSeconds() >> 1) & 0xFFFF;
    function u16(v) { return [v & 255, v >>> 8 & 255]; } function u32(v) { return [v & 255, v >>> 8 & 255, v >>> 16 & 255, v >>> 24 & 255]; }
    archivos.forEach(function (a) {
      var nom = Tr.bytes(a.nombre), crc = crc32(a.datos), n = a.datos.length;
      var cab = [0x50, 0x4B, 3, 4].concat(u16(20), u16(0x0800), u16(0), u16(hr), u16(dt), u32(crc), u32(n), u32(n), u16(nom.length), u16(0));
      partes.push(new Uint8Array(cab), nom, a.datos);
      central.push(new Uint8Array([0x50, 0x4B, 1, 2].concat(u16(20), u16(20), u16(0x0800), u16(0), u16(hr), u16(dt), u32(crc), u32(n), u32(n), u16(nom.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(pos))), nom);
      pos += cab.length + nom.length + n;
    });
    var tamC = 0; central.forEach(function (c) { tamC += c.length; });
    var fin = new Uint8Array([0x50, 0x4B, 5, 6, 0, 0, 0, 0].concat(u16(archivos.length), u16(archivos.length), u32(tamC), u32(pos), u16(0)));
    return new Blob(partes.concat(central, [fin]), { type: 'application/zip' });
  };

  /* CSV (RFC 4180 basico; detecta , ; o tabulador) -> filas de cadenas */
  Tr.csv = function (txt) {
    txt = String(txt).replace(/^﻿/, '');
    var prim = txt.split(/\r?\n/)[0] || '', sep = [',', ';', '\t'].map(function (s) { return [s, prim.split(s).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var filas = [], fila = [], cel = '', q = false, i, c;
    for (i = 0; i < txt.length; i++) {
      c = txt[i];
      if (q) { if (c === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else q = false; } else cel += c; }
      else if (c === '"' && cel === '') q = true;
      else if (c === sep) { fila.push(cel); cel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; fila.push(cel); cel = ''; filas.push(fila); fila = []; }
      else cel += c;
    }
    if (cel !== '' || fila.length) { fila.push(cel); filas.push(fila); }
    return filas.filter(function (f) { return f.some(function (x) { return x.trim() !== ''; }); });
  };
  /* tablist accesible con flechas */
  Tr.tabs = function (lista, alCambiar) {
    var tabs = Array.prototype.slice.call(lista.querySelectorAll('[role=tab]'));
    function sel(t, foco) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      if (foco) t.focus(); if (alCambiar) alCambiar(t.getAttribute('data-vista'));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { sel(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
        if (n < 0) return; e.preventDefault(); sel(tabs[(n + tabs.length) % tabs.length], true);
      });
    });
    return { ir: function (v) { var t = tabs.filter(function (x) { return x.getAttribute('data-vista') === v; })[0]; if (t) sel(t); } };
  };
  return Tr;
});
