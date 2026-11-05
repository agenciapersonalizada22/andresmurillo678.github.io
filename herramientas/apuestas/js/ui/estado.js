/* Estado de la app: ajustes, apuestas, capturas de cuotas, carga de datos, alertas y tiempo de uso. Persistencia via A.almacen. */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, E = A.estado = {}, store = null, escuchas = [];
  var DEF = { tema: 'auto', formato: 'decimal', moneda: '$', bancaInicial: 1000, referencia: 'Pinnacle', metodo: 'shin', minEdge: 2, fraccionKelly: 0.25, unidad: 10, bancaArbitraje: 100,
    limites: { perdidaDia: 0, perdidaSemana: 0, perdidaMes: 0, tiempoMin: 0, aviso: 80 }, autoexclusion: null, edad: null, reglas: [], notificadas: [], demo: false, meta: { beneficioMes: 0, yield: 0 }, tiempoHoy: { fecha: '', ms: 0, avisado: 0 } };

  E.alCambiar = function (f) { escuchas.push(f); };
  E.almacen = function () { return store; };   // acceso del modulo de sincronizacion con la cuenta (js/nube.js)
  function avisar(que) { escuchas.forEach(function (f) { try { f(que); } catch (e) { console.error(e); } }); }
  E.avisar = avisar;

  E.iniciar = async function () {
    store = A.almacen.porDefecto();
    try { await store.abrir(); }
    catch (e) { store = A.almacen.crear(A.almacen.backendMemoria()); await store.abrir(); S.sinPersistencia = true; }
    var cfg = (await store.get('ajustes', 'cfg')) || {};
    S.cfg = merge(DEF, cfg);
    S.apuestas = await store.lista('apuestas');
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    E.aplicarTema();
  };
  function merge(d, o) { var r = {}, k; for (k in d) r[k] = (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && o[k] && typeof o[k] === 'object') ? merge(d[k], o[k]) : (o[k] !== undefined ? o[k] : (Array.isArray(d[k]) ? d[k].slice() : (d[k] && typeof d[k] === 'object' ? merge(d[k], {}) : d[k]))); for (k in o) if (!(k in r)) r[k] = o[k]; return r; }

  E.guardarCfg = function (parche) {
    for (var k in parche) S.cfg[k] = parche[k];
    var copia = JSON.parse(JSON.stringify(S.cfg)); delete copia.id; delete copia._t;
    return store.set('ajustes', 'cfg', copia).then(function () { avisar('cfg'); });
  };
  E.aplicarTema = function () {
    var t = S.cfg.tema; if (t === 'auto') document.documentElement.removeAttribute('data-tema'); else document.documentElement.setAttribute('data-tema', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = (t === 'oscuro' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)) ? '#0d1117' : '#f4f6f9';
  };

  E.guardarApuesta = function (a) {
    a.actualizado = Date.now();
    return store.set('apuestas', a.id, a).then(function (v) {
      var i = S.apuestas.findIndex(function (x) { return x.id === a.id; });
      if (i >= 0) S.apuestas[i] = v; else S.apuestas.push(v);
      avisar('apuestas'); return v;
    });
  };
  E.borrarApuesta = function (id) {
    return store.borrar('apuestas', id).then(function () { S.apuestas = S.apuestas.filter(function (x) { return x.id !== id; }); avisar('apuestas'); });
  };
  E.importarApuestas = async function (lista) {
    var n = 0, ex = {}; S.apuestas.forEach(function (a) { ex[a.id] = a; });
    for (var i = 0; i < lista.length; i++) {
      var a = lista[i]; if (ex[a.id] && ex[a.id].actualizado >= a.actualizado) continue;
      await store.set('apuestas', a.id, a); n++;
    }
    S.apuestas = await store.lista('apuestas'); avisar('apuestas'); return n;
  };
  E.borrarTodo = async function () {
    for (var i = 0; i < S.apuestas.length; i++) await store.borrar('apuestas', S.apuestas[i].id);
    S.apuestas = []; avisar('apuestas');
  };
  E.capturas = function () { return store.lista('capturas').then(function (l) { return l.sort(function (a, b) { return a.t - b.t; }); }); };
  E.guardarCaptura = async function () {
    if (!S.datos) return;
    var l = await E.capturas(), ult = l[l.length - 1];
    if (ult && (Date.now() - ult.t < 20 * 60000 || (!S.cfg.demo && ult.generado === S.datos.generado))) return;
    var snap = A.alertas.capturar(S.datos); if (!Object.keys(snap.ev).length) return;
    snap.demo = !!S.cfg.demo;
    await store.set('capturas', String(snap.t), snap);
    l.push(snap);
    while (l.length > 40) { var v = l.shift(); await store.borrar('capturas', String(v.t)); }
  };

  /* ---- datos ---- */
  E.cargarDatos = function (forzar) {
    if (S.cfg.demo) {
      S.datos = A.demo.generar(Date.now(), Math.floor(Date.now() / 600000)); S.estadoDatos = 'demo'; S.obsoleto = false;
      return Promise.resolve().then(post);
    }
    S.estadoDatos = 'carga'; avisar('datos');
    return g.Datos.cargar('apuestas/cuotas.json', { forzar: forzar }).then(function (d) {
      S.datos = d; var edad = g.Datos.edad(d);
      S.obsoleto = !!d._obsoleto || (edad != null && edad > 3 * 3600000);
      S.estadoDatos = A.alertas.todosEventos(d).length ? 'ok' : 'vacio';
    }).catch(function (e) { S.estadoDatos = 'error'; S.errorDatos = e.message; S.datos = null; }).then(post);
  };
  function post() {
    avisar('datos');
    return E.guardarCaptura().catch(function () {}).then(E.evaluarAlertas);
  }

  /* ---- alertas ---- */
  S.alertasActivas = [];
  E.evaluarAlertas = function () {
    if (!S.datos || !S.cfg.reglas.length) { S.alertasActivas = []; return Promise.resolve(); }
    var res = A.alertas.evaluar(S.cfg.reglas, S.datos, { referencia: S.cfg.referencia, metodo: S.cfg.metodo });
    S.alertasActivas = res;
    var vistas = S.cfg.notificadas, nuevas = res.filter(function (r) { return vistas.indexOf(r.clave) < 0; });
    if (!nuevas.length) { avisar('alertas'); return Promise.resolve(); }
    if (nuevas.length > 2) U.toast(nuevas.length + ' alertas nuevas: revisa la pestaña Análisis > Alertas', 'info');
    nuevas.slice(0, 5).forEach(function (r) {
      if (nuevas.length <= 2) U.toast('Alerta: ' + r.mensaje, 'info');
      try { if ('Notification' in g && Notification.permission === 'granted') new Notification('Alerta de apuestas', { body: r.mensaje, tag: r.clave }); } catch (e) {}
    });
    avisar('alertas');
    return E.guardarCfg({ notificadas: vistas.concat(nuevas.map(function (r) { return r.clave; })).slice(-300) });
  };

  /* ---- responsable ---- */
  E.autoexcluido = function () { var a = S.cfg.autoexclusion; return a && a.hasta > Date.now() ? a.hasta - Date.now() : 0; };
  E.limites = function () { return A.registro.evaluarLimites(S.apuestas, { perdidaDia: S.cfg.limites.perdidaDia, perdidaSemana: S.cfg.limites.perdidaSemana, perdidaMes: S.cfg.limites.perdidaMes, aviso: S.cfg.limites.aviso / 100 }); };
  E.iniciarReloj = function () {
    setInterval(function () {
      if (document.visibilityState !== 'visible') return;
      var hoy = A.registro.hoy(), t = S.cfg.tiempoHoy;
      if (t.fecha !== hoy) t = { fecha: hoy, ms: 0, avisado: 0 };
      t.ms += 15000; S.cfg.tiempoHoy = t;
      var lim = S.cfg.limites.tiempoMin * 60000;
      if (lim > 0) {
        var nivel = t.ms >= lim ? 2 : t.ms >= lim * S.cfg.limites.aviso / 100 ? 1 : 0;
        if (nivel > t.avisado) { t.avisado = nivel; U.toast(nivel === 2 ? 'Has superado tu límite de tiempo de hoy (' + S.cfg.limites.tiempoMin + ' min). Considera tomar un descanso.' : 'Te acercas a tu límite de tiempo de hoy.', nivel === 2 ? 'peligro' : 'aviso'); }
      }
      if (t.ms % 60000 < 15000 || t.avisado) E.guardarCfg({ tiempoHoy: t }); else S.cfg.tiempoHoy = t;
    }, 15000);
  };
})(window);
