/* Marcas, plantillas propias e historial. */
(function () {
  var $ = U.$, esc = U.esc, A = App;
  var CAMPOS_MARCA = [['nombre', 'Nombre de la marca', 'text'], ['publico', 'Público', 'text'], ['estilo', 'Estilo', 'text'], ['tono', 'Tono de voz', 'text'], ['usar', 'Palabras a usar (separadas por comas)', 'text'], ['evitar', 'Palabras a evitar', 'text'], ['extra', 'Notas adicionales', 'area']];
  var selMarca = null, selPlant = null, comp = [];

  function campo(id, et, tipo, val) {
    return '<label for="' + id + '">' + et + '</label>' + (tipo === 'area' ? '<textarea id="' + id + '" rows="3">' + esc(val || '') + '</textarea>' : '<input type="text" id="' + id + '" value="' + esc(val || '') + '">');
  }
  function marcas() {
    var m = A.est.marcas.filter(function (x) { return x.id === selMarca; })[0] || {}, v = $('#v-marcas');
    v.innerHTML = '<div class="cols dos"><div class="panel"><h2>Perfiles de marca</h2><p class="suave">Guarda tu público, estilo y vocabulario. Se añaden al prompt de la IA y orientan el modo plantillas.</p><ul class="lista">' +
      (A.est.marcas.map(function (x) { return '<li><button class="btn grow" data-m="' + x.id + '"' + (x.id === selMarca ? ' aria-current="true"' : '') + '>' + esc(x.nombre) + '</button></li>'; }).join('') || '<li class="suave">Aún no tienes perfiles.</li>') +
      '</ul><button class="btn pri" id="m-nueva" style="margin-top:.7rem">+ Nuevo perfil</button></div><form class="panel" id="m-form"><h2>' + (m.id ? 'Editar' : 'Nuevo') + ' perfil</h2>' +
      CAMPOS_MARCA.map(function (c) { return campo('mf-' + c[0], c[1], c[2], m[c[0]]); }).join('') +
      '<div class="fila" style="margin-top:1rem"><button class="btn pri" type="submit">Guardar</button>' + (m.id ? '<button type="button" class="btn mal" id="m-borrar">Eliminar</button>' : '') + '</div></form></div>';
    v.onclick = function (e) {
      var b = e.target.closest('[data-m]'); if (b) { selMarca = b.dataset.m; marcas(); }
      if (e.target.id === 'm-nueva') { selMarca = null; marcas(); $('#mf-nombre').focus(); }
      if (e.target.id === 'm-borrar' && confirm('¿Eliminar este perfil?')) { A.borrar('marcas', selMarca).then(function () { selMarca = null; marcas(); }); }
    };
    $('#m-form').onsubmit = function (e) {
      e.preventDefault(); var o = Object.assign({}, m);
      CAMPOS_MARCA.forEach(function (c) { o[c[0]] = $('#mf-' + c[0]).value.trim(); });
      if (!o.nombre) return U.toast('Ponle un nombre al perfil');
      A.guardar('marcas', o).then(function () { selMarca = o.id; marcas(); U.toast('Perfil guardado'); });
    };
  }
  function plantillas() {
    var p = A.est.plantillas.filter(function (x) { return x.id === selPlant; })[0] || {}, v = $('#v-plantillas');
    v.innerHTML = '<div class="panel"><h2>Tipos de contenido</h2><div class="tarjeta-tipo">' + Plantillas.TIPOS.map(function (t) { return '<div class="item"><div class="grow"><b>' + esc(t.nombre) + '</b><span class="suave">' + t.grupo + '</span></div><button class="btn peq" data-t="' + t.id + '">Usar</button></div>'; }).join('') + '</div></div>' +
      '<div class="cols dos" style="margin-top:1rem"><div class="panel"><h2>Mis plantillas de prompt</h2><ul class="lista">' +
      (A.est.plantillas.map(function (x) { return '<li class="item"><div class="grow"><b>' + esc(x.nombre) + '</b><span class="suave">' + esc(Plantillas.tipo(x.tipo).nombre) + '</span></div><button class="btn peq" data-u="' + x.id + '">Usar</button><button class="btn peq" data-e="' + x.id + '">Editar</button></li>'; }).join('') || '<li class="suave">Guarda combinaciones de tipo, público, llamada a la acción e indicaciones para reutilizarlas.</li>') +
      '</ul><button class="btn pri" id="p-nueva" style="margin-top:.7rem">+ Nueva plantilla</button></div><form class="panel" id="p-form"><h2>' + (p.id ? 'Editar' : 'Nueva') + ' plantilla</h2>' +
      campo('pf-nombre', 'Nombre', 'text', p.nombre) + '<label for="pf-tipo">Tipo</label><select id="pf-tipo">' + Plantillas.TIPOS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === p.tipo ? ' selected' : '') + '>' + esc(t.nombre) + '</option>'; }).join('') + '</select>' +
      campo('pf-tema', 'Tema por defecto', 'text', p.tema) + campo('pf-publico', 'Público', 'text', p.publico) + campo('pf-cta', 'Llamada a la acción', 'text', p.cta) + campo('pf-extra', 'Indicaciones extra para la IA', 'area', p.extra) +
      '<label for="pf-marca">Marca</label><select id="pf-marca"><option value="">Ninguna</option>' + A.est.marcas.map(function (m) { return '<option value="' + m.id + '"' + (m.id === p.marca ? ' selected' : '') + '>' + esc(m.nombre) + '</option>'; }).join('') + '</select>' +
      '<div class="fila" style="margin-top:1rem"><button class="btn pri" type="submit">Guardar</button>' + (p.id ? '<button type="button" class="btn mal" id="p-borrar">Eliminar</button>' : '') + '</div></form></div>';
    v.onclick = function (e) {
      var t = e.target.closest('[data-t]'), u = e.target.closest('[data-u]'), ed = e.target.closest('[data-e]');
      if (t) A.usarPlantilla({ tipo: t.dataset.t });
      if (u) A.usarPlantilla(A.est.plantillas.filter(function (x) { return x.id === u.dataset.u; })[0]);
      if (ed) { selPlant = ed.dataset.e; plantillas(); }
      if (e.target.id === 'p-nueva') { selPlant = null; plantillas(); $('#pf-nombre').focus(); }
      if (e.target.id === 'p-borrar' && confirm('¿Eliminar esta plantilla?')) A.borrar('plantillas', selPlant).then(function () { selPlant = null; plantillas(); });
    };
    $('#p-form').onsubmit = function (e) {
      e.preventDefault(); var o = Object.assign({}, p);
      ['nombre', 'tema', 'publico', 'cta', 'extra'].forEach(function (k) { o[k] = $('#pf-' + k).value.trim(); }); o.tipo = $('#pf-tipo').value; o.marca = $('#pf-marca').value;
      if (!o.nombre) return U.toast('Ponle un nombre');
      A.guardar('plantillas', o).then(function () { selPlant = o.id; plantillas(); U.toast('Plantilla guardada'); });
    };
  }
  function historial() {
    var v = $('#v-historial'), q = (v.dataset.q || '').toLowerCase();
    var lista = A.est.historial.filter(function (h) { return !q || (h.texto + ' ' + (h.campos && (h.campos.tema || h.campos.texto) || '')).toLowerCase().indexOf(q) >= 0; });
    var tot = A.est.historial.reduce(function (a, h) { return a + (h.costo || 0); }, 0);
    v.innerHTML = '<div class="panel"><div class="fila"><h2 class="grow">Historial (' + A.est.historial.length + ')</h2><label for="h-q" class="solo-lectores">Buscar</label><input type="search" id="h-q" placeholder="Buscar…" value="' + esc(v.dataset.q || '') + '" style="width:200px"><button class="btn" id="h-comp"' + (comp.length === 2 ? '' : ' disabled') + '>Comparar (' + comp.length + '/2)</button><button class="btn mal" id="h-todo">Borrar todo</button></div>' +
      '<p class="suave">Costo acumulado aproximado (según tu tarifa): ' + U.usd(tot || null) + '</p><ul class="lista">' +
      (lista.map(function (h) {
        var t = Plantillas.tipo(h.tipo), u = h.uso ? h.uso.entrada + '→' + h.uso.salida + ' tok' + (h.uso.estimado ? ' (est.)' : '') : '';
        return '<li class="item"><input type="checkbox" data-c="' + h.id + '" aria-label="Seleccionar para comparar"' + (comp.indexOf(h.id) >= 0 ? ' checked' : '') + '><div class="grow"><b>' + esc(t ? t.nombre : h.tipo) + ' <span class="suave">· ' + U.fmtFecha(h.fecha) + '</span></b><span class="suave">' + esc((h.texto || '').slice(0, 110).replace(/\n/g, ' ')) + '</span><span class="suave">' + (h.modo === 'ia' ? esc(h.proveedor + ' ' + h.modelo) + ' · ' + u + (h.costo ? ' · ' + U.usd(h.costo) : '') : h.modo === 'reglas' ? 'Plantillas (sin IA)' : 'Manual') + '</span></div><button class="btn peq" data-a="' + h.id + '">Abrir</button><button class="btn peq mal" data-d="' + h.id + '" aria-label="Borrar">✕</button></li>';
      }).join('') || '<li class="suave">Sin generaciones todavía.</li>') + '</ul></div>';
    var qi = $('#h-q'); qi.oninput = function () { v.dataset.q = qi.value; historial(); var n = $('#h-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
    v.onclick = function (e) {
      var a = e.target.closest('[data-a]'), d = e.target.closest('[data-d]');
      if (a) A.abrirEntrada(A.est.historial.filter(function (h) { return h.id === a.dataset.a; })[0]);
      if (d) A.borrar('historial', d.dataset.d).then(historial);
      if (e.target.id === 'h-todo' && confirm('¿Borrar todo el historial?')) Promise.all(A.est.historial.map(function (h) { return A.alm.borrar('historial', h.id); })).then(function () { A.est.historial = []; comp = []; historial(); });
      if (e.target.id === 'h-comp') { var x = comp.map(function (id) { return A.est.historial.filter(function (h) { return h.id === id; })[0]; }); A.mostrarDiff(x[0].texto, x[1].texto, 'Comparar versiones (antigua → reciente)'); }
    };
    v.onchange = function (e) {
      var c = e.target.dataset.c; if (!c) return;
      comp = comp.filter(function (x) { return x !== c; }); if (e.target.checked) comp.push(c);
      if (comp.length > 2) comp.shift();
      comp.sort(function (a, b) { var fa = A.est.historial.filter(function (h) { return h.id === a; })[0], fb = A.est.historial.filter(function (h) { return h.id === b; })[0]; return fa.fecha - fb.fecha; });
      historial();
    };
  }
  A.vistas = A.vistas || {}; A.vistas.marcas = marcas; A.vistas.plantillas = plantillas; A.vistas.historial = historial;
})();
