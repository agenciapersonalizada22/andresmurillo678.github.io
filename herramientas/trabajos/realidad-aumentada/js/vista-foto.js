/* Pestana Foto: edicion de una foto con capas, perspectiva por 4 puntos / malla 3x3, sombras, mezcla, marcador para medir y exportar PNG. window.RA.VFoto */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, RA = g.RA, A = RA.App, O = RA.Ov, G = RA.Geo, P = RA.Panel, V = RA.VFoto = {};
  var el = {}, L, st = { Hm: null, rostro: null, marcador: null }, lista, insp;
  function ejemplo(tipo) {
    var c = document.createElement('canvas'), W = c.width = 1000, H = c.height = 700, x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9ec5fe'); gr.addColorStop(0.62, '#dbe4f0'); gr.addColorStop(0.62, '#8f9aa8'); gr.addColorStop(1, '#6b7685'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    if (tipo === 'carro') {
      x.fillStyle = '#c92a2a'; x.beginPath(); x.moveTo(110, 470); x.lineTo(150, 380); x.quadraticCurveTo(190, 330, 330, 322); x.lineTo(610, 322); x.quadraticCurveTo(720, 330, 790, 400); x.lineTo(900, 430); x.quadraticCurveTo(920, 470, 900, 500); x.lineTo(110, 500); x.closePath(); x.fill();
      x.fillStyle = '#a5d8ff'; x.beginPath(); x.moveTo(220, 380); x.lineTo(270, 336); x.lineTo(440, 336); x.lineTo(440, 380); x.closePath(); x.fill(); x.beginPath(); x.moveTo(470, 380); x.lineTo(470, 336); x.lineTo(610, 338); x.lineTo(690, 380); x.closePath(); x.fill();
      [[270, 505], [740, 505]].forEach(function (p) { x.fillStyle = '#16181d'; x.beginPath(); x.arc(p[0], p[1], 62, 0, 7); x.fill(); x.fillStyle = '#adb5bd'; x.beginPath(); x.arc(p[0], p[1], 34, 0, 7); x.fill(); });
      x.fillStyle = '#0006'; x.beginPath(); x.ellipse(510, 575, 420, 22, 0, 0, 7); x.fill();
    } else {
      x.fillStyle = '#0003'; x.beginPath(); x.ellipse(500, 690, 220, 26, 0, 0, 7); x.fill();
      x.fillStyle = '#f1c27d'; x.beginPath(); x.ellipse(500, 270, 105, 130, 0, 0, 7); x.fill(); x.fillStyle = '#3b2a20'; x.beginPath(); x.ellipse(500, 175, 112, 70, 0, Math.PI, 0); x.fill();
      x.fillStyle = '#111'; x.beginPath(); x.arc(458, 262, 9, 0, 7); x.arc(542, 262, 9, 0, 7); x.fill(); x.strokeStyle = '#8b4a3a'; x.lineWidth = 6; x.beginPath(); x.arc(500, 322, 34, 0.2, Math.PI - 0.2); x.stroke();
      x.fillStyle = '#1971c2'; x.beginPath(); x.moveTo(300, 700); x.quadraticCurveTo(310, 470, 400, 420); x.lineTo(600, 420); x.quadraticCurveTo(690, 470, 700, 700); x.closePath(); x.fill();
    }
    return c;
  }
  V.abrirCanvas = function (c, nombre) {
    var k = Math.min(1, 1800 / Math.max(c.width, c.height)), b = document.createElement('canvas'); b.width = Math.round(c.width * k); b.height = Math.round(c.height * k); b.getContext('2d').drawImage(c, 0, 0, b.width, b.height);
    A.foto.base = b; A.foto.nombre = nombre || 'foto'; el.cv.width = b.width; el.cv.height = b.height; st.Hm = null; st.rostro = null; st.marcador = null; L.limpiarMedidas(); L.dibujar(); el.vacio.hidden = true; estado();
  };
  function estado() { el.estado.textContent = A.foto.base ? A.foto.base.width + '×' + A.foto.base.height + ' px' + (st.marcador ? ' · marcador #' + st.marcador.id + ' detectado' : '') + (st.rostro ? ' · rostro' : '') : 'Sin foto'; }
  function info() { return { W: el.cv.width, H: el.cv.height, Hm: st.Hm, rostro: st.rostro }; }
  function detectarMarcador() {
    var b = A.foto.base; if (!b) { T.aviso('Abre una foto primero.', 'error'); return; }
    var d = b.getContext('2d').getImageData(0, 0, b.width, b.height), gris = RA.Marcadores.aGris(d.data, b.width, b.height), r = RA.Marcadores.detectar(gris, b.width, b.height, { maxLado: 640 }), pr = r.filter(function (m) { return !A.aj.marcador || true; }).sort(function (a, c) { return c.lado - a.lado; })[0];
    if (!pr) { st.Hm = null; st.marcador = null; T.aviso('No encontré un marcador en la foto. Debe verse entero, con borde blanco y sin reflejos.', 'error'); estado(); L.dibujar(); return; }
    st.marcador = pr; st.Hm = G.homMarcador(pr.esquinas); estado(); L.dibujar(); T.aviso('Marcador #' + pr.id + ' detectado. Ya puedes medir y pegar capas al marcador.'); A.logro('ra_marcador_en_foto');
  }
  async function detectarRostro() {
    if (!RA.Cara.disponible()) { T.aviso('Este navegador no tiene FaceDetector. Coloca las capas a mano con las anclas.', 'error'); return; }
    var r = await RA.Cara.detectar(A.foto.base); if (!r || !r.length) { T.aviso('No encontré rostros.', 'error'); return; } st.rostro = r[0]; estado(); L.dibujar(); T.aviso('Rostro detectado.');
  }
  function anclar(ov, a) {
    if (a === ov.ancla) return; var inf = info();
    if (a === 'marcador') { if (!st.Hm) { T.aviso('Detecta un marcador en la foto primero.', 'error'); return; } O.aMarcador(ov, inf); }
    else if (a === 'rostro') { if (!st.rostro) { T.aviso('Detecta un rostro primero.', 'error'); return; } var q = ov.q, f = st.rostro; ov.r = { x: (q[0][0] * inf.W - f.x) / f.w, y: (q[0][1] * inf.H - f.y) / f.h, w: (q[1][0] - q[0][0]) * inf.W / f.w, h: (q[3][1] - q[0][1]) * inf.H / f.h }; ov.ancla = 'rostro'; }
    else { var pts = O.cuadPx(ov, inf); if (pts) { ov.q = pts.map(function (p) { return [p[0] / inf.W, p[1] / inf.H]; }); } ov.ancla = 'imagen'; }
    L.dibujar(); lista.pintar();
  }
  function anadir(f) {
    var ov, asp = el.cv.width / el.cv.height; if (f.tipo === 'lib') { ov = O.desdeLib(f.clave, null, asp); var it = RA.Biblio.porClave(f.clave); if (it.face && st.rostro) { var fc = st.rostro; ov.ancla = 'rostro'; ov.r = { x: it.face[0], y: it.face[1], w: it.face[2], h: it.face[2] * (it.h / it.w) * (fc.w / fc.h) }; } } else { ov = O.desdePNG(f.ref, f.w, f.h, asp); }
    L.guardarHist(); A.foto.capas.push(ov); L.seleccionar(ov.id); lista.pintar(); insp.pintar(); A.logro('ra_primera_capa'); var c = RA.Biblio.porClave(f.clave || ''); if (c) A.logro('ra_capa_' + c.cat); L.guardarHist();
  }
  function cambio(estructura) { lista.pintar(); if (estructura) insp.pintar(); L.dibujar(); }
  V.iniciar = function (raiz) {
    el.cv = h('canvas', { cls: 'ra-lienzo', tabindex: 0, width: 800, height: 560, 'aria-label': 'Lienzo de la foto. Flechas mueven la capa, Supr la borra, Ctrl+Z deshace.' });
    L = RA.Lienzo(el.cv, { capas: function () { return A.foto.capas; }, info: info, dibujarBase: function (x, inf) { if (A.foto.base) x.drawImage(A.foto.base, 0, 0, inf.W, inf.H); else { x.fillStyle = '#e9ecef'; x.fillRect(0, 0, inf.W, inf.H); } }, alSeleccionar: function () { insp.pintar(); lista.pintar(); }, alCambiar: function (suave) { if (!suave) { lista.pintar(); } }, aviso: function (m) { T.aviso(m, 'error'); } });
    lista = P.listaCapas({ capas: function () { return A.foto.capas; }, sel: function () { return L.sel; }, elegir: function (id) { L.seleccionar(id); } });
    insp = P.inspector({ capa: function () { return L.capa(); }, cambio: cambio, marcador: true, rostro: true, anclar: anclar,
      borrar: function () { var ov = L.capa(); if (!ov) return; L.guardarHist(); A.foto.capas.splice(A.foto.capas.indexOf(ov), 1); L.sel = null; lista.pintar(); insp.pintar(); L.dibujar(); L.guardarHist(); },
      dup: function () { var ov = L.capa(); if (!ov) return; var c = JSON.parse(JSON.stringify(ov)); c.id = O.nuevo().id; c.nombre += ' copia'; c.q = c.q.map(function (p) { return [p[0] + 0.03, p[1] + 0.03]; }); A.foto.capas.push(c); L.seleccionar(c.id); lista.pintar(); L.guardarHist(); },
      orden: function (d) { var l = A.foto.capas, ov = L.capa(), i = l.indexOf(ov), j = i + d; if (!ov || j < 0 || j >= l.length) return; l.splice(i, 1); l.splice(j, 0, ov); lista.pintar(); L.dibujar(); L.guardarHist(); } });
    O.alCargar = function () { if (L) L.dibujar(); if (RA.VVivo && RA.VVivo.pedir) RA.VVivo.pedir(); };
    var arch = h('input', { type: 'file', accept: 'image/*', hidden: true, id: 'ra-foto-arch' }), cam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
    function abrir(e) { var f = e.target.files[0]; e.target.value = ''; if (!f) return; A.archivoADataURL(f).then(A.cargarImagen).then(function (im) { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); V.abrirCanvas(c, f.name.replace(/\.[^.]+$/, '')); A.logro('ra_abrio_foto'); }).catch(function (er) { T.aviso(er.message, 'error'); }); }
    arch.addEventListener('change', abrir); cam.addEventListener('change', abrir);
    el.estado = h('span', { cls: 'tr-etiq', 'aria-live': 'polite', txt: 'Sin foto' });
    el.vacio = h('div', { cls: 'ra-vacio-lienzo' }, [h('p', { txt: 'Abre una foto de un carro, una persona o una mesa, o prueba un ejemplo.' }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Ejemplo: carro', on: { click: function () { V.abrirCanvas(ejemplo('carro'), 'ejemplo_carro'); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Ejemplo: persona', on: { click: function () { V.abrirCanvas(ejemplo('persona'), 'ejemplo_persona'); } } })])]);
    var herr = h('div', { cls: 'ra-herr', role: 'group', 'aria-label': 'Herramienta' }, [['editar', 'Editar capas'], ['medir', 'Medir con marcador']].map(function (a) { var b = h('button', { type: 'button', cls: 'tr-btn', 'aria-pressed': a[0] === 'editar', txt: a[1], on: { click: function () { L.herr = a[0]; L.pend = null; Array.prototype.forEach.call(herr.children, function (x) { x.setAttribute('aria-pressed', x === b); }); } } }); return b; }));
    el.bib = P.biblioteca(anadir);
    raiz.appendChild(h('div', { cls: 'ra-barra' }, [
      h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Abrir foto', on: { click: function () { arch.click(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Tomar foto', on: { click: function () { cam.click(); } } }),
      h('button', { type: 'button', cls: 'tr-btn', txt: 'Detectar marcador', on: { click: detectarMarcador } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Detectar rostro', on: { click: detectarRostro } }), el.estado, arch, cam]));
    raiz.appendChild(h('div', { cls: 'ra-escena' }, [h('div', { cls: 'ra-marco' }, [h('div', { cls: 'ra-pantalla' }, [el.cv, el.vacio])]), h('div', { cls: 'ra-lado' }, [
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Añadir capa' }), el.bib]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Capas' }), lista.raiz, herr, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Deshacer', on: { click: function () { L.deshacer(); lista.pintar(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Rehacer', on: { click: function () { L.rehacer(); lista.pintar(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Borrar medidas', on: { click: function () { L.limpiarMedidas(); } } })])]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Propiedades' }), insp.raiz]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Exportar' }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Descargar PNG', on: { click: exportar } })]), h('p', { cls: 'tr-ayuda', txt: 'Se exporta a la resolución de la foto, sin asas ni mediciones. Todo se procesa en este dispositivo.' })])])]));
    L.dibujar();
  };
  async function exportar() {
    if (!A.foto.base) { T.aviso('Abre una foto o un ejemplo primero.', 'error'); return; }
    var c = L.exportar(A.foto.base.width, A.foto.base.height), b = await A.canvasABlob(c, 'image/png'); T.descargar(b, T.nombreArchivo(A.foto.nombre + '_ra') + '.png'); T.aviso('PNG exportado.'); A.logro('ra_exporto_foto');
  }
  V.lienzo = function () { return L; }; V.redibujar = function () { if (L) { L.dibujar(); lista.pintar(); insp.pintar(); } };
})(window);
