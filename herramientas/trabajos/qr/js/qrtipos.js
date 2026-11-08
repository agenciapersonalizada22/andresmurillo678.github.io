/* Tipos de contenido del QR: formularios -> texto codificado, y analisis del texto leido. Logica pura (Node y navegador). */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.QRTipos = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function ec(s) { return String(s == null ? '' : s).replace(/([\\;,:"])/g, '\\$1'); }                 // WiFi
  function ev(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([;,])/g, '\\$1'); }   // vCard / iCal
  function t(v) { return String(v == null ? '' : v).trim(); }
  function soloTel(s) { return t(s).replace(/[^\d+]/g, ''); }
  function fechaIcal(v, dia) { if (!v) return ''; var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); if (!m) return ''; return m[1] + m[2] + m[3] + (dia ? '' : 'T' + (m[4] || '00') + (m[5] || '00') + '00'); }
  function url(s) { s = t(s); if (!s) return ''; if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[^\s/]+:\d+(\/|$)/.test(s)) return s; return 'https://' + s.replace(/^\/+/, ''); }

  var TIPOS = [
    { id: 'url', nombre: 'Enlace (URL)', campos: [{ id: 'url', etq: 'Dirección web', tipo: 'url', ej: 'https://ejemplo.com', req: 1, ayuda: 'Si no escribes http:// o https:// se añade https://.' }],
      construir: function (v) { return url(v.url); }, validar: function (v) { var u = url(v.url); return !t(v.url) ? 'Escribe una dirección.' : /\s/.test(u) ? 'La dirección no puede tener espacios.' : !/^[a-z][a-z0-9+.-]*:\/\/?[^\s]+/i.test(u) ? 'La dirección no parece válida.' : null; } },
    { id: 'texto', nombre: 'Texto libre', campos: [{ id: 'texto', etq: 'Texto', tipo: 'textarea', req: 1 }], construir: function (v) { return String(v.texto || ''); }, validar: function (v) { return v.texto ? null : 'Escribe algún texto.'; } },
    { id: 'wifi', nombre: 'Red WiFi', campos: [{ id: 'ssid', etq: 'Nombre de la red (SSID)', tipo: 'text', req: 1 }, { id: 'clave', etq: 'Contraseña', tipo: 'text', ayuda: 'Quedará visible para quien escanee el código.' },
      { id: 'seg', etq: 'Seguridad', tipo: 'select', op: [['WPA', 'WPA/WPA2/WPA3'], ['WEP', 'WEP'], ['nopass', 'Sin contraseña']] }, { id: 'oculta', etq: 'Red oculta', tipo: 'checkbox' }],
      construir: function (v) { var s = v.seg || 'WPA'; return 'WIFI:T:' + (s === 'nopass' ? 'nopass' : s) + ';S:' + ec(v.ssid) + ';' + (s === 'nopass' ? '' : 'P:' + ec(v.clave) + ';') + (v.oculta ? 'H:true;' : '') + ';'; },
      validar: function (v) { return !t(v.ssid) ? 'Escribe el nombre de la red.' : (v.seg !== 'nopass' && !v.clave) ? 'Escribe la contraseña o elige «Sin contraseña».' : null; } },
    { id: 'vcard', nombre: 'Contacto (vCard)', campos: [{ id: 'nombre', etq: 'Nombre', tipo: 'text', req: 1 }, { id: 'apellido', etq: 'Apellidos', tipo: 'text' }, { id: 'empresa', etq: 'Empresa', tipo: 'text' }, { id: 'cargo', etq: 'Cargo', tipo: 'text' },
      { id: 'tel', etq: 'Teléfono', tipo: 'tel' }, { id: 'movil', etq: 'Móvil', tipo: 'tel' }, { id: 'correo', etq: 'Correo', tipo: 'email' }, { id: 'web', etq: 'Sitio web', tipo: 'url' }, { id: 'dir', etq: 'Dirección', tipo: 'text' }],
      construir: function (v) {
        var l = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + ev(v.apellido) + ';' + ev(v.nombre) + ';;;', 'FN:' + ev((t(v.nombre) + ' ' + t(v.apellido)).trim())];
        if (t(v.empresa)) l.push('ORG:' + ev(v.empresa)); if (t(v.cargo)) l.push('TITLE:' + ev(v.cargo));
        if (t(v.tel)) l.push('TEL;TYPE=WORK,VOICE:' + soloTel(v.tel)); if (t(v.movil)) l.push('TEL;TYPE=CELL:' + soloTel(v.movil));
        if (t(v.correo)) l.push('EMAIL:' + t(v.correo)); if (t(v.web)) l.push('URL:' + url(v.web)); if (t(v.dir)) l.push('ADR;TYPE=WORK:;;' + ev(v.dir) + ';;;;');
        l.push('END:VCARD'); return l.join('\r\n');
      }, validar: function (v) { return !t(v.nombre) && !t(v.apellido) ? 'Escribe al menos un nombre.' : t(v.correo) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t(v.correo)) ? 'El correo no parece válido.' : null; } },
    { id: 'correo', nombre: 'Correo electrónico', campos: [{ id: 'para', etq: 'Destinatario', tipo: 'email', req: 1 }, { id: 'asunto', etq: 'Asunto', tipo: 'text' }, { id: 'cuerpo', etq: 'Mensaje', tipo: 'textarea' }],
      construir: function (v) { var q = []; if (t(v.asunto)) q.push('subject=' + encodeURIComponent(t(v.asunto))); if (v.cuerpo) q.push('body=' + encodeURIComponent(v.cuerpo)); return 'mailto:' + t(v.para) + (q.length ? '?' + q.join('&') : ''); },
      validar: function (v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t(v.para)) ? null : 'Escribe un correo válido.'; } },
    { id: 'sms', nombre: 'SMS', campos: [{ id: 'num', etq: 'Número (con prefijo)', tipo: 'tel', req: 1, ej: '+34600111222' }, { id: 'msg', etq: 'Mensaje', tipo: 'textarea' }],
      construir: function (v) { return 'SMSTO:' + soloTel(v.num) + ':' + (v.msg || ''); }, validar: function (v) { return soloTel(v.num).replace(/\D/g, '').length >= 5 ? null : 'Escribe un número de teléfono válido.'; } },
    { id: 'geo', nombre: 'Ubicación', campos: [{ id: 'lat', etq: 'Latitud', tipo: 'text', req: 1, ej: '40.4168', modo: 'decimal' }, { id: 'lon', etq: 'Longitud', tipo: 'text', req: 1, ej: '-3.7038', modo: 'decimal' }],
      construir: function (v) { return 'geo:' + t(v.lat).replace(',', '.') + ',' + t(v.lon).replace(',', '.'); },
      validar: function (v) { var a = parseFloat(t(v.lat).replace(',', '.')), b = parseFloat(t(v.lon).replace(',', '.')); return !isFinite(a) || !isFinite(b) ? 'Escribe latitud y longitud en decimales.' : Math.abs(a) > 90 ? 'La latitud va de -90 a 90.' : Math.abs(b) > 180 ? 'La longitud va de -180 a 180.' : null; } },
    { id: 'evento', nombre: 'Evento de calendario', campos: [{ id: 'titulo', etq: 'Título', tipo: 'text', req: 1 }, { id: 'todoDia', etq: 'Todo el día', tipo: 'checkbox' }, { id: 'ini', etq: 'Inicio', tipo: 'datetime-local', req: 1 }, { id: 'fin', etq: 'Fin', tipo: 'datetime-local' }, { id: 'lugar', etq: 'Lugar', tipo: 'text' }, { id: 'desc', etq: 'Descripción', tipo: 'textarea' }],
      construir: function (v) {
        var d = !!v.todoDia, l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:' + ev(v.titulo), 'DTSTART' + (d ? ';VALUE=DATE' : '') + ':' + fechaIcal(v.ini, d)];
        if (v.fin) l.push('DTEND' + (d ? ';VALUE=DATE' : '') + ':' + fechaIcal(v.fin, d)); if (t(v.lugar)) l.push('LOCATION:' + ev(v.lugar)); if (t(v.desc)) l.push('DESCRIPTION:' + ev(v.desc));
        l.push('END:VEVENT', 'END:VCALENDAR'); return l.join('\r\n');
      }, validar: function (v) { return !t(v.titulo) ? 'Escribe el título.' : !fechaIcal(v.ini) ? 'Indica la fecha de inicio.' : v.fin && fechaIcal(v.fin) < fechaIcal(v.ini) ? 'El fin no puede ser anterior al inicio.' : null; } },
    { id: 'whatsapp', nombre: 'WhatsApp', campos: [{ id: 'num', etq: 'Número con prefijo de país', tipo: 'tel', req: 1, ej: '34600111222', ayuda: 'Solo dígitos, sin + ni ceros iniciales.' }, { id: 'msg', etq: 'Mensaje inicial (opcional)', tipo: 'textarea' }],
      construir: function (v) { return 'https://wa.me/' + String(v.num || '').replace(/\D/g, '').replace(/^0+/, '') + (t(v.msg) ? '?text=' + encodeURIComponent(v.msg) : ''); },
      validar: function (v) { var d = String(v.num || '').replace(/\D/g, ''); return d.length < 7 || d.length > 15 ? 'El número debe tener entre 7 y 15 dígitos con prefijo de país.' : null; } }
  ];
  function tipo(id) { return TIPOS.filter(function (x) { return x.id === id; })[0] || TIPOS[0]; }

  /* texto leido -> {tipo, etiqueta, campos:[[nombre,valor]], accion:{tipo:'abrir'|'llamar'|'correo'|'mapa'|null, href}} */
  function analizar(s) {
    s = String(s || ''); var m, c = [], r;
    function par(txt) { var o = {}; txt.replace(/\\;/g, '\u0001').split(';').forEach(function (p) { var i = p.indexOf(':'); if (i > 0) o[p.slice(0, i).toUpperCase()] = p.slice(i + 1).replace(/\u0001/g, ';').replace(/\\([\\;,:"])/g, '$1'); }); return o; }
    if (/^WIFI:/i.test(s)) { r = par(s.slice(5)); return { tipo: 'wifi', etiqueta: 'Red WiFi', campos: [['Red', r.S || ''], ['Seguridad', r.T || ''], ['Contraseña', r.P || '(sin contraseña)'], ['Oculta', r.H === 'true' ? 'sí' : 'no']], accion: null }; }
    if (/^BEGIN:VCARD/i.test(s)) { var ln = s.split(/\r?\n/), get = function (k) { var l = ln.filter(function (x) { return new RegExp('^' + k + '[;:]', 'i').test(x); })[0]; return l ? l.slice(l.indexOf(':') + 1).replace(/\\n/g, ' ').replace(/\\([,;])/g, '$1') : ''; }; return { tipo: 'vcard', etiqueta: 'Contacto', campos: [['Nombre', get('FN')], ['Empresa', get('ORG')], ['Teléfono', get('TEL')], ['Correo', get('EMAIL')], ['Web', get('URL')]].filter(function (x) { return x[1]; }), accion: null }; }
    if (/^BEGIN:VCALENDAR|^BEGIN:VEVENT/i.test(s)) { var l2 = s.split(/\r?\n/), g2 = function (k) { var l = l2.filter(function (x) { return new RegExp('^' + k + '[;:]', 'i').test(x); })[0]; return l ? l.slice(l.indexOf(':') + 1) : ''; }; return { tipo: 'evento', etiqueta: 'Evento', campos: [['Título', g2('SUMMARY')], ['Inicio', g2('DTSTART')], ['Fin', g2('DTEND')], ['Lugar', g2('LOCATION')]].filter(function (x) { return x[1]; }), accion: null }; }
    if ((m = s.match(/^mailto:([^?]*)(?:\?(.*))?$/i))) { var q = {}; (m[2] || '').split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) { try { q[p.slice(0, i).toLowerCase()] = decodeURIComponent(p.slice(i + 1)); } catch (e) { q[p.slice(0, i).toLowerCase()] = p.slice(i + 1); } } }); return { tipo: 'correo', etiqueta: 'Correo', campos: [['Para', m[1]], ['Asunto', q.subject || ''], ['Mensaje', q.body || '']].filter(function (x) { return x[1]; }), accion: { tipo: 'correo', href: s } }; }
    if ((m = s.match(/^smsto?:([^:?]*)[:?]?(?:body=)?(.*)$/i))) return { tipo: 'sms', etiqueta: 'SMS', campos: [['Número', m[1]], ['Mensaje', m[2]]].filter(function (x) { return x[1]; }), accion: null };
    if ((m = s.match(/^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i))) return { tipo: 'geo', etiqueta: 'Ubicación', campos: [['Latitud', m[1]], ['Longitud', m[2]]], accion: { tipo: 'mapa', href: 'https://www.openstreetmap.org/?mlat=' + m[1] + '&mlon=' + m[2] + '#map=16/' + m[1] + '/' + m[2] } };
    if ((m = s.match(/^tel:(.+)$/i))) return { tipo: 'tel', etiqueta: 'Teléfono', campos: [['Número', m[1]]], accion: { tipo: 'llamar', href: s } };
    if (/^https?:\/\/\S+$/i.test(s)) { var wa = /^https:\/\/wa\.me\//i.test(s); return { tipo: wa ? 'whatsapp' : 'url', etiqueta: wa ? 'WhatsApp' : 'Enlace', campos: [['Dirección', s]], accion: { tipo: 'abrir', href: s } }; }
    return { tipo: 'texto', etiqueta: 'Texto', campos: [['Contenido', s]], accion: null };
  }
  return { TIPOS: TIPOS, tipo: tipo, analizar: analizar, normalizarUrl: url };
});
