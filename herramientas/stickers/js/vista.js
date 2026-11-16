/* Lienzo interactivo: zoom/desplazamiento, gestos tactiles (pellizco para escalar/rotar/mover), lupa para el dedo, rueda, mando y bucle de pintado. window.StVista */
(function (g) {
  'use strict';
  const D = g.StDoc, R = g.StRender, H = g.StHerr, V = g.StVista = { vx: 0, vy: 0, vz: 1, cursor: null, listo: false };
  let stage, cv, lupa, lctx, dpr = 1, cache = null, tick = 0, rapido = false, pend = false, damero = null, punteros = new Map(), gesto = null, panEsp = false, panMouse = null;
  const TACTILES = ['borrar', 'restaurar', 'pintar', 'varita', 'color', 'lazo', 'poligono', 'inteligente'];

  V.iniciar = function (st, canvas, lupaCanvas) {
    stage = st; cv = canvas; lupa = lupaCanvas; lctx = lupa.getContext('2d'); V.listo = true;
    new ResizeObserver(() => { medir(); V.ajustar(false); }).observe(stage);
    cv.addEventListener('pointerdown', abajo); cv.addEventListener('pointermove', mueve); cv.addEventListener('pointerup', arriba); cv.addEventListener('pointercancel', arriba);
    cv.addEventListener('pointerleave', () => { if (!punteros.size) { V.cursor = null; V.repintar(); } });
    cv.addEventListener('wheel', rueda, { passive: false }); cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('dblclick', () => { if (H.activa === 'poligono' && H.poli.length >= 3) H.cerrarPoligono(); });
    addEventListener('keydown', (e) => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName)) { panEsp = true; if (stage.contains(document.activeElement) || document.activeElement === document.body) e.preventDefault(); } });
    addEventListener('keyup', (e) => { if (e.code === 'Space') panEsp = false; });
    D.on(() => V.invalidar(false)); H.pedirRepintar = (r) => { if (r === true) V.invalidar(true); else if (r === false) V.invalidar(false); else V.repintar(); };
    medir(); V.ajustar(); bucleMando();
  };
  function medir() { dpr = Math.min(3, window.devicePixelRatio || 1); const w = stage.clientWidth, h = stage.clientHeight; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); } V.w = w; V.h = h; }
  V.ajustar = function (repintar) { const m = 14, z = Math.min((V.w - m * 2) / D.w, (V.h - m * 2) / D.h); V.vz = Math.max(0.05, z); V.vx = (V.w - D.w * V.vz) / 2; V.vy = (V.h - D.h * V.vz) / 2; H.zoom = V.vz; if (repintar !== false) V.repintar(); };
  V.zoomA = function (factor, cx, cy) { cx = cx == null ? V.w / 2 : cx; cy = cy == null ? V.h / 2 : cy; const nz = Math.min(24, Math.max(0.1, V.vz * factor)), k = nz / V.vz; V.vx = cx - (cx - V.vx) * k; V.vy = cy - (cy - V.vy) * k; V.vz = nz; H.zoom = nz; V.repintar(); };
  V.invalidar = function (r) { tick++; rapido = !!r; V.repintar(); };
  V.repintar = function () { if (pend) return; pend = true; requestAnimationFrame(pintar); };
  V.compuesto = function () {
    const s = V.vz > 1.4 ? 2 : 1, clave = D.version + '|' + tick + '|' + s + '|' + rapido;
    if (!cache || cache.clave !== clave) { const r = R.componer(D, s, { efectos: !rapido, rapido }); cache = { clave, canvas: r.canvas, pad: r.pad, s }; }
    return cache;
  };
  function patronDamero() { if (damero) return damero; const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.fillStyle = '#e9ecf4'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#cfd4e3'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8); return damero = c; }
  function pintar() {
    pend = false; if (!V.listo) return; const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, V.w, V.h);
    const oscuro = getComputedStyle(document.documentElement).colorScheme === 'dark'; x.fillStyle = oscuro ? '#10142a' : '#f1f3fa'; x.fillRect(0, 0, V.w, V.h);
    x.save(); x.beginPath(); x.rect(V.vx, V.vy, D.w * V.vz, D.h * V.vz); x.clip(); x.fillStyle = x.createPattern(patronDamero(), 'repeat'); x.fillRect(0, 0, V.w, V.h);
    if (D.fondoVista) { x.fillStyle = D.fondoVista; x.fillRect(V.vx, V.vy, D.w * V.vz, D.h * V.vz); } x.restore();
    const c = V.compuesto(); x.imageSmoothingEnabled = V.vz < 3; x.imageSmoothingQuality = 'high';
    x.drawImage(c.canvas, V.vx - c.pad / c.s * V.vz, V.vy - c.pad / c.s * V.vz, c.canvas.width / c.s * V.vz, c.canvas.height / c.s * V.vz);
    x.setLineDash([6, 5]); x.lineWidth = 1; x.strokeStyle = oscuro ? 'rgba(255,255,255,.35)' : 'rgba(20,30,70,.35)'; x.strokeRect(V.vx - 0.5, V.vy - 0.5, D.w * V.vz + 1, D.h * V.vz + 1); x.setLineDash([]);
    H.pintarOverlay(x, V, V.cursor);
  }
  const rect = () => cv.getBoundingClientRect();
  function pt(e) { const r = rect(), sx = e.clientX - r.left, sy = e.clientY - r.top; return { sx, sy, dx: (sx - V.vx) / V.vz, dy: (sy - V.vy) / V.vz, tipo: e.pointerType }; }
  function mostrarLupa(p) {
    if (!H.o.lupa || p.tipo !== 'touch' || TACTILES.indexOf(H.activa) < 0) { lupa.hidden = true; return; }
    lupa.hidden = false; const L = lupa.width, r = 24; lupa.style.left = p.sx < V.w / 2 ? 'auto' : '8px'; lupa.style.right = p.sx < V.w / 2 ? '8px' : 'auto';
    lctx.clearRect(0, 0, L, L); lctx.save(); lctx.beginPath(); lctx.arc(L / 2, L / 2, L / 2 - 2, 0, 7); lctx.clip(); lctx.fillStyle = '#fff'; lctx.fillRect(0, 0, L, L);
    lctx.imageSmoothingEnabled = false; lctx.drawImage(cv, (p.sx - r) * dpr, (p.sy - r) * dpr, 2 * r * dpr, 2 * r * dpr, 0, 0, L, L); lctx.restore();
    lctx.strokeStyle = '#e03131'; lctx.lineWidth = 1.5; lctx.beginPath(); lctx.moveTo(L / 2 - 9, L / 2); lctx.lineTo(L / 2 + 9, L / 2); lctx.moveTo(L / 2, L / 2 - 9); lctx.lineTo(L / 2, L / 2 + 9); lctx.stroke();
    if (['borrar', 'restaurar', 'pintar'].indexOf(H.activa) >= 0) { lctx.beginPath(); lctx.arc(L / 2, L / 2, Math.max(2, H.o.tam * V.vz / 2 * (L / (2 * r))), 0, 7); lctx.strokeStyle = '#000'; lctx.lineWidth = 1.2; lctx.stroke(); }
    lctx.beginPath(); lctx.arc(L / 2, L / 2, L / 2 - 2, 0, 7); lctx.strokeStyle = '#fff'; lctx.lineWidth = 3; lctx.stroke();
  }

  function abajo(e) {
    cv.setPointerCapture(e.pointerId); const p = pt(e); punteros.set(e.pointerId, p); stage.focus({ preventScroll: true });
    if (punteros.size === 2) { empezarGesto(); return; }
    if (punteros.size > 2) return;
    if (e.button === 1 || e.button === 2 || panEsp || H.activa === 'mano' || e.altKey) { panMouse = { sx: p.sx, sy: p.sy, vx: V.vx, vy: V.vy }; cv.style.cursor = 'grabbing'; return; }
    mostrarLupa(p); H.abajo(p);
  }
  function mueve(e) {
    const p = pt(e); if (!punteros.has(e.pointerId)) { V.cursor = p; if (TACTILES.indexOf(H.activa) >= 0) V.repintar(); return; }
    punteros.set(e.pointerId, p);
    if (gesto) { actualizarGesto(); return; }
    if (panMouse) { V.vx = panMouse.vx + p.sx - panMouse.sx; V.vy = panMouse.vy + p.sy - panMouse.sy; V.repintar(); return; }
    V.cursor = p; mostrarLupa(p); H.mueve(p);
  }
  function arriba(e) {
    const habia = punteros.has(e.pointerId); punteros.delete(e.pointerId); if (!habia) return;
    if (gesto) { if (punteros.size < 2) { gesto = null; D.emitir('estructura'); } return; }
    if (panMouse) { panMouse = null; cv.style.cursor = ''; return; }
    lupa.hidden = true; H.arriba(pt(e)); if (e.pointerType === 'touch') V.cursor = null;
  }
  function empezarGesto() {
    H.arriba(); lupa.hidden = true; const [a, b] = Array.from(punteros.values()), capa = D.capaSel(), sobreCapa = H.activa === 'mover' && capa;
    gesto = { capa: sobreCapa ? capa : null, d0: Math.hypot(b.sx - a.sx, b.sy - a.sy) || 1, a0: Math.atan2(b.sy - a.sy, b.sx - a.sx), m0: { x: (a.sx + b.sx) / 2, y: (a.sy + b.sy) / 2 }, v0: { x: V.vx, y: V.vy, z: V.vz }, c0: capa ? { x: capa.x, y: capa.y, esc: capa.esc, rot: capa.rot } : null };
  }
  function actualizarGesto() {
    const [a, b] = Array.from(punteros.values()); if (!b) return; const d = Math.hypot(b.sx - a.sx, b.sy - a.sy) || 1, an = Math.atan2(b.sy - a.sy, b.sx - a.sx), m = { x: (a.sx + b.sx) / 2, y: (a.sy + b.sy) / 2 }, k = d / gesto.d0;
    if (gesto.capa) { const c = D.capa(gesto.capa.id) || gesto.capa; c.esc = Math.max(0.02, gesto.c0.esc * k); c.rot = gesto.c0.rot + (an - gesto.a0) * 180 / Math.PI; c.x = gesto.c0.x + (m.x - gesto.m0.x) / V.vz; c.y = gesto.c0.y + (m.y - gesto.m0.y) / V.vz; V.invalidar(true); return; }
    const nz = Math.min(24, Math.max(0.1, gesto.v0.z * k)), kk = nz / gesto.v0.z; V.vz = nz; H.zoom = nz; V.vx = m.x - (gesto.m0.x - gesto.v0.x) * kk; V.vy = m.y - (gesto.m0.y - gesto.v0.y) * kk; V.repintar();
  }
  function rueda(e) {
    e.preventDefault(); const p = pt(e), c = D.capaSel();
    if (H.activa === 'mover' && c && !e.ctrlKey) { if (e.shiftKey) D.propiedad(c.id, { rot: c.rot + (e.deltaY > 0 ? -5 : 5) }, 'rueda'); else D.propiedad(c.id, { esc: Math.max(0.02, c.esc * (e.deltaY > 0 ? 0.93 : 1.075)) }, 'rueda'); return; }
    V.zoomA(e.deltaY > 0 ? 0.88 : 1.14, p.sx, p.sy);
  }
  V.desplazar = (dx, dy) => { V.vx += dx; V.vy += dy; V.repintar(); };

  /* ---- mando (Xbox): cursor virtual + atajos; solo si Mando existe y hay uno conectado ---- */
  let mc = { x: 0, y: 0, abajo: false, t: 0 };
  function bucleMando() {
    const M = g.Mando; if (!M) return;
    (function paso(t) {
      requestAnimationFrame(paso); if (document.hidden) return; M.leer(); if (!M.conectado) return; const dt = Math.min(0.05, (t - mc.t) / 1000 || 0.016); mc.t = t; V.mandoActivo = true;
      const L = M.ejes.izq, Rr = M.ejes.der, vel = 420; if (!mc.x && !mc.y) { mc.x = V.w / 2; mc.y = V.h / 2; }
      mc.x = Math.min(V.w, Math.max(0, mc.x + L.x * vel * dt)); mc.y = Math.min(V.h, Math.max(0, mc.y + L.y * vel * dt));
      const p = { sx: mc.x, sy: mc.y, dx: (mc.x - V.vx) / V.vz, dy: (mc.y - V.vy) / V.vz, tipo: 'mando' }; V.cursor = p;
      if (Rr.x || Rr.y) V.desplazar(-Rr.x * 380 * dt, -Rr.y * 380 * dt);
      if (M.gatillo.der > 0.2) V.zoomA(1 + M.gatillo.der * 1.2 * dt, mc.x, mc.y); if (M.gatillo.izq > 0.2) V.zoomA(1 / (1 + M.gatillo.izq * 1.2 * dt), mc.x, mc.y);
      if (M.pulsado('A')) { mc.abajo = true; H.abajo(p); } else if (mc.abajo && M.sostenido('A')) H.mueve(p); if (mc.abajo && M.soltado('A')) { mc.abajo = false; H.arriba(p); }
      if (M.pulsado('B')) { D.deshacer(); } if (M.pulsado('Y')) { D.rehacer(); }
      const orden = ['mover', 'borrar', 'restaurar', 'varita', 'color', 'lazo', 'poligono', 'inteligente', 'pintar']; const i = orden.indexOf(H.activa);
      if (M.pulsado('RB')) V.alMando && V.alMando('herramienta', orden[(i + 1) % orden.length]); if (M.pulsado('LB')) V.alMando && V.alMando('herramienta', orden[(i + orden.length - 1) % orden.length]);
      if (M.pulsado('ARRIBA')) { H.o.tam = Math.min(200, H.o.tam + 6); V.alMando && V.alMando('tam'); } if (M.pulsado('ABAJO')) { H.o.tam = Math.max(2, H.o.tam - 6); V.alMando && V.alMando('tam'); }
      if (M.pulsado('X')) { H.o.marca = H.o.marca === 1 ? 2 : 1; V.alMando && V.alMando('marca'); } if (M.pulsado('VISTA')) V.ajustar(); if (M.pulsado('MENU')) V.alMando && V.alMando('exportar');
      V.repintar();
    })(0);
  }
})(window);
