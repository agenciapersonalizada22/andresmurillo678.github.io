/* Vista «Analisis»: graficas propias (linea de tiempo, actividad, ocupacion, cruces, calor, color, calidad) e informe imprimible. window.VAnalisisUI */
(function (g) {
  'use strict';
  var V = g.VApp, T = g.Tr, h = T.h, A = g.VAnalisis, G = g.VGraf, M = g.VMotor, U = g.VAnalisisUI = {}, el = {}, calor = null, timer = 0;
  function dur() { var s = V.serie.t; return Math.max(V.meta.dur || 0, s.length ? s[s.length - 1] : 0, V.eventos.length ? V.eventos[V.eventos.length - 1].t : 0, 1); }
  function media(a) { var v = a.filter(function (x) { return x != null && isFinite(x); }); return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : null; }
  U.datos = function () {
    var s = V.serie, d = dur(), pk = A.picos(s.t, s.mov, { n: 5, sep: Math.max(1, d / 20), min: 0.0001 }), cr = V.ult && V.ult.cruces || {};
    var cnt = {}; Object.keys(V.conteoTipos).forEach(function (k) { cnt[k] = V.conteoTipos[k]; });
    return { dur: d, fuente: V.meta.fuente || '(sin fuente)', generado: new Date(), picos: pk, cruces: cr, conteo: cnt, movMedia: media(s.mov), movMax: s.mov.length ? Math.max.apply(null, s.mov) : 0, ocupMax: s.ocup.length ? Math.max.apply(null, s.ocup) : 0, ocupMedia: media(s.ocup), brillo: media(s.bri), nitidez: media(s.nit), ruido: media(s.rui), muestras: s.t.length, eventos: V.eventos.length };
  };
  function graficas(tema, d, celdas) {
    var s = V.serie, pct = function (v) { return (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%'; };
    return {
      linea: G.lineaTiempo(V.eventos, d.dur, tema), act: G.serie(s.t, s.mov, { titulo: 'Actividad (% del cuadro con movimiento)', dur: d.dur, picos: d.picos, fmt: pct, color: G.PAL[0], min1: 0.02 }, tema),
      ocu: G.serie(s.t, s.ocup, { titulo: 'Ocupación (objetos a la vez)', dur: d.dur, escalon: true, color: G.PAL[1], max: Math.max(2, d.ocupMax), fmt: function (v) { return Math.round(v); } }, tema),
      cru: G.barrasCruces(V.cfg.lineas, d.cruces, tema), cal: G.celdasCalor(celdas || [], 8, 6, tema), col: G.colores(V.colores, tema),
      bri: G.serie(s.t, s.bri.map(function (x) { return x == null ? null : x; }), { titulo: 'Brillo (0–255)', dur: d.dur, color: G.PAL[2], max: 255, fmt: function (v) { return Math.round(v); }, alto: 70 }, tema)
    };
  }
  async function pintar() {
    var d = U.datos(), c = await M.calor(); calor = c; var celdas = c && c.celdas || [], gr = graficas('pantalla', d, celdas);
    el.kpis.textContent = ''; [['Duración', A.fmtT(d.dur)], ['Eventos', d.eventos], ['Movimiento medio', d.movMedia == null ? '—' : (d.movMedia * 100).toFixed(1) + ' %'], ['Pico de ocupación', d.ocupMax], ['Brillo medio', d.brillo == null ? '—' : Math.round(d.brillo)], ['Nitidez media', d.nitidez == null ? '—' : d.nitidez.toFixed(0)], ['Ruido medio', d.ruido == null ? '—' : d.ruido.toFixed(1)]].forEach(function (k) { el.kpis.appendChild(h('div', { cls: 'vi-stat' }, [h('span', { txt: k[0] }), h('b', { txt: String(k[1]) })])); });
    el.vacio.hidden = d.eventos > 0 || d.muestras > 0; var set = function (k, html) { el[k].innerHTML = html; };
    set('gLinea', gr.linea); set('gAct', gr.act); set('gOcu', gr.ocu); set('gCru', gr.cru); set('gBri', gr.bri); set('gCol', gr.col);
    el.gCal.textContent = ''; el.gCal.insertAdjacentHTML('beforeend', gr.cal);
    el.picos.textContent = d.picos.length ? 'Picos de actividad: ' + d.picos.map(function (p) { return A.fmtT(p.t) + ' (' + (p.v * 100).toFixed(1) + ' %)'; }).join(' · ') : 'Aún no hay picos de actividad.';
    el.tabla.textContent = ''; Object.keys(d.conteo).sort(function (a, b) { return d.conteo[b] - d.conteo[a]; }).forEach(function (k) { el.tabla.appendChild(h('tr', {}, [h('td', { txt: G.nombres[k] || k }), h('td', { txt: String(d.conteo[k]) })])); });
  }
  U.actualizar = pintar;

  /* ---------- informe imprimible (A4) con Impresion ---------- */
  function informeSVG(i, ce, d, gr, filas) {
    var w = ce.w, o = '', y = 0, S = function (svg, h2) { var r = '<svg x="0" y="' + y + '" width="' + w + '" height="' + h2 + '" viewBox="' + (svg.match(/viewBox="([^"]+)"/) || [0, '0 0 400 100'])[1] + '" preserveAspectRatio="xMidYMid meet">' + svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>'; y += h2 + 3; return r; };
    function t(s, sz, b, c, x) { var r = '<text x="' + (x || 0) + '" y="' + (y + sz) + '" font-size="' + sz + '" style="fill:' + (c || '#111') + (b ? ';font-weight:700' : '') + '">' + T.esc(s) + '</text>'; y += sz * 1.5; return r; }
    function h2(s) { y += 2; return t(s, 4.2, true, '#3e63dd'); }
    if (i === 0) {
      o += t('Informe de video inteligente', 7, true) + t(d.fuente + ' · ' + d.generado.toLocaleString('es') + ' · duración ' + A.fmtT(d.dur), 3.2, false, '#555'); y += 1;
      var k = [['Eventos', d.eventos], ['Mov. medio', d.movMedia == null ? '—' : (d.movMedia * 100).toFixed(1) + ' %'], ['Máx. ocupación', d.ocupMax], ['Brillo', d.brillo == null ? '—' : Math.round(d.brillo)], ['Nitidez', d.nitidez == null ? '—' : d.nitidez.toFixed(0)], ['Ruido', d.ruido == null ? '—' : d.ruido.toFixed(1)]], cw = w / k.length;
      k.forEach(function (x, j) { o += '<rect x="' + (j * cw + 0.5) + '" y="' + y + '" width="' + (cw - 1) + '" height="13" rx="1.5" fill="#f1f3f9"/><text x="' + (j * cw + cw / 2) + '" y="' + (y + 4.5) + '" font-size="2.8" text-anchor="middle" fill="#555">' + T.esc(x[0]) + '</text><text x="' + (j * cw + cw / 2) + '" y="' + (y + 10.5) + '" font-size="5" font-weight="700" text-anchor="middle" fill="#111">' + T.esc(String(x[1])) + '</text>'; }); y += 16;
      o += h2('Eventos en la línea de tiempo') + S(gr.linea, 34) + h2('Actividad') + S(gr.act, 34) + h2('Ocupación') + S(gr.ocu, 30) + h2('Cruces de líneas virtuales') + S(gr.cru, 26) + h2('Mapa de calor de actividad') + S(gr.cal, 60) + h2('Colores dominantes') + S(gr.col, 26);
      o += t('Datos calculados en el dispositivo con análisis clásico (sin modelos). Las cifras son orientativas.', 2.6, false, '#777');
    } else {
      o += t('Eventos registrados', 5.5, true) + t('Primeros ' + filas.length + ' de ' + V.eventos.length, 3, false, '#555');
      filas.forEach(function (e) { o += '<text x="0" y="' + (y + 3) + '" font-size="3" fill="#111">' + T.esc(A.fmtT(e.t)) + '</text><text x="16" y="' + (y + 3) + '" font-size="3" fill="#111" font-weight="700">' + T.esc(G.nombres[e.tipo] || e.tipo) + '</text><text x="58" y="' + (y + 3) + '" font-size="3" fill="#333">' + T.esc(String(e.texto || '').slice(0, 70)) + '</text>'; y += 4.6; });
      if (V.resumenIA) { y += 4; o += t('Resumen por IA (opcional)', 4.5, true, '#3e63dd') + t(V.resumenIA.titulo, 3.6, true); (V.resumenIA.resumen.match(/.{1,95}(\s|$)/g) || []).slice(0, 8).forEach(function (l) { o += t(l.trim(), 3, false, '#222'); }); }
    }
    return o;
  }
  function config() { var d = U.datos(), gr = graficas('papel', d, calor && calor.celdas), filas = V.eventos.slice(0, 40); var L = g.Impresion.calcular({ papel: 'A4', orient: 'vertical', modo: 'cuadricula', cols: 1, filas: 1, mt: 12, mb: 12, mi: 12, md: 12, total: 2 }); return { L: L, dib: function (i, ce) { return informeSVG(i, ce, d, gr, filas); } }; }
  async function vistaPrevia() { await pintar(); var c = config(); g.Impresion.vistaPrevia(el.prev, c.L, c.dib, {}); el.prev.hidden = false; }
  async function imprimir() { await pintar(); var c = config(); g.Impresion.imprimir(c.L, c.dib, {}); }
  async function png() { await pintar(); var c = config(); try { var b = await g.Impresion.aPNG(c.L, 0, c.dib, { dpi: 150 }); T.descargar(b, 'informe_video_ia.png'); } catch (e) { T.aviso(e.message, 'error'); } }

  U.iniciar = function (cont) {
    function caja(id, titulo) { el[id] = h('div', { cls: 'vi-graf' }); return h('div', { cls: 'tr-panel' }, [h('h2', { txt: titulo }), el[id]]); }
    el.kpis = h('div', { cls: 'vi-stats' }); el.vacio = h('p', { cls: 'tr-vacio', txt: 'Todavía no hay datos. Abre una fuente en «En vivo» o analiza un archivo en «Edición».' }); el.picos = h('p', { cls: 'tr-ayuda' }); el.tabla = h('tbody'); el.prev = h('div', { hidden: true, cls: 'vi-prev' });
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Resumen' }), el.kpis, el.vacio, el.picos, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Actualizar', on: { click: pintar } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Eventos CSV', on: { click: function () { T.descargar(new Blob([A.csvEventos(V.eventos)], { type: 'text/csv' }), 'eventos.csv'); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Informe JSON', on: { click: function () { var d = U.datos(); T.descargar(new Blob([JSON.stringify(Object.assign({}, d, { serie: V.serie, eventos: V.eventos.slice(0, 1000), colores: V.colores }), null, 1)], { type: 'application/json' }), 'informe.json'); } } })])]));
    cont.appendChild(caja('gLinea', 'Eventos en la línea de tiempo')); cont.appendChild(caja('gAct', 'Actividad y picos')); cont.appendChild(caja('gOcu', 'Ocupación')); cont.appendChild(caja('gCru', 'Cruces de líneas virtuales')); cont.appendChild(caja('gCal', 'Mapa de calor por zonas')); cont.appendChild(caja('gCol', 'Colores dominantes')); cont.appendChild(caja('gBri', 'Brillo en el tiempo'));
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Conteo por tipo de evento' }), h('table', { cls: 'vi-tabla' }, [h('thead', {}, [h('tr', {}, [h('th', { txt: 'Evento' }), h('th', { txt: 'Veces' })])]), el.tabla])]));
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Informe imprimible' }), h('p', { cls: 'tr-ayuda', txt: 'Hoja A4 con resumen, gráficas y tabla de eventos (motor de impresión común de Trabajos).' }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Vista previa', on: { click: vistaPrevia } }), h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Imprimir / PDF', on: { click: imprimir } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Descargar PNG', on: { click: png } })]), el.prev]));
    V.on('analizado', pintar);
  };
  U.alMostrar = function () { pintar(); clearInterval(timer); timer = setInterval(function () { if (el.kpis && el.kpis.offsetParent && M.activo()) pintar(); }, 3000); };
  U.alOcultar = function () { clearInterval(timer); };
})(window);
