/* Lienzo 2D interactivo para overlays: seleccion, arrastre del cuerpo, asas de esquinas (perspectiva 4 puntos) o malla 3x3, anclas de marcador/rostro,
   medicion sobre el plano del marcador, historial y exportacion. Lo usan las pestanas Foto y En vivo. window.RA.Lienzo */
(function (g) {
  'use strict';
  var RA = g.RA, G = RA.Geo, O = RA.Ov;
  RA.Lienzo = function (canvas, cfg) {
    var L = { sel: null, herr: 'editar', medidas: [], pend: null, hist: [], fut: [], drag: null }, ctx = canvas.getContext('2d');
    function capas() { return cfg.capas(); }
    function info() { var i = cfg.info(); i.escala = i.escala || canvas.width / Math.max(1, canvas.clientWidth || canvas.width); return i; }
    L.capa = function () { return capas().filter(function (o) { return o.id === L.sel; })[0] || null; };
    L.seleccionar = function (id) { L.sel = id; if (cfg.alSeleccionar) cfg.alSeleccionar(L.capa()); L.dibujar(); };
    L.guardarHist = function () { var s = JSON.stringify(capas()); if (L.hist[L.hist.length - 1] !== s) { L.hist.push(s); if (L.hist.length > 50) L.hist.shift(); L.fut = []; } };
    function restaurar(s) { var l = capas(); l.length = 0; JSON.parse(s).forEach(function (o) { l.push(o); }); if (!L.capa()) L.sel = null; if (cfg.alSeleccionar) cfg.alSeleccionar(L.capa()); if (cfg.alCambiar) cfg.alCambiar(); L.dibujar(); }
    L.deshacer = function () { if (L.hist.length < 2) return; L.fut.push(L.hist.pop()); restaurar(L.hist[L.hist.length - 1]); };
    L.rehacer = function () { if (!L.fut.length) return; var s = L.fut.pop(); L.hist.push(s); restaurar(s); };

    /* asas de la capa seleccionada en px del lienzo: [{x,y,tipo,i}] */
    function asas(ov, inf) {
      var q = O.cuadPx(ov, inf); if (!q) return [];
      if (ov.ancla === 'imagen' && ov.malla && ov.malla.length === 9) return O.mallaPx(ov, inf).map(function (p, i) { return { x: p[0], y: p[1], tipo: 'malla', i: i }; });
      return q.map(function (p, i) { return { x: p[0], y: p[1], tipo: ov.ancla === 'imagen' ? 'esq' : 'esc', i: i }; });
    }
    L.dibujar = function (sinGuias) {
      var inf = info(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (cfg.dibujarBase) cfg.dibujarBase(ctx, inf);
      O.dibujarTodas(ctx, capas(), inf);
      if (cfg.dibujarDespues) cfg.dibujarDespues(ctx, inf);
      if (sinGuias) return;
      var k = inf.escala, ov = L.capa();
      if (ov && ov.visible) {
        var q = O.cuadPx(ov, inf);
        if (q) {
          ctx.save(); ctx.lineWidth = 2 * k; ctx.strokeStyle = '#ffd43b'; ctx.setLineDash([6 * k, 4 * k]); ctx.beginPath(); q.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
          if (!ov.bloq) asas(ov, inf).forEach(function (a, i) { ctx.beginPath(); ctx.arc(a.x, a.y, 9 * k, 0, 7); ctx.fillStyle = '#ffd43b'; ctx.fill(); ctx.lineWidth = 2 * k; ctx.strokeStyle = '#1b1b1f'; ctx.stroke(); ctx.fillStyle = '#1b1b1f'; ctx.font = 'bold ' + 11 * k + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(a.tipo === 'malla' ? a.i + 1 : a.i + 1), a.x, a.y + 0.5 * k); });
          ctx.restore();
        }
      }
      // mediciones en el plano del marcador
      ctx.save(); ctx.lineWidth = 3 * k; ctx.font = 'bold ' + 14 * k + 'px system-ui'; ctx.textAlign = 'center';
      L.medidas.concat(L.pend ? [{ a: L.pend, b: null }] : []).forEach(function (m) {
        ctx.strokeStyle = '#ffd43b'; ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(m.a[0], m.a[1], 5 * k, 0, 7); ctx.fill();
        if (m.b) { ctx.beginPath(); ctx.moveTo(m.a[0], m.a[1]); ctx.lineTo(m.b[0], m.b[1]); ctx.stroke(); ctx.beginPath(); ctx.arc(m.b[0], m.b[1], 5 * k, 0, 7); ctx.fill(); var tx = (m.a[0] + m.b[0]) / 2, ty = (m.a[1] + m.b[1]) / 2 - 8 * k, s = m.txt || ''; ctx.lineWidth = 4 * k; ctx.strokeStyle = '#000b'; ctx.strokeText(s, tx, ty); ctx.fillStyle = '#fff'; ctx.fillText(s, tx, ty); }
      });
      ctx.restore();
    };
    L.exportar = function (w, h) { // lienzo limpio, a la resolucion pedida (por defecto la del lienzo)
      var vistaW = canvas.width, vistaH = canvas.height, c = document.createElement('canvas'); c.width = w || vistaW; c.height = h || vistaH; var x = c.getContext('2d'), inf = info(); inf.W = c.width; inf.H = c.height; inf.escala = c.width / vistaW;
      if (cfg.dibujarBase) cfg.dibujarBase(x, inf); O.dibujarTodas(x, capas(), inf); if (cfg.dibujarDespues) cfg.dibujarDespues(x, inf); return c;
    };

    function pos(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; }
    function planoDe(inf, p) { var Hi = inf.Hm && G.inv3(inf.Hm); return Hi ? G.aplicar(Hi, p[0], p[1]) : null; }
    canvas.addEventListener('pointerdown', function (e) {
      if (cfg.activo && !cfg.activo()) return; var p = pos(e), inf = info(), k = inf.escala; canvas.setPointerCapture(e.pointerId);
      if (L.herr === 'medir') {
        if (!inf.Hm) { if (cfg.aviso) cfg.aviso('Para medir hace falta un marcador visible (y su lado real en Ajustes).'); return; }
        if (!L.pend) L.pend = p; else { var a = planoDe(inf, L.pend), b = planoDe(inf, p), mm = Math.hypot(a[0] - b[0], a[1] - b[1]) * RA.App.aj.ladoMm; L.medidas.push({ a: L.pend, b: p, txt: mm >= 100 ? (mm / 10).toFixed(1) + ' cm' : mm.toFixed(1) + ' mm' }); L.pend = null; if (cfg.alMedir) cfg.alMedir(mm); }
        L.dibujar(); return;
      }
      var ov = L.capa(), hit = null;
      if (ov && ov.visible && !ov.bloq) asas(ov, inf).forEach(function (a) { if (!hit && Math.hypot(a.x - p[0], a.y - p[1]) < 16 * k) hit = a; });
      if (hit) { L.guardarHist(); L.drag = { tipo: 'asa', a: hit, ov: ov, ini: p }; if (ov.ancla !== 'imagen') { var pl = planoDe(inf, p); L.drag.cen = ov.ancla === 'marcador' ? [ov.m.x, ov.m.y] : null; L.drag.v0 = pl; L.drag.m0 = JSON.parse(JSON.stringify(ov.m)); L.drag.r0 = JSON.parse(JSON.stringify(ov.r)); } return; }
      var lista = capas(), top = null; for (var i = lista.length - 1; i >= 0; i--) { var o = lista[i]; if (!o.visible) continue; var q = O.cuadPx(o, inf); if (q && O.dentro(q, p[0], p[1])) { top = o; break; } }
      if (top) { L.seleccionar(top.id); if (!top.bloq) { L.guardarHist(); L.drag = { tipo: 'cuerpo', ov: top, ini: p, q0: JSON.parse(JSON.stringify(top.q)), m0: JSON.parse(JSON.stringify(top.malla)), mm0: JSON.parse(JSON.stringify(top.m)), r0: JSON.parse(JSON.stringify(top.r)), pl0: planoDe(inf, p), W: inf.W, H: inf.H, rf: inf.rostro }; } }
      else L.seleccionar(null);
    });
    canvas.addEventListener('pointermove', function (e) {
      var d = L.drag; if (!d) return; var p = pos(e), inf = info(), ov = d.ov, dx = (p[0] - d.ini[0]) / inf.W, dy = (p[1] - d.ini[1]) / inf.H;
      if (d.tipo === 'cuerpo') {
        if (ov.ancla === 'imagen') { ov.q = d.q0.map(function (q) { return [q[0] + dx, q[1] + dy]; }); if (d.m0) ov.malla = d.m0.map(function (q) { return [q[0] + dx, q[1] + dy]; }); }
        else if (ov.ancla === 'marcador') { var pl = planoDe(inf, p); if (pl && d.pl0) { ov.m.x = d.mm0.x + pl[0] - d.pl0[0]; ov.m.y = d.mm0.y + pl[1] - d.pl0[1]; } }
        else if (ov.ancla === 'rostro' && d.rf) { ov.r.x = d.r0.x + (p[0] - d.ini[0]) / d.rf.w; ov.r.y = d.r0.y + (p[1] - d.ini[1]) / d.rf.h; }
      } else {
        var a = d.a;
        if (ov.ancla === 'imagen') {
          var nx = Math.min(1.5, Math.max(-0.5, p[0] / inf.W)), ny = Math.min(1.5, Math.max(-0.5, p[1] / inf.H));
          if (a.tipo === 'malla') { ov.malla[a.i] = [nx, ny]; var M = ov.malla; ov.q = [M[0].slice(), M[2].slice(), M[8].slice(), M[6].slice()]; }
          else { ov.q[a.i] = [nx, ny]; if (ov.malla) O.hacerMalla(ov); }
        } else if (ov.ancla === 'marcador') {
          var pl2 = planoDe(inf, p); if (pl2 && d.v0 && d.cen) { var v1 = [pl2[0] - d.cen[0], pl2[1] - d.cen[1]], v0 = [d.v0[0] - d.cen[0], d.v0[1] - d.cen[1]], s = Math.hypot(v1[0], v1[1]) / (Math.hypot(v0[0], v0[1]) || 1); ov.m.w = d.m0.w * s; ov.m.h = d.m0.h * s; ov.m.rot = d.m0.rot + (Math.atan2(v1[1], v1[0]) - Math.atan2(v0[1], v0[0])) * 180 / Math.PI; }
        } else if (ov.ancla === 'rostro' && inf.rostro) {
          var c0 = [(d.r0.x + d.r0.w / 2) * inf.rostro.w, (d.r0.y + d.r0.h / 2) * inf.rostro.h], q0 = [(p[0] - (inf.rostro.x + inf.rostro.w * 0.5)) + inf.rostro.w * 0.5, (p[1] - (inf.rostro.y + inf.rostro.h * 0.5)) + inf.rostro.h * 0.5];
          var s2 = Math.max(0.1, Math.hypot(q0[0] - c0[0], q0[1] - c0[1]) / (Math.hypot(d.r0.w * inf.rostro.w, d.r0.h * inf.rostro.h) / 2 || 1)); ov.r.w = d.r0.w * s2; ov.r.h = d.r0.h * s2; ov.r.x = d.r0.x + d.r0.w / 2 - ov.r.w / 2; ov.r.y = d.r0.y + d.r0.h / 2 - ov.r.h / 2;
        }
      }
      L.dibujar(); if (cfg.alCambiar) cfg.alCambiar(true);
    });
    function fin() { if (L.drag) { L.drag = null; L.guardarHist(); if (cfg.alCambiar) cfg.alCambiar(); } }
    canvas.addEventListener('pointerup', fin); canvas.addEventListener('pointercancel', fin);
    canvas.addEventListener('keydown', function (e) {
      var ov = L.capa(); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.shiftKey ? L.rehacer() : L.deshacer(); e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { L.rehacer(); e.preventDefault(); return; }
      if (!ov || ov.bloq) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { L.guardarHist(); var l = capas(); l.splice(l.indexOf(ov), 1); L.sel = null; if (cfg.alSeleccionar) cfg.alSeleccionar(null); if (cfg.alCambiar) cfg.alCambiar(); L.guardarHist(); L.dibujar(); e.preventDefault(); return; }
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d || ov.ancla !== 'imagen') return; var inf = info(), st = e.shiftKey ? 10 : 1;
      ov.q = ov.q.map(function (q) { return [q[0] + d[0] * st / inf.W, q[1] + d[1] * st / inf.H]; }); if (ov.malla) ov.malla = ov.malla.map(function (q) { return [q[0] + d[0] * st / inf.W, q[1] + d[1] * st / inf.H]; }); L.dibujar(); if (cfg.alCambiar) cfg.alCambiar(); e.preventDefault();
    });
    L.limpiarMedidas = function () { L.medidas = []; L.pend = null; L.dibujar(); };
    L.guardarHist();
    return L;
  };
})(window);
