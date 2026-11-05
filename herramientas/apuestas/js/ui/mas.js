/* Juego responsable, ajustes, datos y aviso legal. */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, h = U.h, R = A.registro, E = A.estado;
  var V = A.vistas = A.vistas || {};
  var sub = 'resp';

  var RECURSOS = h('div', null,
    h('p', null, 'Apostar debe ser entretenimiento, no una fuente de ingresos ni una forma de recuperar pérdidas. Nunca apuestes dinero que necesites para vivir.'),
    h('h4', null, 'Señales de alerta'),
    h('ul', { class: 'lista' }, ['Apostar más dinero o tiempo del que habías decidido.', 'Intentar recuperar pérdidas apostando más («perseguir»).', 'Pedir prestado o descuidar facturas para apostar.', 'Sentir irritabilidad, ansiedad o culpa al apostar o al parar.', 'Ocultar o mentir sobre tu actividad de juego.'].map(function (t) { return h('li', null, t); })),
    h('h4', null, 'Dónde pedir ayuda'),
    h('ul', { class: 'lista' }, ['Habla con alguien de confianza y con un profesional de salud.', 'Busca la línea de ayuda gratuita para el juego problemático de tu país o región: suele figurar en la web del regulador del juego de tu jurisdicción y en el pie de las casas autorizadas.', 'Organizaciones de apoyo mutuo como Jugadores Anónimos tienen grupos en muchos países.', 'Usa las herramientas de autoexclusión oficial de tu regulador y los límites de depósito de tu casa de apuestas; hay programas que bloquean los sitios de juego en tus dispositivos.'].map(function (t) { return h('li', null, t); })),
    h('small', { class: 'muted' }, 'Esta herramienta no incluye teléfonos concretos para no darte datos desactualizados o de otro país: busca el recurso oficial de tu zona.'));

  function fmtRestante(ms) { var d = Math.floor(ms / 86400000), hh = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000); return (d ? d + ' d ' : '') + hh + ' h ' + m + ' min'; }

  function tResp(c) {
    var L = S.cfg.limites;
    function nf(k, label, ayuda) { var i = U.inputNum({ valor: L[k] || '', aria: label, onInput: function (v) { L[k] = v > 0 ? v : 0; } }); return U.campo(label, i, ayuda); }
    var exc = h('div'), op = h('select', { 'aria-label': 'Duración de la autoexclusión' }, [[1, '24 horas'], [7, '7 días'], [30, '30 días'], [90, '90 días'], [180, '6 meses']].map(function (o) { return h('option', { value: o[0] }, o[1]); }));
    U.montar(c, U.aviso('Si apostar deja de ser divertido, pide ayuda. Esta herramienta solo analiza y registra: no apuesta por ti ni se conecta a casas de apuestas.', 'aviso'),
      h('section', { class: 'card' }, h('h3', null, 'Mis límites'), h('div', { class: 'form-g' }, nf('perdidaDia', 'Pérdida máxima diaria', '0 = sin límite'), nf('perdidaSemana', 'Pérdida máxima semanal'), nf('perdidaMes', 'Pérdida máxima mensual'), nf('tiempoMin', 'Tiempo máx. diario en la herramienta (min)'), nf('aviso', 'Avisar al llegar al (%)')),
        h('p', { class: 'muted' }, 'La pérdida de un periodo suma el importe de las apuestas pendientes más lo perdido en las liquidadas, menos lo ganado. Te avisaremos al acercarte y te pediremos confirmación antes de registrar una apuesta que lo supere.'),
        U.btn('Guardar límites', function () { if (!(L.aviso > 0 && L.aviso <= 100)) L.aviso = 80; E.guardarCfg({ limites: L }).then(function () { U.toast('Límites guardados'); }); }, 'primario'),
        h('div', { class: 'estado-lim' }, E.limites().map(function (l) { return h('p', null, l.nombre + ': ' + U.m(l.perdida) + ' / ' + U.m(l.limite) + ' ', h('span', { class: 'pill ' + (l.estado === 'ok' ? 'ok' : l.estado === 'aviso' ? 'aviso' : 'peligro') }, l.estado === 'ok' ? 'Dentro' : l.estado === 'aviso' ? 'Cerca' : 'Superado')); }))),
      h('section', { class: 'card' }, h('h3', null, 'Autoexclusión temporal'),
        h('p', null, 'Bloquea esta herramienta durante el tiempo que elijas. No podrás registrar ni consultar hasta que termine (sí podrás exportar tus datos). Es local: si borras los datos del navegador se elimina, pero el gesto de decidir ya cuenta.'),
        h('div', { class: 'fila' }, op, U.btn('Activar autoexclusión', function () {
          U.confirmar('¿Bloquear la herramienta durante ' + op.options[op.selectedIndex].text + '? No podrás desactivarlo antes.', 'Sí, bloquear', true).then(function (ok) { if (ok) E.guardarCfg({ autoexclusion: { hasta: Date.now() + Number(op.value) * 86400000, desde: Date.now() } }).then(function () { A.app.revisarExclusion(); }); });
        }, 'peligro'))),
      h('section', { class: 'card' }, h('h3', null, 'Recursos y ayuda'), RECURSOS));
  }

  function tAjustes(c) {
    var cfg = S.cfg, banca = U.inputNum({ valor: cfg.bancaInicial, aria: 'Banca inicial' }), unidad = U.inputNum({ valor: cfg.unidad, aria: 'Valor de la unidad' }), fr = U.inputNum({ valor: cfg.fraccionKelly, aria: 'Fracción de Kelly' });
    var mon = U.texto({ valor: cfg.moneda, max: 4 }), mb = U.inputNum({ valor: cfg.meta.beneficioMes || '', aria: 'Meta de beneficio mensual' }), my = U.inputNum({ valor: cfg.meta.yield || '', aria: 'Meta de yield' });
    U.montar(c, h('section', { class: 'card' }, h('h3', null, 'Apariencia y formato'), h('div', { class: 'form-g' },
      U.campo('Tema', U.selector([{ v: 'auto', t: 'Automático' }, { v: 'claro', t: 'Claro' }, { v: 'oscuro', t: 'Oscuro' }], cfg.tema, function (v) { E.guardarCfg({ tema: v }).then(E.aplicarTema); })),
      U.campo('Formato de cuotas', U.selector([{ v: 'decimal', t: 'Decimal' }, { v: 'fraccional', t: 'Fraccional' }, { v: 'americano', t: 'Americano' }, { v: 'hongkong', t: 'Hong Kong' }, { v: 'malayo', t: 'Malayo' }, { v: 'indonesio', t: 'Indonesio' }], cfg.formato, function (v) { E.guardarCfg({ formato: v }); })),
      U.campo('Símbolo de moneda', mon))),
      h('section', { class: 'card' }, h('h3', null, 'Banca y análisis'), h('div', { class: 'form-g' }, U.campo('Banca inicial', banca), U.campo('Valor de 1 unidad', unidad), U.campo('Fracción de Kelly', fr, '0.25 = ¼ Kelly'),
        U.campo('Casa de referencia', U.selector([{ v: 'Pinnacle', t: 'Pinnacle' }, { v: '', t: 'Solo consenso' }], cfg.referencia, function (v) { E.guardarCfg({ referencia: v }); })),
        U.campo('Meta de beneficio mensual', mb), U.campo('Meta de yield mensual (%)', my)),
        U.btn('Guardar', function () { var b = U.leerNum(banca), u = U.leerNum(unidad), f = U.leerNum(fr); if (!(b >= 0) || !(u > 0) || !(f > 0 && f <= 1)) { U.toast('Revisa los valores (fracción entre 0 y 1)', 'peligro'); return; } E.guardarCfg({ bancaInicial: b, unidad: u, fraccionKelly: f, moneda: mon.value || '$', meta: { beneficioMes: U.leerNum(mb) || 0, yield: U.leerNum(my) || 0 } }).then(function () { U.toast('Ajustes guardados'); A.app.pintar(); }); }, 'primario')),
      h('section', { class: 'card' }, h('h3', null, 'Datos de cuotas'), h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: cfg.demo, onchange: function (e) { E.guardarCfg({ demo: e.target.checked }).then(function () { return E.cargarDatos(true); }).then(function () { A.app.pintar(); }); } }), ' Modo demo (cuotas ficticias, para probar sin el proceso de datos)'),
        h('p', { class: 'muted' }, 'Origen: ' + (g.Datos ? g.Datos.base : '') + 'apuestas/cuotas.json'), U.btn('Recargar cuotas', function () { E.cargarDatos(true).then(function () { U.toast('Cuotas recargadas'); A.app.pintar(); }); })),
      g.CuentaNube ? h('section', { class: 'card' }, g.CuentaNube.bloque({ claseBtn: 'btn' })) : null,
      h('section', { class: 'card' }, h('h3', null, 'Tus datos'), h('p', null, 'Registro, ajustes y capturas se guardan solo en este navegador (IndexedDB). Exporta una copia de vez en cuando.' + (S.sinPersistencia ? ' ATENCIÓN: tu navegador no permite almacenamiento persistente; los datos se perderán al cerrar.' : '')),
        h('div', { class: 'fila' }, U.btn('Exportar registro (CSV)', function () { U.descargar('apuestas-' + R.hoy() + '.csv', '﻿' + R.aCSV(R.ordenar(S.apuestas))); }),
          U.btn('Borrar todo el registro', function () { U.confirmar('Se eliminarán todas las apuestas de este dispositivo. ¿Seguro?', 'Borrar todo', true).then(function (ok) { if (ok) E.borrarTodo().then(function () { U.toast('Registro borrado'); }); }); }, 'peligro'))));
  }

  function tLegal(c) {
    U.montar(c, h('section', { class: 'card' }, h('h3', null, 'Aviso legal'),
      h('p', null, 'Información educativa. No es asesoría financiera ni garantía de resultados. Las apuestas y la inversión implican riesgo de pérdida: puedes perder todo lo que apuestas. Verifica la edad mínima y la legalidad en tu jurisdicción antes de apostar.'),
      h('p', null, 'Esta herramienta no se conecta a casas de apuestas, no realiza apuestas ni gestiona dinero: solo muestra cuotas públicas de terceros que pueden estar desactualizadas o ser inexactas, calcula probabilidades y lleva tu historial personal.'),
      h('p', null, 'Los modelos (Poisson, Elo, regresión logística) y las detecciones de valor o arbitraje son estimaciones sencillas con limitaciones importantes; no son predicciones fiables.'),
      h('p', null, 'Las cuotas «demo» son ficticias. Las alertas solo se evalúan con la herramienta abierta.')));
  }

  V.mas = function (cont) {
    var cuerpo = h('div', { class: 'sub-cuerpo' });
    function ir(s) { sub = s; ({ resp: tResp, ajustes: tAjustes, legal: tLegal })[s](U.vaciar(cuerpo)); }
    U.montar(cont, U.seg([{ v: 'resp', t: 'Juego responsable' }, { v: 'ajustes', t: 'Ajustes' }, { v: 'legal', t: 'Aviso legal' }], sub, ir, 'Más'), cuerpo); ir(sub);
  };
  V.fmtRestante = fmtRestante; V.RECURSOS = function () { return RECURSOS.cloneNode(true); };
})(window);
