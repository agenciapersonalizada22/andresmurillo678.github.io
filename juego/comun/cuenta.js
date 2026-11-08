/* Cuenta: API unica de la plataforma (cuenta de usuario, nube, rankings, logros, amigos, invitaciones). Script clasico: window.Cuenta.
   Documentacion: juego/comun/LEEME-cuenta.md. Carga sola sus adaptadores (cuenta-local.js o cuenta-firebase.js + vendor/firebase-bundle.js)
   segun juego/comun/firebase-config.js. Requiere (antes): firebase-config.js. Opcional: mando.js. Estilos: cuenta.css (se inyecta sola). */
(function (G) {
  'use strict';
  var esNav = typeof document !== 'undefined';
  var BASE = (function () {
    try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^\/]*$/, ''); } catch (e) {}
    return '';
  })();

  /* ====================== LOGICA PURA (probada en Node) ====================== */
  var L = {
    LARGAS: ['mierda', 'pendejo', 'cabron', 'hijueputa', 'hijoputa', 'hdp', 'marica', 'maricon', 'fuck', 'shit', 'bitch', 'pussy', 'nigger', 'nigga', 'nazi', 'hitler', 'pornhub', 'xxx', 'violador', 'cojones', 'gilipollas', 'chingada', 'chinga', 'puta madre'],
    CORTAS: ['puta', 'puto', 'culo', 'verga', 'sexo', 'pene', 'vagina', 'ass', 'cum', 'dick', 'cock', 'tits', 'porn', 'sex', 'rape', 'coño', 'cono', 'zorra', 'perra', 'idiota'],
    normalizarNombre: function (s) {
      s = String(s == null ? '' : s).trim().toLowerCase();
      try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
      return s;
    },
    groseria: function (n) {
      var t = n.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/[_\d]+/g, '_');
      var plano = t.replace(/_/g, '');
      var i;
      for (i = 0; i < L.LARGAS.length; i++) if (plano.indexOf(L.LARGAS[i].replace(/ /g, '')) >= 0) return true;
      var trozos = t.split('_');
      for (i = 0; i < L.CORTAS.length; i++) if (trozos.indexOf(L.CORTAS[i]) >= 0 || plano === L.CORTAS[i]) return true;
      return false;
    },
    validarNombre: function (s) {
      var n = L.normalizarNombre(s);
      if (!n) return 'Escribe un nombre de usuario.';
      if (n.length < 3) return 'El nombre necesita al menos 3 caracteres.';
      if (n.length > 16) return 'El nombre admite como máximo 16 caracteres.';
      if (!/^[a-z0-9_]+$/.test(n)) return 'Usa solo letras (sin espacios ni acentos), números y guion bajo (_).';
      if (L.groseria(n)) return 'Ese nombre no está permitido. Elige otro.';
      return '';
    },
    validarContrasena: function (p, nombre) {
      p = String(p == null ? '' : p);
      if (p.length < 8) return 'La contraseña necesita al menos 8 caracteres.';
      if (p.length > 128) return 'La contraseña es demasiado larga (máximo 128).';
      if (nombre && p.toLowerCase() === L.normalizarNombre(nombre)) return 'La contraseña no puede ser igual al nombre de usuario.';
      if (/^(.)\1+$/.test(p)) return 'Usa una contraseña menos repetitiva.';
      return '';
    },
    validarNombreVisible: function (s) {
      s = String(s == null ? '' : s).trim();
      if (s.length < 3 || s.length > 16) return 'El nombre visible debe tener entre 3 y 16 caracteres.';
      if (/[\u0000-\u001f<>]/.test(s)) return 'El nombre visible tiene caracteres no permitidos.';
      if (L.groseria(L.normalizarNombre(s).replace(/[^a-z0-9]+/g, '_'))) return 'Ese nombre no está permitido.';
      return '';
    },
    emailDe: function (nombre, dominio) { return L.normalizarNombre(nombre) + '@' + (dominio || 'users.invalid'); },
    nombreDeEmail: function (email) { return String(email || '').split('@')[0]; },
    /* Nivel n empieza en 100*n*(n-1)/2 XP (100, 300, 600, 1000...). */
    xpParaNivel: function (n) { return 100 * n * (n - 1) / 2; },
    nivelDeXp: function (xp) {
      xp = Math.max(0, Math.floor(+xp || 0));
      var n = Math.min(100, Math.floor((1 + Math.sqrt(1 + 8 * xp / 100)) / 2));
      var base = L.xpParaNivel(n), sig = n >= 100 ? base : L.xpParaNivel(n + 1);
      return { nivel: n, xp: xp, base: base, siguiente: sig, enNivel: xp - base, paraSiguiente: sig - base, fraccion: n >= 100 ? 1 : (xp - base) / (sig - base) };
    },
    hash: function (s) {
      var h1 = 0x811c9dc5, h2 = 5381, c;
      s = String(s);
      for (var i = 0; i < s.length; i++) { c = s.charCodeAt(i); h1 ^= c; h1 = Math.imul(h1, 16777619) >>> 0; h2 = ((h2 * 33) ^ c) >>> 0; }
      return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
    },
    hashClaves: function (obj) {
      var k = Object.keys(obj || {}).sort(), r = [];
      k.forEach(function (x) { r.push([x, obj[x]]); });
      return L.hash(JSON.stringify(r));
    },
    b64: function (bytes) { var s = '', paso = 0x8000; for (var i = 0; i < bytes.length; i += paso) s += String.fromCharCode.apply(null, bytes.subarray(i, i + paso)); return btoa(s); },
    deB64: function (t) { var s = atob(t), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; },
    comprimir: async function (texto) {
      var bytes = new TextEncoder().encode(texto);
      if (typeof CompressionStream !== 'undefined') {
        try {
          var cs = new CompressionStream('gzip'), w = cs.writable.getWriter();
          w.write(bytes); w.close();
          return 'g1:' + L.b64(new Uint8Array(await new Response(cs.readable).arrayBuffer()));
        } catch (e) {}
      }
      return 'j0:' + L.b64(bytes);
    },
    descomprimir: async function (t) {
      var tipo = t.slice(0, 3), bytes = L.deB64(t.slice(3));
      if (tipo === 'g1:') {
        var ds = new DecompressionStream('gzip'), w = ds.writable.getWriter();
        w.write(bytes); w.close();
        bytes = new Uint8Array(await new Response(ds.readable).arrayBuffer());
      } else if (tipo !== 'j0:') throw new Error('formato de guardado desconocido');
      return new TextDecoder().decode(bytes);
    },
    TAM_TROZO: 700000, MAX_TROZOS: 8,
    fragmentar: function (s, tam) {
      tam = tam || L.TAM_TROZO;
      var r = [];
      for (var i = 0; i < s.length; i += tam) r.push(s.slice(i, i + tam));
      return r.length ? r : [''];
    },
    unir: function (arr) { return (arr || []).join(''); },
    /* Decide que hacer al sincronizar: 'igual' | 'subir' | 'bajar' | 'conflicto'. hashMeta = hash de la ultima sincronizacion en este dispositivo. */
    resolverSync: function (x) {
      if (!x.hayLocal && !x.hayNube) return 'igual';
      if (!x.hayNube) return 'subir';
      if (!x.hayLocal) return 'bajar';
      if (x.hashLocal === x.hashNube) return 'igual';
      if (!x.hashMeta) return 'conflicto';
      var local = x.hashLocal !== x.hashMeta, nube = x.hashNube !== x.hashMeta;
      if (local && nube) return 'conflicto';
      if (local) return 'subir';
      if (nube) return 'bajar';
      return 'igual';
    },
    TTL_INVITACION: 300000,
    invitacionVigente: function (inv, ahora) {
      ahora = ahora == null ? Date.now() : ahora;
      var fin = inv.expira || ((inv.creado || 0) + L.TTL_INVITACION);
      return !!inv && inv.estado === 'pendiente' && ahora < fin;
    },
    ordenarRanking: function (entradas, mayorEsMejor, n) {
      var r = entradas.slice().sort(function (a, b) {
        var d = mayorEsMejor ? b.valor - a.valor : a.valor - b.valor;
        return d || ((a.fecha || 0) - (b.fecha || 0)) || (a.uid < b.uid ? -1 : 1);
      });
      if (n) r = r.slice(0, n);
      return r.map(function (e, i) { var o = {}; for (var k in e) o[k] = e[k]; o.pos = i + 1; return o; });
    },
    /* Aplica al almacen una bajada de la nube: SOLO escribe las claves de la lista (nunca otras que traiga el documento, p. ej. ajustes por dispositivo
       subidos antiguamente) y quita las de la lista que la nube no trae. */
    aplicarBajada: function (datos, claves, almacen) {
      datos = datos || {};
      claves.forEach(function (k) { if (Object.prototype.hasOwnProperty.call(datos, k) && datos[k] != null) almacen.setItem(k, datos[k]); else almacen.removeItem(k); });
    },
    /* Id de juego o herramienta segun la ruta (/juego/<id>/, /herramientas/<carpeta>/, /herramientas/contenido/<sub>/), con o sin subdirectorio del sitio.
       Respaldo sin la tabla cargada: debe coincidir con plataforma/juegos.js (lo comprueba logica.test.mjs). */
    RUTAS_JUEGOS: ['nebula', 'ciudad', 'bloques', 'guerra', 'ajedrez', 'metropolis', 'buscaminas', 'celulas', 'serpientes', 'uno', 'magnate', 'cartas', 'gatos', 'colonos', 'conquista', 'turismo', 'domino', 'isla', 'hockey', 'pingpong', 'billar', 'bolos'],
    RUTAS_HERRAMIENTAS: { notas: 'notas', pizarra: 'pizarra', mercados: 'mercados', apuestas: 'apuestas', ofertas: 'ofertas', 'contenido/imagenes': 'contenido_imagenes', 'contenido/video': 'contenido_video', 'contenido/escritor': 'contenido_escritor', 'contenido/calendario': 'contenido_calendario' },
    juegoDeRuta: function (ruta) {
      ruta = String(ruta || '');
      var m = /\/juego\/([a-z0-9_-]+)(?:\/|$)/.exec(ruta);
      if (m && L.RUTAS_JUEGOS.indexOf(m[1]) >= 0) return m[1];
      m = /\/herramientas\/([a-z0-9_-]+)(?:\/([a-z0-9_-]+))?(?:\/|$)/.exec(ruta);
      if (m) { var c = m[1] === 'contenido' ? 'contenido/' + (m[2] || '') : m[1]; return L.RUTAS_HERRAMIENTAS[c] || ''; }
      return '';
    },
    mejor: function (nuevo, viejo, mayorEsMejor) { return viejo == null || (mayorEsMejor ? nuevo > viejo : nuevo < viejo); },
    ESTADO_PRESENCIA_MS: 150000,
    presenciaVigente: function (p, ahora) { return !!p && p.t && ((ahora == null ? Date.now() : ahora) - p.t) < L.ESTADO_PRESENCIA_MS; },
    AVATARES: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12'],
    COLORES: ['#3df5ff', '#ff4fd8', '#ffd23d', '#6dff6d', '#ff6b4a', '#9a8cff', '#ffa43d', '#ffffff'],
    MENSAJES: {
      nombre_usado: 'Ese nombre de usuario ya existe. Elige otro.',
      credenciales: 'Usuario o contraseña incorrectos.',
      muchos_intentos: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      sin_red: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
      sin_sesion: 'Primero inicia sesión.',
      requiere_reciente: 'Por seguridad, cierra sesión, vuelve a entrar y repite la acción.',
      permiso: 'Firebase rechazó la operación por las reglas de seguridad. Comprueba que publicaste firestore.rules.',
      no_existe: 'No existe ningún usuario con ese nombre.',
      a_ti_mismo: 'No puedes agregarte a ti mismo.',
      ya_amigos: 'Ya son amigos.',
      ya_enviada: 'Ya enviaste una solicitud a esa persona.',
      no_amigo: 'Solo puedes invitar a tus amigos.',
      correo_invalido: 'Escribe un correo válido.',
      correo_usado: 'Ese correo ya está vinculado a otra cuenta.',
      sdk: 'No se pudo cargar Firebase. Revisa tu conexión y recarga la página.',
      configuracion: 'La configuración de Firebase no es válida o el método Correo/Contraseña no está habilitado.',
      fuera_de_rango: 'Valor fuera de rango.',
      modo_desconocido: 'Juego o modo de puntaje desconocido.',
      otro: 'Algo salió mal. Inténtalo de nuevo.'
    },
    error: function (codigo, mensaje) { var e = new Error(mensaje || L.MENSAJES[codigo] || L.MENSAJES.otro); e.codigo = codigo; return e; },
    mensajeError: function (e) { return e && e.codigo && (e.mensaje || e.message) ? (e.mensaje || e.message) : (L.MENSAJES.otro); }
  };
  G.CuentaLogica = L;

  /* Cola de operaciones pendientes (sin red). almacen: objeto tipo localStorage. */
  L.Cola = function (almacen, clave) {
    this.alm = almacen; this.clave = clave; this.ocupada = false;
  };
  L.Cola.prototype.leer = function () { try { return JSON.parse(this.alm.getItem(this.clave) || '[]'); } catch (e) { return []; } };
  L.Cola.prototype.escribir = function (l) { try { this.alm.setItem(this.clave, JSON.stringify(l)); } catch (e) { /* lleno: se pierde lo pendiente */ } };
  L.Cola.prototype.tamano = function () { return this.leer().length; };
  L.Cola.prototype.agregar = function (op) {
    var l = this.leer();
    if (op.reemplaza) l = l.filter(function (x) { return x.reemplaza !== op.reemplaza; });
    l.push(op); this.escribir(l);
  };
  /* ejecutar(op) -> promesa; si rechaza con codigo 'sin_red' se detiene y conserva el resto. */
  L.Cola.prototype.vaciar = async function (ejecutar) {
    if (this.ocupada) return;
    this.ocupada = true;
    try {
      var l = this.leer();
      while (l.length) {
        var op = l[0];
        try { await ejecutar(op); } catch (e) { if (e && e.codigo === 'sin_red') break; }
        l.shift(); this.escribir(l);
      }
    } finally { this.ocupada = false; }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = { _logica: L }; }
  if (!esNav) return;

  /* ====================== NUCLEO ====================== */
  var Cuenta = G.Cuenta = {
    CONFIG: { permitirInvitado: false },
    modo: '', demo: false, listo: false, errorInicio: null,
    avatares: L.AVATARES, colores: L.COLORES, logica: L,
    ui: { mandoPropio: false }
  };
  var A = null, usr = null, promesaInicio = null, oyentes = {}, cola = null, srvDesc = [], tabla = null;
  var sumaXp = {}, tXp = 0, logrosCache = {}, xpJuegoCache = {}, ultimoJuego = null, pendConflictos = {};
  var estadoPres = { estado: 'en_linea', juego: '' }, latido = 0, desfaseServidor = 0;

  function on(ev, fn) { (oyentes[ev] = oyentes[ev] || []).push(fn); return function () { oyentes[ev] = (oyentes[ev] || []).filter(function (f) { return f !== fn; }); }; }
  function emit(ev) { var a = Array.prototype.slice.call(arguments, 1); (oyentes[ev] || []).slice().forEach(function (f) { try { f.apply(null, a); } catch (e) { console.error(e); } }); }
  Cuenta.on = on;
  function ahora() { return Date.now() + desfaseServidor; }
  function cargarScript(url) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = function () { mal(L.error('sdk')); }; document.head.appendChild(s);
    });
  }
  function cargarCss(nombre) {
    if (document.querySelector('link[data-cuenta="' + nombre + '"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = BASE + nombre; l.setAttribute('data-cuenta', nombre); document.head.appendChild(l);
  }
  Cuenta.base = BASE;
  Cuenta.cargarScript = function (nombre) { return cargarScript(BASE + nombre); };
  Cuenta.cargarCss = cargarCss;
  function tablaJuegos() {
    if (G.PlataformaJuegos) return Promise.resolve(G.PlataformaJuegos);
    if (!tabla) tabla = cargarScript(BASE + '../plataforma/juegos.js').then(function () { return G.PlataformaJuegos; });
    return tabla;
  }
  Cuenta.tabla = tablaJuegos;
  function portalUrl() { return new URL('../', BASE || location.href).href; }
  Cuenta.portalUrl = portalUrl;
  Cuenta.juegoActual = function () { return L.juegoDeRuta(location.pathname); };   // juego o herramienta de esta pagina ('' si ninguno)

  /* ---------- usuario ---------- */
  function armarUsuario(p) {
    if (!p) return null;
    var n = L.nivelDeXp(p.xp);
    return { uid: p.uid, usuario: p.nombreLower, nombre: p.nombre, color: p.color, avatar: p.avatar, xp: n.xp, nivel: n.nivel, nivelInfo: n, creado: p.creado || 0, correo: p.correo || '' };
  }
  Object.defineProperty(Cuenta, 'usuario', { get: function () { return usr; }, enumerable: true });
  Cuenta.alCambiar = function (fn) { var u = on('sesion', fn); if (promesaInicio && Cuenta.listo) { try { fn(usr); } catch (e) { console.error(e); } } return u; };

  function sincronizarPerfilLocal() {
    if (!usr) return;
    try {
      if (G.Red && G.Red.perfil) G.Red.perfil.guardar({ nombre: usr.nombre, color: usr.color });
      else localStorage.setItem('juego_perfil', JSON.stringify({ nombre: usr.nombre, color: usr.color }));
    } catch (e) {}
  }

  /* ---------- inicio ---------- */
  Cuenta.iniciar = function () {
    if (promesaInicio) return promesaInicio;
    promesaInicio = (async function () {
      var cfg = G.FIREBASE_CONFIG || {}, op = G.CUENTA_OPCIONES || {};
      var usarFb = op.modo !== 'local' && cfg.apiKey && cfg.projectId && cfg.appId;
      var ctx = { config: cfg, dominio: op.dominioEmail || 'users.invalid', almacen: op.almacen, sesion: op.sesion };
      try {
        if (usarFb) {
          await cargarScript(BASE + 'vendor/firebase-bundle.js');
          await cargarScript(BASE + 'cuenta-firebase.js');
          A = G.CuentaFirebase.crear(ctx); Cuenta.modo = 'firebase';
        } else {
          await cargarScript(BASE + 'cuenta-local.js');
          A = G.CuentaLocal.crear(ctx); Cuenta.modo = 'local'; Cuenta.demo = true;
        }
        await A.init();
        await new Promise(function (ok) {
          var primero = true;
          A.alAuth(function (uid) { return cambioSesion(uid).then(function () { if (primero) { primero = false; ok(); } }); });
        });
      } catch (e) { Cuenta.errorInicio = e; usr = null; console.error('Cuenta:', e); }
      Cuenta.listo = true;
      return usr;
    })();
    return promesaInicio;
  };
  Cuenta.adaptador = function () { return A; };

  var servicios = false, desPerfil = null;
  async function cambioSesion(uid) {
    if (uid && usr && usr.uid === uid) return;
    if (!uid) {
      detenerServicios(); usr = null; logrosCache = {}; xpJuegoCache = {}; ultimoJuego = null;
      if (Cuenta.listo) emit('sesion', null);
      return;
    }
    var p = null;
    try { p = await A.perfil(uid); } catch (e) { /* sin red: seguimos con lo guardado */ }
    if (!p) { try { p = await A.asegurarPerfil(); } catch (e) { p = null; } }
    if (!p) { usr = null; return; }
    usr = armarUsuario(Object.assign({ uid: uid }, p));
    sincronizarPerfilLocal();
    iniciarServicios();
    if (Cuenta.listo) emit('sesion', usr);
  }

  function iniciarServicios() {
    if (servicios) return;
    servicios = true;
    cola = new L.Cola(localStorage, 'cuenta_cola_' + usr.uid);
    desPerfil = A.escucharPerfil(function (p) {
      if (!usr || !p) return;
      var antes = usr.nivel;
      usr = armarUsuario(Object.assign({ uid: usr.uid }, p));
      sincronizarPerfilLocal();
      emit('perfil', usr); if (usr.nivel > antes) emit('nivel', usr.nivel);
    });
    srvDesc.push(desPerfil);
    A.logrosGet().then(function (d) {
      d = d || {}; logrosCache = {}; xpJuegoCache = d.xpJuego || {}; ultimoJuego = d.ultimo || null;
      Object.keys(d).forEach(function (k) { if (Array.isArray(d[k])) logrosCache[k] = d[k]; });
      emit('logros', logrosCache);
    }).catch(function () {});
    iniciarPresencia(); iniciarAmigos(); iniciarInvitaciones();
    var j = Cuenta.juegoActual();
    if (j) A.ultimoJuego(j).catch(function () {});
    procesarCola();
    srvDesc.push(setIntervalDesc(procesarCola, 30000));
  }
  function setIntervalDesc(fn, ms) { var id = setInterval(fn, ms); return function () { clearInterval(id); }; }
  function detenerServicios() {
    srvDesc.forEach(function (f) { try { f(); } catch (e) {} }); srvDesc = []; servicios = false;
    detenerPresencia(); if (desPres) desPres(); desPres = null; uidsEscuchados = ''; presAmigos = {}; perfilesAmigos = {}; relaciones = []; notificadas = {};
    amigosEstado.lista = []; amigosEstado.solicitudes = []; amigosEstado.enviadas = []; invitacionesEntrantes = [];
    if (Cuenta.amigos._unsub) { Cuenta.amigos._unsub(); Cuenta.amigos._unsub = null; }
  }

  /* ---------- acciones de cuenta ---------- */
  function exigirIniciado() { return Cuenta.iniciar(); }
  Cuenta.registrar = async function (nombre, pass, o) {
    await exigirIniciado(); o = o || {};
    var e = L.validarNombre(nombre) || L.validarContrasena(pass, nombre);
    if (e) throw L.error('nombre_invalido', e);
    var n = L.normalizarNombre(nombre);
    var color = o.color || L.COLORES[Math.floor(Math.random() * L.COLORES.length)];
    var avatar = o.avatar || L.AVATARES[Math.floor(Math.random() * L.AVATARES.length)];
    await A.registrar(n, pass, o.recordar !== false, { color: color, avatar: avatar });
    return usr;
  };
  Cuenta.entrar = async function (nombre, pass, o) {
    await exigirIniciado(); o = o || {};
    var esCorreo = String(nombre).indexOf('@') >= 0;
    if (esCorreo ? !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(nombre).trim()) : L.validarNombre(nombre)) throw L.error('credenciales');
    await A.entrar(esCorreo ? String(nombre).trim() : L.normalizarNombre(nombre), pass, o.recordar !== false, esCorreo);
    return usr;
  };
  Cuenta.salir = async function () {
    await exigirIniciado();
    try { await volcarXp(); } catch (e) {}
    try { await A.presenciaBorrar(); } catch (e) {}
    await A.salir();
  };
  Cuenta.cambiarContrasena = async function (actual, nueva) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    var e = L.validarContrasena(nueva, usr.usuario); if (e) throw L.error('nombre_invalido', e);
    await A.cambiarContrasena(actual, nueva);
  };
  Cuenta.borrarCuenta = async function (pass) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    var uid = usr.uid; sumaXp = {}; clearTimeout(tXp);
    try { localStorage.removeItem('cuenta_cola_' + uid); } catch (e) {}
    detenerServicios();
    await A.borrarCuenta(pass, (await tablaJuegos()).claves());
  };
  Cuenta.actualizarPerfil = async function (cambios) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    var c = {};
    if (cambios.nombre != null) { var e = L.validarNombreVisible(cambios.nombre); if (e) throw L.error('nombre_invalido', e); c.nombre = String(cambios.nombre).trim(); }
    if (cambios.color != null) { if (!/^#[0-9a-f]{6}$/i.test(cambios.color)) throw L.error('nombre_invalido', 'Color no válido.'); c.color = cambios.color.toLowerCase(); }
    if (cambios.avatar != null) { if (L.AVATARES.indexOf(cambios.avatar) < 0) throw L.error('nombre_invalido', 'Avatar no válido.'); c.avatar = cambios.avatar; }
    await A.guardarPerfil(c);
    Object.assign(usr, c); usr = armarUsuario({ uid: usr.uid, nombreLower: usr.usuario, nombre: usr.nombre, color: usr.color, avatar: usr.avatar, xp: usr.xp, creado: usr.creado, correo: usr.correo });
    sincronizarPerfilLocal(); emit('perfil', usr);
    return usr;
  };
  Cuenta.vincularCorreo = async function (correo, pass) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correo || '')) throw L.error('correo_invalido');
    await A.vincularCorreo(String(correo).trim(), pass); usr.correo = String(correo).trim(); emit('perfil', usr);
  };
  Cuenta.restablecerContrasena = async function (correo) {
    await exigirIniciado();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correo || '')) throw L.error('correo_invalido');
    await A.restablecer(String(correo).trim());
  };
  Cuenta.nombreDisponible = async function (nombre) {
    await exigirIniciado();
    if (L.validarNombre(nombre)) return null;
    try { return await A.nombreLibre(L.normalizarNombre(nombre)); } catch (e) { return null; }
  };
  Cuenta.exportarDatos = async function () {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    var j = await tablaJuegos(), d = await A.exportar(j.claves());
    d.exportado = new Date().toISOString(); d.aviso = 'Datos de tu cuenta en la plataforma de juegos';
    return d;
  };
  Cuenta.mensajeError = L.mensajeError;

  Cuenta.volver = function () {
    var m = /[?&]volver=([^&]+)/.exec(location.search); if (!m) return '';
    try {
      var u = new URL(decodeURIComponent(m[1]), location.href);
      if (u.origin !== location.origin || !/\/(juego|herramientas)\//.test(u.pathname)) return '';
      return u.href;
    } catch (e) { return ''; }
  };
  /* Protege una pagina: sin sesion redirige al portal con ?volver=. Con CONFIG.permitirInvitado=true resuelve null (modo invitado). */
  Cuenta.requerir = async function (o) {
    o = o || {};
    await Cuenta.iniciar();
    if (usr) return usr;
    if (Cuenta.CONFIG.permitirInvitado || o.redirigir === false) return null;
    location.replace(portalUrl() + '?volver=' + encodeURIComponent(location.href));
    return new Promise(function () {});
  };

  /* ---------- cola offline ---------- */
  async function ejecutarOp(op) {
    var a = op.args;
    if (op.tipo === 'guardar') return A.guardadoSet(a.juego, a.ranura, a.doc);
    if (op.tipo === 'puntaje') return A.puntajeSet(a.clave, a.valor, a.mayor, a.perfil);
    if (op.tipo === 'logro') return A.logroAdd(a.juego, a.id);
    if (op.tipo === 'xp') { await A.sumarXp(a.n); return A.xpJuego(a.juego, a.n); }
  }
  async function conCola(tipo, args, reemplaza) {
    if (!usr) throw L.error('sin_sesion');
    var op = { tipo: tipo, args: args, reemplaza: reemplaza || null, t: Date.now() };
    if (navigator.onLine === false) { cola.agregar(op); emit('cola', cola.tamano()); return { pendiente: true }; }
    try { var r = await ejecutarOp(op); return { pendiente: false, resultado: r }; }
    catch (e) {
      if (e && e.codigo === 'sin_red') { cola.agregar(op); emit('cola', cola.tamano()); return { pendiente: true }; }
      throw e;
    }
  }
  function procesarCola() {
    if (!cola || !usr || navigator.onLine === false || !cola.tamano()) return;
    cola.vaciar(ejecutarOp).then(function () { emit('cola', cola.tamano()); });
  }
  Cuenta.pendientes = function () { return cola ? cola.tamano() : 0; };
  Cuenta.vaciarCola = procesarCola;
  addEventListener('online', function () { setTimeout(procesarCola, 500); });

  /* ---------- nube (guardados) ---------- */
  async function empaquetar(datos) {
    var texto = typeof datos === 'string' ? datos : JSON.stringify(datos);
    var comp = await L.comprimir(JSON.stringify({ s: typeof datos === 'string' ? 1 : 0, v: texto }));
    var trozos = L.fragmentar(comp);
    if (trozos.length > L.MAX_TROZOS) throw L.error('fuera_de_rango', 'El guardado es demasiado grande para la nube.');
    return { trozos: trozos, hash: L.hash(texto) };
  }
  async function desempaquetar(trozos) {
    var o = JSON.parse(await L.descomprimir(L.unir(trozos)));
    return o.s ? o.v : JSON.parse(o.v);
  }
  var okRanura = /^[a-z0-9]{1,12}$/;
  function ranuraDe(o) { var r = (o && o.ranura) || 'principal'; if (r !== 'principal' && !okRanura.test(r)) throw L.error('fuera_de_rango', 'Nombre de ranura no válido (a-z, 0-9, máx. 12).'); return r; }
  Cuenta.nube = {
    guardar: async function (juego, datos, o) {
      await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
      var ranura = ranuraDe(o), p = await empaquetar(datos);
      var r = await conCola('guardar', { juego: juego, ranura: ranura, doc: { version: 1, hash: p.hash, trozos: p.trozos } }, 'g:' + juego + ':' + ranura);
      return { ok: true, pendiente: r.pendiente, hash: p.hash };
    },
    cargar: async function (juego, o) {
      await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
      var d = await A.guardadoGet(juego, ranuraDe(o));
      if (!d) return null;
      var datos = await desempaquetar(d.trozos);
      return o && o.meta ? { datos: datos, actualizado: d.actualizado, hash: d.hash } : datos;
    },
    ranuras: async function (juego) { await exigirIniciado(); if (!usr) throw L.error('sin_sesion'); return A.ranuras(juego); },
    borrar: async function (juego, o) { await exigirIniciado(); if (!usr) throw L.error('sin_sesion'); return A.guardadoBorrar(juego, ranuraDe(o)); },
    /* Sincroniza claves de localStorage del juego con la nube. Devuelve {estado:'igual'|'subido'|'bajado'|'conflicto-nube'|'conflicto-local'|'conflicto-ambos'|'sinRed'|'cancelado'}.
       opciones: {preguntar:true, recargar:false, alConflicto(info)->Promise<'nube'|'local'|'ambos'>}. */
    sincronizar: async function (juego, claves, o) {
      o = o || {};
      await exigirIniciado(); if (!usr) return { estado: 'sinSesion' };
      var metaK = 'cuenta_sync_' + usr.uid + '_' + juego, meta = {};
      try { meta = JSON.parse(localStorage.getItem(metaK) || '{}'); } catch (e) {}
      var local = {}, hayLocal = false;
      claves.forEach(function (k) { var v = localStorage.getItem(k); if (v != null) { local[k] = v; hayLocal = true; } });
      var hashLocal = hayLocal ? L.hashClaves(local) : '';
      var nube;
      try { nube = await A.guardadoGet(juego, 'principal'); } catch (e) { if (e.codigo === 'sin_red') return { estado: 'sinRed' }; throw e; }
      var accion = L.resolverSync({ hayLocal: hayLocal, hayNube: !!nube, hashLocal: hashLocal, hashNube: nube ? nube.hash : '', hashMeta: meta.hash });
      var res = { estado: 'igual' };
      async function subir(extra) {
        var p = await empaquetar(local);
        await A.guardadoSet(juego, 'principal', { version: 1, hash: hashLocal, trozos: p.trozos });
        // el hash de la nube es el del objeto de claves (no el del texto)
        localStorage.setItem(metaK, JSON.stringify({ hash: hashLocal, t: Date.now() })); return extra || 'subido';
      }
      async function bajar() {
        var d = await desempaquetar(nube.trozos);
        L.aplicarBajada(d, claves, localStorage);   // solo las claves de la lista (los ajustes por dispositivo nunca se pisan)
        localStorage.setItem(metaK, JSON.stringify({ hash: nube.hash, t: Date.now() }));
        return 'bajado';
      }
      try {
        if (accion === 'subir') res.estado = await subir();
        else if (accion === 'bajar') res.estado = await bajar();
        else if (accion === 'conflicto') {
          var info = { juego: juego, claves: Object.keys(local), tNube: nube.actualizado, tLocal: meta.t || 0, hashLocal: hashLocal, hashNube: nube.hash };
          var elec = o.alConflicto ? await o.alConflicto(info) : (o.preguntar === false ? (nube.actualizado > (meta.t || 0) ? 'nube' : 'local') : await Cuenta.ui.conflicto(info));
          if (elec === 'nube') { res.estado = await bajar(); res.conflicto = 'nube'; }
          else if (elec === 'local') { res.estado = await subir(); res.conflicto = 'local'; }
          else if (elec === 'ambos') {
            // la version previa de la nube pasa a la ranura "respaldo" y lo local queda como principal
            await A.guardadoSet(juego, 'respaldo', { version: 1, hash: nube.hash, trozos: nube.trozos });
            res.estado = await subir(); res.conflicto = 'ambos';
          } else res.estado = 'cancelado';
        }
      } catch (e) { if (e.codigo === 'sin_red') return { estado: 'sinRed' }; throw e; }
      emit('sincronizado', juego, res);
      if (res.estado === 'bajado' && o.recargar) location.reload();
      return res;
    },
    /* Sincroniza al iniciar, cada cadaMs y al ocultar/cerrar la pagina (esto ultimo solo sube si no hubo cambios en la nube). */
    autoSincronizar: function (juego, claves, o) {
      o = o || {}; var activo = true, ocupado = false;
      function tic() { if (!activo || ocupado || !usr) return Promise.resolve(); ocupado = true; return Cuenta.nube.sincronizar(juego, claves, o).catch(function () {}).then(function (r) { ocupado = false; return r; }); }
      var id = setInterval(tic, o.cadaMs || 60000);
      var vis = function () { if (document.visibilityState === 'hidden') tic(); };
      document.addEventListener('visibilitychange', vis); addEventListener('pagehide', tic);
      var p = tic();
      return { parar: function () { activo = false; clearInterval(id); document.removeEventListener('visibilitychange', vis); removeEventListener('pagehide', tic); }, primera: p, ahora: tic };
    }
  };

  /* ---------- puntajes ---------- */
  function perfilPublico() { return { nombre: usr.nombre, color: usr.color }; }
  async function modoDe(juego, modo, mayorParam) {
    var t = await tablaJuegos(), m = t.modo(juego, modo);
    if (!m) { console.warn('Cuenta.puntaje: modo desconocido ' + juego + '/' + modo + ' (añádelo a plataforma/juegos.js y a firestore.rules)'); throw L.error('modo_desconocido'); }
    return m;
  }
  Cuenta.puntaje = async function (juego, modo, valor, o) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    var m = await modoDe(juego, modo);
    valor = +valor;
    if (!isFinite(valor) || valor < (m.min || 0) || valor > m.tope) throw L.error('fuera_de_rango');
    valor = Math.round(valor * 100) / 100;
    var clave = juego + '__' + modo;
    var r = await conCola('puntaje', { clave: clave, valor: valor, mayor: m.mayorEsMejor, perfil: perfilPublico() }, null);
    emit('puntaje', juego, modo, valor);
    return { pendiente: r.pendiente, mejoro: r.resultado ? r.resultado.mejoro : null, valor: valor };
  };
  Cuenta.top = async function (juego, modo, n, o) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    o = o || {}; n = Math.max(1, Math.min(100, n || 10));
    var m = await modoDe(juego, modo), clave = juego + '__' + modo, lista;
    if (o.soloAmigos) {
      var uids = [usr.uid].concat(amigosEstado.lista.map(function (a) { return a.uid; }));
      lista = L.ordenarRanking(await A.puntajesDe(clave, uids), m.mayorEsMejor, n);
    } else lista = L.ordenarRanking(await A.puntajeTop(clave, n, m.mayorEsMejor), m.mayorEsMejor, n);
    return lista.map(function (e) { e.yo = e.uid === usr.uid; return e; });
  };
  Cuenta.miMejor = async function (juego, modo) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    await modoDe(juego, modo); return A.puntajeDe(juego + '__' + modo, usr.uid);
  };
  Cuenta.miPosicion = async function (juego, modo) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    var m = await modoDe(juego, modo), clave = juego + '__' + modo;
    var mio = await A.puntajeDe(clave, usr.uid);
    if (!mio) return { posicion: null, valor: null, total: await A.puntajeTotal(clave) };
    var mejores = await A.puntajeContarMejores(clave, mio.valor, m.mayorEsMejor);
    return { posicion: mejores + 1, valor: mio.valor, total: await A.puntajeTotal(clave) };
  };

  /* ---------- logros y XP ---------- */
  Cuenta.logro = async function (juego, id) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    id = String(id);
    if (!/^[a-z0-9_]{1,40}$/.test(id)) throw L.error('fuera_de_rango', 'Id de logro no válido.');
    var l = logrosCache[juego] = logrosCache[juego] || [];
    if (l.indexOf(id) >= 0) return false;
    if (l.length >= 100) return false;
    l.push(id);
    var def = null;
    try { var t = await tablaJuegos(), j = t.juego(juego); def = j && j.logros.filter(function (x) { return x.id === id; })[0]; } catch (e) {}
    emit('logro', juego, id, def);
    try { await conCola('logro', { juego: juego, id: id }, null); } catch (e) { console.warn(e); }
    Cuenta.xp(juego, 25);
    return true;
  };
  Cuenta.logros = function (juego) { return juego ? (logrosCache[juego] || []).slice() : JSON.parse(JSON.stringify(logrosCache)); };
  Cuenta.cargarLogros = async function () { await exigirIniciado(); if (!usr) return {}; var d = await A.logrosGet(); return d || {}; };
  Cuenta.xpJuego = function (juego) { return +(xpJuegoCache[juego] || 0); };
  Cuenta.ultimoJuego = function () { return ultimoJuego; };
  Cuenta.xp = function (juego, cantidad) {
    cantidad = Math.floor(+cantidad || 0);
    if (!usr || cantidad < 1) return;
    cantidad = Math.min(cantidad, 1000);
    sumaXp[juego] = (sumaXp[juego] || 0) + cantidad;
    var antes = usr.nivel;
    usr = armarUsuario({ uid: usr.uid, nombreLower: usr.usuario, nombre: usr.nombre, color: usr.color, avatar: usr.avatar, xp: usr.xp + cantidad, creado: usr.creado, correo: usr.correo });
    xpJuegoCache[juego] = (xpJuegoCache[juego] || 0) + cantidad;
    emit('perfil', usr); emit('xp', juego, cantidad); if (usr.nivel > antes) emit('nivel', usr.nivel);
    clearTimeout(tXp); tXp = setTimeout(volcarXp, 12000);
  };
  function volcarXp() {
    clearTimeout(tXp);
    var s = sumaXp; sumaXp = {};
    return Promise.all(Object.keys(s).map(function (j) { return conCola('xp', { juego: j, n: s[j] }, null).catch(function (e) { console.warn(e); }); }));
  }
  Cuenta.volcarXp = volcarXp;
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') volcarXp(); });
  addEventListener('pagehide', volcarXp);

  /* ---------- presencia ---------- */
  function enviarPresencia() {
    if (!usr || !A) return;
    A.presenciaSet(estadoPres.estado, estadoPres.juego).then(function (d) { if (typeof d === 'number') desfaseServidor = d; }).catch(function () {});
  }
  function iniciarPresencia() {
    var j = Cuenta.juegoActual();
    estadoPres = j ? { estado: 'jugando', juego: j } : { estado: 'en_linea', juego: '' };
    enviarPresencia();
    // la pagina anterior puede borrar su presencia al cerrarse (pagehide) despues de que esta escriba: se reafirma
    [2500, 7000].forEach(function (ms) { var id = setTimeout(enviarPresencia, ms); srvDesc.push(function () { clearTimeout(id); }); });
    latido = setInterval(function () { if (document.visibilityState === 'visible') enviarPresencia(); }, 60000);
    document.addEventListener('visibilitychange', alVisibilidad);
    addEventListener('pagehide', alSalir);
  }
  function alVisibilidad() {
    if (!usr) return;
    if (document.visibilityState === 'hidden') { if (A) A.presenciaSet('ausente', estadoPres.juego).catch(function () {}); }
    else enviarPresencia();
  }
  function alSalir() { if (A && usr) A.presenciaBorrar().catch(function () {}); }
  function detenerPresencia() {
    clearInterval(latido); latido = 0; document.removeEventListener('visibilitychange', alVisibilidad); removeEventListener('pagehide', alSalir);
  }
  Cuenta.presencia = function (estado, o) {
    if (['en_linea', 'jugando', 'ausente'].indexOf(estado) < 0) return;
    estadoPres = { estado: estado, juego: (o && o.juego) || '' };
    enviarPresencia();
  };

  /* ---------- amigos ---------- */
  var amigosEstado = { lista: [], solicitudes: [], enviadas: [] }, relaciones = [], perfilesAmigos = {}, presAmigos = {}, desPres = null, uidsEscuchados = '';
  function estadoAmigo(uid) {
    var p = presAmigos[uid];
    if (!p || !L.presenciaVigente({ t: p.t }, ahora())) return { estado: 'desconectado', juego: '' };
    return { estado: p.estado, juego: p.juego || '' };
  }
  function recomponer() {
    function dato(uid) { var p = perfilesAmigos[uid] || {}; return { uid: uid, nombre: p.nombre || '…', color: p.color || '#9a8cff', avatar: p.avatar || 'a1', nivel: p.nivel || 1 }; }
    var am = relaciones.filter(function (r) { return r.estado === 'amigos'; }).map(function (r) { return Object.assign(dato(r.uid), estadoAmigo(r.uid), { desde: r.desde }); });
    var orden = { jugando: 0, en_linea: 1, ausente: 2, desconectado: 3 };
    am.sort(function (a, b) { return orden[a.estado] - orden[b.estado] || a.nombre.localeCompare(b.nombre); });
    amigosEstado.lista = am;
    amigosEstado.solicitudes = relaciones.filter(function (r) { return r.estado === 'recibida'; }).map(function (r) { return Object.assign(dato(r.uid), { desde: r.desde }); });
    amigosEstado.enviadas = relaciones.filter(function (r) { return r.estado === 'enviada'; }).map(function (r) { return Object.assign(dato(r.uid), { desde: r.desde }); });
    emit('amigos', amigosEstado);
  }
  function iniciarAmigos() {
    Cuenta.amigos._unsub = A.escucharAmigos(function (rels) {
      relaciones = rels;
      var uids = rels.map(function (r) { return r.uid; });
      uids.filter(function (u) { return !perfilesAmigos[u]; }).forEach(function (u) { perfilesAmigos[u] = { nombre: '…' }; A.perfil(u).then(function (p) { if (p) { perfilesAmigos[u] = p; recomponer(); } }).catch(function () { delete perfilesAmigos[u]; }); });
      var amigosUids = rels.filter(function (r) { return r.estado === 'amigos'; }).map(function (r) { return r.uid; }).sort();
      var clave = amigosUids.join(',');
      if (clave !== uidsEscuchados) {
        uidsEscuchados = clave; if (desPres) desPres();
        desPres = A.escucharPresencia(amigosUids, function (mapa) { presAmigos = mapa; recomponer(); });
      }
      recomponer();
    });
    srvDesc.push(setIntervalDesc(recomponer, 30000));
  }
  function relDe(uid) { return relaciones.filter(function (r) { return r.uid === uid; })[0]; }
  Cuenta.amigos = {
    get lista() { return amigosEstado.lista; }, get solicitudes() { return amigosEstado.solicitudes; }, get enviadas() { return amigosEstado.enviadas; },
    alCambiar: function (fn) { var u = on('amigos', fn); try { fn(amigosEstado); } catch (e) {} return u; },
    buscar: async function (nombre) {
      await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
      var n = L.normalizarNombre(nombre); if (L.validarNombre(n)) return null;
      return A.buscar(n);
    },
    enviar: async function (nombre) {
      var p = await Cuenta.amigos.buscar(nombre);
      if (!p) throw L.error('no_existe');
      if (p.uid === usr.uid) throw L.error('a_ti_mismo');
      var r = relDe(p.uid);
      if (r) {
        if (r.estado === 'amigos') throw L.error('ya_amigos');
        if (r.estado === 'enviada') throw L.error('ya_enviada');
        if (r.estado === 'recibida') { await Cuenta.amigos.aceptar(p.uid); return { aceptada: true, perfil: p }; }
      }
      await A.amigoEnviar(p.uid);
      return { aceptada: false, perfil: p };
    },
    aceptar: async function (uid) { await exigirIniciado(); return A.amigoAceptar(uid); },
    rechazar: async function (uid) { await exigirIniciado(); return A.amigoQuitar(uid); },
    quitar: async function (uid) { await exigirIniciado(); return A.amigoQuitar(uid); },
    refrescar: async function () { perfilesAmigos = {}; if (A) { relaciones.forEach(function (r) { A.perfil(r.uid).then(function (p) { if (p) { perfilesAmigos[r.uid] = p; recomponer(); } }); }); } },
    _unsub: null
  };

  /* ---------- invitaciones ---------- */
  var invitacionesEntrantes = [], notificadas = {};
  function iniciarInvitaciones() {
    srvDesc.push(A.escucharInvitaciones(function (lista) {
      var ya = Date.now();
      invitacionesEntrantes = lista.filter(function (i) { return L.invitacionVigente(i, ya + desfaseServidor); });
      invitacionesEntrantes.forEach(function (i) { if (!notificadas[i.id]) { notificadas[i.id] = 1; emit('invitacion', i); } });
      emit('invitaciones', invitacionesEntrantes);
    }));
    srvDesc.push(setIntervalDesc(function () {
      var n = invitacionesEntrantes.length;
      invitacionesEntrantes = invitacionesEntrantes.filter(function (i) { return L.invitacionVigente(i, Date.now() + desfaseServidor); });
      if (n !== invitacionesEntrantes.length) emit('invitaciones', invitacionesEntrantes);
    }, 5000));
  }
  Object.defineProperty(Cuenta, 'invitaciones', { get: function () { return invitacionesEntrantes.slice(); } });
  Cuenta.alInvitacion = function (fn) { return on('invitacion', fn); };
  /* Invita a un amigo: oferta = codigo de Red.invitar(). Devuelve {id, uid, expira}. */
  Cuenta.invitar = async function (uid, juego, oferta) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    var r = relDe(uid);
    if (!r || r.estado !== 'amigos') throw L.error('no_amigo');
    if (typeof oferta !== 'string' || !oferta || oferta.length > 4000) throw L.error('fuera_de_rango');
    var id = await A.invitacionCrear(uid, { de: usr.uid, nombre: usr.nombre, color: usr.color, avatar: usr.avatar, juego: juego, oferta: oferta });
    return { id: id, uid: uid, expira: Date.now() + L.TTL_INVITACION };
  };
  /* fn({estado:'pendiente'|'aceptada'|'rechazada'|'cancelada', respuesta}) cada vez que cambie; devuelve la funcion para dejar de escuchar. */
  Cuenta.escucharRespuesta = function (uid, id, fn) { return A.escucharInvitacion(uid, id, fn); };
  Cuenta.responderInvitacion = async function (invOId, aceptar, respuesta) {
    await exigirIniciado(); if (!usr) throw L.error('sin_sesion');
    var id = typeof invOId === 'string' ? invOId : invOId.id;
    await A.invitacionResponder(id, aceptar ? 'aceptada' : 'rechazada', aceptar ? String(respuesta || '') : '');
    invitacionesEntrantes = invitacionesEntrantes.filter(function (i) { return i.id !== id; }); emit('invitaciones', invitacionesEntrantes);
  };
  Cuenta.cancelarInvitacion = async function (uid, id) { await exigirIniciado(); return A.invitacionCancelar(uid, id); };
  Cuenta.borrarInvitacion = async function (uid, id) { await exigirIniciado(); return A.invitacionBorrar(uid, id); };

  /* ---------- UI comun: avisos, modal, conflicto, avatares, navegacion con mando ---------- */
  var UI = Cuenta.ui;
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in props || {}) { if (k === 'cls') e.className = props[k]; else if (k === 'txt') e.textContent = props[k]; else if (k === 'on') { for (var ev in props.on) e.addEventListener(ev, props.on[ev]); } else e.setAttribute(k, props[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  UI.h = h;
  UI.aviso = function (texto, o) {
    cargarCss('cuenta.css'); o = o || {};
    var cont = document.querySelector('.cu-avisos');
    if (!cont) { cont = h('div', { cls: 'cu-avisos', 'aria-live': 'polite' }); document.body.appendChild(cont); }
    var t = h('div', { cls: 'cu-aviso', style: '--c:' + (o.color || '#3df5ff') }, [o.titulo ? h('b', { txt: o.titulo }) : null, h('span', { txt: texto })]);
    cont.appendChild(t); setTimeout(function () { t.classList.add('cu-sale'); setTimeout(function () { t.remove(); }, 300); }, o.ms || 3500);
    return t;
  };
  var AV = {
    a1: '<circle cx="50" cy="50" r="30"/>', a2: '<path d="M50 14 L88 80 H12 Z"/>', a3: '<rect x="20" y="20" width="60" height="60" rx="10"/>',
    a4: '<path d="M50 10 L61 38 L91 38 L67 56 L76 86 L50 68 L24 86 L33 56 L9 38 L39 38 Z"/>', a5: '<path d="M50 10 L84 30 V70 L50 90 L16 70 V30 Z"/>',
    a6: '<circle cx="50" cy="50" r="22"/><ellipse cx="50" cy="50" rx="42" ry="12" fill="none" stroke-width="6" transform="rotate(-25 50 50)"/>',
    a7: '<path d="M22 84 V46 A28 28 0 0 1 78 46 V84 L65 72 L50 84 L35 72 Z"/>', a8: '<path d="M50 12 L86 50 L50 88 L14 50 Z"/>',
    a9: '<circle cx="50" cy="50" r="34" fill="none" stroke-width="10"/><circle cx="50" cy="50" r="10"/>', a10: '<path d="M14 70 L50 14 L86 70 L50 56 Z"/>',
    a11: '<path d="M30 80 L30 40 L50 20 L70 40 L70 80 Z"/><rect x="43" y="52" width="14" height="16" fill="#05030f"/>', a12: '<path d="M50 86 C10 56 14 22 36 22 C44 22 50 28 50 34 C50 28 56 22 64 22 C86 22 90 56 50 86 Z"/>'
  };
  UI.avatarSvg = function (avatar, color, px) {
    color = /^#[0-9a-f]{6}$/i.test(color) ? color : '#9a8cff';
    return '<svg viewBox="0 0 100 100" width="' + (px || 40) + '" height="' + (px || 40) + '" aria-hidden="true" focusable="false"><rect width="100" height="100" rx="22" fill="#0b0720"/><g fill="' + color + '" stroke="' + color + '" stroke-width="0" style="filter:drop-shadow(0 0 4px ' + color + ')">' + (AV[avatar] || AV.a1) + '</g></svg>';
  };
  UI.avatarEl = function (avatar, color, px) { var d = h('span', { cls: 'cu-avatar', style: 'width:' + (px || 40) + 'px;height:' + (px || 40) + 'px' }); d.innerHTML = UI.avatarSvg(avatar, color, px); return d; };

  // Navegacion con mando: pila de ambitos; el ultimo manda. Solo si UI.mandoPropio (portal) y no hay lobby abierto.
  var pilaMando = [], rafMando = 0, dirM = '', repiteM = 0, bloqueoM = true;
  function centro(e) { var r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function moverFoco(lista, dir) {
    var act = lista.indexOf(document.activeElement) >= 0 ? document.activeElement : null;
    if (!act) { if (lista[0]) { lista[0].focus({ preventScroll: true }); lista[0].scrollIntoView({ block: 'nearest' }); } return; }
    var c0 = centro(act), r0 = act.getBoundingClientRect(), vx = dir === 'D' ? 1 : dir === 'I' ? -1 : 0, vy = dir === 'B' ? 1 : dir === 'A' ? -1 : 0, mejor = null, mp = Infinity;
    lista.forEach(function (e) {
      if (e === act) return;
      var r = e.getBoundingClientRect(), c = centro(e), dx = c.x - c0.x, dy = c.y - c0.y, a = dx * vx + dy * vy;
      if (a <= 2) return;
      var cruz = Math.abs(dx * vy) + Math.abs(dy * vx), solapa = vx ? (r.top < r0.bottom - 4 && r.bottom > r0.top + 4) : (r.left < r0.right - 4 && r.right > r0.left + 4);
      if (vx && !solapa) { cruz *= 4; if (cruz > 160) return; }
      var p = a + cruz * (solapa ? 0.5 : 2); if (p < mp) { mp = p; mejor = e; }
    });
    if (mejor) { mejor.focus({ preventScroll: true }); mejor.scrollIntoView({ block: 'nearest' }); }
  }
  function bucleMando() {
    rafMando = requestAnimationFrame(bucleMando);
    var M = G.Mando; if (!M || !pilaMando.length) return;
    if (G.Lobby && G.Lobby.abierto) return;
    M.leer();
    if (!M.conectado) { dirM = ''; return; }
    var t = performance.now();
    document.body.classList.toggle('conMando', M.activo);
    if (M.activo && t - M._ultimoUso < 150) document.body.classList.add('navMando');
    var amb = pilaMando[pilaMando.length - 1], d = '';
    if (M.sostenido('ARRIBA')) d = 'A'; else if (M.sostenido('ABAJO')) d = 'B'; else if (M.sostenido('IZQ')) d = 'I'; else if (M.sostenido('DER')) d = 'D';
    else { var x = M.ejes.izq.x, y = M.ejes.izq.y; if (Math.hypot(x, y) > 0.45) d = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'D' : 'I') : (y > 0 ? 'B' : 'A'); }
    var lista = amb.enfocables().filter(function (e) { return !e.disabled && e.offsetParent !== null; });
    if (!d) dirM = ''; else if (d !== dirM) { dirM = d; repiteM = t + 380; moverFoco(lista, d); } else if (t >= repiteM) { repiteM = t + 140; moverFoco(lista, d); }
    if (bloqueoM) { if (!['A', 'B', 'X', 'Y', 'MENU', 'LB', 'RB'].some(function (n) { return M.sostenido(n); })) bloqueoM = false; return; }
    if (M.pulsado('A')) { var f = document.activeElement; if (f && lista.indexOf(f) >= 0) { f.click(); if (f.tagName === 'INPUT' || f.tagName === 'TEXTAREA') f.focus(); } else if (lista[0]) lista[0].focus(); }
    if (M.pulsado('B') && amb.atras) amb.atras();
    if (amb.boton) ['LB', 'RB', 'X', 'Y', 'VISTA', 'MENU'].forEach(function (n) { if (M.pulsado(n)) amb.boton(n); });
  }
  UI.mando = {
    /* ambito = {enfocables:()=>[elementos], atras:fn, boton:fn(nombre)}; devuelve la funcion para retirarlo */
    ocupado: function () { return pilaMando.length > 0; }, // hay un dialogo manejado con mando (amigos.js cede A/B)
    empujar: function (amb) {
      if (!UI.mandoPropio) return function () {};
      pilaMando.push(amb); bloqueoM = true;
      if (!rafMando) rafMando = requestAnimationFrame(bucleMando);
      return function () { var i = pilaMando.indexOf(amb); if (i >= 0) pilaMando.splice(i, 1); bloqueoM = true; };
    }
  };

  /* Modal generico: UI.modal({titulo, contenido:Node, botones:[{txt,cls,valor}], alCerrar}) -> {cerrar(valor), promesa} */
  UI.modal = function (o) {
    cargarCss('cuenta.css');
    var previo = document.activeElement, quitarMando = null, fin;
    var promesa = new Promise(function (ok) { fin = ok; });
    var cuerpo = h('div', { cls: 'cu-cuerpo' }, [o.contenido]);
    var pie = h('div', { cls: 'cu-pie' }), titulo = h('h2', { cls: 'cu-titulo', id: 'cu-t' + Date.now(), txt: o.titulo || '' });
    var tarjeta = h('div', { cls: 'cu-tarjeta', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titulo.id }, [titulo, cuerpo, pie]);
    var fondo = h('div', { cls: 'cu-fondo' }, [tarjeta]);
    function cerrar(v) { quitarMando && quitarMando(); fondo.remove(); document.removeEventListener('keydown', tecla, true); if (previo && previo.focus) try { previo.focus({ preventScroll: true }); } catch (e) {} fin(v); if (o.alCerrar) o.alCerrar(v); }
    (o.botones || []).forEach(function (b) { pie.appendChild(h('button', { type: 'button', cls: 'cu-btn ' + (b.cls || ''), txt: b.txt, 'data-f': 1, on: { click: function () { cerrar(b.valor); } } })); });
    function enf() { return Array.prototype.slice.call(tarjeta.querySelectorAll('button,input,select,textarea,a[href],[data-f]')).filter(function (e) { return !e.disabled && e.offsetParent !== null; }); }
    function tecla(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(o.valorAtras); }
      else if (e.key === 'Tab') { var l = enf(); if (!l.length) return; var i = l.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); l[l.length - 1].focus(); } else if (!e.shiftKey && i === l.length - 1) { e.preventDefault(); l[0].focus(); } }
    }
    document.addEventListener('keydown', tecla, true);
    document.body.appendChild(fondo);
    quitarMando = UI.mando.empujar({ enfocables: enf, atras: function () { cerrar(o.valorAtras); } });
    setTimeout(function () { var l = enf(); var pref = tarjeta.querySelector('[data-inicial]') || l[0]; if (pref) pref.focus({ preventScroll: true }); }, 30);
    return { cerrar: cerrar, promesa: promesa, tarjeta: tarjeta };
  };
  UI.conflicto = function (info) {
    var f = function (t) { return t ? new Date(t).toLocaleString('es') : 'nunca'; };
    var c = h('div', {}, [
      h('p', { txt: 'Tu progreso de este dispositivo y el de tu cuenta son diferentes y los dos cambiaron.' }),
      h('p', { cls: 'cu-peq', txt: 'Nube: guardado el ' + f(info.tNube) + '. Este dispositivo: última sincronización el ' + f(info.tLocal) + '.' }),
      h('p', { cls: 'cu-peq', txt: '«Conservar ambos» deja tu progreso local como principal y guarda la versión de la nube en la ranura «respaldo».' })]);
    return UI.modal({ titulo: 'Conflicto de guardado', contenido: c, valorAtras: null, botones: [
      { txt: 'Usar nube', valor: 'nube', cls: 'cu-sec' }, { txt: 'Usar este dispositivo', valor: 'local', cls: 'cu-sec' }, { txt: 'Conservar ambos', valor: 'ambos', cls: 'cu-prim' }, { txt: 'Decidir luego', valor: null, cls: 'cu-sec' }] }).promesa;
  };

  Cuenta.cargarAmigosUI = function () { cargarCss('cuenta.css'); return window.Amigos ? Promise.resolve(window.Amigos) : cargarScript(BASE + 'amigos.js').then(function () { return window.Amigos; }); };
  Cuenta._ahora = ahora;
})(typeof window !== 'undefined' ? window : globalThis);
