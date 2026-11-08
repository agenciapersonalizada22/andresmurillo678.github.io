/* Deteccion de capacidades del navegador/SO, matriz de compatibilidad y diagnostico. Puro: recibe un "entorno" inyectable.
   entorno = {secure, nav, win, ua, enIframe, protocolo, host}. window.DispCapacidades */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.DispCapacidades = m; })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var C = {};
  C.ESTADOS = { ok: 'Disponible', permiso: 'Pide permiso', https: 'Requiere HTTPS', denegado: 'Permiso denegado', no: 'No disponible' };
  var N_CHROMIUM = 'Chrome, Edge y Opera (Chromium)', SIN = 'No existe en Firefox ni Safari.';
  var DEFS = [
    { id: 'serial', nombre: 'Web Serial', mod: 'serial', https: 1, perm: 1, pres: function (e) { return !!e.nav.serial; }, nota: 'Puertos serie y adaptadores USB-serie (Arduino, ESP32, GPS). Solo ' + N_CHROMIUM + ' de escritorio. ' + SIN },
    { id: 'bluetooth', nombre: 'Web Bluetooth', mod: 'bluetooth', https: 1, perm: 1, pres: function (e) { return !!e.nav.bluetooth; }, nota: 'Bluetooth de baja energía (BLE/GATT). Chrome y Edge en escritorio y Android. No sirve para Bluetooth clásico (audio, SPP) ni existe en Safari/iOS ni Firefox.' },
    { id: 'usb', nombre: 'WebUSB', mod: 'usb', https: 1, perm: 1, pres: function (e) { return !!e.nav.usb; }, nota: 'Dispositivos USB con interfaz propia. Chrome y Edge (escritorio y Android). Los dispositivos de clases protegidas (teclados, almacenamiento) no se pueden abrir. ' + SIN },
    { id: 'hid', nombre: 'WebHID', mod: 'usb', https: 1, perm: 1, pres: function (e) { return !!e.nav.hid; }, nota: 'Mandos especiales, paneles y teclados programables vía HID. ' + N_CHROMIUM + ' de escritorio. ' + SIN },
    { id: 'gamepad', nombre: 'Gamepad (mandos)', mod: 'mandos', pres: function (e) { return typeof e.nav.getGamepads === 'function'; }, nota: 'Mandos Xbox/PlayStation/genéricos. El navegador solo los muestra tras pulsar un botón.' },
    { id: 'camara', nombre: 'Cámaras', mod: 'camaras', https: 1, perm: 1, pres: function (e) { return !!(e.nav.mediaDevices && e.nav.mediaDevices.getUserMedia); }, nota: 'Vista previa, captura y grabación (MediaDevices). Soportado en todos los navegadores modernos.' },
    { id: 'microfono', nombre: 'Micrófonos', mod: 'camaras', https: 1, perm: 1, pres: function (e) { return !!(e.nav.mediaDevices && e.nav.mediaDevices.getUserMedia); }, nota: 'Nivel de entrada y grabación de prueba.' },
    { id: 'grabacion', nombre: 'Grabación (MediaRecorder)', mod: 'camaras', pres: function (e) { return typeof e.win.MediaRecorder === 'function'; }, nota: 'Necesaria para grabar video/audio de prueba.' },
    { id: 'xr', nombre: 'WebXR (VR/AR)', mod: null, https: 1, perm: 1, pres: function (e) { return !!e.nav.xr; }, nota: 'Realidad virtual/aumentada inmersiva. Chrome/Edge y navegadores de visores; depende del hardware. Safari en iPhone no la ofrece.' },
    { id: 'movimiento', nombre: 'Sensores de movimiento', mod: 'sensores', https: 1, perm: 'ios', ev: 'DeviceMotionEvent', pres: function (e) { return !!e.win.DeviceMotionEvent; }, nota: 'Acelerómetro y giroscopio del teléfono (devicemotion). En iPhone hay que conceder permiso. En un PC suele no emitir datos.' },
    { id: 'orientacion', nombre: 'Orientación', mod: 'sensores', https: 1, perm: 'ios', ev: 'DeviceOrientationEvent', pres: function (e) { return !!e.win.DeviceOrientationEvent; }, nota: 'Brújula/inclinación (alfa, beta, gamma).' },
    { id: 'geolocalizacion', nombre: 'Geolocalización', mod: 'sensores', https: 1, perm: 1, pres: function (e) { return !!e.nav.geolocation; }, nota: 'Posición por GPS/WiFi con permiso del usuario. En PC es aproximada.' },
    { id: 'bateria', nombre: 'Batería', mod: 'sensores', pres: function (e) { return typeof e.nav.getBattery === 'function'; }, nota: 'Nivel y carga del propio equipo. Solo Chromium; Firefox y Safari la eliminaron por privacidad.' },
    { id: 'webrtc', nombre: 'WebRTC', mod: null, pres: function (e) { return typeof e.win.RTCPeerConnection === 'function'; }, nota: 'Conexión directa entre navegadores (audio, video, datos).' },
    { id: 'websocket', nombre: 'WebSocket (puente)', mod: 'puente', pres: function (e) { return typeof e.win.WebSocket === 'function'; }, nota: 'Canal con un programa local. Desde una página HTTPS solo se permite wss:// o ws://localhost.' },
    { id: 'nfc', nombre: 'Web NFC', mod: null, https: 1, perm: 1, pres: function (e) { return !!e.win.NDEFReader; }, nota: 'Leer/escribir etiquetas NFC. Solo Chrome en Android.' },
    { id: 'impresion', nombre: 'Impresión', mod: null, pres: function (e) { return typeof e.win.print === 'function'; }, nota: 'Diálogo de impresión del sistema. No hay acceso directo a impresoras de etiquetas/térmicas, salvo por USB/serie con su protocolo.' }
  ];
  C.DEFS = DEFS;
  C.detectar = function (e) {
    return DEFS.map(function (d) {
      var hay = d.pres(e), estado;
      if (d.https && !e.secure) estado = 'https';
      else if (!hay) estado = 'no';
      else if (d.perm === 'ios') { var ev = e.win[d.ev]; estado = ev && typeof ev.requestPermission === 'function' ? 'permiso' : 'ok'; }
      else estado = d.perm ? 'permiso' : 'ok';
      return { id: d.id, nombre: d.nombre, estado: estado, etiqueta: C.ESTADOS[estado], modulo: d.mod, nota: d.nota, detalle: '' };
    });
  };
  C.entorno = function (w) {
    w = w || g; var n = w.navigator || {}, L = w.location || {};
    var enIframe = false; try { enIframe = w.top !== w.self; } catch (x) { enIframe = true; }
    return { secure: !!w.isSecureContext, nav: n, win: w, ua: n.userAgent || '', enIframe: enIframe, protocolo: L.protocol || '', host: L.hostname || '' };
  };
  C.plataforma = function (ua) {
    ua = ua || '';
    return { ios: /iPhone|iPad|iPod/.test(ua), android: /Android/.test(ua), windows: /Windows/.test(ua), mac: /Macintosh/.test(ua), linux: /Linux/.test(ua) && !/Android/.test(ua), firefox: /Firefox\//.test(ua), safari: /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS/.test(ua), chromium: /Chrome\/|Chromium\/|Edg\/|OPR\//.test(ua) && !/CriOS/.test(ua) };
  };
  /* refina con datos asincronos: info = {camaras, microfonos, btDisponible, permisos:{camera,microphone,geolocation}, xrVR, xrAR} */
  C.refinar = function (matriz, info) {
    info = info || {};
    var m = {}; matriz.forEach(function (x) { m[x.id] = x; });
    var map = { camara: 'camera', microfono: 'microphone', geolocalizacion: 'geolocation' };
    Object.keys(map).forEach(function (id) {
      if (!m[id] || !info.permisos) return;
      if (info.permisos[map[id]] === 'denied' && m[id].estado === 'permiso') { m[id].estado = 'denegado'; m[id].etiqueta = C.ESTADOS.denegado; }
      if (info.permisos[map[id]] === 'granted') m[id].detalle = 'permiso ya concedido';
    });
    if (m.camara && info.camaras != null) m.camara.detalle = info.camaras + ' encontrada(s)' + (m.camara.detalle ? ' · ' + m.camara.detalle : '');
    if (m.microfono && info.microfonos != null) m.microfono.detalle = info.microfonos + ' encontrado(s)' + (m.microfono.detalle ? ' · ' + m.microfono.detalle : '');
    if (m.bluetooth && info.btDisponible === false && m.bluetooth.estado === 'permiso') m.bluetooth.detalle = 'adaptador apagado o ausente';
    if (m.xr && m.xr.estado === 'permiso') m.xr.detalle = info.xrVR || info.xrAR ? [info.xrVR ? 'VR' : '', info.xrAR ? 'AR' : ''].filter(Boolean).join(' y ') + ' disponible' : 'sin visor/AR compatible en este equipo';
    return matriz;
  };
  /* diagnostico: lista de {nivel:'error'|'aviso'|'info'|'ok', titulo, texto}. ctx = {errores:[{tipo,titulo,mensaje}], urlPuente} */
  C.diagnosticar = function (env, matriz, info, ctx) {
    info = info || {}; ctx = ctx || {}; var d = [], p = C.plataforma(env.ua), m = {}; matriz.forEach(function (x) { m[x.id] = x; });
    function add(nivel, titulo, texto) { d.push({ nivel: nivel, titulo: titulo, texto: texto }); }
    if (!env.secure) add('error', 'Contexto no seguro', 'Esta página no se sirve por HTTPS ni desde localhost, así que el navegador desactiva cámara, USB, Bluetooth, serie y sensores. Ábrela con https:// o desde http://localhost.');
    if (env.enIframe) add('aviso', 'Página incrustada en un marco', 'Dentro de un iframe, el sitio anfitrión debe delegar los permisos (serial, usb, bluetooth, camera…). Ábrela en su propia pestaña.');
    if (p.ios) add('aviso', 'iPhone/iPad', 'Todos los navegadores de iOS usan el motor de Safari, que no ofrece Web Bluetooth, Web Serial, WebUSB, WebHID ni Web NFC. Sí funcionan cámaras, micrófono, sensores (con permiso), WebSocket y mandos. Para BLE/USB usa Chrome en Android o un ordenador.');
    else if (p.firefox) add('aviso', 'Firefox', 'Firefox no implementa Web Serial, Web Bluetooth, WebUSB ni WebHID. Para esos dispositivos usa Chrome o Edge. Cámaras, sensores, mandos y WebSocket sí funcionan.');
    else if (p.safari) add('aviso', 'Safari', 'Safari no implementa Web Serial, Web Bluetooth, WebUSB ni WebHID. Usa Chrome o Edge para esos dispositivos.');
    else if (env.secure) ['serial', 'bluetooth', 'usb', 'hid'].forEach(function (id) { if (m[id] && m[id].estado === 'no') add('aviso', m[id].nombre + ' no está disponible', 'Tu navegador no expone ' + m[id].nombre + '. Actualiza Chrome/Edge o revisa si es un navegador móvil sin soporte.'); });
    if (m.bluetooth && m.bluetooth.estado === 'permiso' && info.btDisponible === false) add('aviso', 'Bluetooth apagado', 'El navegador informa que no hay adaptador Bluetooth disponible. Enciéndelo en los ajustes del sistema.');
    if (info.camaras === 0 && m.camara && m.camara.estado !== 'https') add('aviso', 'No se detectan cámaras', 'enumerateDevices no devolvió ninguna. Conecta una cámara o revisa que el sistema la tenga activada.');
    if (m.camara && m.camara.estado === 'denegado') add('error', 'Cámara bloqueada', 'Denegaste el permiso de cámara a este sitio. Pulsa el candado de la barra de direcciones y permite «Cámara».');
    if (m.microfono && m.microfono.estado === 'denegado') add('error', 'Micrófono bloqueado', 'Permite el micrófono desde el candado de la barra de direcciones.');
    if (m.geolocalizacion && m.geolocalizacion.estado === 'denegado') add('aviso', 'Ubicación bloqueada', 'Permite la ubicación desde el candado de la barra de direcciones.');
    if (p.linux && m.serial && m.serial.estado === 'permiso') add('info', 'Linux: permisos de puerto', 'Si el puerto serie no abre, añade tu usuario al grupo «dialout» (o «uucp») y reconecta. Para WebUSB hace falta una regla udev.');
    if (p.windows && m.usb && m.usb.estado === 'permiso') add('info', 'Windows: controlador USB', 'WebUSB solo abre dispositivos con controlador WinUSB; si el dispositivo tiene otro, instala WinUSB con la herramienta Zadig.');
    if (m.movimiento && (m.movimiento.estado === 'ok' || m.movimiento.estado === 'permiso') && !(p.android || p.ios)) add('info', 'Sensores en un PC', 'Los equipos de escritorio normalmente no emiten datos de movimiento. Abre esta página en tu teléfono para probarlos.');
    if (m.bateria && m.bateria.estado === 'no') add('info', 'Sin API de batería', 'Este navegador no ofrece Battery Status (Firefox y Safari la quitaron por privacidad).');
    if (ctx.urlPuente && /^ws:\/\//i.test(ctx.urlPuente) && env.protocolo === 'https:' && !/^ws:\/\/(localhost|127\.|\[::1\])/i.test(ctx.urlPuente)) add('error', 'Puente bloqueado por contenido mixto', 'La URL del puente es ws:// y la página es HTTPS: el navegador la bloquea. Usa ws://localhost, wss:// o abre la herramienta desde http://localhost.');
    (ctx.errores || []).slice(-3).forEach(function (e) { add('aviso', 'Último error (' + e.tipo + ')', e.titulo + ': ' + e.mensaje); });
    if (!d.some(function (x) { return x.nivel === 'error' || x.nivel === 'aviso'; })) d.unshift({ nivel: 'ok', titulo: 'Todo en orden', texto: 'No se detectaron problemas en el entorno. Cada API sigue pidiendo tu permiso al usarla.' });
    return d;
  };
  /* Limites reales de la web con dispositivos habituales (informativo) */
  C.LIMITES = [
    { t: 'Drones DJI', x: 'No existe una API web directa. DJI ofrece SDK nativos (Mobile SDK/Payload SDK) para apps de Android/iOS; desde el navegador solo se llega mediante una app o servicio propio que exponga WebSocket/HTTP.' },
    { t: 'DJI Tello / Tello EDU', x: 'Se controla con comandos de texto por UDP (8889), estado por UDP (8890) y video por UDP (11111). Los navegadores no pueden abrir sockets UDP: hace falta un puente local (pestaña Puente; el script incluido reenvía UDP).' },
    { t: 'Drones con MAVLink (PX4/ArduPilot)', x: 'Hablan MAVLink por serie, UDP o TCP. Directo por Web Serial si el enlace de telemetría es USB-serie; si es UDP/TCP, usa un puente (p. ej. mavlink2rest o MAVProxy con WebSocket).' },
    { t: 'Arduino, ESP32, micro:bit, Raspberry Pi Pico', x: 'Web Serial (USB) o Web Bluetooth (BLE) directamente, sin puente. Es el caso mejor soportado.' },
    { t: 'Impresoras de etiquetas y térmicas', x: 'No hay API de impresoras. Las ESC/POS con USB pueden abrirse con WebUSB y las seriales con Web Serial. Las de red (puerto 9100) necesitan un puente TCP. Para PDFs/QR usa el diálogo de impresión.' },
    { t: 'Domótica (Home Assistant, MQTT, Zigbee, Hue)', x: 'Home Assistant y brokers MQTT con WebSocket se pueden usar directo por WebSocket (con wss:// o desde la red local). Zigbee/Z-Wave/Matter requieren su hub; no se accede por radio desde el navegador.' },
    { t: 'Bluetooth clásico (audio, SPP, mandos antiguos)', x: 'Web Bluetooth solo cubre BLE. El Bluetooth clásico no es accesible; si el SO lo expone como puerto COM virtual, Web Serial podría abrirlo.' },
    { t: 'Sockets TCP/UDP crudos y mDNS', x: 'Un navegador normal no los permite (solo HTTP, WebSocket, WebRTC). Necesitan puente local.' }
  ];
  return C;
});
