/* Estado compartido del modulo QR y utilidades de las vistas. window.QRApp */
(function (g) {
  'use strict';
  var T = g.Tr, ESTILO_DEF = { fg: '#000000', bg: '#ffffff', margen: 4, estilo: 'cuadrado', redondeo: 0.5, logo: null, logoTam: 0.2, transparente: false };
  var A = g.QRApp = { vistas: {}, escuchas: {} };
  A.est = { tipo: 'url', valores: {}, ecc: 'M', modo: 'auto', estilo: Object.assign({}, ESTILO_DEF), lote: [], loteTexto: '' };
  try { var a = JSON.parse(T.ls('trabajos_qr_ajustes_dispositivo') || '{}'); if (a.ecc) A.est.ecc = a.ecc; if (a.estilo) { var e = a.estilo; delete e.logo; Object.assign(A.est.estilo, e); } } catch (x) {}
  A.guardarAjustes = function () { var e = Object.assign({}, A.est.estilo); delete e.logo; T.ls('trabajos_qr_ajustes_dispositivo', JSON.stringify({ ecc: A.est.ecc, estilo: e })); };
  A.ESTILO_DEF = ESTILO_DEF;
  A.on = function (ev, fn) { (A.escuchas[ev] = A.escuchas[ev] || []).push(fn); };
  A.emitir = function (ev, d) { (A.escuchas[ev] || []).forEach(function (f) { try { f(d); } catch (e) { console.error(e); } }); };
  A.ir = function (v) { A.tabs.ir(v); };
  A.aviso = T.aviso;
  /* codifica con errores legibles. Devuelve {qr} o {error} */
  A.codificar = function (texto, ecc, modo, extra) {
    try {
      if (!texto) return { error: 'Aún no hay contenido.' };
      return { qr: g.QRCodificador.codificar(texto, Object.assign({ ecc: ecc || A.est.ecc, modo: modo && modo !== 'auto' ? modo : undefined }, extra || {})) };
    } catch (e) { return { error: e.message }; }
  };
  /* estilo efectivo para un qr (limita el logo a lo que admite la correccion) */
  A.estiloPara = function (qr, base) {
    var s = Object.assign({}, base || A.est.estilo); if (s.logo) s.logoTam = Math.min(s.logoTam, g.QRRender.maxLogo(qr.ecc)); return s;
  };
  A.descripcionModo = function (m) { return { numerico: 'numérico', alfanumerico: 'alfanumérico', byte: 'byte (UTF-8)' }[m] || m; };
  /* texto actual del generador (null si invalido): {texto, tipo, titulo, error} */
  A.actual = function () {
    var t = g.QRTipos.tipo(A.est.tipo), v = A.est.valores, err = t.validar(v);
    if (err) return { error: err, tipo: t.id };
    var texto = t.construir(v), titulo = (v.ssid || v.url || v.nombre || v.titulo || v.para || v.num || v.texto || (v.lat ? v.lat + ',' + v.lon : '') || t.nombre).toString().replace(/\s+/g, ' ').slice(0, 60);
    return { texto: texto, tipo: t.id, titulo: titulo };
  };
  /* registra en el historial y concede logros */
  A.registrar = function (extra, fav) {
    var c = extra || A.actual(); if (!c.texto) return Promise.resolve(null);
    var e = { tipo: c.tipo, texto: c.texto, titulo: c.titulo, ecc: c.ecc || A.est.ecc, estilo: Object.assign({}, A.est.estilo, { logo: null }), origen: c.origen || 'crear' };
    return g.QRDatos.guardar(e, fav).then(function (r) { A.emitir('historial'); return r; }).catch(function (x) { console.warn(x); });
  };
  A.logro = function (id) { if (g.CuentaTrabajos) g.CuentaTrabajos.logro(id); };
  /* usa un texto (de lectura o historial) como contenido del generador */
  A.usarTexto = function (texto, tipoId) {
    var an = g.QRTipos.analizar(texto), id = tipoId || (an.tipo === 'url' ? 'url' : 'texto');
    A.est.tipo = id === 'url' ? 'url' : 'texto'; A.est.valores = id === 'url' ? { url: texto } : { texto: texto };
    A.emitir('cargar'); A.ir('crear');
  };
  A.miniSVG = function (texto, ecc, estilo) {
    var r = A.codificar(texto, ecc || 'M'); if (!r.qr) return null;
    return g.QRRender.svg(r.qr, Object.assign({}, estilo || {}, { logo: null }), null);
  };
  A.cuadroCampo = function (c, valor, alCambiar, pref) {
    var id = (pref || 'cp') + '-' + c.id, el, lab = T.h('label', { for: id, txt: c.etq + (c.req ? ' *' : '') });
    if (c.tipo === 'textarea') el = T.h('textarea', { id: id, rows: 3 });
    else if (c.tipo === 'select') { el = T.h('select', { id: id }); c.op.forEach(function (o) { el.appendChild(T.h('option', { value: o[0], txt: o[1] })); }); }
    else if (c.tipo === 'checkbox') { el = T.h('input', { id: id, type: 'checkbox' }); }
    else el = T.h('input', { id: id, type: c.tipo || 'text', placeholder: c.ej || null, inputmode: c.modo || null, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    if (c.tipo === 'checkbox') el.checked = !!valor; else if (valor != null) el.value = valor; else if (c.tipo === 'select') el.value = c.op[0][0];
    var leer = function () { return c.tipo === 'checkbox' ? el.checked : el.value; };
    el.addEventListener(c.tipo === 'select' || c.tipo === 'checkbox' ? 'change' : 'input', function () { alCambiar(c.id, leer()); });
    var cont = T.h('div', {}, c.tipo === 'checkbox' ? [T.h('label', { cls: 'tr-chk', for: id }, [el, c.etq])] : [lab, el]);
    if (c.ayuda) cont.appendChild(T.h('p', { cls: 'tr-ayuda', txt: c.ayuda }));
    return { raiz: cont, el: el, leer: leer };
  };
})(window);
