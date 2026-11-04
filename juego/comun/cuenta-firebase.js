/* Adaptador FIREBASE de Cuenta (Authentication + Firestore, SDK modular v10.14.1 vendorizado en vendor/firebase-bundle.js -> window.FirebaseSDK).
   Modelo de datos y reglas: juego/plataforma/firestore.rules. Usuario -> correo sintetico usuario@<dominioEmail> (por defecto users.invalid). */
(function (G) {
  'use strict';
  var L = G.CuentaLogica;

  function crear(ctx) {
    var S = G.FirebaseSDK, F = S.firestore, AU = S.auth;
    var dominio = ctx.dominio || 'users.invalid';
    var app = S.initializeApp(ctx.config);
    var auth = AU.getAuth(app);
    var db = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    var em = ctx.config.emuladores; // solo para pruebas: {auth:'http://127.0.0.1:9099', firestore:['127.0.0.1', 8080]}
    if (em) { AU.connectAuthEmulator(auth, em.auth, { disableWarnings: true }); F.connectFirestoreEmulator(db, em.firestore[0], em.firestore[1]); }
    var A = { modo: 'firebase' }, oyentes = [], uidActual = null, bloqueo = false, hecho, primer = new Promise(function (ok) { hecho = ok; });
    var desfase = null;

    function ms(t) { return t && t.toMillis ? t.toMillis() : (typeof t === 'number' ? t : Date.now()); }
    function mapa(e, contexto) {
      if (e && e.codigo) return e;
      var c = (e && e.code) || '', m = e && e.message || '';
      var r = 'otro', msg;
      if (c === 'auth/email-already-in-use') r = contexto === 'correo' ? 'correo_usado' : 'nombre_usado';
      else if (/^auth\/(invalid-credential|wrong-password|user-not-found|invalid-login-credentials|missing-password)$/.test(c)) r = 'credenciales';
      else if (c === 'auth/invalid-email') r = contexto === 'correo' ? 'correo_invalido' : 'credenciales';
      else if (c === 'auth/too-many-requests') r = 'muchos_intentos';
      else if (c === 'auth/network-request-failed' || c === 'unavailable' || c === 'deadline-exceeded' || /client is offline/i.test(m)) r = 'sin_red';
      else if (c === 'auth/requires-recent-login') r = 'requiere_reciente';
      else if (c === 'permission-denied') r = 'permiso';
      else if (/^auth\/(operation-not-allowed|configuration-not-found|invalid-api-key|api-key-not-valid|unauthorized-domain|admin-restricted-operation)/.test(c)) { r = 'configuracion'; msg = L.MENSAJES.configuracion + ' (' + c + ')'; }
      else if (c === 'auth/weak-password') { r = 'nombre_invalido'; msg = 'La contraseña es demasiado débil.'; }
      var er = L.error(r, msg); er.original = e; return er;
    }
    function conTimeout(p, t) {
      return new Promise(function (ok, mal) {
        var id = setTimeout(function () { mal(L.error('sin_red')); }, t || 9000);
        p.then(function (v) { clearTimeout(id); ok(v); }, function (e) { clearTimeout(id); mal(mapa(e)); });
      });
    }
    async function T(p) { try { return await p; } catch (e) { throw mapa(e); } }
    function uid() { if (!auth.currentUser) throw L.error('sin_sesion'); return auth.currentUser.uid; }
    function ref() { return F.doc.apply(null, [db].concat([].slice.call(arguments))); }
    function col() { return F.collection.apply(null, [db].concat([].slice.call(arguments))); }
    function emitirAuth(u) { uidActual = u; return Promise.all(oyentes.map(function (f) { return f(u); })); }

    A.init = function () {
      AU.onAuthStateChanged(auth, function (u) {
        var id = u ? u.uid : null;
        if (bloqueo) return;
        if (!hecho.listo) { hecho.listo = true; uidActual = id; hecho(); return; }
        if (id !== uidActual) emitirAuth(id);
      });
      return primer;
    };
    A.alAuth = function (fn) { oyentes.push(fn); return primer.then(function () { return fn(uidActual); }); };
    Object.defineProperty(A, 'uid', { get: function () { return uidActual; } });

    async function persistencia(recordar) { try { await AU.setPersistence(auth, recordar ? AU.browserLocalPersistence : AU.browserSessionPersistence); } catch (e) {} }
    async function crearPerfil(id, nombre, extra) {
      await F.runTransaction(db, async function (tx) {
        var rn = ref('nombres', nombre), n = await tx.get(rn);
        if (n.exists() && n.data().uid !== id) throw L.error('nombre_usado');
        if (!n.exists()) tx.set(rn, { uid: id });
        tx.set(ref('usuarios', id), { nombre: nombre, nombreLower: nombre, color: extra.color, avatar: extra.avatar, xp: 0, nivel: 1, creado: F.serverTimestamp(), ultimaConexion: F.serverTimestamp() });
      });
    }
    A.registrar = async function (nombre, pass, recordar, extra) {
      bloqueo = true; var cred;
      try {
        await persistencia(recordar);
        try { if ((await F.getDoc(ref('nombres', nombre))).exists()) throw L.error('nombre_usado'); } catch (e) { if (e.codigo === 'nombre_usado') throw e; /* sin permiso de lectura: lo decide Auth */ }
        try { cred = await AU.createUserWithEmailAndPassword(auth, L.emailDe(nombre, dominio), pass); } catch (e) { throw mapa(e); }
        try { await crearPerfil(cred.user.uid, nombre, extra); }
        catch (e) { try { await AU.deleteUser(cred.user); } catch (e2) { try { await AU.signOut(auth); } catch (e3) {} } throw mapa(e); }
      } finally { bloqueo = false; }
      await emitirAuth(cred.user.uid);
      return cred.user.uid;
    };
    A.entrar = async function (id, pass, recordar, esCorreo) {
      bloqueo = true; var cred;
      try {
        await persistencia(recordar);
        try { cred = await AU.signInWithEmailAndPassword(auth, esCorreo ? id : L.emailDe(id, dominio), pass); } catch (e) { throw mapa(e); }
      } finally { bloqueo = false; }
      await emitirAuth(cred.user.uid);
      return cred.user.uid;
    };
    A.salir = async function () { bloqueo = true; try { await AU.signOut(auth); } finally { bloqueo = false; } await emitirAuth(null); };
    async function reautenticar(pass, msg) {
      var u = auth.currentUser; if (!u) throw L.error('sin_sesion');
      try { await AU.reauthenticateWithCredential(u, AU.EmailAuthProvider.credential(u.email, pass)); }
      catch (e) { var m = mapa(e); if (m.codigo === 'credenciales') m = L.error('credenciales', msg || 'La contraseña no es correcta.'); throw m; }
      return u;
    }
    A.cambiarContrasena = async function (actual, nueva) { var u = await reautenticar(actual, 'La contraseña actual no es correcta.'); await T(AU.updatePassword(u, nueva)); };
    A.vincularCorreo = async function (correo, pass) {
      var u = await reautenticar(pass);
      try { await AU.verifyBeforeUpdateEmail(u, correo); } catch (e) { throw mapa(e, 'correo'); }
    };
    A.restablecer = async function (correo) { try { await AU.sendPasswordResetEmail(auth, correo); } catch (e) { var m = mapa(e, 'correo'); if (m.codigo === 'credenciales') return; throw m; } };
    A.nombreLibre = async function (n) { return !(await T(F.getDoc(ref('nombres', n)))).exists(); };

    function perfilDe(id, d) {
      var o = { nombre: d.nombre, nombreLower: d.nombreLower, color: d.color, avatar: d.avatar, xp: d.xp || 0, nivel: d.nivel || 1, creado: ms(d.creado) };
      if (auth.currentUser && auth.currentUser.uid === id && auth.currentUser.email && auth.currentUser.email.split('@')[1] !== dominio) o.correo = auth.currentUser.email;
      return o;
    }
    A.perfil = async function (id) { var s = await T(F.getDoc(ref('usuarios', id))); return s.exists() ? perfilDe(id, s.data()) : null; };
    A.asegurarPerfil = async function () {
      var u = auth.currentUser; if (!u) return null;
      var p = await A.perfil(u.uid); if (p) return p;
      var sufijo = '@' + dominio; if (!u.email || u.email.slice(-sufijo.length) !== sufijo) return null;
      await T(crearPerfil(u.uid, u.email.slice(0, -sufijo.length), { color: L.COLORES[0], avatar: L.AVATARES[0] }));
      return A.perfil(u.uid);
    };
    A.escucharPerfil = function (fn) {
      var id = uid();
      return F.onSnapshot(ref('usuarios', id), function (s) { if (s.exists()) fn(perfilDe(id, s.data())); }, function () {});
    };
    A.guardarPerfil = async function (c) { var d = Object.assign({}, c); await T(F.updateDoc(ref('usuarios', uid()), d)); };
    A.sumarXp = async function (n) {
      var r = ref('usuarios', uid());
      return T(F.runTransaction(db, async function (tx) {
        var s = await tx.get(r), xp = (s.data().xp || 0) + n;
        tx.update(r, { xp: xp, nivel: L.nivelDeXp(xp).nivel }); return xp;
      }));
    };

    function docId(juego, ranura) { return ranura && ranura !== 'principal' ? juego + '~' + ranura : juego; }
    A.guardadoSet = async function (juego, ranura, doc) {
      var id = uid(), base = docId(juego, ranura), b = F.writeBatch(db), n = doc.trozos.length;
      b.set(ref('guardados', id, 'juegos', base), { version: doc.version || 1, hash: doc.hash, partes: n, datos: doc.trozos[0], actualizado: F.serverTimestamp(), ranura: ranura || 'principal' });
      for (var k = 1; k < L.MAX_TROZOS; k++) {
        var r = ref('guardados', id, 'juegos', base + '_p' + k);
        if (k < n) b.set(r, { datos: doc.trozos[k], actualizado: F.serverTimestamp() }); else b.delete(r);
      }
      await conTimeout(b.commit(), 30000);
    };
    A.guardadoGet = async function (juego, ranura) {
      var id = uid(), base = docId(juego, ranura), s = await T(F.getDoc(ref('guardados', id, 'juegos', base)));
      if (!s.exists()) return null;
      var d = s.data(), trozos = [d.datos], resto = [];
      for (var k = 1; k < (d.partes || 1); k++) resto.push(T(F.getDoc(ref('guardados', id, 'juegos', base + '_p' + k))));
      (await Promise.all(resto)).forEach(function (x) { trozos.push(x.exists() ? x.data().datos : ''); });
      return { version: d.version, hash: d.hash, actualizado: ms(d.actualizado), trozos: trozos };
    };
    A.guardadoBorrar = async function (juego, ranura) {
      var id = uid(), base = docId(juego, ranura), b = F.writeBatch(db);
      b.delete(ref('guardados', id, 'juegos', base));
      for (var k = 1; k < L.MAX_TROZOS; k++) b.delete(ref('guardados', id, 'juegos', base + '_p' + k));
      await T(b.commit());
    };
    A.ranuras = async function (juego) {
      var s = await T(F.getDocs(col('guardados', uid(), 'juegos'))), r = [];
      s.forEach(function (d) {
        var k = d.id; if (/_p\d+$/.test(k)) return;
        if (k === juego) r.push({ ranura: 'principal', actualizado: ms(d.data().actualizado) });
        else if (k.indexOf(juego + '~') === 0) r.push({ ranura: k.slice(juego.length + 1), actualizado: ms(d.data().actualizado) });
      });
      return r;
    };

    A.logrosGet = async function () { var s = await T(F.getDoc(ref('logros', uid()))); return s.exists() ? s.data() : {}; };
    A.logroAdd = async function (juego, id) { var d = {}; d[juego] = F.arrayUnion(id); await conTimeout(F.setDoc(ref('logros', uid()), d, { merge: true })); };
    A.xpJuego = async function (juego, n) { var d = { xpJuego: {} }; d.xpJuego[juego] = F.increment(n); await conTimeout(F.setDoc(ref('logros', uid()), d, { merge: true })); };
    A.ultimoJuego = async function (juego) { await conTimeout(F.setDoc(ref('logros', uid()), { ultimo: { juego: juego, t: Date.now() } }, { merge: true })); };

    A.puntajeSet = async function (clave, valor, mayor, perfil) {
      var id = uid(), r = ref('puntajes', clave, 'entradas', id);
      return T(F.runTransaction(db, async function (tx) {
        var s = await tx.get(r);
        if (s.exists() && !L.mejor(valor, s.data().valor, mayor)) return { mejoro: false, valor: s.data().valor };
        tx.set(r, { nombre: perfil.nombre, color: perfil.color, valor: valor, fecha: F.serverTimestamp() });
        return { mejoro: true, valor: valor };
      }));
    };
    function entrada(d) { var o = d.data(); return { uid: d.id, nombre: o.nombre, color: o.color, valor: o.valor, fecha: ms(o.fecha) }; }
    A.puntajeTop = async function (clave, n, mayor) {
      var s = await T(F.getDocs(F.query(col('puntajes', clave, 'entradas'), F.orderBy('valor', mayor ? 'desc' : 'asc'), F.limit(n))));
      return s.docs.map(entrada);
    };
    A.puntajesDe = async function (clave, uids) {
      var r = [];
      for (var i = 0; i < uids.length; i += 30) {
        var s = await T(F.getDocs(F.query(col('puntajes', clave, 'entradas'), F.where(F.documentId(), 'in', uids.slice(i, i + 30)))));
        s.docs.forEach(function (d) { r.push(entrada(d)); });
      }
      return r;
    };
    A.puntajeDe = async function (clave, id) { var s = await T(F.getDoc(ref('puntajes', clave, 'entradas', id))); return s.exists() ? entrada(s) : null; };
    A.puntajeContarMejores = async function (clave, valor, mayor) {
      var s = await T(F.getCountFromServer(F.query(col('puntajes', clave, 'entradas'), F.where('valor', mayor ? '>' : '<', valor)))); return s.data().count;
    };
    A.puntajeTotal = async function (clave) { var s = await T(F.getCountFromServer(col('puntajes', clave, 'entradas'))); return s.data().count; };

    A.buscar = async function (n) {
      var s = await T(F.getDoc(ref('nombres', n))); if (!s.exists()) return null;
      var u = await T(F.getDoc(ref('usuarios', s.data().uid))); if (!u.exists()) return null;
      var d = u.data(); return { uid: s.data().uid, nombre: d.nombre, nombreLower: d.nombreLower, color: d.color, avatar: d.avatar, nivel: d.nivel || 1 };
    };
    A.escucharAmigos = function (fn) {
      return F.onSnapshot(col('amigos', uid(), 'lista'), function (s) {
        fn(s.docs.map(function (d) { return { uid: d.id, estado: d.data().estado, desde: d.data().desde }; }));
      }, function () {});
    };
    A.amigoEnviar = async function (otro) {
      var yo = uid(), b = F.writeBatch(db);
      b.set(ref('amigos', yo, 'lista', otro), { estado: 'enviada', desde: yo });
      b.set(ref('amigos', otro, 'lista', yo), { estado: 'recibida', desde: yo });
      await T(b.commit());
    };
    A.amigoAceptar = async function (otro) {
      var yo = uid(), b = F.writeBatch(db);
      b.update(ref('amigos', yo, 'lista', otro), { estado: 'amigos' });
      b.update(ref('amigos', otro, 'lista', yo), { estado: 'amigos' });
      await T(b.commit());
    };
    A.amigoQuitar = async function (otro) {
      var yo = uid(), b = F.writeBatch(db);
      b.delete(ref('amigos', yo, 'lista', otro)); b.delete(ref('amigos', otro, 'lista', yo));
      await T(b.commit());
    };

    A.presenciaSet = async function (estado, juego) {
      var id = uid(), r = ref('presencia', id);
      await conTimeout(F.setDoc(r, { estado: estado, juego: juego || '', t: F.serverTimestamp() }));
      if (desfase === null) { try { var s = await F.getDoc(r); desfase = ms(s.data().t) - Date.now(); } catch (e) { desfase = 0; } }
      return desfase;
    };
    A.presenciaBorrar = async function () { if (!auth.currentUser) return; await F.deleteDoc(ref('presencia', auth.currentUser.uid)); };
    A.escucharPresencia = function (uids, fn) {
      var m = {}, subs = [], pend = false;
      function avisar() { if (pend) return; pend = true; Promise.resolve().then(function () { pend = false; fn(Object.assign({}, m)); }); }
      uids.slice(0, 60).forEach(function (u) {
        subs.push(F.onSnapshot(ref('presencia', u), function (s) {
          if (s.exists()) { var d = s.data(); m[u] = { estado: d.estado, juego: d.juego || '', t: ms(d.t) }; } else delete m[u];
          avisar();
        }, function () {}));
      });
      return function () { subs.forEach(function (f) { f(); }); };
    };

    function invDe(d) {
      var o = d.data(), creado = ms(o.creado);
      return { id: d.id, de: o.de, nombre: o.nombre, color: o.color, avatar: o.avatar, juego: o.juego, oferta: o.oferta, estado: o.estado, respuesta: o.respuesta || '', creado: creado, expira: creado + L.TTL_INVITACION };
    }
    A.invitacionCrear = async function (dest, inv) {
      var id = uid(), r = F.doc(col('invitaciones', dest, 'lista'));
      await conTimeout(F.setDoc(r, { de: id, nombre: inv.nombre, color: inv.color, avatar: inv.avatar, juego: inv.juego, oferta: inv.oferta, estado: 'pendiente', respuesta: '', creado: F.serverTimestamp(), expira: Date.now() + L.TTL_INVITACION }));
      return r.id;
    };
    A.escucharInvitaciones = function (fn) {
      return F.onSnapshot(F.query(col('invitaciones', uid(), 'lista'), F.orderBy('creado', 'desc'), F.limit(10)), function (s) {
        fn(s.docs.filter(function (d) { return d.data().creado; }).map(invDe));
      }, function () {});
    };
    A.escucharInvitacion = function (dest, id, fn) {
      return F.onSnapshot(ref('invitaciones', dest, 'lista', id), function (s) {
        if (!s.exists()) return fn({ estado: 'borrada', respuesta: '' });
        var o = s.data(); fn({ estado: o.estado, respuesta: o.respuesta || '' });
      }, function () { fn({ estado: 'borrada', respuesta: '' }); });
    };
    A.invitacionResponder = async function (id, estado, respuesta) { await T(F.updateDoc(ref('invitaciones', uid(), 'lista', id), { estado: estado, respuesta: respuesta })); };
    A.invitacionCancelar = async function (dest, id) { try { await F.updateDoc(ref('invitaciones', dest, 'lista', id), { estado: 'cancelada' }); } catch (e) {} };
    A.invitacionBorrar = async function (dest, id) { try { await F.deleteDoc(ref('invitaciones', dest, 'lista', id)); } catch (e) {} };

    A.exportar = async function (claves) {
      var id = uid(), r = { usuario: await A.perfil(id), logros: await A.logrosGet(), guardados: {}, puntajes: {}, amigos: {} };
      var g = await T(F.getDocs(col('guardados', id, 'juegos')));
      for (var i = 0; i < g.docs.length; i++) {
        var d = g.docs[i]; if (/_p\d+$/.test(d.id)) continue;
        var x = await A.guardadoGet(d.id.split('~')[0], d.id.indexOf('~') > 0 ? d.id.split('~')[1] : 'principal');
        try { r.guardados[d.id] = { actualizado: x.actualizado, datos: JSON.parse(await L.descomprimir(L.unir(x.trozos))) }; } catch (e) { r.guardados[d.id] = { error: 'ilegible' }; }
      }
      for (var j = 0; j < claves.length; j++) { var p = await A.puntajeDe(claves[j], id).catch(function () { return null; }); if (p) r.puntajes[claves[j]] = p; }
      (await T(F.getDocs(col('amigos', id, 'lista')))).forEach(function (d) { r.amigos[d.id] = d.data(); });
      return r;
    };
    A.borrarCuenta = async function (pass, claves) {
      var u = await reautenticar(pass), id = u.uid, p = await A.perfil(id);
      async function lote(refs) { for (var i = 0; i < refs.length; i += 400) { var b = F.writeBatch(db); refs.slice(i, i + 400).forEach(function (r) { b.delete(r); }); await T(b.commit()); } }
      var am = await T(F.getDocs(col('amigos', id, 'lista')));
      for (var i = 0; i < am.docs.length; i++) { var o = am.docs[i].id, b = F.writeBatch(db); b.delete(ref('amigos', id, 'lista', o)); b.delete(ref('amigos', o, 'lista', id)); try { await b.commit(); } catch (e) { var b2 = F.writeBatch(db); b2.delete(ref('amigos', id, 'lista', o)); await b2.commit(); } }
      await lote(claves.map(function (c) { return ref('puntajes', c, 'entradas', id); }));
      await lote((await T(F.getDocs(col('guardados', id, 'juegos')))).docs.map(function (d) { return d.ref; }));
      await lote((await T(F.getDocs(col('invitaciones', id, 'lista')))).docs.map(function (d) { return d.ref; }));
      await lote([ref('logros', id), ref('presencia', id)]);
      if (p) await lote([ref('nombres', p.nombreLower)]);
      await lote([ref('usuarios', id)]);
      bloqueo = true;
      try { await AU.deleteUser(u); } catch (e) { bloqueo = false; throw mapa(e); }
      bloqueo = false; await emitirAuth(null);
    };
    return A;
  }
  G.CuentaFirebase = { crear: crear };
})(window);
