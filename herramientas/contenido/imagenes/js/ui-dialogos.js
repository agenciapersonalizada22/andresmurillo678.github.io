/* Dialogos: proyectos, exportacion y ayuda. */
(function (IM) {
  var h = IM.h, E = IM.E, UI = IM.UI, D = IM.Dialogos = {};
  function abrir(titulo, hijos, o) {
    o = o || {}; var d = h('dialog', { class: 'dialogo' + (o.ancho ? ' ancho' : ''), 'aria-labelledby': 'dlg-t' }), cab = h('div', { class: 'dlg-cab' }, h('h2', { id: 'dlg-t' }, titulo), h('button', { type: 'button', class: 'btn', 'aria-label': 'Cerrar', onclick: function () { d.close(); } }, IM.ic('cerrar', 18)));
    d.appendChild(cab); var cu = h('div', { class: 'dlg-cuerpo' }, hijos); d.appendChild(cu);
    d.addEventListener('close', function () { d.remove(); if (o.alCerrar) o.alCerrar(); }); d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    document.getElementById('dialogos').appendChild(d); d.showModal(); return { d: d, cuerpo: cu };
  }
  D.abrir = abrir;
  function fecha(t) { return t ? new Date(t).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : ''; }
  D.proyectos = function () {
    var papelera = false, cont = h('div'), dlg = abrir('Proyectos', cont, { ancho: true });
    function pintar() {
      cont.textContent = '';
      var tabs = h('div', { class: 'pestanas' }, h('button', { type: 'button', role: 'tab', 'aria-selected': papelera ? 'false' : 'true', onclick: function () { papelera = false; pintar(); } }, 'Mis proyectos'), h('button', { type: 'button', role: 'tab', 'aria-selected': papelera ? 'true' : 'false', onclick: function () { papelera = true; pintar(); } }, 'Papelera'));
      cont.appendChild(tabs);
      if (!papelera) {
        var w = 1080, hh = 1080, rl = window.Redes.lista;
        cont.appendChild(h('div', { class: 'nuevo-proy' }, h('b', null, 'Nuevo proyecto'), UI.sel('Tamaño', rl.map(function (r) { return [r.id, r.nombre + ' · ' + r.w + '×' + r.h]; }), 'ig-cuadrado', function (v) { var r = window.Redes.buscar(v); w = r.w; hh = r.h; ww.value = w; hi.value = hh; }),
          h('div', { class: 'rejilla2' }, UI.fila('Ancho', null), UI.fila('Alto', null)), UI.btn('Crear proyecto', 'mas', function () { IM.Proy.nuevo(IM.clamp(+ww.value || 1080, 16, 4096), IM.clamp(+hi.value || 1080, 16, 4096), 'Sin título').then(function () { dlg.d.close(); }); }, { clase: 'primario' })));
        var ww = h('input', { type: 'number', class: 'num ancho', value: w, min: 16, max: 4096, 'aria-label': 'Ancho' }), hi = h('input', { type: 'number', class: 'num ancho', value: hh, min: 16, max: 4096, 'aria-label': 'Alto' });
        var fl = cont.querySelector('.nuevo-proy .rejilla2'); fl.textContent = ''; fl.appendChild(UI.fila('Ancho', ww)); fl.appendChild(UI.fila('Alto', hi));
      }
      var rej = h('div', { class: 'proy-rejilla' }); cont.appendChild(rej); rej.appendChild(h('p', { class: 'ayuda' }, 'Cargando…'));
      IM.Proy.guardar().then(function () { return IM.Proy.lista(papelera); }).then(function (l) {
        rej.textContent = '';
        if (!l.length) rej.appendChild(h('p', { class: 'ayuda' }, papelera ? 'La papelera está vacía. Los proyectos se eliminan definitivamente tras 30 días.' : 'Aún no hay proyectos guardados.'));
        if (papelera && l.length) rej.appendChild(UI.btn('Vaciar papelera', 'borrar', function () { if (IM.confirmar('¿Eliminar para siempre ' + l.length + ' proyectos?')) IM.Proy.vaciarPapelera().then(pintar); }));
        l.forEach(function (m) {
          var act = E.proy && E.proy.id === m.id;
          var card = h('div', { class: 'proy' + (act ? ' act' : '') }, h('img', { src: m.miniatura, alt: 'Vista previa de ' + m.nombre, class: 'proy-img' }), h('div', { class: 'proy-i' }, h('b', null, m.nombre, act ? h('small', null, ' (abierto)') : null), h('small', null, m.w + '×' + m.h + ' · ' + m.paginas + ' pág. · ' + fecha(m.modificado))));
          var acc = h('div', { class: 'botonera' });
          if (!papelera) {
            acc.appendChild(UI.btn('Abrir', 'carpeta', function () { IM.Proy.abrir(m.id).then(function () { dlg.d.close(); }, function (e) { IM.aviso(e.message, 'error'); }); }, { clase: 'primario' }));
            acc.appendChild(UI.btn('Duplicar', 'duplicar', function () { IM.Proy.duplicar(m.id).then(pintar); }));
            acc.appendChild(UI.btn('Renombrar', null, function () { var n = window.prompt('Nuevo nombre', m.nombre); if (n && n.trim()) IM.Proy.renombrar(m.id, n.trim()).then(function () { if (act) document.getElementById('nombreProyecto').value = n.trim(); pintar(); }); }));
            acc.appendChild(UI.btn('Papelera', 'borrar', function () { IM.Proy.aPapelera(m.id).then(function () { if (act) { return IM.Proy.nuevo(1280, 720, 'Sin título'); } }).then(pintar); }));
          } else {
            acc.appendChild(UI.btn('Restaurar', null, function () { IM.Proy.restaurar(m.id).then(pintar); }));
            acc.appendChild(UI.btn('Eliminar', 'borrar', function () { if (IM.confirmar('¿Eliminar «' + m.nombre + '» para siempre?')) IM.Proy.eliminar(m.id).then(pintar); }));
          }
          card.appendChild(acc); rej.appendChild(card);
        });
      });
    }
    pintar();
  };
  D.exportar = function () {
    var p = E.pagina(), o = { formato: 'png', escala: 1, calidad: 90, paginas: 'actual' }, tam = {}, cont = h('div'), info = h('p', { class: 'ayuda' }), prog = h('progress', { value: 0, max: 1, hidden: true });
    function dims() { var d = IM.Exportar.dimensiones(p, o.escala); info.textContent = (o.formato === 'svg' ? 'Vectorial (las imágenes y los efectos de ajuste se incrustan como píxeles o se omiten) · ' + p.w + '×' + p.h : 'Resultado: ' + d.w + '×' + d.h + ' px') + (d.limitada ? ' · la escala se limitó por el máximo del navegador' : ''); }
    var cal = UI.rango('Calidad', 30, 100, 1, 90, function (v) { o.calidad = v; }), calF = cal;
    function calVis() { calF.hidden = !(o.formato === 'jpg' || o.formato === 'webp'); }
    cont.appendChild(UI.sel('Formato', [['png', 'PNG (sin pérdida, transparencia)'], ['jpg', 'JPG (fotos, más ligero)'], ['webp', 'WebP (moderno, ligero)'], ['svg', 'SVG (capas vectoriales)']], o.formato, function (v) { o.formato = v; calVis(); dims(); }));
    cont.appendChild(UI.sel('Escala', [[1, '1× (tamaño original)'], [2, '2×'], [3, '3×'], [4, '4×']], 1, function (v) { o.escala = +v; dims(); }));
    cont.appendChild(cal); calVis(); cont.appendChild(info); dims();
    if (E.proy.paginas.length > 1) cont.appendChild(UI.sel('Páginas', [['actual', 'Solo la página actual'], ['todas', 'Todas (' + E.proy.paginas.length + ') en un ZIP']], 'actual', function (v) { o.paginas = v; }));
    var estado = h('p', { class: 'ayuda', role: 'status' });
    function ocupado(b) { Array.prototype.forEach.call(dlg.d.querySelectorAll('button'), function (x) { if (!x.classList.contains('cerrar-dlg')) x.disabled = b; }); prog.hidden = !b; }
    function progreso(i, n) { prog.max = n; prog.value = i; estado.textContent = 'Procesando ' + (i + 1) + ' de ' + n + '…'; }
    cont.appendChild(h('div', { class: 'botonera' }, UI.btn('Descargar', 'exportar', function () { ocupado(true); IM.Exportar.exportar(o, progreso).then(function (n) { estado.textContent = 'Listo: ' + n; IM.aviso('Exportado ' + n); }, function (e) { estado.textContent = e.message; IM.aviso(e.message, 'error'); }).then(function () { ocupado(false); }); }, { clase: 'primario' }),
      UI.btn('Copiar PNG', 'duplicar', function () { IM.Exportar.copiar().then(function () { IM.aviso('Imagen copiada'); }, function () { IM.aviso('Tu navegador no permite copiar imágenes', 'error'); }); })));
    cont.appendChild(prog); cont.appendChild(estado);
    var ls = window.Redes.lista.filter(function (r) { return r.id !== 'libre'; }), box = h('div', { class: 'lote' });
    ls.forEach(function (r) { var id = UI.id(); box.appendChild(h('label', { for: id, class: 'chk' }, h('input', { type: 'checkbox', id: id, onchange: function (e) { tam[r.id] = e.target.checked; } }), r.nombre + ' ', h('small', null, r.w + '×' + r.h))); });
    cont.appendChild(UI.seccion('Exportar lote (ZIP con todos los tamaños elegidos)', [box, h('div', { class: 'botonera' }, UI.btn('Todos', null, function () { box.querySelectorAll('input').forEach(function (i, k) { i.checked = true; tam[ls[k].id] = true; }); }), UI.btn('Ninguno', null, function () { box.querySelectorAll('input').forEach(function (i, k) { i.checked = false; tam[ls[k].id] = false; }); })),
      UI.btn('Descargar lote ZIP', 'exportar', function () {
        var ids = Object.keys(tam).filter(function (k) { return tam[k]; }); if (!ids.length) { IM.aviso('Elige al menos un tamaño'); return; }
        var f = o.formato === 'svg' ? 'png' : o.formato; ocupado(true);
        IM.Exportar.lote({ formato: f, calidad: o.calidad, tamanos: ids, paginas: o.paginas }, progreso).then(function (n) { estado.textContent = n + ' archivos en el ZIP'; IM.aviso('Lote exportado'); }, function (e) { estado.textContent = e.message; IM.aviso(e.message, 'error'); }).then(function () { ocupado(false); });
      }, { clase: 'primario' }), h('p', { class: 'ayuda' }, 'Cada página se escala para cubrir el tamaño y se centra. Revisa los resultados si las proporciones difieren mucho.')], false));
    var dlg = abrir('Exportar', cont);
  };
  D.ayuda = function () {
    var f = [['V / H / T / U', 'Seleccionar / Mano / Texto / Formas'], ['B / E / N', 'Pincel / Borrador / Lápiz'], ['I / G / W / C / P', 'Cuentagotas / Relleno / Varita / Recorte / Perspectiva'], ['[ ]', 'Tamaño del pincel'], ['X', 'Intercambiar colores'], ['Espacio + arrastrar', 'Mover la vista'],
      ['Rueda · Ctrl+rueda · pellizco', 'Zoom'], ['Ctrl+0 / Ctrl+1', 'Ajustar / 100%'], ['Ctrl+Z / Ctrl+Mayús+Z', 'Deshacer / Rehacer'], ['Ctrl+C / X / V', 'Copiar / Cortar / Pegar (también imágenes y texto)'], ['Ctrl+D', 'Duplicar'], ['Ctrl+G / Ctrl+Mayús+G', 'Agrupar / Desagrupar'],
      ['Ctrl+] / Ctrl+[', 'Subir / bajar capa (con Mayús: al frente / al fondo)'], ['Flechas (+Mayús)', 'Mover 1 px (10 px)'], ['Supr', 'Eliminar'], ['Intro', 'Editar texto seleccionado'], ['Mayús al arrastrar', 'Proporción / ángulo de 15°'], ['Alt al arrastrar', 'Sin imán / desde el centro'],
      ['Ctrl+S', 'Guardar ahora'], ['Ctrl+E', 'Exportar'], ['Ctrl+O', 'Proyectos'], ['Ctrl+R / Ctrl+\'', 'Reglas / Cuadrícula'], ['Esc', 'Deseleccionar o cancelar']];
    var t = h('table', { class: 'atajos' }, h('tbody', null, f.map(function (x) { return h('tr', null, h('th', { scope: 'row' }, x[0]), h('td', null, x[1])); })));
    abrir('Atajos y ayuda', [h('p', null, 'Todo se procesa en tu navegador: las imágenes nunca se suben a ningún servidor. Los proyectos se guardan automáticamente en este dispositivo (IndexedDB).'), t,
      h('h3', null, 'Mando Xbox'), h('p', null, 'Stick izquierdo: mover el cursor. A: clic / arrastrar. Stick derecho: mover la vista. LB/RB: zoom. LT/RT: tamaño del pincel. X: deshacer, Y: rehacer, B: cancelar. Cruceta: cambia de herramienta.'),
      h('h3', null, 'Límites'), h('p', null, 'Lienzo máximo 4096×4096. Las páginas con capas de ajuste se previsualizan en baja resolución (≤2000 px) mientras editas; la exportación usa la resolución completa. El texto curvado se exporta recto en SVG.')], { ancho: true });
  };
})(window.IM);
