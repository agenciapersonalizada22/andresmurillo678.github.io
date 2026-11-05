/* Colaboracion en tiempo real por enlace P2P (comun/red.js + lobby.js). Se comparte una lista (con sus tareas) o una nota.
   Fusion: ultimo-escribe-gana por campo con reloj logico de Lamport (marcas _m del almacen). El anfitrion envia una instantanea
   al iniciar y despues cada cambio local viaja como parche de campos. Las imagenes adjuntas no se envian. */
(function (G) {
  'use strict';
  var h = G.UI.h, UI = G.UI, U = G.Util, C = G.Colab = {};
  var S = function () { return G.App.store; };
  var st = { activo: false, ids: { listas: {}, tareas: {}, notas: {} }, pendiente: [], unsub: null, bufs: {}, desuscribir: [] }, MAX = 11000;
  try { var g = JSON.parse(G.localStorage.getItem('notas_colab')); if (g) st.ids = g; } catch (e) {}
  function persistir() { try { G.localStorage.setItem('notas_colab', JSON.stringify(st.ids)); } catch (e) {} }

  C.opts = { juego: 'Notas y Tareas', maxJugadores: 4, minJugadores: 2, modos: [{ id: 'colab', nombre: 'Colaborar en tiempo real' }], alIniciar: function (cfg, js) { iniciar(); } };
  C.activo = function () { return st.activo && !!G.Red && G.Red.conectado; };
  C.firma = function () { return C.activo() ? 'c' + G.Red.cuantos() : ''; };
  C.pertenece = function (col, id, rec) {
    if (col === 'listas') return !!st.ids.listas[id];
    if (col === 'notas') return !!st.ids.notas[id];
    if (col === 'tareas') { if (st.ids.tareas[id]) return true; if (rec && rec.lista && st.ids.listas[rec.lista]) { st.ids.tareas[id] = 1; return true; } }
    return false;
  };

  /* ---------- transporte con troceado (limite de 16 KB por mensaje) ---------- */
  function enviar(tipo, obj, a) {
    var R = G.Red, s = JSON.stringify(obj), f = a != null ? function (t, d) { return R.enviar(t, d, { a: a }); } : function (t, d) { return R.difundir(t, d); };
    if (s.length <= MAX) { f('nt', { k: tipo, o: obj }); return; }
    var m = U.id(), n = Math.ceil(s.length / MAX);
    for (var i = 0; i < n; i++) f('ntc', { m: m, i: i, n: n, k: tipo, d: s.slice(i * MAX, (i + 1) * MAX) });
  }
  function recibir(tipo, d, de) {
    if (tipo === 'nt') manejar(d.k, d.o, de);
    else if (tipo === 'ntc') {
      var b = st.bufs[d.m] = st.bufs[d.m] || { p: [], n: d.n, c: 0 }; if (!b.p[d.i]) { b.p[d.i] = d.d; b.c++; }
      if (b.c === b.n) { delete st.bufs[d.m]; try { manejar(d.k, JSON.parse(b.p.join('')), de); } catch (e) { console.error(e); } }
    }
  }
  function manejar(k, o, de) {
    var S2 = S();
    if (k === 'snap') {
      o.items.forEach(function (it) { if (it.col === 'listas') st.ids.listas[it.id] = 1; else if (it.col === 'notas') st.ids.notas[it.id] = 1; else if (it.col === 'tareas') st.ids.tareas[it.id] = 1; S2.aplicarRemoto(it.col, it.id, it.rec, { origen: 'remoto' }); });
      persistir(); G.App.titulos = null; UI.aviso('Recibido contenido compartido (' + o.items.length + ' elementos)', { tipo: 'ok' }); G.App.lateral(true);
    } else if (k === 'cambio') {
      if (o.col === 'listas' && !st.ids.listas[o.id]) return; if (o.col === 'notas' && !st.ids.notas[o.id]) return;
      if (o.col === 'tareas') { var cur = S2.get('tareas', o.id), ln = o.rec.lista || (cur && cur.lista); if (!st.ids.tareas[o.id] && !(ln && st.ids.listas[ln])) return; st.ids.tareas[o.id] = 1; }
      S2.aplicarRemoto(o.col, o.id, o.rec, { origen: 'remoto' });
      if (o.col === 'notas') G.App.titulos = null;
    }
  }
  function snapshot(items) {
    var S2 = S(), out = [];
    items.forEach(function (it) {
      if (it.tipo === 'lista') { var l = S2.crudos('listas').filter(function (x) { return x.id === it.id; })[0]; if (l) out.push({ col: 'listas', id: l.id, rec: l }); S2.crudos('tareas').forEach(function (t) { if (t.lista === it.id) { st.ids.tareas[t.id] = 1; out.push({ col: 'tareas', id: t.id, rec: t }); } }); }
      else { var n = S2.crudos('notas').filter(function (x) { return x.id === it.id; })[0]; if (n && !n.cif) out.push({ col: 'notas', id: n.id, rec: n }); }
    });
    return out;
  }
  function enviarSnapshot(items, a) {
    var recs = snapshot(items), lote = [], tam = 0;
    function vaciar() { if (lote.length) enviar('snap', { items: lote }, a); lote = []; tam = 0; }
    recs.forEach(function (r) { var l = JSON.stringify(r).length; if (tam + l > MAX - 500 && lote.length) vaciar(); lote.push(r); tam += l; }); vaciar();
  }

  function iniciar() {
    var R = G.Red; if (!R || !R.conectado) return;
    st.activo = true; st.desuscribir.forEach(function (f) { f(); }); st.desuscribir = [];
    st.desuscribir.push(R.on('mensaje', function (tipo, d, de) { if (tipo === 'nt' || tipo === 'ntc') recibir(tipo, d, de); }));
    st.desuscribir.push(R.on('jugadorUnido', function (id) { if (R.esAnfitrion && st.activo) setTimeout(function () { enviarSnapshot(listaCompartida(), id); }, 300); }));
    st.desuscribir.push(R.on('jugadorSalio', function (id, j) { UI.aviso((j ? j.nombre : 'Alguien') + ' salió de la colaboración'); G.App.lateral(true); }));
    st.desuscribir.push(R.on('cerrado', function (m) { st.activo = false; UI.aviso('Colaboración terminada. Lo compartido queda en tu copia local.'); G.App.lateral(true); }));
    st.desuscribir.push(S().suscribir(function (ev) {
      if (!st.activo || !G.Red.conectado || ev.origen !== 'local') return;
      if (ev.col !== 'listas' && ev.col !== 'tareas' && ev.col !== 'notas') return;
      var rec = ev.rec; if (!C.pertenece(ev.col, ev.id, rec)) return;
      var parcial = { id: ev.id, _m: {} };
      ev.campos.forEach(function (k) { parcial._m[k] = rec._m[k]; if (k === '_del') parcial._del = rec._del === true; else parcial[k] = rec[k]; });
      if (ev.col === 'notas' && rec.cif) return;
      enviar('cambio', { col: ev.col, id: ev.id, rec: parcial });
    }));
    if (G.Red.esAnfitrion) setTimeout(function () { enviarSnapshot(listaCompartida()); }, 400);
    UI.aviso('Colaboración activa con ' + (G.Red.cuantos() - 1) + ' persona(s)', { tipo: 'ok' }); G.App.lateral(true);
  }
  function listaCompartida() {
    var o = []; Object.keys(st.ids.listas).forEach(function (id) { if (S().get('listas', id)) o.push({ tipo: 'lista', id: id }); }); Object.keys(st.ids.notas).forEach(function (id) { if (S().get('notas', id)) o.push({ tipo: 'nota', id: id }); }); return o;
  }

  C.compartir = function (tipo, id) {
    var S2 = S();
    function lanzar(tp, i) {
      (tp === 'lista' ? st.ids.listas : st.ids.notas)[i] = 1; persistir();
      var nombre = tp === 'lista' ? (S2.get('listas', i) || {}).nombre : (S2.get('notas', i) || {}).titulo || 'nota';
      if (C.activo()) { enviarSnapshot([{ tipo: tp, id: i }]); UI.aviso('«' + nombre + '» compartida con los participantes', { tipo: 'ok' }); return; }
      G.Lobby.abrir(C.opts);
    }
    if (tipo) {
      var nom = tipo === 'lista' ? (S2.get('listas', id) || {}).nombre : (S2.get('notas', id) || {}).titulo || 'esta nota';
      UI.dialogo({ titulo: 'Colaborar en tiempo real', ancho: 460, cuerpo: h('div', {}, [h('p', {}, ['Vas a compartir «', h('b', { txt: nom }), '» con hasta 3 personas mediante una conexión directa entre navegadores.']), h('p', { cls: 'ayuda', txt: 'Crea la sala, envía el enlace y pega el código de respuesta. Los cambios se fusionan campo a campo (gana la última edición). Las imágenes no se envían.' })]), acciones: [{ txt: 'Cancelar' }, { txt: C.activo() ? 'Compartir ahora' : 'Crear sala', cls: 'prim', fn: function () { lanzar(tipo, id); } }] });
      return;
    }
    var sel = h('select', { cls: 'campo', 'aria-label': 'Qué compartir', 'data-f': 1 }, [h('optgroup', { label: 'Listas de tareas' }, S2.lista('listas').map(function (l) { return h('option', { value: 'lista:' + l.id, txt: l.nombre }); })), h('optgroup', { label: 'Notas recientes' }, S2.lista('notas', function (n) { return !n.papelera && !n.cif; }).sort(function (a, b) { return b.modificada - a.modificada; }).slice(0, 40).map(function (n) { return h('option', { value: 'nota:' + n.id, txt: n.titulo || 'Sin título' }); }))]);
    UI.dialogo({ titulo: 'Colaborar en tiempo real', ancho: 460, cuerpo: h('div', {}, [h('p', { txt: '¿Qué quieres compartir?' }), sel, h('p', { cls: 'ayuda', txt: 'También puedes elegirlo desde el menú ⋯ de una lista o nota.' })]), acciones: [{ txt: 'Cancelar' }, { txt: 'Continuar', cls: 'prim', fn: function () { var p = sel.value.split(':'); if (p[1]) C.compartir(p[0], p[1]); } }] });
  };
  C.indicador = function () {
    return h('div', { cls: 'colab-ind', role: 'status' }, [G.UI.icono('share'), h('span', { style: 'flex:1', txt: 'Colaborando · ' + G.Red.cuantos() + ' personas' }), h('button', { type: 'button', cls: 'btn pq', txt: 'Salir', 'data-f': 1, on: { click: function () { G.Red.salir(); st.activo = false; G.App.lateral(true); } } })]);
  };
  C.estado = function () { return { activo: C.activo(), ids: st.ids }; };
})(window);
