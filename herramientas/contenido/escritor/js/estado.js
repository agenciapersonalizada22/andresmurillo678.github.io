/* Estado, almacenamiento y claves de la app. */
window.App = (function () {
  var DEF = { id: 'general', tema: 'auto', proveedor: 'anthropic', modelos: { anthropic: '', openai: '', gemini: '' }, tarifas: {}, temperatura: 0.8, maxTokens: 2048, stream: true, reintentos: 2, limites: {} };
  var mem = {}, shim = { getItem: function (k) { return mem[k] == null ? null : mem[k]; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
  var storage = U.sano(function () { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; }) || shim;
  var A = { alm: Almacen.crear('contenido_escritor'), claves: Claves.crear(storage), est: { ajustes: DEF, marcas: [], plantillas: [], historial: [] }, actual: null, previa: '', subs: [] };
  A.storage = storage;
  A.on = function (fn) { A.subs.push(fn); };
  A.avisar = function (que) { A.subs.forEach(function (f) { f(que); }); };
  A.cargar = async function () {
    var a = await A.alm.get('ajustes', 'general');
    A.est.ajustes = Object.assign({}, DEF, a || {}, { modelos: Object.assign({}, DEF.modelos, a && a.modelos) });
    var ord = function (x, y) { return (y._t || 0) - (x._t || 0); };
    A.est.marcas = (await A.alm.lista('marcas')).sort(ord);
    A.est.plantillas = (await A.alm.lista('plantillas')).sort(ord);
    A.est.historial = (await A.alm.lista('historial')).sort(function (x, y) { return y.fecha - x.fecha; });
  };
  A.guardarAjustes = function () { A.est.ajustes.id = 'general'; return A.alm.set('ajustes', A.est.ajustes).then(function () { A.avisar('ajustes'); }); };
  A.guardar = async function (col, obj) {
    await A.alm.set(col, obj);
    var l = A.est[col], i = l.findIndex(function (x) { return x.id === obj.id; });
    if (i >= 0) l[i] = obj; else l.unshift(obj);
    A.avisar(col); return obj;
  };
  A.borrar = async function (col, id) { await A.alm.borrar(col, id); A.est[col] = A.est[col].filter(function (x) { return x.id !== id; }); A.avisar(col); };
  A.proveedor = function () { return A.est.ajustes.proveedor; };
  A.modelo = function () { return (A.est.ajustes.modelos[A.proveedor()] || '').trim(); };
  A.iaLista = function () { return A.claves.tiene(A.proveedor()) && !!A.modelo(); };
  A.pedirPassword = function (msg) {
    return new Promise(function (ok) {
      var d = U.$('#dlg-pw'), inp = U.$('#pw-in'); U.$('#pw-msg').textContent = msg || 'Tu clave está cifrada en este dispositivo.'; inp.value = '';
      function fin() { d.removeEventListener('close', fin); ok(d.returnValue === 'ok' ? inp.value : null); inp.value = ''; }
      d.returnValue = ''; d.addEventListener('close', fin); U.abrirDialogo(d); setTimeout(function () { inp.focus(); }, 50);
    });
  };
  A.obtenerClave = async function (prov) {
    if (!A.claves.cifrada(prov) || A.claves.desbloqueada(prov)) return A.claves.obtener(prov);
    var msg;
    for (var i = 0; i < 3; i++) {
      var pw = await A.pedirPassword(msg); if (pw == null) throw new Error('Desbloqueo cancelado');
      try { return await A.claves.obtener(prov, pw); } catch (e) { msg = 'Contraseña incorrecta. Inténtalo de nuevo.'; }
    }
    throw new Error('Contraseña incorrecta');
  };
  A.tarifa = function () { var t = A.est.ajustes.tarifas[A.proveedor()] || {}; return { entrada: parseFloat(t.entrada) || 0, salida: parseFloat(t.salida) || 0 }; };
  return A;
})();
