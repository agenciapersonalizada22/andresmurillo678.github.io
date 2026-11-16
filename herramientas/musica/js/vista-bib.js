/* Reproductor > Biblioteca, Listas y Cola. window.MuApp (se amplia en otras vistas) */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, B = g.MuBib, Q = g.MuCola, M = g.MuMotor, U = g.MuUI, C = g.MuCalc, h = Mu.h, esc = Mu.esc, T = g.Tr;
  const A = g.MuApp = { sub: null };
  const S = { filtro: 'canciones', q: '', grupo: null, orden: null, limite: 120 };
  const FILTROS = [['canciones', 'Canciones'], ['artistas', 'Artistas'], ['albumes', 'Álbumes'], ['generos', 'Géneros'], ['favoritas', 'Favoritas'], ['recientes', 'Recientes'], ['mas', 'Más escuchadas']];
  A.sesionLista = () => { let l = B.todas(); if (S.filtro === 'favoritas') l = l.filter((p) => p.fav); else if (S.filtro === 'recientes') l = l.filter((p) => p.ultima).sort((a, b) => b.ultima - a.ultima).slice(0, 100); else if (S.filtro === 'mas') l = l.filter((p) => p.reproducciones).sort((a, b) => b.reproducciones - a.reproducciones).slice(0, 100); else l = B.ordenar(l, S.orden || D.ajuste('ordenBib')); return B.buscar(l, S.q); };
  async function importarYMostrar(items) {
    const prog = h('div', { cls: 'tr-nota', role: 'status', txt: 'Leyendo etiquetas…' }); const cab = A.raiz.querySelector('.mu-import'); cab.after(prog);
    try { const r = await B.importar(items, (n, t, nom) => { prog.textContent = 'Leyendo ' + n + ' / ' + t + ': ' + nom; }); prog.remove(); Mu.aviso(r.nuevos + ' pista(s) nueva(s)' + (r.existentes ? ', ' + r.existentes + ' ya estaban' : '') + (r.errores ? ', ' + r.errores + ' con error' : '') + '.', r.errores && !r.nuevos ? 'error' : ''); }
    catch (e) { prog.remove(); Mu.aviso('No se pudo importar: ' + e.message, 'error'); }
  }
  A.importar = importarYMostrar;
  A.pintarBiblioteca = function (raiz) {
    A.raiz = raiz; raiz.textContent = '';
    const imp = h('div', { cls: 'mu-import tr-panel' });
    imp.appendChild(h('div', { cls: 'tr-acciones' }, [
      h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-imp-arch', on: { click: async () => { const f = await B.elegirArchivos(); if (f.length) importarYMostrar(f); } } }),
      h('button', { type: 'button', cls: 'tr-btn', id: 'mu-imp-carp', on: { click: async () => { try { const f = await B.elegirCarpeta(); if (f.length) importarYMostrar(f); } catch (e) { if (e.name !== 'AbortError') Mu.aviso('No se pudo abrir la carpeta: ' + e.message, 'error'); } } } }),
    ])); imp.querySelector('#mu-imp-arch').innerHTML = Mu.ico('file') + '<span>Archivos</span>'; imp.querySelector('#mu-imp-carp').innerHTML = Mu.ico('folder') + '<span>Carpeta</span>';
    if (B.hayCarpetaFSA()) { const b = h('button', { type: 'button', cls: 'tr-btn', txt: 'Actualizar', on: { click: async () => { const f = await B.actualizarCarpetas(); if (!f.length) Mu.aviso('No hay carpetas guardadas o no diste permiso.'); else importarYMostrar(f); } } }); imp.firstChild.appendChild(b); }
    imp.appendChild(h('p', { cls: 'tr-ayuda', txt: 'También puedes arrastrar archivos o carpetas a esta página. Se guarda solo el índice (etiquetas y portadas pequeñas) en este dispositivo; tus archivos no se suben a ningún sitio.' }));
    raiz.appendChild(imp);
    const bus = h('div', { cls: 'mu-busca' }); const q = h('input', { type: 'search', id: 'mu-q', placeholder: 'Buscar título, artista, álbum, género…', 'aria-label': 'Buscar en la biblioteca', value: S.q, on: { input: () => { S.q = q.value; S.limite = 120; pintarLista(); } } });
    const ord = h('select', { 'aria-label': 'Ordenar por', on: { change: () => { S.orden = ord.value; D.ajuste('ordenBib', ord.value); pintarLista(); } } }); [['titulo', 'Título'], ['artista', 'Artista'], ['album', 'Álbum'], ['reciente', 'Añadidas'], ['duracion', 'Duración'], ['bpm', 'BPM']].forEach(([v, t]) => ord.appendChild(h('option', { value: v, txt: t, selected: v === (S.orden || D.ajuste('ordenBib')) })));
    bus.appendChild(q); bus.appendChild(ord); raiz.appendChild(bus);
    const chips = h('div', { cls: 'mu-chips', role: 'group', 'aria-label': 'Vista de la biblioteca' }); FILTROS.forEach(([id, t]) => chips.appendChild(h('button', { type: 'button', cls: 'mu-chip', 'data-f': id, 'aria-pressed': S.filtro === id, txt: t, on: { click: () => { S.filtro = id; S.grupo = null; S.limite = 120; chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === id)); pintarLista(); } } }))); raiz.appendChild(chips);
    raiz.appendChild(h('div', { id: 'mu-bib-lista' })); pintarLista();
  };
  function acciones(lista, titulo) {
    const d = h('div', { cls: 'tr-acciones mu-acc-lista' }); const ps = h('button', { type: 'button', cls: 'tr-btn tr-pri tr-chico', on: { click: () => lista.length && Q.poner(lista, 0) } }); ps.innerHTML = Mu.ico('play') + '<span>Reproducir</span>';
    const al = h('button', { type: 'button', cls: 'tr-btn tr-chico', on: { click: () => { if (!lista.length) return; const a = D.ajuste('aleatorio'); D.ajuste('aleatorio', true); Q.poner(C.aleatorio(lista, {}), 0, { sinMezclar: true }); Q.original = lista.slice(); Mu.emit('modo'); } } }); al.innerHTML = Mu.ico('shuffle') + '<span>Aleatorio</span>';
    const an = h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'A la cola', on: { click: () => lista.length && Q.anadir(lista, false) } }); const li = h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'A una lista…', on: { click: () => lista.length && U.elegirLista(lista.map((x) => x.id)) } });
    d.append(ps, al, an, li); return d;
  }
  function pintarLista() {
    const c = A.raiz.querySelector('#mu-bib-lista'); if (!c) return; c.textContent = '';
    const todas = B.todas();
    if (!todas.length) { c.appendChild(vacio()); return; }
    let lista = A.sesionLista(); const f = S.filtro;
    if ((f === 'artistas' || f === 'albumes' || f === 'generos') && !S.grupo) {
      const campo = f === 'artistas' ? 'artista' : f === 'albumes' ? 'album' : 'genero', gs = B.grupos(lista, campo);
      const ul = h('ul', { cls: 'mu-grupos' }); gs.forEach(([k, ps]) => { const nombre = campo === 'album' ? (k.split('|')[1] || '(sin álbum)') : k, art = campo === 'album' ? (k.split('|')[0] || '') : ''; const li = h('li'); const b = h('button', { type: 'button', cls: 'mu-grupo', 'data-k': k, on: { click: () => { S.grupo = { campo, k, nombre }; pintarLista(); } } }); b.innerHTML = '<span class="mu-port" style="background:' + Mu.colorDe(k) + '" data-pid="' + esc(ps[0].id) + '">' + esc((nombre || '?').charAt(0).toUpperCase()) + '</span><b>' + esc(nombre) + '</b><small>' + (art ? esc(art) + ' · ' : '') + ps.length + ' pista' + (ps.length === 1 ? '' : 's') + '</small>'; li.appendChild(b); ul.appendChild(li); });
      c.appendChild(h('p', { cls: 'tr-ayuda', txt: gs.length + ' ' + f })); c.appendChild(ul); cargarPortadas(ul); return;
    }
    if (S.grupo) { const gr = S.grupo; lista = lista.filter((p) => (gr.campo === 'album' ? D.clave(p) : p[gr.campo]) === gr.k || (!gr.k.replace('|', '') ? false : (gr.campo !== 'album' && !p[gr.campo] && gr.k.startsWith('(')))); if (gr.campo === 'album') lista = B.ordenar(lista, 'album'); const volver = h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: '← ' + f, on: { click: () => { S.grupo = null; pintarLista(); } } }); c.appendChild(h('div', { cls: 'tr-acciones' }, [volver, h('b', { txt: gr.nombre })])); }
    c.appendChild(h('p', { cls: 'tr-ayuda', role: 'status', txt: lista.length + ' pista' + (lista.length === 1 ? '' : 's') + (todas.length !== lista.length ? ' de ' + todas.length : '') }));
    if (!lista.length) { c.appendChild(h('div', { cls: 'tr-vacio', txt: S.q ? 'Sin resultados para esa búsqueda.' : f === 'favoritas' ? 'Aún no tienes favoritas: toca el corazón de una pista.' : 'Aquí aparecerán las pistas que escuches.' })); return; }
    c.appendChild(acciones(lista));
    const ul = h('ul', { cls: 'mu-pistas', 'aria-label': 'Pistas' }); const completa = lista; const vis = lista.slice(0, S.limite); ul.innerHTML = vis.map((p, i) => U.fila(p, { i })).join(''); U.enlazarLista(ul, () => completa); c.appendChild(ul);
    if (lista.length > vis.length) c.appendChild(h('button', { type: 'button', cls: 'tr-btn mu-ancho', txt: 'Mostrar más (' + (lista.length - vis.length) + ')', on: { click: () => { S.limite += 200; pintarLista(); } } }));
  }
  function cargarPortadas(ul) { const io = 'IntersectionObserver' in g ? new IntersectionObserver((es) => es.forEach(async (e) => { if (!e.isIntersecting) return; io.unobserve(e.target); const p = D.pistas.get(e.target.dataset.pid); const u = p && await B.portada(p); if (u) { e.target.style.backgroundImage = 'url(' + u + ')'; e.target.textContent = ''; } })) : null; if (io) ul.querySelectorAll('.mu-port').forEach((s) => io.observe(s)); }
  function vacio() {
    const d = h('div', { cls: 'tr-panel mu-vacio' }); d.innerHTML = '<h2>Tu biblioteca está vacía</h2><p>Aquí no hay catálogo ni streaming: esta herramienta reproduce <b>tu propia música</b> (MP3, M4A/AAC, FLAC, OGG/Opus, WAV…) y te da herramientas para crear la tuya. Todo ocurre en tu navegador.</p><p>Añade archivos o una carpeta con los botones de arriba, o arrástralos aquí. Si solo quieres probar, genera pistas de demostración creadas en este momento por el sintetizador.</p>';
    d.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-demo', txt: 'Generar 3 pistas de demostración', on: async function () { this.disabled = true; Mu.aviso('Generando pistas…'); const fs = []; for (let i = 0; i < 3; i++) { const d2 = g.MuDemo.generar(i); fs.push(new File([d2.bytes], d2.nombre, { type: 'audio/wav', lastModified: 1700000000000 + i })); await new Promise((r) => setTimeout(r, 20)); } importarYMostrar(fs); } })])); return d;
  }
  Mu.on('datos', () => { if (A.raiz && A.raiz.isConnected) pintarLista(); if (A.pintarListas) A.pintarListas(); });
  Mu.on('estadisticas', () => { if (A.raiz && A.raiz.isConnected && S.filtro !== 'canciones') pintarLista(); });
  Mu.on('pista', () => { refrescarActivos(); }); Mu.on('estado', () => refrescarActivos());
  function refrescarActivos() { document.querySelectorAll('.mu-fila[data-id]').forEach((li) => { const act = !!(M.estado.item && M.estado.item.id === li.dataset.id); li.classList.toggle('act', act); const ini = li.querySelector('.mu-ini'); if (!ini || ini.querySelector('svg')) return; const p = D.pistas.get(li.dataset.id); if (p) ini.innerHTML = act && M.estado.reproduciendo ? '<i class="mu-eq"><b></b><b></b><b></b></i>' : esc(U.inicial(p)); }); }

  /* ---- soltar archivos en toda la pagina ---- */
  let cont = 0; const veloDrop = h('div', { cls: 'mu-soltar', 'aria-hidden': 'true', txt: 'Suelta tus archivos o carpetas de música' }); document.addEventListener('DOMContentLoaded', () => document.body.appendChild(veloDrop)); if (document.body) document.body.appendChild(veloDrop);
  addEventListener('dragenter', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { cont++; veloDrop.classList.add('on'); } });
  addEventListener('dragleave', () => { cont = Math.max(0, cont - 1); if (!cont) veloDrop.classList.remove('on'); });
  addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); });
  addEventListener('drop', async (e) => { if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return; e.preventDefault(); cont = 0; veloDrop.classList.remove('on'); const fs = await B.deSoltar(e.dataTransfer); if (!fs.length) return; if (A.irA) A.irA('repro', 'biblioteca'); importarYMostrar(fs); });

  /* ---- Listas ---- */
  A.pintarListas = function () {
    const raiz = document.getElementById('mu-listas'); if (!raiz) return; raiz.textContent = '';
    const abierta = A.listaAbierta && D.listas.find((l) => l.id === A.listaAbierta);
    if (!abierta) {
      raiz.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-nueva-lista', txt: '+ Nueva lista', on: { click: () => U.preguntar('Nueva lista', 'Nombre de la lista', '', async (n) => { await D.nuevaLista(n, []); Mu.logro('primera_lista'); }) } })]));
      if (!D.listas.length) raiz.appendChild(h('div', { cls: 'tr-vacio', txt: 'Aún no tienes listas. Crea una o añade pistas desde el menú de cada canción.' }));
      const ul = h('ul', { cls: 'mu-grupos' }); D.listas.forEach((l) => { const b = h('button', { type: 'button', cls: 'mu-grupo', on: { click: () => { A.listaAbierta = l.id; A.pintarListas(); } } }); b.innerHTML = '<span class="mu-port" style="background:' + Mu.colorDe(l.nombre) + '">' + Mu.ico('list') + '</span><b>' + esc(l.nombre) + '</b><small>' + l.pistas.length + ' pistas</small>'; const li = h('li'); li.appendChild(b); ul.appendChild(li); }); raiz.appendChild(ul); return;
    }
    const l = abierta, ps = l.pistas.map((id) => D.pistas.get(id)).filter(Boolean);
    raiz.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: '← Listas', on: { click: () => { A.listaAbierta = null; A.pintarListas(); } } }), h('b', { txt: l.nombre }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Renombrar', on: { click: () => U.preguntar('Renombrar lista', 'Nombre', l.nombre, async (n) => { l.nombre = n; await D.guardarLista(l); }) } }), h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Borrar', on: { click: () => U.confirmar('¿Borrar la lista «' + l.nombre + '»? Las pistas no se borran.', async () => { A.listaAbierta = null; await D.borrarLista(l.id); }) } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Exportar M3U', on: { click: () => Mu.descarga('#EXTM3U\n' + ps.map((p) => '#EXTINF:' + Math.round(p.dur) + ',' + [p.artista, p.titulo].filter(Boolean).join(' - ') + '\n' + p.nombre).join('\n'), T.nombreArchivo(l.nombre) + '.m3u', 'audio/x-mpegurl') } })]));
    if (!ps.length) { raiz.appendChild(h('div', { cls: 'tr-vacio', txt: 'Lista vacía: añade pistas con «⋯ > Añadir a una lista».' })); return; }
    raiz.appendChild(acciones(ps)); const ul = h('ul', { cls: 'mu-pistas' });
    ul.innerHTML = ps.map((p, i) => U.fila(p, { i, extra: '<button type="button" class="mu-ib" data-act="up" aria-label="Subir">' + Mu.ico('up') + '</button>' })).join(''); raiz.appendChild(ul);
    U.enlazarLista(ul, () => ps, { quitarDeLista: null, extraAcc: async (a, li, p) => { const i = l.pistas.indexOf(p.id); if (a === 'up' && i > 0) { [l.pistas[i - 1], l.pistas[i]] = [l.pistas[i], l.pistas[i - 1]]; await D.guardarLista(l); } } });
    ul.addEventListener('contextmenu', () => {});
  };
  Mu.on('listas', () => A.pintarListas());

  /* ---- Cola ---- */
  A.pintarCola = function () {
    const raiz = document.getElementById('mu-cola'); if (!raiz) return; raiz.textContent = '';
    raiz.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Vaciar cola', on: { click: () => Q.vaciar() } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Guardar como lista', on: { click: () => U.elegirLista(Q.items.filter((x) => !x.remoto).map((x) => x.id)) } })]));
    if (!Q.items.length) { raiz.appendChild(h('div', { cls: 'tr-vacio', txt: 'La cola está vacía. Reproduce algo de la biblioteca.' })); return; }
    raiz.appendChild(h('p', { cls: 'tr-ayuda', txt: Q.items.length + ' en cola · suena la n.º ' + (Q.idx + 1) }));
    const ul = h('ul', { cls: 'mu-pistas' });
    ul.innerHTML = Q.items.map((p, i) => (p.remoto ? '<li class="mu-fila' + (i === Q.idx ? ' act' : '') + '" data-id="' + esc(p.id) + '" data-i="' + i + '"><button type="button" class="mu-fila-main" data-act="play"><span class="mu-ini" style="background:' + Mu.colorDe(p.titulo) + '">' + Mu.ico('radio') + '</span><span class="mu-t"><b>' + esc(p.titulo) + '</b><small>' + esc(p.estacion || 'En directo') + '</small></span></button>' : U.fila(p, { i }).replace('</li>', '')) + '<button type="button" class="mu-ib" data-act="subir" aria-label="Subir">' + Mu.ico('up') + '</button><button type="button" class="mu-ib" data-act="quitar" aria-label="Quitar de la cola">' + Mu.ico('close') + '</button></li>').join('');
    ul.addEventListener('click', (e) => { const b = e.target.closest('button[data-act]'), li = e.target.closest('li'); if (!b) return; const i = +li.dataset.i, a = b.dataset.act; if (a === 'quitar') Q.quitar(i); else if (a === 'subir') Q.mover(i, i - 1); else if (a === 'play') { if (i === Q.idx && M.estado.item) M.alternar(); else Q.reproducirIdx(i, 0); } else if (a === 'fav') { const p = Q.items[i]; if (p && !p.remoto) U.favorita(p).then(() => { b.classList.toggle('on', p.fav); }); } else if (a === 'menu') U.menuPista(Q.items[i]); });
    raiz.appendChild(ul);
  };
  Mu.on('cola', () => { if (document.getElementById('mu-cola') && !document.getElementById('mu-cola').closest('[hidden]')) A.pintarCola(); });
})(window);
