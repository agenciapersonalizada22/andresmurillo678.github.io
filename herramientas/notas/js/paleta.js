/* Paleta de comandos (Ctrl+K): ir a vistas, crear tareas/notas con lenguaje natural, buscar y acciones. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, NL = G.NL, U = G.Util, Mo = G.Modelo;
  var P = G.Paleta = {}, abierta = null;

  function comandos() {
    var App = G.App, S = App.store, ir = function (v, f) { return function () { App.ir(v, f || ''); }; };
    var c = [
      ['Ir a Hoy', 'star', ir('tareas', 'hoy'), 'g h'], ['Ir a Bandeja', 'inbox', ir('tareas', 'bandeja'), 'g i'], ['Ir a Próximos 7 días', 'cal', ir('tareas', 'proximos'), 'g p'], ['Ir a Con prioridad', 'flag', ir('tareas', 'prioridad')], ['Ir a Completadas', 'check', ir('tareas', 'completadas')],
      ['Ir a Notas', 'note', ir('notas', 'todas'), 'g n'], ['Ir a Tablero Kanban', 'board', ir('tablero'), 'g k'], ['Ir a Calendario', 'cal', ir('calendario'), 'g c'], ['Ir a Línea de tiempo', 'gantt', ir('linea'), 'g l'],
      ['Ir a Hábitos', 'habit', ir('habitos'), 'g b'], ['Ir a Enfoque (Pomodoro)', 'timer', ir('enfoque'), 'g e'], ['Ir a Estadísticas', 'chart', ir('stats'), 'g s'], ['Ir a Ajustes y datos', 'gear', ir('ajustes')],
      ['Nueva tarea', 'plus', function () { G.Captura.abrir('tarea'); }, 't'], ['Nueva nota', 'note', function () { App.nuevaNota(); }, 'n'], ['Nota rápida (con dictado)', 'mic', function () { G.Captura.abrir('nota'); }],
      ['Nueva lista…', 'plus', function () { G.VistaTareas.nuevaLista(); }], ['Nueva libreta…', 'folder', function () { G.VistaNotas.nuevaLibreta(''); }]
    ];
    Mo.plantillas.slice(1).forEach(function (p) { c.push(['Nueva nota: ' + p.nombre, 'copy', function () { App.nuevaNota(Mo.aplicarPlantilla(p, F.hoy())); }]); });
    c.push(['Cambiar tema (claro/oscuro/auto)', 'sun', function () { var o = ['auto', 'claro', 'oscuro'], i = (o.indexOf(G.Config.disp.tema) + 1) % 3; G.Config.setDisp('tema', o[i]); UI.aviso('Tema: ' + o[i]); }],
      ['Texto grande: alternar', 'edit', function () { G.Config.setDisp('textoGrande', !G.Config.disp.textoGrande); }],
      ['Empezar pomodoro', 'timer', function () { App.ir('enfoque'); G.VistaEnfoque.iniciar('trabajo', '', 1); }],
      ['Exportar copia JSON', 'download', function () { UI.descargar('notas-' + F.hoy() + '.json', G.IO.exportarJSON(S), 'application/json'); }],
      ['Exportar Markdown (ZIP)', 'download', function () { UI.descargar('notas-' + F.hoy() + '.zip', new Blob([G.IO.exportarZip(S)], { type: 'application/zip' })); }],
      ['Importar archivo…', 'upload', function () { App.ir('ajustes'); }],
      ['Colaborar en tiempo real…', 'share', function () { G.Colab.compartir(); }],
      ['Mostrar atajos de teclado y mando', 'gear', function () { App.ir('ajustes'); }],
      ['Mostrar u ocultar menú lateral', 'menu', function () { App.alternarMenu(); }]);
    return c;
  }
  P.abrir = function (texto) {
    if (abierta) { abierta.cerrar(); }
    var App = G.App, S = App.store, items = [], sel = 0;
    var inp = h('input', { type: 'text', cls: 'pal-in', placeholder: 'Escribe un comando, busca, o crea («llamar a Ana mañana 5pm»)…', 'aria-label': 'Paleta de comandos', autocomplete: 'off', 'data-ini': 1, 'data-f': 1, role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'pal-lista' });
    var ul = h('ul', { cls: 'pal-lista', id: 'pal-lista', role: 'listbox' });
    var d = UI.dialogo({ titulo: 'Paleta', cls: 'paleta', ancho: 640, cuerpo: h('div', {}, [inp, ul]), alCerrar: function () { abierta = null; } });
    d.fondo.classList.add('alto'); d.el.querySelector('.dlg-cab').style.display = 'none'; d.cuerpo.style.padding = '0';
    abierta = d;
    function construir() {
      var q = inp.value.trim(), nq = U.norm(q); items = []; ul.textContent = '';
      if (q) {
        var p = NL.parsear(q), partes = []; if (p.fecha) partes.push(F.etiqueta(p.fecha)); if (p.hora) partes.push(p.hora); if (p.rep) partes.push('se repite'); if (p.prioridad) partes.push(Mo.PRIORIDADES[p.prioridad].nombre); p.etiquetas.forEach(function (e) { partes.push('#' + e); });
        items.push({ sec: 'Crear', txt: 'Crear tarea: «' + (p.titulo || q) + '»', hint: partes.join(' · '), ic: 'task', fn: function () { var t = G.VistaTareas.crearDesdeTexto(q, {}); if (t) UI.aviso('Tarea añadida: ' + t.titulo, { tipo: 'ok' }); } });
        items.push({ txt: 'Crear nota: «' + q.slice(0, 50) + '»', ic: 'note', fn: function () { var n = S.poner('notas', Mo.nota({ titulo: q.slice(0, 80) })); App.titulos = null; App.ir('notas', 'todas', { tipo: 'nota', id: n.id }); } });
      }
      var cm = comandos().filter(function (c) { return !nq || U.norm(c[0]).indexOf(nq) >= 0; }).slice(0, q ? 6 : 40);
      cm.forEach(function (c, i) { items.push({ sec: i === 0 ? 'Comandos' : null, txt: c[0], hint: c[3] || '', ic: c[1], fn: c[2] }); });
      if (q.length >= 1) {
        var r = G.Busqueda.buscar(S, q, { hoy: F.hoy(), nombreContenedor: App.nombreContenedor }).slice(0, 8);
        r.forEach(function (x, i) { items.push({ sec: i === 0 ? 'Resultados' : null, txt: x.rec.titulo || '(sin título)', hint: x.tipo === 'nota' ? 'nota' : 'tarea' + (x.rec.fecha ? ' · ' + x.rec.fecha : ''), ic: x.tipo === 'nota' ? 'note' : 'task', fn: function () { App.abrir(x.tipo, x.rec.id); } }); });
      }
      if (!items.length) ul.appendChild(h('li', { cls: 'vacio', role: 'presentation', txt: 'Sin coincidencias' }));
      sel = Math.min(sel, items.length - 1); if (sel < 0) sel = 0;
      items.forEach(function (it, i) {
        if (it.sec) ul.appendChild(h('li', { cls: 'pal-sec', role: 'presentation', txt: it.sec }));
        ul.appendChild(h('li', { role: 'presentation' }, [h('button', { type: 'button', cls: 'pal-i', id: 'pi' + i, role: 'option', 'aria-selected': String(i === sel), 'data-f': 1, on: { click: function () { ejecutar(i); }, mousemove: function () { if (sel !== i) { sel = i; marcar(); } } } }, [UI.icono(it.ic || 'more'), h('span', { txt: it.txt, style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }), it.hint ? h('small', { txt: it.hint }) : null])]));
      });
      inp.setAttribute('aria-activedescendant', items.length ? 'pi' + sel : '');
    }
    function marcar() { ul.querySelectorAll('.pal-i').forEach(function (b, i) { b.setAttribute('aria-selected', String(i === sel)); }); inp.setAttribute('aria-activedescendant', 'pi' + sel); var b = ul.querySelectorAll('.pal-i')[sel]; if (b) b.scrollIntoView({ block: 'nearest' }); }
    function ejecutar(i) { var it = items[i]; if (!it) return; d.cerrar(); setTimeout(function () { it.fn(); }, 10); }
    inp.addEventListener('input', function () { sel = 0; construir(); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); marcar(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); marcar(); }
      else if (e.key === 'Enter') { e.preventDefault(); ejecutar(sel); }
    });
    if (texto) inp.value = texto; construir();
  };
})(window);
