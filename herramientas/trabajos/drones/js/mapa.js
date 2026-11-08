/* Mapa sin librerias: canvas con rejilla y coordenadas propias (metros desde el despegue), plano de fondo opcional, zoom y desplazamiento. window.DronMapa */
(function (g) {
  'use strict';
  const Geo = g.DronGeo;
  function nice(v) { const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  g.DronMapa = function (canvas, o) {
    o = o || {}; const ctx = canvas.getContext('2d'), V = { cx: 0, cy: 0, mpp: 0.5 }, ptrs = new Map(); let W = 300, Hh = 300, dpr = 1, drag = null, pinch = null, img = null, imgSrc = null, raf = 0;
    const M = { vista: V };
    const css = (n, d) => (getComputedStyle(canvas).getPropertyValue(n) || '').trim() || d;
    M.px = (x, y) => [W / 2 + (x - V.cx) / V.mpp, Hh / 2 - (y - V.cy) / V.mpp];
    M.mundo = (sx, sy) => [V.cx + (sx - W / 2) * V.mpp, V.cy - (sy - Hh / 2) * V.mpp];
    M.dim = () => [W, Hh];
    function medir() { const r = canvas.getBoundingClientRect(); dpr = Math.min(3, g.devicePixelRatio || 1); W = Math.max(50, r.width); Hh = Math.max(50, r.height); const w = Math.round(W * dpr), h = Math.round(Hh * dpr); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } }
    M.dibujar = () => {
      cancelAnimationFrame(raf); raf = requestAnimationFrame(pintar);
    };
    M.ahora = pintar;
    function pintar() {
      medir(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = css('--mapa-bg', '#eef1f9'), tx = css('--suave', '#555'), lin = css('--mapa-lin', 'rgba(100,110,140,.28)'), eje = css('--mapa-eje', 'rgba(100,110,140,.7)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, Hh);
      const pl = o.plano && o.plano();
      if (pl && pl.src) {
        if (imgSrc !== pl.src) { imgSrc = pl.src; img = new Image(); img.onload = () => M.dibujar(); img.src = pl.src; }
        if (img && img.complete && img.naturalWidth && pl.visible !== false) { const wm = pl.ancho || 200, hm = wm * img.naturalHeight / img.naturalWidth, [x0, y0] = M.px(pl.cx - wm / 2, pl.cy + hm / 2); ctx.globalAlpha = 0.85; ctx.drawImage(img, x0, y0, wm / V.mpp, hm / V.mpp); ctx.globalAlpha = 1; ctx.strokeStyle = eje; ctx.setLineDash([4, 4]); ctx.strokeRect(x0, y0, wm / V.mpp, hm / V.mpp); ctx.setLineDash([]); }
      }
      const paso = nice(70 * V.mpp), [xa, ya] = M.mundo(0, Hh), [xb, yb] = M.mundo(W, 0);
      ctx.lineWidth = 1; ctx.font = '11px system-ui,sans-serif'; ctx.fillStyle = tx; ctx.textBaseline = 'top';
      for (let x = Math.ceil(xa / paso) * paso, k = 0; x <= xb && k < 200; x += paso, k++) { const sx = Math.round(M.px(x, 0)[0]) + 0.5, cero = Math.abs(x) < paso / 1000; ctx.strokeStyle = cero ? eje : lin; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, Hh); ctx.stroke(); ctx.textAlign = 'left'; ctx.fillText(fmt(x, paso), sx + 3, 3); }
      for (let y = Math.ceil(ya / paso) * paso, k = 0; y <= yb && k < 200; y += paso, k++) { const sy = Math.round(M.px(0, y)[1]) + 0.5, cero = Math.abs(y) < paso / 1000; ctx.strokeStyle = cero ? eje : lin; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke(); ctx.textAlign = 'left'; ctx.fillText(fmt(y, paso), 3, sy + 2); }
      const [hx, hy] = M.px(0, 0); ctx.fillStyle = css('--mapa-home', '#1864ab'); ctx.fillRect(hx - 6, hy - 6, 12, 12); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', hx, hy + 0.5);
      if (o.capas) o.capas(ctx, M);
      // barra de escala y norte
      const m = nice(80 * V.mpp), len = m / V.mpp; ctx.strokeStyle = css('--txt', '#000'); ctx.fillStyle = css('--txt', '#000'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, Hh - 12); ctx.lineTo(10 + len, Hh - 12); ctx.moveTo(10, Hh - 16); ctx.lineTo(10, Hh - 8); ctx.moveTo(10 + len, Hh - 16); ctx.lineTo(10 + len, Hh - 8); ctx.stroke();
      ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(m >= 1000 ? m / 1000 + ' km' : m + ' m', 14 + len, Hh - 8);
      ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = 'bold 13px system-ui'; ctx.fillText('N ↑', W - 8, 6);
      if (o.origen && Geo.valido(o.origen())) { const c = Geo.aGeo(o.origen(), V.cx, V.cy); ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = tx; ctx.fillText(c.lat.toFixed(5) + ', ' + c.lon.toFixed(5), W - 8, Hh - 6); }
    }
    function fmt(v, paso) { const s = Math.abs(v) >= 1000 && paso >= 100 ? (v / 1000) + ' km' : (Math.round(v * 100) / 100) + ' m'; return s; }
    M.ajustar = (pts, margen) => {
      pts = (pts || []).concat([{ x: 0, y: 0 }]); const xs = pts.map(p => p.x), ys = pts.map(p => p.y), mx = Math.min.apply(null, xs), Mx = Math.max.apply(null, xs), my = Math.min.apply(null, ys), My = Math.max.apply(null, ys); medir();
      V.cx = (mx + Mx) / 2; V.cy = (my + My) / 2; const sx = Math.max(Mx - mx, 30), sy = Math.max(My - my, 30); V.mpp = Math.max(0.05, Math.max(sx / (W - 40), sy / (Hh - 40)) * (margen || 1.1)); M.dibujar();
    };
    M.zoom = (f, sx, sy) => { if (sx == null) { sx = W / 2; sy = Hh / 2; } const [x, y] = M.mundo(sx, sy); V.mpp = Math.min(200, Math.max(0.02, V.mpp * f)); V.cx = x - (sx - W / 2) * V.mpp; V.cy = y + (sy - Hh / 2) * V.mpp; M.dibujar(); };
    M.centrar = (x, y) => { V.cx = x; V.cy = y; M.dibujar(); };
    function pos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    canvas.addEventListener('pointerdown', e => {
      canvas.focus({ preventScroll: true }); const [sx, sy] = pos(e); ptrs.set(e.pointerId, [sx, sy]); try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
      if (ptrs.size === 2) { const p = Array.from(ptrs.values()); pinch = { d: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), mpp: V.mpp }; drag = null; return; }
      const h = o.golpe ? o.golpe(sx, sy, M) : null;
      drag = h != null ? { t: 'item', h, mov: 0 } : { t: 'pan', sx, sy, cx: V.cx, cy: V.cy, mov: 0 };
    });
    canvas.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) { if (o.alPasar) o.alPasar(pos(e), M); return; }
      const [sx, sy] = pos(e); ptrs.set(e.pointerId, [sx, sy]);
      if (pinch && ptrs.size >= 2) { const p = Array.from(ptrs.values()), d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); if (pinch.d > 0) { V.mpp = Math.min(200, Math.max(0.02, pinch.mpp * pinch.d / Math.max(d, 1))); M.dibujar(); } return; }
      if (!drag) return;
      if (drag.t === 'pan') { drag.mov = Math.max(drag.mov, Math.hypot(sx - drag.sx, sy - drag.sy)); V.cx = drag.cx - (sx - drag.sx) * V.mpp; V.cy = drag.cy + (sy - drag.sy) * V.mpp; M.dibujar(); }
      else { drag.mov++; const [x, y] = M.mundo(sx, sy); if (drag.mov > 2 && o.alMover) o.alMover(drag.h, x, y); }
    });
    function fin(e) {
      if (!ptrs.has(e.pointerId)) return; const [sx, sy] = pos(e); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
      if (drag && ptrs.size === 0) { if (drag.t === 'pan' && drag.mov < 6 && e.type === 'pointerup' && o.alToque) { const [x, y] = M.mundo(sx, sy); o.alToque(x, y); } else if (drag.t === 'item') { if (drag.mov <= 2 && o.alSel) o.alSel(drag.h); else if (o.alFin) o.alFin(drag.h); } drag = null; }
    }
    canvas.addEventListener('pointerup', fin); canvas.addEventListener('pointercancel', fin);
    canvas.addEventListener('wheel', e => { e.preventDefault(); const [sx, sy] = pos(e); M.zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, sx, sy); }, { passive: false });
    canvas.addEventListener('keydown', e => {
      if (o.alTecla && o.alTecla(e, M)) { e.preventDefault(); return; }
      const k = e.key, d = 60 * V.mpp * (e.shiftKey ? 3 : 1);
      if (k === 'ArrowLeft') V.cx -= d; else if (k === 'ArrowRight') V.cx += d; else if (k === 'ArrowUp') V.cy += d; else if (k === 'ArrowDown') V.cy -= d; else if (k === '+' || k === '=') M.zoom(1 / 1.3); else if (k === '-') M.zoom(1.3); else return;
      e.preventDefault(); M.dibujar();
    });
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => M.dibujar()).observe(canvas); else g.addEventListener('resize', M.dibujar);
    new MutationObserver(M.dibujar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    if (g.matchMedia) g.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', M.dibujar);
    M.dibujar(); return M;
  };
})(window);
