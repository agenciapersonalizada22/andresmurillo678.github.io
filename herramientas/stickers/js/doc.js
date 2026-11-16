/* Documento del estudio: capas, registro de pixeles, deshacer/rehacer ilimitado (por diferencias de pixeles y por instantaneas de estructura) y serializacion. window.StDoc */
(function (g) {
  'use strict';
  const D = g.StDoc = { w: 512, h: 512, capas: [], sel: null, nombre: 'Sin título', id: null, pix: new Map(), pila: [], idx: 0, oyentes: [], previa: null, version: 0, sucio: false };
  const STICKER0 = () => ({
    contorno: { on: true, grosor: 10, color: '#ffffff', suavidad: 1.2, cierre: 6, huecos: true, doble: false, grosor2: 5, color2: '#222222' },
    sombra: { on: false, dx: 3, dy: 5, blur: 8, color: '#000000', op: 0.45 },
    holo: { on: false, intensidad: 0.55, angulo: 35, brillos: 14, semilla: 3 }
  });
  D.STICKER0 = STICKER0; D.sticker = STICKER0();
  D.on = (f) => { D.oyentes.push(f); return () => { D.oyentes = D.oyentes.filter((x) => x !== f); }; };
  D.emitir = (t, d) => { D.version++; D.oyentes.slice().forEach((f) => { try { f(t, d); } catch (e) { console.error(e); } }); };
  let n = 0; D.uid = () => 'c' + Date.now().toString(36) + (n++).toString(36) + Math.random().toString(36).slice(2, 5);
  D.crearCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

  /* ---- pixeles ---- */
  D.nuevoPix = function (w, h, fuente, conOrig) {
    const id = D.uid(), c = D.crearCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
    if (fuente) x.drawImage(fuente, 0, 0, c.width, c.height);
    let o = null; if (conOrig) { o = D.crearCanvas(c.width, c.height); o.getContext('2d').drawImage(c, 0, 0); }
    D.pix.set(id, { c, orig: o, v: 0 }); return id;
  };
  D.tocar = (id) => { const p = D.pix.get(id); if (p) p.v++; };
  D.pixelDe = (capa) => capa && capa.pix ? D.pix.get(capa.pix) : null;

  /* ---- estructura ---- */
  D.estructura = () => JSON.stringify({ w: D.w, h: D.h, capas: D.capas, sel: D.sel, sticker: D.sticker, nombre: D.nombre });
  D.cargarEstructura = function (s) { const o = JSON.parse(s); D.w = o.w; D.h = o.h; D.capas = o.capas; D.sel = o.sel; D.sticker = Object.assign(STICKER0(), o.sticker || {}); D.nombre = o.nombre; };
  D.capa = (id) => D.capas.find((c) => c.id === id) || null;
  D.capaSel = () => D.capa(D.sel);
  const marcar = () => { D.sucio = true; };

  /* Cambio de estructura con historial. agrupar: clave para fusionar ajustes seguidos (p.ej. un deslizador). */
  D.cambio = function (etq, fn, agrupar) {
    const antes = D.estructura(); const r = fn(); const despues = D.estructura(); if (antes === despues) return r;
    const u = D.pila[D.idx - 1], ahora = Date.now();
    D.pila.length = D.idx;
    if (agrupar && u && u.t === 'e' && u.clave === agrupar && ahora - u.ts < 1500 && D.idx === D.pila.length) { u.despues = despues; u.ts = ahora; }
    else { D.pila.push({ t: 'e', etq, antes, despues, clave: agrupar || null, ts: ahora }); D.idx = D.pila.length; }
    marcar(); D.emitir('estructura'); return r;
  };
  /* Edicion de pixeles: fn(ctx, canvas) modifica; se guarda solo el rectangulo que cambio. */
  D.pixel = function (id, etq, fn) {
    const p = D.pix.get(id), x = p.c.getContext('2d', { willReadFrequently: true }), antes = x.getImageData(0, 0, p.c.width, p.c.height);
    fn(x, p.c); D.pixelFin(id, antes, etq);
  };
  D.pixelInicio = (id) => { const p = D.pix.get(id); return p.c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, p.c.width, p.c.height); };
  D.pixelFin = function (id, antes, etq) {
    const p = D.pix.get(id), w = p.c.width, h = p.c.height, x = p.c.getContext('2d', { willReadFrequently: true }), d = x.getImageData(0, 0, w, h), a = antes.data, b = d.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let j = 0; j < h; j++) { const o = j * w * 4; for (let i = 0; i < w; i++) { const k = o + i * 4; if (a[k] !== b[k] || a[k + 1] !== b[k + 1] || a[k + 2] !== b[k + 2] || a[k + 3] !== b[k + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; } } }
    D.tocar(id); if (x1 < 0) return false;
    const rw = x1 - x0 + 1, rh = y1 - y0 + 1, A = new Uint8ClampedArray(rw * rh * 4), B = new Uint8ClampedArray(rw * rh * 4);
    for (let j = 0; j < rh; j++) { const s = ((y0 + j) * w + x0) * 4; A.set(a.subarray(s, s + rw * 4), j * rw * 4); B.set(b.subarray(s, s + rw * 4), j * rw * 4); }
    D.pila.length = D.idx; D.pila.push({ t: 'p', etq, id, x: x0, y: y0, w: rw, h: rh, a: A, d: B }); D.idx = D.pila.length; marcar(); D.emitir('pixeles', id); return true;
  };
  const aplicarPx = (e, datos) => { const p = D.pix.get(e.id); if (!p) return; p.c.getContext('2d', { willReadFrequently: true }).putImageData(new ImageData(new Uint8ClampedArray(datos), e.w, e.h), e.x, e.y); D.tocar(e.id); };
  D.puedeDeshacer = () => D.idx > 0; D.puedeRehacer = () => D.idx < D.pila.length;
  D.deshacer = function () { if (D.idx <= 0) return null; const e = D.pila[--D.idx]; if (e.t === 'e') D.cargarEstructura(e.antes); else aplicarPx(e, e.a); marcar(); D.emitir(e.t === 'e' ? 'estructura' : 'pixeles', e.id); return e.etq; };
  D.rehacer = function () { if (D.idx >= D.pila.length) return null; const e = D.pila[D.idx++]; if (e.t === 'e') D.cargarEstructura(e.despues); else aplicarPx(e, e.d); marcar(); D.emitir(e.t === 'e' ? 'estructura' : 'pixeles', e.id); return e.etq; };
  D.memoria = () => D.pila.reduce((s, e) => s + (e.t === 'p' ? e.a.length + e.d.length : e.antes.length + e.despues.length), 0);

  /* ---- capas ---- */
  const BASE = () => ({ id: D.uid(), nombre: '', x: D.w / 2, y: D.h / 2, esc: 1, rot: 0, fx: false, fy: false, op: 1, mezcla: 'source-over', vis: true, filtros: {} });
  D.capaNueva = (tipo, p) => Object.assign(BASE(), { tipo }, p || {});
  D.agregar = function (capa, etq, indice) {
    return D.cambio(etq || 'Añadir capa', () => { if (indice == null) D.capas.push(capa); else D.capas.splice(indice, 0, capa); D.sel = capa.id; return capa; });
  };
  /* Capa de imagen desde un canvas/imagen: se ajusta para caber en el lienzo. */
  D.agregarImagen = function (fuente, nombre, ajustar) {
    const mw = fuente.naturalWidth || fuente.width, mh = fuente.naturalHeight || fuente.height, k = Math.min(1, 1280 / Math.max(mw, mh));
    const id = D.nuevoPix(Math.max(1, Math.round(mw * k)), Math.max(1, Math.round(mh * k)), fuente, true), p = D.pix.get(id);
    const esc = ajustar === false ? 1 : Math.min(D.w * 0.92 / p.c.width, D.h * 0.92 / p.c.height);
    return D.agregar(D.capaNueva('raster', { nombre: nombre || 'Imagen', pix: id, esc }), 'Añadir imagen');
  };
  D.agregarVacia = function (nombre) {
    const id = D.nuevoPix(D.w, D.h, null, false); return D.agregar(D.capaNueva('raster', { nombre: nombre || 'Dibujo', pix: id, esc: 1, dibujo: true }), 'Añadir capa de dibujo');
  };
  D.borrar = (id) => D.cambio('Borrar capa', () => { const i = D.capas.findIndex((c) => c.id === id); if (i < 0) return; D.capas.splice(i, 1); D.sel = D.capas.length ? D.capas[Math.min(i, D.capas.length - 1)].id : null; });
  D.duplicar = function (id) {
    const c = D.capa(id); if (!c) return null;
    return D.cambio('Duplicar capa', () => {
      const cp = JSON.parse(JSON.stringify(c)); cp.id = D.uid(); cp.nombre = (c.nombre || c.tipo) + ' copia'; cp.x += 14; cp.y += 14;
      if (c.pix) { const p = D.pix.get(c.pix), nid = D.nuevoPix(p.c.width, p.c.height, p.c, false), np = D.pix.get(nid); if (p.orig) { np.orig = D.crearCanvas(p.c.width, p.c.height); np.orig.getContext('2d').drawImage(p.orig, 0, 0); } cp.pix = nid; }
      D.capas.splice(D.capas.indexOf(c) + 1, 0, cp); D.sel = cp.id; return cp;
    });
  };
  D.mover = (id, dir) => D.cambio('Ordenar capas', () => { const i = D.capas.findIndex((c) => c.id === id), j = i + dir; if (i < 0 || j < 0 || j >= D.capas.length) return; const t = D.capas[i]; D.capas[i] = D.capas[j]; D.capas[j] = t; });
  D.propiedad = (id, props, agrupar) => D.cambio('Editar capa', () => { const c = D.capa(id); if (c) Object.assign(c, props); }, agrupar || ('p' + id + Object.keys(props).join()));
  D.sticker_ = (fn, agrupar) => D.cambio('Efectos del sticker', () => { fn(D.sticker); }, agrupar || 'efectos');

  D.vacio = function (w, h) {
    D.w = w || 512; D.h = h || 512; D.capas = []; D.sel = null; D.pila = []; D.idx = 0; D.sticker = STICKER0(); D.nombre = 'Sin título'; D.id = null; D.previa = null; D.sucio = false; D.emitir('estructura');
  };
  D.aplanar = function (renderizar) {
    return D.cambio('Aplanar capas', () => {
      const c = renderizar(), id = D.nuevoPix(D.w, D.h, c, true); D.capas = [D.capaNueva('raster', { nombre: 'Aplanado', pix: id, esc: 1 })]; D.sel = D.capas[0].id;
    });
  };

  /* ---- serializacion (PNG por capa de pixeles) ---- */
  const aBlob = (c) => new Promise((ok, ko) => c.toBlob((b) => b ? ok(b) : ko(new Error('toBlob')), 'image/png'));
  D.serializar = async function () {
    const usados = new Set(D.capas.filter((c) => c.pix).map((c) => c.pix)), pix = {};
    for (const id of usados) { const p = D.pix.get(id); pix[id] = { png: await aBlob(p.c), orig: p.orig ? await aBlob(p.orig) : null, w: p.c.width, h: p.c.height }; }
    return { estructura: D.estructura(), pix };
  };
  const cargarImg = (blob) => new Promise((ok, ko) => { const u = URL.createObjectURL(blob), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = () => { URL.revokeObjectURL(u); ko(new Error('imagen')); }; i.src = u; });
  D.restaurar = async function (obj, id, nombre) {
    D.pix = new Map();
    for (const k in obj.pix) { const r = obj.pix[k], im = await cargarImg(r.png), c = D.crearCanvas(r.w, r.h); c.getContext('2d').drawImage(im, 0, 0); let o = null; if (r.orig) { const io = await cargarImg(r.orig); o = D.crearCanvas(r.w, r.h); o.getContext('2d').drawImage(io, 0, 0); } D.pix.set(k, { c, orig: o, v: 0 }); }
    D.cargarEstructura(obj.estructura); D.pila = []; D.idx = 0; D.id = id || null; if (nombre) D.nombre = nombre; D.previa = null; D.sucio = false; D.emitir('estructura');
  };
})(window);
