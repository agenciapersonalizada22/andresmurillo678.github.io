/* Pruebas de logica pura: parsers, formateadores, capacidades, diagnostico, nucleo (drivers falsos) y perfiles. Uso: node dispositivos.test.js */
const assert = require('assert'); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const P = require('../js/puro.js'), C = require('../js/capacidades.js');
// bytes
ok(P.aHex(P.parseHex('0x48 65,6C:6c-6F')) === '48 65 6C 6C 6F', 'parseHex mezcla separadores');
assert.throws(() => P.parseHex('ABC')); assert.throws(() => P.parseHex('GG')); n += 2;
ok(P.parseHex('').length === 0, 'hex vacio');
ok(P.escapes('a\\n\\x41\\\\') === 'a\nA\\', 'escapes');
ok(P.aHex(P.aBytes({ hex: 'ff 00' })) === 'FF 00' && P.aBytes('é').length === 2 && P.aBytes([1, 2]).length === 2, 'aBytes');
ok(P.aAscii(Uint8Array.from([72, 0, 105])) === 'H.i', 'ascii');
ok(P.volcado(Uint8Array.from([72, 105])).startsWith('0000  48 69'), 'volcado');
// lineas partidas
let lb = new P.LineaBuf(), r = [];
r = r.concat(lb.push('ho'), lb.push('la\r'), lb.push('\nsegun'), lb.push('da\n\n'), lb.push('fin\r'));
ok(JSON.stringify(r) === '["hola","segunda",""]' && lb.resto() === 'fin\r', 'LineaBuf CRLF partido: ' + JSON.stringify(r));
const dec = P.decodificador(), e = new TextEncoder().encode('ñ'); ok(dec.push(e.subarray(0, 1)) + dec.push(e.subarray(1)) === 'ñ', 'utf8 partido entre trozos');
// UUID / GATT
ok(P.uuid(0x180F) === '0000180f-0000-1000-8000-00805f9b34fb' && P.uuid('2A19') === '00002a19-0000-1000-8000-00805f9b34fb', 'uuid corto');
assert.throws(() => P.uuid('xyz')); n++;
ok(P.uuidCorto(P.uuid('180f')) === '180f' && P.nombreServicio(P.uuid(0x180F)) === 'Batería', 'nombres');
ok(P.interpretar(P.uuid('2a19'), Uint8Array.from([87])) === '87 %' && P.interpretar(P.uuid('2a37'), Uint8Array.from([0, 72])) === '72 lpm' && P.interpretar(P.uuid('2a37'), Uint8Array.from([1, 0x2c, 0x01])) === '300 lpm', 'interpretar bateria y FC (8 y 16 bits)');
ok(P.interpretar(P.uuid('2a6e'), Uint8Array.from([0x2c, 0x09])) === '23.48 °C' && P.interpretar(P.uuid('2a29'), new TextEncoder().encode('Acme')) === 'Acme', 'temperatura / texto');
ok(P.propsLista({ read: true, notify: true }).join() === 'leer,notificar', 'props');
// USB / HID
const usb = { vendorId: 0x2341, productId: 0x43, productName: 'Uno', usbVersionMajor: 2, usbVersionMinor: 0, deviceClass: 2, configurations: [{ configurationValue: 1, interfaces: [{ interfaceNumber: 0, alternates: [{ alternateSetting: 0, interfaceClass: 2, interfaceSubclass: 2, interfaceProtocol: 1, endpoints: [{ endpointNumber: 2, direction: 'out', type: 'bulk', packetSize: 64 }] }] }] }] };
const tu = P.formatearUSB(usb).join('\n'); ok(/VID 0x2341  PID 0x0043/.test(tu) && /Comunicaciones/.test(tu) && /Endpoint 2 OUT · bulk · paquete 64/.test(tu), 'formatearUSB');
const th = P.formatearHID({ vendorId: 1, productId: 2, productName: 'Pad', collections: [{ usagePage: 1, usage: 5, type: 1, inputReports: [{ reportId: 0, items: [{}, {}] }], children: [{ usagePage: 0xFF00, usage: 1, children: [] }] }] }).join('\n');
ok(/Escritorio genérico/.test(th) && /Informe Entrada id 0 · 2 campos/.test(th) && /Específica del fabricante/.test(th), 'formatearHID');
// series
const s = new P.Serie(3); [1, 2, 3, 10].forEach(x => s.push(x)); const st = s.stats(); ok(s.v.length === 3 && st.min === 2 && st.max === 10 && st.media === 5, 'serie circular');
ok(Math.abs(P.magnitud(3, 4, 0) - 5) < 1e-9, 'magnitud');
// puente / URL
ok(!P.urlWS('http://x').ok && !P.urlWS('').ok, 'url invalida');
let u = P.urlWS('ws://192.168.1.5:8765', { protocol: 'https:' }); ok(!u.ok && u.bloqueada, 'ws remoto desde https bloqueado');
u = P.urlWS('ws://localhost:8765', { protocol: 'https:' }); ok(u.ok && u.local && u.aviso, 'ws localhost desde https permitido con aviso');
u = P.urlWS('ws://192.168.1.5:8765', { protocol: 'http:' }); ok(u.ok && u.privada, 'ws LAN desde http ok');
ok(P.urlWS('wss://puente.ejemplo.com/x', { protocol: 'https:' }).ok, 'wss ok');
ok(P.esLocal('127.0.0.1') && P.esLocal('[::1]') && !P.esLocal('10.0.0.1'), 'esLocal');
// claves
const lu = P.limpiarUrl('wss://h.com:1/ws?token=abc&modo=1&API_KEY=z'); ok(lu.url === 'wss://h.com:1/ws?modo=1' && lu.quitados.length === 2, 'limpiarUrl ' + lu.url);
ok(P.limpiarUrl('ws://user:pw@h.com/').url === 'ws://h.com/', 'usuario:clave fuera');
const lp = P.limpiarParametros({ url: 'ws://h/?token=1', baudRate: 9600, anidado: { clave: 'x', apiKey: 'y', ok: 1 }, lista: [{ password: 'p', a: 1 }], claveWifi: 'z' });
ok(JSON.stringify(lp.valor) === '{"url":"ws://h/","baudRate":9600,"anidado":{"ok":1},"lista":[{"a":1}]}' && lp.quitados.length === 5, 'limpiarParametros ' + JSON.stringify(lp));
ok(P.parseJSON('{"a":1}').ok && !P.parseJSON('{a').ok, 'parseJSON');
// export
const log = [{ t: Date.UTC(2026, 0, 2, 3, 4, 5, 6), dir: 'rx', txt: 'a,"b"' }, { t: 0, dir: 'tx', txt: 'x' }];
ok(P.exportarLog(log, 'csv').split('\r\n')[1] === '2026-01-02 03:04:05.006,rx,"a,""b"""' && /<< a,"b"/.test(P.exportarLog(log, 'txt')), 'exportar csv/txt');
ok(P.formatoBytes(2048) === '2.0 KB' && P.duracion(65000) === '1 min 5 s', 'formatos');
// errores explicados
ok(/ya estaba abierto/.test(P.explicarError({ name: 'InvalidStateError', message: 'x' }, 'serial').titulo), 'InvalidState');
ok(P.explicarError({ name: 'NetworkError', message: 'x' }, 'serial').sugerencias.some(t => /dialout/.test(t)) && P.explicarError({ name: 'NetworkError', message: 'x' }, 'usb').sugerencias.some(t => /WinUSB/.test(t)), 'NetworkError por tipo');
ok(/Permiso/.test(P.explicarError({ name: 'NotAllowedError' }, 'camara').titulo) && /configuración/.test(P.explicarError({ name: 'OverconstrainedError' }, 'camara').titulo), 'camara errores');
// capacidades
const win = (extra) => Object.assign({ WebSocket() {}, RTCPeerConnection() {}, print() {}, MediaRecorder() {} }, extra);
const env = (nav, w, secure, ua) => ({ secure, nav, win: w, ua: ua || 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130', enIframe: false, protocolo: secure ? 'https:' : 'http:' });
const md = { getUserMedia() {} };
let m = C.detectar(env({ serial: {}, bluetooth: {}, usb: {}, hid: {}, getGamepads() {}, mediaDevices: md, geolocation: {}, getBattery() {} }, win({ DeviceMotionEvent: function () {}, DeviceOrientationEvent: function () {} }), true));
const by = (m, id) => m.find(x => x.id === id).estado;
ok(by(m, 'serial') === 'permiso' && by(m, 'gamepad') === 'ok' && by(m, 'bateria') === 'ok' && by(m, 'movimiento') === 'ok' && by(m, 'nfc') === 'no' && by(m, 'xr') === 'no' && by(m, 'websocket') === 'ok', 'matriz Chrome escritorio');
m = C.detectar(env({ mediaDevices: md, getGamepads() {} }, win({ DeviceMotionEvent: Object.assign(function () {}, { requestPermission() {} }) }), false, 'Mozilla/5.0 (iPhone) AppleWebKit Safari/604'));
ok(by(m, 'serial') === 'https' && by(m, 'camara') === 'https' && by(m, 'movimiento') === 'https' && by(m, 'gamepad') === 'ok', 'sin HTTPS');
m = C.detectar(env({ mediaDevices: md }, win({ DeviceMotionEvent: Object.assign(function () {}, { requestPermission() {} }) }), true, 'iPhone'));
ok(by(m, 'movimiento') === 'permiso' && by(m, 'serial') === 'no', 'iOS: sensores piden permiso, serial no');
C.refinar(m, { camaras: 0, permisos: { camera: 'denied', microphone: 'granted' }, btDisponible: false });
ok(by(m, 'camara') === 'denegado' && m.find(x => x.id === 'microfono').detalle === 'permiso ya concedido', 'refinar permisos');
let d = C.diagnosticar(env({}, win({}), false, 'iPhone Safari'), C.detectar(env({}, win({}), false)), {}, { urlPuente: 'ws://192.168.0.2:1' });
ok(d.some(x => x.titulo === 'Contexto no seguro') && d.some(x => /iPhone/.test(x.titulo)), 'diag inseguro + iOS');
m = C.detectar(env({ serial: {}, mediaDevices: md }, win({}), true));
d = C.diagnosticar({ ...env({ serial: {}, mediaDevices: md }, win({}), true), protocolo: 'https:' }, C.refinar(m, { camaras: 0, permisos: { camera: 'denied' } }), { camaras: 0 }, { urlPuente: 'ws://192.168.0.2:1', errores: [{ tipo: 'serial', titulo: 'Puerto ocupado', mensaje: 'x' }] });
ok(d.some(x => x.titulo === 'Cámara bloqueada') && d.some(x => x.titulo === 'Puente bloqueado por contenido mixto') && d.some(x => /Linux/.test(x.titulo)) && d.some(x => /Último error/.test(x.titulo)) && d.some(x => /Bluetooth no está disponible/.test(x.titulo)), 'diag completo');
d = C.diagnosticar(env({ serial: {}, bluetooth: {}, usb: {}, hid: {} }, win({}), true, 'Mozilla/5.0 (Windows NT 10) Chrome/130'), C.detectar(env({ serial: {}, bluetooth: {}, usb: {}, hid: {}, mediaDevices: md, getGamepads() {}, getBattery() {}, geolocation: {} }, win({}), true)), {}, {});
ok(d.some(x => /WinUSB/.test(x.texto)), 'diag windows');
ok(C.LIMITES.some(l => /Tello/.test(l.t) && /UDP/.test(l.x)) && C.LIMITES.some(l => /DJI/.test(l.t) && /No existe/.test(l.x)), 'limites honestos');

// ---- nucleo + datos con drivers falsos ----
global.window = global; global.addEventListener = () => {}; global.DispPuro = P; global.DispCapacidades = C; global.Almacen = require('../../comun/almacen.js');
require('../js/nucleo.js'); require('../js/datos.js'); const TD = global.TrabajosDispositivos, D = global.DispDatos;
TD.registrarDriver('puente', { nombre: 'falso', soportado: () => true, conectar: async (o, ctx) => { if (o.falla) { const e = new Error('no'); e.name = 'PuenteError'; throw e; } setTimeout(() => ctx.rx({ hola: 1 }), 5); return { nombre: 'falso', enviar: async () => {}, cerrar: async () => {} }; } });
TD.registrarDriver('serial', { nombre: 'sin', soportado: () => false, conectar: async () => ({}) });
(async () => {
  const ev = []; const off = TD.escuchar('*', x => ev.push(x.evento + ':' + (x.dir || x.estado || '')));
  const c = await TD.conectar('puente', { url: 'ws://localhost:1/?token=zz' }); await new Promise(r => setTimeout(r, 20));
  await c.enviar({ a: 1 }); ok(TD.listar().length === 1 && TD.listar('puente')[0].rx === 1 && TD.listar()[0].tx === 1, 'listar con contadores');
  ok(ev.includes('conectado:') && ev.includes('datos:rx') && ev.includes('datos:tx'), 'eventos ' + ev.join());
  await new Promise(r => setTimeout(r, 900)); await c.cerrar(); await new Promise(r => setTimeout(r, 30));
  ok(TD.listar().length === 0 && c.estado === 'cerrado', 'cerrada');
  const ses = await TD.sesiones(); ok(ses.length === 1 && ses[0].rx === 1 && ses[0].tx === 1 && ses[0].tipo === 'puente', 'sesion guardada');
  let err = null; try { await TD.conectar('serial', {}); } catch (x) { err = x; } ok(err && err.name === 'NotSupportedError', 'tipo no soportado rechaza');
  try { await TD.conectar('puente', { falla: 1 }); } catch (x) { err = x; } ok(TD.errores.length >= 2 && TD.listar().length === 0, 'error registrado, sin conexion fantasma');
  try { await c.enviar(1); err = null; } catch (x) { err = x; } ok(err, 'enviar en cerrada rechaza');
  const pr = await TD.perfiles.guardar({ nombre: ' Tello ', tipo: 'puente', parametros: { url: 'ws://h/?token=1', clave: 'x', reconectar: true } });
  ok(pr.perfil.nombre === 'Tello' && JSON.stringify(pr.perfil.parametros) === '{"url":"ws://h/","reconectar":true}' && pr.quitados.length === 2, 'perfil sin claves');
  let e2; try { await D.guardarPerfil({ nombre: '', tipo: 'puente' }); } catch (x) { e2 = x; } ok(e2, 'perfil sin nombre rechazado');
  try { await D.guardarPerfil({ nombre: 'a', tipo: 'nave' }); e2 = null; } catch (x) { e2 = x; } ok(e2, 'tipo invalido rechazado');
  const c2 = await TD.conectarPerfil(pr.perfil.id); ok(c2.opts.url === 'ws://h/' && c2.opts.reconectar === true, 'conectarPerfil'); await c2.cerrar();
  off(); console.log('OK', n);
})().catch(e => { console.error(e); process.exit(1); });
