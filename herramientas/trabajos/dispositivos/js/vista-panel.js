/* Pestana Panel: matriz de compatibilidad, diagnostico automatico y limites reales de la web. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, C = g.DispCapacidades, TD = g.TrabajosDispositivos, h = T.h;
  var matriz = [], info = {}, diag = [];
  var ICO = { ok: '✓', permiso: '?', https: '!', denegado: '✕', no: '–' };
  async function reunir() {
    var n = navigator, i = { permisos: {} };
    try { if (n.mediaDevices && n.mediaDevices.enumerateDevices) { var l = await n.mediaDevices.enumerateDevices(); i.camaras = l.filter(function (d) { return d.kind === 'videoinput'; }).length; i.microfonos = l.filter(function (d) { return d.kind === 'audioinput'; }).length; } } catch (e) {}
    try { if (n.bluetooth && n.bluetooth.getAvailability) i.btDisponible = await n.bluetooth.getAvailability(); } catch (e) {}
    try { if (n.xr) { i.xrVR = await n.xr.isSessionSupported('immersive-vr'); i.xrAR = await n.xr.isSessionSupported('immersive-ar'); } } catch (e) {}
    if (n.permissions && n.permissions.query) for (var k of ['camera', 'microphone', 'geolocation']) { try { i.permisos[k] = (await n.permissions.query({ name: k })).state; } catch (e) {} }
    return i;
  }
  async function analizar() {
    var env = C.entorno(g); matriz = C.detectar(env); info = await reunir(); C.refinar(matriz, info);
    var pu = (A.params.puente && A.params.puente.leer().url) || '';
    diag = C.diagnosticar(env, matriz, info, { errores: TD.errores, urlPuente: pu });
    A.matriz = matriz; A.emitir('analizado', matriz);
  }
  function pintar(raiz, filtro) {
    var cuad = raiz.querySelector('.dp-matriz'), lista = raiz.querySelector('.dp-diag'); cuad.textContent = ''; lista.textContent = '';
    matriz.filter(function (m) { return filtro === 'todo' || (filtro === 'ok' ? (m.estado === 'ok' || m.estado === 'permiso') : (m.estado !== 'ok' && m.estado !== 'permiso')); }).forEach(function (m) {
      var el = h('li', { cls: 'dp-cap dp-c-' + m.estado }, [
        h('div', { cls: 'dp-cap-t' }, [h('span', { cls: 'dp-cap-i', 'aria-hidden': 'true', txt: ICO[m.estado] }), h('b', { txt: m.nombre }), h('span', { cls: 'dp-badge dp-b-' + m.estado, txt: m.etiqueta })]),
        m.detalle ? h('div', { cls: 'dp-cap-d', txt: m.detalle }) : null, h('p', { cls: 'dp-cap-n', txt: m.nota }),
        m.modulo && (m.estado === 'ok' || m.estado === 'permiso') ? h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Probar', on: { click: function () { A.ir(m.modulo); } } }) : null]);
      cuad.appendChild(el);
    });
    diag.forEach(function (d) { lista.appendChild(h('li', { cls: 'dp-dg dp-dg-' + d.nivel }, [h('b', { txt: { error: 'Problema · ', aviso: 'Aviso · ', info: 'Nota · ', ok: '' }[d.nivel] + d.titulo }), h('p', { txt: d.texto })])); });
  }
  A.iniciarPanel = function () {
    var raiz = document.getElementById('v-panel'), filtro = 'todo';
    var sel = U.select([['todo', 'Todas'], ['ok', 'Solo las que puedo usar'], ['no', 'Solo las que no']], 'todo'); sel.setAttribute('aria-label', 'Filtrar capacidades');
    var bRe = h('button', { type: 'button', cls: 'tr-btn', txt: 'Volver a analizar' }), bCp = h('button', { type: 'button', cls: 'tr-btn', txt: 'Descargar informe' });
    var lim = h('div', {}, C.LIMITES.map(function (l) { return h('details', { cls: 'dp-det' }, [h('summary', { txt: l.t }), h('p', { txt: l.x })]); }));
    raiz.appendChild(U.panel('Qué puede hacer este navegador', [
      h('p', { cls: 'tr-sub', txt: 'La web solo accede a lo que el navegador y el sistema permiten. Esta matriz se calcula ahora mismo en tu equipo; nada se envía a ningún servidor.' }),
      h('div', { cls: 'tr-acciones' }, [sel, bRe, bCp]), h('ul', { cls: 'dp-matriz', 'aria-label': 'Matriz de compatibilidad' })]));
    raiz.appendChild(U.panel('Diagnóstico y sugerencias', [h('ul', { cls: 'dp-diag' })]));
    raiz.appendChild(U.panel('Lo que la web no puede hacer (y cómo se resuelve)', [h('p', { cls: 'tr-sub', txt: 'Sin falsas promesas: estos dispositivos no tienen acceso web directo o necesitan un puente local.' }), lim]));
    function redo() { return analizar().then(function () { pintar(raiz, filtro); }); }
    sel.addEventListener('change', function () { filtro = sel.value; pintar(raiz, filtro); });
    bRe.addEventListener('click', function () { redo().then(function () { T.aviso('Análisis actualizado.'); }); });
    bCp.addEventListener('click', function () {
      var n = navigator; T.descargar(new Blob([JSON.stringify({ fecha: new Date().toISOString(), agente: n.userAgent, seguro: isSecureContext, capacidades: matriz.map(function (m) { return { id: m.id, estado: m.estado, detalle: m.detalle }; }), dispositivosVistos: info, diagnostico: diag }, null, 2)], { type: 'application/json' }), 'diagnostico_dispositivos.json');
    });
    A.reanalizar = redo; A.al = A.on;
    TD.escuchar('error', function () { redo(); });
    return redo();
  };
})(window);
