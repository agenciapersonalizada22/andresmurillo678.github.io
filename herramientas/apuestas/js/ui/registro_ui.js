/* Registro de apuestas: alta rapida con teclado numerico, edicion, liquidacion, CSV. */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, h = U.h, R = A.registro, C = A.cuotas;
  var V = A.vistas = A.vistas || {}, RU = A.registroUI = {};
  var filtro = { est: 'todas', q: '', etq: '' };
  var tactil = function () { return g.matchMedia && matchMedia('(pointer:coarse)').matches; };

  function teclado(getObj) {
    var teclas = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];
    return h('div', { class: 'teclado', role: 'group', 'aria-label': 'Teclado numérico' }, teclas.map(function (t) {
      return h('button', { type: 'button', class: 'tecla', 'aria-label': t === '⌫' ? 'Borrar' : t === '.' ? 'Punto decimal' : t, onpointerdown: function (e) { e.preventDefault(); }, onclick: function () {
        var o = getObj(); if (!o) return; var v = o.value;
        if (t === '⌫') v = v.slice(0, -1); else if (t === '.') { if (v.indexOf('.') < 0 && v.indexOf(',') < 0) v += v ? '.' : '0.'; } else v += t;
        o.value = v; o.dispatchEvent(new Event('input', { bubbles: true }));
      } }, t);
    }));
  }

  function opcionesCasas() {
    var s = {}; S.apuestas.forEach(function (a) { if (a.casa) s[a.casa] = 1; });
    if (S.datos) A.alertas.todosEventos(S.datos).forEach(function (x) { (x.ev.casas || []).forEach(function (c) { s[c.casa] = 1; }); });
    return Object.keys(s).sort();
  }

  RU.nueva = function (pre) { if (A.estado.autoexcluido()) { U.toast('Autoexclusión activa: no se pueden registrar apuestas.', 'peligro'); return; } formulario(R.nueva(pre || {}), true, pre && pre.probPropia, !(pre && pre.cuota)); };
  RU.editar = function (a) { formulario(JSON.parse(JSON.stringify(a)), false); };

  function formulario(a, esNueva, probPropia, vacioCuota) {
    var fmt = S.cfg.formato, objetivo = null, errores = h('div', { role: 'alert' });
    var inp = {};
    function t(k, label, o) { o = o || {}; inp[k] = U.texto({ valor: a[k] || '', lista: o.lista, onInput: function (v) { a[k] = v; } }); return U.campo(label, inp[k]); }
    function enfoca(el) { el.addEventListener('focus', function () { objetivo = el; }); }
    var cuotaEntrada = vacioCuota ? '' : fmt === 'decimal' ? String(Math.round(a.cuota * 1000) / 1000) : String(C.texto(a.cuota, fmt));
    inp.cuota = U.inputNum({ valor: cuotaEntrada, aria: 'Cuota', tecladoPropio: true, onInput: function () { var d = C.aDecimal(inp.cuota.value, fmt); a.cuota = isFinite(d) ? d : NaN; info(); } });
    inp.importe = U.inputNum({ valor: a.importe || '', aria: 'Importe', tecladoPropio: true, onInput: function (v) { a.importe = v; info(); } });
    inp.cierre = U.inputNum({ valor: a.cierre || '', aria: 'Cuota de cierre (decimal)', onInput: function (v) { a.cierre = v > 1 ? v : null; } });
    inp.cashout = U.inputNum({ valor: a.cashout == null ? '' : a.cashout, aria: 'Importe de cash-out', onInput: function (v) { a.cashout = isFinite(v) ? v : null; } });
    enfoca(inp.cuota); enfoca(inp.importe);
    var inf = h('small', { class: 'muted', 'aria-live': 'polite' });
    function info() {
      var im = U.leerNum(inp.importe), cu = a.tipo === 'combinada' ? R.cuotaTotal(a) : a.cuota;
      var partes = [];
      if (cu > 1) partes.push('Prob. implícita ' + U.p(1 / cu) + ' · en decimal ' + U.n(cu, 3));
      if (cu > 1 && im > 0) partes.push('Ganancia posible ' + U.m(im * (cu - 1), true));
      inf.textContent = partes.join(' · ');
    }
    var chips = h('div', { class: 'fila chips', role: 'group', 'aria-label': 'Importes rápidos' });
    function pintaChips() {
      var u = S.cfg.unidad, xs = [0.5, 1, 2, 3, 5].map(function (m) { return { t: m + 'u', v: Math.round(m * u * 100) / 100 }; });
      if (probPropia && a.cuota > 1) { var k = A.banca.importe({ metodo: 'kellyFrac', banca: R.resumen(S.apuestas, S.cfg.bancaInicial).banca, prob: probPropia, cuota: a.cuota, fraccion: S.cfg.fraccionKelly }); if (k > 0) xs.push({ t: '¼ Kelly ' + U.m(k), v: Math.round(k * 100) / 100 }); }
      U.montar(chips, xs.map(function (x) { return U.btn(x.t, function () { inp.importe.value = x.v; a.importe = x.v; info(); }, 'chip'); }));
    }
    var patasDiv = h('div');
    function pintaPatas() {
      if (a.tipo !== 'combinada') { U.vaciar(patasDiv); return; }
      if (!a.patas || a.patas.length < 2) a.patas = [{ evento: a.evento || '', seleccion: a.seleccion || '', cuota: a.cuota > 1 ? a.cuota : 1.5 }, { evento: '', seleccion: '', cuota: 1.5 }];
      U.montar(patasDiv, h('h4', null, 'Selecciones de la combinada'), a.patas.map(function (p, i) {
        var e = U.texto({ valor: p.evento, placeholder: 'Evento', onInput: function (v) { p.evento = v; } }), s = U.texto({ valor: p.seleccion, placeholder: 'Selección', onInput: function (v) { p.seleccion = v; } });
        var c = U.inputNum({ valor: p.cuota, aria: 'Cuota selección ' + (i + 1), onInput: function (v) { p.cuota = v; if (v > 1) { a.cuota = R.cuotaTotal(a); inp.cuota.value = String(Math.round(a.cuota * 1000) / 1000); } info(); } });
        return h('div', { class: 'pata' }, e, s, c, a.patas.length > 2 ? U.btn('✕', function () { a.patas.splice(i, 1); a.cuota = R.cuotaTotal(a); inp.cuota.value = String(Math.round(a.cuota * 1000) / 1000); pintaPatas(); info(); }, 'pequeno', { 'aria-label': 'Quitar' }) : null);
      }), U.btn('+ Selección', function () { a.patas.push({ evento: '', seleccion: '', cuota: 1.5 }); pintaPatas(); }, 'pequeno'));
      a.cuota = R.cuotaTotal(a); inp.cuota.value = String(Math.round(a.cuota * 1000) / 1000);
    }
    var tipo = U.seg([{ v: 'simple', t: 'Simple' }, { v: 'combinada', t: 'Combinada' }], a.tipo, function (v) { a.tipo = v; pintaPatas(); info(); }, 'Tipo de apuesta');
    var estadoSel = U.selector(R.ESTADOS.map(function (e) { return { v: e, t: R.NOMBRE_ESTADO[e] }; }), a.estado, function (v) { a.estado = v; if (v !== 'pendiente' && !a.liquidada) a.liquidada = R.hoy(); if (v === 'pendiente') a.liquidada = null; });
    var etq = U.texto({ valor: (a.etiquetas || []).join(', '), placeholder: 'valor, liga, modelo…', onInput: function (v) { a.etiquetas = v.split(/[,;|]/).map(function (s) { return s.trim(); }).filter(Boolean); } });
    var notas = h('textarea', { rows: 2, 'aria-label': 'Notas', maxlength: 500 }); notas.value = a.notas || ''; notas.addEventListener('input', function () { a.notas = notas.value; });
    var fecha = h('input', { type: 'date', value: a.fecha, onchange: function (e) { a.fecha = e.target.value; } });
    var dl = h('datalist', { id: 'dlCasas' }, opcionesCasas().map(function (c) { return h('option', { value: c }); }));
    var dls = h('datalist', { id: 'dlDep' }, ['Fútbol', 'Baloncesto', 'Tenis', 'Béisbol', 'Fútbol americano', 'Hockey', 'MMA', 'Otro'].map(function (c) { return h('option', { value: c }); }));
    var liq = h('div');
    if (!esNueva) {
      U.montar(liq, h('h4', null, 'Liquidar'), h('div', { class: 'fila liq' }, [['ganada', 'Ganada', 'pos'], ['perdida', 'Perdida', 'neg'], ['anulada', 'Anulada', ''], ['mediaganada', '½ ganada', 'pos'], ['mediaperdida', '½ perdida', 'neg']].map(function (e) {
        return U.btn(e[1], function () { a.estado = e[0]; a.liquidada = R.hoy(); guardar(false); }, 'grande ' + e[2]);
      }), U.btn('Cash-out…', function () { var v = U.leerNum(inp.cashout); if (!(v >= 0)) { U.toast('Indica el importe recuperado en «Cash-out» (campos adicionales)', 'peligro'); det.open = true; inp.cashout.focus(); return; } a.estado = 'cashout'; a.cashout = v; a.liquidada = R.hoy(); guardar(false); }, 'grande'), U.btn('Reabrir', function () { a.estado = 'pendiente'; a.liquidada = null; guardar(false); }, 'grande')));
    }
    var det = h('details', null, h('summary', null, 'Más campos'),
      h('div', { class: 'form-g' }, t('deporte', 'Deporte', { lista: 'dlDep' }), t('liga', 'Liga'), t('mercado', 'Mercado'), U.campo('Fecha', fecha), U.campo('Cuota de cierre (decimal, para CLV)', inp.cierre, 'Cuota final antes del inicio'), U.campo('Estado', estadoSel), U.campo('Cash-out recuperado', inp.cashout), U.campo('Etiquetas', etq), U.campo('Notas', notas)));
    function validar() {
      var m = [];
      if (a.tipo === 'combinada') a.cuota = R.cuotaTotal(a); else { var d = C.aDecimal(inp.cuota.value, fmt); a.cuota = d; }
      if (!(a.cuota > 1)) m.push('La cuota debe ser mayor que 1 (formato ' + fmt + ').');
      a.importe = U.leerNum(inp.importe); if (!(a.importe > 0)) m.push('Indica un importe mayor que 0.');
      if (!(a.evento || '').trim() && !(a.seleccion || '').trim()) m.push('Indica al menos el evento o la selección.');
      if (a.tipo === 'combinada' && a.patas.some(function (p) { return !(U.leerNum(p.cuota) > 1); })) m.push('Cada selección de la combinada necesita cuota > 1.');
      if (a.estado === 'cashout' && !(a.cashout >= 0)) m.push('El cash-out necesita el importe recuperado.');
      return m;
    }
    function guardar(otra) {
      var m = validar(); U.montar(errores, m.length ? U.aviso(m.join(' '), 'peligro') : null);
      if (m.length) return;
      if (a.tipo === 'combinada') a.patas.forEach(function (p) { p.cuota = U.leerNum(p.cuota); }); else a.patas = [];
      var seguir = Promise.resolve(true);
      if (esNueva && a.estado === 'pendiente') {
        var ex = R.evaluarLimites(S.apuestas.concat([a]), { perdidaDia: S.cfg.limites.perdidaDia, perdidaSemana: S.cfg.limites.perdidaSemana, perdidaMes: S.cfg.limites.perdidaMes, aviso: S.cfg.limites.aviso / 100 }).filter(function (x) { return x.estado === 'excedido'; });
        if (ex.length) seguir = U.confirmar('Con esta apuesta superarías tu límite de pérdida ' + ex.map(function (x) { return x.nombre + ' (' + U.m(x.limite) + ')'; }).join(' y ') + '. Tú pusiste ese límite para protegerte. ¿Registrarla igualmente?', 'Registrar igualmente', true);
      }
      seguir.then(function (ok) {
        if (!ok) return;
        return A.estado.guardarApuesta(a).then(function () { dlg.cerrar(); U.toast(esNueva ? 'Apuesta registrada' : 'Apuesta actualizada'); if (otra) RU.nueva({ casa: a.casa, fecha: a.fecha }); });
      });
    }
    var cuerpo = h('div', { class: 'form-reg' }, dl, dls, errores,
      h('div', { class: 'form-g' }, t('evento', 'Evento', {}), t('seleccion', 'Selección'), U.campo('Cuota' + (fmt === 'decimal' ? '' : ' (' + fmt + ')'), inp.cuota), U.campo('Importe', inp.importe), t('casa', 'Casa de apuestas', { lista: 'dlCasas' })),
      chips, inf, tipo, patasDiv, tactil() ? teclado(function () { return objetivo || inp.importe; }) : null, det, liq);
    var pie = [!esNueva ? U.btn('Eliminar', function () { U.confirmar('¿Eliminar esta apuesta del registro?', 'Eliminar', true).then(function (ok) { if (ok) A.estado.borrarApuesta(a.id).then(function () { dlg.cerrar(); U.toast('Apuesta eliminada'); }); }); }, 'peligro') : null,
      esNueva ? U.btn('Guardar y añadir otra', function () { guardar(true); }) : null, U.btn(esNueva ? 'Guardar apuesta' : 'Guardar cambios', function () { guardar(false); }, 'primario grande')];
    var dlg = U.modal({ titulo: esNueva ? 'Nueva apuesta' : 'Editar apuesta', contenido: cuerpo, pie: pie, clase: 'ancho form-dlg' });
    pintaChips(); pintaPatas(); info();
    if (esNueva && !a.evento) (inp.evento || cuerpo.querySelector('input')).focus();
  }

  function resumenApuesta(a) {
    var n = R.neto(a), liq = R.liquidada(a);
    return h('button', { type: 'button', class: 'card apuesta ' + a.estado, onclick: function () { RU.editar(a); }, 'aria-label': 'Editar apuesta ' + (a.evento || a.seleccion) },
      h('div', { class: 'ap-1' }, h('b', null, a.seleccion || a.evento || '(sin nombre)'), h('span', { class: 'pill est-' + a.estado }, R.NOMBRE_ESTADO[a.estado])),
      h('div', { class: 'muted ap-2' }, [a.evento && a.seleccion ? a.evento : '', a.tipo === 'combinada' ? 'Combinada ×' + (a.patas || []).length : '', a.casa, a.fecha].filter(Boolean).join(' · ')),
      h('div', { class: 'ap-3' }, h('span', null, '@' + U.cuota(a.cuota) + ' · ' + U.m(a.importe)), h('b', { class: U.clase(n) }, liq ? (a.estado === 'anulada' ? 'Devuelta' : U.m(n, true)) : 'Pend. · ganaría ' + U.m(a.importe * (a.cuota - 1), true))),
      a.etiquetas && a.etiquetas.length ? h('div', { class: 'etqs' }, a.etiquetas.map(function (e) { return h('span', { class: 'etq' }, '#' + e); })) : null);
  }

  RU.importarArchivo = function (file) {
    return file.text().then(function (txt) {
      var r = R.deCSV(txt);
      var cuerpo = h('div', null, h('p', null, h('b', null, r.apuestas.length), ' apuestas válidas' + (r.errores.length ? ' y ' + r.errores.length + ' con errores (se omiten)' : '') + '. Las que ya existan (mismo id) solo se actualizan si el archivo es más reciente.'),
        r.errores.length ? h('ul', { class: 'lista' }, r.errores.slice(0, 8).map(function (e) { return h('li', null, 'Línea ' + e.linea + ': ' + e.msg); })) : null);
      var dlg = U.modal({ titulo: 'Importar CSV', contenido: cuerpo, pie: [U.btn('Cancelar', function () { dlg.cerrar(); }), U.btn('Importar ' + r.apuestas.length, function () { A.estado.importarApuestas(r.apuestas).then(function (n) { dlg.cerrar(); U.toast(n + ' apuestas importadas'); }); }, 'primario', { disabled: !r.apuestas.length })] });
    });
  };

  V.registro = function (cont) {
    var lista = h('div', { class: 'lista-ap', 'aria-live': 'polite' }), sum = h('div', { class: 'kpis mini' });
    var f = h('input', { type: 'file', accept: '.csv,text/csv,text/plain', hidden: true, onchange: function () { if (f.files[0]) RU.importarArchivo(f.files[0]); f.value = ''; } });
    function pintar() {
      var r = R.resumen(S.apuestas, S.cfg.bancaInicial);
      U.montar(sum, U.kpi('Banca', U.m(r.banca)), U.kpi('Neto', U.m(r.neto, true), '', U.clase(r.neto)), U.kpi('Pendientes', r.pendientes, U.m(r.enJuego) + ' en juego'));
      var l = S.apuestas.filter(function (a) {
        if (filtro.est === 'pend' && a.estado !== 'pendiente') return false;
        if (filtro.est === 'liq' && a.estado === 'pendiente') return false;
        if (filtro.etq && (a.etiquetas || []).indexOf(filtro.etq) < 0) return false;
        if (filtro.q && [a.evento, a.seleccion, a.casa, a.notas, (a.etiquetas || []).join(' ')].join(' ').toLowerCase().indexOf(filtro.q.toLowerCase()) < 0) return false;
        return true;
      }).sort(function (x, y) { return (y.fecha + y.creado) < (x.fecha + x.creado) ? -1 : 1; });
      U.montar(lista, l.length ? l.map(resumenApuesta) : U.vacio(S.apuestas.length ? 'Ninguna apuesta coincide' : 'Aún no has registrado apuestas', S.apuestas.length ? 'Cambia los filtros.' : 'Registra tus apuestas para ver tu rendimiento real: ROI, yield, CLV y más. Todo se guarda solo en este dispositivo.', S.apuestas.length ? null : U.btn('Registrar la primera', function () { RU.nueva(); }, 'primario')));
    }
    var etqs = {}; S.apuestas.forEach(function (a) { (a.etiquetas || []).forEach(function (e) { etqs[e] = 1; }); });
    var q = U.texto({ valor: filtro.q, placeholder: 'Buscar…', onInput: function (v) { filtro.q = v; pintar(); } }); q.type = 'search'; q.setAttribute('aria-label', 'Buscar apuestas');
    U.montar(cont, sum, h('div', { class: 'fila acciones-reg' }, U.btn('+ Nueva apuesta', function () { RU.nueva(); }, 'primario grande', { id: 'btnNueva' }),
      U.btn('Importar CSV', function () { f.click(); }), U.btn('Exportar CSV', function () { if (!S.apuestas.length) { U.toast('No hay apuestas que exportar'); return; } U.descargar('apuestas-' + R.hoy() + '.csv', '﻿' + R.aCSV(R.ordenar(S.apuestas))); }), f),
      h('div', { class: 'fila filtros' }, U.seg([{ v: 'todas', t: 'Todas' }, { v: 'pend', t: 'Pendientes' }, { v: 'liq', t: 'Liquidadas' }], filtro.est, function (v) { filtro.est = v; pintar(); }, 'Estado'),
        U.campo('Etiqueta', U.selector([{ v: '', t: 'Todas' }].concat(Object.keys(etqs).sort().map(function (e) { return { v: e, t: '#' + e }; })), filtro.etq, function (v) { filtro.etq = v; pintar(); })), U.campo('Buscar', q)),
      lista);
    pintar();
  };
})(window);
