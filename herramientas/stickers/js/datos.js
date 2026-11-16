/* Almacenamiento: IndexedDB 'stickers' (ligero: packs, stickers pequenos <=150 KB, metadatos de proyectos; se sincroniza con Cuenta) e IndexedDB
   'stickers_local' (pesado: proyectos completos y stickers grandes/animados; solo este dispositivo). Ajustes y claves de IA: localStorage, nunca se sincronizan. window.StDatos */
(function (g) {
  'use strict';
  const ID = 'stickers', LIM_NUBE = 150 * 1024, A = g.Almacen;
  const L = A.crear(ID), P = A.crear('stickers_local');
  const Dt = g.StDatos = { ID, alm: L, pes: P, COLS: ['packs', 'stickers', 'proyectos_meta'], LIM_NUBE };
  const ls = g.Tr.ls;
  Dt.ajustes = function () { try { return JSON.parse(ls('stickers_ajustes_dispositivo') || '{}') || {}; } catch (e) { return {}; } };
  Dt.ajuste = function (k, v) { const a = Dt.ajustes(); if (v === undefined) return a[k]; a[k] = v; ls('stickers_ajustes_dispositivo', JSON.stringify(a)); return v; };
  Dt.claves = function () { try { return JSON.parse(ls('stickers_claves_dispositivo') || '{}') || {}; } catch (e) { return {}; } };
  Dt.ponerClaves = (o) => ls('stickers_claves_dispositivo', JSON.stringify(o));
  const aBlob = (c, t, q) => new Promise((ok) => c.toBlob((b) => ok(b), t || 'image/png', q));
  const aDataURL = (b) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(b); });
  Dt.aBlob = aBlob; Dt.aDataURL = aDataURL;
  Dt.miniatura = function (cv, lado) { lado = lado || 96; const c = document.createElement('canvas'); c.width = c.height = lado; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; const k = Math.min(lado / cv.width, lado / cv.height); x.drawImage(cv, (lado - cv.width * k) / 2, (lado - cv.height * k) / 2, cv.width * k, cv.height * k); return c.toDataURL('image/webp', 0.8); };
  Dt.dataURLaBlob = (u) => g.Tr.dataUrlABlob(u);
  Dt.imagenDe = (u) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('imagen')); i.src = u; });
  Dt.blobAImagen = (b) => { const u = URL.createObjectURL(b); return Dt.imagenDe(u).then((i) => { setTimeout(() => URL.revokeObjectURL(u), 3000); return i; }); };

  /* ---- proyectos ---- */
  Dt.guardarProyecto = async function (D, mini, fav) {
    const ser = await D.serializar(), id = D.id || L.nuevoId(), antes = await L.get('proyectos_meta', id);
    await P.set('proyectos', { id, nombre: D.nombre, estructura: ser.estructura, pix: ser.pix });
    await L.set('proyectos_meta', { id, nombre: D.nombre, mini, w: D.w, h: D.h, capas: D.capas.length, fav: fav != null ? !!fav : !!(antes && antes.fav) });
    D.id = id; D.sucio = false; return id;
  };
  Dt.cargarProyecto = async (id) => P.get('proyectos', id);
  Dt.listaProyectos = async () => (await L.lista('proyectos_meta')).sort((a, b) => (b._t || 0) - (a._t || 0));
  Dt.borrarProyecto = async (id) => { await P.borrar('proyectos', id); await L.borrar('proyectos_meta', id); };
  Dt.favoritoProyecto = async (id, v) => { const m = await L.get('proyectos_meta', id); if (m) { m.fav = !!v; await L.set('proyectos_meta', m); } };

  /* ---- stickers ---- */
  /* s: {nombre, canvas (imagen final), emojis, proyecto, anim:{frames:[Blob png], ms:[..], webp?:Blob}} -> registro ligero */
  Dt.guardarSticker = async function (s) {
    const png = await aBlob(s.canvas, 'image/png'), webp = await aBlob(s.canvas, 'image/webp', 0.88); let mejor = png; if (webp && webp.type === 'image/webp' && webp.size < png.size) mejor = webp;
    const id = s.id || L.nuevoId(), pequeno = mejor.size <= LIM_NUBE && !s.anim, reg = { id, nombre: s.nombre || 'Sticker', w: s.canvas.width, h: s.canvas.height, emojis: s.emojis || [], proyecto: s.proyecto || null, animado: !!s.anim, bytes: mejor.size, mini: Dt.miniatura(s.canvas, 96), local: !pequeno, img: pequeno ? await aDataURL(mejor) : null };
    if (!pequeno) await P.set('stickers_pesados', { id, blob: png, anim: s.anim || null }); else await P.borrar('stickers_pesados', id);
    return L.set('stickers', reg);
  };
  Dt.listaStickers = async () => (await L.lista('stickers')).sort((a, b) => (b._t || 0) - (a._t || 0));
  /* Blob PNG/WebP de un sticker (de la nube ligera o del almacen local pesado). */
  Dt.imagenSticker = async function (s) { if (s.img) return Dt.dataURLaBlob(s.img); const r = await P.get('stickers_pesados', s.id); return r ? r.blob : null; };
  Dt.animSticker = async (s) => { const r = await P.get('stickers_pesados', s.id); return r && r.anim; };
  Dt.borrarSticker = async function (id) { await L.borrar('stickers', id); await P.borrar('stickers_pesados', id); for (const pk of await Dt.listaPacks()) { if (pk.items.some((i) => i.sid === id)) { pk.items = pk.items.filter((i) => i.sid !== id); if (pk.bandeja === id) pk.bandeja = ''; await L.set('packs', pk); } } };
  Dt.actualizarSticker = async (s) => L.set('stickers', s);

  /* ---- packs: {id, nombre, autor, bandeja (id de sticker), items:[{sid, emojis}], plataforma} ---- */
  Dt.listaPacks = async () => (await L.lista('packs')).sort((a, b) => (a._creado || 0) - (b._creado || 0));
  Dt.guardarPack = async (p) => L.set('packs', p);
  Dt.packNuevo = (nombre, autor) => ({ nombre: nombre || 'Mi pack', autor: autor || '', bandeja: '', items: [], plataforma: 'wa' });
  Dt.borrarPack = (id) => L.borrar('packs', id);
  Dt.listo = Promise.all([L.listo, P.listo]);
})(window);
