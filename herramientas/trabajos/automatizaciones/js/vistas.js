/* Vistas: Flujos, Plantillas, Registro, Seguridad, Fondo y nube. window.AutoVistas */
(function (g) {
  'use strict';
  var A = g.AutoApp, D = g.AutoDatos, V = g.AutoVivo, E = g.AutoEditor, T = g.Tr, h = T.h, CAT = g.AutoCatalogo, N = g.AutoNube, M = g.AutoMotor;
  var Vs = g.AutoVistas = {};
  function el(id) { return document.getElementById(id); }
  function ayuda(t) { return h('p', { cls: 'tr-ayuda', txt: t }); }

  /* ---------- flujos ---------- */
  function disparadores(f) { return f.nodos.filter(function (n) { return CAT.TIPOS[n.tipo] && CAT.TIPOS[n.tipo].categoria === 'disparador'; }).map(function (n) { return CAT.TIPOS[n.tipo].nombre; }).join(', '); }
  function exportar(f) {
    var j = { formato: 'trabajos-automatizaciones', version: 1, nombre: f.nombre, vars: f.vars || {}, nodos: f.nodos, aristas: f.aristas };
    T.descargar(new Blob([JSON.stringify(j, null, 2)], { type: 'application/json' }), T.nombreArchivo(f.nombre) + '.flujo.json'); A.aviso('Flujo exportado (sin claves: solo referencias {{secreto.X}}).');
  }
  A.on('exportar', exportar);
  async function importar(texto) {
    var j; try { j = JSON.parse(texto); } catch (e) { throw new Error('No es JSON válido: ' + e.message); }
    var lista = Array.isArray(j) ? j : [j], n = 0, ult = null;
    for (var i = 0; i < lista.length; i++) { var f = D.normalizar(lista[i]); await D.guardarFlujo(f); ult = f; n++; }
    A.emitir('flujos'); return { n: n, ultimo: ult };
  }
  Vs.iniciarFlujos = function () {
    var raiz = el('v-flujos'), cont = h('div', { cls: 'au-flujos' }), ar = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, id: 'au-imp-arch' });
    ar.addEventListener('change', function () { var f = ar.files[0]; if (!f) return; f.text().then(importar).then(function (r) { A.aviso(r.n + ' flujo(s) importado(s).'); pintar(); }).catch(function (e) { A.aviso(e.message, 'error'); }); ar.value = ''; });
    var barra = h('div', { cls: 'tr-acciones' }, [A.boton('+ Nuevo flujo', async function () { var f = D.nuevoFlujo('Flujo ' + new Date().toLocaleDateString('es')); await D.guardarFlujo(f); E.abrir(f); A.ir('editor'); pintar(); A.emitir('flujos'); }, 'tr-pri', { id: 'au-nuevo' }), A.boton('Desde plantilla', function () { A.ir('plantillas'); }), A.boton('Importar JSON…', function () { ar.click(); }, '', { id: 'au-importar' }), A.boton('Exportar todos', async function () { var l = await D.flujos(); if (!l.length) return A.aviso('No hay flujos.'); T.descargar(new Blob([JSON.stringify(l.map(function (f) { return { formato: 'trabajos-automatizaciones', version: 1, nombre: f.nombre, vars: f.vars, nodos: f.nodos, aristas: f.aristas }; }), null, 2)], { type: 'application/json' }), 'automatizaciones.json'); })]);
    var pegar = h('details', { cls: 'qr-det' }, [h('summary', { txt: 'Importar pegando JSON' }), h('textarea', { id: 'au-imp-txt', rows: 4, placeholder: '{ "nombre": "…", "nodos": [...], "aristas": [...] }', 'aria-label': 'JSON del flujo' }), A.boton('Importar', function () { importar(el('au-imp-txt').value).then(function (r) { A.aviso('Importado «' + r.ultimo.nombre + '».'); el('au-imp-txt').value = ''; pintar(); }).catch(function (e) { A.aviso(e.message, 'error'); }); }, 'tr-chico')]);
    raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Mis flujos' }), ayuda('Los flujos se guardan en este dispositivo y en tu cuenta (sin claves). Un flujo «activo» funciona mientras esta pestaña esté abierta.'), barra, pegar, ar])); raiz.appendChild(cont);
    async function pintar() {
      var l = await D.flujos(), ult = await D.ejecuciones(); cont.textContent = '';
      if (!l.length) { cont.appendChild(h('div', { cls: 'tr-vacio', id: 'au-vacio-flujos', txt: 'Aún no tienes flujos. Crea uno nuevo o parte de una plantilla.' })); return; }
      var ul = h('ul', { cls: 'au-flujos-ul' });
      l.forEach(function (f) {
        var u = ult.filter(function (r) { return r.flujo === f.id; })[0], act = h('input', { type: 'checkbox', 'aria-label': 'Activar ' + f.nombre }); act.checked = !!f.activo;
        act.addEventListener('change', async function () { f.activo = act.checked; await D.guardarFlujo(f); A.emitir('flujos'); if (E.flujo && E.flujo.id === f.id) E.flujo.activo = f.activo; });
        ul.appendChild(h('li', { cls: 'au-flujo', 'data-id': f.id }, [h('div', { cls: 'au-flujo-t' }, [h('b', { txt: f.nombre }), h('small', { txt: f.nodos.length + ' nodos · ' + (disparadores(f) || 'sin disparador') }), h('small', { txt: u ? 'Última ejecución: ' + A.fmt(u.ini) + ' · ' + u.estado + (u.simulacion ? ' (simulación)' : '') : 'Sin ejecuciones' })]),
          h('label', { cls: 'au-sw' }, [act, 'Activo']),
          h('div', { cls: 'au-flujo-b' }, [A.boton('Abrir', function () { E.abrir(f); A.ir('editor'); }, 'tr-chico tr-pri'), A.boton('Duplicar', async function () { var c = D.normalizar(f, f.nombre + ' (copia)'); await D.guardarFlujo(c); A.emitir('flujos'); pintar(); }, 'tr-chico'), A.boton('Exportar', function () { exportar(f); }, 'tr-chico'),
            A.boton('Borrar', async function () { if (await A.confirmar('Borrar flujo', '¿Borrar «' + f.nombre + '»? No se puede deshacer.', 'Borrar')) { await D.borrarFlujo(f.id); if (E.flujo && E.flujo.id === f.id) { E.flujo = null; E.ui.zona.hidden = true; E.ui.vacioFlujo.hidden = false; } A.emitir('flujos'); pintar(); } }, 'tr-chico tr-peli')])]));
      });
      cont.appendChild(ul);
    }
    A.on('flujos', function () { clearTimeout(Vs._t); Vs._t = setTimeout(pintar, 200); }); A.on('ejecucion', pintar); pintar(); Vs.pintarFlujos = pintar;
  };

  /* ---------- plantillas ---------- */
  Vs.iniciarPlantillas = function () {
    var raiz = el('v-plantillas'), ul = h('ul', { cls: 'tr-rejilla' });
    g.AutoPlantillas.forEach(function (p) {
      ul.appendChild(h('li', {}, [h('div', { cls: 'tr-tarjeta au-plantilla', style: '--c:#e8590c', 'data-plantilla': p.id }, [h('span', { cls: 'tr-ico', 'aria-hidden': 'true', txt: p.icono, style: 'font-size:26px' }), h('span', {}, [h('h2', { txt: p.nombre }), h('p', { txt: p.desc }), h('p', { cls: 'tr-ayuda', txt: p.ajustar }), h('div', { cls: 'tr-acciones' }, [A.boton('Usar plantilla', async function () { var f = D.normalizar(p.flujo, p.nombre); await D.guardarFlujo(f); A.emitir('flujos'); E.abrir(f); A.ir('editor'); A.aviso('Plantilla «' + p.nombre + '» creada.'); }, 'tr-pri tr-chico', { 'data-usar': p.id })])])])]));
    });
    raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Plantillas listas' }), ayuda('Cada plantilla crea una copia editable. Pruébala con «Simular» antes de ejecutarla en real.')])); raiz.appendChild(ul);
  };

  /* ---------- registro ---------- */
  Vs.iniciarRegistro = function () {
    var raiz = el('v-registro'), lista = h('div'), det = h('div', { id: 'au-reg-det' }), sel = null;
    var ar = h('div', { cls: 'tr-acciones' }, [A.boton('Actualizar', pintar, 'tr-chico'), A.boton('Vaciar registro', async function () { if (await A.confirmar('Vaciar registro', 'Se borran todas las ejecuciones guardadas en este dispositivo.', 'Vaciar')) { await D.limpiarEj(); sel = null; pintar(); } }, 'tr-chico tr-peli')]);
    raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Registro de ejecuciones' }), ayuda('Se guardan las últimas 60 en este dispositivo (no se sincronizan). Los secretos aparecen como ***.'), ar]));
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [lista, det]));
    function detalle(r) {
      det.textContent = ''; if (!r) return;
      var cab = h('div', { cls: 'tr-panel' }, [h('h2', { txt: r.nombre + ' · ' + r.estado }), h('p', { cls: 'tr-ayuda', txt: A.fmt(r.ini) + ' · ' + (r.fin - r.ini) + ' ms · disparo: ' + r.disparo.tipo + (r.simulacion ? ' · SIMULACIÓN' : '') + (r.pasoAPaso ? ' · paso a paso' : '') })]);
      if (r.error) cab.appendChild(h('div', { cls: 'tr-nota tr-mal', txt: r.error }));
      var ol = h('ol', { cls: 'au-pasos' });
      r.pasos.forEach(function (p) {
        ol.appendChild(h('li', { cls: 'au-paso-i e-' + p.estado }, [h('details', {}, [h('summary', {}, [h('b', { txt: p.titulo }), ' ', h('span', { cls: 'tr-etiq', txt: p.estado }), ' ', h('small', { txt: (p.ms || 0) + ' ms' + (p.puerto && p.puerto !== 'sal' ? ' · salida «' + p.puerto + '»' : '') })]), p.error ? h('div', { cls: 'tr-nota tr-mal', txt: p.error }) : null, h('b', { txt: 'Parámetros' }), h('pre', { cls: 'au-pre', txt: A.json(p.entrada) }), h('b', { txt: 'Salida' }), h('pre', { cls: 'au-pre', txt: A.json(p.salida) })])]));
      });
      cab.appendChild(ol); if (r.truncado) cab.appendChild(ayuda('Registro recortado a 300 pasos.'));
      if (r.vars && Object.keys(r.vars).length) cab.appendChild(h('details', { cls: 'qr-det' }, [h('summary', { txt: 'Variables finales' }), h('pre', { cls: 'au-pre', txt: A.json(r.vars) })]));
      var f = r.flujo; cab.appendChild(h('div', { cls: 'tr-acciones' }, [A.boton('Repetir en simulación', async function () { var fl = await D.flujo(f); if (!fl) return A.aviso('El flujo ya no existe.', 'error'); E.abrir(fl); A.ir('editor'); setTimeout(function () { E.ejecutar({ simulacion: true }); }, 100); }, 'tr-chico')]));
      det.appendChild(cab);
    }
    async function pintar() {
      var l = await D.ejecuciones(); lista.textContent = ''; var p = h('div', { cls: 'tr-panel' }, [h('h3', { txt: l.length + ' ejecuciones' })]);
      if (!l.length) p.appendChild(h('div', { cls: 'tr-vacio', txt: 'Todavía no hay ejecuciones.' }));
      var ul = h('ul', { cls: 'au-reg-ul' });
      l.forEach(function (r) { ul.appendChild(h('li', {}, [h('button', { type: 'button', cls: 'au-reg-i e-' + r.estado + (sel === r.id ? ' sel' : ''), 'data-reg': r.id, on: { click: function () { sel = r.id; pintar(); detalle(r); } } }, [h('b', { txt: r.nombre }), h('small', { txt: A.fmt(r.ini) + ' · ' + r.estado + (r.simulacion ? ' · simulación' : '') + ' · ' + r.disparo.tipo })])])); });
      p.appendChild(ul); lista.appendChild(p); if (sel) detalle(l.filter(function (r) { return r.id === sel; })[0]);
    }
    A.on('ejecucion', pintar); A.on('abrir-registro', function (id) { sel = id; pintar(); }); pintar();
  };

  /* ---------- seguridad ---------- */
  Vs.iniciarSeguridad = function () {
    var raiz = el('v-seguridad');
    function pintar() {
      raiz.textContent = ''; var aj = D.ajustes(), sec = D.secretos();
      var dom = h('ul', { cls: 'au-lista-simple', id: 'au-dominios' });
      aj.dominios.forEach(function (d, i) { dom.appendChild(h('li', {}, [h('code', { txt: d }), A.boton('Quitar', function () { aj.dominios.splice(i, 1); D.guardarAjustes(aj); pintar(); }, 'tr-chico tr-peli', { 'aria-label': 'Quitar dominio ' + d })])); });
      if (!aj.dominios.length) dom.appendChild(h('li', { cls: 'tr-ayuda', txt: 'Ningún dominio permitido todavía: la primera petición te preguntará.' }));
      var nd = h('input', { type: 'text', id: 'au-nuevo-dom', placeholder: 'api.ejemplo.com', 'aria-label': 'Nuevo dominio', autocomplete: 'off', autocapitalize: 'off' });
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Dominios permitidos' }), ayuda('HTTP, enlaces, IA y puentes solo hablan con estos dominios (incluye sus subdominios). Las ejecuciones automáticas nunca preguntan: si el dominio no está aquí, el paso falla.'), dom,
        h('div', { cls: 'tr-fila' }, [nd, A.boton('Añadir dominio', function () { var v = nd.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''); if (!/^(\*\.)?[a-z0-9.-]+\.[a-z]{2,}$|^localhost$|^127\.0\.0\.1$/.test(v)) return A.aviso('Dominio no válido.', 'error'); if (aj.dominios.indexOf(v) < 0) aj.dominios.push(v); D.guardarAjustes(aj); pintar(); }, 'tr-pri', { id: 'au-add-dom' })])]));
      var conf = Object.keys(aj.confirmadas), lc = h('ul', { cls: 'au-lista-simple' });
      D.flujos().then(function (fl) { conf.forEach(function (k) { var p = k.split('|'), f = fl.filter(function (x) { return x.id === p[0]; })[0]; lc.appendChild(h('li', {}, [h('span', { txt: (f ? f.nombre : 'flujo borrado') + ' · ' + p[1] }), A.boton('Revocar', function () { delete aj.confirmadas[k]; D.guardarAjustes(aj); pintar(); }, 'tr-chico tr-peli')])); }); if (!conf.length) lc.appendChild(h('li', { cls: 'tr-ayuda', txt: 'Sin aprobaciones guardadas.' })); });
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Acciones aprobadas' }), ayuda('Las acciones externas (HTTP, dispositivo, enlace, IA, portapapeles, descarga) piden confirmación la primera vez por flujo. Ejecuta a mano para aprobar; aquí puedes revocar.'), lc]));
      var ls = h('ul', { cls: 'au-lista-simple', id: 'au-secretos' });
      Object.keys(sec).forEach(function (k) { ls.appendChild(h('li', {}, [h('code', { txt: '{{secreto.' + k + '}}' }), h('span', { cls: 'tr-ayuda', txt: '•••• (' + String(sec[k]).length + ' car.)' }), A.boton('Borrar', function () { delete sec[k]; D.guardarSecretos(sec); pintar(); }, 'tr-chico tr-peli', { 'aria-label': 'Borrar secreto ' + k })])); });
      if (!Object.keys(sec).length) ls.appendChild(h('li', { cls: 'tr-ayuda', txt: 'Sin secretos.' }));
      var sn = h('input', { type: 'text', id: 'au-sec-n', placeholder: 'NOMBRE (p. ej. ANTHROPIC_API_KEY)', 'aria-label': 'Nombre del secreto', autocomplete: 'off', autocapitalize: 'characters' }), sv = h('input', { type: 'password', id: 'au-sec-v', placeholder: 'valor', 'aria-label': 'Valor del secreto', autocomplete: 'off' });
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Secretos y claves (solo este dispositivo)' }), ayuda('Se guardan en el almacenamiento local de este dispositivo (trabajos_automatizaciones_claves_dispositivo), nunca se sincronizan con tu cuenta ni se exportan. Úsalos en los flujos como {{secreto.NOMBRE}}. Para la IA usa ANTHROPIC_API_KEY u OPENAI_API_KEY. Las claves en el navegador son visibles para quien use este equipo: usa claves con límite de gasto.'), ls,
        h('div', { cls: 'tr-fila' }, [sn, sv, A.boton('Guardar secreto', function () { var n = sn.value.trim(); if (!/^[A-Za-z_][A-Za-z0-9_]{1,40}$/.test(n)) return A.aviso('Nombre no válido (letras, números y _).', 'error'); if (!sv.value) return A.aviso('Escribe el valor.', 'error'); sec[n] = sv.value; D.guardarSecretos(sec); pintar(); A.aviso('Secreto guardado en este dispositivo.'); }, 'tr-pri', { id: 'au-add-sec' })])]));
      var perm = typeof Notification === 'undefined' ? 'no disponible' : Notification.permission;
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Permisos del navegador' }), h('p', { txt: 'Notificaciones: ' + perm }), perm === 'default' ? A.boton('Permitir notificaciones', function () { Notification.requestPermission().then(pintar); }, 'tr-chico') : null,
        h('h3', { txt: 'JavaScript aislado' }), ayuda('El nodo «JavaScript» corre en un Web Worker sin DOM, cookies ni almacenamiento, con red, WebSocket e IndexedDB desactivados (mejor esfuerzo) y con límite de tiempo (50–5000 ms): si se pasa, el worker se destruye. No pegues código que no entiendas.')]));
    }
    A.on('ajustes', pintar); pintar();
  };

  /* ---------- fondo y nube ---------- */
  Vs.iniciarFondo = function () {
    var raiz = el('v-fondo'), flujoSel = null;
    async function pintar() {
      var enfoque = document.activeElement && document.activeElement.id; raiz.textContent = '';
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Cómo se ejecutan tus automatizaciones' }),
        h('div', { cls: 'tr-nota tr-av' }, ['Sin servidor propio, ', h('b', { txt: 'las automatizaciones solo corren mientras esta página está abierta' }), ' (en una pestaña del navegador). Si cierras la pestaña, el temporizador, los webhooks y los sondeos se detienen. Para que corran con el equipo apagado hay dos caminos honestos: un Service Worker con «sincronización periódica» (solo Chrome/Edge, app instalada, cada ≥12 h y a criterio del navegador) o un workflow de GitHub Actions en la nube (abajo).']),
        ayuda('Mientras la página esté abierta: temporizador y hora del día (con comprobación cada 2 s), sondeos de datos, mensajes de dispositivos conectados, QR leídos y webhooks por puente WebSocket. Al despertar un equipo suspendido no se recuperan las ejecuciones perdidas: solo se vuelve a programar.')]));
      /* disparadores vivos */
      var tb = h('tbody'), st = V.estadoTriggers();
      st.forEach(function (s) { tb.appendChild(h('tr', {}, [h('td', { txt: s.flujo.nombre }), h('td', { txt: CAT.TIPOS[s.nodo.tipo].nombre }), h('td', { txt: s.error ? '⚠ ' + s.error : s.proximo ? 'Próx.: ' + A.fmt(s.proximo) : 'Escuchando' }),
        h('td', {}, [s.nodo.tipo === 'cambio_datos' || s.nodo.tipo === 'nueva_oferta' || s.nodo.tipo === 'nueva_cuota' ? A.boton('Comprobar ahora', function () { V.sondear(s.flujo, s.nodo, true); }, 'tr-chico', { 'data-forzar': s.key }) : null])])); });
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Disparadores activos ahora' }), st.length ? h('div', { cls: 'au-tabla' }, [h('table', {}, [h('thead', {}, [h('tr', {}, ['Flujo', 'Disparador', 'Estado', ''].map(function (x) { return h('th', { txt: x }); }))]), tb])]) : h('div', { cls: 'tr-vacio', id: 'au-sin-disp', txt: 'No hay flujos activos con disparadores automáticos. Activa un flujo en «Flujos» o en el editor.' })]));
      /* conexiones */
      var cx = TDlist(), uc = h('ul', { cls: 'au-lista-simple' });
      cx.forEach(function (c) { uc.appendChild(h('li', {}, [h('span', { txt: c.tipo + ' · ' + c.nombre + ' · ' + c.estado })])); }); if (!cx.length) uc.appendChild(h('li', { cls: 'tr-ayuda', txt: 'Sin conexiones abiertas. Conecta dispositivos en el panel de dispositivos; los webhooks necesitan un puente.' }));
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Dispositivos y puentes' }), uc, h('div', { cls: 'tr-acciones' }, [A.boton('Conectar puentes de mis webhooks', function () { V.conectarPuentes(true).then(pintar); }, 'tr-chico', { id: 'au-conectar-puentes' }), h('a', { cls: 'tr-btn tr-chico', href: '../dispositivos/', txt: 'Panel de dispositivos' })]),
        ayuda('Webhook entrante: un puente local (dispositivos/puente/puente-minimo.js u otro) que reciba la petición HTTP y envíe al navegador {"tipo":"webhook","ruta":"/aviso","cuerpo":{…}} por WebSocket. Desde una página HTTPS solo se permite ws://localhost o wss://.')]));
      /* escaner QR */
      var video = h('video', { playsinline: '', muted: '', cls: 'au-video', hidden: true, 'aria-label': 'Cámara para leer QR' }), res = h('p', { cls: 'tr-ayuda', id: 'au-qr-res', txt: 'Disparador «QR leído»: lee un código aquí (cámara o imagen) y lanza los flujos que lo usen. También escucha el canal «trabajos_qr_leido» del módulo QR.' }), cam = null;
      var arch = h('input', { type: 'file', accept: 'image/*', hidden: true, id: 'au-qr-arch' });
      arch.addEventListener('change', function () { if (arch.files[0] && g.QRLector) g.QRLector.leerArchivo(arch.files[0]).then(function (r) { if (r) { res.textContent = 'Leído: ' + r.texto; V.qrLeido(r.texto); } else res.textContent = 'No se encontró ningún QR en la imagen.'; }, function (e) { res.textContent = e.message; }); arch.value = ''; });
      var bcam = A.boton('Abrir cámara', function () {
        if (cam) { cam.parar(); cam = null; video.hidden = true; bcam.textContent = 'Abrir cámara'; return; }
        if (!g.QRLector || !g.QRLector.hayCamara()) { res.textContent = 'Este navegador no ofrece cámara.'; return; }
        video.hidden = false; bcam.textContent = 'Detener cámara'; cam = g.QRLector.iniciarCamara(video, function (r) { res.textContent = 'Leído: ' + r.texto; V.qrLeido(r.texto); }, function (m) { res.textContent = String(m); video.hidden = true; cam = null; bcam.textContent = 'Abrir cámara'; });
      }, 'tr-chico', { id: 'au-qr-cam' });
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Lector de QR para disparadores' }), res, video, h('div', { cls: 'tr-acciones' }, [bcam, A.boton('Leer imagen…', function () { arch.click(); }, 'tr-chico'), arch])]));
      /* service worker */
      var aj = D.ajustes(), swEst = h('p', { id: 'au-sw-est', cls: 'tr-ayuda', txt: 'Comprobando…' });
      raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Segundo plano (Service Worker)' }), swEst,
        ayuda('Si lo activas, los flujos marcados «ejecutar en segundo plano» y con acciones HTTP, notificación, almacén o lógica pueden correr cuando el navegador despierte el Service Worker (sincronización periódica). Las claves necesarias se copian a un almacén local de este dispositivo para que el worker las lea (nunca a tu cuenta). Voz, sonido, portapapeles, QR, enlaces y dispositivos no funcionan en segundo plano.'),
        h('div', { cls: 'tr-acciones' }, [A.boton(aj.fondo ? 'Desactivar segundo plano' : 'Activar segundo plano', async function () { var a = D.ajustes(); a.fondo = !a.fondo; D.guardarAjustes(a); if (a.fondo) await Vs.registrarSW(true); else await Vs.quitarSW(); pintar(); }, 'tr-chico', { id: 'au-sw-btn' })])]));
      Vs.estadoSW().then(function (t) { swEst.textContent = t; });
      /* github actions */
      await pintarNube(); if (enfoque && el(enfoque)) el(enfoque).focus();
    }
    function TDlist() { return g.TrabajosDispositivos ? g.TrabajosDispositivos.listar() : []; }
    async function pintarNube() {
      var fl = await D.flujos(), p = h('div', { cls: 'tr-panel', id: 'au-nube' });
      p.appendChild(h('h2', { txt: 'Correr en la nube con GitHub Actions' }));
      p.appendChild(ayuda('Genera un workflow (.yml) y un ejecutor Node de este flujo para que GitHub lo corra programado, con tus claves como secretos del repositorio (Settings › Secrets and variables › Actions). Funcionan HTTP, notificación (a un webhook que tú elijas), almacén (solo log), IA, JavaScript y toda la lógica; voz, sonido, QR, portapapeles, enlaces y dispositivos se omiten. GitHub usa hora UTC, mínimo 5 minutos y puede retrasarse.'));
      if (!fl.length) { p.appendChild(h('div', { cls: 'tr-vacio', txt: 'Crea un flujo para generar su workflow.' })); raiz.appendChild(p); return; }
      if (!flujoSel || !fl.some(function (f) { return f.id === flujoSel; })) flujoSel = (E.flujo && E.flujo.id) || fl[0].id;
      var sel = h('select', { id: 'au-nube-flujo', 'aria-label': 'Flujo' }, fl.map(function (f) { return h('option', { value: f.id, txt: f.nombre, selected: f.id === flujoSel }); })), noti = h('input', { type: 'checkbox', id: 'au-nube-noti' }), ta = h('textarea', { id: 'au-nube-yml', rows: 14, readonly: true, spellcheck: 'false', 'aria-label': 'Workflow generado', cls: 'au-codigo' }), notas = h('div'), info = h('div');
      async function generar() {
        flujoSel = sel.value; var f = fl.filter(function (x) { return x.id === flujoSel; })[0]; if (E.flujo && E.flujo.id === f.id) f = E.flujo;
        var o = { offsetMin: new Date().getTimezoneOffset(), notificar: noti.checked, dominios: D.ajustes().dominios }; ta.value = N.yaml(f, o);
        var c = N.cronNube(f, o), s = N.secretos(f); notas.textContent = ''; c.notas.forEach(function (n) { notas.appendChild(h('div', { cls: 'tr-nota tr-av', txt: n })); });
        info.textContent = ''; info.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Secretos a crear en el repo: ' + (s.concat(noti.checked ? ['NOTIFY_WEBHOOK'] : []).join(', ') || 'ninguno') + '. Dominios incluidos en la lista del flujo: ' + (o.dominios.join(', ') || 'ninguno (añade los que use en Seguridad)') + '.' }));
        return { f: f, o: o };
      }
      sel.addEventListener('change', generar); noti.addEventListener('change', generar);
      p.appendChild(h('label', { for: 'au-nube-flujo', txt: 'Flujo' })); p.appendChild(sel); p.appendChild(h('label', { cls: 'tr-chk', for: 'au-nube-noti' }, [noti, 'Enviar notificaciones a un webhook (secreto NOTIFY_WEBHOOK: ntfy, Discord, Slack…)'])); p.appendChild(notas); p.appendChild(ta); p.appendChild(info);
      p.appendChild(h('div', { cls: 'tr-acciones' }, [A.boton('Copiar YAML', async function () { try { await navigator.clipboard.writeText(ta.value); A.aviso('YAML copiado.'); } catch (e) { ta.select(); A.aviso('Selecciona y copia manualmente.', 'error'); } }, 'tr-chico', { id: 'au-nube-copiar' }),
        A.boton('Descargar paquete (.zip)', async function () {
          var r = await generar(); try { var mt = await fetch('js/motor.js').then(function (x) { return x.text(); }), ct = await fetch('js/catalogo.js').then(function (x) { return x.text(); }); } catch (e) { return A.aviso('No se pudieron leer los módulos del motor.', 'error'); }
          var arch = N.paquete(r.f, Object.assign(r.o, { motorTexto: mt, catalogoTexto: ct })).map(function (a) { return { nombre: a.nombre, datos: T.bytes(a.texto) }; }); T.descargar(T.zip(arch), 'auto-' + N.slug(r.f.nombre) + '.zip'); A.aviso('Descomprime el ZIP en la raíz de tu repositorio (crea la carpeta .github).');
        }, 'tr-chico tr-pri', { id: 'au-nube-zip' })]));
      p.appendChild(h('details', { cls: 'qr-det' }, [h('summary', { txt: 'Pasos para activarlo' }), h('ol', { cls: 'au-pasos-n' }, ['Descarga el ZIP y descomprímelo en la raíz de tu repo (carpeta .github/).', 'Crea los secretos indicados en Settings › Secrets and variables › Actions.', 'Haz commit y push; en la pestaña Actions puedes lanzarlo a mano («Run workflow») para probarlo.', 'El flujo del repo usa solo lo que declaraste en la lista de dominios permitidos.'].map(function (t) { return h('li', { txt: t }); }))]));
      raiz.appendChild(p); generar();
    }
    A.on('nube', function (f) { flujoSel = f.id; setTimeout(pintar, 50); }); A.on('disparadores', function () { if (!raiz.hidden) pintar(); }); Vs.pintarFondo = pintar; pintar();
  };

  /* service worker */
  Vs.estadoSW = async function () {
    if (!('serviceWorker' in navigator)) return 'Este navegador no tiene Service Worker: solo funcionará con la página abierta.';
    var reg = await navigator.serviceWorker.getRegistration('./'); var ps = reg && reg.periodicSync ? 'sincronización periódica disponible' : 'sin sincronización periódica (solo Chrome/Edge con app instalada)';
    return reg ? 'Service Worker registrado · ' + ps + '.' : 'Service Worker no registrado · ' + ps + '.';
  };
  Vs.registrarSW = async function (avisar) {
    if (!('serviceWorker' in navigator)) { if (avisar) A.aviso('Este navegador no admite Service Worker.', 'error'); return false; }
    try {
      var reg = await navigator.serviceWorker.register('sw.js', { scope: './' }); await D.espejoSW(); var msg = 'Service Worker registrado.';
      if (reg.periodicSync) { try { var st = await navigator.permissions.query({ name: 'periodic-background-sync' }); if (st.state === 'granted') { await reg.periodicSync.register('auto-tick', { minInterval: 12 * 3600 * 1000 }); msg += ' Sincronización periódica activada (el navegador decide cuándo).'; } else msg += ' El navegador no concede sincronización periódica (instala la app o sube su engagement).'; } catch (e) { msg += ' Sin sincronización periódica: ' + e.message; } } else msg += ' Este navegador no tiene sincronización periódica.';
      if (avisar) A.aviso(msg); return true;
    } catch (e) { if (avisar) A.aviso('No se pudo registrar el Service Worker: ' + e.message, 'error'); return false; }
  };
  Vs.quitarSW = async function () { try { var reg = await navigator.serviceWorker.getRegistration('./'); if (reg) { if (reg.periodicSync) try { await reg.periodicSync.unregister('auto-tick'); } catch (e) {} await reg.unregister(); } await D.espejoSW(); } catch (e) {} };
})(window);
