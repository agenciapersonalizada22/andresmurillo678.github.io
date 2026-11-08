/* Pestana Visor: panel de capas, herramientas de medicion, cortes, estereo/VR, comparador y salida. window.R3D.VVisor */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, R = g.R3D, A = R.App, W = R.VVisor = {};
  var el = {}, Vz = null, capaSel = null;
  var HERR = [['orbita', 'Órbita'], ['vuelo', 'Vuelo'], ['distancia', 'Distancia'], ['area', 'Área'], ['angulo', 'Ángulo'], ['anotar', 'Notas']];
  function rango(etq, min, max, val, paso, fmt, f) { var i = h('input', { type: 'range', min: min, max: max, step: paso, value: val, 'aria-label': etq }), v = h('span', { cls: 'r3d-val' }); function u() { v.textContent = fmt ? fmt(+i.value) : i.value; } i.addEventListener('input', function () { u(); f(+i.value); }); u(); return { el: h('div', { cls: 'r3d-rango' }, [h('label', {}, [h('span', { txt: etq }), v]), i]), inp: i, ver: u }; }
  function casilla(txt, val, f) { var c = h('input', { type: 'checkbox', checked: !!val }); c.addEventListener('change', function () { f(c.checked); }); return { el: h('label', { cls: 'tr-chk' }, [c, txt]), inp: c }; }
  function det(titulo, hijos, abierto) { var d = h('details', abierto ? { open: true } : {}, [h('summary', { txt: titulo }), h('div', {}, hijos)]); return d; }
  function bytesTxt(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }
  function conv(v, p) { return A.fmt(v * Math.pow(A.unidad.k, p), 2); }

  function pintarCapas() {
    var c = el.capas; c.textContent = ''; if (!A.capas.length) { c.appendChild(h('p', { cls: 'tr-vacio', txt: 'No hay capas. Genera un modelo en «Reconstruir» o «Espacio», o importa uno en «Archivos».' })); }
    A.capas.forEach(function (capa) {
      var vis = h('input', { type: 'checkbox', checked: capa.visible, 'aria-label': 'Mostrar ' + capa.nombre }); vis.addEventListener('change', function () { capa.visible = vis.checked; Vz.actualizarCapa(capa.id); });
      var nom = h('button', { type: 'button', cls: 'nom tr-btn tr-chico', txt: capa.nombre, 'aria-pressed': capaSel === capa.id, title: 'Seleccionar para ver su información', on: { click: function () { capaSel = capa.id; pintarCapas(); info(); } } });
      var gr = h('select', { 'aria-label': 'Grupo de comparación de ' + capa.nombre }, [['', 'Sin grupo'], ['A', 'A (antes)'], ['B', 'B (después)']].map(function (o) { return h('option', { value: o[0], txt: o[1], selected: o[0] === capa.grupo }); })); gr.addEventListener('change', function () { capa.grupo = gr.value; Vz.actualizarCapa(capa.id); });
      var op = h('input', { type: 'range', min: 0.1, max: 1, step: 0.05, value: capa.opacidad, 'aria-label': 'Opacidad de ' + capa.nombre }); op.addEventListener('input', function () { capa.opacidad = +op.value; Vz.actualizarCapa(capa.id); });
      var col = h('input', { type: 'color', value: capa.color, 'aria-label': 'Color sólido de ' + capa.nombre }); col.addEventListener('input', function () { capa.color = col.value; Vz.actualizarCapa(capa.id); });
      var lod = h('select', { 'aria-label': 'Simplificar ' + capa.nombre }, [h('option', { value: '', txt: 'Simplificar…' })].concat([[0.5, '50 %'], [0.25, '25 %'], [0.1, '10 %'], [0.02, '2 %']].map(function (o) { return h('option', { value: o[0], txt: 'Dejar ' + o[1] }); }))); lod.addEventListener('change', function () { if (lod.value) simplificar(capa, +lod.value); lod.value = ''; });
      var q = h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Quitar', 'aria-label': 'Quitar ' + capa.nombre, on: { click: function () { A.quitarCapa(capa.id); } } });
      var n = capa.malla.idx ? R.Malla.nTri(capa.malla) : 0, nv = R.Malla.nVert(capa.malla);
      c.appendChild(h('div', { cls: 'r3d-capa' }, [vis, nom, q, h('div', { cls: 'sub', txt: (capa.malla.idx ? n.toLocaleString('es') + ' triángulos · ' : 'nube · ') + nv.toLocaleString('es') + ' puntos · ' + bytesTxt(R.Malla.bytes(capa.malla)) + (capa.origen ? ' · ' + capa.origen : '') }), h('div', { cls: 'ctl' }, [col, op, gr, lod])]));
    });
    var r = A.revisarMemoria(0); el.mem.textContent = 'Memoria en uso: ' + r.uso.toFixed(0) + ' de ' + r.limite + ' MB' + (r.ok ? '' : ' (¡al límite!)'); el.mem.className = 'tr-ayuda' + (r.cerca ? ' r3d-apr' : '');
    var ids = A.capas.map(function (x) { return x.id; }); [el.cmpA, el.cmpB].forEach(function (s, i) { var v = s.value; s.textContent = ''; A.capas.forEach(function (x) { s.appendChild(h('option', { value: x.id, txt: x.nombre })); }); if (ids.indexOf(v) >= 0) s.value = v; else if (ids.length) s.value = ids[Math.min(i, ids.length - 1)]; });
    info();
  }
  async function simplificar(capa, f) {
    var m = capa.malla, obj = Math.max(100, Math.round((m.idx ? R.Malla.nTri(m) : R.Malla.nVert(m)) * f)); T.aviso('Simplificando…');
    try { var r = await A.trabajar('decimar', { malla: m, objetivo: obj }); r.nombre = capa.nombre + ' (' + Math.round(f * 100) + ' %)'; A.anadirCapa(r, { nombre: r.nombre, origen: 'simplificado ' + Math.round(f * 100) + ' %', color: capa.color }); A.logro('r3d_simplifico'); } catch (e) { T.aviso(e.message, 'error'); }
  }
  function info() {
    var c = A.capas.filter(function (x) { return x.id === capaSel; })[0], d = el.info; d.textContent = ''; if (!c) { d.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Pulsa el nombre de una capa para ver sus medidas.' })); return; }
    var e = R.Malla.estadisticas(c.malla), u = A.unidad.nombre, t = h('table', { cls: 'r3d-tabla' }); function fila(a, b) { t.appendChild(h('tr', {}, [h('th', { txt: a }), h('td', { cls: 'n', txt: b })])); }
    fila('Capa', c.nombre); fila('Vértices', e.vertices.toLocaleString('es')); if (e.triangulos) fila('Triángulos', e.triangulos.toLocaleString('es')); fila('Tamaño (X × Y × Z)', e.caja.tam.map(function (v) { return conv(v, 1); }).join(' × ') + ' ' + u);
    if (e.triangulos) { fila('Superficie', conv(e.area, 2) + ' ' + u + '²'); fila('Volumen', e.estanca ? conv(e.volumen, 3) + ' ' + u + '³' : '≈ ' + conv(e.volumen, 3) + ' ' + u + '³ (malla abierta: aproximado)'); fila('¿Estanca?', e.estanca ? 'sí' : 'no (' + e.abiertas + ' aristas abiertas)'); } fila('Memoria', bytesTxt(e.bytes));
    d.appendChild(t); d.appendChild(h('p', { cls: 'tr-ayuda', txt: 'El volumen solo es fiable si la malla es estanca. Las unidades siguen la escala indicada en «Unidades».' }));
  }
  function pintarMedidas() {
    var l = el.medidas; l.textContent = ''; Vz.medidas.forEach(function (m, i) { l.appendChild(h('li', {}, [h('span', { txt: (m.tipo === 'dist' ? 'Distancia' : m.tipo === 'ang' ? 'Ángulo' : 'Área') + ' ' + (i + 1) + ': ' + Vz.txtMedida(m) + (m.tipo === 'area' ? ' · perímetro ' + conv(m.perim, 1) + ' ' + A.unidad.nombre + (m.plano > 0.02 ? ' · ¡poco plana, área aproximada!' : '') : '') }), h('button', { type: 'button', cls: 'tr-btn tr-chico', 'aria-label': 'Borrar medida ' + (i + 1), txt: '×', on: { click: function () { Vz.borrarMedida(m.id); } } })])); });
    el.notas.textContent = ''; Vz.anotaciones.forEach(function (n, i) { var inp = h('input', { type: 'text', value: n.texto, 'aria-label': 'Texto de la nota ' + (i + 1) }); inp.addEventListener('input', function () { Vz.editarNota(n.id, inp.value); }); el.notas.appendChild(h('li', {}, [h('b', { txt: (i + 1) + '' }), inp, h('button', { type: 'button', cls: 'tr-btn tr-chico', 'aria-label': 'Borrar nota ' + (i + 1), txt: '×', on: { click: function () { Vz.borrarNota(n.id); } } })])); });
    var p = Vz.pendientes(); el.estado.textContent = Vz.herramienta === 'orbita' || Vz.herramienta === 'vuelo' ? (Vz.herramienta === 'vuelo' ? 'Modo vuelo: arrastra para mirar; pellizca o rueda para avanzar; WASD en teclado.' : 'Modo órbita: arrastra para girar, dos dedos para acercar y mover.') : Vz.herramienta === 'anotar' ? 'Toca el modelo para dejar una nota.' : 'Toca puntos sobre el modelo' + (p ? ' (' + p + ' marcado' + (p > 1 ? 's' : '') + ')' : '') + (Vz.herramienta === 'area' ? '; «Terminar» cierra el polígono.' : '.');
    el.btnTerm.hidden = !(Vz.herramienta === 'area' && p >= 3); if (Vz.medidas.length) A.logro('r3d_medicion'); if (Vz.anotaciones.length) A.logro('r3d_nota');
  }
  function ponerHerr(n) { Vz.herr(n); Array.prototype.forEach.call(el.herr.querySelectorAll('button[data-h]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-h') === n); }); pintarMedidas(); }
  function descargar(blob, nombre) { T.descargar(blob, nombre); }
  async function capturar() { var b = await Vz.captura(); descargar(b, 'reconstruccion3d_' + Date.now() + '.png'); A.logro('r3d_captura'); T.aviso('Captura guardada (' + bytesTxt(b.size) + ').'); }
  async function video() {
    if (!A.capas.length) { T.aviso('No hay nada que grabar.', 'error'); return; } var seg = +el.vSeg.value; el.btnVideo.disabled = true; el.vProg.hidden = false; T.aviso('Grabando ' + seg + ' s… no cambies de pestaña.');
    try { var r = await Vz.videoGiro(seg, function (p) { el.vBarra.style.width = Math.round(p * 100) + '%'; }); if (r.tipo === 'webm') descargar(r.blob, 'giro3d_' + Date.now() + '.webm'); else descargar(T.zip(r.cuadros), 'giro3d_cuadros_' + Date.now() + '.zip'); A.logro('r3d_video_giro'); T.aviso(r.tipo === 'webm' ? 'Video WebM guardado.' : 'Tu navegador no graba video: se guardaron los cuadros PNG en un ZIP.'); }
    catch (e) { T.aviso('No se pudo grabar: ' + e.message, 'error'); } finally { el.btnVideo.disabled = false; setTimeout(function () { el.vProg.hidden = true; }, 800); }
  }
  function pantallaCompleta(on) {
    var c = el.cont; if (on == null) on = !c.classList.contains('completo'); c.classList.toggle('completo', on); el.btnSalir.hidden = !on;
    try { if (on && c.requestFullscreen) c.requestFullscreen().catch(function () { }); else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch (e) { } setTimeout(function () { Vz.redimensionar(); }, 50);
  }
  function comparar() {
    var a = el.cmpA.value, b = el.cmpB.value; if (!a || !b || a === b) { T.aviso('Elige dos capas distintas (antes y después).', 'error'); return; } var r = Vz.compararStats(a, b); if (!r) return; var u = A.unidad.nombre, t = el.cmpTabla; t.textContent = '';
    function fila(n, x, y, d) { t.appendChild(h('tr', {}, [h('th', { txt: n }), h('td', { cls: 'n', txt: x }), h('td', { cls: 'n', txt: y }), h('td', { cls: 'n', txt: d })])); }
    t.appendChild(h('tr', {}, [h('th', { txt: '' }), h('th', { txt: 'Antes' }), h('th', { txt: 'Después' }), h('th', { txt: 'Cambio' })]));
    fila('Vértices', r.a.vertices.toLocaleString('es'), r.b.vertices.toLocaleString('es'), (r.b.vertices - r.a.vertices).toLocaleString('es')); if (r.a.area != null && r.b.area != null) { fila('Superficie (' + u + '²)', conv(r.a.area, 2), conv(r.b.area, 2), (r.dArea >= 0 ? '+' : '') + conv(r.dArea, 2)); fila('Volumen (' + u + '³)', conv(r.a.volumen, 3), conv(r.b.volumen, 3), (r.dVolumen >= 0 ? '+' : '') + conv(r.dVolumen, 3)); }
    ['X', 'Y', 'Z'].forEach(function (n, i) { fila('Tamaño ' + n + ' (' + u + ')', conv(r.a.caja.tam[i], 1), conv(r.b.caja.tam[i], 1), (r.dCaja[i] >= 0 ? '+' : '') + conv(r.dCaja[i], 1)); });
    el.cmpDesv.textContent = 'Desviación de «antes» respecto a «después» (por vértices, aproximada): media ' + conv(r.desvMedia, 1) + ' ' + u + ', máxima ' + conv(r.desvMax, 1) + ' ' + u + ' sobre ' + r.muestras + ' puntos. Solo es útil si las dos versiones están alineadas y a la misma escala.'; A.logro('r3d_comparo');
  }
  function mandoHint() { var M = g.Mando; if (!M) return; var t = M.conectado ? 'Mando: stick izq. mueve/pan · stick der. orbita · gatillos acercan · A marca punto (mira central) · B deshace · X órbita/vuelo · Y encuadra · LB/RB herramienta · L3 termina área · MENU cambia de pestaña · VISTA captura.' : ''; el.hint.textContent = t; el.hint.hidden = !t; }

  W.iniciar = function (raiz) {
    Vz = R.Visor; el.cont = h('div', { id: 'visor3d' }); el.btnSalir = h('button', { type: 'button', cls: 'tr-btn r3d-salir', txt: 'Salir de pantalla completa', hidden: true, on: { click: function () { pantallaCompleta(false); } } });
    el.estado = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' }); el.hint = h('p', { cls: 'tr-nota', hidden: true });
    el.herr = h('div', { cls: 'r3d-barra-v', role: 'group', 'aria-label': 'Herramientas del visor' }, HERR.map(function (x) { return h('button', { type: 'button', cls: 'tr-btn', 'data-h': x[0], 'aria-pressed': x[0] === 'orbita', txt: x[1], on: { click: function () { ponerHerr(x[0]); } } }); }));
    el.btnTerm = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Terminar área', hidden: true, on: { click: function () { Vz.terminar(); } } });
    var vistas = h('select', { 'aria-label': 'Vista predefinida', on: { change: function () { if (this.value) Vz.vistaPred(this.value); this.value = ''; } } }, [h('option', { value: '', txt: 'Vistas…' })].concat([['frente', 'Frente (1)'], ['atras', 'Atrás (2)'], ['izq', 'Izquierda (3)'], ['der', 'Derecha (4)'], ['arriba', 'Arriba (5)'], ['iso', 'Isométrica (6)']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); })));
    el.barra2 = h('div', { cls: 'r3d-barra-v' }, [el.btnTerm, h('button', { type: 'button', cls: 'tr-btn', txt: 'Deshacer', on: { click: function () { Vz.deshacer(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Encuadrar', on: { click: function () { Vz.encuadrar(); } } }), vistas, h('button', { type: 'button', cls: 'tr-btn', txt: 'Pantalla completa', on: { click: function () { pantallaCompleta(); } } })]);
    el.capas = h('div'); el.mem = h('p', { cls: 'tr-ayuda' }); el.info = h('div');
    /* apariencia */
    var apar = h('select', { 'aria-label': 'Apariencia de las mallas', on: { change: function () { Vz.opc.apariencia = this.value; Vz.opcCambio(); } } }, [['vertice', 'Color de vértice (si lo hay)'], ['solido', 'Color sólido de la capa'], ['normales', 'Normales'], ['altura', 'Altura (degradado)']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); }));
    var cnube = h('select', { 'aria-label': 'Color de la nube', on: { change: function () { Vz.opc.colorNube = this.value; Vz.opcCambio(); } } }, [['rgb', 'Color propio / intensidad'], ['altura', 'Altura (degradado)'], ['unico', 'Color único de la capa']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); }));
    var fondo = h('select', { 'aria-label': 'Fondo', on: { change: function () { Vz.opc.fondo = this.value; var a = A.ajustes(); a.fondo = this.value; R.Datos.guardarAjustes(a); Vz.opcCambio(); } } }, [['auto', 'Fondo: según tema'], ['claro', 'Fondo claro'], ['gris', 'Fondo gris'], ['negro', 'Fondo negro']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); })); fondo.value = A.ajustes().fondo; Vz.opc.fondo = fondo.value;
    var alambre = casilla('Alambre (wireframe)', false, function (v) { Vz.opc.alambre = v; Vz.opcCambio(); }), atenuar = casilla('Puntos con tamaño en perspectiva', false, function (v) { Vz.opc.atenuar = v; Vz.opcCambio(); }), rej = casilla('Rejilla', true, function (v) { Vz.opc.rejilla = v; Vz.opcCambio(); }), ejes = casilla('Ejes', false, function (v) { Vz.opc.ejes = v; Vz.opcCambio(); });
    var pt = rango('Tamaño de punto', 1, 14, 3, 0.5, null, function (v) { Vz.opc.punto = v; Vz.opcCambio(); }), luz = rango('Luz', 0, 2.5, 1, 0.05, function (v) { return v.toFixed(2); }, function (v) { Vz.opc.luz = v; Vz.opcCambio(); }), luzA = rango('Dirección de la luz (°)', 0, 360, 35, 5, null, function (v) { Vz.opc.luzAng = v; Vz.opcCambio(); });
    /* unidades */
    var unom = h('select', { 'aria-label': 'Unidad de lectura', on: { change: unidad } }, ['u', 'mm', 'cm', 'm', 'pulg', 'pie'].map(function (u) { return h('option', { value: u, txt: u }); })), uk = h('input', { type: 'number', step: 'any', value: 1, min: 0, 'aria-label': 'Factor de escala', inputmode: 'decimal', on: { change: unidad } });
    function unidad() { var k = +uk.value; if (!(k > 0)) return; A.ponerUnidad(unom.value, k); Vz.restaurarMedidas(Vz.medidas, Vz.anotaciones); pintarCapas(); }
    A.on('unidad', function () { unom.value = A.unidad.nombre; uk.value = A.unidad.k; });
    el.medidas = h('ul', { cls: 'r3d-lista' }); el.notas = h('ul', { cls: 'r3d-lista' });
    /* cortes */
    var cortes = ['x', 'y', 'z'].map(function (k) { var c = Vz.corte[k], on = casilla('Plano ' + k.toUpperCase(), false, function (v) { c.on = v; Vz.actualizarCorte(); cortInfo(); if (v) A.logro('r3d_corte'); }), sl = rango('Posición ' + k.toUpperCase() + ' (%)', 0, 100, 50, 1, function (v) { return v + ' %'; }, function (v) { c.v = v / 100; Vz.actualizarCorte(); cortInfo(); }), inv = casilla('Invertir lado', false, function (v) { c.inv = v; Vz.actualizarCorte(); }); c.v = 0.5; return h('div', { cls: 'tr-panel' }, [on.el, sl.el, inv.el]); });
    var cont = casilla('Dibujar el contorno de la sección y medirlo (primer plano activo)', false, function (v) { Vz.corte.contorno = v; Vz.actualizarCorte(); cortInfo(); }); el.cortInfo = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' });
    function cortInfo() { var s = Vz.seccionInfo; el.cortInfo.textContent = s ? 'Sección en ' + s.eje.toUpperCase() + ': perímetro ' + conv(s.longitud, 1) + ' ' + A.unidad.nombre + ' · área ' + conv(s.area, 2) + ' ' + A.unidad.nombre + '² (aprox.)' : (Vz.corte.contorno ? 'Activa un plano y deja visible una malla (las nubes no tienen sección).' : ''); }
    /* estereo / VR */
    var est = h('select', { 'aria-label': 'Modo estéreo', on: { change: function () { Vz.opc.estereo = this.value; Vz.pedir(); if (this.value === 'anaglifo') A.logro('r3d_anaglifo'); if (this.value === 'sbs') { A.logro('r3d_lado_a_lado'); pantallaCompleta(true); } } } }, [['off', 'Normal'], ['anaglifo', 'Anaglifo rojo-cian (gafas de papel)'], ['sbs', 'Lado a lado (Cardboard / visores)']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); }));
    var ipd = rango('Separación entre ojos', 0.1, 3, 1, 0.05, function (v) { return v.toFixed(2) + '×'; }, function (v) { Vz.opc.ipd = v; Vz.pedir(); });
    el.btnVR = h('button', { type: 'button', cls: 'tr-btn', txt: 'Entrar en realidad virtual (WebXR)', hidden: true, on: { click: function () { Vz.entrarVR().then(function () { A.logro('r3d_webxr'); }).catch(function (e) { T.aviso(e.message, 'error'); }); } } }); el.vrNota = h('p', { cls: 'tr-ayuda' });
    function xrEstado() { el.btnVR.hidden = !Vz.xr.soportado; el.vrNota.textContent = Vz.xr.soportado ? 'WebXR immersive-vr disponible (no probado con tu visor concreto).' : 'Este navegador/dispositivo no ofrece WebXR immersive-vr. Con un visor tipo Cardboard usa «Lado a lado» en pantalla completa y gira el móvil en horizontal. Sin corrección de lente.'; }
    /* comparar */
    el.cmpModo = h('select', { 'aria-label': 'Modo de comparación', on: { change: function () { Vz.opc.comparar = this.value; Vz.compararModo(); if (this.value !== 'off') A.logro('r3d_comparador'); } } }, [['off', 'Apagado'], ['lado', 'Lado a lado (antes | después)'], ['cortina', 'Cortina deslizante'], ['superponer', 'Superpuestos en colores']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); }));
    el.cmpA = h('select', { 'aria-label': 'Capa antes' }); el.cmpB = h('select', { 'aria-label': 'Capa después' }); el.cmpTabla = h('table', { cls: 'r3d-tabla' }); el.cmpDesv = h('p', { cls: 'tr-ayuda' });
    function asignar() { var a = el.cmpA.value, b = el.cmpB.value; if (!a || !b || a === b) { T.aviso('Elige dos capas distintas.', 'error'); return; } A.capas.forEach(function (c) { c.grupo = c.id === a ? 'A' : c.id === b ? 'B' : ''; Vz.actualizarCapa(c.id); }); pintarCapas(); el.cmpModo.value = el.cmpModo.value === 'off' ? 'cortina' : el.cmpModo.value; Vz.opc.comparar = el.cmpModo.value; Vz.compararModo(); }
    /* salida */
    el.vSeg = h('select', { 'aria-label': 'Duración del giro' }, [6, 10, 15].map(function (s) { return h('option', { value: s, txt: s + ' s' }); })); el.vBarra = h('i'); el.vProg = h('div', { cls: 'r3d-prog', hidden: true }, [el.vBarra]); el.btnVideo = h('button', { type: 'button', cls: 'tr-btn', txt: 'Grabar video giratorio', on: { click: video } });

    var izq = h('div', {}, [el.cont, el.btnSalir]);
    raiz.appendChild(h('div', {}, [izq, el.hint, el.herr, el.estado, el.barra2,
      h('div', { cls: 'r3d-panel' }, [
        det('Capas', [el.capas, el.mem, h('p', { cls: 'tr-ayuda', txt: 'Importa más capas en «Archivos». Con muchos triángulos usa «Simplificar» para ir fluido.' })], true),
        det('Medidas y notas', [h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Unidad de lectura' }), unom]), h('div', {}, [h('label', { txt: '1 unidad del modelo equivale a' }), uk])]), h('h3', { txt: 'Medidas' }), el.medidas, h('h3', { txt: 'Notas' }), el.notas, h('p', { cls: 'tr-ayuda', txt: 'Las medidas se toman sobre la superficie visible. En nubes de puntos se toma el punto más cercano al toque.' })]),
        det('Información del modelo', [el.info]),
        det('Apariencia y luz', [apar, cnube, fondo, alambre.el, atenuar.el, rej.el, ejes.el, pt.el, luz.el, luzA.el, h('p', { cls: 'tr-ayuda', txt: 'Texturas de imagen (UV) no se cargan: el color se proyecta por vértice.' })]),
        det('Cortes y secciones', cortes.concat([cont.el, el.cortInfo, h('p', { cls: 'tr-ayuda', txt: 'El corte oculta lo que queda a un lado del plano; no tapa el interior.' })])),
        det('Estéreo, Cardboard y VR', [est, ipd.el, el.btnVR, el.vrNota, h('p', { cls: 'tr-ayuda', txt: 'El anaglifo necesita gafas rojo-cian. El lado a lado divide la pantalla para visores.' })]),
        det('Comparar versiones (antes / después)', [h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Antes (A)' }), el.cmpA]), h('div', {}, [h('label', { txt: 'Después (B)' }), el.cmpB])]), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Asignar A y B', on: { click: asignar } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Comparar cifras', on: { click: comparar } })]), h('label', { txt: 'Modo' }), el.cmpModo, el.cmpTabla, el.cmpDesv]),
        det('Capturas y video', [h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Guardar captura PNG', on: { click: capturar } })]), h('label', { txt: 'Duración del video giratorio' }), el.vSeg, el.vProg, h('div', { cls: 'tr-acciones' }, [el.btnVideo]), h('p', { cls: 'tr-ayuda', txt: 'El video es WebM grabado desde el visor. Si tu navegador no puede grabar, se guardan los cuadros PNG en un ZIP.' })])])]));
    if (!Vz.iniciar(el.cont)) { el.cont.classList.add('r3d-err'); el.cont.textContent = Vz.error || 'No se pudo iniciar WebGL.'; return; }
    Vz.unidad = A.unidad; Vz.on('medidas', pintarMedidas); Vz.on('capas', function () { }); Vz.on('herramienta', pintarMedidas); Vz.on('aviso', function (m) { T.aviso(m); }); Vz.on('xr', xrEstado);
    Vz.on('mando-menu', function () { var o = ['captura', 'recon', 'espacio', 'visor', 'archivos'], i = o.indexOf('visor'); A.irA(o[(i + 1) % o.length]); }); Vz.on('mando-captura', capturar);
    A.on('capas', function () { pintarCapas(); if (!A.capas.length) capaSel = null; else if (!A.capas.some(function (c) { return c.id === capaSel; })) capaSel = A.capas[A.capas.length - 1].id; pintarCapas(); }); Vz.on('estado', function () { }); xrEstado(); pintarCapas(); pintarMedidas();
    setInterval(mandoHint, 1500); document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && el.cont.classList.contains('completo')) pantallaCompleta(false); });
    Vz.on('capas', function () { Vz.actualizarCorte(); });
    W.sel = function () { return capaSel; }; W.pintarCapas = pintarCapas; W.cortInfo = cortInfo;
  };
})(window);
