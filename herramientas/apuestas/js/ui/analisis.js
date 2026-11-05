/* Analisis: valor, arbitraje, middles, movimiento de lineas y alertas. */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, h = U.h, C = A.cuotas;
  var V = A.vistas = A.vistas || {};
  var sub = 'valor', baseMov = null;

  function porEvento(fn) { var out = []; A.alertas.todosEventos(S.datos).forEach(function (x) { fn(x.ev, x.deporte).forEach(function (r) { r.liga = x.deporte.nombre; r.deporteClave = x.deporte.clave; out.push(r); }); }); return out; }
  function nombreEv(e) { return e.local + ' - ' + e.visitante; }
  function reg(r, mercado, sel, cuota, casa, extra) {
    var ms = C.mercadosDeEvento(r.evento).filter(function (m) { return m.clave === mercado; })[0];
    var pre = { evento: nombreEv(r.evento), deporte: U.grupoDeporte(r.deporteClave), liga: r.liga, mercado: U.nombreMercado(mercado), seleccion: U.etiquetaSel(r.evento, sel, ms ? ms.linea : null), cuota: cuota, casa: casa, fecha: A.registro.hoy() };
    for (var k in extra) pre[k] = extra[k];
    A.registroUI.nueva(pre);
  }

  function vistaValor(cont) {
    var edge = U.inputNum({ valor: S.cfg.minEdge, aria: 'Edge mínimo en %', onInput: function (v) { if (v >= 0) { S.cfg.minEdge = v; clearTimeout(vistaValor._t); vistaValor._t = setTimeout(function () { A.estado.guardarCfg({ minEdge: v }); lista(); }, 200); } } });
    var cuerpo = h('div');
    function lista() {
      var vs = porEvento(function (e) { return C.valor(e, { referencia: S.cfg.referencia, metodo: S.cfg.metodo, minEdge: S.cfg.minEdge / 100 }); }).sort(function (a, b) { return b.edge - a.edge; });
      U.montar(cuerpo, vs.length ? U.tabla(['Evento', 'Selección', 'Casa', { t: 'Cuota', clase: 'num' }, { t: 'Prob. justa', clase: 'num' }, { t: 'Edge / EV por unidad', clase: 'num' }, { t: 'Kelly ' + U.n(S.cfg.fraccionKelly, 2) + '×', clase: 'num' }, ''],
        vs.slice(0, 80).map(function (v) {
          return h('tr', null, h('th', { scope: 'row' }, nombreEv(v.evento), h('small', { class: 'muted blq' }, v.liga)), h('td', null, U.etiquetaSel(v.evento, v.sel, v.linea), h('small', { class: 'muted blq' }, U.nombreMercado(v.mercado))), h('td', null, v.casa),
            h('td', { class: 'num mejor-t' }, U.cuota(v.cuota)), h('td', { class: 'num' }, U.p(v.prob)), h('td', { class: 'num pos' }, U.p(v.edge, 1, true)), h('td', { class: 'num' }, U.p(A.banca.kelly(v.prob, v.cuota, S.cfg.fraccionKelly), 2)),
            h('td', null, U.btn('Registrar', function () { reg(v, v.mercado, v.sel, v.cuota, v.casa, { probPropia: v.prob }); }, 'pequeno')));
        })) : U.vacio('Sin apuestas de valor con este umbral', 'Baja el edge mínimo o cambia la referencia. Ser raro es lo normal: el mercado suele estar bien ajustado.'));
    }
    U.montar(cont, U.aviso('Valor = cuota ofrecida frente a la probabilidad justa (sin margen) de ' + (S.cfg.referencia ? S.cfg.referencia + ' como referencia (o consenso si no está)' : 'el consenso') + ' con el método ' + S.cfg.metodo + '. Edge = prob × cuota − 1. Es una estimación: el edge detectado puede ser ruido, líneas desactualizadas o límites de la casa.', 'info'),
      h('div', { class: 'fila filtros' }, U.campo('Edge mínimo (%)', edge), U.campo('Referencia', U.selector([{ v: '', t: 'Consenso' }, { v: 'Pinnacle', t: 'Pinnacle' }], S.cfg.referencia, function (v) { A.estado.guardarCfg({ referencia: v }); lista(); })),
        U.campo('Método', U.selector([{ v: 'proporcional', t: 'Proporcional' }, { v: 'shin', t: 'Shin' }, { v: 'potencia', t: 'Potencia' }], S.cfg.metodo, function (v) { A.estado.guardarCfg({ metodo: v }); lista(); }))), cuerpo);
    lista();
  }

  function vistaArb(cont) {
    var banca = U.inputNum({ valor: S.cfg.bancaArbitraje, aria: 'Banca para repartir', onInput: function (v) { if (v > 0) { S.cfg.bancaArbitraje = v; lista(); } } });
    var cuerpo = h('div');
    function lista() {
      var rs = porEvento(function (e) { return C.arbitraje(e, S.cfg.bancaArbitraje); }).sort(function (a, b) { return b.roi - a.roi; });
      U.montar(cuerpo, rs.length ? rs.map(function (r) {
        return h('section', { class: 'card' }, h('div', { class: 'fila entre' }, h('h3', null, nombreEv(r.evento)), h('span', { class: 'pill ok' }, U.p(r.roi, 2, true) + ' garantizado')),
          h('p', { class: 'muted' }, r.liga + ' · ' + U.nombreMercado(r.mercado) + ' · suma de probabilidades implícitas ' + U.p(r.S, 2)),
          U.tabla(['Selección', 'Casa', { t: 'Cuota', clase: 'num' }, { t: 'Apostar', clase: 'num' }, { t: 'Retorno', clase: 'num' }, ''], r.patas.map(function (p) {
            return h('tr', null, h('th', { scope: 'row' }, U.etiquetaSel(r.evento, p.sel, (C.mercadosDeEvento(r.evento).filter(function (m) { return m.clave === r.mercado; })[0] || {}).linea)), h('td', null, p.casa), h('td', { class: 'num' }, U.cuota(p.cuota)), h('td', { class: 'num' }, U.m(p.importe)), h('td', { class: 'num' }, U.m(p.importe * p.cuota)),
              h('td', null, U.btn('Registrar', function () { reg(r, r.mercado, p.sel, p.cuota, p.casa, { importe: Math.round(p.importe * 100) / 100, etiquetas: ['surebet'] }); }, 'pequeno')));
          })),
          h('p', null, 'Inviertes ', h('b', null, U.m(r.invertido)), ' y recibes ', h('b', null, U.m(r.invertido + r.ganancia)), ' sea cual sea el resultado: ganancia ', h('b', { class: 'pos' }, U.m(r.ganancia, true)), '.'),
          U.aviso('Riesgos reales: las cuotas cambian en segundos, las casas pueden anular apuestas por «error evidente», limitar cuentas o aplicar márgenes de redondeo. Confirma cada cuota antes de apostar.', 'aviso'));
      }) : U.vacio('No hay surebets ahora', 'Es lo habitual: aparecen pocas y duran poco. Activa una alerta de surebet para que te avise al abrir la herramienta.'));
    }
    U.montar(cont, h('div', { class: 'fila filtros' }, U.campo('Banca a repartir', banca)), cuerpo); lista();
  }

  function vistaMid(cont) {
    var rs = porEvento(function (e) { return C.middles(e, 100); }).sort(function (a, b) { return b.ventana - a.ventana; });
    U.montar(cont, U.aviso('Un middle combina dos apuestas con líneas distintas: si el resultado cae entre ambas, ganas las dos; si no, pierdes una cantidad pequeña. Aquí se reparte para igualar el retorno fuera de la ventana (banca de 100). Con líneas enteras puede haber devolución (push).', 'info'),
      rs.length ? rs.map(function (r) {
        var lbA = U.etiquetaSel(r.evento, r.selA, r.lineaA), lbB = U.etiquetaSel(r.evento, r.selB, r.lineaB);
        return h('section', { class: 'card' }, h('div', { class: 'fila entre' }, h('h3', null, nombreEv(r.evento)), h('span', { class: 'pill info' }, 'Ventana ' + U.n(r.ventana, 1))),
          h('p', null, h('b', null, lbA), ' a ' + U.cuota(r.cuotaA) + ' en ' + r.casaA + ' (' + U.m(r.reparto.s1) + ')  +  ', h('b', null, lbB), ' a ' + U.cuota(r.cuotaB) + ' en ' + r.casaB + ' (' + U.m(r.reparto.s2) + ')'),
          h('div', { class: 'kpis' }, U.kpi('Si cae fuera', U.m(r.reparto.fuera, true), 'coste del middle', U.clase(r.reparto.fuera)), U.kpi('Si cae dentro', U.m(r.reparto.dentro, true), 'ambas ganan', U.clase(r.reparto.dentro))),
          h('p', { class: 'muted' }, 'Compensa si la probabilidad de caer dentro supera ' + U.p(-r.reparto.fuera / (r.reparto.dentro - r.reparto.fuera), 1) + ' (punto de equilibrio).'));
      }) : U.vacio('No hay middles disponibles', 'Se buscan líneas de totales o hándicap distintas entre casas.'));
  }

  function vistaMov(cont) {
    U.montar(cont, U.aviso('Cada vez que abres la herramienta con datos nuevos se guarda una captura de las cuotas en este dispositivo (máx. 40). Aquí comparas el consenso de probabilidad entre una captura y las cuotas actuales.', 'info'), h('div', { id: 'movC' }, 'Cargando capturas…'));
    A.estado.capturas().then(function (l) {
      var c = cont.querySelector('#movC'); if (!c) return;
      if (!S.datos) { U.montar(c, U.vacio('Sin datos actuales', 'Necesito cuotas cargadas para comparar.')); return; }
      if (l.length < 1) { U.montar(c, U.vacio('Aún no hay capturas guardadas', 'Vuelve a abrir la herramienta más tarde: se guarda una captura cada vez que haya datos nuevos.')); return; }
      if (!baseMov || !l.some(function (x) { return x.t === baseMov; })) baseMov = l[0].t;
      var antes = l.filter(function (x) { return x.t === baseMov; })[0], ahora = A.alertas.capturar(S.datos);
      var mov = A.alertas.movimiento(antes, ahora).filter(function (m) { return Math.abs(m.dProb) > 0.0005; });
      U.montar(c, h('div', { class: 'fila filtros' }, U.campo('Comparar con captura de', U.selector(l.map(function (x) { return { v: x.t, t: new Date(x.t).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + (x.demo ? ' (demo)' : '') }; }), baseMov, function (v) { baseMov = +v; vistaMov(cont); }))),
        h('p', { class: 'muted' }, l.length + ' captura(s). Eventos en común: ' + Object.keys(ahora.ev).filter(function (id) { return antes.ev[id]; }).length),
        mov.length ? U.tabla(['Evento', 'Selección', { t: 'Prob. antes', clase: 'num' }, { t: 'Prob. ahora', clase: 'num' }, { t: 'Cambio', clase: 'num' }, { t: 'Mejor cuota', clase: 'num' }], mov.slice(0, 60).map(function (m) {
          return h('tr', null, h('th', { scope: 'row' }, m.evento, h('small', { class: 'muted blq' }, m.deporte)), h('td', null, m.sel), h('td', { class: 'num' }, U.p(m.probAntes)), h('td', { class: 'num' }, U.p(m.probAhora)), h('td', { class: 'num ' + U.clase(m.dProb) }, (m.dProb > 0 ? '▲ ' : '▼ ') + U.p(Math.abs(m.dProb), 2)), h('td', { class: 'num' }, U.cuota(m.mejorAntes) + ' → ' + U.cuota(m.mejorAhora)));
        })) : U.vacio('Sin movimientos', 'No hay cambios apreciables frente a esa captura (o es la misma).'));
    });
  }

  /* ---- alertas ---- */
  function vistaAlertas(cont) {
    var reglas = S.cfg.reglas;
    var tipo = U.selector([{ v: 'cuota', t: 'Cuota supera umbral' }, { v: 'surebet', t: 'Aparece surebet' }, { v: 'valor', t: 'Aparece valor' }], 'cuota');
    var texto = U.texto({ placeholder: 'Equipo (opcional)' }), sel = U.selector([{ v: 'local', t: 'Local / 1' }, { v: 'empate', t: 'Empate' }, { v: 'visitante', t: 'Visitante / 2' }], 'local');
    var umbral = U.inputNum({ valor: 3, aria: 'Umbral' });
    var etU = h('label', { for: 'umbralA' }, 'Umbral'); umbral.id = 'umbralA';
    function sync() { var t = tipo.value; sel.parentNode.style.display = t === 'cuota' ? '' : 'none'; etU.textContent = t === 'cuota' ? 'Cuota mínima' : t === 'surebet' ? 'Ganancia mínima (%)' : 'Edge mínimo (%)'; if (t !== 'cuota' && umbral.value === '3') umbral.value = t === 'surebet' ? '0.5' : '3'; }
    var selC = U.campo('Selección', sel);
    tipo.addEventListener('change', sync);
    var permiso = 'Notification' in g ? Notification.permission : 'no';
    U.montar(cont,
      U.aviso('Las alertas se evalúan cada vez que se cargan o actualizan las cuotas mientras la pestaña está abierta (cada pocos minutos) y al abrir la herramienta. No hay servidor ni notificaciones push: si la app está cerrada no se envía nada. Las notificaciones del navegador solo aparecen con la pestaña abierta.', 'info'),
      h('section', { class: 'card' }, h('h3', null, 'Nueva alerta'),
        h('div', { class: 'fila filtros' }, U.campo('Tipo', tipo), U.campo('Evento / equipo', texto), selC, h('div', { class: 'campo' }, etU, umbral)),
        h('div', { class: 'fila' }, U.btn('Crear alerta', function () {
          var u = U.leerNum(umbral); if (!(u >= 0)) { U.toast('Umbral inválido', 'peligro'); return; }
          if (tipo.value === 'cuota' && !(u > 1)) { U.toast('La cuota mínima debe ser mayor que 1', 'peligro'); return; }
          var r = { id: 'r' + Date.now().toString(36), tipo: tipo.value, texto: texto.value.trim(), sel: sel.value, umbral: u, activa: true };
          A.estado.guardarCfg({ reglas: reglas.concat([r]) }).then(function () { A.estado.evaluarAlertas(); vistaAlertas(cont); U.toast('Alerta creada'); });
        }, 'primario'),
          'Notification' in g ? U.btn(permiso === 'granted' ? 'Notificaciones activadas' : 'Activar notificaciones del navegador', function () { Notification.requestPermission().then(function () { vistaAlertas(cont); }); }, '', { disabled: permiso === 'granted' || permiso === 'denied' }) : null)),
      h('section', { class: 'card' }, h('h3', null, 'Mis alertas'), reglas.length ? U.tabla(['Tipo', 'Condición', 'Estado', ''], reglas.map(function (r) {
        var cumple = S.alertasActivas.filter(function (a) { return a.regla.id === r.id; });
        return h('tr', null, h('th', { scope: 'row' }, { cuota: 'Cuota', surebet: 'Surebet', valor: 'Valor' }[r.tipo]), h('td', null, (r.texto ? r.texto + ' · ' : '') + (r.tipo === 'cuota' ? r.sel + ' ≥ ' + r.umbral : '≥ ' + r.umbral + '%')),
          h('td', null, r.activa === false ? 'Pausada' : cumple.length ? h('span', { class: 'pill ok' }, cumple.length + ' coincidencia(s)') : 'Sin coincidencias'),
          h('td', { class: 'fila' }, U.btn(r.activa === false ? 'Activar' : 'Pausar', function () { r.activa = r.activa === false; A.estado.guardarCfg({ reglas: reglas }).then(function () { A.estado.evaluarAlertas(); vistaAlertas(cont); }); }, 'pequeno'), U.btn('Borrar', function () { A.estado.guardarCfg({ reglas: reglas.filter(function (x) { return x.id !== r.id; }) }).then(function () { A.estado.evaluarAlertas(); vistaAlertas(cont); }); }, 'pequeno peligro')));
      })) : U.vacio('Sin alertas', 'Crea una para enterarte cuando una cuota supere tu umbral.')),
      S.alertasActivas.length ? h('section', { class: 'card' }, h('h3', null, 'Coincidencias ahora'), h('ul', { class: 'lista' }, S.alertasActivas.slice(0, 30).map(function (a) { return h('li', null, a.mensaje); }))) : null);
    sync();
  }

  V.analisis = function (cont) {
    var cuerpo = h('div', { class: 'sub-cuerpo' });
    function ir(s) { sub = s; if (!S.datos && s !== 'alertas') { U.montar(cuerpo, V.estadoDatos()); return; } ({ valor: vistaValor, arbitraje: vistaArb, middles: vistaMid, movimiento: vistaMov, alertas: vistaAlertas })[s](cuerpo); }
    U.montar(cont, V.estadoDatos(), U.seg([{ v: 'valor', t: 'Valor' }, { v: 'arbitraje', t: 'Surebets' }, { v: 'middles', t: 'Middles' }, { v: 'movimiento', t: 'Movimiento' }, { v: 'alertas', t: 'Alertas' }], sub, ir, 'Herramientas de análisis'), cuerpo);
    ir(sub);
  };
})(window);
