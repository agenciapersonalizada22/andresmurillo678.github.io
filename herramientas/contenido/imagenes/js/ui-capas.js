/* Paneles de capas, historial y tira de paginas. */
(function (IM) {
  var h = IM.h, E = IM.E, UI = IM.UI, Doc = IM.Doc, C = IM.UICapas = {};
  var TIPO = { imagen: 'imagen', texto: 'texto', forma: 'forma', grupo: 'agrupar', ajuste: 'ajustes', qr: 'qr' };
  function miniatura(c) {
    var cv = IM.lienzo(30, 30), x = cv.getContext('2d');
    if (c.tipo === 'imagen' && Doc.Pix.get(c.px)) { var s = Doc.Pix.proxy(c.px) || Doc.Pix.get(c.px), k = Math.min(30 / s.width, 30 / s.height); x.drawImage(s, 15 - s.width * k / 2, 15 - s.height * k / 2, s.width * k, s.height * k); cv.className = 'mini'; return cv; }
    return null;
  }
  C.renderCapas = function (cont) {
    var p = E.pagina(), arr = p.capas;
    cont.appendChild(h('div', { class: 'botonera sticky' }, UI.btn('Capa de pintura', 'pincel', function () { var c = E.capaVacia('Pintura'); E.agregar(c, { nombre: 'Nueva capa de pintura' }); }), UI.btn('Ajuste', 'ajustes', function () { E.agregar(Doc.capa('ajuste', { ops: [['brillo', { v: 10 }]], nombre: 'Ajuste de brillo', x: p.w / 2, y: p.h / 2, w: p.w, h: p.h }), { nombre: 'Añadir capa de ajuste', centrar: false }); }),
      UI.btn('', 'agrupar', E.agrupar, { titulo: 'Agrupar (Ctrl+G)' }), UI.btn('', 'duplicar', E.duplicarSel, { titulo: 'Duplicar' }), UI.btn('', 'borrar', E.eliminarSel, { titulo: 'Eliminar' })));
    var lista = h('ul', { class: 'capas', role: 'list' });
    if (!arr.length) lista.appendChild(h('li', { class: 'vacio' }, 'Sin capas. Añade texto, formas o imágenes.'));
    function fila(c, nivel, idx, top) {
      var sel = E.sel.indexOf(c.id) >= 0, mini = miniatura(c);
      var li = h('li', { class: 'capa' + (sel ? ' sel' : '') + (c.visible ? '' : ' oculta'), draggable: top, 'data-id': c.id, 'aria-current': sel ? 'true' : null, style: { paddingLeft: 6 + nivel * 16 + 'px' } },
        h('button', { type: 'button', class: 'ojo', title: c.visible ? 'Ocultar' : 'Mostrar', 'aria-label': (c.visible ? 'Ocultar ' : 'Mostrar ') + c.nombre, 'aria-pressed': c.visible ? 'true' : 'false', onclick: function (e) { e.stopPropagation(); c.visible = !c.visible; E.cambio(c.visible ? 'Mostrar capa' : 'Ocultar capa'); } }, IM.ic(c.visible ? 'ojo' : 'ojoNo', 16)),
        mini || h('span', { class: 'tipo' }, IM.ic(TIPO[c.tipo] || 'imagen', 16)),
        h('button', { type: 'button', class: 'nombre-capa', onclick: function (e) { if (e.shiftKey || e.ctrlKey || e.metaKey) E.seleccionar([c.id], true); else E.seleccionar([c.id]); }, ondblclick: function () { renombrar(c, li); } }, c.tipo === 'texto' ? (c.texto.split('\n')[0].slice(0, 28) || c.nombre) : c.nombre, c.mascara ? h('small', null, ' ▣') : null),
        h('button', { type: 'button', class: 'cand', title: c.bloqueada ? 'Desbloquear' : 'Bloquear', 'aria-label': (c.bloqueada ? 'Desbloquear ' : 'Bloquear ') + c.nombre, 'aria-pressed': c.bloqueada ? 'true' : 'false', onclick: function (e) { e.stopPropagation(); c.bloqueada = !c.bloqueada; E.cambio(c.bloqueada ? 'Bloquear capa' : 'Desbloquear capa'); } }, IM.ic(c.bloqueada ? 'candado' : 'abierto', 16)),
        top ? h('span', { class: 'mover' }, h('button', { type: 'button', title: 'Subir', 'aria-label': 'Subir ' + c.nombre, onclick: function (e) { e.stopPropagation(); E.seleccionar([c.id]); E.ordenar('arriba'); } }, '▲'), h('button', { type: 'button', title: 'Bajar', 'aria-label': 'Bajar ' + c.nombre, onclick: function (e) { e.stopPropagation(); E.seleccionar([c.id]); E.ordenar('abajo'); } }, '▼')) : null);
      if (top) {
        li.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; });
        li.addEventListener('dragover', function (e) { e.preventDefault(); li.classList.add('sobre'); }); li.addEventListener('dragleave', function () { li.classList.remove('sobre'); });
        li.addEventListener('drop', function (e) { e.preventDefault(); li.classList.remove('sobre'); var id = e.dataTransfer.getData('text/plain'); if (id && id !== c.id) { var ri = Doc.buscar(arr, id); E.moverCapaA(id, ri && ri.indice < idx ? idx : idx + 1); } });
      }
      lista.appendChild(li);
      if (c.tipo === 'grupo') c.hijos.slice().reverse().forEach(function (hh, j) { fila(hh, nivel + 1, j, false); });
    }
    arr.slice().reverse().forEach(function (c, i) { fila(c, 0, arr.length - 1 - i, true); });
    cont.appendChild(lista);
  };
  function renombrar(c, li) {
    var b = li.querySelector('.nombre-capa'), i = h('input', { type: 'text', class: 'renombrar', value: c.nombre, 'aria-label': 'Nombre de la capa' });
    b.replaceWith(i); i.focus(); i.select();
    function fin(ok) { if (ok && i.value.trim()) E.nombrePropio(c, i.value.trim()); else E.emit('sel'); }
    i.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); }); i.addEventListener('blur', function () { fin(true); });
  }
  C.renderHistorial = function (cont) {
    var H = E.historial, ul = h('ul', { class: 'historial', role: 'list' });
    ul.appendChild(h('li', { class: H.pos === 0 ? 'actual' : '' }, h('button', { type: 'button', onclick: function () { H.irA(0); } }, 'Estado original')));
    H.pila.forEach(function (c, i) { ul.appendChild(h('li', { class: i + 1 === H.pos ? 'actual' : i + 1 > H.pos ? 'futuro' : '' }, h('button', { type: 'button', 'aria-current': i + 1 === H.pos ? 'true' : null, onclick: function () { H.irA(i + 1); } }, (i + 1) + '. ' + c.nombre))); });
    cont.appendChild(h('div', { class: 'botonera' }, UI.btn('Deshacer', 'deshacer', E.deshacer, { deshabilitado: !H.puedeDeshacer() }), UI.btn('Rehacer', 'rehacer', E.rehacer, { deshabilitado: !H.puedeRehacer() })));
    cont.appendChild(h('p', { class: 'ayuda' }, H.pila.length + ' pasos · deshacer ilimitado; los trazos se guardan comprimidos.')); cont.appendChild(ul);
    var act = ul.querySelector('.actual'); if (act) act.scrollIntoView({ block: 'nearest' });
  };
  /* ---- tira de paginas ---- */
  var tira, pendiente = 0;
  C.iniciarPaginas = function () {
    tira = document.getElementById('paginas');
    var f = function () { clearTimeout(pendiente); pendiente = setTimeout(pintar, 500); };
    E.on('paginas', pintar); E.on('doc', f); E.on('proyecto', pintar);
  };
  function pintar() {
    if (!E.proy) return; tira.textContent = '';
    var pgs = E.proy.paginas;
    tira.appendChild(h('div', { class: 'tira-acc' }, UI.btn('', 'mas', function () { E.nuevaPagina(false); }, { titulo: 'Nueva página' }), UI.btn('', 'duplicar', function () { E.nuevaPagina(true); }, { titulo: 'Duplicar página' }),
      UI.btn('', 'borrar', E.borrarPagina, { titulo: 'Eliminar página', deshabilitado: pgs.length < 2 }), UI.btn('', null, function () { E.moverPagina(-1); }, { titulo: 'Mover página a la izquierda', deshabilitado: E.pi === 0 }), UI.btn('', null, function () { E.moverPagina(1); }, { titulo: 'Mover página a la derecha', deshabilitado: E.pi === pgs.length - 1 })));
    tira.lastChild.children[3].textContent = '←'; tira.lastChild.children[4].textContent = '→';
    var lista = h('div', { class: 'tira-lista', role: 'list' });
    pgs.forEach(function (pg, i) {
      var cv = IM.Vista.miniatura(pg, 90); cv.className = 'pg-mini'; cv.setAttribute('aria-hidden', 'true');
      lista.appendChild(h('button', { type: 'button', role: 'listitem', class: 'pg' + (i === E.pi ? ' act' : ''), 'aria-label': 'Página ' + (i + 1), 'aria-current': i === E.pi ? 'true' : null, onclick: function () { E.irPagina(i); } }, cv, h('span', null, String(i + 1))));
    });
    tira.appendChild(lista);
  }
})(window.IM);
