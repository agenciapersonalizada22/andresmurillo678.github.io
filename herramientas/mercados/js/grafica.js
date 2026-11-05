/* Grafica de velas profesional hecha a mano en canvas: zoom/pan/pinch, crosshair, log/lineal, velas/linea/area/Heikin-Ashi, volumen,
   capas (lineas, bandas, nube), subpaneles y dibujos (tendencia, horizontal, Fibonacci, rectangulo). */
(function () {
  var FIBO = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  function Grafica(cont, opts) {
    opts = opts || {};
    var G = this, cv = document.createElement('canvas'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, raw = [], velas = [], tipo = 'velas', log = false, mostrarVol = true;
    var capas = [], subs = [], niveles = [], dibujos = [], herr = null, pend = null, sel = null, cursor = null, extra = 0;
    var ini = 0, n = 120, dt = 864e5, colores = null, quieto = true, ptrs = {}, arr = null, pinch = null, raf = 0, desplazo = 0;
    var AX = 64, AY = 22;
    cv.className = 'grafica-cv'; cv.tabIndex = 0; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Grafica de precios. Flechas para desplazar, + y - para zoom.');
    cont.appendChild(cv);
    G.onDibujos = null; G.onCursor = null; G.onHerramienta = null;

    function tema() {
      var s = getComputedStyle(cont), g = function (v, d) { return (s.getPropertyValue(v) || d).trim() || d; };
      colores = { fondo: g('--graf-fondo', '#0b0f14'), texto: g('--texto-2', '#8b98a9'), texto1: g('--texto', '#e6edf3'), rejilla: g('--rejilla', '#1c2430'), sube: g('--sube', '#26a69a'), baja: g('--baja', '#ef5350'), acento: g('--acento', '#4c9aff'),
        pal: [g('--c1', '#f5a623'), g('--c2', '#4c9aff'), g('--c3', '#c678dd'), g('--c4', '#56d4dd'), g('--c5', '#e5c07b'), g('--c6', '#98c379')] };
    }
    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); var r = cont.getBoundingClientRect(); W = Math.max(200, Math.floor(r.width)); H = Math.max(180, Math.floor(r.height));
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; AX = W < 500 ? 60 : 68; pedir();
    }
    G.medir = medir;
    function pedir() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; dibujar(); }); }
    G.redibujar = function (t) { if (t) tema(); pedir(); };

    function recalcDt() { if (raw.length < 2) { dt = 864e5; return; } var d = []; for (var i = 1; i < Math.min(raw.length, 60); i++) d.push(raw[i][0] - raw[i - 1][0]); d.sort(function (a, b) { return a - b; }); dt = d[d.length >> 1] || 864e5; }
    function aplicarTipo() { velas = tipo === 'heikin' ? window.Indicadores.heikinAshi(raw) : raw; }
    G.setDatos = function (v, reiniciar) { raw = v || []; recalcDt(); aplicarTipo(); extra = 30; if (reiniciar !== false) G.reiniciarVista(); else pedir(); };
    G.setTipo = function (t) { tipo = t; aplicarTipo(); pedir(); };
    G.setLog = function (b) { log = !!b; pedir(); };
    G.setVolumen = function (b) { mostrarVol = !!b; pedir(); };
    G.setCapas = function (c, s) { capas = c || []; subs = s || []; pedir(); };
    G.setNiveles = function (l) { niveles = l || []; pedir(); };
    G.setDibujos = function (d) { dibujos = d || []; sel = null; pedir(); };
    G.getDibujos = function () { return dibujos; };
    G.setHerramienta = function (h) { herr = h; pend = null; cv.style.cursor = h ? 'crosshair' : ''; if (G.onHerramienta) G.onHerramienta(h); pedir(); };
    G.reiniciarVista = function () { n = Math.min(Math.max(raw.length, 20), 130); ini = Math.max(-5, raw.length - n + 8); pedir(); };
    G.vista = function () { return { ini: ini, n: n }; };
    G.fijarVista = function (i, nn) { ini = i; n = nn; limitar(); pedir(); };
    G.zoom = function (f, centro) { zoom(f, centro == null ? ini + n / 2 : centro); };
    G.borrarSeleccion = function () { if (sel != null) { dibujos.splice(sel, 1); sel = null; cambioDibujos(); } };
    G.borrarTodo = function () { dibujos = []; sel = null; cambioDibujos(); };
    G.deshacer = function () { if (dibujos.length) { dibujos.pop(); sel = null; cambioDibujos(); } };
    G.hayDibujos = function () { return dibujos.length; };
    G.png = function () { return cv.toDataURL('image/png'); };
    G.destruir = function () { cancelAnimationFrame(raf); ro && ro.disconnect(); mo && mo.disconnect(); cv.remove(); };
    function cambioDibujos() { pedir(); if (G.onDibujos) G.onDibujos(dibujos); }

    function limitar() {
      var N = Math.max(raw.length, 1); n = Math.max(8, Math.min(n, Math.max(N + extra + 10, 30)));
      ini = Math.max(-n * 0.6, Math.min(ini, N + extra - n * 0.4));
    }
    function zoom(f, centro) { var a = (centro - ini) / n; n = n * f; ini = centro - a * n; limitar(); pedir(); }
    function tIdx(t) {
      var N = raw.length; if (!N) return 0;
      if (t <= raw[0][0]) return (t - raw[0][0]) / dt; if (t >= raw[N - 1][0]) return N - 1 + (t - raw[N - 1][0]) / dt;
      var a = 0, b = N - 1; while (b - a > 1) { var m = (a + b) >> 1; if (raw[m][0] <= t) a = m; else b = m; }
      return a + (t - raw[a][0]) / (raw[b][0] - raw[a][0]);
    }
    function idxT(i) { var N = raw.length; if (i <= 0) return raw[0][0] + i * dt; if (i >= N - 1) return raw[N - 1][0] + (i - N + 1) * dt; var a = Math.floor(i); return raw[a][0] + (i - a) * (raw[a + 1][0] - raw[a][0]); }

    /* geometria de paneles */
    function paneles() {
      var plotW = W - AX, alto = H - AY, ns = Math.min(subs.length, 3), hs = ns ? Math.min(120, Math.max(70, alto * 0.18)) : 0, hm = alto - hs * ns, p = [{ id: 'precio', y: 0, h: hm }];
      for (var i = 0; i < ns; i++) p.push({ id: 'sub' + i, sub: subs[i], y: hm + i * hs, h: hs });
      return { w: plotW, items: p };
    }
    function xOf(i, bw) { return (i - ini + 0.5) * bw; }
    function nice(mn, mx, cnt) {
      var r = mx - mn || 1, paso = Math.pow(10, Math.floor(Math.log10(r / cnt))), f = r / cnt / paso; paso *= f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
      var out = []; for (var v = Math.ceil(mn / paso) * paso; v <= mx; v += paso) out.push(+v.toPrecision(12)); return out;
    }
    function fp(v) { return window.Fmt.precio(v); }
    function rangoPrecio(a, b) {
      var mn = Infinity, mx = -Infinity, i, k, ci;
      for (i = a; i <= b; i++) { var v = velas[i]; if (!v) continue; if (tipo === 'linea' || tipo === 'area') { mn = Math.min(mn, v[4]); mx = Math.max(mx, v[4]); } else { mn = Math.min(mn, v[3]); mx = Math.max(mx, v[2]); } }
      capas.forEach(function (L) { if (L.panel !== 'precio') return; L.capas.forEach(function (c) { var arrs = c.k === 'banda' ? [c.sup, c.inf] : c.k === 'nube' ? [c.a, c.b] : [c.valores]; arrs.forEach(function (ar) { for (var j = Math.max(0, a); j <= Math.min(b, ar.length - 1); j++) if (isFinite(ar[j])) { mn = Math.min(mn, ar[j]); mx = Math.max(mx, ar[j]); } }); }); });
      if (!isFinite(mn)) { mn = 0; mx = 1; }
      if (mn === mx) { mn *= 0.99; mx *= 1.01; if (mn === mx) { mn = 0; mx = 1; } }
      var pad = (log ? Math.log(mx / Math.max(mn, 1e-12)) : mx - mn) * 0.06;
      return log ? [mn / Math.exp(pad), mx * Math.exp(pad)] : [mn - pad, mx + pad];
    }

    function dibujar() {
      if (!colores) tema(); if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = colores.fondo; ctx.fillRect(0, 0, W, H);
      var P = paneles(), bw = P.w / n, a = Math.max(0, Math.floor(ini - 1)), b = Math.min(velas.length - 1, Math.ceil(ini + n + 1)), pr = P.items[0];
      if (!velas.length) { ctx.fillStyle = colores.texto; ctx.font = '14px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Sin datos de historial', W / 2, H / 2); return; }
      var rg = rangoPrecio(a, b), lo = log ? Math.log(rg[0]) : rg[0], hi = log ? Math.log(rg[1]) : rg[1];
      function yP(v) { var q = log ? Math.log(Math.max(v, 1e-12)) : v; return pr.y + 6 + (1 - (q - lo) / (hi - lo)) * (pr.h - 12); }
      function pOfY(y) { var q = lo + (1 - (y - pr.y - 6) / (pr.h - 12)) * (hi - lo); return log ? Math.exp(q) : q; }
      G._geo = { P: P, bw: bw, yP: yP, pOfY: pOfY, rg: rg };
      ctx.font = '11px system-ui,sans-serif'; ctx.lineWidth = 1;
      // rejilla y eje de precio
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, P.w, H - AY); ctx.clip();
      var ticks = log ? logTicks(rg[0], rg[1], Math.max(3, Math.floor(pr.h / 55))) : nice(rg[0], rg[1], Math.max(3, Math.floor(pr.h / 55)));
      ctx.strokeStyle = colores.rejilla; ticks.forEach(function (t) { var y = Math.round(yP(t)) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(P.w, y); ctx.stroke(); });
      // rejilla vertical / eje tiempo
      var paso = Math.max(1, Math.round(90 / bw)), i0 = Math.ceil(ini / paso) * paso;
      for (var i = i0; i < ini + n; i += paso) { var x = Math.round(xOf(i, bw)) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - AY); ctx.stroke(); }
      // volumen
      if (mostrarVol && tipo !== 'x') {
        var vm = 0; for (i = a; i <= b; i++) if (velas[i][5] > vm) vm = velas[i][5];
        if (vm > 0) for (i = a; i <= b; i++) { var vv = velas[i], hv = vv[5] / vm * pr.h * 0.16; ctx.fillStyle = (vv[4] >= vv[1] ? colores.sube : colores.baja) + '55'; ctx.fillRect(xOf(i, bw) - Math.max(0.5, bw * 0.35), pr.y + pr.h - hv, Math.max(1, bw * 0.7), hv); }
      }
      // capas de precio (nube y bandas primero)
      capas.forEach(function (L, li) { if (L.panel === 'precio') pintarCapa(L, li, yP, bw, a, b); });
      // precio
      if (tipo === 'linea' || tipo === 'area') {
        ctx.beginPath(); for (i = a; i <= b; i++) { var xx = xOf(i, bw), yy = yP(velas[i][4]); if (i === a) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
        if (tipo === 'area') { var g = ctx.createLinearGradient(0, pr.y, 0, pr.y + pr.h); g.addColorStop(0, colores.acento + '66'); g.addColorStop(1, colores.acento + '05'); ctx.save(); ctx.lineTo(xOf(b, bw), pr.y + pr.h); ctx.lineTo(xOf(a, bw), pr.y + pr.h); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.restore(); ctx.beginPath(); for (i = a; i <= b; i++) { if (i === a) ctx.moveTo(xOf(i, bw), yP(velas[i][4])); else ctx.lineTo(xOf(i, bw), yP(velas[i][4])); } }
        ctx.strokeStyle = colores.acento; ctx.lineWidth = 1.6; ctx.stroke(); ctx.lineWidth = 1;
      } else {
        var cw = Math.max(1, Math.min(bw * 0.72, 40));
        for (i = a; i <= b; i++) {
          var v = velas[i], x0 = xOf(i, bw), up = v[4] >= v[1], col = up ? colores.sube : colores.baja, yh = yP(v[2]), yl = yP(v[3]), yo = yP(v[1]), yc = yP(v[4]);
          ctx.fillStyle = col; ctx.strokeStyle = col;
          if (cw < 2) { ctx.fillRect(Math.round(x0), yh, 1, Math.max(1, yl - yh)); continue; }
          ctx.fillRect(Math.round(x0), yh, 1, Math.max(1, yl - yh));
          ctx.fillRect(Math.round(x0 - cw / 2), Math.min(yo, yc), Math.max(1, Math.round(cw)), Math.max(1, Math.abs(yc - yo)));
        }
      }
      // niveles (soporte/resistencia, pivotes)
      niveles.forEach(function (nv) { var y = Math.round(yP(nv.precio)) + 0.5; if (y < 0 || y > pr.h) return; ctx.strokeStyle = nv.color || colores.texto; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(P.w, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = nv.color || colores.texto; ctx.textAlign = 'left'; ctx.fillText(nv.etiqueta || '', 4, y - 3); });
      // precio actual
      var ult = velas[velas.length - 1], yu = Math.round(yP(ult[4])) + 0.5; ctx.strokeStyle = ult[4] >= ult[1] ? colores.sube : colores.baja; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(0, yu); ctx.lineTo(P.w, yu); ctx.stroke(); ctx.setLineDash([]);
      dibujosPintar(bw, yP);
      ctx.restore();
      // subpaneles
      for (var s = 1; s < P.items.length; s++) pintarSub(P.items[s], P, bw, a, b, s - 1);
      // eje precio
      ctx.fillStyle = colores.texto; ctx.textAlign = 'left'; ticks.forEach(function (t) { var y = yP(t); if (y > 8 && y < pr.h - 4) ctx.fillText(Math.abs(t) >= 1000 ? window.Fmt.num(t, 0) : fp(t), P.w + 5, y + 4); });
      etiqueta(P.w, yu, fp(ult[4]), ult[4] >= ult[1] ? colores.sube : colores.baja, '#fff');
      ctx.strokeStyle = colores.rejilla; ctx.beginPath(); ctx.moveTo(P.w + 0.5, 0); ctx.lineTo(P.w + 0.5, H - AY); ctx.moveTo(0, H - AY + 0.5); ctx.lineTo(W, H - AY + 0.5); ctx.stroke();
      // eje tiempo
      ctx.fillStyle = colores.texto; ctx.textAlign = 'center'; var lp = Math.max(1, Math.round(95 / bw)), ant = null;
      for (i = Math.ceil(ini / lp) * lp; i < ini + n; i += lp) { if (i < 0 || i > raw.length + extra) continue; var tt = idxT(i), d = new Date(tt), anio = d.getUTCFullYear(); var txt = dt < 864e5 ? window.Fmt.fechaHora(tt).slice(-5) : (ant !== null && anio !== ant ? String(anio) : window.Fmt.fecha(tt)); ant = anio; ctx.fillText(txt, xOf(i, bw), H - 7); }
      // crosshair
      if (cursor) cruz(P, bw, yP, pOfY);
    }
    function logTicks(mn, mx, c) {
      var sets = [[1], [1, 3], [1, 2, 5], [1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9]], o = [];
      for (var si = 0; si < sets.length; si++) { o = []; for (var e = Math.floor(Math.log10(mn)) - 1; e <= Math.ceil(Math.log10(mx)); e++) sets[si].forEach(function (m) { var v = m * Math.pow(10, e); if (v >= mn && v <= mx) o.push(v); }); if (o.length >= Math.min(c, 4)) break; }
      return o;
    }
    function etiqueta(x, y, txt, fondo, col) { ctx.fillStyle = fondo; ctx.fillRect(x, y - 9, AX, 18); ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(txt, x + 5, y + 4); }
    function pintarCapa(L, li, yP, bw, a, b) {
      L.capas.forEach(function (c, ci) {
        var col = c.color || colores.pal[(li + ci) % colores.pal.length], j;
        if (c.k === 'linea') { ctx.strokeStyle = col; ctx.lineWidth = c.ancho || 1.4; ctx.beginPath(); var on = false; for (j = a; j <= Math.min(b + 1, c.valores.length - 1); j++) { var q = c.valores[j]; if (!isFinite(q)) { on = false; continue; } var x = xOf(j, bw), y = yP(q); if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y); } ctx.stroke(); ctx.lineWidth = 1; }
        else if (c.k === 'banda') {
          ctx.beginPath(); var first = true; for (j = a; j <= b; j++) if (isFinite(c.sup[j])) { var xs = xOf(j, bw); if (first) { ctx.moveTo(xs, yP(c.sup[j])); first = false; } else ctx.lineTo(xs, yP(c.sup[j])); }
          for (j = b; j >= a; j--) if (isFinite(c.inf[j])) ctx.lineTo(xOf(j, bw), yP(c.inf[j]));
          ctx.closePath(); ctx.fillStyle = col + '1f'; ctx.fill(); ctx.strokeStyle = col + 'aa'; [c.sup, c.inf].forEach(function (ar) { ctx.beginPath(); var o2 = false; for (j = a; j <= b; j++) { if (!isFinite(ar[j])) continue; if (!o2) { ctx.moveTo(xOf(j, bw), yP(ar[j])); o2 = true; } else ctx.lineTo(xOf(j, bw), yP(ar[j])); } ctx.stroke(); });
        } else if (c.k === 'nube') {
          for (j = a; j < Math.min(b + 1, c.a.length - 1); j++) { if (!isFinite(c.a[j]) || !isFinite(c.b[j]) || !isFinite(c.a[j + 1]) || !isFinite(c.b[j + 1])) continue; ctx.fillStyle = (c.a[j] >= c.b[j] ? colores.sube : colores.baja) + '26'; ctx.beginPath(); ctx.moveTo(xOf(j, bw), yP(c.a[j])); ctx.lineTo(xOf(j + 1, bw), yP(c.a[j + 1])); ctx.lineTo(xOf(j + 1, bw), yP(c.b[j + 1])); ctx.lineTo(xOf(j, bw), yP(c.b[j])); ctx.closePath(); ctx.fill(); }
        }
      });
    }
    function pintarSub(p, P, bw, a, b, idx) {
      var L = p.sub, lo = Infinity, hi = -Infinity, j;
      if (L.rango) { lo = L.rango[0]; hi = L.rango[1]; }
      else { L.capas.forEach(function (c) { for (j = a; j <= Math.min(b, c.valores.length - 1); j++) if (isFinite(c.valores[j])) { lo = Math.min(lo, c.valores[j]); hi = Math.max(hi, c.valores[j]); } }); (L.niveles || []).forEach(function (q) { lo = Math.min(lo, q); hi = Math.max(hi, q); }); if (!isFinite(lo)) { lo = 0; hi = 1; } if (lo === hi) { lo -= 1; hi += 1; } var pd = (hi - lo) * 0.08; lo -= pd; hi += pd; }
      var yS = function (v) { return p.y + 4 + (1 - (v - lo) / (hi - lo)) * (p.h - 8); };
      ctx.save(); ctx.beginPath(); ctx.rect(0, p.y, P.w, p.h); ctx.clip();
      ctx.strokeStyle = colores.rejilla; ctx.beginPath(); ctx.moveTo(0, p.y + 0.5); ctx.lineTo(P.w, p.y + 0.5); ctx.stroke();
      (L.niveles || []).forEach(function (q) { var y = Math.round(yS(q)) + 0.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(P.w, y); ctx.stroke(); ctx.setLineDash([]); });
      L.capas.forEach(function (c, ci) {
        var col = c.color || colores.pal[(idx + ci) % colores.pal.length];
        if (c.k === 'barras') { var y0 = yS(0 < lo ? lo : 0); for (j = a; j <= Math.min(b, c.valores.length - 1); j++) if (isFinite(c.valores[j])) { ctx.fillStyle = (c.valores[j] >= 0 ? colores.sube : colores.baja) + 'bb'; var yy = yS(c.valores[j]); ctx.fillRect(xOf(j, bw) - Math.max(0.5, bw * 0.35), Math.min(yy, y0), Math.max(1, bw * 0.7), Math.abs(yy - y0) || 1); } }
        else { ctx.strokeStyle = col; ctx.lineWidth = c.ancho || 1.4; ctx.beginPath(); var on = false; for (j = a; j <= Math.min(b + 1, c.valores.length - 1); j++) { var q = c.valores[j]; if (!isFinite(q)) { on = false; continue; } if (!on) { ctx.moveTo(xOf(j, bw), yS(q)); on = true; } else ctx.lineTo(xOf(j, bw), yS(q)); } ctx.stroke(); ctx.lineWidth = 1; }
      });
      ctx.restore();
      ctx.font = '11px system-ui,sans-serif'; ctx.textAlign = 'left'; var tx = 6;
      L.capas.forEach(function (c, ci) { var v = c.valores[cursor ? cursor.i : velas.length - 1], col = c.k === 'barras' ? colores.texto : (c.color || colores.pal[(idx + ci) % colores.pal.length]); var t = c.n + ' ' + (isFinite(v) ? fp(v) : '-'); ctx.fillStyle = col; ctx.fillText(t, tx, p.y + 13); tx += ctx.measureText(t).width + 10; });
      ctx.fillStyle = colores.texto; ctx.textAlign = 'left'; [lo + (hi - lo) * 0.15, hi - (hi - lo) * 0.15].forEach(function (v) { ctx.fillText(fp(v), P.w + 5, yS(v) + 4); });
    }

    /* dibujos */
    function pt(d, bw, yP) { return { x: xOf(tIdx(d.t), bw), y: yP(d.p) }; }
    function dibujosPintar(bw, yP) {
      var P = G._geo.P, all = dibujos.concat(pend ? [pend] : []);
      all.forEach(function (d, k) {
        var s = (sel === k && d !== pend), col = d.color || colores.acento; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s ? 2.4 : 1.4;
        var p1 = pt(d.p1, bw, yP), p2 = d.p2 ? pt(d.p2, bw, yP) : p1;
        if (d.tipo === 'horizontal') { ctx.beginPath(); ctx.moveTo(0, p1.y); ctx.lineTo(P.w, p1.y); ctx.stroke(); ctx.textAlign = 'left'; ctx.fillText(fp(d.p1.p), 4, p1.y - 4); }
        else if (d.tipo === 'tendencia') { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); [p1, p2].forEach(function (q) { ctx.beginPath(); ctx.arc(q.x, q.y, s ? 4 : 2.5, 0, 6.3); ctx.fill(); }); }
        else if (d.tipo === 'rect') { ctx.globalAlpha = 0.14; ctx.fillRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y)); ctx.globalAlpha = 1; ctx.strokeRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y)); }
        else if (d.tipo === 'fibo') {
          var xa = Math.min(p1.x, p2.x), xb = P.w; ctx.font = '11px system-ui,sans-serif';
          FIBO.forEach(function (f, q) { var pv = d.p1.p + (d.p2.p - d.p1.p) * f, y = yP(pv); ctx.globalAlpha = 0.85; ctx.strokeStyle = colores.pal[q % colores.pal.length]; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke(); ctx.fillStyle = colores.pal[q % colores.pal.length]; ctx.textAlign = 'left'; ctx.fillText(f + '  ' + fp(pv), xa + 4, y - 3); ctx.globalAlpha = 1; });
          ctx.strokeStyle = col; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.lineWidth = 1;
      });
    }
    function distDibujo(d, x, y) {
      var geo = G._geo, bw = geo.bw, yP = geo.yP, p1 = pt(d.p1, bw, yP), p2 = d.p2 ? pt(d.p2, bw, yP) : p1;
      function seg(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0; return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)); }
      if (d.tipo === 'horizontal') return Math.abs(y - p1.y);
      if (d.tipo === 'tendencia') return seg(p1.x, p1.y, p2.x, p2.y);
      if (d.tipo === 'rect') { var x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y); return Math.min(seg(x0, y0, x1, y0), seg(x1, y0, x1, y1), seg(x1, y1, x0, y1), seg(x0, y1, x0, y0)); }
      if (d.tipo === 'fibo') { var m = Infinity; FIBO.forEach(function (f) { var yy = yP(d.p1.p + (d.p2.p - d.p1.p) * f); if (x >= Math.min(p1.x, p2.x) - 6) m = Math.min(m, Math.abs(y - yy)); }); return m; }
      return Infinity;
    }
    function cruz(P, bw, yP, pOfY) {
      var i = cursor.i, v = velas[i]; var x = Math.round(xOf(i, bw)) + 0.5, y = cursor.y;
      ctx.strokeStyle = colores.texto; ctx.setLineDash([3, 3]); ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - AY); if (y < P.items[0].h) { ctx.moveTo(0, y); ctx.lineTo(P.w, y); } ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (y >= 0 && y < P.items[0].h) etiqueta(P.w, y, fp(pOfY(y)), colores.rejilla === '#1c2430' ? '#2b3645' : '#cfd6df', colores.texto1);
      var tt = idxT(i), txt = dt < 864e5 ? window.Fmt.fechaHora(tt) : window.Fmt.fecha(tt, true); ctx.font = '11px system-ui,sans-serif'; var tw = ctx.measureText(txt).width + 12;
      ctx.fillStyle = colores.rejilla === '#1c2430' ? '#2b3645' : '#cfd6df'; ctx.fillRect(Math.max(0, Math.min(P.w - tw, x - tw / 2)), H - AY + 1, tw, 18); ctx.fillStyle = colores.texto1; ctx.textAlign = 'center'; ctx.fillText(txt, Math.max(tw / 2, Math.min(P.w - tw / 2, x)), H - 8);
      if (v) { var ch = i > 0 && velas[i - 1] ? (v[4] / velas[i - 1][4] - 1) * 100 : null; ctx.textAlign = 'left'; var s = 'A ' + fp(v[1]) + '  M ' + fp(v[2]) + '  m ' + fp(v[3]) + '  C ' + fp(v[4]) + (ch != null ? '  ' + window.Fmt.pct(ch) : '') + (v[5] ? '  Vol ' + window.Fmt.grande(v[5]) : ''); ctx.fillStyle = colores.texto1; ctx.fillText(s, 8, 14); }
      if (G.onCursor) G.onCursor(i, raw[i] || null);
    }

    /* interaccion */
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function aDatos(q) { var geo = G._geo; if (!geo) return null; var i = ini + q.x / geo.bw - 0.5; return { t: idxT(i), p: geo.pOfY(q.y), i: i }; }
    function enPrecio(q) { return G._geo && q.x < G._geo.P.w && q.y < G._geo.P.items[0].h; }
    function ponerCursor(q) {
      var geo = G._geo; if (!geo) return; var i = Math.round(ini + q.x / geo.bw - 0.5); i = Math.max(0, Math.min(velas.length - 1, i)); cursor = { i: i, y: Math.max(0, Math.min(H - AY, q.y)) };
    }
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId); var q = pos(e); ptrs[e.pointerId] = q; desplazo = 0; var ids = Object.keys(ptrs);
      if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), n: n, ini: ini, c: ini + ((a.x + b.x) / 2) / G._geo.bw }; arr = null; return; }
      if (herr && enPrecio(q)) {
        var d = aDatos(q);
        if (herr === 'horizontal') { dibujos.push({ id: Date.now(), tipo: 'horizontal', p1: { t: d.t, p: d.p } }); herr = null; cv.style.cursor = ''; if (G.onHerramienta) G.onHerramienta(null); cambioDibujos(); return; }
        if (!pend) pend = { tipo: herr, p1: { t: d.t, p: d.p }, p2: { t: d.t, p: d.p } }; else { pend.p2 = { t: d.t, p: d.p }; finalizar(); }
        arr = { modo: 'dib', x: q.x, y: q.y }; pedir(); return;
      }
      arr = { modo: 'pan', x: q.x, ini: ini, y: q.y, tactil: e.pointerType === 'touch' };
    });
    function finalizar() { if (!pend) return; var d = pend; pend = null; if (Math.abs(d.p1.t - d.p2.t) < 1 && Math.abs(d.p1.p - d.p2.p) < 1e-12) return; d.id = Date.now(); dibujos.push(d); herr = null; cv.style.cursor = ''; if (G.onHerramienta) G.onHerramienta(null); cambioDibujos(); }
    cv.addEventListener('pointermove', function (e) {
      var q = pos(e); if (ptrs[e.pointerId]) ptrs[e.pointerId] = q; var ids = Object.keys(ptrs);
      if (pinch && ids.length >= 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1; n = pinch.n * pinch.d / d; ini = pinch.c - ((a.x + b.x) / 2) / (G._geo.P.w / n); limitar(); pedir(); return; }
      if (arr && arr.modo === 'pan' && ptrs[e.pointerId]) { desplazo = Math.max(desplazo, Math.abs(q.x - arr.x) + Math.abs(q.y - arr.y)); if (desplazo > 4) { ini = arr.ini - (q.x - arr.x) / G._geo.bw; limitar(); if (arr.tactil) cursor = null; else ponerCursor(q); pedir(); } return; }
      if (pend && enPrecio(q)) { var dd = aDatos(q); pend.p2 = { t: dd.t, p: dd.p }; ponerCursor(q); pedir(); return; }
      if (e.pointerType !== 'touch') { ponerCursor(q); pedir(); }
    });
    function fin(e) {
      var q = pos(e), era = ptrs[e.pointerId]; delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) pinch = null;
      if (arr && arr.modo === 'dib' && pend) { if (Math.abs(q.x - arr.x) + Math.abs(q.y - arr.y) > 8) { var d = aDatos(q); pend.p2 = { t: d.t, p: d.p }; finalizar(); pedir(); } }
      else if (arr && arr.modo === 'pan' && era && desplazo <= 4) {
        if (!herr && enPrecio(q)) { var mejor = null, md = 8; dibujos.forEach(function (d, k) { var dd = distDibujo(d, q.x, q.y); if (dd < md) { md = dd; mejor = k; } }); sel = mejor; }
        ponerCursor(q); pedir();
      }
      arr = null;
    }
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', function (e) { delete ptrs[e.pointerId]; pinch = null; arr = null; });
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch' && !Object.keys(ptrs).length) { cursor = null; if (G.onCursor) G.onCursor(null, null); pedir(); } });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault(); var q = pos(e), bw = G._geo ? G._geo.bw : 5;
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { ini += (e.deltaX || e.deltaY) / bw * 0.5; limitar(); pedir(); }
      else zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, ini + q.x / bw);
    }, { passive: false });
    cv.addEventListener('dblclick', function () { if (!herr) G.reiniciarVista(); });
    cv.addEventListener('keydown', function (e) {
      var k = e.key, c = ini + n / 2;
      if (k === 'ArrowLeft') { ini -= Math.max(1, n * 0.1); limitar(); pedir(); } else if (k === 'ArrowRight') { ini += Math.max(1, n * 0.1); limitar(); pedir(); }
      else if (k === '+' || k === '=' || k === 'ArrowUp') zoom(1 / 1.2, c); else if (k === '-' || k === 'ArrowDown') zoom(1.2, c);
      else if (k === 'Home') { ini = -n * 0.1; pedir(); } else if (k === 'End') G.reiniciarVista();
      else if (k === 'Delete' || k === 'Backspace') G.borrarSeleccion(); else if (k === 'Escape') { pend = null; sel = null; G.setHerramienta(null); }
      else return; e.preventDefault();
    });
    var ro = window.ResizeObserver ? new ResizeObserver(medir) : null; if (ro) ro.observe(cont); else window.addEventListener('resize', medir);
    var mo = window.MutationObserver ? new MutationObserver(function () { G.redibujar(true); }) : null; if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    tema(); medir();
  }
  window.Grafica = Grafica;
})();
