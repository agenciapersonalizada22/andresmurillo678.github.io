/* Logica pura del panel de dispositivos (sin DOM): conversiones, parsers, formateadores, validacion y errores. window.DispPuro */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.DispPuro = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var P = {};
  P.BAUDIOS = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
  var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

  /* ---------- bytes ---------- */
  P.parseHex = function (s) {
    s = String(s).replace(/0x/gi, '').replace(/[\s,:;-]+/g, '');
    if (!s) return new Uint8Array(0);
    if (!/^[0-9a-fA-F]+$/.test(s)) throw new Error('Hex inválido: usa solo 0-9 y A-F.');
    if (s.length % 2) throw new Error('Hex con cantidad impar de dígitos.');
    var u = new Uint8Array(s.length / 2); for (var i = 0; i < u.length; i++) u[i] = parseInt(s.substr(i * 2, 2), 16); return u;
  };
  P.aHex = function (u, sep) { var o = []; for (var i = 0; i < u.length; i++) o.push((u[i] < 16 ? '0' : '') + u[i].toString(16).toUpperCase()); return o.join(sep == null ? ' ' : sep); };
  P.aAscii = function (u) { var o = ''; for (var i = 0; i < u.length; i++) o += u[i] >= 32 && u[i] < 127 ? String.fromCharCode(u[i]) : '.'; return o; };
  P.volcado = function (u) {
    var l = []; for (var i = 0; i < u.length; i += 16) { var t = u.subarray(i, i + 16); l.push(('0000' + i.toString(16)).slice(-4) + '  ' + (P.aHex(t) + '                                                ').slice(0, 47) + '  |' + P.aAscii(t) + '|'); } return l.join('\n');
  };
  /* escapes de texto para enviar: \n \r \t \0 \\ \xNN */
  P.escapes = function (s) {
    return String(s).replace(/\\(x[0-9a-fA-F]{2}|[nrt0\\])/g, function (m, c) { return c[0] === 'x' ? String.fromCharCode(parseInt(c.slice(1), 16)) : { n: '\n', r: '\r', t: '\t', '0': '\0', '\\': '\\' }[c]; });
  };
  P.FINES = { ninguno: '', lf: '\n', cr: '\r', crlf: '\r\n' };
  /* datos de usuario -> Uint8Array. Admite string, bytes, array de numeros o {hex:'..'} */
  P.aBytes = function (d) {
    if (d == null) return new Uint8Array(0);
    if (d instanceof Uint8Array) return d;
    if (typeof ArrayBuffer !== 'undefined' && d instanceof ArrayBuffer) return new Uint8Array(d);
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    if (Array.isArray(d)) return Uint8Array.from(d);
    if (typeof d === 'object' && d.hex != null) return P.parseHex(d.hex);
    if (typeof d === 'object') return enc.encode(JSON.stringify(d));
    return enc.encode(String(d));
  };
  P.decodificador = function () {
    var dec = new TextDecoder('utf-8', { fatal: false });
    return { push: function (u) { return dec.decode(u, { stream: true }); } };
  };
  /* divide un flujo de texto en lineas (\n, \r o \r\n, incluso partidas entre trozos) */
  P.LineaBuf = function () { this.b = ''; };
  P.LineaBuf.prototype.push = function (s) {
    this.b += s; var sal = [], m;
    for (;;) {
      m = /\r\n|\n|\r/.exec(this.b); if (!m) break;
      if (m[0] === '\r' && m.index === this.b.length - 1) break;   // puede venir \n en el siguiente trozo
      sal.push(this.b.slice(0, m.index)); this.b = this.b.slice(m.index + m[0].length);
    }
    return sal;
  };
  P.LineaBuf.prototype.resto = function () { var r = this.b; this.b = ''; return r; };
  P.formatoBytes = function (n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; };
  P.duracion = function (ms) { var s = Math.round(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60); return h ? h + ' h ' + (m % 60) + ' min' : m ? m + ' min ' + (s % 60) + ' s' : s + ' s'; };
  P.hexId = function (n) { return '0x' + ('0000' + (n >>> 0).toString(16).toUpperCase()).slice(-4); };

  /* ---------- Bluetooth GATT ---------- */
  var BASE = '-0000-1000-8000-00805f9b34fb';
  P.uuid = function (x) {
    if (typeof x === 'number') return ('00000000' + x.toString(16)).slice(-8) + BASE;
    var s = String(x).trim().toLowerCase().replace(/^0x/, '');
    if (/^[0-9a-f]{4}$/.test(s)) return '0000' + s + BASE;
    if (/^[0-9a-f]{8}$/.test(s)) return s + BASE;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) return s;
    throw new Error('UUID inválido: «' + x + '». Usa 4 u 8 dígitos hex, o el formato completo.');
  };
  P.uuidCorto = function (u) { var m = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/.exec(u); return m ? m[1] : u; };
  var SERV = { '1800': 'Acceso genérico', '1801': 'Atributo genérico', '1805': 'Hora actual', '1809': 'Termómetro de salud', '180a': 'Información del dispositivo', '180d': 'Frecuencia cardíaca', '180f': 'Batería', '1812': 'Dispositivo HID', '1816': 'Velocidad y cadencia', '1818': 'Potencia de ciclismo', '1819': 'Localización y navegación', '181a': 'Sensor ambiental', '181d': 'Báscula', '6e400001-b5a3-f393-e0a9-e50e24dcca9e': 'UART Nordic (NUS)' };
  var CAR = { '2a00': 'Nombre del dispositivo', '2a01': 'Apariencia', '2a19': 'Nivel de batería', '2a24': 'Número de modelo', '2a25': 'Número de serie', '2a26': 'Versión de firmware', '2a27': 'Versión de hardware', '2a28': 'Versión de software', '2a29': 'Fabricante', '2a37': 'Medición de frecuencia cardíaca', '2a6e': 'Temperatura', '2a6f': 'Humedad', '6e400002-b5a3-f393-e0a9-e50e24dcca9e': 'NUS RX (escribir)', '6e400003-b5a3-f393-e0a9-e50e24dcca9e': 'NUS TX (notificar)' };
  P.SERVICIOS_COMUNES = ['1800', '1801', '180a', '180d', '180f', '1809', '181a', '6e400001-b5a3-f393-e0a9-e50e24dcca9e'];
  P.nombreServicio = function (u) { return SERV[P.uuidCorto(u)] || ''; };
  P.nombreCaracteristica = function (u) { return CAR[P.uuidCorto(u)] || ''; };
  P.propsLista = function (p) {
    var o = []; if (!p) return o;
    if (p.read) o.push('leer'); if (p.write) o.push('escribir'); if (p.writeWithoutResponse) o.push('escribir sin respuesta');
    if (p.notify) o.push('notificar'); if (p.indicate) o.push('indicar'); return o;
  };
  /* interpreta el valor de caracteristicas conocidas; si no, hex */
  P.interpretar = function (uuid, u) {
    var c = P.uuidCorto(uuid);
    if (c === '2a19' && u.length >= 1) return u[0] + ' %';
    if (c === '2a37' && u.length >= 2) { var w16 = u[0] & 1; return (w16 ? u[1] | u[2] << 8 : u[1]) + ' lpm'; }
    if (/^2a(00|24|25|26|27|28|29)$/.test(c)) return new TextDecoder().decode(u);
    if (c === '2a6e' && u.length >= 2) return ((u[0] | u[1] << 8) << 16 >> 16) / 100 + ' °C';
    if (c === '2a6f' && u.length >= 2) return (u[0] | u[1] << 8) / 100 + ' %';
    return P.aHex(u);
  };

  /* ---------- USB / HID ---------- */
  var CLASES = { 0: 'Definida por interfaz', 1: 'Audio', 2: 'Comunicaciones (CDC)', 3: 'HID', 5: 'Físico', 6: 'Imagen', 7: 'Impresora', 8: 'Almacenamiento', 9: 'Hub', 10: 'Datos CDC', 11: 'Tarjeta inteligente', 14: 'Video', 224: 'Inalámbrico', 239: 'Misceláneo', 254: 'Específica de aplicación', 255: 'Específica del fabricante' };
  P.claseUSB = function (c) { return CLASES[c] || 'Clase ' + c; };
  P.formatearUSB = function (d) {
    var l = [], ver = (d.usbVersionMajor != null ? d.usbVersionMajor + '.' + d.usbVersionMinor : '?');
    l.push((d.productName || 'Dispositivo USB') + (d.manufacturerName ? ' · ' + d.manufacturerName : ''));
    l.push('VID ' + P.hexId(d.vendorId) + '  PID ' + P.hexId(d.productId) + '  USB ' + ver + (d.serialNumber ? '  Serie ' + d.serialNumber : ''));
    l.push('Clase de dispositivo: ' + P.claseUSB(d.deviceClass) + ' (' + d.deviceClass + ')');
    (d.configurations || []).forEach(function (c) {
      l.push('Configuración ' + c.configurationValue + (c.configurationName ? ' «' + c.configurationName + '»' : ''));
      (c.interfaces || []).forEach(function (i) {
        (i.alternates || []).forEach(function (a) {
          l.push('  Interfaz ' + i.interfaceNumber + (a.alternateSetting ? '.' + a.alternateSetting : '') + (i.claimed ? ' [reclamada]' : '') + ' · ' + P.claseUSB(a.interfaceClass) + ' sub ' + a.interfaceSubclass + ' prot ' + a.interfaceProtocol);
          (a.endpoints || []).forEach(function (e) { l.push('    Endpoint ' + e.endpointNumber + ' ' + (e.direction === 'in' ? 'IN ' : 'OUT') + ' · ' + e.type + ' · paquete ' + e.packetSize + ' B'); });
        });
      });
    });
    return l;
  };
  var PAGINAS = { 1: 'Escritorio genérico', 2: 'Simulación', 3: 'Realidad virtual', 4: 'Deportes', 5: 'Juegos', 6: 'Dispositivo genérico', 7: 'Teclado', 8: 'LED', 9: 'Botones', 11: 'Telefonía', 12: 'Consumidor', 13: 'Digitalizador', 32: 'Sensores', 65: 'Báscula' };
  P.paginaHID = function (n) { return n >= 0xFF00 ? 'Específica del fabricante' : (PAGINAS[n] || 'Página ' + P.hexId(n)); };
  P.formatearHID = function (d) {
    var l = ['HID · ' + (d.productName || 'dispositivo') + '  VID ' + P.hexId(d.vendorId) + '  PID ' + P.hexId(d.productId)];
    function col(c, n) {
      var pad = new Array(n + 1).join('  ');
      l.push(pad + 'Colección ' + P.paginaHID(c.usagePage) + ' / uso ' + P.hexId(c.usage) + (c.type != null ? ' · tipo ' + c.type : ''));
      [['inputReports', 'Entrada'], ['outputReports', 'Salida'], ['featureReports', 'Característica']].forEach(function (k) {
        (c[k[0]] || []).forEach(function (r) { l.push(pad + '  Informe ' + k[1] + ' id ' + (r.reportId || 0) + ' · ' + (r.items || []).length + ' campos'); });
      });
      (c.children || []).forEach(function (h) { col(h, n + 1); });
    }
    (d.collections || []).forEach(function (c) { col(c, 1); });
    if (l.length === 1) l.push('  (sin colecciones: descriptor no disponible)');
    return l;
  };

  /* ---------- series y estadisticas ---------- */
  P.Serie = function (max) { this.max = max || 240; this.v = []; };
  P.Serie.prototype.push = function (x) { this.v.push(x); if (this.v.length > this.max) this.v.shift(); };
  P.Serie.prototype.stats = function () {
    var v = this.v; if (!v.length) return { n: 0, min: 0, max: 0, media: 0 };
    var mn = Infinity, mx = -Infinity, s = 0; v.forEach(function (x) { if (x < mn) mn = x; if (x > mx) mx = x; s += x; });
    return { n: v.length, min: mn, max: mx, media: s / v.length };
  };
  P.magnitud = function (x, y, z) { return Math.sqrt(x * x + y * y + z * z); };

  /* ---------- red / puente ---------- */
  P.esLocal = function (h) { h = String(h).replace(/^\[|\]$/g, ''); return h === 'localhost' || h === '::1' || /^127\./.test(h); };
  P.esRedPrivada = function (h) { return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || /\.local$/.test(h); };
  /* valida la URL del puente segun la pagina que la abre ctx={protocol:'https:'} */
  P.urlWS = function (txt, ctx) {
    ctx = ctx || {}; var u, s = String(txt || '').trim();
    if (!s) return { ok: false, error: 'Escribe la dirección del puente, p. ej. ws://localhost:8765' };
    if (!/^wss?:\/\//i.test(s)) return { ok: false, error: 'La dirección debe empezar por ws:// o wss://' };
    try { u = new URL(s); } catch (e) { return { ok: false, error: 'La dirección no es válida.' }; }
    var local = P.esLocal(u.hostname), r = { ok: true, url: u.href, local: local, privada: P.esRedPrivada(u.hostname), aviso: '' };
    if (ctx.protocol === 'https:' && u.protocol === 'ws:') {
      if (!local) return { ok: false, bloqueada: true, error: 'Esta página usa HTTPS: el navegador bloquea ws:// hacia ' + u.hostname + ' (contenido mixto). Usa ws://localhost (el puente en este mismo equipo), un puente con TLS (wss://), o abre esta herramienta desde http://localhost.' };
      r.aviso = 'ws:// hacia localhost desde una página HTTPS lo permiten Chrome y Edge; otros navegadores pueden bloquearlo.';
    }
    if (u.protocol === 'wss:' && local) r.aviso = 'wss:// a localhost exige un certificado válido; normalmente basta ws://localhost.';
    return r;
  };
  var SENS = /^(clave|claves|contrasena|contraseña|password|pass|passwd|token|secret|apikey|api_key|api-key|credencial|credenciales|auth|authorization|key)$/i;
  var SENS_ENTRE = /(clave|contrase|password|token|secret|apikey|api_key|credencial)/i;
  P.esSensible = function (k) { return SENS.test(k) || SENS_ENTRE.test(k); };
  P.limpiarUrl = function (url) {
    var quitados = [], out = String(url);
    try {
      var u = new URL(out); Array.from(u.searchParams.keys()).forEach(function (k) { if (P.esSensible(k)) { quitados.push(k); u.searchParams.delete(k); } });
      if (u.username || u.password) { quitados.push('usuario:clave'); u.username = ''; u.password = ''; }
      out = u.href;
    } catch (e) {}
    return { url: out, quitados: quitados };
  };
  /* quita de un objeto (en profundidad) todo lo que parezca una clave */
  P.limpiarParametros = function (o) {
    var q = [];
    function rec(v, ruta) {
      if (Array.isArray(v)) return v.map(function (x, i) { return rec(x, ruta + '[' + i + ']'); });
      if (v && typeof v === 'object') { var r = {}; Object.keys(v).forEach(function (k) { if (P.esSensible(k)) q.push(ruta + k); else r[k] = rec(v[k], ruta + k + '.'); }); return r; }
      if (typeof v === 'string' && /^wss?:\/\//i.test(v)) { var c = P.limpiarUrl(v); c.quitados.forEach(function (k) { q.push(ruta + '(url)' + k); }); return c.url; }
      return v;
    }
    return { valor: rec(o, ''), quitados: q };
  };
  P.parseJSON = function (t) {
    try { var v = JSON.parse(t); return { ok: true, valor: v, texto: JSON.stringify(v) }; }
    catch (e) { return { ok: false, error: 'JSON inválido: ' + e.message.replace(/^JSON.parse: /, '') }; }
  };

  /* ---------- registro / exportacion ---------- */
  function fechaHora(t) { var d = new Date(t); return d.toISOString().replace('T', ' ').slice(0, 23); }
  P.exportarLog = function (entradas, formato) {
    if (formato === 'csv') {
      var q = function (s) { s = String(s); return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      return ['hora,direccion,texto'].concat(entradas.map(function (e) { return [fechaHora(e.t), e.dir, e.txt].map(q).join(','); })).join('\r\n') + '\r\n';
    }
    return entradas.map(function (e) { return fechaHora(e.t) + ' ' + { rx: '<<', tx: '>>', sys: '--', err: '!!' }[e.dir] + ' ' + e.txt; }).join('\n') + '\n';
  };

  /* ---------- errores explicados ---------- */
  var T_NOM = { serial: 'puerto serie', bluetooth: 'Bluetooth', usb: 'USB', hid: 'HID', camara: 'cámara', microfono: 'micrófono', mando: 'mando', sensores: 'sensores', puente: 'puente' };
  P.explicarError = function (e, tipo) {
    var n = (e && (e.name || e.constructor && e.constructor.name)) || 'Error', m = (e && e.message) || String(e), nom = T_NOM[tipo] || 'dispositivo', t, s = [];
    var hw = /serial|bluetooth|usb|hid/.test(tipo);
    if (n === 'NotFoundError') {
      if (/camara|microfono/.test(tipo)) { t = 'No se encontró el dispositivo'; s = ['Comprueba que esté conectado y no desactivado por el sistema.']; }
      else { t = 'No se eligió ningún ' + nom; s = ['Cerraste el selector sin elegir, o no había dispositivos visibles.', 'Enciende el dispositivo, acércalo y vuelve a intentar.']; }
    } else if (n === 'NotAllowedError') { t = 'Permiso denegado'; s = ['Acepta el permiso cuando el navegador lo pida; si lo bloqueaste, cámbialo en el candado de la barra de direcciones.', 'Estas funciones solo se activan tras pulsar un botón (gesto del usuario).', 'Si la página está dentro de un iframe, el sitio que la incrusta debe permitirlo.']; }
    else if (n === 'SecurityError') { t = 'Bloqueado por seguridad'; s = ['La página debe servirse por HTTPS o desde localhost.', 'Algunos dispositivos USB (teclados, almacenamiento, etc.) están protegidos y el navegador no deja abrirlos.']; }
    else if (n === 'NetworkError') {
      t = 'No se pudo abrir la conexión con el ' + nom;
      s = tipo === 'serial' ? ['El puerto puede estar en uso por otro programa o pestaña: ciérralos.', 'Revisa el cable y los controladores del adaptador (CH340, CP210x, FTDI).', 'En Linux tu usuario debe estar en el grupo «dialout» (o «uucp»).'] : tipo === 'bluetooth' ? ['Acerca el dispositivo y asegúrate de que no esté conectado a otro teléfono u ordenador.', 'Algunos dispositivos solo aceptan una conexión a la vez.'] : tipo === 'usb' ? ['En Windows el dispositivo necesita el controlador WinUSB (herramienta Zadig).', 'En Linux hace falta una regla udev que dé permiso a tu usuario.', 'Otra aplicación puede tener reclamada la interfaz.'] : ['Reconecta el dispositivo e inténtalo de nuevo.'];
    } else if (n === 'InvalidStateError') { t = 'El ' + nom + ' ya estaba abierto o en otro estado'; s = ['Ciérralo primero y vuelve a abrirlo.', 'Cierra otras pestañas que lo estén usando.']; }
    else if (n === 'NotReadableError') { t = 'No se puede leer el ' + nom; s = ['Otra aplicación (videollamada, otra pestaña) está usando el dispositivo. Ciérrala e inténtalo de nuevo.']; }
    else if (n === 'OverconstrainedError') { t = 'La cámara no admite esa configuración'; s = ['Prueba con una resolución o FPS menores, o con «cualquiera».']; }
    else if (n === 'NotSupportedError') { t = 'No compatible'; s = ['El navegador o el dispositivo no admiten esa operación.']; }
    else if (n === 'AbortError') { t = 'Operación cancelada'; s = ['Se interrumpió; puedes volver a intentarlo.']; }
    else if (n === 'PuenteError') { t = 'No se pudo conectar con el puente'; s = ['¿Está el puente en marcha? Ejecuta «node puente-minimo.js» y revisa el puerto.', 'Comprueba la URL (ws://localhost:8765) y que la página HTTPS no bloquee ws:// remoto.', 'Si el puente valida el origen, añade el de esta página a ORIGENES.']; }
    else { t = n === 'TypeError' ? 'Parámetro no válido' : 'Error del ' + nom; s = hw ? ['Si el problema persiste, usa el diagnóstico del Panel.'] : []; }
    return { nombre: n, titulo: t, texto: m, sugerencias: s };
  };
  return P;
});
