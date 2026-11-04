/* Red: multijugador P2P (WebRTC DataChannel, estrella: anfitrion <-> cada amigo, hasta 4 jugadores). Script clasico: window.Red.
   Sin servidor: la senalizacion es manual (enlace de invitacion + codigo de respuesta). STUN publico configurable en Red.config.

   ====================== API ======================
   Perfil (localStorage 'juego_perfil' = {"nombre","color"}):
     Red.perfil.obtener() -> {nombre,color} | Red.perfil.guardar({nombre,color}) | Red.perfil.paleta (8 colores) | Red.perfil.nombreAleatorio()
   Sala:
     Red.crearSala({max?:4, url?, nombre?, color?})            anfitrion (id 0). Sincrono. Devuelve Red.
     Red.invitar() -> Promise<{id, codigo, enlace}>            nueva invitacion para un amigo (una por amigo; caduca a los 5 min).
     Red.aceptarRespuesta(codigoRespuesta) -> Promise<id>      el anfitrion pega el codigo que devuelve el amigo; resuelve al abrirse la conexion.
     Red.unirse(codigoOEnlace) -> Promise<codigoRespuesta>     el amigo; acepta el enlace completo (?sala=) o solo el codigo. Luego espera al anfitrion
                                                              (evento 'conectado'). Tambien: Red.codigoDeUrl() devuelve el ?sala= de la URL actual o ''.
     Red.salir()   Red.reconectar() (anfitrion: nueva invitacion; amigo: sale y queda listo para unirse con un enlace nuevo)
     Red.estado: 'inactivo'|'anfitrion'|'uniendo'|'conectado' ; Red.esAnfitrion ; Red.miId ; Red.conectado (true si estas en una sala viva)
     Red.jugadores: {id:{id,nombre,color,ping,listo}} ; Red.lista() -> array ordenado por id ; Red.cuantos() ; Red.max
     Red.sala: objeto compartido de la sala ({modo,...}); el anfitrion lo cambia con Red.fijarSala({modo:'x'}); Red.listo(true|false)
   Mensajes (JSON {t:tipo,d:datos,de:id}; tipos que empiezan por "_" son internos y no llegan a 'mensaje'):
     Red.enviar(tipo, datos, {a:id, fiable:true})   a un jugador (amigo->amigo pasa por el anfitrion). Sin `a`: amigo->anfitrion; anfitrion->todos.
     Red.difundir(tipo, datos, {fiable:true})       a todos los demas (el anfitrion retransmite). fiable:false = canal rapido (sin reintentos, desordenado).
     Devuelven false si el mensaje supera Red.config.maxMensaje (16 KB) o no hay conexion.
     Red.on(evento, fn) -> funcion para desuscribir ; Red.off(evento, fn). Eventos:
       'jugadorUnido'(id, jugador)  'jugadorSalio'(id, jugador, motivo)  'mensaje'(tipo, datos, deId)  'cerrado'(motivo)
       'conectado'(miId) (amigo ya dentro)  'jugadores'(tabla)  'sala'(sala)  'iniciar'(config, jugadores)  'chat'(deId, texto, jugador)
       'estado'(estado)  'invitacion'(id, 'creada'|'expirada')
   Reloj / red:
     Red.reloj() ms sincronizado con el anfitrion (el anfitrion es la referencia). Red.rtt ping propio (ms) ; Red.jugadores[id].ping.
     Red.stats {enviados,recibidos,descartados,bytesTx,bytesRx}
     Red.chat(texto) ; Red.iniciar(config) (solo anfitrion; llega a todos como evento 'iniciar' y a Lobby.alIniciar)
   Ayudas: Red.compactar(valor, decimales=2) redondea numeros recursivamente; Red.empaquetar(t,d,de) / Red.desempaquetar(texto);
     new Red.Interpolador({retardo:100, angulos:['ry'], extrapolar:120})
        .agregar(Red.reloj(), {x,y,z,ry}) al enviar/recibir snapshot (usa el tiempo en que se genero, viaja en el mensaje)
        .obtener() -> estado interpolado {x,y,z,ry} para pintar ahora (angulos en radianes, envoltura por el camino corto) o null.
   Ejemplo minimo:
     Red.crearSala(); Red.on('mensaje',function(t,d,de){ if(t==='pos') remoto[de].agregar(d.t,d.p); });
     setInterval(function(){ Red.difundir('pos',{t:Red.reloj(),p:Red.compactar({x:x,y:y,ry:ry})},{fiable:false}); },50);
   Limitaciones: sin TURN, NAT simetricos/CGNAT/redes corporativas pueden fallar (ver Red.consejos). */
(function (G) {
  'use strict';
  var Red = G.Red = G.Red || {};
  var esNav = typeof window !== 'undefined' && typeof RTCPeerConnection !== 'undefined';

  Red.config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
    maxJugadores: 4, maxMensaje: 16384, timeout: 7000, heartbeat: 1000, esperaICE: 6000, esperaIdle: 1500,
    urlBase: null, maxBufFiable: 262144, maxBufRapido: 32768, maxCola: 2000, timeoutInvitacion: 300000, timeoutConexion: 30000, timeoutUnirse: 120000
  };
  Red.consejos = [
    'Funciona sin servidor: la conexion es directa entre los dispositivos (WebRTC).',
    'Sin servidor TURN, algunas redes (datos moviles con CGNAT, NAT estricto, redes de oficina/colegio, VPN) pueden impedir la conexion.',
    'Prueba: que ambos esten en la misma Wi-Fi, o que uno cambie de Wi-Fi a datos moviles; desactiva VPN y bloqueadores.',
    'Si falla, genera un enlace nuevo y reintenta; el anfitrion con mejor conexion (cable/Wi-Fi 5 GHz) da mas estabilidad.'
  ];

  /* ---------- perfil ---------- */
  var CLAVE = 'juego_perfil', PALETA = ['#3df5ff', '#ff4fd8', '#ffd23d', '#6dff6d', '#ff6b4a', '#9a8cff', '#ffa43d', '#ffffff'];
  var NOMBRES = ['Neon', 'Cometa', 'Pixel', 'Turbo', 'Nova', 'Rayo', 'Zorro', 'Delta', 'Sombra', 'Cohete', 'Lince', 'Orion'];
  function limpiarNombre(n) { n = String(n == null ? '' : n).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16); return n || 'Jugador'; }
  function limpiarColor(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : PALETA[0]; }
  Red.perfil = {
    paleta: PALETA,
    obtener: function () {
      var p = null;
      try { p = JSON.parse(G.localStorage.getItem(CLAVE)); } catch (e) {}
      p = p || {};
      return { nombre: limpiarNombre(p.nombre), color: limpiarColor(p.color) };
    },
    guardar: function (p) {
      var v = { nombre: limpiarNombre(p && p.nombre), color: limpiarColor(p && p.color) };
      try { G.localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) {}
      if (Red.conectado) perfilCambiado();
      return v;
    },
    nombreAleatorio: function () { return NOMBRES[Math.floor(Math.random() * NOMBRES.length)] + ' ' + (10 + Math.floor(Math.random() * 90)); }
  };

  /* ---------- eventos ---------- */
  var oyentes = {};
  Red.on = function (ev, fn) { (oyentes[ev] = oyentes[ev] || []).push(fn); return function () { Red.off(ev, fn); }; };
  Red.off = function (ev, fn) { var l = oyentes[ev]; if (l) { var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
  function emitir(ev) {
    var a = Array.prototype.slice.call(arguments, 1), l = (oyentes[ev] || []).slice();
    for (var i = 0; i < l.length; i++) { try { l[i].apply(null, a); } catch (e) { if (G.console) console.error('Red evento ' + ev, e); } }
  }

  /* ---------- utilidades puras (probadas en Node) ---------- */
  function b64uEnc(bytes) {
    var s = ''; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64uDec(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '=';
    var s = atob(str), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b;
  }
  function checksum(b, ini, fin) { var a = 1, c = 0; for (var i = ini; i < fin; i++) { a = (a + b[i]) % 251; c = (c + a) % 251; } return [a, c]; }
  function transformar(bytes, Clase) {
    var cs = new G[Clase]('deflate-raw'), w = cs.writable.getWriter(); w.write(bytes); w.close();
    return new Response(cs.readable).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  function comprimir(bytes) { return typeof CompressionStream === 'undefined' ? Promise.resolve(null) : transformar(bytes, 'CompressionStream').catch(function () { return null; }); }
  function descomprimir(bytes) { return typeof DecompressionStream === 'undefined' ? Promise.reject(new Error('Este navegador no puede leer codigos comprimidos')) : transformar(bytes, 'DecompressionStream'); }

  function ipv4Bytes(ip) { var p = ip.split('.'); return p.length === 4 ? p.map(Number) : null; }
  function ipv6Bytes(ip) {
    var m = ip.split('::'); if (m.length > 2) return null;
    var a = m[0] ? m[0].split(':') : [], z = m.length === 2 && m[1] ? m[1].split(':') : [];
    if (m.length === 1 && a.length !== 8) return null;
    var g = a.concat(new Array(m.length === 2 ? 8 - a.length - z.length : 0).fill('0'), z), out = [];
    if (g.length !== 8) return null;
    for (var i = 0; i < 8; i++) { var v = parseInt(g[i] || '0', 16); if (isNaN(v)) return null; out.push(v >> 8, v & 255); }
    return out;
  }
  function ipv6Texto(b) { var g = []; for (var i = 0; i < 16; i += 2) g.push(((b[i] << 8) | b[i + 1]).toString(16)); return g.join(':'); }
  function hex(b) { return b.map(function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
  function deHex(s) { var o = []; for (var i = 0; i < s.length; i += 2) o.push(parseInt(s.substr(i, 2), 16)); return o; }
  var TIPOS = ['host', 'srflx', 'relay'];

  // info = {id, usuario, clave, huella:'AA:BB..', cands:[{tipo:'host'|'srflx'|'relay', ip, puerto}], respuesta:bool}
  function infoDesdeSDP(sdp) {
    var info = { id: 0, usuario: '', clave: '', huella: '', cands: [] }, vistos = {}, linea;
    var ls = sdp.split(/\r?\n/);
    for (var i = 0; i < ls.length; i++) {
      linea = ls[i];
      if (linea.indexOf('a=ice-ufrag:') === 0) info.usuario = linea.slice(12);
      else if (linea.indexOf('a=ice-pwd:') === 0) info.clave = linea.slice(10);
      else if (linea.indexOf('a=fingerprint:sha-256 ') === 0) info.huella = linea.slice(22).toUpperCase();
      else if (linea.indexOf('a=candidate:') === 0) {
        var p = linea.slice(12).split(' ');
        if (p[2].toLowerCase() !== 'udp' || p[1] !== '1') continue;
        var tipo = TIPOS.indexOf(p[7]); if (tipo < 0) continue;
        var ip = p[4], puerto = +p[5], k = ip + ':' + puerto;
        if (vistos[k] || /^fe80|^169\.254\.|^127\./i.test(ip)) continue;
        vistos[k] = 1; info.cands.push({ tipo: TIPOS[tipo], ip: ip, puerto: puerto, prio: +p[3] });
      }
    }
    if (!info.usuario || !info.clave || !info.huella) throw new Error('SDP sin datos ICE/DTLS (huella sha-256)');
    info.cands = elegirCandidatos(info.cands);
    return info;
  }
  function elegirCandidatos(cs) {
    function fam(c) { return /^\d+\.\d+\.\d+\.\d+$/.test(c.ip) ? 4 : /\.local$/i.test(c.ip) ? 'm' : 6; }
    var o = { s4: [], h4: [], m: [], v6: [], r: [] };
    cs.forEach(function (c) {
      var f = fam(c);
      if (c.tipo === 'relay') o.r.push(c); else if (f === 'm') o.m.push(c);
      else if (f === 6) { if (/^[23]/.test(c.ip)) o.v6.push(c); }
      else if (c.tipo === 'srflx') o.s4.push(c); else o.h4.push(c);
    });
    return o.s4.slice(0, 2).concat(o.h4.slice(0, 3), o.m.slice(0, 1), o.v6.slice(0, 2), o.r.slice(0, 1));
  }
  function sdpDesdeInfo(info) {
    var L = ['v=0', 'o=- 4611731400430051336 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0', 'a=ice-ufrag:' + info.usuario, 'a=ice-pwd:' + info.clave,
      'a=ice-options:trickle', 'a=fingerprint:sha-256 ' + info.huella, 'a=setup:' + (info.respuesta ? 'active' : 'actpass'), 'a=mid:0',
      'a=sctp-port:5000', 'a=max-message-size:262144'];
    var pref = { host: 126, srflx: 100, relay: 0 };
    info.cands.forEach(function (c, i) {
      var prio = (pref[c.tipo] * 16777216) + (65535 - i * 256) * 256 + 255;
      L.push('a=candidate:' + (i + 1) + ' 1 udp ' + prio + ' ' + c.ip + ' ' + c.puerto + ' typ ' + c.tipo);
    });
    L.push('a=end-of-candidates');
    return L.join('\r\n') + '\r\n';
  }
  function codificarCuerpo(info) {
    var o = [info.id & 255], u = [], p = [], i;
    for (i = 0; i < info.usuario.length; i++) u.push(info.usuario.charCodeAt(i) & 127);
    for (i = 0; i < info.clave.length; i++) p.push(info.clave.charCodeAt(i) & 127);
    o.push(u.length); o = o.concat(u); o.push(p.length); o = o.concat(p);
    var fp = info.huella.split(':').map(function (h) { return parseInt(h, 16); });
    if (fp.length !== 32) throw new Error('huella invalida');
    o = o.concat(fp); o.push(info.cands.length);
    info.cands.forEach(function (c) {
      var k = TIPOS.indexOf(c.tipo), addr, f;
      if (/^\d+\.\d+\.\d+\.\d+$/.test(c.ip)) { f = 0; addr = ipv4Bytes(c.ip); }
      else if (/^[0-9a-f-]{36}\.local$/i.test(c.ip)) { f = 2; addr = deHex(c.ip.slice(0, -6).replace(/-/g, '')); }
      else { f = 1; addr = ipv6Bytes(c.ip); }
      o.push(f * 3 + k); o = o.concat(addr); o.push(c.puerto >> 8, c.puerto & 255);
    });
    return new Uint8Array(o);
  }
  function decodificarCuerpo(b) {
    var i = 0, info = { id: b[i++], cands: [] }, n, s = '';
    n = b[i++]; for (s = ''; n--;) s += String.fromCharCode(b[i++]); info.usuario = s;
    n = b[i++]; for (s = ''; n--;) s += String.fromCharCode(b[i++]); info.clave = s;
    info.huella = Array.prototype.map.call(b.subarray(i, i + 32), function (x) { return (x < 16 ? '0' : '') + x.toString(16).toUpperCase(); }).join(':'); i += 32;
    n = b[i++];
    while (n--) {
      var t = b[i++], f = Math.floor(t / 3), k = t % 3, ip;
      if (f === 0) { ip = b[i] + '.' + b[i + 1] + '.' + b[i + 2] + '.' + b[i + 3]; i += 4; }
      else { var a = Array.prototype.slice.call(b, i, i + 16); i += 16; if (f === 1) ip = ipv6Texto(a); else { var h = hex(a); ip = h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20) + '.local'; } }
      info.cands.push({ tipo: TIPOS[k], ip: ip, puerto: (b[i] << 8) | b[i + 1] }); i += 2;
    }
    if (i > b.length) throw new Error('codigo truncado');
    return info;
  }
  // codigo = base64url( [flags: bit0 deflate, bit1 respuesta] + cuerpo(+deflate) + checksum(2) )
  function generarCodigo(info, respuesta) {
    var cuerpo = codificarCuerpo(info);
    return comprimir(cuerpo).then(function (c) {
      var usar = c && c.length < cuerpo.length, datos = usar ? c : cuerpo, out = new Uint8Array(datos.length + 3);
      out[0] = (usar ? 1 : 0) | (respuesta ? 2 : 0); out.set(datos, 1);
      var ck = checksum(out, 0, out.length - 2); out[out.length - 2] = ck[0]; out[out.length - 1] = ck[1];
      return b64uEnc(out);
    });
  }
  function extraerCodigo(txt) {
    txt = String(txt || '').trim();
    var m = txt.match(/[?&#]sala=([A-Za-z0-9_-]+)/); if (m) return m[1];
    return txt.replace(/\s+/g, '').replace(/^.*[=\/]/, '');
  }
  function leerCodigo(txt) {
    var b;
    try { b = b64uDec(extraerCodigo(txt)); } catch (e) { return Promise.reject(new Error('Codigo no valido (caracteres extranos)')); }
    if (b.length < 40) return Promise.reject(new Error('Codigo demasiado corto o incompleto'));
    var ck = checksum(b, 0, b.length - 2);
    if (ck[0] !== b[b.length - 2] || ck[1] !== b[b.length - 1]) return Promise.reject(new Error('Codigo incompleto o con errores: copialo de nuevo entero'));
    var cuerpo = b.subarray(1, b.length - 2), pr = (b[0] & 1) ? descomprimir(cuerpo) : Promise.resolve(cuerpo);
    return pr.then(function (c) { var info = decodificarCuerpo(c); info.respuesta = !!(b[0] & 2); return info; });
  }

  /* framing */
  Red.empaquetar = function (t, d, de, extra) {
    var m = { t: t }; if (d !== undefined) m.d = d; if (de !== undefined) m.de = de;
    if (extra) for (var k in extra) m[k] = extra[k];
    return JSON.stringify(m);
  };
  Red.desempaquetar = function (txt, max) {
    if (typeof txt !== 'string' || txt.length > (max || Red.config.maxMensaje * 2)) return null;
    try { var m = JSON.parse(txt); return m && typeof m.t === 'string' ? m : null; } catch (e) { return null; }
  };
  Red.compactar = function (v, dec) {
    var f = Math.pow(10, dec == null ? 2 : dec);
    if (typeof v === 'number') return Math.round(v * f) / f;
    if (Array.isArray(v)) return v.map(function (x) { return Red.compactar(x, dec); });
    if (v && typeof v === 'object') { var o = {}; for (var k in v) o[k] = Red.compactar(v[k], dec); return o; }
    return v;
  };

  /* ---------- Interpolador ---------- */
  function difAng(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; return d; }
  function mezcla(a, b, k, ang, clave, extra) {
    if (typeof a === 'number' && typeof b === 'number') return ang && ang.indexOf(clave) >= 0 ? a + difAng(a, b) * k : a + (b - a) * k;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      var o = Array.isArray(b) ? [] : {};
      for (var key in b) o[key] = key in a ? mezcla(a[key], b[key], k, ang, key) : b[key];
      return o;
    }
    return k >= 0.5 ? b : a;
  }
  function Interpolador(o) {
    o = o || {};
    this.retardo = o.retardo == null ? 100 : o.retardo; this.max = o.max || 40; this.angulos = o.angulos || [];
    this.extrapolar = o.extrapolar == null ? 120 : o.extrapolar; this.reloj = o.reloj || function () { return Red.reloj(); };
    this.buf = [];
  }
  Interpolador.prototype.agregar = function (t, estado) {
    var b = this.buf, i = b.length;
    while (i > 0 && b[i - 1].t > t) i--;
    if (i > 0 && b[i - 1].t === t) return;
    b.splice(i, 0, { t: t, e: estado });
    while (b.length > this.max) b.shift();
  };
  Interpolador.prototype.limpiar = function () { this.buf.length = 0; };
  Interpolador.prototype.obtener = function (ahora) {
    var b = this.buf, n = b.length; if (!n) return null;
    var rt = (ahora == null ? this.reloj() : ahora) - this.retardo;
    if (rt <= b[0].t) return mezcla(b[0].e, b[0].e, 0, this.angulos);
    var i = 0; while (i < n - 1 && b[i + 1].t <= rt) i++;
    if (i < n - 1) { var a = b[i], c = b[i + 1]; if (i > 1) b.splice(0, i - 1); return mezcla(a.e, c.e, (rt - a.t) / (c.t - a.t), this.angulos); }
    var u = b[n - 1], dt = Math.min(rt - u.t, this.extrapolar);
    if (n < 2 || dt <= 0) return mezcla(u.e, u.e, 0, this.angulos);
    var p = b[n - 2], span = u.t - p.t; if (span <= 0) return mezcla(u.e, u.e, 0, this.angulos);
    return mezcla(p.e, u.e, 1 + dt / span, this.angulos);
  };
  Red.Interpolador = Interpolador;

  Red._util = { b64uEnc: b64uEnc, b64uDec: b64uDec, infoDesdeSDP: infoDesdeSDP, sdpDesdeInfo: sdpDesdeInfo, generarCodigo: generarCodigo, leerCodigo: leerCodigo, extraerCodigo: extraerCodigo, elegirCandidatos: elegirCandidatos, limpiarNombre: limpiarNombre };

  if (!esNav) { Red.estado = 'inactivo'; if (typeof module !== 'undefined') module.exports = Red; return; }

  /* ---------- estado de la sala ---------- */
  var peers = {}, tabla = {}, heartbeat = null, ticks = 0, muestras = [], offset = 0, seq = 0;
  Red.estado = 'inactivo'; Red.esAnfitrion = false; Red.miId = -1; Red.conectado = false; Red.jugadores = {}; Red.sala = {}; Red.max = 4; Red.rtt = 0;
  Red.stats = { enviados: 0, recibidos: 0, descartados: 0, bytesTx: 0, bytesRx: 0 };
  Red.reloj = function () { return performance.now() + offset; };
  Red.lista = function () { return Object.keys(Red.jugadores).map(Number).sort(function (a, b) { return a - b; }).map(function (i) { return Red.jugadores[i]; }); };
  Red.cuantos = function () { return Object.keys(Red.jugadores).length; };
  Red.codigoDeUrl = function () { var m = /[?&]sala=([A-Za-z0-9_-]+)/.exec(G.location.search + G.location.hash); return m ? m[1] : ''; };

  function ponerEstado(e) { if (Red.estado !== e) { Red.estado = e; emitir('estado', e); } }
  function actualizarConectado() { Red.conectado = Red.estado === 'anfitrion' || Red.estado === 'conectado'; }
  function copiaJug(j) { return { id: j.id, nombre: j.nombre, color: j.color, ping: j.ping, listo: !!j.listo }; }

  function limpiarColor2(c, usados) {
    c = limpiarColor(c);
    if (usados.indexOf(c) < 0) return c;
    for (var i = 0; i < PALETA.length; i++) if (usados.indexOf(PALETA[i]) < 0) return PALETA[i];
    return c;
  }

  /* ---------- peers ---------- */
  function nuevoPC() {
    var pc = new RTCPeerConnection({ iceServers: Red.config.iceServers });
    var f = pc.createDataChannel('f', { negotiated: true, id: 0 });
    var r = pc.createDataChannel('r', { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
    f.binaryType = r.binaryType = 'arraybuffer';
    f.bufferedAmountLowThreshold = 65536;
    return { pc: pc, f: f, r: r };
  }
  function esperarICE(pc) {
    return new Promise(function (ok) {
      var fin = false, idle = null, tope = setTimeout(listo, Red.config.esperaICE), cuantos = 0;
      function listo() { if (fin) return; fin = true; clearTimeout(idle); clearTimeout(tope); pc.removeEventListener('icecandidate', alCand); pc.removeEventListener('icegatheringstatechange', alEst); ok(); }
      function alCand(e) { if (!e.candidate) return listo(); cuantos++; clearTimeout(idle); idle = setTimeout(listo, Red.config.esperaIdle); }
      function alEst() { if (pc.iceGatheringState === 'complete') listo(); }
      pc.addEventListener('icecandidate', alCand); pc.addEventListener('icegatheringstatechange', alEst); alEst();
    });
  }
  function crearPeer(id) {
    var c = nuevoPC(), p = { id: id, pc: c.pc, f: c.f, r: c.r, cola: [], ultimoRx: performance.now(), unido: false, cerrado: false, tDesc: null };
    peers[id] = p;
    c.f.onopen = function () { vaciar(p); if (!Red.esAnfitrion) enviarCrudo(p, Red.empaquetar('_hola', { n: tabla.yo.nombre, c: tabla.yo.color }), true); };
    c.f.onbufferedamountlow = function () { vaciar(p); };
    c.f.onclose = c.r.onclose = function () { soltar(p, 'canal cerrado'); };
    c.f.onmessage = c.r.onmessage = function (e) { p.ultimoRx = performance.now(); Red.stats.recibidos++; Red.stats.bytesRx += e.data.length || 0; recibir(p, Red.desempaquetar(e.data)); };
    c.pc.onconnectionstatechange = function () {
      var s = c.pc.connectionState; clearTimeout(p.tDesc);
      if (s === 'failed' || s === 'closed') soltar(p, s === 'failed' ? 'conexion fallida' : 'cerrado');
      else if (s === 'disconnected') p.tDesc = setTimeout(function () { soltar(p, 'conexion perdida'); }, 4000);
    };
    return p;
  }
  function vaciar(p) {
    while (p.cola.length && p.f.readyState === 'open' && p.f.bufferedAmount < Red.config.maxBufFiable) {
      var s = p.cola.shift(); try { p.f.send(s); Red.stats.enviados++; Red.stats.bytesTx += s.length; } catch (e) { break; }
    }
  }
  function enviarCrudo(p, str, fiable) {
    if (!p || p.cerrado) return false;
    var ch = fiable || p.r.readyState !== 'open' ? p.f : p.r;
    if (ch === p.r) {
      if (ch.bufferedAmount > Red.config.maxBufRapido) { Red.stats.descartados++; return false; }
      try { ch.send(str); Red.stats.enviados++; Red.stats.bytesTx += str.length; } catch (e) { return false; }
      return true;
    }
    if (p.cola.length || ch.readyState !== 'open' || ch.bufferedAmount > Red.config.maxBufFiable) {
      if (ch.readyState === 'closing' || ch.readyState === 'closed') return false;
      if (p.cola.length >= Red.config.maxCola) { p.cola.shift(); Red.stats.descartados++; }
      p.cola.push(str); vaciar(p); return true;
    }
    try { ch.send(str); Red.stats.enviados++; Red.stats.bytesTx += str.length; } catch (e) { return false; }
    return true;
  }
  function destruirPeer(p) {
    p.cerrado = true; clearTimeout(p.tDesc); clearTimeout(p.expira); clearTimeout(p.tCon);
    if (peers[p.id] === p) delete peers[p.id];
    try { p.f.onclose = p.r.onclose = null; p.pc.onconnectionstatechange = null; p.f.close(); p.r.close(); p.pc.close(); } catch (e) {}
  }

  /* ---------- tabla de jugadores ---------- */
  function publicarTabla() {
    var t = {};
    Object.keys(tabla).forEach(function (k) { if (k !== 'yo') t[k] = copiaJug(tabla[k]); });
    Red.jugadores = t; return t;
  }
  function difundirTabla() {
    var j = {}; Object.keys(Red.jugadores).forEach(function (k) { var x = Red.jugadores[k]; j[k] = { n: x.nombre, c: x.color, p: x.ping, l: x.listo ? 1 : 0 }; });
    var s = Red.empaquetar('_jugadores', { j: j, s: Red.sala });
    Object.keys(peers).forEach(function (k) { if (peers[k].unido) enviarCrudo(peers[k], s, true); });
  }
  function cambioTabla() { publicarTabla(); emitir('jugadores', Red.jugadores); if (Red.esAnfitrion) difundirTabla(); }
  function perfilCambiado() {
    var pf = Red.perfil.obtener();
    if (Red.esAnfitrion) {
      var usados = Object.keys(Red.jugadores).filter(function (k) { return +k !== 0; }).map(function (k) { return Red.jugadores[k].color; });
      tabla[0].nombre = pf.nombre; tabla[0].color = limpiarColor2(pf.color, usados); cambioTabla();
    } else if (Red.estado === 'conectado') enviarCrudo(peers[0], Red.empaquetar('_perfil', { n: pf.nombre, c: pf.color }), true);
  }

  /* ---------- sala (anfitrion) ---------- */
  function iniciarHeartbeat() {
    clearInterval(heartbeat); ticks = 0;
    heartbeat = setInterval(function () {
      var ahora = performance.now(); ticks++;
      Object.keys(peers).forEach(function (k) { var p = peers[k]; if (p.unido && ahora - p.ultimoRx > Red.config.timeout) soltar(p, 'tiempo agotado'); });
      if (Red.esAnfitrion) { if (ticks % 2 === 0) difundirTabla(); }
      else if (peers[0] && peers[0].unido) {
        enviarCrudo(peers[0], Red.empaquetar('_ping', { t: performance.now(), r: Math.round(Red.rtt) }), false);
      }
    }, Red.config.heartbeat);
  }
  Red.crearSala = function (opts) {
    opts = opts || {};
    if (Red.estado !== 'inactivo') Red.salir();
    var pf = Red.perfil.obtener();
    Red.esAnfitrion = true; Red.miId = 0; Red.max = Math.max(2, Math.min(4, opts.max || Red.config.maxJugadores)); Red.sala = {};
    if (opts.url) Red.config.urlBase = opts.url;
    tabla = { yo: null }; tabla[0] = { id: 0, nombre: limpiarNombre(opts.nombre || pf.nombre), color: limpiarColor(opts.color || pf.color), ping: 0, listo: false }; tabla.yo = tabla[0];
    offset = 0; muestras = []; Red.rtt = 0;
    publicarTabla(); ponerEstado('anfitrion'); actualizarConectado(); iniciarHeartbeat(); emitir('jugadores', Red.jugadores);
    return Red;
  };
  function idLibre() { for (var i = 1; i < Red.max; i++) if (!peers[i]) return i; return -1; }
  function urlBase() { return Red.config.urlBase || (G.location.origin + G.location.pathname); }
  Red.invitar = function () {
    if (!Red.esAnfitrion) return Promise.reject(new Error('Solo el anfitrion invita'));
    var id = idLibre(); if (id < 0) return Promise.reject(new Error('La sala esta llena'));
    var p = crearPeer(id); p.pendiente = true;
    p.expira = setTimeout(function () { if (!p.unido) soltar(p, 'invitacion caducada'); }, Red.config.timeoutInvitacion);
    return p.pc.createOffer().then(function (o) { return p.pc.setLocalDescription(o); }).then(function () { return esperarICE(p.pc); }).then(function () {
      var info = infoDesdeSDP(p.pc.localDescription.sdp); info.id = id;
      return generarCodigo(info, false);
    }).then(function (codigo) {
      var b = urlBase(), enlace = b + (b.indexOf('?') >= 0 ? '&' : '?') + 'sala=' + codigo;
      emitir('invitacion', id, 'creada'); return { id: id, codigo: codigo, enlace: enlace };
    }).catch(function (e) { destruirPeer(p); throw e; });
  };
  Red.aceptarRespuesta = function (codigo) {
    return leerCodigo(codigo).then(function (info) {
      if (!info.respuesta) throw new Error('Ese es un codigo de invitacion, pega el codigo de RESPUESTA del amigo');
      var p = peers[info.id];
      if (!p || !p.pendiente || p.respondida) throw new Error('No hay invitacion pendiente para ese codigo (puede haber caducado o ya usarse)');
      p.respondida = true;
      return p.pc.setRemoteDescription({ type: 'answer', sdp: sdpDesdeInfo(info) }).then(function () {
        return new Promise(function (ok, mal) {
          p.alUnir = ok; p.alFallar = mal;
          p.tCon = setTimeout(function () { if (!p.unido) { mal(new Error('No se pudo conectar (tiempo agotado). ' + Red.consejos[1])); soltar(p, 'tiempo agotado'); } }, Red.config.timeoutConexion);
        });
      });
    });
  };

  /* ---------- unirse (amigo) ---------- */
  Red.unirse = function (txt) {
    if (Red.estado !== 'inactivo') Red.salir();
    var p, info;
    return leerCodigo(txt).then(function (i) {
      info = i; if (info.respuesta) throw new Error('Ese es un codigo de respuesta; necesitas el ENLACE de invitacion del anfitrion');
      Red.esAnfitrion = false; Red.miId = info.id; tabla = {}; var pf = Red.perfil.obtener(); tabla.yo = { id: info.id, nombre: pf.nombre, color: pf.color, ping: 0, listo: false };
      muestras = []; offset = 0; Red.rtt = 0; Red.sala = {}; Red.jugadores = {};
      ponerEstado('uniendo'); p = crearPeer(0); p.respondida = true;
      return p.pc.setRemoteDescription({ type: 'offer', sdp: sdpDesdeInfo(info) });
    }).then(function () { return p.pc.createAnswer(); }).then(function (a) { return p.pc.setLocalDescription(a); }).then(function () { return esperarICE(p.pc); }).then(function () {
      var r = infoDesdeSDP(p.pc.localDescription.sdp); r.id = info.id;
      if (!r.cands.length) throw new Error('No se obtuvo ninguna direccion de red. ' + Red.consejos[2]);
      return generarCodigo(r, true);
    }).then(function (codigo) {
      p.tCon = setTimeout(function () { if (!p.unido) { soltar(p, 'el anfitrion no respondio a tiempo'); } }, Red.config.timeoutUnirse);
      iniciarHeartbeat(); return codigo;
    }).catch(function (e) { if (p) destruirPeer(p); reiniciar(); ponerEstado('inactivo'); throw e; });
  };
  Red.reconectar = function () { if (Red.esAnfitrion) return Red.invitar(); Red.salir(); return Promise.resolve(null); };

  /* ---------- recepcion ---------- */
  function recibir(p, m) {
    if (!m) return;
    var t = m.t;
    if (Red.esAnfitrion) {
      if (t === '_hola') return alHola(p, m.d || {});
      if (!p.unido) return;
      if (t === '_ping') { p.ultimoRx = performance.now(); if (tabla[p.id]) { tabla[p.id].ping = Math.max(0, Math.min(9999, +(m.d && m.d.r) || 0)); } return enviarCrudo(p, Red.empaquetar('_pong', { t: m.d.t, h: Red.reloj() }), false); }
      if (t === '_salir') return soltar(p, 'salio');
      if (t === '_listo') { if (tabla[p.id]) { tabla[p.id].listo = !!(m.d && m.d.l); cambioTabla(); } return; }
      if (t === '_perfil') { var d = m.d || {}, usados = Object.keys(tabla).filter(function (k) { return k !== 'yo' && +k !== p.id; }).map(function (k) { return tabla[k].color; }); tabla[p.id].nombre = limpiarNombre(d.n); tabla[p.id].color = limpiarColor2(d.c, usados); return cambioTabla(); }
      if (t === '_chat') return alChat(p.id, m.d && m.d.x);
      if (t[0] === '_') return;
      var a = m.a;
      if (a !== undefined && a !== 0 && !m.b) { var dest = peers[a]; if (dest && dest.unido) enviarCrudo(dest, Red.empaquetar(t, m.d, p.id), m.f !== 0); return; }
      if (m.b) Object.keys(peers).forEach(function (k) { var q = peers[k]; if (q !== p && q.unido) enviarCrudo(q, Red.empaquetar(t, m.d, p.id), m.f !== 0); });
      emitir('mensaje', t, m.d, p.id); return;
    }
    // amigo
    if (t === '_bienvenida') return alBienvenida(p, m.d);
    if (t === '_rechazo') return soltar(p, (m.d && m.d.motivo) || 'rechazado');
    if (t === '_pong') return alPong(m.d);
    if (t === '_jugadores') return alTabla(m.d);
    if (t === '_chat') return alChat(m.d.de, m.d.x);
    if (t === '_iniciar') return emitir('iniciar', m.d.config, Red.lista());
    if (t === '_cierre') return soltar(p, (m.d && m.d.motivo) || 'sala cerrada');
    if (t[0] === '_') return;
    emitir('mensaje', t, m.d, m.de);
  }
  function alHola(p, d) {
    if (p.unido) return;
    if (Red.cuantos() >= Red.max) { enviarCrudo(p, Red.empaquetar('_rechazo', { motivo: 'sala llena' }), true); return soltar(p, 'sala llena'); }
    var usados = Object.keys(Red.jugadores).map(function (k) { return Red.jugadores[k].color; });
    p.unido = true; p.pendiente = false; clearTimeout(p.expira); clearTimeout(p.tCon); p.ultimoRx = performance.now();
    tabla[p.id] = { id: p.id, nombre: limpiarNombre(d.n), color: limpiarColor2(d.c, usados), ping: 0, listo: false };
    publicarTabla();
    enviarCrudo(p, Red.empaquetar('_bienvenida', { id: p.id, max: Red.max }), true);
    emitir('jugadorUnido', p.id, Red.jugadores[p.id]); emitir('jugadores', Red.jugadores); difundirTabla();
    if (p.alUnir) p.alUnir(p.id);
  }
  function alBienvenida(p, d) {
    if (p.unido) return;
    p.unido = true; clearTimeout(p.tCon); Red.miId = d.id; Red.max = d.max || 4;
    ponerEstado('conectado'); actualizarConectado(); emitir('conectado', Red.miId);
  }
  function alTabla(d) {
    var antes = Red.jugadores, nueva = {};
    Object.keys(d.j || {}).forEach(function (k) { var x = d.j[k]; nueva[k] = { id: +k, nombre: limpiarNombre(x.n), color: limpiarColor(x.c), ping: x.p || 0, listo: !!x.l }; });
    Red.jugadores = nueva; Red.sala = d.s || {};
    if (nueva[Red.miId]) { tabla.yo = nueva[Red.miId]; }
    Object.keys(nueva).forEach(function (k) { if (!antes[k] && +k !== Red.miId) emitir('jugadorUnido', +k, nueva[k]); });
    Object.keys(antes).forEach(function (k) { if (!nueva[k] && +k !== Red.miId) emitir('jugadorSalio', +k, antes[k], 'salio'); });
    emitir('jugadores', nueva); emitir('sala', Red.sala);
  }
  function alPong(d) {
    var t1 = performance.now(), rtt = t1 - d.t; if (rtt < 0 || rtt > 10000) return;
    Red.rtt = Red.rtt ? Red.rtt * 0.7 + rtt * 0.3 : rtt;
    muestras.push({ rtt: rtt, off: d.h + rtt / 2 - t1 }); if (muestras.length > 10) muestras.shift();
    var mejor = muestras[0]; muestras.forEach(function (s) { if (s.rtt < mejor.rtt) mejor = s; });
    offset = muestras.length < 3 ? mejor.off : offset * 0.5 + mejor.off * 0.5;
    if (Red.jugadores[Red.miId]) Red.jugadores[Red.miId].ping = Math.round(Red.rtt);
  }
  function alChat(de, x) {
    x = String(x == null ? '' : x).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200); if (!x) return;
    if (Red.esAnfitrion) Object.keys(peers).forEach(function (k) { if (peers[k].unido) enviarCrudo(peers[k], Red.empaquetar('_chat', { de: de, x: x }), true); });
    emitir('chat', de, x, Red.jugadores[de]);
  }

  /* ---------- salida / caida ---------- */
  function soltar(p, motivo) {
    if (p.cerrado) return;
    var uniq = p.unido, id = p.id;
    if (Red.esAnfitrion) {
      var j = Red.jugadores[id]; destruirPeer(p);
      if (p.alFallar) p.alFallar(new Error('No se pudo conectar: ' + motivo));
      if (!uniq) { emitir('invitacion', id, 'expirada'); return; }
      delete tabla[id]; publicarTabla(); emitir('jugadorSalio', id, j, motivo); emitir('jugadores', Red.jugadores); difundirTabla();
    } else {
      destruirPeer(p); cerrarTodo(motivo);
    }
  }
  function reiniciar() {
    clearInterval(heartbeat); heartbeat = null;
    Object.keys(peers).forEach(function (k) { destruirPeer(peers[k]); });
    Red.esAnfitrion = false; Red.miId = -1; Red.jugadores = {}; Red.sala = {}; tabla = {}; Red.rtt = 0; offset = 0; muestras = [];
  }
  function cerrarTodo(motivo) {
    var antes = Red.jugadores, miId = Red.miId, hubo = Red.estado !== 'inactivo';
    reiniciar(); ponerEstado('inactivo'); actualizarConectado();
    if (!hubo) return;
    Object.keys(antes).forEach(function (k) { if (+k !== miId) emitir('jugadorSalio', +k, antes[k], motivo); });
    emitir('jugadores', Red.jugadores); emitir('cerrado', motivo);
  }
  Red.salir = function () {
    if (Red.estado === 'inactivo') return;
    if (Red.esAnfitrion) Object.keys(peers).forEach(function (k) { if (peers[k].unido) enviarCrudo(peers[k], Red.empaquetar('_cierre', { motivo: 'El anfitrion cerro la sala' }), true); });
    else if (peers[0] && peers[0].unido) enviarCrudo(peers[0], Red.empaquetar('_salir'), true);
    var cola = Object.keys(peers).map(function (k) { return peers[k]; });
    // deja un instante para que el mensaje de salida salga antes de cerrar
    setTimeout(function () { cola.forEach(function (p) { if (!p.cerrado) destruirPeer(p); }); }, 150);
    peers = {}; cerrarTodo('salir');
  };

  /* ---------- envio ---------- */
  function listaDestinos(a) {
    if (a === undefined) return Object.keys(peers).map(function (k) { return peers[k]; }).filter(function (p) { return p.unido; });
    return peers[a] && peers[a].unido ? [peers[a]] : [];
  }
  function validar(str) { if (str.length > Red.config.maxMensaje) { if (G.console) console.warn('Red: mensaje demasiado grande (' + str.length + ' > ' + Red.config.maxMensaje + ')'); Red.stats.descartados++; return false; } return true; }
  Red.enviar = function (tipo, datos, o) {
    o = o || {}; if (!Red.conectado || tipo[0] === '_') return false;
    var fiable = o.fiable !== false;
    if (Red.esAnfitrion) {
      var str = Red.empaquetar(tipo, datos, 0); if (!validar(str)) return false;
      var d = listaDestinos(o.a); d.forEach(function (p) { enviarCrudo(p, str, fiable); }); return d.length > 0;
    }
    if (o.a === Red.miId) return false;
    var s = Red.empaquetar(tipo, datos, Red.miId, { a: o.a === undefined ? 0 : o.a, f: fiable ? 1 : 0 }); if (!validar(s)) return false;
    return enviarCrudo(peers[0], s, fiable);
  };
  Red.difundir = function (tipo, datos, o) {
    o = o || {}; if (!Red.conectado || tipo[0] === '_') return false;
    var fiable = o.fiable !== false;
    if (Red.esAnfitrion) { var str = Red.empaquetar(tipo, datos, 0); if (!validar(str)) return false; listaDestinos().forEach(function (p) { enviarCrudo(p, str, fiable); }); return true; }
    var s = Red.empaquetar(tipo, datos, Red.miId, { b: 1, f: fiable ? 1 : 0 }); if (!validar(s)) return false;
    return enviarCrudo(peers[0], s, fiable);
  };
  Red.chat = function (texto) {
    if (!Red.conectado) return false;
    if (Red.esAnfitrion) { alChat(0, texto); return true; }
    return enviarCrudo(peers[0], Red.empaquetar('_chat', { x: String(texto).slice(0, 200) }), true);
  };
  Red.listo = function (v) {
    if (!Red.conectado) return;
    if (Red.esAnfitrion) { tabla[0].listo = !!v; cambioTabla(); } else enviarCrudo(peers[0], Red.empaquetar('_listo', { l: !!v }), true);
  };
  Red.fijarSala = function (obj) {
    if (!Red.esAnfitrion) return false;
    for (var k in obj) Red.sala[k] = obj[k];
    emitir('sala', Red.sala); difundirTabla(); return true;
  };
  Red.iniciar = function (config) {
    if (!Red.esAnfitrion) return false;
    config = config || {}; config.semilla = config.semilla == null ? Math.floor(Math.random() * 2147483647) : config.semilla;
    listaDestinos().forEach(function (p) { enviarCrudo(p, Red.empaquetar('_iniciar', { config: config }), true); });
    emitir('iniciar', config, Red.lista()); return true;
  };

  G.addEventListener('pagehide', function () { if (Red.estado !== 'inactivo') { try { Red.salir(); } catch (e) {} } });
  if (typeof module !== 'undefined') module.exports = Red;
})(typeof window !== 'undefined' ? window : globalThis);
