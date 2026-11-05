(function () {
  var $ = U.$, esc = U.esc, A = App, F = Fechas, M = Modelo, V = $('#v-calendario');
  var MODOS = [['mes', 'Mes'], ['semana', 'Semana'], ['dia', 'Día'], ['lista', 'Lista']];
  function estCol(e) { return M.ESTADOS.filter(function (x) { return x[0] === e; })[0]; }
  function chip(o) {
    var p = o.pub, e = estCol(p.estado), r = M.REDES[p.red] || { nombre: p.red, color: '#888' };
    return '<button class="pub ' + p.estado + (o.recurrente ? ' rec' : '') + '" style="--c:' + r.color + '" draggable="true" data-id="' + p.id + '" data-f="' + o.fecha + '" title="' + esc(r.nombre + ' · ' + e[1] + ' · ' + o.hora + ' · ' + p.titulo) + '" aria-label="' + esc(p.titulo + ', ' + r.nombre + ', ' + e[1] + ', ' + A.fechaLegible(o.fecha) + ' ' + o.hora) + '"><span class="est" aria-hidden="true" style="color:' + e[2] + '">●</span><span>' + o.hora + ' ' + esc(p.titulo) + '</span></button>';
  }
  function rango() {
    var ref = A.cal.ref, m = A.cal.modo;
    if (m === 'mes') { var o = F.parse(ref), g = F.rejillaMes(o.y, o.m); return [g[0], g[41]]; }
    if (m === 'semana') { var s = F.inicioSemana(ref); return [s, F.sumarDias(s, 6)]; }
    if (m === 'dia') return [ref, ref];
    var o2 = F.parse(ref); return [o2.y + '-' + F.p2(o2.m) + '-01', o2.y + '-' + F.p2(o2.m) + '-' + F.p2(F.diasEnMes(o2.y, o2.m))];
  }
  function titulo() {
    var o = F.parse(A.cal.ref), m = A.cal.modo;
    if (m === 'mes' || m === 'lista') return F.MESES[o.m - 1] + ' ' + o.y;
    if (m === 'dia') return A.fechaLegible(A.cal.ref) + ' ' + o.y;
    var r = rango(); return A.fechaLegible(r[0]) + ' – ' + A.fechaLegible(r[1]);
  }
  function mover(delta) {
    var m = A.cal.modo, ref = A.cal.ref;
    if (m === 'mes' || m === 'lista') { var ym = F.sumarMeses(ref, delta); A.cal.ref = F.fmt({ y: ym.y, m: ym.m, d: Math.min(F.parse(ref).d, F.diasEnMes(ym.y, ym.m)) }); }
    else A.cal.ref = F.sumarDias(ref, delta * (m === 'semana' ? 7 : 1));
    render();
  }
  function nueva(f, hora) { Editor.abrir({ fecha: f, hora: hora || '09:00', zona: '' }, true); }
  function cabecera() {
    var fl = A.filtros;
    return '<div class="cab-cal"><button class="btn peq" data-nav="-1" aria-label="Anterior">‹</button><button class="btn peq" data-nav="0">Hoy</button><button class="btn peq" data-nav="1" aria-label="Siguiente">›</button><h2 aria-live="polite">' + esc(titulo()) + '</h2><span class="grow"></span>' +
      '<div class="seg" role="group" aria-label="Vista">' + MODOS.map(function (x) { return '<button data-modo="' + x[0] + '" aria-pressed="' + (A.cal.modo === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div><button class="btn pri peq" id="c-nueva">+ Nueva</button></div>' +
      '<div class="cab-cal filtros"><label class="solo-lectores" for="fl-red">Red</label><select id="fl-red"><option value="">Todas las redes</option>' + Object.keys(M.REDES).map(function (k) { return '<option value="' + k + '"' + (fl.red === k ? ' selected' : '') + '>' + M.REDES[k].nombre + '</option>'; }).join('') + '</select>' +
      '<label class="solo-lectores" for="fl-est">Estado</label><select id="fl-est"><option value="">Todos los estados</option>' + M.ESTADOS.map(function (e) { return '<option value="' + e[0] + '"' + (fl.estado === e[0] ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select>' +
      '<label class="solo-lectores" for="fl-camp">Campaña o serie</label><select id="fl-camp"><option value="">Todas las campañas y series</option>' + A.est.campanas.map(function (c) { return '<option value="' + c.id + '"' + (fl.campana === c.id ? ' selected' : '') + '>' + esc(c.nombre) + '</option>'; }).join('') + '</select></div>';
  }
  function mes(oc) {
    var o = F.parse(A.cal.ref), g = F.rejillaMes(o.y, o.m), hoy = F.hoy(), por = agrupar(oc), h = '<div class="mes" role="grid" aria-label="Calendario del mes">' + F.DIAS.map(function (d) { return '<div class="cab" role="columnheader">' + d + '</div>'; }).join('');
    g.forEach(function (f) {
      var l = por[f] || [], max = 3;
      h += '<div class="dia' + (F.parse(f).m !== o.m ? ' otro' : '') + (f === hoy ? ' hoy' : '') + '" data-f="' + f + '" role="gridcell"><button class="num" data-dia="' + f + '" aria-label="' + A.fechaLegible(f) + ', ' + l.length + ' publicaciones">' + F.parse(f).d + '</button><div class="lista-p">' + l.slice(0, max).map(chip).join('') + '</div>' + (l.length > max ? '<button class="mas" data-dia="' + f + '">+' + (l.length - max) + ' más</button>' : '') + '</div>';
    });
    return h + '</div>';
  }
  function agrupar(oc) { var p = {}; oc.forEach(function (o) { (p[o.fecha] = p[o.fecha] || []).push(o); }); return p; }
  function semana(oc) {
    var ini = F.inicioSemana(A.cal.ref), por = agrupar(oc), hoy = F.hoy(), h = '<div class="semana">';
    for (var i = 0; i < 7; i++) { var f = F.sumarDias(ini, i), l = por[f] || []; h += '<div class="dia' + (f === hoy ? ' hoy' : '') + '" data-f="' + f + '"><div class="encab"><button class="num" data-dia="' + f + '">' + F.parse(f).d + '</button>' + A.fechaLegible(f).split(' ')[0] + '<span class="grow"></span><button class="btn peq" data-add="' + f + '" aria-label="Nueva publicación el ' + A.fechaLegible(f) + '">+</button></div>' + l.map(chip).join('') + '</div>'; }
    return h + '</div>';
  }
  function dia(oc) {
    var f = A.cal.ref, h = '<div class="panel dia' + (f === F.hoy() ? ' hoy' : '') + '" data-f="' + f + '" style="min-height:200px"><h3>' + esc(A.fechaLegible(f)) + '</h3>' + (oc.map(function (o) { return '<div class="fila" style="margin:.2rem 0">' + chip(o) + '</div>'; }).join('') || '<p class="suave">Nada programado este día.</p>') + '<h3 style="margin-top:1rem">Horarios sugeridos (editables en Horarios)</h3><div class="fila">';
    Object.keys(M.REDES).forEach(function (r) { A.horarios(r).forEach(function (hh) { if (hh[0] === F.dow(f)) h += '<button class="sug" data-sug="' + r + '|' + hh[1] + '" style="border-left:4px solid ' + M.REDES[r].color + '">' + hh[1] + ' · ' + M.REDES[r].nombre + '</button>'; }); });
    return h + '</div></div>';
  }
  function lista(oc) {
    if (!oc.length) return '<div class="panel"><p class="suave">No hay publicaciones este mes con los filtros actuales.</p></div>';
    return '<div class="panel scroll-x"><table><thead><tr><th>Fecha</th><th>Hora</th><th>Red</th><th>Título</th><th>Estado</th><th>Campaña</th></tr></thead><tbody>' + oc.map(function (o) {
      var p = o.pub, c = A.camp(p.campana); return '<tr><td>' + A.fechaLegible(o.fecha) + '</td><td>' + o.hora + '</td><td><span class="chip" style="border-color:' + M.REDES[p.red].color + '">' + M.REDES[p.red].nombre + '</span></td><td><button class="btn peq" data-id="' + p.id + '" data-f="' + o.fecha + '">' + esc(p.titulo) + (o.recurrente ? ' ↻' : '') + '</button></td><td>' + estCol(p.estado)[1] + '</td><td>' + esc(c ? c.nombre : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function render() {
    var r = rango(), oc = M.ocurrencias(A.filtradas(), r[0], r[1]);
    V.innerHTML = cabecera() + (A.est.pubs.length === 0 && A.cal.modo !== 'lista' ? '<div class="aviso ok" style="margin-bottom:.8rem">Aún no hay publicaciones. Crea una con «+ Nueva», usa <b>Plantillas → plan de 30 días</b> o importa un CSV en <b>Datos</b>.</div>' : '') + { mes: mes, semana: semana, dia: dia, lista: lista }[A.cal.modo](oc);
  }
  function reprogramar(id, desde, hasta) {
    var p = A.pub(id); if (!p || desde === hasta) return; p.fecha = F.sumarDias(p.fecha, F.diasEntre(desde, hasta));
    A.guardar('pubs', p).then(function () { U.toast('Reprogramada al ' + A.fechaLegible(F.sumarDias(desde, F.diasEntre(desde, hasta)))); });
  }
  function iniciar() {
    V.addEventListener('click', function (e) {
      var t = e.target, n = t.closest('[data-nav]'), m = t.closest('[data-modo]'), c = t.closest('.pub,[data-id]'), d = t.closest('[data-dia]'), a = t.closest('[data-add]'), s = t.closest('[data-sug]');
      if (n) { if (n.dataset.nav === '0') { A.cal.ref = F.hoy(); render(); } else mover(+n.dataset.nav); }
      else if (m) { A.cal.modo = m.dataset.modo; A.est.ajustes.vista = A.cal.modo; A.guardarAjustes(); render(); }
      else if (t.id === 'c-nueva') nueva(A.cal.modo === 'mes' || A.cal.modo === 'lista' ? A.cal.ref : A.cal.ref);
      else if (c && c.dataset.id) Editor.abrir(A.pub(c.dataset.id));
      else if (d) { if (matchMedia('(max-width:899px)').matches || t.classList.contains('mas')) { A.cal.ref = d.dataset.dia; A.cal.modo = 'dia'; render(); } else nueva(d.dataset.dia); }
      else if (a) nueva(a.dataset.add);
      else if (s) { var x = s.dataset.sug.split('|'); Editor.abrir({ fecha: A.cal.ref, hora: x[1], red: x[0] }, true); }
    });
    V.addEventListener('change', function (e) {
      var i = e.target.id; if (i === 'fl-red') A.filtros.red = e.target.value; else if (i === 'fl-est') A.filtros.estado = e.target.value; else if (i === 'fl-camp') A.filtros.campana = e.target.value; else return; render();
    });
    V.addEventListener('dragstart', function (e) { var c = e.target.closest('.pub'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.id + '|' + c.dataset.f); e.dataTransfer.effectAllowed = 'move'; });
    V.addEventListener('dragover', function (e) { var d = e.target.closest('.dia'); if (d) { e.preventDefault(); U.$$('.dia.sobre', V).forEach(function (x) { if (x !== d) x.classList.remove('sobre'); }); d.classList.add('sobre'); } });
    V.addEventListener('dragleave', function (e) { var d = e.target.closest('.dia'); if (d && !d.contains(e.relatedTarget)) d.classList.remove('sobre'); });
    V.addEventListener('drop', function (e) { var d = e.target.closest('.dia'); if (!d) return; e.preventDefault(); var x = (e.dataTransfer.getData('text/plain') || '').split('|'); if (x[0]) reprogramar(x[0], x[1], d.dataset.f); });
    V.addEventListener('keydown', function (e) {
      var c = e.target.closest('.pub'); if (!c || !e.altKey) return; var dd = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (!dd) return;
      e.preventDefault(); var id = c.dataset.id, f = c.dataset.f; reprogramar(id, f, F.sumarDias(f, dd)); setTimeout(function () { var n = V.querySelector('.pub[data-id="' + id + '"][data-f="' + F.sumarDias(f, dd) + '"]'); if (n) n.focus(); }, 50);
    });
  }
  A.vistas.calendario = render; A.calendario = { iniciar: iniciar, mover: mover, nueva: function () { nueva(A.cal.ref); }, render: render, modo: function (m) { A.cal.modo = m; A.est.ajustes.vista = m; A.guardarAjustes(); render(); }, hoy: function () { A.cal.ref = F.hoy(); render(); } };
})();
