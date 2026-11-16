/* Biblioteca local: importa archivos/carpetas del usuario (input, File System Access, arrastrar y soltar), lee etiquetas con MuEtiq y guarda solo el indice.
   Los archivos NO se suben ni se guardan completos salvo "guardar copia offline". window.MuBib */
(function (g) {
  'use strict';
  const D = g.MuDatos, Mu = g.Mu, EXT = /\.(mp3|m4a|m4b|aac|mp4|flac|ogg|oga|opus|wav|wave|webm|weba|mka|aif|aiff)$/i;
  const B = g.MuBib = { archivos: new Map(), urls: new Map(), ocupado: false, copias: new Set(), manejadores: new Set() };
  B.esAudio = (f) => EXT.test(f.name) || /^audio\//.test(f.type);
  const sinExt = (n) => n.replace(/\.[^.]+$/, '');
  function limpiarNombre(n) { return sinExt(n).replace(/^\s*\d{1,3}[\s._-]+(?=\D)/, '').replace(/[_]+/g, ' ').trim(); }
  async function miniatura(portada) {
    try {
      const blob = new Blob([portada.datos], { type: portada.mime || 'image/jpeg' }), bm = await createImageBitmap(blob), k = Math.min(1, 256 / Math.max(bm.width, bm.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bm.width * k)); c.height = Math.max(1, Math.round(bm.height * k)); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
      return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
    } catch (e) { return null; }
  }
  function duracionDe(file) {
    return new Promise((ok) => { const a = new Audio(), u = URL.createObjectURL(file); const fin = (d) => { URL.revokeObjectURL(u); a.src = ''; ok(isFinite(d) ? d : 0); }; a.preload = 'metadata'; a.onloadedmetadata = () => fin(a.duration); a.onerror = () => fin(0); setTimeout(() => fin(0), 6000); a.src = u; });
  }
  /* procesa una lista de archivos; items: File[] o {file, handle} */
  B.importar = async function (items, alProgreso) {
    const lista = items.map((i) => (i instanceof File ? { file: i } : i)), audio = lista.filter((i) => B.esAudio(i.file)), lrcs = lista.filter((i) => /\.lrc$/i.test(i.file.name));
    let nuevos = 0, existentes = 0, errores = 0, n = 0; B.ocupado = true;
    for (const it of audio) {
      const f = it.file, id = D.idArchivo(f); n++;
      if (alProgreso) alProgreso(n, audio.length, f.name);
      B.archivos.set(id, f);
      if (it.handle) { await D.loc.set('manejadores', { id, handle: it.handle }).catch(() => {}); B.manejadores.add(id); }
      if (D.pistas.has(id)) { existentes++; continue; }
      try {
        const et = await g.MuEtiq.leer(g.MuEtiq.deArchivo(f)).catch(() => ({ formato: 'desconocido', portada: null }));
        const p = { id, titulo: et.titulo || limpiarNombre(f.name), artista: et.artista || '', album: et.album || '', albumArtista: et.albumArtista || '', genero: et.genero || '', anio: et.anio || 0, pista: et.pista || 0, disco: et.disco || 0, dur: et.dur || 0, nombre: f.name, tam: f.size, fmt: et.formato || '', fav: false, val: 0, reproducciones: 0, ultima: 0, agregada: Date.now(), rgTag: et.rgTag == null ? null : et.rgTag };
        if (!p.dur) p.dur = await duracionDe(f);
        const clave = p.album ? D.clave(p) : p.id;
        if (et.portada && !(await D.loc.get('portadas', clave))) { const mb = await miniatura(et.portada); if (mb) await D.loc.set('portadas', { id: clave, blob: mb }); }
        if (et.letra) await D.loc.set('letras', { id, texto: et.letra });
        await D.guardarPista(p); nuevos++;
      } catch (e) { errores++; console.warn('importar', f.name, e); }
    }
    for (const l of lrcs) { // letras sueltas .lrc: emparejar por nombre base
      const base = Mu.buscaTexto(sinExt(l.file.name)); let hit = null;
      D.pistas.forEach((p) => { if (!hit && Mu.buscaTexto(sinExt(p.nombre)) === base) hit = p; });
      if (hit) { await D.loc.set('letras', { id: hit.id, texto: await l.file.text() }); Mu.emit('letra', hit.id); }
    }
    B.ocupado = false; Mu.emit('datos'); if (nuevos) { Mu.logro('primera_importacion'); if (D.pistas.size >= 50) Mu.logro('biblioteca_50'); }
    return { nuevos, existentes, errores, total: audio.length };
  };
  /* ---- selectores ---- */
  B.elegirArchivos = () => new Promise((ok) => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = 'audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.aac,.lrc'; i.onchange = () => ok(Array.from(i.files)); i.click(); });
  B.elegirCarpetaInput = () => new Promise((ok) => { const i = document.createElement('input'); i.type = 'file'; i.webkitdirectory = true; i.multiple = true; i.onchange = () => ok(Array.from(i.files)); i.click(); });
  async function recorrer(dir, salida, prof) {
    for await (const [nombre, h] of dir.entries()) {
      if (h.kind === 'file') { if (EXT.test(nombre) || /\.lrc$/i.test(nombre)) salida.push({ file: await h.getFile(), handle: h }); }
      else if (prof < 6) await recorrer(h, salida, prof + 1);
    }
  }
  B.hayCarpetaFSA = () => typeof g.showDirectoryPicker === 'function';
  B.elegirCarpeta = async function () {
    if (B.hayCarpetaFSA()) {
      const dir = await g.showDirectoryPicker({ mode: 'read' }), salida = []; await recorrer(dir, salida, 0);
      await D.loc.set('carpetas', { id: dir.name, handle: dir }).catch(() => {}); return salida;
    }
    return B.elegirCarpetaInput();
  };
  B.actualizarCarpetas = async function () {
    const cs = await D.loc.lista('carpetas'), salida = [];
    for (const c of cs) { try { if ((await c.handle.queryPermission({ mode: 'read' })) !== 'granted' && (await c.handle.requestPermission({ mode: 'read' })) !== 'granted') continue; await recorrer(c.handle, salida, 0); } catch (e) { console.warn(e); } }
    return salida;
  };
  /* arrastrar y soltar (carpetas incluidas) */
  function leerEntrada(en, salida) {
    return new Promise((ok) => {
      if (en.isFile) en.file((f) => { salida.push(f); ok(); }, () => ok());
      else if (en.isDirectory) { const r = en.createReader(), todos = []; const pasa = () => r.readEntries(async (es) => { if (!es.length) { for (const e of todos) await leerEntrada(e, salida); ok(); } else { todos.push(...es); pasa(); } }, () => ok()); pasa(); } else ok();
    });
  }
  B.deSoltar = async function (dt) {
    const salida = [], ents = [];
    if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) for (const it of dt.items) { const e = it.kind === 'file' && it.webkitGetAsEntry(); if (e) ents.push(e); }
    if (ents.length) for (const e of ents) await leerEntrada(e, salida); else salida.push(...Array.from(dt.files || []));
    return salida;
  };
  /* ---- acceso al archivo para reproducir ---- */
  B.archivo = async function (id, pedirPermiso) {
    if (B.archivos.has(id)) return B.archivos.get(id);
    const c = await D.loc.get('copias', id); if (c && c.blob) return c.blob;
    const m = await D.loc.get('manejadores', id);
    if (m && m.handle) { try { let perm = await m.handle.queryPermission({ mode: 'read' }); if (perm !== 'granted' && pedirPermiso !== false) perm = await m.handle.requestPermission({ mode: 'read' }); if (perm === 'granted') { const f = await m.handle.getFile(); B.archivos.set(id, f); return f; } } catch (e) { /* archivo movido */ } }
    return null;
  };
  B.disponible = (p) => !!p && (B.archivos.has(p.id) || B.copias.has(p.id) || B.manejadores.has(p.id));
  B.guardarCopia = async (id) => { const f = await B.archivo(id); if (!f) throw new Error('Selecciona de nuevo el archivo para guardar su copia.'); await D.loc.set('copias', { id, blob: f }); B.copias.add(id); Mu.logro('copia_offline'); };
  B.quitarCopia = async (id) => { await D.loc.borrar('copias', id); B.copias.delete(id); };
  B.urlDe = async function (id) { const f = await B.archivo(id); if (!f) return null; if (B.urls.has(id)) return B.urls.get(id); const u = URL.createObjectURL(f); B.urls.set(id, u); if (B.urls.size > 6) { const k = B.urls.keys().next().value; URL.revokeObjectURL(B.urls.get(k)); B.urls.delete(k); } return u; };
  /* ---- portadas ---- */
  const cp = new Map();
  B.portada = async function (p) {
    if (!p) return null; const clave = p.album ? D.clave(p) : p.id; if (cp.has(clave)) return cp.get(clave);
    const r = await D.loc.get('portadas', clave), u = r ? URL.createObjectURL(r.blob) : null; cp.set(clave, u); return u;
  };
  B.refrescarPortada = (p) => { const c = p.album ? D.clave(p) : p.id; cp.delete(c); };
  B.letra = async (id) => { const r = await D.loc.get('letras', id); return r ? r.texto : ''; };
  B.guardarLetra = async (id, texto) => { if (texto) await D.loc.set('letras', { id, texto }); else await D.loc.borrar('letras', id); Mu.emit('letra', id); };
  /* marca los que tienen manejador para saber si se podran reabrir */
  B.cargarManejadores = async () => { for (const r of await D.loc.lista('manejadores')) B.manejadores.add(r.id); for (const r of await D.loc.lista('copias')) B.copias.add(r.id); };
  /* ---- consultas ---- */
  B.todas = () => Array.from(D.pistas.values());
  B.ordenar = function (lista, modo) {
    const c = (a, b) => String(a || '').localeCompare(String(b || ''), 'es', { sensitivity: 'base', numeric: true });
    const f = { titulo: (a, b) => c(a.titulo, b.titulo), artista: (a, b) => c(a.artista, b.artista) || c(a.album, b.album) || (a.disco - b.disco) || (a.pista - b.pista), album: (a, b) => c(a.album, b.album) || (a.disco - b.disco) || (a.pista - b.pista) || c(a.titulo, b.titulo), reciente: (a, b) => (b.agregada || 0) - (a.agregada || 0), duracion: (a, b) => a.dur - b.dur, bpm: (a, b) => (a.bpm || 0) - (b.bpm || 0) }[modo] || ((a, b) => c(a.titulo, b.titulo));
    return lista.slice().sort(f);
  };
  B.buscar = function (lista, q) { q = Mu.buscaTexto(q).trim(); if (!q) return lista; const partes = q.split(/\s+/); return lista.filter((p) => { const s = Mu.buscaTexto([p.titulo, p.artista, p.album, p.genero, p.anio].join(' ')); return partes.every((x) => s.includes(x)); }); };
  B.grupos = function (lista, campo) { const m = new Map(); lista.forEach((p) => { const k = (campo === 'album' ? D.clave(p) : p[campo]) || (campo === 'genero' ? '(sin género)' : campo === 'album' ? '|(sin álbum)' : '(desconocido)'); if (!m.has(k)) m.set(k, []); m.get(k).push(p); }); return Array.from(m.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'es', { sensitivity: 'base' })); };
})(window);
