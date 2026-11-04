/* Adaptador LOCAL de Cuenta: todo en localStorage de este dispositivo (modo demo / pruebas / desarrollo). NO es seguro: es una simulacion
   del modelo de Firestore para poder probar la plataforma sin Firebase. Las contrasenas se guardan con PBKDF2 (o un hash debil sin WebCrypto). */
(function (G) {
  'use strict';
  var L = G.CuentaLogica;
  var CLAVE = 'cuenta_local_v1', SES = 'cuenta_sesion_local';

  function crear(ctx) {
    ctx = ctx || {};
    var alm = ctx.almacen || G.localStorage, ses = ctx.sesion || G.sessionStorage;
    var oyentesAuth = [], vigilantes = [], intentos = {}, uidActual = null;
    var A = { modo: 'local', _notificar: function () { notificar(); } }; // _notificar: para pruebas sin eventos storage

    function leer() { try { var d = JSON.parse(alm.getItem(CLAVE)); if (d && d.usuarios) return d; } catch (e) {} return { usuarios: {}, nombres: {}, cred: {}, guardados: {}, logros: {}, puntajes: {}, amigos: {}, presencia: {}, invitaciones: {}, correos: {} }; }
    function escribir(db) { alm.setItem(CLAVE, JSON.stringify(db)); notificar(); }
    function notificar() { vigilantes.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
    function observar(calc, cb) {
      var ultimo = null;
      function f() { var v; try { v = JSON.stringify(calc(leer())); } catch (e) { return; } if (v !== ultimo) { ultimo = v; cb(JSON.parse(v)); } }
      vigilantes.push(f); Promise.resolve().then(f);
      return function () { vigilantes = vigilantes.filter(function (x) { return x !== f; }); };
    }
    if (G.addEventListener) {
      G.addEventListener('storage', function (e) { if (e.key === CLAVE) notificar(); if (e.key === SES) revisarSesion(); });
      setInterval(notificar, 3000);
    }
    function uidId() { return 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
    function azar() { return Math.random().toString(36).slice(2, 12); }

    async function hashPass(pass, sal) {
      try {
        var s = G.crypto && G.crypto.subtle;
        if (s) {
          var k = await s.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
          var bits = await s.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(sal), iterations: 100000, hash: 'SHA-256' }, k, 256);
          return 'p:' + L.b64(new Uint8Array(bits));
        }
      } catch (e) {}
      return 'h:' + L.hash(sal + pass);
    }
    function guardarSesion(uid, recordar) {
      try { alm.removeItem(SES); ses.removeItem(SES); } catch (e) {}
      try { (recordar ? alm : ses).setItem(SES, JSON.stringify({ uid: uid })); } catch (e) {}
    }
    function sesionActual() {
      var v = null;
      try { v = ses.getItem(SES) || alm.getItem(SES); } catch (e) {}
      try { var u = v && JSON.parse(v).uid; return u && leer().usuarios[u] ? u : null; } catch (e) { return null; }
    }
    function emitirAuth(uid) { uidActual = uid; return Promise.all(oyentesAuth.map(function (f) { return f(uid); })); }
    function revisarSesion() { var u = sesionActual(); if (u !== uidActual) emitirAuth(u); }

    A.init = function () { return Promise.resolve(); };
    A.alAuth = function (fn) { oyentesAuth.push(fn); uidActual = sesionActual(); return Promise.resolve(fn(uidActual)); };
    Object.defineProperty(A, 'uid', { get: function () { return uidActual; } });
    function exigir() { if (!uidActual) throw L.error('sin_sesion'); return uidActual; }

    function limitar(n) {
      var i = intentos[n] = (intentos[n] || []).filter(function (t) { return Date.now() - t < 60000; });
      if (i.length >= 5) throw L.error('muchos_intentos');
    }
    A.registrar = async function (nombre, pass, recordar, extra) {
      var db = leer();
      if (db.nombres[nombre]) throw L.error('nombre_usado');
      var uid = uidId(), sal = azar();
      db.cred[uid] = { sal: sal, hash: await hashPass(pass, sal) };
      db.nombres[nombre] = { uid: uid };
      db.usuarios[uid] = { nombre: nombre, nombreLower: nombre, color: extra.color, avatar: extra.avatar, xp: 0, nivel: 1, creado: Date.now(), ultimaConexion: Date.now() };
      escribir(db); guardarSesion(uid, recordar);
      await emitirAuth(uid);
      return uid;
    };
    A.entrar = async function (nombre, pass, recordar, esCorreo) {
      limitar(nombre);
      var db = leer(), r = db.nombres[nombre], uid = r && r.uid;
      if (esCorreo) { uid = null; for (var k in db.correos) if (db.correos[k] === nombre.toLowerCase()) uid = k; }
      var ok = false;
      if (uid && db.cred[uid]) ok = (await hashPass(pass, db.cred[uid].sal)) === db.cred[uid].hash;
      if (!ok) { intentos[nombre].push(Date.now()); throw L.error('credenciales'); }
      delete intentos[nombre];
      db.usuarios[uid].ultimaConexion = Date.now(); escribir(db); guardarSesion(uid, recordar);
      await emitirAuth(uid);
      return uid;
    };
    A.salir = async function () { try { alm.removeItem(SES); ses.removeItem(SES); } catch (e) {} await emitirAuth(null); };
    A.cambiarContrasena = async function (actual, nueva) {
      var uid = exigir(), db = leer(), c = db.cred[uid];
      limitar(db.usuarios[uid].nombreLower);
      if ((await hashPass(actual, c.sal)) !== c.hash) { intentos[db.usuarios[uid].nombreLower].push(Date.now()); throw L.error('credenciales', 'La contraseña actual no es correcta.'); }
      var sal = azar(); db.cred[uid] = { sal: sal, hash: await hashPass(nueva, sal) }; escribir(db);
    };
    A.borrarCuenta = async function (pass) {
      var uid = exigir(), db = leer(), c = db.cred[uid];
      if ((await hashPass(pass, c.sal)) !== c.hash) throw L.error('credenciales', 'La contraseña no es correcta.');
      var u = db.usuarios[uid];
      delete db.nombres[u.nombreLower]; delete db.usuarios[uid]; delete db.cred[uid]; delete db.guardados[uid]; delete db.logros[uid]; delete db.presencia[uid]; delete db.invitaciones[uid];
      Object.keys(db.puntajes).forEach(function (k) { delete db.puntajes[k][uid]; });
      Object.keys(db.amigos[uid] || {}).forEach(function (o) { if (db.amigos[o]) delete db.amigos[o][uid]; });
      delete db.amigos[uid];
      try { alm.removeItem(SES); ses.removeItem(SES); } catch (e) {}
      escribir(db); await emitirAuth(null);
    };
    A.vincularCorreo = async function (correo, pass) {
      var uid = exigir(), db = leer(), c = db.cred[uid];
      if ((await hashPass(pass, c.sal)) !== c.hash) throw L.error('credenciales', 'La contraseña no es correcta.');
      for (var k in db.correos) if (db.correos[k] === correo.toLowerCase() && k !== uid) throw L.error('correo_usado');
      db.correos[uid] = correo.toLowerCase(); escribir(db);
    };
    A.restablecer = async function () { /* demo: no se envia nada */ };
    A.nombreLibre = async function (n) { return !leer().nombres[n]; };

    A.perfil = async function (uid) { var u = leer().usuarios[uid]; if (!u) return null; var o = Object.assign({}, u); if (uid === uidActual) o.correo = leer().correos[uid] || ''; return o; };
    A.asegurarPerfil = async function () { return A.perfil(uidActual); };
    A.escucharPerfil = function (fn) { var uid = uidActual; return observar(function (db) { var u = db.usuarios[uid]; return u ? Object.assign({}, u, { correo: db.correos[uid] || '' }) : null; }, fn); };
    A.guardarPerfil = async function (c) { var uid = exigir(), db = leer(); Object.assign(db.usuarios[uid], c); escribir(db); };
    A.sumarXp = async function (n) { var uid = exigir(), db = leer(), u = db.usuarios[uid]; u.xp += n; u.nivel = L.nivelDeXp(u.xp).nivel; escribir(db); return u.xp; };

    function docId(juego, ranura) { return ranura && ranura !== 'principal' ? juego + '~' + ranura : juego; }
    A.guardadoGet = async function (juego, ranura) {
      var d = (leer().guardados[exigir()] || {})[docId(juego, ranura)]; return d ? JSON.parse(JSON.stringify(d)) : null;
    };
    A.guardadoSet = async function (juego, ranura, doc) {
      var uid = exigir(), db = leer(), g = db.guardados[uid] = db.guardados[uid] || {};
      g[docId(juego, ranura)] = { version: doc.version, hash: doc.hash, trozos: doc.trozos, actualizado: Date.now(), ranura: ranura };
      escribir(db);
    };
    A.guardadoBorrar = async function (juego, ranura) { var db = leer(), g = db.guardados[exigir()] || {}; delete g[docId(juego, ranura)]; escribir(db); };
    A.ranuras = async function (juego) {
      var g = leer().guardados[exigir()] || {}, r = [];
      Object.keys(g).forEach(function (k) { if (k === juego) r.push({ ranura: 'principal', actualizado: g[k].actualizado }); else if (k.indexOf(juego + '~') === 0) r.push({ ranura: k.slice(juego.length + 1), actualizado: g[k].actualizado }); });
      return r;
    };

    A.logrosGet = async function () { return JSON.parse(JSON.stringify(leer().logros[exigir()] || {})); };
    function lg(db) { return db.logros[uidActual] = db.logros[uidActual] || {}; }
    A.logroAdd = async function (juego, id) { exigir(); var db = leer(), l = lg(db); l[juego] = l[juego] || []; if (l[juego].indexOf(id) < 0) l[juego].push(id); escribir(db); };
    A.xpJuego = async function (juego, n) { exigir(); var db = leer(), l = lg(db); l.xpJuego = l.xpJuego || {}; l.xpJuego[juego] = (l.xpJuego[juego] || 0) + n; escribir(db); };
    A.ultimoJuego = async function (juego) { exigir(); var db = leer(), l = lg(db); l.ultimo = { juego: juego, t: Date.now() }; escribir(db); };

    A.puntajeSet = async function (clave, valor, mayor, perfil) {
      var uid = exigir(), db = leer(), p = db.puntajes[clave] = db.puntajes[clave] || {}, e = p[uid];
      if (e && !L.mejor(valor, e.valor, mayor)) return { mejoro: false, valor: e.valor };
      p[uid] = { nombre: perfil.nombre, color: perfil.color, valor: valor, fecha: Date.now() }; escribir(db);
      return { mejoro: true, valor: valor };
    };
    function lista(db, clave) { var p = db.puntajes[clave] || {}; return Object.keys(p).map(function (u) { return Object.assign({ uid: u }, p[u]); }); }
    A.puntajeTop = async function (clave, n, mayor) { exigir(); return L.ordenarRanking(lista(leer(), clave), mayor, n); };
    A.puntajesDe = async function (clave, uids) { exigir(); return lista(leer(), clave).filter(function (e) { return uids.indexOf(e.uid) >= 0; }); };
    A.puntajeDe = async function (clave, uid) { return lista(leer(), clave).filter(function (e) { return e.uid === uid; })[0] || null; };
    A.puntajeContarMejores = async function (clave, valor, mayor) { return lista(leer(), clave).filter(function (e) { return mayor ? e.valor > valor : e.valor < valor; }).length; };
    A.puntajeTotal = async function (clave) { return lista(leer(), clave).length; };

    A.buscar = async function (n) {
      exigir(); var db = leer(), r = db.nombres[n]; if (!r) return null; var u = db.usuarios[r.uid];
      return { uid: r.uid, nombre: u.nombre, nombreLower: u.nombreLower, color: u.color, avatar: u.avatar, nivel: u.nivel };
    };
    function rel(db, a, b) { return (db.amigos[a] || {})[b]; }
    function setRel(db, a, b, v) { db.amigos[a] = db.amigos[a] || {}; if (v) db.amigos[a][b] = v; else delete db.amigos[a][b]; }
    A.escucharAmigos = function (fn) {
      var uid = uidActual;
      return observar(function (db) { var m = db.amigos[uid] || {}; return Object.keys(m).map(function (o) { return { uid: o, estado: m[o].estado, desde: m[o].desde }; }); }, fn);
    };
    A.amigoEnviar = async function (otro) {
      var uid = exigir(), db = leer();
      if (rel(db, uid, otro) || rel(db, otro, uid)) throw L.error('otro', 'Ya existe una relación con ese usuario.');
      setRel(db, uid, otro, { estado: 'enviada', desde: uid }); setRel(db, otro, uid, { estado: 'recibida', desde: uid }); escribir(db);
    };
    A.amigoAceptar = async function (otro) {
      var uid = exigir(), db = leer(), r = rel(db, uid, otro);
      if (!r || r.estado !== 'recibida') throw L.error('otro', 'No hay solicitud pendiente.');
      setRel(db, uid, otro, { estado: 'amigos', desde: r.desde }); setRel(db, otro, uid, { estado: 'amigos', desde: r.desde }); escribir(db);
    };
    A.amigoQuitar = async function (otro) { var uid = exigir(), db = leer(); setRel(db, uid, otro, null); setRel(db, otro, uid, null); escribir(db); };

    A.presenciaSet = async function (estado, juego) { var uid = exigir(), db = leer(); db.presencia[uid] = { estado: estado, juego: juego || '', t: Date.now() }; escribir(db); return 0; };
    A.presenciaBorrar = async function () { var uid = uidActual; if (!uid) return; var db = leer(); delete db.presencia[uid]; escribir(db); };
    A.escucharPresencia = function (uids, fn) {
      return observar(function (db) { var m = {}; uids.forEach(function (u) { if (db.presencia[u]) m[u] = db.presencia[u]; }); return m; }, fn);
    };

    A.invitacionCrear = async function (dest, inv) {
      var uid = exigir(), db = leer(), r = rel(db, uid, dest);
      if (!r || r.estado !== 'amigos') throw L.error('no_amigo');
      var id = 'i' + azar(), l = db.invitaciones[dest] = db.invitaciones[dest] || {};
      l[id] = Object.assign({ id: id, estado: 'pendiente', respuesta: '', creado: Date.now(), expira: Date.now() + L.TTL_INVITACION }, inv);
      escribir(db); return id;
    };
    A.escucharInvitaciones = function (fn) {
      var uid = uidActual;
      return observar(function (db) { var l = db.invitaciones[uid] || {}; return Object.keys(l).map(function (k) { return l[k]; }); }, fn);
    };
    A.escucharInvitacion = function (dest, id, fn) {
      return observar(function (db) { var i = (db.invitaciones[dest] || {})[id]; return i ? { estado: i.estado, respuesta: i.respuesta, expira: i.expira } : { estado: 'borrada', respuesta: '' }; }, fn);
    };
    A.invitacionResponder = async function (id, estado, respuesta) {
      var uid = exigir(), db = leer(), i = (db.invitaciones[uid] || {})[id];
      if (!i || !L.invitacionVigente(i)) throw L.error('otro', 'La invitación ya no está disponible.');
      i.estado = estado; i.respuesta = respuesta; escribir(db);
    };
    A.invitacionCancelar = async function (dest, id) { var db = leer(), i = (db.invitaciones[dest] || {})[id]; if (i && i.de === exigir() && i.estado === 'pendiente') { i.estado = 'cancelada'; escribir(db); } };
    A.invitacionBorrar = async function (dest, id) { var db = leer(); if (db.invitaciones[dest] && db.invitaciones[dest][id]) { delete db.invitaciones[dest][id]; escribir(db); } };

    A.exportar = async function (claves) {
      var uid = exigir(), db = leer(), r = { usuario: db.usuarios[uid], logros: db.logros[uid] || {}, guardados: {}, puntajes: {}, amigos: db.amigos[uid] || {} };
      var g = db.guardados[uid] || {};
      for (var k in g) { try { r.guardados[k] = { actualizado: g[k].actualizado, datos: JSON.parse(await L.descomprimir(L.unir(g[k].trozos))) }; } catch (e) { r.guardados[k] = { error: 'ilegible' }; } }
      Object.keys(db.puntajes).forEach(function (c) { if (db.puntajes[c][uid]) r.puntajes[c] = db.puntajes[c][uid]; });
      return r;
    };
    return A;
  }
  G.CuentaLocal = { crear: crear };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.CuentaLocal;
})(typeof window !== 'undefined' ? window : globalThis);
