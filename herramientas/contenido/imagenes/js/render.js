/* Renderizado de paginas a canvas 2D (y SVG). Las capas de ajuste se resuelven con un generador:
   el controlador filtra en el hilo principal (sync) o en un Worker (async). */
(function (IM) {
  var Doc = IM.Doc, Pix = Doc.Pix, Matriz = window.Matriz, Mezcla = window.Mezcla, Geo = window.Geometria, Filtros = window.Filtros;
  var R = {}, mc = IM.lienzo(4, 4).getContext('2d'), temps = [];

  /* ---------- texto ---------- */
  function fuente(c) { return (c.cursiva ? 'italic ' : '') + (c.peso || 400) + ' ' + c.tam + 'px ' + c.fuente; }
  function ponerFuente(x, c) { x.font = fuente(c); if ('letterSpacing' in x) x.letterSpacing = (c.espaciado || 0) + 'px'; }
  R.lineas = function (c) {
    var t = c.mayus ? String(c.texto).toUpperCase() : String(c.texto), out = [];
    ponerFuente(mc, c);
    t.split('\n').forEach(function (par) {
      if (!par) { out.push({ t: '', a: 0 }); return; }
      var palabras = par.split(' '), act = '';
      palabras.forEach(function (p) {
        var prueba = act ? act + ' ' + p : p;
        if (act && mc.measureText(prueba).width > c.w) { out.push({ t: act, a: mc.measureText(act).width }); act = p; } else act = prueba;
      });
      out.push({ t: act, a: mc.measureText(act).width });
    });
    return out;
  };
  R.ajustarTexto = function (c) {
    var n = R.lineas(c).length, h = Math.max(c.tam, n * c.tam * c.interlineado);
    if (c._arriba) { c.y += h / 2; delete c._arriba; } else if (c._h0 !== undefined) delete c._h0;
    c.h = h;
  };
  R.estilo = function (ctx, rel, w, h, def) {
    if (!rel) return def || '#000000';
    if (rel.tipo === 'solido') return rel.c1;
    var g;
    if (rel.tipo === 'radial') g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) / 2);
    else {
      var a = (rel.ang || 0) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), len = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
      g = ctx.createLinearGradient(-dx * len, -dy * len, dx * len, dy * len);
    }
    g.addColorStop(0, rel.c1); if (rel.c3) g.addColorStop(0.5, rel.c3); g.addColorStop(1, rel.c2 || rel.c1);
    return g;
  };
  function dibujarTexto(ctx, c, o) {
    var L = R.lineas(c), lh = c.tam * c.interlineado, h = Math.max(c.tam, L.length * lh);
    ponerFuente(ctx, c); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    var relleno = R.estilo(ctx, c.relleno, c.w, h, c.color), conCont = c.contorno && c.contorno.ancho > 0, sc = escalaActual(ctx);
    var curvo = c.curva && c.trazo !== 'ninguno';
    function sombraOn() { if (c.sombra) { ctx.shadowColor = c.sombra.color; ctx.shadowBlur = c.sombra.blur * sc; ctx.shadowOffsetX = c.sombra.dx * sc; ctx.shadowOffsetY = c.sombra.dy * sc; } }
    function sombraOff() { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0; }
    L.forEach(function (ln, i) {
      var y = -h / 2 + (i + 0.5) * lh;
      var pasadas = conCont ? ['s', 'f'] : ['f'];
      pasadas.forEach(function (ps, pi) {
        if (pi === 0) sombraOn(); else sombraOff();
        if (ps === 's') { ctx.strokeStyle = c.contorno.color; ctx.lineWidth = c.contorno.ancho * 2; } else ctx.fillStyle = relleno;
        if (!curvo) {
          var x = c.alin === 'left' ? -c.w / 2 : c.alin === 'right' ? c.w / 2 : 0;
          ctx.textAlign = c.alin === 'left' ? 'left' : c.alin === 'right' ? 'right' : 'center';
          if (ps === 's') ctx.strokeText(ln.t, x, y); else ctx.fillText(ln.t, x, y);
          if (ps === 'f' && c.subrayado && ln.t) {
            var x0 = c.alin === 'left' ? x : c.alin === 'right' ? x - ln.a : x - ln.a / 2;
            ctx.fillRect(x0, y + c.tam * 0.42, ln.a, Math.max(1, c.tam / 16));
          }
        } else textoCurvo(ctx, c, ln, i, lh, y, ps);
      });
      sombraOff();
    });
  }
  function textoCurvo(ctx, c, ln, i, lh, y, ps) {
    var s = ln.t; if (!s) return;
    var pw = [0]; for (var q = 1; q <= s.length; q++) pw.push(ctx.measureText(s.slice(0, q)).width);
    var tot = pw[s.length], sg = c.curva >= 0 ? 1 : -1, amp = Math.abs(c.curva) / 100;
    var circulo = c.trazo === 'circulo', onda = c.trazo === 'onda';
    var theta = circulo ? 2 * Math.PI : amp * Math.PI, R0 = tot / Math.max(0.0001, theta);
    ctx.textAlign = 'left';
    for (var k = 0; k < s.length; k++) {
      var cw = pw[k + 1] - pw[k], sPos = pw[k] + cw / 2 - tot / 2, px, py, rot;
      if (onda) {
        var A = amp * c.tam * 1.2, ph = 2 * Math.PI * sPos / Math.max(1, tot);
        px = sPos; py = y + A * Math.sin(ph) * sg; rot = Math.atan(A * Math.cos(ph) * 2 * Math.PI / Math.max(1, tot) * sg);
      } else {
        var Ri = Math.max(1, R0 - sg * i * lh), phi = sPos / Ri;
        if (sg > 0) { var cy = -c.h / 2 + 0.5 * lh + R0; px = Ri * Math.sin(phi); py = cy - Ri * Math.cos(phi); rot = phi; }
        else { var cy2 = -c.h / 2 + 0.5 * lh - R0; Ri = Math.max(1, R0 + i * lh); phi = sPos / Ri; px = Ri * Math.sin(phi); py = cy2 + Ri * Math.cos(phi); rot = -phi; }
      }
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      if (ps === 's') ctx.strokeText(s[k], -cw / 2, 0); else ctx.fillText(s[k], -cw / 2, 0);
      ctx.restore();
    }
  }
  /* ---------- formas ---------- */
  function f2(n) { return Math.round(n * 100) / 100; }
  function rr(w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); var x = -w / 2, y = -h / 2;
    if (!r) return 'M' + f2(x) + ' ' + f2(y) + 'h' + f2(w) + 'v' + f2(h) + 'h' + f2(-w) + 'z';
    return 'M' + f2(x + r) + ' ' + f2(y) + 'h' + f2(w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + f2(h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + -r + ' ' + r +
      'h' + f2(-(w - 2 * r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + -r + ' ' + -r + 'v' + f2(-(h - 2 * r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + -r + 'z';
  }
  function poli(pts, w, h) { return 'M' + pts.map(function (p) { return f2(p[0] * w / 2) + ' ' + f2(p[1] * h / 2); }).join('L') + 'z'; }
  var FLECHA = [[-1, -0.3], [0.15, -0.3], [0.15, -1], [1, 0], [0.15, 1], [0.15, 0.3], [-1, 0.3]];
  R.dForma = function (c) {
    var w = c.w, h = c.h;
    switch (c.forma) {
      case 'elipse': return 'M' + f2(-w / 2) + ' 0a' + f2(w / 2) + ' ' + f2(h / 2) + ' 0 1 0 ' + f2(w) + ' 0a' + f2(w / 2) + ' ' + f2(h / 2) + ' 0 1 0 ' + f2(-w) + ' 0z';
      case 'poligono': return poli(Geo.poligono(Math.max(3, c.lados | 0)), w, h);
      case 'estrella': return poli(Geo.estrella(Math.max(3, c.puntas | 0), c.interior), w, h);
      case 'flecha': return poli(FLECHA, w, h);
      case 'linea': return 'M' + f2(-w / 2) + ' 0H' + f2(w / 2);
      case 'burbuja': {
        var hb = h * 0.78, r = Math.min(c.radio || h * 0.18, hb / 2, w / 2), x0 = -w / 2, y0 = -h / 2, x1 = w / 2, yb = y0 + hb;
        var tip = (c.cola == null ? -0.5 : c.cola) * (w / 2 - r * 1.5), bl = Math.max(x0 + r, Math.min(x1 - r - w * 0.12, tip)), br = bl + w * 0.12;
        return 'M' + f2(x0 + r) + ' ' + f2(y0) + 'H' + f2(x1 - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'V' + f2(yb - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + -r + ' ' + r +
          'H' + f2(br) + 'L' + f2(bl - w * 0.04) + ' ' + f2(h / 2) + 'L' + f2(bl) + ' ' + f2(yb) + 'H' + f2(x0 + r) + 'a' + r + ' ' + r + ' 0 0 1 ' + -r + ' ' + -r + 'V' + f2(y0 + r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + -r + 'z';
      }
      case 'icono': return IM.Iconos.mapa[c.icono] || IM.Iconos.mapa.estrella;
      default: return rr(w, h, c.radio || 0);
    }
  };
  var cachePath = {};
  function path2d(d) { return cachePath[d] || (cachePath[d] = new Path2D(d)); }
  function escalaActual(ctx) { var t = ctx.getTransform(); return Math.hypot(t.a, t.b) || 1; }
  function dibujarForma(ctx, c) {
    var d = R.dForma(c), sc = escalaActual(ctx), icono = c.forma === 'icono';
    if (c.sombra) { ctx.shadowColor = c.sombra.color; ctx.shadowBlur = c.sombra.blur * sc; ctx.shadowOffsetX = c.sombra.dx * sc; ctx.shadowOffsetY = c.sombra.dy * sc; }
    ctx.save();
    if (icono) { ctx.translate(-c.w / 2, -c.h / 2); ctx.scale(c.w / 24, c.h / 24); }
    var p = path2d(d), ancho = c.trazo ? c.trazo.ancho : 0, conRel = c.relleno && c.forma !== 'linea';
    if (conRel) { ctx.fillStyle = icono ? c.relleno.c1 : R.estilo(ctx, c.relleno, c.w, c.h); ctx.fill(p, 'evenodd'); }
    if (c.sombra && conRel) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0; }
    if (ancho > 0 && c.trazo) {
      ctx.strokeStyle = c.trazo.color; ctx.lineWidth = icono ? ancho * 24 / c.w : ancho; ctx.lineJoin = 'round'; ctx.lineCap = c.forma === 'linea' ? (c.trazo.cap || 'round') : 'round';
      ctx.setLineDash(c.trazo.punteado ? [ancho * 2.2, ancho * 1.6] : []); ctx.stroke(p); ctx.setLineDash([]);
    }
    if (c.forma === 'linea' && c.punta && c.trazo) {
      var a = Math.max(6, c.trazo.ancho * 3.2);
      ctx.fillStyle = c.trazo.color; ctx.beginPath(); ctx.moveTo(c.w / 2 + a * 0.6, 0); ctx.lineTo(c.w / 2 - a * 0.6, -a * 0.7); ctx.lineTo(c.w / 2 - a * 0.6, a * 0.7); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function dibujarQR(ctx, c) {
    var n = c.m.length; if (!n) return; var t = n + c.borde * 2, k = c.w / t;
    ctx.fillStyle = c.bg; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.fillStyle = c.fg;
    ctx.beginPath();
    for (var y = 0; y < n; y++) { var x = 0; while (x < n) { if (c.m[y][x] === '1') { var x0 = x; while (x < n && c.m[y][x] === '1') x++; ctx.rect(-c.w / 2 + (x0 + c.borde) * k, -c.h / 2 + (y + c.borde) * k, (x - x0) * k, k + 0.4 / 1); } else x++; } }
    ctx.fill();
  }
  function dibujarImagen(ctx, c, o) {
    var cv = Pix.get(c.px); if (!cv) return;
    var sc = escalaActual(ctx) * Math.max(Math.abs(c.w) / cv.width, 0);
    if (o.rapido || sc < 0.6) cv = Pix.proxy(c.px) || cv;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (c.sombra) { ctx.shadowColor = c.sombra.color; ctx.shadowBlur = c.sombra.blur * escalaActual(ctx); ctx.shadowOffsetX = c.sombra.dx * escalaActual(ctx); ctx.shadowOffsetY = c.sombra.dy * escalaActual(ctx); }
    ctx.drawImage(cv, -c.w / 2, -c.h / 2, c.w, c.h);
    if (c.trazo && c.trazo.ancho > 0) { ctx.shadowColor = 'transparent'; ctx.strokeStyle = c.trazo.color; ctx.lineWidth = c.trazo.ancho * 2; ctx.save(); ctx.beginPath(); ctx.rect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.clip(); ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore(); }
  }
  /* trazo de recorte por forma (coords locales) */
  R.RECORTES = [['elipse', 'Círculo / elipse'], ['redondeado', 'Rect. redondeado'], ['estrella', 'Estrella'], ['corazon', 'Corazón'], ['hexagono', 'Hexágono'], ['triangulo', 'Triángulo'], ['rombo', 'Rombo'], ['burbuja', 'Burbuja']];
  R.dRecorte = function (c) {
    var f = { w: c.w, h: c.h, radio: Math.min(c.w, c.h) * 0.18, lados: 6, puntas: 5, interior: 0.42, cola: -0.5 };
    switch (c.recorte) {
      case 'elipse': f.forma = 'elipse'; break; case 'redondeado': f.forma = 'rect'; break; case 'estrella': f.forma = 'estrella'; break;
      case 'hexagono': f.forma = 'poligono'; break; case 'triangulo': f.forma = 'poligono'; f.lados = 3; break; case 'rombo': f.forma = 'poligono'; f.lados = 4; break;
      case 'burbuja': f.forma = 'burbuja'; break;
      case 'corazon': return 'M0 ' + f2(c.h / 2) + 'C' + f2(-c.w * 0.62) + ' ' + f2(c.h * 0.1) + ' ' + f2(-c.w * 0.5) + ' ' + f2(-c.h * 0.5) + ' 0 ' + f2(-c.h * 0.2) + 'C' + f2(c.w * 0.5) + ' ' + f2(-c.h * 0.5) + ' ' + f2(c.w * 0.62) + ' ' + f2(c.h * 0.1) + ' 0 ' + f2(c.h / 2) + 'z';
      default: return null;
    }
    return R.dForma(f);
  };
  function contenido(ctx, c, o) {
    if (c.tipo === 'imagen') dibujarImagen(ctx, c, o);
    else if (c.tipo === 'texto') dibujarTexto(ctx, c, o);
    else if (c.tipo === 'forma') dibujarForma(ctx, c);
    else if (c.tipo === 'qr') dibujarQR(ctx, c);
  }
  function temp(prof, W, H) {
    var t = temps[prof];
    if (!t) t = temps[prof] = IM.lienzo(W, H);
    if (t.width !== W || t.height !== H) { t.width = W; t.height = H; }
    return t;
  }
  function copiar(cv) { var n = IM.lienzo(cv.width, cv.height); n.getContext('2d').drawImage(cv, 0, 0); return n; }
  function* genAjuste(ctx, c, o, prof) {
    var cv = ctx.canvas;
    if (c.opacidad >= 0.999) { yield { canvas: cv, ops: c.ops }; return; }
    var antes = copiar(cv); yield { canvas: cv, ops: c.ops }; var desp = copiar(cv), x = cv.getContext('2d');
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, cv.width, cv.height);
    x.drawImage(antes, 0, 0); x.globalAlpha = c.opacidad; x.drawImage(desp, 0, 0); x.restore();
  }
  function* genCapa(ctx, c, o, prof) {
    if (!c.visible || c.id === R.ocultarId) return;
    if (c.tipo === 'ajuste') { yield* genAjuste(ctx, c, o, prof); return; }
    var m = Doc.matriz(c), aislar = c.tipo === 'grupo' || c.mascara || c.recorte;
    ctx.save();
    ctx.globalAlpha = c.opacidad; ctx.globalCompositeOperation = Mezcla.aCanvas(c.mezcla);
    if (!aislar) { ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); contenido(ctx, c, o); }
    else {
      var T = ctx.getTransform(), W = ctx.canvas.width, H = ctx.canvas.height, tmp = temp(prof, W, H), t = tmp.getContext('2d');
      t.setTransform(1, 0, 0, 1, 0, 0); t.globalAlpha = 1; t.globalCompositeOperation = 'source-over'; t.shadowColor = 'transparent'; t.clearRect(0, 0, W, H);
      t.setTransform(T); t.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      if (c.tipo === 'grupo') yield* genCapas(t, c.hijos, o, prof + 1);
      else { var cs = c.sombra; if (cs) { c = Object.assign({}, c, { sombra: null }); } contenido(t, c, o); if (cs) c.sombra = cs; }
      t.globalCompositeOperation = 'destination-in';
      if (c.mascara && Pix.get(c.mascara)) t.drawImage(Pix.get(c.mascara), -c.w / 2, -c.h / 2, c.w, c.h);
      if (c.recorte) { var d = R.dRecorte(c); if (d) t.fill(path2d(d)); }
      t.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (c.sombra) { var s = escalaActual(T); ctx.shadowColor = c.sombra.color; ctx.shadowBlur = c.sombra.blur * (T.a ? Math.hypot(T.a, T.b) : 1); ctx.shadowOffsetX = c.sombra.dx * Math.hypot(T.a, T.b); ctx.shadowOffsetY = c.sombra.dy * Math.hypot(T.a, T.b); }
      ctx.drawImage(tmp, 0, 0);
    }
    ctx.restore();
  }
  function* genCapas(ctx, capas, o, prof) { for (var i = 0; i < capas.length; i++) yield* genCapa(ctx, capas[i], o, prof); }
  function fondo(ctx, p) {
    if (!p.fondo) return;
    ctx.save(); ctx.translate(p.w / 2, p.h / 2); ctx.fillStyle = R.estilo(ctx, p.fondo, p.w, p.h); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  }
  function* genPagina(ctx, p, o) { fondo(ctx, p); yield* genCapas(ctx, p.capas, o, 0); }
  R.filtrarSync = function (canvas, ops) {
    var x = canvas.getContext('2d'), id = x.getImageData(0, 0, canvas.width, canvas.height);
    Filtros.aplicarOps(id.data, id.width, id.height, ops); x.putImageData(id, 0, 0);
  };
  /* ctx ya con la transformacion pagina->canvas */
  R.pintar = function (ctx, p, o) {
    var g = genPagina(ctx, p, o || {}), r = g.next();
    while (!r.done) { R.filtrarSync(r.value.canvas, r.value.ops); r = g.next(); }
  };
  R.pintarAsync = function (ctx, p, o, filtrar) {
    var g = genPagina(ctx, p, o || {});
    return (function paso(r) {
      if (r.done) return Promise.resolve();
      return filtrar(r.value.canvas, r.value.ops).then(function () { return paso(g.next()); });
    })(g.next());
  };
  R.tieneAjustes = function (p) { var s = false; Doc.recorrer(p.capas, function (c) { if (c.tipo === 'ajuste' && c.visible) s = true; }); return s; };
  R.limiteEscala = function (w, h, esc) {
    var max = 16384, area = 120e6; esc = Math.min(esc, max / w, max / h, Math.sqrt(area / (w * h))); return Math.max(0.05, esc);
  };
  /* pagina completa en un canvas (exportacion, miniaturas, proxy) */
  R.aCanvas = function (p, escala, o) {
    o = o || {}; escala = R.limiteEscala(p.w, p.h, escala);
    var W = Math.round(p.w * escala), H = Math.round(p.h * escala), cv = IM.lienzo(W, H), x = cv.getContext('2d');
    if (o.blanco) { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); }
    x.scale(W / p.w, H / p.h);
    if (o.filtrar) return R.pintarAsync(x, p, o, o.filtrar).then(function () { return cv; });
    R.pintar(x, p, o); return cv;
  };
  /* ---------- SVG ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  R.aSvg = function (p) {
    var defs = [], n = 0;
    function relleno(rel, def) {
      if (!rel) return def || 'none'; if (rel.tipo === 'solido') return rel.c1;
      var id = 'g' + (++n), a = (rel.ang || 0) * Math.PI / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
      defs.push(rel.tipo === 'radial' ? '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + rel.c1 + '"/><stop offset="1" stop-color="' + (rel.c2 || rel.c1) + '"/></radialGradient>'
        : '<linearGradient id="' + id + '" x1="' + f2(0.5 - dx) + '" y1="' + f2(0.5 - dy) + '" x2="' + f2(0.5 + dx) + '" y2="' + f2(0.5 + dy) + '"><stop offset="0" stop-color="' + rel.c1 + '"/><stop offset="1" stop-color="' + (rel.c2 || rel.c1) + '"/></linearGradient>');
      return 'url(#' + id + ')';
    }
    function capa(c) {
      if (!c.visible || c.tipo === 'ajuste') return '';
      var m = Doc.matriz(c), a = 'transform="matrix(' + m.map(f2).join(' ') + ')"' + (c.opacidad < 1 ? ' opacity="' + f2(c.opacidad) + '"' : '') + (c.mezcla !== 'normal' ? ' style="mix-blend-mode:' + Mezcla.aCanvas(c.mezcla) + '"' : '');
      var sh = '';
      if (c.sombra) { var fid = 'f' + (++n); defs.push('<filter id="' + fid + '" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="' + c.sombra.dx + '" dy="' + c.sombra.dy + '" stdDeviation="' + f2(c.sombra.blur / 2) + '" flood-color="' + c.sombra.color + '"/></filter>'); sh = ' filter="url(#' + fid + ')"'; }
      if (c.tipo === 'grupo') return '<g ' + a + sh + '>' + c.hijos.map(capa).join('') + '</g>';
      if (c.tipo === 'imagen') { var cv = Pix.get(c.px); return cv ? '<image ' + a + sh + ' x="' + f2(-c.w / 2) + '" y="' + f2(-c.h / 2) + '" width="' + f2(c.w) + '" height="' + f2(c.h) + '" preserveAspectRatio="none" href="' + cv.toDataURL('image/png') + '"/>' : ''; }
      if (c.tipo === 'qr') { var k = c.w / (c.m.length + c.borde * 2), d = ''; c.m.forEach(function (fila, y) { for (var x = 0; x < fila.length; x++) if (fila[x] === '1') d += 'M' + f2(-c.w / 2 + (x + c.borde) * k) + ' ' + f2(-c.h / 2 + (y + c.borde) * k) + 'h' + f2(k) + 'v' + f2(k) + 'h' + f2(-k) + 'z'; });
        return '<g ' + a + '><rect x="' + f2(-c.w / 2) + '" y="' + f2(-c.h / 2) + '" width="' + f2(c.w) + '" height="' + f2(c.h) + '" fill="' + c.bg + '"/><path d="' + d + '" fill="' + c.fg + '"/></g>'; }
      if (c.tipo === 'texto') {
        var L = R.lineas(c), lh = c.tam * c.interlineado, h = Math.max(c.tam, L.length * lh), anc = c.alin === 'left' ? 'start' : c.alin === 'right' ? 'end' : 'middle', x = c.alin === 'left' ? -c.w / 2 : c.alin === 'right' ? c.w / 2 : 0;
        var tt = '<text ' + a + sh + ' font-family="' + esc(c.fuente.replace(/"/g, "'")) + '" font-size="' + c.tam + '" font-weight="' + c.peso + '"' + (c.cursiva ? ' font-style="italic"' : '') + ' text-anchor="' + anc + '" fill="' + relleno(c.relleno, c.color) + '"' + (c.espaciado ? ' letter-spacing="' + c.espaciado + '"' : '') + (c.subrayado ? ' text-decoration="underline"' : '') +
          (c.contorno && c.contorno.ancho > 0 ? ' stroke="' + c.contorno.color + '" stroke-width="' + c.contorno.ancho * 2 + '" paint-order="stroke" stroke-linejoin="round"' : '') + '>';
        L.forEach(function (ln, i) { tt += '<tspan x="' + f2(x) + '" y="' + f2(-h / 2 + (i + 0.5) * lh) + '" dominant-baseline="middle">' + esc(c.mayus ? ln.t.toUpperCase() : ln.t) + '</tspan>'; });
        return tt + '</text>';
      }
      var d2 = R.dForma(c), ic = c.forma === 'icono', tr = c.trazo && c.trazo.ancho > 0 ? ' stroke="' + c.trazo.color + '" stroke-width="' + (ic ? c.trazo.ancho * 24 / c.w : c.trazo.ancho) + '" stroke-linejoin="round" stroke-linecap="round"' + (c.trazo.punteado ? ' stroke-dasharray="' + c.trazo.ancho * 2 + ' ' + c.trazo.ancho * 1.5 + '"' : '') : '';
      return '<g ' + a + sh + '><path ' + (ic ? 'transform="translate(' + f2(-c.w / 2) + ' ' + f2(-c.h / 2) + ') scale(' + f2(c.w / 24) + ' ' + f2(c.h / 24) + ')" ' : '') + 'fill-rule="evenodd" fill="' + (c.forma === 'linea' ? 'none' : relleno(c.relleno)) + '"' + tr + ' d="' + d2 + '"/></g>';
    }
    var cuerpo = p.capas.map(capa).join(''), bg = p.fondo ? '<rect width="' + p.w + '" height="' + p.h + '" fill="' + relleno(p.fondo) + '"/>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + p.w + '" height="' + p.h + '" viewBox="0 0 ' + p.w + ' ' + p.h + '"><defs>' + defs.join('') + '</defs>' + bg + cuerpo + '</svg>';
  };
  IM.Render = R;
})(window.IM);
