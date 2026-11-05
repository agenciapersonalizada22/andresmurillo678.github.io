/* Calendario mes / semana / dia con tareas (incluye ocurrencias futuras de repeticiones) y arrastre para reprogramar. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, R = G.Repeticion, T = G.Tareas, Mo = G.Modelo, Cfg = G.Config;
  var V = G.VistaCalendario = {}, S = function () { return G.App.store; };
  var modo = 'mes', ref = F.hoy(), cuerpo = null, tit = null;
  try { var g = JSON.parse(G.localStorage.getItem('notas_cal')); if (g) { modo = g.modo || modo; } } catch (e) {}
  V.titulo = function () { return 'Calendario'; };
  var COL = ['', 'var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)'];

  function inicioSem(f) { var i = Cfg.pref.inicioSemana, d = F.diaSemana(f); return F.sumDias(f, -((d - i + 7) % 7)); }
  function rango() {
    if (modo === 'dia') return [ref, ref];
    if (modo === 'semana') { var a = inicioSem(ref); return [a, F.sumDias(a, 6)]; }
    var p = F.partes(ref), a2 = inicioSem(F.fmt(p[0], p[1], 1)); return [a2, F.sumDias(a2, 41)];
  }
  function eventos(desde, hasta) {
    var m = {};
    function add(f, o) { (m[f] = m[f] || []).push(o); }
    S().lista('tareas', function (t) { return !t.papelera && t.fecha && !t.padre; }).forEach(function (t) {
      if (t.estado === 'hecha') { if (t.fecha >= desde && t.fecha <= hasta) add(t.fecha, { t: t, virtual: false }); return; }
      if (t.rep) R.enRango(Object.assign({}, t.rep, { cuenta: t.rep.cuenta }), t.fecha, desde, hasta, 200).forEach(function (f) { add(f, { t: t, virtual: f !== t.fecha }); });
      else if (t.fecha >= desde && t.fecha <= hasta) add(t.fecha, { t: t, virtual: false });
    });
    Object.keys(m).forEach(function (f) { m[f].sort(function (a, b) { return (a.t.hora || '99') < (b.t.hora || '99') ? -1 : 1; }); });
    return m;
  }
  function chip(ev) {
    var t = ev.t, b = h('button', { type: 'button', cls: 'ev' + (ev.virtual ? ' virtual' : '') + (t.estado === 'hecha' ? ' hecha' : ''), style: '--ec:' + (COL[t.prioridad] || 'var(--acento)'), 'data-id': t.id, 'data-f': 1, title: t.titulo + (ev.virtual ? ' (repetición)' : ''), on: { click: function () { G.App.abrir('tarea', t.id); } } }, [(t.hora ? t.hora + ' ' : '') + t.titulo]);
    if (!ev.virtual && t.estado !== 'hecha') UI.arrastrable(b, { selector: '[data-fecha]', datos: function () { return t.id; }, alSoltar: function (dest, id) { var p = { fecha: dest.dataset.fecha }; if (dest.dataset.hora != null) p.hora = dest.dataset.hora; T.editar(id, p); UI.anunciar('Reprogramada al ' + dest.dataset.fecha); } });
    return b;
  }
  function pintar() {
    cuerpo.textContent = ''; var r = rango(), ev = eventos(r[0], r[1]), hoy = F.hoy(), p = F.partes(ref);
    tit.textContent = modo === 'mes' ? F.nombreMes(p[1]).replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + p[0] : modo === 'semana' ? F.partes(r[0])[2] + ' ' + F.nombreMes(F.partes(r[0])[1], true) + ' – ' + F.partes(r[1])[2] + ' ' + F.nombreMes(F.partes(r[1])[1], true) + ' ' + F.partes(r[1])[0] : F.nombreDia(F.diaSemana(ref)).replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + p[2] + ' de ' + F.nombreMes(p[1]) + ' ' + p[0];
    var nombresDias = []; for (var i = 0; i < 7; i++) nombresDias.push(F.nombreDia((Cfg.pref.inicioSemana + i) % 7, true));
    if (modo === 'mes') {
      cuerpo.appendChild(h('div', { cls: 'cab-sem', 'aria-hidden': 'true' }, nombresDias.map(function (d) { return h('div', { txt: d }); })));
      var g = h('div', { cls: 'mes arrastre-cont', role: 'grid', 'aria-label': 'Mes' });
      for (var k = 0; k < 42; k++) {
        var f = F.sumDias(r[0], k), es = ev[f] || [], pf = F.partes(f);
        var c = h('div', { cls: 'dia-c' + (pf[1] !== p[1] ? ' otro' : '') + (f === hoy ? ' hoy' : ''), role: 'gridcell', 'data-fecha': f, 'data-drop': 1, 'aria-label': pf[2] + ' de ' + F.nombreMes(pf[1]) + ', ' + es.length + ' tareas' }, [
          h('button', { type: 'button', cls: 'num', 'data-f': 1, txt: pf[2], 'aria-label': 'Ver día ' + f, on: { click: (function (ff) { return function () { ref = ff; modo = 'dia'; guardar(); pintar(); }; })(f) } })]);
        es.slice(0, 3).forEach(function (e) { c.appendChild(chip(e)); });
        if (es.length > 3) c.appendChild(h('button', { type: 'button', cls: 'ev', 'data-f': 1, txt: '+' + (es.length - 3) + ' más', on: { click: (function (ff) { return function () { ref = ff; modo = 'dia'; guardar(); pintar(); }; })(f) } }));
        g.appendChild(c);
      }
      cuerpo.appendChild(g);
    } else if (modo === 'semana') {
      var cs = h('div', { cls: 'semana scroll-x arrastre-cont' });
      for (var d = 0; d < 7; d++) {
        var fd = F.sumDias(r[0], d), esd = ev[fd] || [], pd = F.partes(fd);
        var col = h('div', { cls: 'dia-c' + (fd === hoy ? ' hoy' : ''), 'data-fecha': fd, 'data-drop': 1 }, [h('button', { type: 'button', cls: 'num', style: 'align-self:flex-start;width:auto', 'data-f': 1, on: { click: (function (ff) { return function () { ref = ff; modo = 'dia'; guardar(); pintar(); }; })(fd) } }, [F.nombreDia(F.diaSemana(fd), true) + ' ' + pd[2]])]);
        esd.forEach(function (e) { col.appendChild(chip(e)); }); cs.appendChild(col);
      }
      cuerpo.appendChild(cs);
    } else {
      var es2 = ev[ref] || [], sinHora = es2.filter(function (e) { return !e.t.hora; }), add = h('input', { type: 'text', cls: 'campo', placeholder: 'Añadir tarea para este día… (lenguaje natural)', 'aria-label': 'Añadir tarea a este día', 'data-f': 1 });
      add.addEventListener('keydown', function (e) { if (e.key === 'Enter' && add.value.trim()) { G.VistaTareas.crearDesdeTexto(add.value, { fecha: ref }); add.value = ''; } });
      cuerpo.appendChild(h('div', { style: 'padding:8px 12px;background:var(--panel);border-bottom:1px solid var(--linea)' }, [add]));
      var todo = h('div', { cls: 'hora-f', 'data-f2': 1 }, [h('div', { cls: 'hh', txt: 'Todo el día' }), h('div', { cls: 'slot', 'data-fecha': ref, 'data-hora': '', 'data-drop': 1 }, sinHora.map(chip))]);
      var hs = h('div', { cls: 'horas arrastre-cont' }, [todo]);
      for (var hh = 0; hh < 24; hh++) {
        var hx = F.p2(hh) + ':00', tareas = es2.filter(function (e) { return e.t.hora && e.t.hora.slice(0, 2) === F.p2(hh); });
        hs.appendChild(h('div', { cls: 'hora-f' }, [h('div', { cls: 'hh', txt: hx }), h('div', { cls: 'slot', 'data-fecha': ref, 'data-hora': hx, 'data-drop': 1, 'aria-label': 'Hora ' + hx }, tareas.map(chip))]));
      }
      cuerpo.appendChild(hs); setTimeout(function () { var x = hs.querySelectorAll('.hora-f')[8]; if (x && !es2.length) hs.scrollTop = x.offsetTop - 60; else if (es2.length) { var pr = hs.querySelector('.ev'); if (pr) hs.scrollTop = Math.max(0, pr.closest('.hora-f').offsetTop - 80); } }, 10);
    }
  }
  function guardar() { try { G.localStorage.setItem('notas_cal', JSON.stringify({ modo: modo })); } catch (e) {} }
  function mover(dir) {
    var p = F.partes(ref);
    if (modo === 'mes') ref = F.sumMeses(ref, dir, 1); else ref = F.sumDias(ref, dir * (modo === 'semana' ? 7 : 1));
    pintar();
  }
  V.montar = function (c) {
    tit = h('h1', { 'aria-live': 'polite', style: 'flex:1;min-width:140px' });
    var seg = h('div', { cls: 'seg', role: 'group', 'aria-label': 'Escala' }, [['mes', 'Mes'], ['semana', 'Semana'], ['dia', 'Día']].map(function (x) { return h('button', { type: 'button', cls: 'btn', 'aria-pressed': String(modo === x[0]), txt: x[1], 'data-f': 1, on: { click: function () { modo = x[0]; guardar(); V.montar2(); } } }); }));
    V.montar2 = function () { c.textContent = ''; V.montar(c); };
    var barra = h('div', { cls: 'barra-v' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { G.App.alternarMenu(true); } } }, [UI.icono('menu')]),
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Anterior', 'data-f': 1, on: { click: function () { mover(-1); } } }, [UI.icono('back')]), tit,
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Siguiente', 'data-f': 1, on: { click: function () { mover(1); } } }, [h('span', { style: 'display:inline-block;transform:scaleX(-1)' }, [UI.icono('back')])]),
      h('button', { type: 'button', cls: 'btn', txt: 'Hoy', 'data-f': 1, on: { click: function () { ref = F.hoy(); pintar(); } } }), seg]);
    cuerpo = h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0' });
    c.appendChild(h('div', { cls: 'ancho' }, [barra, cuerpo])); pintar();
  };
  V.actualizar = function (evs) { if (!cuerpo || !cuerpo.isConnected) return G.App.render(true); if (evs.some(function (e) { return e.col === 'tareas'; })) { var f = doc.activeElement; if (f && cuerpo.contains(f) && f.tagName === 'INPUT' && f.value) return; pintar(); } };
  G.App.vistas.calendario = V;
})(window);
