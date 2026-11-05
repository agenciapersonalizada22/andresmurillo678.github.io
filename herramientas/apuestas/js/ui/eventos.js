/* Explorador de eventos y detalle de cuotas por casa. */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, h = U.h, C = A.cuotas;
  var V = A.vistas = A.vistas || {};
  var F = { deporte: '', liga: '', fecha: 'todas', q: '', orden: 'inicio', verProbs: false };

  function listar() {
    var ahora = Date.now();
    return A.alertas.todosEventos(S.datos).filter(function (x) {
      var t = Date.parse(x.ev.inicio);
      if (t < ahora - 2 * 3600000) return false;
      if (F.deporte && U.grupoDeporte(x.deporte.clave) !== F.deporte) return false;
      if (F.liga && x.deporte.nombre !== F.liga) return false;
      var d = new Date(t), hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      var dias = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - hoy) / 86400000);
      if (F.fecha === 'hoy' && dias !== 0) return false;
      if (F.fecha === 'manana' && dias !== 1) return false;
      if (F.fecha === 'semana' && dias > 6) return false;
      if (F.q && (x.ev.local + ' ' + x.ev.visitante + ' ' + x.deporte.nombre).toLowerCase().indexOf(F.q.toLowerCase()) < 0) return false;
      return true;
    });
  }
  function margenMejor(m) { var b = C.mejores(m); return C.margen(m.sels.map(function (s) { return b[s].cuota; })); }

  function tarjeta(x) {
    var ev = x.ev, ms = C.mercadosDeEvento(ev), h2h = ms.filter(function (m) { return m.clave === 'h2h'; })[0];
    var arb = C.arbitraje(ev, 100).length, val = C.valor(ev, { referencia: S.cfg.referencia, metodo: S.cfg.metodo, minEdge: S.cfg.minEdge / 100 }).length;
    var celdas = h2h ? h2h.sels.map(function (s) {
      var b = C.mejores(h2h)[s];
      return h('div', { class: 'cel' }, h('small', { class: 'muted' }, s === 'local' ? '1' : s === 'empate' ? 'X' : '2'), h('b', { class: 'mejor' }, U.cuota(b.cuota)), h('small', { class: 'muted' }, b.casa));
    }) : [h('span', { class: 'muted' }, 'Sin mercado ganador')];
    return h('button', { type: 'button', class: 'card evento', onclick: function () { detalle(x); }, 'aria-label': 'Ver cuotas de ' + ev.local + ' contra ' + ev.visitante },
      h('div', { class: 'ev-cab' }, h('small', { class: 'muted' }, x.deporte.nombre), h('small', { class: 'muted' }, U.fechaHora(ev.inicio))),
      h('div', { class: 'ev-eq' }, h('b', null, ev.local), h('span', { class: 'muted' }, ' vs '), h('b', null, ev.visitante)),
      h('div', { class: 'ev-cuotas' }, celdas),
      h('div', { class: 'ev-pie' }, h('small', { class: 'muted' }, (ev.casas || []).length + ' casas'),
        arb ? h('span', { class: 'pill ok' }, 'Surebet') : null, val ? h('span', { class: 'pill info' }, 'Valor ×' + val) : null));
  }

  function detalle(x) {
    var ev = x.ev, ms = C.mercadosDeEvento(ev), cont = h('div', { class: 'detalle' });
    function pintar() {
      var ctl = h('div', { class: 'fila ctl' },
        U.campo('Método sin margen', U.selector([{ v: 'proporcional', t: 'Proporcional' }, { v: 'shin', t: 'Shin' }, { v: 'potencia', t: 'Potencia' }], S.cfg.metodo, function (v) { A.estado.guardarCfg({ metodo: v }); pintar(); })),
        U.campo('Referencia', U.selector([{ v: '', t: 'Consenso de todas' }].concat(casasDe(ev).map(function (c) { return { v: c, t: c }; })), S.cfg.referencia, function (v) { A.estado.guardarCfg({ referencia: v }); pintar(); })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: F.verProbs, onchange: function (e) { F.verProbs = e.target.checked; pintar(); } }), ' Ver prob. justa por casa'));
      U.montar(cont, ctl, ms.map(function (m) { return mercado(ev, m, x); }), U.aviso('Informativo y educativo. La probabilidad sin margen es una estimación; no garantiza resultados. Las apuestas implican riesgo de pérdida.', 'info'));
    }
    pintar();
    U.modal({ titulo: ev.local + ' vs ' + ev.visitante, contenido: [h('p', { class: 'muted' }, x.deporte.nombre + ' · ' + U.fechaHora(ev.inicio)), cont], clase: 'ancho' });
  }
  function casasDe(ev) { return (ev.casas || []).map(function (c) { return c.casa; }); }

  function mercado(ev, m, x) {
    var mejores = C.mejores(m), cons = C.consenso(m, { metodo: S.cfg.metodo, referencia: S.cfg.referencia && m.filas.some(function (f) { return f.casa === S.cfg.referencia; }) ? S.cfg.referencia : '' });
    var cab = [{ t: 'Casa' }].concat(m.sels.map(function (s) { return { t: U.etiquetaSel(ev, s, m.linea), clase: 'num' }; })).concat([{ t: 'Margen', clase: 'num' }]);
    var filas = m.filas.map(function (f) {
      var cuotas = m.sels.map(function (s) { return f.cuotas[s]; }), justas = F.verProbs ? C.justas(cuotas, S.cfg.metodo) : null;
      return h('tr', null, h('th', { scope: 'row' }, f.casa, f.casa === S.cfg.referencia ? h('small', { class: 'muted' }, ' (ref.)') : null),
        m.sels.map(function (s, i) {
          var es = mejores[s].casa === f.casa && mejores[s].cuota === f.cuotas[s];
          return h('td', { class: 'num' }, h('button', { type: 'button', class: 'celda-cuota' + (es ? ' mejor' : ''), title: 'Registrar apuesta con esta cuota', 'aria-label': (es ? 'Mejor cuota. ' : '') + U.etiquetaSel(ev, s, m.linea) + ' ' + f.casa + ' ' + f.cuotas[s],
            onclick: function () { A.registroUI.nueva({ evento: ev.local + ' - ' + ev.visitante, deporte: U.grupoDeporte(x.deporte.clave), liga: x.deporte.nombre, mercado: U.nombreMercado(m.clave), seleccion: U.etiquetaSel(ev, s, m.linea), cuota: f.cuotas[s], casa: f.casa, fecha: A.registro.hoy(), probPropia: cons.prob[s] }); } },
            U.cuota(f.cuotas[s]), es ? h('span', { 'aria-hidden': 'true' }, ' ★') : null), justas ? h('small', { class: 'muted blq' }, U.p(justas[i])) : null);
        }),
        h('td', { class: 'num' }, U.p(C.margen(cuotas), 2)));
    });
    var mm = m.filas.reduce(function (a, f) { return a + C.margen(m.sels.map(function (s) { return f.cuotas[s]; })); }, 0) / m.filas.length;
    var pie = [
      h('tr', { class: 'sub' }, h('th', { scope: 'row' }, cons.fuente === 'referencia' ? 'Prob. justa (ref.)' : 'Prob. justa (consenso ' + cons.n + ')'), m.sels.map(function (s) { return h('td', { class: 'num' }, U.p(cons.prob[s])); }), h('td')),
      h('tr', { class: 'sub' }, h('th', { scope: 'row' }, 'Cuota justa'), m.sels.map(function (s) { return h('td', { class: 'num' }, U.cuota(1 / cons.prob[s])); }), h('td')),
      h('tr', { class: 'sub' }, h('th', { scope: 'row' }, 'Edge de la mejor'), m.sels.map(function (s) { var e = cons.prob[s] * mejores[s].cuota - 1; return h('td', { class: 'num ' + U.clase(e) }, U.p(e, 1, true)); }), h('td'))
    ];
    var mb = margenMejor(m);
    return h('section', { class: 'card' }, h('h3', null, U.nombreMercado(m.clave)),
      h('p', { class: 'muted' }, 'Margen medio de las casas: ' + U.p(mm, 2) + ' · Margen con las mejores cuotas: ' + U.p(mb, 2, true) + (mb < 0 ? ' (arbitraje posible)' : '')),
      U.tabla(cab, filas.concat(pie), 'cuotas'));
  }

  V.eventos = function (cont) {
    var datos = S.datos;
    var barra = h('div', { class: 'fila filtros' });
    if (!datos) { U.montar(cont, estadoDatos()); return; }
    var evs = A.alertas.todosEventos(datos);
    var grupos = [], ligas = [];
    evs.forEach(function (x) { var gr = U.grupoDeporte(x.deporte.clave); if (grupos.indexOf(gr) < 0) grupos.push(gr); if ((!F.deporte || gr === F.deporte) && ligas.indexOf(x.deporte.nombre) < 0) ligas.push(x.deporte.nombre); });
    var lista = listar();
    if (F.orden === 'margen') lista.sort(function (a, b) { return minMargen(a.ev) - minMargen(b.ev); }); else lista.sort(function (a, b) { return Date.parse(a.ev.inicio) - Date.parse(b.ev.inicio); });
    var q = U.texto({ valor: F.q, placeholder: 'Buscar equipo o liga…', onInput: function (v) { F.q = v; clearTimeout(q._t); q._t = setTimeout(function () { pintarLista(); }, 150); } });
    q.type = 'search'; q.setAttribute('aria-label', 'Buscar');
    var cuerpo = h('div', { class: 'grid-ev', 'aria-live': 'polite' });
    function pintarLista() { var l = listar(); if (F.orden === 'margen') l.sort(function (a, b) { return minMargen(a.ev) - minMargen(b.ev); }); else l.sort(function (a, b) { return Date.parse(a.ev.inicio) - Date.parse(b.ev.inicio); }); U.montar(cuerpo, l.length ? l.map(tarjeta) : U.vacio('Sin eventos con estos filtros', 'Prueba otro deporte, liga o fecha.')); cont.querySelector('.cuenta').textContent = l.length + ' evento' + (l.length === 1 ? '' : 's'); }
    U.montar(cont, estadoDatos(),
      h('div', { class: 'fila filtros' },
        U.campo('Deporte', U.selector([{ v: '', t: 'Todos' }].concat(grupos.map(function (x) { return { v: x, t: x }; })), F.deporte, function (v) { F.deporte = v; F.liga = ''; V.eventos(cont); })),
        U.campo('Liga', U.selector([{ v: '', t: 'Todas' }].concat(ligas.map(function (x) { return { v: x, t: x }; })), F.liga, function (v) { F.liga = v; pintarLista(); })),
        U.campo('Fecha', U.selector([{ v: 'todas', t: 'Todas' }, { v: 'hoy', t: 'Hoy' }, { v: 'manana', t: 'Mañana' }, { v: 'semana', t: 'Próx. 7 días' }], F.fecha, function (v) { F.fecha = v; pintarLista(); })),
        U.campo('Orden', U.selector([{ v: 'inicio', t: 'Hora de inicio' }, { v: 'margen', t: 'Menor margen' }], F.orden, function (v) { F.orden = v; pintarLista(); })),
        U.campo('Buscar', q)),
      h('div', { class: 'fila entre' }, h('small', { class: 'muted cuenta' }, ''), U.formatoSel()),
      cuerpo);
    pintarLista();
  };
  function minMargen(ev) { var ms = C.mercadosDeEvento(ev).filter(function (m) { return m.clave === 'h2h'; }); return ms.length ? margenMejor(ms[0]) : 9; }

  U.formatoSel = function () {
    return h('div', { class: 'fila' }, h('label', { class: 'muted', for: 'selFormato' }, 'Formato de cuotas'), U.selector(C.FORMATOS.map(function (f) { return { v: f, t: { decimal: 'Decimal', fraccional: 'Fraccional', americano: 'Americano', hongkong: 'Hong Kong', malayo: 'Malayo', indonesio: 'Indonesio' }[f] }; }), S.cfg.formato, function (v) { A.estado.guardarCfg({ formato: v }); A.app.pintar(); }, 'selFormato'));
  };

  function estadoDatos() {
    var f = h('div');
    if (S.estadoDatos === 'carga') return U.aviso('Cargando cuotas…', 'info');
    if (S.estadoDatos === 'demo') return U.aviso('MODO DEMO: cuotas ficticias generadas en tu dispositivo. No reflejan ningún mercado real.', 'demo');
    if (S.estadoDatos === 'error') return h('div', null, U.aviso('No se pudieron cargar las cuotas (' + (S.errorDatos || 'error de red') + '). El proceso de datos puede no estar activo todavía.', 'peligro'), h('div', { class: 'fila' }, U.btn('Reintentar', function () { A.estado.cargarDatos(true); }), U.btn('Usar datos de demostración', function () { A.estado.guardarCfg({ demo: true }); A.estado.cargarDatos(); }, 'primario')));
    if (S.estadoDatos === 'vacio') return h('div', null, U.vacio('No hay eventos publicados', 'El archivo de cuotas está vacío. Revisa la clave de la fuente de cuotas en el proceso de datos.'), U.btn('Usar datos de demostración', function () { A.estado.guardarCfg({ demo: true }); A.estado.cargarDatos(); }, 'primario'));
    var t = S.datos && S.datos.generado ? Date.now() - Date.parse(S.datos.generado) : null;
    return S.obsoleto ? U.aviso('Datos desactualizados (' + U.hace(t) + '). Las cuotas pueden haber cambiado: confírmalas siempre en la casa antes de apostar.', 'aviso') : h('small', { class: 'muted blq' }, 'Actualizado ' + U.hace(t) + (S.datos && S.datos.fuente ? ' · ' + S.datos.fuente : ''));
  }
  V.estadoDatos = estadoDatos;
})(window);
