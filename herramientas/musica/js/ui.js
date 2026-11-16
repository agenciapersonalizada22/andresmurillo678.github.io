/* Componentes de interfaz compartidos: dialogos, filas de pista, menu contextual de pista, estrellas, selector de lista. window.MuUI */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, B = g.MuBib, Q = g.MuCola, M = g.MuMotor, h = Mu.h, esc = Mu.esc, U = g.MuUI = {};
  let dlg = null;
  U.dialogo = function (titulo, cuerpo, botones) {
    if (!dlg) { dlg = h('dialog', { cls: 'mu-dlg', 'aria-labelledby': 'mu-dlg-t' }); document.body.appendChild(dlg); dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); }
    dlg.textContent = ''; dlg.appendChild(h('h2', { id: 'mu-dlg-t', txt: titulo })); const c = h('div', { cls: 'mu-dlg-c' }); dlg.appendChild(c); if (typeof cuerpo === 'string') c.innerHTML = cuerpo; else if (cuerpo) c.appendChild(cuerpo);
    const pie = h('div', { cls: 'tr-acciones' }); (botones || [['Cerrar', null]]).forEach(([t, f, cls]) => pie.appendChild(h('button', { type: 'button', cls: 'tr-btn ' + (cls || ''), txt: t, on: { click: () => { const r = f ? f() : null; if (r && typeof r.then === 'function') { r.then((v) => { if (v !== false && dlg.open) dlg.close(); }, () => {}); return; } if (r !== false) dlg.close(); } } }))); dlg.appendChild(pie);
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', ''); const p = dlg.querySelector('input,select,button'); if (p) p.focus(); return dlg;
  };
  U.cerrar = () => { if (dlg && dlg.open) dlg.close(); };
  U.confirmar = (msg, ok, txt) => U.dialogo('Confirmar', '<p>' + esc(msg) + '</p>', [[txt || 'Aceptar', ok, 'tr-pri'], ['Cancelar', null]]);
  U.preguntar = (titulo, etiqueta, valor, ok) => { const i = h('input', { type: 'text', value: valor || '', 'aria-label': etiqueta }); U.dialogo(titulo, h('div', {}, [h('label', { txt: etiqueta }), i]), [['Aceptar', () => { if (!i.value.trim()) return false; ok(i.value.trim()); }, 'tr-pri'], ['Cancelar', null]]); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (i.value.trim()) { ok(i.value.trim()); dlg.close(); } } }); };
  U.estrellas = (val, fn) => { const d = h('div', { cls: 'mu-estrellas', role: 'radiogroup', 'aria-label': 'Valoración' }); for (let i = 1; i <= 5; i++) { const b = h('button', { type: 'button', cls: 'mu-ib' + (i <= val ? ' on' : ''), role: 'radio', 'aria-checked': i === val, 'aria-label': i + (i === 1 ? ' estrella' : ' estrellas'), on: { click: () => { const nv = i === val ? 0 : i; fn(nv); d.querySelectorAll('button').forEach((x, k) => { x.classList.toggle('on', k < nv); x.setAttribute('aria-checked', k + 1 === nv); }); val = nv; } } }); b.innerHTML = Mu.ico('star'); d.appendChild(b); } return d; };
  U.inicial = (p) => (p.titulo || '?').trim().charAt(0).toUpperCase();
  U.sub = (p) => [p.artista, p.album].filter(Boolean).join(' · ') || (p.nombre || '');
  /* fila de pista como HTML (delegacion de eventos en el contenedor) */
  U.fila = function (p, o) {
    o = o || {}; const act = M.estado.item && M.estado.item.id === p.id, disp = B.disponible(p);
    return '<li class="mu-fila' + (act ? ' act' : '') + (disp ? '' : ' sin') + '" data-id="' + esc(p.id) + '" data-i="' + (o.i == null ? '' : o.i) + '"><button type="button" class="mu-fila-main" data-act="play" aria-label="Reproducir ' + esc(p.titulo) + '"><span class="mu-ini" style="background:' + Mu.colorDe(p.album || p.artista || p.titulo) + '">' + (act && M.estado.reproduciendo ? '<i class="mu-eq"><b></b><b></b><b></b></i>' : esc(U.inicial(p))) + '</span><span class="mu-t"><b>' + esc(p.titulo) + '</b><small>' + esc(U.sub(p)) + (p.bpm ? ' · ' + Math.round(p.bpm) + ' BPM' : '') + (p.camelot ? ' · ' + esc(p.camelot) : '') + (disp ? '' : ' · ¡reimporta el archivo!') + '</small></span><span class="mu-d">' + Mu.tiempo(p.dur) + '</span></button>'
      + '<button type="button" class="mu-ib mu-fav' + (p.fav ? ' on' : '') + '" data-act="fav" aria-pressed="' + !!p.fav + '" aria-label="Favorita">' + Mu.ico('heart') + '</button>'
      + (o.extra || '') + '<button type="button" class="mu-ib" data-act="menu" aria-label="Más opciones de ' + esc(p.titulo) + '">' + Mu.ico('mas') + '</button></li>';
  };
  U.favorita = async (p) => { p.fav = !p.fav; await D.guardarPista(p); if (p.fav) Mu.logro('primera_favorita'); Mu.emit('estadisticas'); };
  /* enlaza acciones de lista: contenedor ul, funcion que da el arreglo de pistas visible, opciones */
  U.enlazarLista = function (ul, lista, o) {
    o = o || {};
    ul.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]'); const li = e.target.closest('li[data-id]'); if (!b || !li) return; const id = li.dataset.id, p = D.pistas.get(id), a = b.dataset.act, arr = lista();
      if (a === 'play') { if (o.alElegir) o.alElegir(p, arr); else Q.poner(arr, Math.max(0, arr.findIndex((x) => x.id === id))); }
      else if (a === 'fav') U.favorita(p).then(() => { b.classList.toggle('on', p.fav); b.setAttribute('aria-pressed', p.fav); }); else if (a === 'menu') U.menuPista(p, o);
      else if (o.extraAcc) o.extraAcc(a, li, p);
    });
  };
  U.elegirLista = function (ids, alTerminar) {
    const cont = h('div', {}); const pintar = () => { cont.textContent = ''; D.listas.forEach((l) => cont.appendChild(h('button', { type: 'button', cls: 'tr-btn mu-ancho', txt: l.nombre + ' (' + l.pistas.length + ')', on: { click: async () => { l.pistas.push(...ids.filter((x) => !l.pistas.includes(x))); await D.guardarLista(l); Mu.aviso('Añadido a «' + l.nombre + '».'); Mu.logro('primera_lista'); U.cerrar(); if (alTerminar) alTerminar(); } } }))); cont.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-pri mu-ancho', txt: '+ Nueva lista', on: { click: () => U.preguntar('Nueva lista', 'Nombre de la lista', '', async (n) => { const l = await D.nuevaLista(n, ids.slice()); Mu.aviso('Lista «' + l.nombre + '» creada.'); Mu.logro('primera_lista'); if (alTerminar) alTerminar(); }) } })); }; pintar();
    U.dialogo('Añadir a una lista', cont);
  };
  U.menuPista = function (p, o) {
    o = o || {}; const c = h('div', { cls: 'mu-menu' });
    const it = (t, f, ico) => { const b = h('button', { type: 'button', cls: 'tr-btn mu-ancho', on: { click: () => { U.cerrar(); f(); } } }); b.innerHTML = (ico ? Mu.ico(ico) : '') + '<span>' + esc(t) + '</span>'; c.appendChild(b); };
    c.appendChild(h('p', { cls: 'tr-ayuda', txt: U.sub(p) })); c.appendChild(U.estrellas(p.val || 0, async (v) => { p.val = v; await D.guardarPista(p); if (v) Mu.logro('primera_valoracion'); Mu.emit('estadisticas'); }));
    it('Reproducir a continuación', () => Q.anadir(p, true), 'next'); it('Añadir a la cola', () => Q.anadir(p, false), 'list'); it('Añadir a una lista…', () => U.elegirLista([p.id]), 'plus');
    it('Editar datos…', () => U.editar(p), 'edit'); it('Letra…', () => g.MuApp.letra(p), 'lyr');
    it(B.copias.has(p.id) ? 'Quitar copia offline' : 'Guardar copia offline', async () => { try { if (B.copias.has(p.id)) { await B.quitarCopia(p.id); Mu.aviso('Copia eliminada.'); } else { await B.guardarCopia(p.id); Mu.aviso('Copia guardada en este dispositivo.'); } Mu.emit('datos'); } catch (e) { Mu.aviso(e.message, 'error'); } }, 'down');
    it('Analizar volumen, BPM y tono', async () => { try { Mu.aviso('Analizando…'); const r = await M.analizar(p); Mu.aviso('BPM ' + Math.round(r.bpm) + ' · ' + (r.tono || '—') + ' · nivel ' + Math.round(r.p95Db) + ' dB'); Mu.logro('analisis'); Mu.emit('datos'); } catch (e) { Mu.aviso('No se pudo analizar: ' + e.message, 'error'); } }, 'wave');
    if (o.quitarDeLista) it('Quitar de esta lista', o.quitarDeLista, 'close');
    it('Quitar de la biblioteca', () => U.confirmar('¿Quitar «' + p.titulo + '» de la biblioteca? El archivo original no se borra.', async () => { await D.borrarPista(p.id); Mu.emit('datos'); }), 'trash');
    U.dialogo(p.titulo, c, [['Cerrar', null]]);
  };
  U.editar = function (p) {
    const campos = [['titulo', 'Título'], ['artista', 'Artista'], ['album', 'Álbum'], ['genero', 'Género'], ['anio', 'Año']], ins = {}, c = h('div', {});
    campos.forEach(([k, t]) => { ins[k] = h('input', { type: k === 'anio' ? 'number' : 'text', value: p[k] || '', id: 'ed-' + k }); c.appendChild(h('label', { for: 'ed-' + k, txt: t })); c.appendChild(ins[k]); }); c.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Solo cambia el índice de esta herramienta; el archivo original no se modifica.' }));
    U.dialogo('Editar datos', c, [['Guardar', async () => { campos.forEach(([k]) => { p[k] = k === 'anio' ? (+ins[k].value || 0) : ins[k].value.trim(); }); await D.guardarPista(p); Mu.emit('datos'); }, 'tr-pri'], ['Cancelar', null]]);
  };
})(window);
