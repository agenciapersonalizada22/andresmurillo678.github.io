/* Linea de tiempo multipista (DOM + gestos). VE.linea */
(function (g) {
  var M = g.VE.modelo, F = g.VE.fuentes, h = g.VE.h, $ = g.VE.$, K = g.VE.keyframes;
  var L = { pps: 60 }, A = null;
  var ALTO = { video: 62, pip: 52, texto: 38, audio: 46, musica: 46 }, NOMBRE = { video: 'Video', pip: 'Superpos.', texto: 'Texto', audio: 'Audio', musica: 'Música' };
  var ptrs = {}, modo = null, pinch = null;

  L.iniciar = function (app) {
    A = app; var lh = $('lineaH');
    L.pps = window.matchMedia('(max-width:900px)').matches ? 36 : 60;
    lh.addEventListener('pointerdown', abajo); lh.addEventListener('pointermove', mueve); lh.addEventListener('pointerup', arriba); lh.addEventListener('pointercancel', arriba);
    lh.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); L.zoomEn(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX); } else if (e.shiftKey && !e.deltaX) { lh.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    lh.addEventListener('dragover', function (e) { if (e.dataTransfer.types.indexOf('text/medio') >= 0) { e.preventDefault(); } });
    lh.addEventListener('drop', function (e) {
      var id = e.dataTransfer.getData('text/medio'); if (!id) return; e.preventDefault();
      var t = L.tiempoX(e.clientX), pz = pistaEn(e.clientY); A.agregarClipDeMedio(id, { ini: t, pistaId: pz && pz.dataset.id });
    });
    $('tlZoom').addEventListener('input', function () { L.zoomAbs(Math.pow(400 / 8, this.value / 100) * 8); });
    $('tlZoomMas').onclick = function () { L.zoomEn(1.3); }; $('tlZoomMenos').onclick = function () { L.zoomEn(1 / 1.3); };
    $('tlAjustar').onclick = L.ajustar;
    $('regla').addEventListener('click', function (e) { var m = e.target.closest('.mk'); if (m) { A.motor.ir(+m.dataset.t); } });
  };
  L.tiempoX = function (cx) { var lh = $('lineaH'); return Math.max(0, (cx - lh.getBoundingClientRect().left + lh.scrollLeft) / L.pps); };
  function pistaEn(cy) { var r = null; document.querySelectorAll('#pistas .pista').forEach(function (e) { var b = e.getBoundingClientRect(); if (cy >= b.top && cy < b.bottom) r = e; }); return r; }
  L.zoomAbs = function (pps, anclaX) {
    var lh = $('lineaH'), old = L.pps; pps = Math.max(8, Math.min(400, pps)); if (pps === old) return;
    var ax = anclaX == null ? lh.clientWidth / 2 : anclaX - lh.getBoundingClientRect().left, tAncla = (lh.scrollLeft + ax) / old;
    L.pps = pps; L.render(); lh.scrollLeft = tAncla * pps - ax;
    $('tlZoom').value = Math.round(100 * Math.log(pps / 8) / Math.log(400 / 8));
  };
  L.zoomEn = function (k, x) { L.zoomAbs(L.pps * k, x); };
  L.ajustar = function () { var d = Math.max(8, M.duracion(A.p)); L.zoomAbs(($('lineaH').clientWidth - 30) / d); $('lineaH').scrollLeft = 0; };

  function paso(span) { var s = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600], px = 80; for (var i = 0; i < s.length; i++) if (s[i] * L.pps >= px) return s[i]; return 600; }
  L.render = function () {
    var p = A.p, dur = Math.max(M.duracion(p) + 6, 12), lh = $('lineaH'), w = Math.max(lh.clientWidth, dur * L.pps + 80);
    $('lineaAncho').style.width = w + 'px';
    var regla = $('regla'); regla.textContent = ''; var st = paso();
    for (var t = 0; t * L.pps < w; t += st) regla.appendChild(h('div', { class: 'tk', estilo: 'left:' + t * L.pps + 'px', texto: st < 1 ? t.toFixed(1) + 's' : M.fmt(t).slice(0, 5) }));
    p.marcadores.forEach(function (m) { regla.appendChild(h('div', { class: 'mk', 'data-t': m.t, estilo: 'left:' + m.t * L.pps + 'px', title: 'Marcador ' + (m.nombre || '') + ' (clic: ir)', texto: '⚑' })); });
    var cab = $('cabeceras'), pis = $('pistas'); cab.textContent = ''; pis.textContent = '';
    cab.appendChild(h('div', { class: 'cab regla' }));
    var cuenta = {};
    p.pistas.forEach(function (pt) {
      var alto = ALTO[pt.tipo], n = cuenta[pt.tipo] = (cuenta[pt.tipo] || 0) + 1, visual = pt.tipo !== 'audio' && pt.tipo !== 'musica';
      cab.appendChild(h('div', { class: 'cab', estilo: 'height:' + (alto + 1) + 'px' },
        h('b', { texto: pt.nombre || NOMBRE[pt.tipo] + (n > 1 ? ' ' + n : '') }),
        h('button', { title: visual ? 'Mostrar/ocultar pista' : 'Silenciar pista', 'aria-label': visual ? 'Mostrar u ocultar pista' : 'Silenciar pista', 'aria-pressed': String(!!(visual ? pt.oculta : pt.mute)), onclick: function () { if (visual) pt.oculta = !pt.oculta; else pt.mute = !pt.mute; A.commit(); }, texto: visual ? (pt.oculta ? '🚫' : '👁') : (pt.mute ? '🔇' : '🔊') })));
      var fila = h('div', { class: 'pista p-' + pt.tipo, 'data-id': pt.id, estilo: '--alto:' + alto + 'px' });
      pt.clips.forEach(function (c) { fila.appendChild(elemClip(c, pt)); });
      pis.appendChild(fila);
    });
    L.cabezal(A.motor.t, true);
  };
  function etiqueta(c) {
    var m = A.p.medios[c.medio];
    if (c.tipo === 'texto') return (c.sub ? '💬 ' : 'T ') + String(c.texto).replace(/\n/g, ' ');
    if (c.tipo === 'emoji') return c.texto; if (c.tipo === 'forma') return '◆ ' + (c.forma === 'fondo' ? 'Fondo' : c.forma);
    return (c.tipo === 'audio' ? '♪ ' : '') + (c.nombre || (m && m.nombre) || '');
  }
  function elemClip(c, pt) {
    var w = Math.max(6, c.dur * L.pps), sel = A.sel === c.id;
    var el = h('div', { class: 'clip t-' + c.tipo + (sel ? ' sel' : '') + (c.vel !== 1 || c.inv || c.cong ? ' trasvelo' : ''), 'data-id': c.id, tabindex: '0', role: 'button', 'aria-label': etiqueta(c) + ', ' + c.dur.toFixed(1) + ' segundos', 'aria-pressed': String(sel), estilo: 'left:' + c.ini * L.pps + 'px;width:' + w + 'px' },
      h('div', { class: 'hi', title: 'Recortar inicio' }), h('div', { class: 'hf', title: 'Recortar fin' }), h('div', { class: 'et', texto: etiqueta(c) }));
    if (c.vel !== 1 || c.inv || c.cong) el.dataset.v = c.cong ? '❄' : (c.inv ? '⏪ ' : '') + (c.vel !== 1 ? c.vel + '×' : '');
    if (c.trans && c.trans.tipo !== 'ninguna') el.appendChild(h('div', { class: 'tr', estilo: 'width:' + c.trans.dur * L.pps + 'px', title: 'Transición: ' + c.trans.tipo }));
    Object.keys(c.kf || {}).forEach(function (pr) { (c.kf[pr] || []).forEach(function (k) { el.appendChild(h('div', { class: 'kfm', estilo: 'left:' + k.t * L.pps + 'px' })); }); });
    var e = F.medios[c.medio];
    if ((c.tipo === 'video' || c.tipo === 'imagen') && e) {
      var aplica = function (t) { if (!t) return; var span = Math.max(0.01, c.dur * c.vel); el.style.backgroundImage = 'url(' + t.url + ')'; el.style.backgroundSize = c.tipo === 'imagen' ? 'auto 100%' : (e.m.dur / span * w) + 'px 100%'; el.style.backgroundPosition = c.tipo === 'imagen' ? '0 0' : (-(c.off / span) * w) + 'px 0'; el.style.backgroundRepeat = c.tipo === 'imagen' ? 'repeat-x' : 'no-repeat'; };
      if (e.tira) aplica(e.tira); else if (e.tira === undefined) F.tira(c.medio).then(function (t) { if (t) L.render(); });
    } else if (c.tipo === 'audio' && e) {
      var cv = h('canvas', { width: Math.min(4096, Math.ceil(w)), height: 40 }); el.appendChild(cv);
      F.picos(c.medio, 1200).then(function (pk) {
        if (!pk) return; var x = cv.getContext('2d'), n = pk.length, m = e.m, span = c.dur * c.vel, a = Math.floor(c.off / m.dur * n), b = Math.max(a + 1, Math.ceil((c.off + span) / m.dur * n));
        x.fillStyle = 'rgba(255,255,255,.8)'; var cw = cv.width, hh = cv.height;
        for (var i = 0; i < cw; i += 2) { var k = Math.min(n - 1, a + Math.floor(i / cw * (b - a))), v = Math.min(1, pk[k] * 1.4) * hh / 2; x.fillRect(i, hh / 2 - v, 1.5, Math.max(1, v * 2)); }
      });
    }
    return el;
  }
  L.cabezal = function (t, forzar) {
    var cb = $('cabezal'); cb.style.left = t * L.pps + 'px';
    if (A.motor.jugando || forzar) {
      var lh = $('lineaH'), x = t * L.pps;
      if (A.motor.jugando && (x > lh.scrollLeft + lh.clientWidth - 40 || x < lh.scrollLeft)) lh.scrollLeft = Math.max(0, x - 60);
    }
  };

  /* ---- gestos ---- */
  var arrastre = null;
  function abajo(e) {
    var lh = $('lineaH'); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, tipo: e.pointerType };
    if (e.pointerType === 'touch' && Object.keys(ptrs).length === 2) { var ks = Object.keys(ptrs); pinch = { d: Math.hypot(ptrs[ks[0]].x - ptrs[ks[1]].x, ptrs[ks[0]].y - ptrs[ks[1]].y), pps: L.pps }; modo = 'pinch'; arrastre = null; return; }
    if (e.button > 0) return;
    var clipEl = e.target.closest('.clip'), enRegla = e.target.closest('#regla');
    lh.setPointerCapture(e.pointerId);
    arrastre = { x0: e.clientX, y0: e.clientY, mov: false, scroll0: lh.scrollLeft, tactil: e.pointerType === 'touch' };
    if (enRegla && !e.target.closest('.mk')) { modo = 'scrub'; scrub(e); return; }
    if (clipEl) {
      var id = clipEl.dataset.id, ya = A.sel === id; arrastre.id = id;
      var f = M.buscar(A.p, id); arrastre.ini0 = f.clip.ini; arrastre.dur0 = f.clip.dur; arrastre.fin0 = M.fin(f.clip);
      if (e.target.classList.contains('hi') && (ya || !arrastre.tactil)) modo = 'ini'; else if (e.target.classList.contains('hf') && (ya || !arrastre.tactil)) modo = 'fin';
      else modo = (arrastre.tactil && !ya) ? 'pan' : 'mover';
      arrastre.ant = ya; if (!ya) A.seleccionar(id, true);
    } else { modo = arrastre.tactil ? 'pan' : 'scrub'; if (modo === 'scrub') { A.seleccionar(null, true); scrub(e); } }
  }
  function scrub(e) { A.motor.ir(Math.max(0, L.tiempoX(e.clientX))); }
  function tolerancia() { return 8 / L.pps; }
  function mueve(e) {
    if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
    if (modo === 'pinch' && pinch) {
      var ks = Object.keys(ptrs); if (ks.length < 2) return; var d = Math.hypot(ptrs[ks[0]].x - ptrs[ks[1]].x, ptrs[ks[0]].y - ptrs[ks[1]].y);
      L.zoomAbs(pinch.pps * d / Math.max(10, pinch.d), (ptrs[ks[0]].x + ptrs[ks[1]].x) / 2); return;
    }
    if (!arrastre) return; var dx = e.clientX - arrastre.x0;
    if (!arrastre.mov && Math.abs(dx) + Math.abs(e.clientY - arrastre.y0) < 4) return; arrastre.mov = true;
    var lh = $('lineaH');
    if (modo === 'scrub') scrub(e);
    else if (modo === 'pan') lh.scrollLeft = arrastre.scroll0 - dx;
    else if (modo === 'mover') {
      var pz = pistaEn(e.clientY), r = M.mover(A.p, arrastre.id, arrastre.ini0 + dx / L.pps, pz && pz.dataset.id, { iman: $('tlIman').checked, tol: tolerancia(), extra: [A.motor.t] });
      L.render();
    } else if (modo === 'ini' || modo === 'fin') {
      var t = (modo === 'ini' ? arrastre.ini0 : arrastre.fin0) + dx / L.pps;
      if ($('tlIman').checked) t = M.iman(t, M.puntosIman(A.p, arrastre.id, [A.motor.t]), tolerancia());
      if (modo === 'ini') M.recortarIni(A.p, arrastre.id, t); else M.recortarFin(A.p, arrastre.id, t);
      L.render();
    }
  }
  function arriba(e) {
    delete ptrs[e.pointerId];
    if (modo === 'pinch') { if (Object.keys(ptrs).length < 2) { pinch = null; modo = null; arrastre = null; } return; }
    if (!arrastre) return;
    if (!arrastre.mov) { if (modo === 'pan') A.motor.ir(L.tiempoX(e.clientX)); }
    else if (modo === 'mover' || modo === 'ini' || modo === 'fin') { A.commit(modo); }
    arrastre = null; modo = null; A.refrescarInspector();
  }
  g.VE.linea = L;
})(window);
