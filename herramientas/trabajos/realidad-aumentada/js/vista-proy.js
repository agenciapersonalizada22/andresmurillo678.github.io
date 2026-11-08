/* Pestana Marcadores y proyectos: hojas de marcadores con el motor comun/impresion.js, proyectos guardados (Cuenta), ajustes del dispositivo y privacidad. window.RA.VProy */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, RA = g.RA, A = RA.App, I = g.Impresion, M = RA.Marcadores, P = RA.Panel, V = RA.VProy = {};
  var ui = {}, ctl = null, tDeb = 0;
  function ids() { var a = Math.max(0, Math.min(M.MAX_ID - 1, parseInt(ui.desde.value, 10) || 0)), n = Math.max(1, Math.min(M.MAX_ID - a, parseInt(ui.cant.value, 10) || 1)), r = []; for (var i = 0; i < n; i++) r.push(a + i); return r; }
  function celdaMm() { var l = A.aj.ladoMm; return { w: Math.round(l * 8 / 6 * 10) / 10 + 2, h: Math.round(l * 8 / 6 * 10) / 10 + 8 }; }
  function dibujarFn(lista) {
    var lado = A.aj.ladoMm;
    return function (idx, ce) {
      var id = lista[idx % lista.length], k = lado / 6, tam = 8 * k, x = (ce.w - tam) / 2, y = Math.max(0, (ce.h - tam - 5) / 2);
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' + M.svg(id) + '</g><text x="' + ce.w / 2 + '" y="' + Math.min(ce.h - 1, y + tam + 4) + '" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="3.2" fill="#000">Marcador #' + id + ' · cuadro negro de ' + lado + ' mm</text>';
    };
  }
  function plan() {
    var lista = ids(), copias = Math.max(1, Math.min(20, parseInt(ui.copias.value, 10) || 1)), cfg = Object.assign({}, ctl.valor()); cfg.total = lista.length * copias;
    var seq = []; for (var c = 0; c < copias; c++) lista.forEach(function (i) { seq.push(i); });
    return { L: I.calcular(cfg), seq: seq };
  }
  function pintar() {
    var p = plan(); ui.vista.textContent = ''; ui.avisos.textContent = '';
    ui.resumen.textContent = p.seq.length + ' marcador' + (p.seq.length === 1 ? '' : 'es') + ' en ' + p.L.paginas + ' hoja(s) · celda ' + p.L.celda.w + '×' + p.L.celda.h + ' mm';
    p.L.avisos.forEach(function (a) { ui.avisos.appendChild(h('div', { cls: 'tr-nota tr-av', txt: a })); });
    if (!p.L.porHoja) { ui.avisos.appendChild(h('div', { cls: 'tr-nota tr-mal', txt: 'No cabe ningún marcador con ese tamaño. Reduce el lado o los márgenes.' })); return; }
    I.vistaPrevia(ui.vista, p.L, function (i, ce) { return dibujarFn(p.seq)(i, ce); }, { zoom: 'ajustar', maxPaginas: 3 });
  }
  function ajustarHoja() { var c = celdaMm(); ctl.poner({ modo: 'fija', cw: c.w, ch: c.h, sx: 2, sy: 2, explicito: false, alinear: 'centro', cortes: 'lineas', regla: true }); }
  function refrescar() { clearTimeout(tDeb); tDeb = setTimeout(pintar, 120); }
  async function pngHoja() { var p = plan(); try { var b = await I.aPNG(p.L, 0, function (i, ce) { return dibujarFn(p.seq)(i, ce); }, { dpi: 300 }); T.descargar(b, 'marcadores_ra.png'); A.logro('ra_marcadores_imprimidos'); } catch (e) { T.aviso(e.message, 'error'); } }
  function imprimir() { var p = plan(); I.imprimir(p.L, function (i, ce) { return dibujarFn(p.seq)(i, ce); }, {}); A.logro('ra_marcadores_imprimidos'); }

  async function listarProyectos() {
    ui.proys.innerHTML = ''; var l = await RA.Datos.proyectos();
    if (!l.length) { ui.proys.appendChild(h('p', { cls: 'tr-vacio', txt: 'Aún no hay proyectos guardados.' })); return; }
    l.forEach(function (p) {
      ui.proys.appendChild(h('div', { cls: 'ra-fila ra-modelo' }, [h('span', { txt: p.nombre + ' · ' + ((p.vivo && p.vivo.capas || []).length + (p.foto && p.foto.capas || []).length) + ' capas, ' + ((p.vivo && p.vivo.objetos || []).length) + ' objetos' }),
        h('button', { type: 'button', cls: 'tr-btn', txt: 'Abrir', on: { click: function () { abrir(p); } } }), h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Borrar', on: { click: async function () { await RA.Datos.borrarProyecto(p.id); listarProyectos(); } } })]));
    });
  }
  async function guardar() {
    var nombre = ui.nombre.value.trim() || 'Proyecto de RA', st = RA.VVivo.estado(), pid = V.pid || T.uid();
    var rec = { id: pid, nombre: nombre, version: 1, vivo: { capas: JSON.parse(JSON.stringify(A.vivo.capas)), objetos: st.objetos }, foto: { capas: JSON.parse(JSON.stringify(A.foto.capas)), nombre: A.foto.nombre }, ajustes: { ladoMm: A.aj.ladoMm, marcador: A.aj.marcador, fov: A.aj.fov } };
    try { await RA.Datos.guardarProyecto(rec); V.pid = pid; T.aviso('Proyecto guardado (sin fotos ni videos; solo capas, anclas y ajustes).'); A.logro('ra_guardo_proyecto'); listarProyectos(); } catch (e) { T.aviso('No se pudo guardar: ' + e.message, 'error'); }
  }
  async function abrir(p) {
    V.pid = p.id; ui.nombre.value = p.nombre; Object.assign(A.aj, p.ajustes || {}); A.guardarAj();
    var pngs = await RA.Datos.pngs(); pngs.forEach(function (x) { RA.Ov.pngs[x.id] = x.url; }); RA.Ov.limpiarCache();
    A.foto.capas.length = 0; ((p.foto || {}).capas || []).forEach(function (c) { A.foto.capas.push(c); }); RA.VFoto.redibujar();
    if (RA.VObjetos) await RA.VObjetos.cargarModelos((p.vivo && p.vivo.objetos) || []);
    await RA.VVivo.cargar(p.vivo || {}); if (RA.VObjetos) RA.VObjetos.refrescar(); T.aviso('Proyecto «' + p.nombre + '» abierto. Las imágenes propias que no estén en este dispositivo aparecerán vacías.');
  }
  V.pngsAlInicio = async function () { try { (await RA.Datos.pngs()).forEach(function (x) { RA.Ov.pngs[x.id] = x.url; }); } catch (e) { /* sin almacenamiento */ } };

  V.iniciar = function (raiz) {
    ui.desde = h('input', { type: 'number', min: 0, max: M.MAX_ID - 1, value: 0, 'aria-label': 'Primer marcador' }); ui.cant = h('input', { type: 'number', min: 1, max: 12, value: 4, 'aria-label': 'Cantidad' }); ui.copias = h('input', { type: 'number', min: 1, max: 20, value: 1, 'aria-label': 'Copias de cada uno' });
    ui.lado = h('input', { type: 'number', min: 20, max: 200, step: 1, value: A.aj.ladoMm, 'aria-label': 'Lado del cuadro negro en mm' });
    ui.lado.addEventListener('change', function () { A.aj.ladoMm = Math.max(20, Math.min(200, +ui.lado.value || 80)); ui.lado.value = A.aj.ladoMm; A.guardarAj(); ajustarHoja(); refrescar(); });
    [ui.desde, ui.cant, ui.copias].forEach(function (i) { i.addEventListener('input', refrescar); });
    ui.vista = h('div', { cls: 'im-ctl-vista' }); ui.avisos = h('div', {}); ui.resumen = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' }); var ctlBox = h('details', { cls: 'tr-panel' }, [h('summary', { txt: 'Hoja: papel, márgenes y cuadrícula' })]);
    ctl = I.controles(ctlBox, { papel: 'A4', orient: 'vertical', mt: 10, md: 10, mb: 10, mi: 10, modo: 'fija', cw: 110, ch: 113, sx: 2, sy: 2, alinear: 'centro', cortes: 'lineas', regla: true, bordes: false, cols: 2, filas: 2, explicito: false }, refrescar); ctlBox.appendChild(ctl.raiz);
    ajustarHoja();
    ui.nombre = h('input', { type: 'text', value: 'Mi proyecto', maxlength: 60, 'aria-label': 'Nombre del proyecto' }); ui.proys = h('div', {});
    var aj = h('div', {}, [
      P.rango('Campo de visión horizontal de la cámara (°)', 40, 90, 1, A.aj.fov, function (v) { A.aj.fov = v; A.guardarAj(); }),
      P.rango('Suavizado del seguimiento', 0, 0.9, 0.05, A.aj.suave, function (v) { A.aj.suave = v; A.guardarAj(); }, function (v) { return Math.round(v * 100) + ' %'; })]);
    var cal = h('select', { 'aria-label': 'Resolución de detección' }, [[320, 'Rápida (320 px)'], [480, 'Equilibrada (480 px)'], [640, 'Precisa (640 px)']].map(function (c) { return h('option', { value: c[0], txt: c[1], selected: A.aj.calidad === c[0] }); })); cal.addEventListener('change', function () { A.aj.calidad = +cal.value; A.guardarAj(); });
    var hosts = h('input', { type: 'text', value: A.aj.hosts, placeholder: 'ejemplo.com, otro.org', maxlength: 200, 'aria-label': 'Dominios permitidos para iframes' }); hosts.addEventListener('change', function () { A.aj.hosts = hosts.value; A.guardarAj(); });
    raiz.appendChild(h('div', { cls: 'ra-dos' }, [
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Marcadores para imprimir' }), h('p', { cls: 'tr-ayuda', txt: 'Diccionario propio de 50 marcadores 4×4 (no son los de OpenCV/ArUco). Imprímelos en papel mate, sin brillo, y pégalos en una superficie plana. La app los detecta y calcula la posición de la cámara.' }),
        h('div', { cls: 'ra-fila' }, [h('label', { cls: 'ra-campo ra-mini' }, [h('span', { txt: 'Desde #' }), ui.desde]), h('label', { cls: 'ra-campo ra-mini' }, [h('span', { txt: 'Cantidad' }), ui.cant]), h('label', { cls: 'ra-campo ra-mini' }, [h('span', { txt: 'Copias' }), ui.copias]), h('label', { cls: 'ra-campo ra-mini' }, [h('span', { txt: 'Lado (mm)' }), ui.lado])]),
        ctlBox, ui.resumen, ui.avisos, ui.vista, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Imprimir a escala real', on: { click: imprimir } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Descargar hoja PNG', on: { click: pngHoja } })]),
        h('p', { cls: 'tr-ayuda', txt: 'En el diálogo de impresión elige escala 100 % («tamaño real», sin «ajustar a la página») y comprueba con una regla: el lado del cuadro negro debe medir lo que indica «Lado». De eso depende que las medidas en cm sean reales.' })])]),
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Proyectos' }), h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Nombre' }), ui.nombre]), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Guardar proyecto', on: { click: guardar } })]), ui.proys, h('p', { cls: 'tr-ayuda', txt: 'Se guardan capas, anclas, objetos y ajustes. Las fotos, videos, PNG propios y mallas importadas se quedan solo en este dispositivo; nunca se suben a la nube.' })]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Ajustes de este dispositivo' }), aj, h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Detección' }), cal]), h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Dominios permitidos para iframes (además de este sitio)' }), hosts]), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Borrar PNG propios', on: { click: async function () { var l = await RA.Datos.pngs(); for (var i = 0; i < l.length; i++) await RA.Datos.borrarPNG(l[i].id); RA.Ov.pngs = {}; RA.Ov.limpiarCache(); T.aviso('PNG propios borrados de este dispositivo.'); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Borrar capturas guiadas', on: { click: async function () { var l = await RA.Datos.envios(); for (var i = 0; i < l.length; i++) await RA.Datos.alm.borrar('envios', l[i].id); T.aviso('Capturas guiadas borradas.'); } } })])]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Privacidad' }), h('ul', { cls: 'ra-lista' }, [h('li', { txt: 'La cámara solo se enciende cuando pulsas «Abrir cámara» y se apaga al cambiar de pestaña o de aplicación. Un aviso rojo fijo indica cuándo está activa.' }), h('li', { txt: 'Todo el procesamiento (marcadores, rostros, grabación) ocurre en este navegador. Ninguna imagen ni video se envía a servidores.' }), h('li', { txt: 'Los iframes cargan páginas de terceros: ellas sí usan la red. Solo se permiten https y los dominios que añadas.' })]), h('div', { id: 'aj-cuenta' })])])]));
    ajustarHoja(); pintar(); listarProyectos();
  };
  V.pintar = function () { if (ui.vista) pintar(); }; V.listar = listarProyectos;
})(window);
