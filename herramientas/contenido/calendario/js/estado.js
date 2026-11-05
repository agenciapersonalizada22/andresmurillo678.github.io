window.App = (function () {
  var DEF = { id: 'general', tema: 'auto', vista: 'mes', zona: Fechas.zonaLocal(), horarios: {}, recordarMin: 30, notif: false, proveedor: 'anthropic', modelos: { anthropic: '', openai: '', gemini: '' }, avisados: {} };
  var A = { alm: Almacen.crear('contenido_calendario'), est: { pubs: [], ideas: [], campanas: [], ajustes: DEF }, filtros: { red: '', estado: '', campana: '' }, cal: { modo: 'mes', ref: Fechas.hoy() }, vistas: {}, subs: [] };
  var mem = {}, shim = { getItem: function (k) { return mem[k] == null ? null : mem[k]; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
  A.storage = U.sano(function () { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; }) || shim;
  A.claves = Claves.crear(A.storage);
  A.on = function (fn) { A.subs.push(fn); };
  A.avisar = function (q) { A.subs.forEach(function (f) { f(q); }); };
  A.cargar = async function () {
    var a = await A.alm.get('ajustes', 'general');
    A.est.ajustes = Object.assign({}, DEF, a || {}, { modelos: Object.assign({}, DEF.modelos, a && a.modelos), horarios: (a && a.horarios) || {}, avisados: (a && a.avisados) || {} });
    ['pubs', 'ideas', 'campanas'].forEach(function () {});
    A.est.pubs = await A.alm.lista('pubs'); A.est.ideas = await A.alm.lista('ideas'); A.est.campanas = await A.alm.lista('campanas');
    A.cal.modo = A.est.ajustes.vista || 'mes';
  };
  A.guardarAjustes = function () { A.est.ajustes.id = 'general'; return A.alm.set('ajustes', A.est.ajustes); };
  A.guardar = async function (col, obj) {
    await A.alm.set(col, obj); var l = A.est[col], i = l.findIndex(function (x) { return x.id === obj.id; });
    if (i >= 0) l[i] = obj; else l.push(obj); A.avisar(col); return obj;
  };
  A.borrar = async function (col, id) { await A.alm.borrar(col, id); A.est[col] = A.est[col].filter(function (x) { return x.id !== id; }); A.avisar(col); };
  A.pub = function (id) { return A.est.pubs.filter(function (p) { return p.id === id; })[0]; };
  A.camp = function (id) { return A.est.campanas.filter(function (c) { return c.id === id; })[0]; };
  A.zona = function (p) { return (p && p.zona) || A.est.ajustes.zona; };
  A.filtradas = function () {
    var f = A.filtros; return A.est.pubs.filter(function (p) { return (!f.red || p.red === f.red) && (!f.estado || p.estado === f.estado) && (!f.campana || p.campana === f.campana || p.serie === f.campana); });
  };
  A.iaLista = function () { var s = A.est.ajustes; return A.claves.tiene(s.proveedor) && !!(s.modelos[s.proveedor] || '').trim(); };
  A.obtenerClave = async function (prov) {
    if (!A.claves.cifrada(prov) || A.claves.desbloqueada(prov)) return A.claves.obtener(prov);
    var msg;
    for (var i = 0; i < 3; i++) {
      var pw = await new Promise(function (ok) { var d = U.$('#dlg-pw'), inp = U.$('#pw-in'); U.$('#pw-msg').textContent = msg || 'Tu clave está cifrada en este dispositivo.'; inp.value = ''; function fin() { d.removeEventListener('close', fin); ok(d.returnValue === 'ok' ? inp.value : null); inp.value = ''; } d.returnValue = ''; d.addEventListener('close', fin); U.abrirDialogo(d); setTimeout(function () { inp.focus(); }, 50); });
      if (pw == null) throw new Error('Desbloqueo cancelado');
      try { return await A.claves.obtener(prov, pw); } catch (e) { msg = 'Contraseña incorrecta. Inténtalo de nuevo.'; }
    }
    throw new Error('Contraseña incorrecta');
  };
  A.generarIA = async function (sistema, texto, onToken, signal) {
    var s = A.est.ajustes, prov = s.proveedor, clave = await A.obtenerClave(prov);
    return IA.generar({ proveedor: prov, clave: clave, modelo: s.modelos[prov].trim(), sistema: sistema, mensajes: [{ rol: 'user', texto: texto }], maxTokens: 2048, temperatura: 0.8, onToken: onToken, signal: signal });
  };
  A.horarios = function (red) { return A.est.ajustes.horarios[red] || Modelo.HORARIOS_DEF[red] || []; };
  A.fechaLegible = function (f) { var o = Fechas.parse(f); return Fechas.DIAS[Fechas.dow(f)] + ' ' + o.d + ' ' + Fechas.MESES[o.m - 1].slice(0, 3); };
  return A;
})();
