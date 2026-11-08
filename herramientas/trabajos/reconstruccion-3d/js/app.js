/* Estado compartido, bus de eventos, Worker con respaldo en el hilo principal, utilidades de imagen y gestion de capas. window.R3D.App */
(function (g) {
  'use strict';
  var T = g.Tr, R = g.R3D, oy = {};
  var A = R.App = {
    fotos: [], capas: [], proyecto: { id: null, nombre: 'Proyecto sin nombre', notas: '' }, dron: null, params: {}, unidad: { nombre: 'u', k: 1 }, plano: null, seleccion: null,
    LIM_FOTOS: 150
  };
  A.on = function (n, f) { (oy[n] = oy[n] || []).push(f); };
  A.emitir = function (n, d) { (oy[n] || []).slice().forEach(function (f) { try { f(d); } catch (e) { console.error(e); } }); };
  A.logro = function (id) { try { g.CuentaTrabajos.logro(id); } catch (e) {} };
  A.ajustes = function () { return R.Datos.ajustes(); };

  /* ---------- Worker (con respaldo) ---------- */
  var W = null, nid = 1, pend = {}, sinWorker = false;
  function crearWorker() {
    if (W || sinWorker) return W; try { W = new Worker('js/trabajador.js'); } catch (e) { sinWorker = true; return null; }
    W.onmessage = function (e) { var m = e.data, p = pend[m.id]; if (!p) return; if (m.prog != null) { if (p.prog) p.prog(m.prog, m.texto); return; } delete pend[m.id]; if (m.ok) p.ok(m.res); else p.ko(new Error(m.error)); };
    W.onerror = function (e) { var ps = pend; pend = {}; W = null; sinWorker = true; Object.keys(ps).forEach(function (k) { ps[k].reintento(); }); if (e.preventDefault) e.preventDefault(); };
    return W;
  }
  A.trabajar = function (op, datos, prog) {
    return new Promise(function (ok, ko) {
      function local() { setTimeout(function () { try { ok(R.Ops[op](datos, prog)); } catch (e) { ko(e); } }, 20); }
      var w = crearWorker(); if (!w) { local(); return; }
      var id = nid++; pend[id] = { ok: ok, ko: ko, prog: prog, reintento: local }; w.postMessage({ id: id, op: op, datos: datos });
    });
  };
  A.hayWorker = function () { return !!crearWorker(); };

  /* ---------- imagen ---------- */
  var I = R.Img = {};
  I.deFuente = function (fuente, w0, h0, lado) { // fuente: ImageBitmap | HTMLVideoElement | HTMLImageElement | canvas
    var k = Math.min(1, lado / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k)), c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(fuente, 0, 0, w, h); var d = x.getImageData(0, 0, w, h); return { w: w, h: h, data: d.data };
  };
  I.deArchivo = async function (file, lado) {
    var bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await new Promise(function (ok, ko) { var im = new Image(), u = URL.createObjectURL(file); im.onload = function () { URL.revokeObjectURL(u); ok(im); }; im.onerror = function () { ko(new Error('No pude leer la imagen «' + file.name + '».')); }; im.src = u; }); }
    var w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, r = I.deFuente(bmp, w, h, lado); if (bmp.close) bmp.close(); r.origW = w; r.origH = h; return r;
  };
  I.aCanvas = function (img, destino) { var c = destino || document.createElement('canvas'); c.width = img.w; c.height = img.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(img.data), img.w, img.h), 0, 0); return c; };
  I.miniatura = function (img, lado) { var c = I.aCanvas(img), k = Math.min(1, lado / Math.max(img.w, img.h)), m = document.createElement('canvas'); m.width = Math.round(img.w * k); m.height = Math.round(img.h * k); m.getContext('2d').drawImage(c, 0, 0, m.width, m.height); return m.toDataURL('image/jpeg', 0.7); };

  /* ---------- memoria ---------- */
  A.bytesFotos = function () { var b = 0; A.fotos.forEach(function (f) { b += f.data.byteLength + (f.mascara ? f.mascara.byteLength : 0); }); return b; };
  A.bytesCapas = function () { var b = 0; A.capas.forEach(function (c) { b += R.Malla.bytes(c.malla); }); return b; };
  A.memoriaMB = function () { return (A.bytesFotos() + A.bytesCapas()) / 1048576; };
  A.revisarMemoria = function (extraBytes) {
    var lim = A.ajustes().limiteMB, uso = A.memoriaMB() + (extraBytes || 0) / 1048576;
    return { uso: uso, limite: lim, ok: uso <= lim, cerca: uso > lim * 0.75 };
  };
  A.avisoMemoria = function () { var r = A.revisarMemoria(0); if (!r.ok) T.aviso('Memoria del visor al límite (' + r.uso.toFixed(0) + ' de ' + r.limite + ' MB): quita capas o fotos, o baja la resolución.', 'error'); else if (r.cerca) T.aviso('Uso de memoria alto: ' + r.uso.toFixed(0) + ' de ' + r.limite + ' MB.'); };

  /* ---------- fotos ---------- */
  A.agregarFoto = function (img, meta) {
    if (A.fotos.length >= A.LIM_FOTOS) { T.aviso('Máximo ' + A.LIM_FOTOS + ' fotos por sesión.', 'error'); return null; }
    var rv = A.revisarMemoria(img.data.byteLength); if (!rv.ok) { T.aviso('No cabe otra foto en el límite de memoria (' + rv.limite + ' MB). Sube el límite en Archivos > Ajustes o quita fotos.', 'error'); return null; }
    var f = Object.assign({ id: T.uid(), w: img.w, h: img.h, data: img.data, t: 0, nit: null, usar: true, nombre: 'Foto ' + (A.fotos.length + 1) }, meta || {}); A.fotos.push(f); A.emitir('fotos'); return f;
  };
  A.quitarFoto = function (id) { A.fotos = A.fotos.filter(function (f) { return f.id !== id; }); A.emitir('fotos'); };
  A.fotosUsables = function () { return A.fotos.filter(function (f) { return f.usar; }); };

  /* ---------- capas ---------- */
  A.anadirCapa = function (malla, o) {
    o = o || {}; var V = R.Visor; if (!V || !V.listo) { T.aviso('El visor 3D no está disponible en este navegador.', 'error'); return null; }
    var nt = R.Malla.nTri(malla), aj = A.ajustes();
    var rv = A.revisarMemoria(R.Malla.bytes(malla) * 2); if (!rv.ok) { T.aviso('No se añadió: superaría el límite de memoria (' + rv.limite + ' MB). Simplifica el modelo o quita capas.', 'error'); return null; }
    if (nt > aj.maxTri) T.aviso('Modelo muy pesado (' + (nt / 1e6).toFixed(1) + ' M triángulos). Usa «Simplificar» en el visor para ir fluido.');
    if (!malla.idx && malla.pos.length / 3 > 3e6) T.aviso('Nube de ' + (malla.pos.length / 3e6).toFixed(1) + ' M de puntos: considera submuestrear.');
    var c = { id: o.id || T.uid(), nombre: malla.nombre || o.nombre || 'Modelo', malla: malla, grupo: o.grupo || '', visible: o.visible !== false, opacidad: o.opacidad || 1, color: o.color || '#8fb3ff', origen: o.origen || '' }; if (o.nombre) c.nombre = o.nombre;
    if (o.unidad && (!A.capas.length || o.forzarUnidad)) A.ponerUnidad(o.unidad.nombre, o.unidad.k);
    A.capas.push(c); V.poner(c); V.encuadrar(); A.emitir('capas'); A.avisoMemoria(); return c;
  };
  A.quitarCapa = function (id) { A.capas = A.capas.filter(function (c) { return c.id !== id; }); R.Visor.quitar(id); A.emitir('capas'); };
  A.reemplazarMalla = function (id, malla) { var c = A.capas.filter(function (x) { return x.id === id; })[0]; if (!c) return; c.malla = malla; R.Visor.poner(c); A.emitir('capas'); };
  A.ponerUnidad = function (nombre, k) { A.unidad = { nombre: nombre, k: k }; if (R.Visor) { R.Visor.unidad = A.unidad; R.Visor.actualizarCapa && 0; } A.emitir('unidad'); };
  A.irA = function (vista) { if (A.pestanas) A.pestanas.ir(vista); };
  A.fmt = function (v, d) { return (Math.round(v * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d)).toLocaleString('es'); };
})(window);
