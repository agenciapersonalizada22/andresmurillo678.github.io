/* Miniaturas en canvas con plantillas. Dibujo puro sobre un contexto 2D (probable con contexto falso). CIA.miniaturas */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else { g.CIA = g.CIA || {}; g.CIA.miniaturas = m; } })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var T = {};
  T.FORMATOS = { youtube: { nombre: 'YouTube 16:9', w: 1280, h: 720 }, vertical: { nombre: 'Vertical 9:16', w: 1080, h: 1920 }, cuadrado: { nombre: 'Cuadrado 1:1', w: 1080, h: 1080 }, retrato: { nombre: 'Retrato 4:5', w: 1080, h: 1350 } };
  T.PLANTILLAS = [['bloque', 'Bloque lateral'], ['centro', 'Centrado con degradado'], ['versus', 'Versus (dos lados)'], ['numero', 'Número grande'], ['cita', 'Cita'], ['pregunta', 'Pregunta']];
  /* parte un texto en lineas que quepan en ancho segun medir(txt) */
  T.partirLineas = function (medir, texto, ancho, maxLineas) {
    var pal = String(texto || '').split(/\s+/).filter(Boolean), lin = [], cur = '';
    pal.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (medir(t) <= ancho || !cur) cur = t; else { lin.push(cur); cur = w; } });
    if (cur) lin.push(cur);
    if (maxLineas && lin.length > maxLineas) { lin = lin.slice(0, maxLineas); lin[maxLineas - 1] = lin[maxLineas - 1].replace(/\s*\S*$/, '') + '…'; }
    return lin;
  };
  /* tamano mayor que cabe en la caja (ancho x alto) con max de lineas */
  T.ajustar = function (ctx, texto, fuente, caja, maxLineas, minPx, maxPx) {
    for (var px = maxPx; px >= minPx; px -= 4) {
      ctx.font = fuente(px); var lin = T.partirLineas(function (t) { return ctx.measureText(t).width; }, texto, caja.w);
      if (lin.length <= maxLineas && lin.length * px * 1.12 <= caja.h) return { px: px, lineas: lin };
    }
    ctx.font = fuente(minPx); return { px: minPx, lineas: T.partirLineas(function (t) { return ctx.measureText(t).width; }, texto, caja.w, maxLineas) };
  };
  function texto(ctx, lin, x, y, px, color, borde, align) {
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
    lin.forEach(function (l, i) { var yy = y + i * px * 1.12; if (borde) { ctx.lineWidth = px * 0.14; ctx.strokeStyle = borde; ctx.strokeText(l, x, yy); } ctx.fillStyle = color; ctx.fillText(l, x, yy); });
  }
  /* o: {plantilla, titulo, subtitulo, marca:{paleta,nombre,tipografia}, tipografia:{titulo,peso}, imagen (img/canvas opcional), valor (num/texto para 'numero'), izq, der} */
  T.dibujar = function (ctx, w, h, o) {
    var p = o.marca.paleta, fam = (o.tipografia && o.tipografia.titulo) || 'system-ui', peso = (o.tipografia && o.tipografia.peso) || 800, fu = function (px) { return peso + ' ' + px + 'px ' + fam; }, m = Math.round(Math.min(w, h) * 0.06), vert = h > w;
    function fondo(a, b) { var gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a); gr.addColorStop(1, b); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); }
    function foto() { if (o.imagen) { var iw = o.imagen.width || o.imagen.naturalWidth, ih = o.imagen.height || o.imagen.naturalHeight; if (iw && ih) { var s = Math.max(w / iw, h / ih); ctx.drawImage(o.imagen, (w - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, w, h); return true; } } return false; }
    function marcaAgua() { ctx.font = '700 ' + Math.round(h * 0.035) + 'px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(o.marca.nombre || '', w - m, h - m * 0.6); }
    var pl = o.plantilla || 'bloque', tit = (o.titulo || '').toUpperCase(), sub = o.subtitulo || '', t;
    if (!foto()) fondo(p.oscuro, p.primario);
    if (pl === 'bloque') {
      ctx.fillStyle = p.acento; ctx.fillRect(0, 0, vert ? w : w * 0.06, vert ? h * 0.025 : h);
      var cw = vert ? w - 2 * m : w * 0.62 - m, bx = vert ? m : w * 0.09;
      t = T.ajustar(ctx, tit, fu, { w: cw, h: h * (vert ? 0.5 : 0.62) }, 4, 40, Math.round(h * (vert ? 0.09 : 0.17)));
      var y = h * (vert ? 0.22 : 0.16); texto(ctx, t.lineas, bx, y, t.px, '#ffffff', 'rgba(0,0,0,.85)');
      if (sub) { var s = T.ajustar(ctx, sub, function (px) { return '600 ' + px + 'px system-ui, sans-serif'; }, { w: cw, h: h * 0.14 }, 2, 24, Math.round(h * 0.05)); ctx.fillStyle = p.acento; ctx.fillRect(bx, y + t.lineas.length * t.px * 1.12 + 10, cw * 0.4, 6); texto(ctx, s.lineas, bx, y + t.lineas.length * t.px * 1.12 + 28, s.px, '#ffffff', null); }
    } else if (pl === 'centro') {
      var gr = ctx.createLinearGradient(0, h * 0.35, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.8)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      t = T.ajustar(ctx, tit, fu, { w: w - 2 * m, h: h * 0.5 }, 3, 40, Math.round(h * 0.16)); texto(ctx, t.lineas, w / 2, h - m - t.lineas.length * t.px * 1.12 - (sub ? h * 0.08 : 0), t.px, '#ffffff', 'rgba(0,0,0,.9)', 'center');
      if (sub) { ctx.font = '600 ' + Math.round(h * 0.05) + 'px system-ui, sans-serif'; texto(ctx, [sub], w / 2, h - m - h * 0.06, Math.round(h * 0.05), p.acento, 'rgba(0,0,0,.8)', 'center'); }
    } else if (pl === 'versus') {
      ctx.fillStyle = p.primario; ctx.globalAlpha = 0.85; ctx.fillRect(0, 0, w / 2, h); ctx.fillStyle = p.secundario; ctx.fillRect(w / 2, 0, w / 2, h); ctx.globalAlpha = 1;
      var lw = w / 2 - 2 * m; [[o.izq || 'A', m], [o.der || 'B', w / 2 + m]].forEach(function (c) { var a = T.ajustar(ctx, String(c[0]).toUpperCase(), fu, { w: lw, h: h * 0.4 }, 3, 36, Math.round(h * 0.14)); texto(ctx, a.lineas, c[1] + lw / 2, h * 0.3, a.px, '#ffffff', 'rgba(0,0,0,.8)', 'center'); });
      var r = Math.round(Math.min(w, h) * 0.11); ctx.fillStyle = p.acento; ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.fill(); ctx.font = fu(Math.round(r * 0.95)); texto(ctx, ['VS'], w / 2, h / 2 - r * 0.5, Math.round(r * 0.95), '#111111', null, 'center');
      if (tit) { var b = T.ajustar(ctx, tit, fu, { w: w - 2 * m, h: h * 0.2 }, 2, 28, Math.round(h * 0.07)); texto(ctx, b.lineas, w / 2, h - m - b.lineas.length * b.px * 1.12, b.px, '#ffffff', 'rgba(0,0,0,.85)', 'center'); }
    } else if (pl === 'numero') {
      var v = String(o.valor || '5'); t = T.ajustar(ctx, v, fu, { w: w * 0.7, h: h * 0.7 }, 1, 80, Math.round(h * (vert ? 0.3 : 0.62))); texto(ctx, t.lineas, m + 8, h * 0.06, t.px, p.acento, 'rgba(0,0,0,.85)');
      var tt = T.ajustar(ctx, tit, fu, { w: w - 2 * m, h: h * 0.3 }, 3, 32, Math.round(h * 0.1)); texto(ctx, tt.lineas, m, h - m - tt.lineas.length * tt.px * 1.12, tt.px, '#ffffff', 'rgba(0,0,0,.9)');
    } else if (pl === 'cita') {
      ctx.font = fu(Math.round(h * 0.5)); texto(ctx, ['“'], m, -h * 0.06, Math.round(h * 0.5), p.acento, null);
      t = T.ajustar(ctx, o.titulo || '', function (px) { return '600 ' + px + 'px ' + ((o.tipografia && o.tipografia.cuerpo) || 'Georgia, serif'); }, { w: w - 2.4 * m, h: h * 0.6 }, 6, 28, Math.round(h * 0.1)); texto(ctx, t.lineas, m * 1.2, h * 0.28, t.px, '#ffffff', 'rgba(0,0,0,.6)');
      if (sub) texto(ctx, ['— ' + sub], m * 1.2, h - m - h * 0.07, Math.round(h * 0.05), p.acento, null);
    } else {
      t = T.ajustar(ctx, (o.titulo || '').replace(/\?*$/, '') + '?', fu, { w: w - 2 * m, h: h * 0.55 }, 4, 40, Math.round(h * 0.17)); var qy = (h - t.lineas.length * t.px * 1.12) / 2; ctx.fillStyle = p.acento; ctx.fillRect(m, qy - 24, w * 0.18, 10); texto(ctx, t.lineas, m, qy, t.px, '#ffffff', 'rgba(0,0,0,.85)');
      if (sub) texto(ctx, [sub], m, qy + t.lineas.length * t.px * 1.12 + 16, Math.round(h * 0.055), p.acento, null);
    }
    marcaAgua();
    return { w: w, h: h, plantilla: pl };
  };
  return T;
});
