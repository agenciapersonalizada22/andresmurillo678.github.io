/* Ejecucion de flujos y disparadores vivos (solo mientras la pagina esta abierta). window.AutoVivo */
(function (g) {
  'use strict';
  var A = g.AutoApp, D = g.AutoDatos, M = g.AutoMotor, TD = g.TrabajosDispositivos;
  var V = g.AutoVivo = { errores: {}, senales: {}, ultimo: {}, activos: [] };
  var corriendo = {}, tasa = {}, avisoTasa = {}, pl = M.planificador(), claves = {}, desTD = null, bc = null, intento = {};

  /* ---------- ejecutar ---------- */
  /* o: {inicio, datos, tipo, simulacion, pasoAPaso, interactivo, silencioso} */
  V.ejecutar = async function (flujo, o) {
    o = o || {}; var id = flujo.id;
    if (corriendo[id]) { if (o.interactivo) A.aviso('Este flujo ya se está ejecutando.', 'error'); return null; }
    if (!o.interactivo) {
      var t = Date.now(); tasa[id] = (tasa[id] || []).filter(function (x) { return t - x < 60000; });
      if (tasa[id].length >= 20) { if (t - (avisoTasa[id] || 0) > 60000) { avisoTasa[id] = t; A.aviso('«' + flujo.nombre + '» se dispara demasiado a menudo (límite 20 por minuto): se omiten ejecuciones.', 'error'); } return null; }
      tasa[id].push(t);
    }
    var senal = { abortado: false }, paso = { continuar: false }; V.senales[id] = senal; corriendo[id] = true; A.emitir('inicio', { flujoId: id });
    var secretos = D.secretos(), almacen = {}; try { almacen = await D.almacenTodo(); } catch (e) {}
    var reg;
    try {
      reg = await M.ejecutar(flujo, {
        catalogo: g.AutoCatalogo, inicio: o.inicio, disparo: { tipo: o.tipo || 'manual', datos: o.datos || {} }, simulacion: !!o.simulacion, secretos: secretos, almacen: almacen, senal: senal,
        acciones: g.AutoAcciones.crear({ flujo: flujo, interactivo: !!o.interactivo }),
        puerta: function (p, ctx) {
          A.emitir('activo', { flujoId: id, nodo: p.nodo });
          if (!o.pasoAPaso || paso.continuar || senal.abortado) return null;
          return new Promise(function (ok) { A.emitir('depurar', { flujoId: id, paso: p, ctx: ctx, siguiente: ok, continuar: function () { paso.continuar = true; ok(); } }); });
        },
        alPaso: function (p) { A.emitir('paso', { flujoId: id, paso: p }); }
      });
    } catch (e) { reg = { id: Date.now().toString(36), flujo: id, nombre: flujo.nombre, disparo: { tipo: o.tipo || 'manual' }, simulacion: !!o.simulacion, ini: Date.now(), fin: Date.now(), estado: 'error', error: e.message, pasos: [] }; }
    delete corriendo[id]; delete V.senales[id]; reg.disparo.tipo = o.tipo || 'manual'; reg.pasoAPaso = !!o.pasoAPaso;
    var salidas = {}; reg.pasos.forEach(function (p) { if (p.salida !== undefined) salidas[p.nodo] = p.salida; }); V.ultimo[id] = { salidas: salidas, reg: reg };
    try { await D.guardarEj(reg); } catch (e) {}
    A.emitir('ejecucion', reg); A.emitir('fin', { flujoId: id });
    if (!o.interactivo && reg.estado === 'error') A.aviso('Falló «' + flujo.nombre + '»: ' + reg.error, 'error');
    return reg;
  };
  V.detener = function (id) { if (V.senales[id]) { V.senales[id].abortado = true; if (V.senales[id].alAbortar) V.senales[id].alAbortar(); } A.emitir('depurar-fin', { flujoId: id }); };
  V.enCurso = function (id) { return !!corriendo[id]; };

  /* ---------- sondeos de datos del portal ---------- */
  function maxCuota(ev) { var m = 0, casa = ''; (ev.casas || []).forEach(function (c) { var h = c.mercados && c.mercados.h2h; if (h) ['local', 'empate', 'visitante'].forEach(function (k) { if (h[k] > m) { m = h[k]; casa = c.casa; } }); }); return { cuota: m, casa: casa }; }
  async function sondear(f, nodo, forzar) {
    var key = f.id + '|' + nodo.id, st = D.estadoDisp(), s = st[key] || {}, c = nodo.cfg || {}, lanzar = [];
    try {
      if (!g.Datos) throw new Error('Los datos en vivo no están disponibles.');
      if (nodo.tipo === 'cambio_datos') {
        var d = await g.Datos.cargar(c.archivo, { forzar: true }), v = c.ruta ? M.ruta(d, c.ruta) : d.generado, primera = !('v' in s), ant = s.v;
        s.v = v === undefined ? null : v; if ((primera || JSON.stringify(v) === JSON.stringify(ant)) && !forzar) { st[key] = s; D.guardarEstadoDisp(st); delete V.errores[key]; return; }
        lanzar.push({ valor: v, anterior: ant === undefined ? null : ant, archivo: c.archivo, datos: d });
      } else if (nodo.tipo === 'nueva_oferta') {
        var o = await g.Datos.cargar('ofertas/ofertas.json', { forzar: true }), items = o.items || [], vistos = {}; (s.vistos || []).forEach(function (i) { vistos[i] = 1; });
        var pri = !s.vistos, nuevos = items.filter(function (x) { return !vistos[x.id]; }); s.vistos = items.map(function (x) { return x.id; }).slice(0, 600);
        var ok = function (x) { return (x.descuentoPct || 0) >= (Number(c.descMin) || 0) && (!c.palabra || String(x.titulo || '').toLowerCase().indexOf(String(c.palabra).toLowerCase()) >= 0) && (!c.tienda || String(x.tienda || '').toLowerCase().indexOf(String(c.tienda).toLowerCase()) >= 0); };
        if (!(pri && !forzar)) lanzar = (forzar && !nuevos.length ? items : nuevos).filter(ok).slice(0, 5);
      } else if (nodo.tipo === 'nueva_cuota') {
        var q = await g.Datos.cargar('apuestas/cuotas.json', { forzar: true }), vs = {}; (s.vistos || []).forEach(function (i) { vs[i] = 1; }); var todos = [];
        (q.deportes || []).forEach(function (dp) { if (c.deporte && (dp.nombre + ' ' + dp.clave).toLowerCase().indexOf(String(c.deporte).toLowerCase()) < 0) return; (dp.eventos || []).forEach(function (ev) { var m = maxCuota(ev); todos.push({ id: ev.id, deporte: dp.nombre, inicio: ev.inicio, local: ev.local, visitante: ev.visitante, cuotaMax: m.cuota, casa: m.casa }); }); });
        var pr2 = !s.vistos; s.vistos = todos.map(function (x) { return x.id; }).slice(0, 600);
        if (!(pr2 && !forzar)) lanzar = todos.filter(function (x) { return (forzar || !vs[x.id]) && x.cuotaMax >= (Number(c.cuotaMin) || 0); }).slice(0, 5);
      }
      s.ult = Date.now(); st[key] = s; D.guardarEstadoDisp(st); delete V.errores[key];
    } catch (e) { V.errores[key] = e.message; A.emitir('disparadores'); return; }
    for (var i = 0; i < lanzar.length; i++) await V.ejecutar(f, { inicio: nodo.id, datos: lanzar[i], tipo: nodo.tipo });
    A.emitir('disparadores');
  }
  V.sondear = sondear;

  /* ---------- escuchas (dispositivos, webhook, QR) ---------- */
  function texto(d) { try { if (typeof d === 'string') return d; if (d && d.byteLength != null) return new TextDecoder().decode(d); return JSON.stringify(d); } catch (e) { return ''; } }
  function nodosDe(tipo) { var o = []; V.activos.forEach(function (f) { f.nodos.forEach(function (n) { if (n.tipo === tipo) o.push([f, n]); }); }); return o; }
  function alDatos(ev) {
    var d = ev.datos, wh = d && typeof d === 'object' && d.tipo === 'webhook' && ev.tipo === 'puente';
    if (wh) { var ruta = '/' + String(d.ruta || '').replace(/^\/+/, ''); nodosDe('webhook').forEach(function (p) { if (('/' + String(p[1].cfg.ruta || '').replace(/^\/+/, '')) === ruta) V.ejecutar(p[0], { inicio: p[1].id, tipo: 'webhook', datos: { ruta: ruta, cuerpo: d.cuerpo, cabeceras: d.cabeceras || {}, metodo: d.metodo || 'POST' } }); }); return; }
    var tx = texto(d); nodosDe('mensaje_dispositivo').forEach(function (p) { var c = p[1].cfg; if ((c.tipo === '*' || c.tipo === ev.tipo) && (!c.contiene || tx.toLowerCase().indexOf(String(c.contiene).toLowerCase()) >= 0)) V.ejecutar(p[0], { inicio: p[1].id, tipo: 'mensaje_dispositivo', datos: { tipo: ev.tipo, id: ev.id, texto: tx, datos: d && d.byteLength != null ? undefined : d } }); });
  }
  V.qrLeido = function (tx) { nodosDe('qr_leido').forEach(function (p) { if (!p[1].cfg.contiene || String(tx).toLowerCase().indexOf(String(p[1].cfg.contiene).toLowerCase()) >= 0) V.ejecutar(p[0], { inicio: p[1].id, tipo: 'qr_leido', datos: { texto: String(tx), valor: String(tx) } }); }); };
  V.conectarPuentes = async function (forzar) {
    if (!TD || !TD.soportado('puente')) return;
    var urls = {}; nodosDe('webhook').forEach(function (p) { if (p[1].cfg.url) urls[p[1].cfg.url] = 1; });
    for (var u in urls) {
      if (TD.listar('puente').some(function (x) { return x.nombre === u && x.estado !== 'cerrado'; })) { delete V.errores['puente|' + u]; continue; }
      if (!forzar && Date.now() - (intento[u] || 0) < 30000) continue; intento[u] = Date.now();
      if (!M.hostPermitido(u, D.ajustes().dominios)) { V.errores['puente|' + u] = 'Dominio no permitido: añade «' + M.hostDe(u) + '» en Seguridad.'; continue; }
      try { await TD.conectar('puente', { url: u, reconectar: true }); delete V.errores['puente|' + u]; } catch (e) { V.errores['puente|' + u] = e.message; }
    }
    A.emitir('disparadores');
  };

  /* ---------- sincronizar con los flujos activos ---------- */
  V.sincronizar = async function () {
    var flujos = await D.flujos(), vivos = {}; V.activos = flujos.filter(function (f) { return f.activo; });
    V.activos.forEach(function (f) {
      f.nodos.forEach(function (n) {
        var key = f.id + '|' + n.id, c = n.cfg || {}, spec = null; delete V.errores[key + '|cfg'];
        if (n.tipo === 'temporizador') {
          if (c.modo === 'cron') { var er = M.validarCron(c.cron); if (er) V.errores[key + '|cfg'] = er; else spec = { cron: c.cron }; }
          else spec = { cada: Math.max(5000, (Number(c.valor) || 1) * ({ s: 1000, min: 60000, h: 3600000 }[c.unidad] || 60000)) };
        } else if (n.tipo === 'hora_dia') {
          var m = /^(\d{1,2}):(\d{2})$/.exec(c.hora || ''); if (!m || +m[1] > 23 || +m[2] > 59) V.errores[key + '|cfg'] = 'Hora no válida'; else { var ds = String(c.dias || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return /^[0-6]$/.test(x); }); spec = { cron: (+m[2]) + ' ' + (+m[1]) + ' * * ' + (ds.length ? ds.join(',') : '*') }; }
        } else if (n.tipo === 'cambio_datos' || n.tipo === 'nueva_oferta' || n.tipo === 'nueva_cuota') spec = { cada: Math.max(1, Number(c.cada) || 5) * 60000 };
        if (spec) { vivos[key] = [f, n]; pl.poner(key, spec); }
      });
    });
    pl.ids().forEach(function (k) { if (!vivos[k]) pl.quitar(k); }); claves = vivos;
    if (!V.timer) V.timer = setInterval(function () { pl.tick().forEach(function (k) { var p = claves[k]; if (!p) return; if (p[1].tipo === 'temporizador' || p[1].tipo === 'hora_dia') V.ejecutar(p[0], { inicio: p[1].id, tipo: p[1].tipo, datos: { ts: Date.now() } }); else sondear(p[0], p[1]); }); }, 2000);
    if (TD && !desTD) desTD = TD.escuchar('datos', alDatos);
    if (!bc && g.BroadcastChannel) { try { bc = new BroadcastChannel('trabajos_qr_leido'); bc.onmessage = function (e) { if (e.data && e.data.texto) V.qrLeido(e.data.texto); }; } catch (e) {} }
    V.conectarPuentes(false); A.emitir('disparadores');
  };
  V.estadoTriggers = function () {
    var o = []; V.activos.forEach(function (f) { f.nodos.forEach(function (n) { var d = A.tipoNodo(n.tipo); if (!d || d.categoria !== 'disparador' || n.tipo === 'manual') return; var key = f.id + '|' + n.id; o.push({ flujo: f, nodo: n, key: key, proximo: pl.proximo(key), error: V.errores[key] || V.errores[key + '|cfg'] || (n.tipo === 'webhook' && V.errores['puente|' + n.cfg.url]) || '' }); }); }); return o;
  };
  A.on('flujos', function () { clearTimeout(V._d); V._d = setTimeout(function () { V.sincronizar(); }, 300); });
})(window);
