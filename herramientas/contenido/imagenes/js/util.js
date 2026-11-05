/* Utilidades de interfaz: DOM, iconos, avisos. Espacio de nombres global IM. */
window.IM = window.IM || {};
(function (IM) {
  IM.uid = function () { return Math.random().toString(36).slice(2, 10); };
  IM.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  IM.h = function (tag, attrs) {
    var el = document.createElement(tag), i, k;
    if (attrs) for (k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') for (var s in v) el.style[s] = v[s];
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list' && k !== 'type' && typeof v !== 'object') { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  };
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  var ICON = {
    sel: 'M5 3l14 7-6 2-2 6z', mano: 'M8 13V5.5a1.5 1.5 0 013 0V11m0-5.5a1.5 1.5 0 013 0V11m0-3.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-4.5-2L4 15a1.6 1.6 0 012.4-2L8 15',
    texto: 'M5 6V4h14v2M12 4v16M9 20h6', forma: 'M3 12h9v9H3zM15.5 3a5 5 0 100 10 5 5 0 000-10z',
    pincel: 'M18 3l3 3-9 9-3-3zM9 12c-3 0-4 2-4 4s-2 3-2 3 5 1 7-1c1-1 1-3 0-4', borrador: 'M7 21h13M5 15l9-9 5 5-6 6H8z',
    lapiz: 'M4 20l1-4L17 4l3 3L8 19z', gotero: 'M14 4l6 6-3 3-6-6zM12 8l-8 8v4h4l8-8', relleno: 'M5 11l7-7 7 7-7 7zM19 15c1 1.5 2 2.8 2 4a2 2 0 01-4 0c0-1.2 1-2.5 2-4',
    recorte: 'M6 2v16h16M2 6h16v16', varita: 'M4 20L16 8M15 3v4M13 5h4M20 10v4M18 12h4', persp: 'M4 18l4-12h8l4 12zM8 6l-4 12M16 6l4 12',
    deshacer: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3', rehacer: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
    mas: 'M12 5v14M5 12h14', menos: 'M5 12h14', capas: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', ajustes: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
    menu: 'M4 6h16M4 12h16M4 18h16', ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
    ojoNo: 'M3 3l18 18M10 6a9 9 0 0112 6 13 13 0 01-3 3.5M6.5 7A13 13 0 002 12s4 7 10 7a9 9 0 004-1', candado: 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4',
    abierto: 'M6 11h12v10H6zM8 11V7a4 4 0 017.5-2', duplicar: 'M8 8h12v12H8zM4 16V4h12', borrar: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    arriba: 'M12 19V5M6 11l6-6 6 6', abajo: 'M12 5v14M6 13l6 6 6-6', exportar: 'M12 3v12M7 8l5-5 5 5M4 17v4h16v-4', carpeta: 'M3 6h7l2 2h9v11H3z',
    luna: 'M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z', sol: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
    ayuda: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.5 9a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17h0', cerrar: 'M6 6l12 12M18 6L6 18', imagen: 'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M8 9h0',
    plantilla: 'M3 3h18v6H3zM3 13h8v8H3zM15 13h6v8h-6z', qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 14h2v2M14 20h2M19 19h2v2', camara: 'M3 7h4l2-3h6l2 3h4v13H3zM12 10a4 4 0 100 8 4 4 0 000-8z',
    cuadricula: 'M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18', regla: 'M3 8h18v8H3zM7 8v3M11 8v4M15 8v3M19 8v4', agrupar: 'M4 4h8v8H4zM12 12h8v8h-8z', pagina: 'M6 3h9l4 4v14H6zM15 3v4h4',
    voltearH: 'M12 3v18M8 7l-5 5 5 5zM16 7l5 5-5 5z', voltearV: 'M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z', mascara: 'M3 3h18v18H3zM12 7a5 5 0 100 10 5 5 0 000-10z', mando: 'M7 8h10a5 5 0 015 5v1a3 3 0 01-5 2l-2-2H9l-2 2a3 3 0 01-5-2v-1a5 5 0 015-5z',
    historial: 'M3 12a9 9 0 109-9 9 9 0 00-7 3.5M3 4v4h4M12 7v5l3 2', zoom: 'M10 3a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5', paleta: 'M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 003-3c0-6-4-11-8-11z',
    guardar: 'M5 3h12l4 4v14H5zM8 3v6h8V3M8 21v-7h8v7', alinear: 'M4 4v16M8 7h12M8 13h8M8 19h10'
  };
  IM.ic = function (n, tam) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'ic');
    if (tam) { s.setAttribute('width', tam); s.setAttribute('height', tam); }
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICON[n] || ICON.mas); s.appendChild(p); return s;
  };
  var aviso = null, tAviso = 0;
  IM.aviso = function (txt, tipo) {
    var el = document.getElementById('avisos'); if (!el) return;
    el.textContent = txt; el.className = 'aviso ' + (tipo || ''); el.hidden = false;
    clearTimeout(tAviso); tAviso = setTimeout(function () { el.hidden = true; }, tipo === 'error' ? 5000 : 2400);
  };
  IM.descargar = function (blob, nombre) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };
  IM.debounce = function (f, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { f.apply(s, a); }, ms); }; };
  IM.confirmar = function (txt) { return window.confirm(txt); };
  IM.lienzo = function (w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  IM.nombreArchivo = function (s) { return String(s || 'imagen').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'imagen'; };
})(window.IM);
