/* Compositor: dibuja el fotograma del proyecto en t sobre un canvas (WebGL para efectos, respaldo 2D). VE.Compositor */
(function (g) {
  var M = g.VE.modelo, K = g.VE.keyframes, FL = g.VE.filtros;
  var FUENTES = {
    sans: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', impact: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
    serif: 'Georgia, "Times New Roman", serif', mono: '"Courier New", ui-monospace, monospace', redonda: '"Trebuchet MS", "Segoe UI", sans-serif', cursiva: '"Brush Script MT", "Segoe Script", cursive'
  };
  var EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  function Compositor(canvas, opc) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.opc = opc || {};
    this.fx = this.opc.sinGL ? g.VE.efectos.crear2D() : g.VE.efectos.crear();
    this.pool = []; this.W = canvas.width; this.H = canvas.height;
  }
  Compositor.prototype.tamano = function (w, h) { this.cv.width = this.W = w; this.cv.height = this.H = h; this.pool = []; };
  Compositor.prototype.capa = function (n) {
    var c = this.pool[n]; if (!c) { c = this.pool[n] = document.createElement('canvas'); }
    if (c.width !== this.W || c.height !== this.H) { c.width = this.W; c.height = this.H; }
    var x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, this.W, this.H); return c;
  };
  function geo(c, local) {
    var r = {
      x: K.propiedad(c, 'x', local, c.x), y: K.propiedad(c, 'y', local, c.y), esc: K.propiedad(c, 'esc', local, c.esc),
      rot: K.propiedad(c, 'rot', local, c.rot), op: K.propiedad(c, 'op', local, c.op)
    };
    if (c.estabDatos && c.estabDatos.length) { // correccion de estabilizacion
      var d = c.estabDatos, i = 0; while (i < d.length - 1 && d[i + 1][0] < local) i++;
      var a = d[i], b = d[Math.min(i + 1, d.length - 1)], u = b[0] > a[0] ? Math.max(0, Math.min(1, (local - a[0]) / (b[0] - a[0]))) : 0;
      r.x += a[1] + (b[1] - a[1]) * u; r.y += a[2] + (b[2] - a[2]) * u; r.esc *= 1.1;
    }
    return r;
  }
  function dimsFuente(s) { return [s.videoWidth || s.naturalWidth || s.width, s.videoHeight || s.naturalHeight || s.height]; }

  Compositor.prototype.dibujarMedia = function (ctx, c, src, gm, o) {
    o = o || {}; var W = this.W, H = this.H, d = dimsFuente(src), sw = d[0], sh = d[1]; if (!sw || !sh) return;
    var r = c.rec || { x: 0, y: 0, w: 1, h: 1 }, sx = r.x * sw, sy = r.y * sh, cw = Math.max(1, r.w * sw), ch = Math.max(1, r.h * sh);
    var k = c.fit === 'ajustar' ? Math.min(W / cw, H / ch) : Math.max(W / cw, H / ch), dw = cw * k, dh = ch * k, fo = c.foco || { x: 0.5, y: 0.5 };
    var px = dw > W ? (W - dw) * fo.x : (W - dw) / 2, py = dh > H ? (H - dh) * fo.y : (H - dh) / 2;
    ctx.save();
    ctx.translate(W / 2 + gm.x * W, H / 2 + gm.y * H); ctx.rotate(gm.rot * Math.PI / 180);
    var e = gm.esc; ctx.scale(c.flip ? -e : e, e); ctx.translate(-W / 2, -H / 2);
    if (c.radio > 0 && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(Math.max(0, px), Math.max(0, py), Math.min(W, dw), Math.min(H, dh), c.radio * Math.min(W, H)); ctx.clip(); }
    try { ctx.drawImage(src, sx, sy, cw, ch, px, py, dw, dh); } catch (er) {}
    ctx.restore();
  };

  /* Renderiza un clip visual en un canvas de capa (con efectos) y lo devuelve */
  Compositor.prototype.capaClip = function (n, c, src, t) {
    var cv = this.capa(n), ctx = cv.getContext('2d'), local = t - c.ini, gm = geo(c, local);
    this.dibujarMedia(ctx, c, src, gm);
    if (FL.hayEfectos(c)) {
      try {
        var P = FL.efectivos(c), res = this.fx.aplicar(cv, P, c, t);
        if (this.fx.perdido) throw new Error('perdido');
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(res, 0, 0); ctx.globalCompositeOperation = 'source-over';
      } catch (e) { this.fx = g.VE.efectos.crear2D(); }
    }
    return { cv: cv, op: gm.op };
  };
  Compositor.prototype.blit = function (cv, o) {
    var ctx = this.ctx, W = this.W, H = this.H;
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, o.alpha == null ? 1 : o.alpha));
    if (o.blur > 0.5 && 'filter' in ctx) ctx.filter = 'blur(' + o.blur.toFixed(1) + 'px)';
    ctx.translate(W / 2 + (o.dx || 0) * W, H / 2 + (o.dy || 0) * H); var e = o.esc || 1; ctx.scale(e, e); ctx.drawImage(cv, -W / 2, -H / 2); ctx.restore();
  };
  Compositor.prototype.transicion = function (tipo, u, A, B, c) {
    var e = K.EASE.suave(u), W = this.W, H = this.H;
    if (tipo === 'deslizar') { this.blit(A.cv, { dx: -e, alpha: A.op }); this.blit(B.cv, { dx: 1 - e, alpha: B.op }); }
    else if (tipo === 'zoom') { this.blit(A.cv, { esc: 1 + 0.6 * e, alpha: A.op * (1 - e) + 0.001 }); this.blit(B.cv, { esc: 0.5 + 0.5 * e, alpha: B.op * e }); }
    else if (tipo === 'difuminado') { this.blit(A.cv, { blur: 28 * e * this.W / 1080, alpha: A.op }); this.blit(B.cv, { blur: 28 * (1 - e) * this.W / 1080, alpha: B.op * e }); }
    else if (tipo === 'destello') {
      this.blit(u < 0.5 ? A.cv : B.cv, { alpha: u < 0.5 ? A.op : B.op });
      this.ctx.save(); this.ctx.globalAlpha = Math.sin(Math.PI * u); this.ctx.fillStyle = '#fff'; this.ctx.fillRect(0, 0, W, H); this.ctx.restore();
    }
    else { this.blit(A.cv, { alpha: A.op }); this.blit(B.cv, { alpha: B.op * e }); }
  };

  Compositor.prototype.texto = function (c, t) {
    var ctx = this.ctx, W = this.W, H = this.H, local = t - c.ini, gm = geo(c, local), an = K.animar(c.anim, local, c.dur);
    var fs = Math.max(6, (c.tam || 0.07) * W), fam = FUENTES[c.fuente] || FUENTES.sans, est = c.estilo || 'basico';
    var txt = String(c.texto || ''); if (est === 'impacto') txt = txt.toUpperCase();
    if (c.anim && c.anim.in === 'maquina') txt = txt.slice(0, Math.floor(txt.length * an.prog + 0.0001));
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, gm.op * an.op));
    ctx.translate(W / 2 + (gm.x + an.dx) * W, H / 2 + (gm.y + an.dy) * H); ctx.rotate((gm.rot + an.rot) * Math.PI / 180); var e = gm.esc * an.esc; ctx.scale(e, e);
    ctx.font = (est === 'impacto' ? '900 ' : 'bold ') + fs + 'px ' + (est === 'impacto' ? FUENTES.impact : fam); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var max = (c.ancho || 0.88) * W / Math.max(0.01, e > 1 ? 1 : 1), lines = [];
    String(txt).split('\n').forEach(function (par) {
      var words = par.split(' '), cur = '';
      words.forEach(function (w) { var test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > max && cur) { lines.push(cur); cur = w; } else cur = test; });
      lines.push(cur);
    });
    var lh = fs * 1.22, y0 = -(lines.length - 1) * lh / 2, col = c.color || '#ffffff', bw = 0;
    lines.forEach(function (l) { bw = Math.max(bw, ctx.measureText(l).width); });
    if (est === 'caja' || est === 'subtitulo' || est === 'resaltado') {
      var pad = fs * 0.3; ctx.fillStyle = est === 'resaltado' ? (c.fondo || '#ffd400') : (c.fondo || 'rgba(0,0,0,0.62)');
      var bx = -bw / 2 - pad, by = y0 - lh / 2 - pad * 0.4, bwid = bw + pad * 2, bh = lines.length * lh + pad * 0.8;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bwid, bh, fs * 0.25); else ctx.rect(bx, by, bwid, bh); ctx.fill();
    }
    lines.forEach(function (l, i) {
      var y = y0 + i * lh;
      if (est === 'contorno' || est === 'impacto') { ctx.lineJoin = 'round'; ctx.lineWidth = fs * (est === 'impacto' ? 0.16 : 0.12); ctx.strokeStyle = c.borde || '#000'; ctx.strokeText(l, 0, y); ctx.fillStyle = col; ctx.fillText(l, 0, y); }
      else if (est === 'neon') { ctx.shadowColor = col; ctx.shadowBlur = fs * 0.5; ctx.fillStyle = '#fff'; ctx.fillText(l, 0, y); ctx.shadowBlur = fs * 0.25; ctx.fillStyle = col; ctx.globalCompositeOperation = 'lighter'; ctx.fillText(l, 0, y); ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; }
      else if (est === 'retro') { ctx.fillStyle = '#ff2d95'; ctx.fillText(l, fs * 0.06, y + fs * 0.06); ctx.fillStyle = '#00e5ff'; ctx.fillText(l, -fs * 0.04, y - fs * 0.03); ctx.fillStyle = col === '#ffffff' ? '#fff35c' : col; ctx.fillText(l, 0, y); }
      else if (est === 'gradiente') { var gr = ctx.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); gr.addColorStop(0, col); gr.addColorStop(1, c.color2 || '#ff4fa3'); ctx.fillStyle = gr; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = fs * 0.12; ctx.fillText(l, 0, y); ctx.shadowBlur = 0; }
      else if (est === 'resaltado') { ctx.fillStyle = c.colorTexto || '#111'; ctx.fillText(l, 0, y); }
      else { if (est !== 'subtitulo' && est !== 'caja') { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = fs * 0.15; ctx.shadowOffsetY = fs * 0.04; } ctx.fillStyle = col; ctx.fillText(l, 0, y); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
    });
    ctx.restore();
  };
  function forma(ctx, f, w, h) {
    ctx.beginPath();
    if (f === 'circulo') ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 7);
    else if (f === 'rect') ctx.rect(-w / 2, -h / 2, w, h);
    else if (f === 'redondeado') { if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.25); else ctx.rect(-w / 2, -h / 2, w, h); }
    else if (f === 'triangulo') { ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); }
    else if (f === 'estrella') { for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.5; ctx.lineTo(Math.cos(a) * r * w, Math.sin(a) * r * h); } ctx.closePath(); }
    else if (f === 'corazon') { ctx.moveTo(0, h * 0.35); ctx.bezierCurveTo(-w * 0.6, -h * 0.05, -w * 0.3, -h * 0.55, 0, -h * 0.2); ctx.bezierCurveTo(w * 0.3, -h * 0.55, w * 0.6, -h * 0.05, 0, h * 0.35); ctx.closePath(); }
    else if (f === 'flecha') { ctx.moveTo(-w / 2, -h * 0.18); ctx.lineTo(w * 0.1, -h * 0.18); ctx.lineTo(w * 0.1, -h * 0.5); ctx.lineTo(w / 2, 0); ctx.lineTo(w * 0.1, h * 0.5); ctx.lineTo(w * 0.1, h * 0.18); ctx.lineTo(-w / 2, h * 0.18); ctx.closePath(); }
    else if (f === 'linea') ctx.rect(-w / 2, -h * 0.04, w, h * 0.08);
    else ctx.rect(-w / 2, -h / 2, w, h);
  }
  Compositor.prototype.pegatina = function (c, t) {
    var ctx = this.ctx, W = this.W, H = this.H, local = t - c.ini, gm = geo(c, local), an = K.animar(c.anim, local, c.dur);
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, gm.op * an.op));
    if (c.forma === 'fondo') {
      var gr = ctx.createLinearGradient(0, 0, W * 0.3, H); gr.addColorStop(0, c.color || '#3b2bd9'); gr.addColorStop(1, c.color2 || c.color || '#d92b8a'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore(); return;
    }
    ctx.translate(W / 2 + (gm.x + an.dx) * W, H / 2 + (gm.y + an.dy) * H); ctx.rotate((gm.rot + an.rot) * Math.PI / 180); var e = gm.esc * an.esc; ctx.scale(e, e);
    var s = (c.tam || 0.2) * W;
    if (c.tipo === 'emoji') { ctx.font = s + 'px ' + EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.texto || '⭐', 0, 0); }
    else { forma(ctx, c.forma, s * (c.relacion || 1), s); ctx.fillStyle = c.color || '#ffd400'; ctx.fill(); if (c.borde) { ctx.lineWidth = s * 0.04; ctx.strokeStyle = c.borde; ctx.stroke(); } }
    ctx.restore();
  };

  /* F: VE.fuentes (o simulado). Dibuja todo el proyecto en el instante t. */
  Compositor.prototype.dibujar = function (p, t, F) {
    var ctx = this.ctx, W = this.W, H = this.H, self = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = p.fondo || '#000'; ctx.fillRect(0, 0, W, H);
    for (var i = p.pistas.length - 1; i >= 0; i--) {
      var pista = p.pistas[i]; if (pista.tipo === 'audio' || pista.tipo === 'musica' || pista.oculta) continue;
      pista.clips.forEach(function (c) {
        if (t < c.ini - 1e-6 || t >= M.fin(c) - 1e-6) return;
        if (c.tipo === 'texto') return self.texto(c, t);
        if (c.tipo === 'emoji' || c.tipo === 'forma') return self.pegatina(c, t);
        var src = F.fuente(c); if (!src) return;
        var local = t - c.ini, B = null;
        if (c.trans && local < c.trans.dur && c.trans.tipo !== 'ninguna') {
          var prev = pista.clips.filter(function (o) { return o !== c && Math.abs(M.fin(o) - c.ini) < 0.06 && (o.tipo === 'video' || o.tipo === 'imagen'); })[0];
          var sa = prev && F.fuente(prev);
          if (sa) {
            var tA = M.fin(prev) - 0.0001, a = self.capaClip(0, { __proto__: prev }, sa, Math.min(t, tA)), b = self.capaClip(1, c, src, t);
            self.transicion(c.trans.tipo, local / c.trans.dur, a, b, c); return;
          }
        }
        if (!FL.hayEfectos(c)) { var gm = geo(c, local); ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, gm.op)); self.dibujarMedia(ctx, c, src, gm); ctx.restore(); return; }
        var L = self.capaClip(0, c, src, t); self.blit(L.cv, { alpha: L.op });
      });
    }
  };
  Compositor.FUENTES = FUENTES;
  g.VE.Compositor = Compositor;
})(window);
