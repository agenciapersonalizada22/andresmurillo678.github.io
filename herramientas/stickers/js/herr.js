/* Herramientas del estudio: mover, borrador/restaurar/pincel, varita, recorte por color, lazo, poligono, recorte inteligente, refinado y seleccion. window.StHerr */
(function (g) {
  'use strict';
  const N = g.StNucleo, D = g.StDoc, R = g.StRender, S = g.StSegmentar, C = g.StContorno, H = g.StHerr = {};
  H.activa = 'mover';
  H.o = { tam: 36, dureza: 0.75, opacidad: 1, suav: 0.45, color: '#ff3b6b', tolVarita: 30, contiguo: true, modoSel: 'nuevo', colorClave: [0, 255, 0], tolColor: 40, suavColor: 30, despill: true, marca: 1, marcaTam: 18, lupa: true, tolFondo: 28 };
  H.sel = null; H.poli = []; H.lazo = []; H.marcas = null; H.aviso = () => {}; H.pedirRepintar = () => {}; H.alCambiarSel = () => {};
  const NECESITA_RASTER = ['borrar', 'restaurar', 'pintar', 'varita', 'color', 'lazo', 'poligono', 'inteligente'];
  H.herramientas = [['mover', 'Mover', 'V'], ['borrar', 'Borrador', 'E'], ['restaurar', 'Restaurar', 'R'], ['varita', 'Varita', 'W'], ['color', 'Color', 'K'], ['lazo', 'Lazo', 'L'], ['poligono', 'Polígono', 'P'], ['inteligente', 'Inteligente', 'S'], ['pintar', 'Pincel', 'B']];
  H.usaRaster = (t) => NECESITA_RASTER.indexOf(t || H.activa) >= 0;

  /* ---- geometria capa <-> documento ---- */
  H.aCapa = function (capa, dx, dy) {
    const a = -capa.rot * Math.PI / 180, ux = dx - capa.x, uy = dy - capa.y; let x = (ux * Math.cos(a) - uy * Math.sin(a)) / capa.esc, y = (ux * Math.sin(a) + uy * Math.cos(a)) / capa.esc;
    if (capa.fx) x = -x; if (capa.fy) y = -y; const d = R.dimensiones(capa); return { x: x + d.w / 2, y: y + d.h / 2 };
  };
  H.aDoc = function (capa, lx, ly) {
    const d = R.dimensiones(capa); let x = lx - d.w / 2, y = ly - d.h / 2; if (capa.fx) x = -x; if (capa.fy) y = -y; x *= capa.esc; y *= capa.esc;
    const a = capa.rot * Math.PI / 180; return { x: capa.x + x * Math.cos(a) - y * Math.sin(a), y: capa.y + x * Math.sin(a) + y * Math.cos(a) };
  };
  H.capaEn = function (dx, dy) {
    for (let i = D.capas.length - 1; i >= 0; i--) {
      const c = D.capas[i]; if (!c.vis) continue; const p = H.aCapa(c, dx, dy), d = R.dimensiones(c); if (p.x < 0 || p.y < 0 || p.x >= d.w || p.y >= d.h) continue;
      if (c.tipo === 'raster') { const px = D.pix.get(c.pix); if (px && px.c.getContext('2d', { willReadFrequently: true }).getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data[3] < 16) continue; }
      return c;
    }
    return null;
  };
  H.capaRaster = function (avisar) {
    const c = D.capaSel(); if (c && c.tipo === 'raster') return c;
    if (avisar !== false) H.aviso('Selecciona una capa de imagen (o usa «Convertir a imagen» en Capas).', 'error'); return null;
  };

  /* ---- punta de pincel ---- */
  function punta(tam, dureza, color, op) {
    const d = Math.max(2, Math.ceil(tam)) + 2, c = D.crearCanvas(d, d), x = c.getContext('2d'), r = d / 2, rgb = (color || '#000000').length === 7 ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) : [0, 0, 0];
    const gr = x.createRadialGradient(r, r, 0, r, r, r - 1), s = Math.min(0.95, Math.max(0, dureza)); gr.addColorStop(0, 'rgba(' + rgb + ',' + op + ')'); gr.addColorStop(s, 'rgba(' + rgb + ',' + op + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = gr; x.beginPath(); x.arc(r, r, r, 0, 7); x.fill(); return c;
  }
  let trazo = null;
  function estampa(t, x, y) {
    const c = t.ctx, tip = t.tip, tx = Math.round(x - tip.width / 2), ty = Math.round(y - tip.height / 2);
    if (t.modo === 'restaurar') {
      const o = t.orig; if (!o) return; const tc = t.tmp, w = tip.width, h = tip.height, x2 = tc.getContext('2d'); x2.globalCompositeOperation = 'source-over'; x2.clearRect(0, 0, w, h); x2.drawImage(o, tx, ty, w, h, 0, 0, w, h); x2.globalCompositeOperation = 'destination-in'; x2.drawImage(tip, 0, 0); c.globalCompositeOperation = 'source-over'; c.drawImage(tc, tx, ty);
    } else c.drawImage(tip, tx, ty);
  }
  function lineaEstampas(t, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), paso = Math.max(0.8, t.tamL * 0.12), n = Math.max(1, Math.ceil(dist / paso));
    for (let i = 1; i <= n; i++) estampa(t, a.x + dx * i / n, a.y + dy * i / n);
  }
  function tamLocal(capa) { return Math.max(1, H.o.tam / capa.esc); }

  /* ---- ciclo de puntero ---- */
  H.abajo = function (p) {
    const t = H.activa;
    if (t === 'mover') return moverAbajo(p);
    if (t === 'poligono') return poligonoClic(p);
    const capa = t === 'pintar' ? (H.capaPintar() || null) : H.capaRaster(); if (!capa) return;
    const q = H.aCapa(capa, p.dx, p.dy), px = D.pix.get(capa.pix);
    if (t === 'borrar' || t === 'restaurar' || t === 'pintar') {
      const modo = t === 'borrar' ? 'borrar' : t === 'restaurar' ? 'restaurar' : 'pintar', tamL = tamLocal(capa);
      trazo = { capa, id: capa.pix, ctx: px.c.getContext('2d', { willReadFrequently: true }), antes: D.pixelInicio(capa.pix), modo, tamL, orig: px.orig, tmp: D.crearCanvas(Math.ceil(tamL) + 4, Math.ceil(tamL) + 4), sm: q, ultimo: q, etq: modo === 'borrar' ? 'Borrar' : modo === 'restaurar' ? 'Restaurar' : 'Pincel' };
      trazo.tip = punta(tamL, H.o.dureza, modo === 'pintar' ? H.o.color : '#000000', H.o.opacidad);
      if (modo === 'borrar') trazo.ctx.globalCompositeOperation = 'destination-out'; else trazo.ctx.globalCompositeOperation = 'source-over';
      estampa(trazo, q.x, q.y); H.pedirRepintar(true); return;
    }
    if (t === 'varita') { const m = N.varita(datos(capa), px.c.width, px.c.height, Math.floor(q.x), Math.floor(q.y), H.o.tolVarita * 2.55, H.o.contiguo); H.ponerSel(capa, m); return; }
    if (t === 'color') { if (q.x >= 0 && q.y >= 0 && q.x < px.c.width && q.y < px.c.height) { const d = px.c.getContext('2d', { willReadFrequently: true }).getImageData(Math.floor(q.x), Math.floor(q.y), 1, 1).data; H.o.colorClave = [d[0], d[1], d[2]]; H.alCambiarSel('color'); H.previaColor(); } return; }
    if (t === 'lazo') { H.lazo = [[q.x, q.y]]; H.pedirRepintar(); return; }
    if (t === 'inteligente') { asegurarMarcas(capa); trazo = { marca: true, capa, ultimo: q }; pintarMarca(capa, q, q); H.pedirRepintar(); }
  };
  H.mueve = function (p) {
    if (H.activa === 'mover') return moverMueve(p);
    if (trazo && trazo.modo) {
      const capa = trazo.capa, q = H.aCapa(capa, p.dx, p.dy), k = 1 - H.o.suav * 0.85;
      trazo.sm = { x: trazo.sm.x + (q.x - trazo.sm.x) * k, y: trazo.sm.y + (q.y - trazo.sm.y) * k };
      lineaEstampas(trazo, trazo.ultimo, trazo.sm); trazo.ultimo = trazo.sm; H.pedirRepintar(true);
    } else if (trazo && trazo.marca) { const q = H.aCapa(trazo.capa, p.dx, p.dy); pintarMarca(trazo.capa, trazo.ultimo, q); trazo.ultimo = q; H.pedirRepintar(); }
    else if (H.activa === 'lazo' && H.lazo.length) { const capa = D.capaSel(), q = H.aCapa(capa, p.dx, p.dy), u = H.lazo[H.lazo.length - 1]; if (Math.hypot(q.x - u[0], q.y - u[1]) > 2 / Math.max(0.2, capa.esc)) { H.lazo.push([q.x, q.y]); H.pedirRepintar(); } }
  };
  H.arriba = function () {
    if (H.activa === 'mover') return moverArriba();
    if (trazo && trazo.modo) { trazo.ctx.globalCompositeOperation = 'source-over'; D.pixelFin(trazo.id, trazo.antes, trazo.etq); trazo = null; H.pedirRepintar(false); return; }
    if (trazo && trazo.marca) { trazo = null; return; }
    if (H.activa === 'lazo' && H.lazo.length) { const capa = D.capaSel(); if (H.lazo.length >= 3 && capa) { const px = D.pix.get(capa.pix); H.ponerSel(capa, N.poligono(H.lazo, px.c.width, px.c.height)); } H.lazo = []; H.pedirRepintar(); }
  };
  H.cancelar = function () { trazo = null; H.lazo = []; H.poli = []; H.pedirRepintar(); };
  H.capaPintar = function () {
    const c = D.capaSel(); if (c && c.tipo === 'raster') return c;
    const nueva = D.agregarVacia('Dibujo'); return nueva;
  };

  /* ---- mover / transformar capa ---- */
  let arr = null;
  function moverAbajo(p) {
    let c = D.capaSel(); const hit = H.capaEn(p.dx, p.dy);
    if (hit && hit !== c) { D.sel = hit.id; D.emitir('seleccion'); c = hit; }
    if (!c) return; arr = { c, x0: c.x, y0: c.y, dx: p.dx, dy: p.dy, antes: D.estructura() };
  }
  function moverMueve(p) { if (!arr) return; arr.c.x = arr.x0 + p.dx - arr.dx; arr.c.y = arr.y0 + p.dy - arr.dy; H.pedirRepintar(); }
  function moverArriba() { if (!arr) return; const c = arr.c, ant = arr.antes; arr = null; if (D.estructura() === ant) return; const despues = D.estructura(); D.cargarEstructura(ant); D.cambio('Mover capa', () => { D.cargarEstructura(despues); }); }
  H.transformar = function (capa, parc) { D.propiedad(capa.id, parc, 'gesto' + capa.id); };

  /* ---- poligono ---- */
  function poligonoClic(p) {
    const capa = H.capaRaster(); if (!capa) return; const q = H.aCapa(capa, p.dx, p.dy);
    if (H.poli.length >= 3) { const a = H.aDoc(capa, H.poli[0][0], H.poli[0][1]); if (Math.hypot(a.x - p.dx, a.y - p.dy) < 12 / (H.zoom || 1)) return H.cerrarPoligono(); }
    H.poli.push([q.x, q.y]); H.pedirRepintar();
  }
  H.cerrarPoligono = function () {
    const capa = D.capaSel(); if (!capa || H.poli.length < 3) { H.poli = []; H.pedirRepintar(); return; }
    const px = D.pix.get(capa.pix); H.ponerSel(capa, N.poligono(H.poli, px.c.width, px.c.height)); H.poli = []; H.pedirRepintar();
  };

  /* ---- seleccion ---- */
  const cacheD = { id: null, v: -1, d: null };
  function datos(capa) { const px = D.pix.get(capa.pix); if (cacheD.id !== capa.pix || cacheD.v !== px.v) { cacheD.id = capa.pix; cacheD.v = px.v; cacheD.d = px.c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, px.c.width, px.c.height).data; } return cacheD.d; }
  H.ponerSel = function (capa, m) {
    const px = D.pix.get(capa.pix), w = px.c.width, h = px.c.height;
    if (H.sel && H.sel.pix === capa.pix && H.o.modoSel !== 'nuevo') m = H.o.modoSel === 'sumar' ? N.unir(H.sel.m, m) : N.restar(H.sel.m, m);
    if (!N.cuenta(m)) { H.sel = null; H.alCambiarSel('sel'); H.pedirRepintar(); return; }
    const tinte = D.crearCanvas(w, h), x = tinte.getContext('2d'), id = x.createImageData(w, h);
    for (let p = 0; p < w * h; p++) if (m[p]) { id.data[p * 4] = 40; id.data[p * 4 + 1] = 140; id.data[p * 4 + 2] = 255; id.data[p * 4 + 3] = 70; } x.putImageData(id, 0, 0);
    let lazos = []; try { lazos = C.trazar(m, w, h).filter((l) => Math.abs(l.area) > 4).map((l) => C.douglasPeucker(l.pts, 0.7, true)); } catch (e) {}
    H.sel = { pix: capa.pix, m, w, h, tinte, lazos, n: N.cuenta(m) }; H.alCambiarSel('sel'); H.pedirRepintar();
  };
  H.quitarSel = function () { H.sel = null; H.alCambiarSel('sel'); H.pedirRepintar(); };
  H.selAccion = function (acc, valor) {
    const s = H.sel; if (!s) { H.aviso('No hay selección.', 'error'); return; } const capa = D.capas.find((c) => c.pix === s.pix); if (!capa) return;
    if (acc === 'invertir') { H.sel = null; H.ponerSelDirecto(capa, N.invertir(s.m)); return; }
    if (acc === 'expandir' || acc === 'contraer') { const m = acc === 'expandir' ? N.dilatar(s.m, s.w, s.h, valor || 3) : N.erosionar(s.m, s.w, s.h, valor || 3); H.sel = null; H.ponerSelDirecto(capa, m); return; }
    if (acc === 'borrar' || acc === 'conservar') D.pixel(s.pix, acc === 'borrar' ? 'Borrar selección' : 'Conservar selección', (x, c) => { const id = x.getImageData(0, 0, c.width, c.height); N.aplicarMascara(id.data, s.m, acc === 'conservar'); x.putImageData(id, 0, 0); });
    if (acc === 'capa') {   // copia la seleccion a una capa nueva
      const px = D.pix.get(s.pix), tmp = D.crearCanvas(px.c.width, px.c.height), x = tmp.getContext('2d'); x.drawImage(px.c, 0, 0); const id = x.getImageData(0, 0, tmp.width, tmp.height); N.aplicarMascara(id.data, s.m, true); x.putImageData(id, 0, 0);
      const nid = D.nuevoPix(tmp.width, tmp.height, tmp, true); const nc = D.capaNueva('raster', Object.assign(JSON.parse(JSON.stringify(capa)), { id: D.uid(), pix: nid, nombre: 'Selección' })); D.agregar(nc, 'Selección a capa', D.capas.indexOf(capa) + 1);
    }
    if (acc !== 'invertir') H.quitarSel();
  };
  H.ponerSelDirecto = function (capa, m) { const o = H.o.modoSel; H.o.modoSel = 'nuevo'; H.ponerSel(capa, m); H.o.modoSel = o; };

  /* ---- marcadores del recorte inteligente (resolucion reducida) ---- */
  function asegurarMarcas(capa) {
    const px = D.pix.get(capa.pix); if (H.marcas && H.marcas.pix === capa.pix) return;
    const k = Math.min(1, 300 / Math.max(px.c.width, px.c.height)), w = Math.max(8, Math.round(px.c.width * k)), h = Math.max(8, Math.round(px.c.height * k));
    H.marcas = { pix: capa.pix, w, h, k: w / px.c.width, c: D.crearCanvas(w, h), n: 0 };
  }
  function pintarMarca(capa, a, b) {
    const m = H.marcas, x = m.c.getContext('2d'); x.lineCap = x.lineJoin = 'round'; x.lineWidth = Math.max(2, H.o.marcaTam / capa.esc * m.k); x.strokeStyle = H.o.marca === 1 ? 'rgb(0,255,0)' : 'rgb(255,0,0)'; x.globalCompositeOperation = 'source-over';
    x.beginPath(); x.moveTo(a.x * m.k, a.y * m.k); x.lineTo(b.x * m.k + 0.01, b.y * m.k); x.stroke(); m.n++; H.alCambiarSel('marcas');
  }
  H.borrarMarcas = function () { H.marcas = null; H.alCambiarSel('marcas'); H.pedirRepintar(); };
  H.recorteInteligente = function () {
    const capa = H.capaRaster(); if (!capa) return false; const m = H.marcas; if (!m || m.pix !== capa.pix || !m.n) { H.aviso('Pinta marcadores: verde sobre lo que quieres conservar y rojo sobre el fondo.', 'error'); return false; }
    const px = D.pix.get(capa.pix), fuente = px.orig || px.c, red = D.crearCanvas(m.w, m.h), rx = red.getContext('2d', { willReadFrequently: true }); rx.imageSmoothingQuality = 'high'; rx.drawImage(fuente, 0, 0, m.w, m.h);
    const img = rx.getImageData(0, 0, m.w, m.h), mk = m.c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, m.w, m.h).data, marcas = new Uint8Array(m.w * m.h);
    for (let p = 0; p < marcas.length; p++) { if (mk[p * 4 + 3] > 128) marcas[p] = mk[p * 4 + 1] > 128 ? 1 : 2; }
    let Q; try { Q = S.segmentar(img.data, m.w, m.h, marcas); } catch (e) { H.aviso(e.message, 'error'); return false; }
    const W = px.c.width, Hh = px.c.height, al = S.aAlfa(Q, m.w, m.h, W, Hh, 9);
    D.pixel(capa.pix, 'Recorte inteligente', (x, c) => { x.clearRect(0, 0, W, Hh); x.drawImage(fuente, 0, 0); const id = x.getImageData(0, 0, W, Hh), d = id.data; for (let p = 0; p < W * Hh; p++) d[p * 4 + 3] = Math.round(d[p * 4 + 3] * al[p] / 255); N.descontaminar(d, W, Hh, 2); x.putImageData(id, 0, 0); });
    H.marcas = null; H.alCambiarSel('marcas'); return true;
  };

  /* ---- vistas previas (chroma y refinado) ---- */
  H.previsualizar = function (capa, fn) {
    const px = D.pix.get(capa.pix), c = D.crearCanvas(px.c.width, px.c.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(px.c, 0, 0);
    const id = x.getImageData(0, 0, c.width, c.height); fn(id.data, c.width, c.height); x.putImageData(id, 0, 0);
    D.previa = { pix: capa.pix, canvas: c, v: (D.previa ? D.previa.v : 0) + 1 }; H.pedirRepintar();
  };
  H.aplicarPrevia = function (etq) { const p = D.previa; if (!p) return false; D.previa = null; D.pixel(p.pix, etq, (x, c) => { x.clearRect(0, 0, c.width, c.height); x.drawImage(p.canvas, 0, 0); }); H.pedirRepintar(false); return true; };
  H.cancelarPrevia = function () { if (D.previa) { D.previa = null; H.pedirRepintar(false); } };
  H.previaColor = function () { const c = H.capaRaster(false); if (!c || H.activa !== 'color') return; H.previsualizar(c, (d, w, h) => N.chroma(d, w, h, H.o.colorClave, H.o.tolColor * 2.55, H.o.suavColor * 2.55 + 1, H.o.despill)); };
  H.previaRefinar = function (op) { const c = H.capaRaster(false); if (!c) return; if (!op || (!op.suavizar && !op.pluma && !op.delta && !op.descontaminar)) { H.cancelarPrevia(); return; } H.previsualizar(c, (d, w, h) => N.refinar(d, w, h, op)); };

  /* ---- utilidades ---- */
  H.restaurarOriginal = function () { const c = H.capaRaster(); if (!c) return; const px = D.pix.get(c.pix); if (!px.orig) return; D.pixel(c.pix, 'Restaurar original', (x, cv) => { x.clearRect(0, 0, cv.width, cv.height); x.drawImage(px.orig, 0, 0); }); };
  /* Quita un fondo liso: rellena desde las 4 esquinas con tolerancia. Devuelve cuantos pixeles quito. */
  H.quitarFondoLiso = function (cv, tol) {
    const w = cv.width, h = cv.height, x = cv.getContext('2d', { willReadFrequently: true }), id = x.getImageData(0, 0, w, h); let m = new Uint8Array(w * h);
    [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].forEach(([cx, cy]) => { m = N.unir(m, N.varita(id.data, w, h, cx, cy, (tol == null ? H.o.tolFondo : tol) * 2.55, true)); });
    N.aplicarMascara(id.data, m, false); N.refinar(id.data, w, h, { suavizar: 1, descontaminar: 2 }); x.putImageData(id, 0, 0); return N.cuenta(m);
  };
  H.quitarFondoCapa = function () { const c = H.capaRaster(); if (!c) return; let n = 0; D.pixel(c.pix, 'Quitar fondo liso', (x, cv) => { n = H.quitarFondoLiso(cv); }); H.aviso(n ? 'Fondo quitado (' + n + ' px). Ajusta con la tolerancia o con el borrador.' : 'No se detectó un fondo liso en las esquinas.', n ? '' : 'error'); };
  H.zoom = 1;

  /* ---- overlay (en pantalla): V = {vx, vy, vz} ---- */
  H.pintarOverlay = function (c, V, cursor) {
    const capa = D.capaSel();
    if (capa && (H.sel || H.marcas || H.lazo.length || H.poli.length)) {
      const d = R.dimensiones(capa); c.save(); c.translate(V.vx + capa.x * V.vz, V.vy + capa.y * V.vz); c.rotate(capa.rot * Math.PI / 180); c.scale(capa.esc * V.vz * (capa.fx ? -1 : 1), capa.esc * V.vz * (capa.fy ? -1 : 1)); c.translate(-d.w / 2, -d.h / 2);
      if (H.sel && capa.pix === H.sel.pix) { c.drawImage(H.sel.tinte, 0, 0); c.lineJoin = 'round'; const k = 1 / (capa.esc * V.vz); H.sel.lazos.forEach((l) => { c.beginPath(); l.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); c.closePath(); c.lineWidth = 2.2 * k; c.strokeStyle = '#fff'; c.setLineDash([]); c.stroke(); c.lineWidth = 1.4 * k; c.strokeStyle = '#000'; c.setLineDash([5 * k, 5 * k]); c.stroke(); }); c.setLineDash([]); }
      if (H.marcas && capa.pix === H.marcas.pix) { c.globalAlpha = 0.75; c.imageSmoothingEnabled = false; c.drawImage(H.marcas.c, 0, 0, d.w, d.h); c.globalAlpha = 1; }
      const trz = (pts, cerrar) => { const k = 1 / (capa.esc * V.vz); c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); if (cerrar) c.closePath(); c.lineWidth = 3 * k; c.strokeStyle = '#fff'; c.stroke(); c.lineWidth = 1.5 * k; c.strokeStyle = '#e03131'; c.stroke(); };
      if (H.lazo.length > 1) trz(H.lazo, true);
      if (H.poli.length) { trz(H.poli, false); const k = 1 / (capa.esc * V.vz); H.poli.forEach((p, i) => { c.beginPath(); c.arc(p[0], p[1], (i ? 3.5 : 6) * k, 0, 7); c.fillStyle = i ? '#e03131' : '#2f9e44'; c.fill(); }); }
      c.restore();
    }
    if (cursor && ['borrar', 'restaurar', 'pintar'].indexOf(H.activa) >= 0 && capa) { const r = H.o.tam * V.vz / 2; c.beginPath(); c.arc(cursor.sx, cursor.sy, Math.max(2, r), 0, 7); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(0,0,0,.85)'; c.stroke(); }
    if (cursor && H.activa === 'inteligente' && H.marcas) { const r = H.o.marcaTam * V.vz / 2; c.beginPath(); c.arc(cursor.sx, cursor.sy, Math.max(2, r), 0, 7); c.lineWidth = 2; c.strokeStyle = H.o.marca === 1 ? '#2f9e44' : '#e03131'; c.stroke(); }
    if (capa && H.activa === 'mover') {   // caja de la capa seleccionada
      const d = R.dimensiones(capa), pts = [[0, 0], [d.w, 0], [d.w, d.h], [0, d.h]].map((p) => H.aDoc(capa, p[0], p[1])); c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](V.vx + p.x * V.vz, V.vy + p.y * V.vz)); c.closePath(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke(); c.lineWidth = 1.2; c.setLineDash([6, 4]); c.strokeStyle = '#3e63dd'; c.stroke(); c.setLineDash([]);
    }
  };
  D.on((t) => { if (t === 'estructura' && H.sel && !D.capas.some((c) => c.pix === H.sel.pix)) { H.sel = null; H.alCambiarSel('sel'); } if (t === 'pixeles' && H.sel) { H.sel = null; H.alCambiarSel('sel'); } });
})(window);
