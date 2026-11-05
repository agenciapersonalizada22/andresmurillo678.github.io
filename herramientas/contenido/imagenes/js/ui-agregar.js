/* Panel izquierdo: plantillas, elementos (texto, formas, iconos, stickers, emoji), imagenes/fondos, QR, logos, tamanos. */
(function (IM) {
  var h = IM.h, E = IM.E, UI = IM.UI, Doc = IM.Doc, R = IM.Render, Pl = IM.Plantillas, A = IM.UIAgregar = {};
  var estado = { cat: 'todas', pal: IM.Almacen.lsGet('paleta', 0), marca: 'Mi Marca', lema: 'SLOGAN AQUÍ' }, miniaturas = {}, io = null, qr = { texto: 'https://', ecc: 'M', fg: '#000000', bg: '#ffffff', borde: 2 };
  function miniatura(tpl, pal, img) {
    var key = tpl.id + '|' + estado.pal + '|' + (tpl.cat === 'logo' ? estado.marca + estado.lema : '');
    if (miniaturas[key]) { img.src = miniaturas[key]; return; }
    try {
      var pg = Pl.construir(tpl, pal, { nombre: estado.marca, lema: estado.lema })[0], cv = R.aCanvas(pg, Math.min(1, 220 / Math.max(pg.w, pg.h)), { blanco: true });
      miniaturas[key] = cv.toDataURL('image/jpeg', 0.75); img.src = miniaturas[key];
    } catch (e) { img.alt = 'No se pudo generar la vista previa'; console.error(e); }
  }
  function tarjetaPlantilla(tpl, pal) {
    var img = h('img', { alt: tpl.nombre, width: 110, height: 110, loading: 'lazy', class: 'tpl-img', style: { aspectRatio: tpl.w + ' / ' + tpl.h } });
    var b = h('button', { type: 'button', class: 'tpl', title: tpl.nombre + ' · ' + tpl.w + '×' + tpl.h, onclick: function () {
      Pl.aplicar(tpl, pal, { nombre: estado.marca, lema: estado.lema }); IM.aviso('Plantilla «' + tpl.nombre + '» aplicada · Ctrl+Z para deshacer'); if (UI.esMovil()) UI.cerrarHojas();
    } }, img, h('span', null, tpl.nombre));
    b._cargar = function () { miniatura(tpl, pal, img); };
    return b;
  }
  function plantillas(cont) {
    var pal = Pl.paletas[estado.pal] || Pl.paletas[0], rej = h('div', { class: 'tpl-rejilla' });
    var sw = h('div', { class: 'paletas', role: 'radiogroup', 'aria-label': 'Paleta de colores de plantillas' });
    Pl.paletas.forEach(function (p, i) {
      sw.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': i === estado.pal ? 'true' : 'false', class: 'pal', title: p.nombre, 'aria-label': 'Paleta ' + p.nombre, onclick: function () { estado.pal = i; IM.Almacen.lsSet('paleta', i); A.refrescar(); } },
        [p.bg, p.a, p.b, p.c].map(function (c) { return h('i', { style: { background: c } }); })));
    });
    cont.appendChild(h('div', { class: 'rotulo' }, 'Paleta: ' + pal.nombre)); cont.appendChild(sw);
    var cats = [['todas', 'Todas (47)']].concat(Object.keys(Pl.categorias).map(function (k) { return [k, Pl.categorias[k]]; }));
    cont.appendChild(UI.sel('Categoría', cats, estado.cat, function (v) { estado.cat = v; A.refrescar(); }));
    if (estado.cat === 'todas' || estado.cat === 'logo') cont.appendChild(h('div', { class: 'sub' }, UI.txt('Nombre del logo', estado.marca, function (v) { estado.marca = v || 'Marca'; clearTimeout(A._t); A._t = setTimeout(function () { miniaturas = {}; refrescarLogos(rej); }, 400); }), UI.txt('Lema', estado.lema, function (v) { estado.lema = v; clearTimeout(A._t); A._t = setTimeout(function () { miniaturas = {}; refrescarLogos(rej); }, 400); })));
    var lista = Pl.lista.filter(function (t) { return estado.cat === 'todas' || t.cat === estado.cat; }), cat = null;
    lista.forEach(function (t) {
      if (estado.cat === 'todas' && t.cat !== cat) { cat = t.cat; rej.appendChild(h('h3', { class: 'cat-titulo' }, Pl.categorias[t.cat])); }
      rej.appendChild(tarjetaPlantilla(t, pal));
    });
    cont.appendChild(rej);
    if (io) io.disconnect();
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && e.target._cargar) { io.unobserve(e.target); setTimeout(e.target._cargar, 0); } }); }, { root: cont, rootMargin: '200px' });
    Array.prototype.forEach.call(rej.querySelectorAll('.tpl'), function (b) { io.observe(b); });
  }
  function refrescarLogos(rej) { Array.prototype.forEach.call(rej.querySelectorAll('.tpl'), function (b) { if (/logo|Logo|Iniciales|Monograma|Emblema|Insignia|lineal|Estrella creativa/.test(b.title)) b._cargar && b._cargar(); }); }
  /* ---- elementos ---- */
  function anadirTexto(o, nombre) { var p = E.pagina(); var t = Doc.capa('texto', Object.assign({ color: E.color, w: p.w * 0.7, nombre: nombre }, o)); t.tam = Math.round(p.w * (o.k || 0.06)); delete t.k; E.agregar(t, { nombre: 'Añadir ' + nombre.toLowerCase() }); }
  function anadirForma(f, extra) {
    var p = E.pagina(), d = Math.round(Math.min(p.w, p.h) * 0.3), c = Doc.capa('forma', Object.assign({ forma: f, w: d, h: f === 'burbuja' ? d * 0.75 : f === 'flecha' ? d * 0.6 : d, relleno: { tipo: 'solido', c1: E.color }, nombre: f }, extra || {}));
    if (f === 'linea') { c.relleno = null; c.trazo = { color: E.color, ancho: 8 }; c.h = 8; c.w = d * 1.5; } if (f === 'burbuja') { c.relleno.c1 = '#ffffff'; c.trazo = { color: '#111111', ancho: 4 }; }
    c.nombre = ({ rect: 'Rectángulo', elipse: 'Elipse', poligono: 'Polígono', estrella: 'Estrella', flecha: 'Flecha', burbuja: 'Burbuja', linea: 'Línea', icono: 'Icono' })[f] || f; E.agregar(c); return c;
  }
  function formaIcono(f) {
    var s = '<svg viewBox="-12 -12 24 24" width="30" height="30" fill="currentColor" stroke="currentColor">';
    var c = { rect: '<rect x="-9" y="-7" width="18" height="14" rx="2" stroke="none"/>', elipse: '<ellipse rx="10" ry="8" stroke="none"/>', poligono: '<path stroke="none" d="' + R.dForma({ forma: 'poligono', lados: 6, w: 20, h: 20 }) + '"/>', estrella: '<path stroke="none" d="' + R.dForma({ forma: 'estrella', puntas: 5, interior: 0.45, w: 22, h: 22 }) + '"/>', flecha: '<path stroke="none" d="' + R.dForma({ forma: 'flecha', w: 22, h: 14 }) + '"/>', burbuja: '<path stroke="none" d="' + R.dForma({ forma: 'burbuja', w: 22, h: 20, radio: 4, cola: -0.5 }) + '"/>', linea: '<path fill="none" stroke-width="2" stroke-linecap="round" d="M-10 6L10 -6"/>' }[f];
    return h('span', { html: s + c + '</svg>' });
  }
  function elementos(cont) {
    cont.appendChild(UI.seccion('Texto', [h('div', { class: 'col-botones' },
      h('button', { type: 'button', class: 'btn txt-t', onclick: function () { anadirTexto({ texto: 'Añade un título', fuente: Pl.fuentes.IMP, peso: 900, k: 0.1 }, 'Título'); } }, 'Añade un título'),
      h('button', { type: 'button', class: 'btn txt-s', onclick: function () { anadirTexto({ texto: 'Añade un subtítulo', fuente: Pl.fuentes.TRE, peso: 700, k: 0.055 }, 'Subtítulo'); } }, 'Añade un subtítulo'),
      h('button', { type: 'button', class: 'btn txt-c', onclick: function () { anadirTexto({ texto: 'Añade un poco de texto para el cuerpo.', fuente: Pl.fuentes.ARI, peso: 400, k: 0.035, alin: 'left' }, 'Cuerpo'); } }, 'Texto de cuerpo'),
      h('button', { type: 'button', class: 'btn', onclick: function () { anadirTexto({ texto: 'TEXTO CURVADO', fuente: Pl.fuentes.IMP, k: 0.08, curva: 60, trazo: 'arco' }, 'Texto curvado'); } }, 'Texto curvado'),
      h('button', { type: 'button', class: 'btn', onclick: function () { Pl.memeTexto(); } }, 'Texto de meme (arriba y abajo)')),
      h('div', { class: 'rotulo' }, 'Combinaciones de fuentes'), h('div', { class: 'combos' }, Pl.combinaciones.map(function (cb) {
        return h('button', { type: 'button', class: 'combo', title: 'Añadir título y cuerpo: ' + cb[0], onclick: function () { var p = E.pagina(); var a = Doc.capa('texto', { texto: 'Título', fuente: cb[1], peso: 800, tam: Math.round(p.w * 0.08), color: E.color, w: p.w * 0.7, nombre: 'Título' }), b = Doc.capa('texto', { texto: 'Un texto de apoyo para acompañar el título.', fuente: cb[2], peso: 400, tam: Math.round(p.w * 0.035), color: E.color, w: p.w * 0.7, nombre: 'Cuerpo' }); R.ajustarTexto(a); R.ajustarTexto(b); a.x = b.x = p.w / 2; a.y = p.h / 2 - b.h; b.y = a.y + a.h / 2 + b.h / 2 + 10; E.agregar(a, { centrar: false }); E.agregar(b, { centrar: false }); } },
          h('b', { style: { fontFamily: cb[1] } }, 'Aa'), h('i', { style: { fontFamily: cb[2] } }, 'Aa'), h('span', null, cb[0]));
      }))]));
    var fr = h('div', { class: 'rejilla-iconos' });
    ['rect', 'elipse', 'poligono', 'estrella', 'flecha', 'burbuja', 'linea'].forEach(function (f) { fr.appendChild(h('button', { type: 'button', class: 'ib', title: f, 'aria-label': 'Forma ' + f, onclick: function () { anadirForma(f); } }, formaIcono(f))); });
    cont.appendChild(UI.seccion('Formas y líneas', [fr, h('p', { class: 'ayuda' }, 'O usa la herramienta Formas (U) y arrastra en el lienzo.')]));
    var busca = h('input', { type: 'search', placeholder: 'Buscar icono…', 'aria-label': 'Buscar icono' }), ri = h('div', { class: 'rejilla-iconos' });
    function pintarIconos() { ri.textContent = ''; var q = busca.value.trim().toLowerCase(); IM.Iconos.lista.filter(function (i) { return !q || i[1].toLowerCase().indexOf(q) >= 0 || i[0].indexOf(q) >= 0; }).forEach(function (i) { ri.appendChild(h('button', { type: 'button', class: 'ib', title: i[1], 'aria-label': 'Icono ' + i[1], onclick: function () { anadirForma('icono', { icono: i[0], w: 160, h: 160, nombre: i[1] }); } }, h('span', { html: '<svg viewBox="0 0 24 24" width="28" height="28"><path fill-rule="evenodd" fill="currentColor" d="' + i[2] + '"/></svg>' }))); }); }
    busca.addEventListener('input', pintarIconos); pintarIconos();
    cont.appendChild(UI.seccion('Iconos vectoriales (' + IM.Iconos.lista.length + ')', [busca, ri]));
    var rs = h('div', { class: 'rejilla-stickers' });
    Pl.stickers.forEach(function (s) {
      var g = s[1](), pg = Doc.pagina(g.w + 20, g.h + 20, null); g.x = pg.w / 2; g.y = pg.h / 2; pg.capas = [g];
      var cv = R.aCanvas(pg, Math.min(1, 80 / Math.max(pg.w, pg.h)), {}); cv.setAttribute('aria-hidden', 'true');
      rs.appendChild(h('button', { type: 'button', class: 'sticker', title: s[0], 'aria-label': 'Sticker ' + s[0], onclick: function () { var q = s[1](); var p = E.pagina(), k = Math.min(1.4, p.w * 0.3 / q.w); q.hijos.forEach(function (x) { Doc.escalar(x, k, 0, 0); }); q.w *= k; q.h *= k; E.agregar(q, { nombre: 'Añadir sticker ' + s[0] }); } }, cv));
    });
    cont.appendChild(UI.seccion('Stickers vectoriales', [rs], false));
    cont.appendChild(UI.seccion('Emoji', [h('div', { class: 'rejilla-iconos' }, IM.Iconos.emojis.map(function (e) { return h('button', { type: 'button', class: 'ib emoji', 'aria-label': 'Emoji ' + e, onclick: function () { var p = E.pagina(); E.agregar(Doc.capa('texto', { texto: e, tam: Math.round(p.w * 0.15), w: p.w * 0.3, fuente: 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif', nombre: 'Emoji', color: '#000000' }), { nombre: 'Añadir emoji' }); } }, e); }))], false));
  }
  /* ---- imagenes y fondos ---- */
  var FONDOS = [['#ffffff', null], ['#111827', null], ['#4f46e5', '#ec4899'], ['#06b6d4', '#3b82f6'], ['#f97316', '#facc15'], ['#10b981', '#14b8a6'], ['#f43f5e', '#fb923c'], ['#7c3aed', '#2563eb'], ['#0f172a', '#334155'], ['#fde68a', '#fca5a5'], ['#a7f3d0', '#93c5fd'], ['#fbcfe8', '#c4b5fd']];
  function imagenes(cont) {
    cont.appendChild(h('div', { class: 'zona-subir' }, h('p', null, 'Arrastra imágenes al lienzo, pega con Ctrl+V o elige archivos.'), h('div', { class: 'botonera' }, UI.btn('Subir imágenes', 'imagen', UI.abrirArchivos, { clase: 'primario' }), UI.btn('Cámara', 'camara', UI.abrirCamara, { titulo: 'Hacer una foto (móvil)' }))));
    var fr = h('div', { class: 'rejilla-fondos' });
    FONDOS.forEach(function (f) {
      var fondo = f[1] ? { tipo: 'degradado', c1: f[0], c2: f[1], ang: 135 } : { tipo: 'solido', c1: f[0] };
      fr.appendChild(h('button', { type: 'button', class: 'fondo', title: 'Fondo ' + f[0] + (f[1] ? ' → ' + f[1] : ''), 'aria-label': 'Fondo ' + f[0], style: { background: f[1] ? 'linear-gradient(135deg,' + f[0] + ',' + f[1] + ')' : f[0] }, onclick: function () { E.pagina().fondo = JSON.parse(JSON.stringify(fondo)); E.cambio('Cambiar fondo'); } }));
    });
    fr.appendChild(h('button', { type: 'button', class: 'fondo transp', title: 'Fondo transparente', 'aria-label': 'Fondo transparente', onclick: function () { E.pagina().fondo = null; E.cambio('Fondo transparente'); } }, '∅'));
    cont.appendChild(UI.seccion('Fondo de la página', [fr]));
    var sel = E.unaSel();
    cont.appendChild(UI.seccion('Memes e ilustración', [h('div', { class: 'botonera' }, UI.btn('Texto de meme', null, function () { Pl.memeTexto(); }), sel && sel.tipo === 'imagen' ? UI.btn('Ajustar lienzo a la imagen', null, function () { var s = Doc.Pix.get(sel.px), k = Math.min(1, 2048 / Math.max(s.width, s.height)); E.cambioDoc('Lienzo a la medida de la imagen', function () { var p = E.pagina(); p.w = Math.round(s.width * k); p.h = Math.round(s.height * k); sel.w = p.w; sel.h = p.h; sel.x = p.w / 2; sel.y = p.h / 2; sel.rot = 0; }); E.emit('ajustar'); }) : null)]));
  }
  /* ---- QR ---- */
  function generarQR() { return window.QR.codificar(qr.texto, qr.ecc); }
  function herramientas(cont) {
    var prev = h('canvas', { width: 180, height: 180, class: 'qr-prev', role: 'img', 'aria-label': 'Vista previa del código QR' }), info = h('p', { class: 'ayuda' });
    function pinta() {
      var x = prev.getContext('2d'); x.fillStyle = qr.bg; x.fillRect(0, 0, 180, 180);
      try {
        var q = generarQR(), n = q.size + qr.borde * 2, k = 180 / n; x.fillStyle = qr.fg;
        q.modulos.forEach(function (f, y) { f.forEach(function (b, xx) { if (b) x.fillRect(Math.floor((xx + qr.borde) * k), Math.floor((y + qr.borde) * k), Math.ceil(k), Math.ceil(k)); }); });
        info.textContent = 'Versión ' + q.version + ' · ' + q.size + '×' + q.size + ' módulos · máscara ' + q.mascara; info.className = 'ayuda';
      } catch (e) { info.textContent = e.message; info.className = 'ayuda error'; }
    }
    function anadir() {
      try {
        var q = generarQR(), p = E.pagina(), d = Math.round(Math.min(p.w, p.h) * 0.35), c = Doc.capa('qr', { texto: qr.texto, ecc: qr.ecc, fg: qr.fg, bg: qr.bg, borde: qr.borde, m: q.modulos.map(function (f) { return f.map(function (b) { return b ? '1' : '0'; }).join(''); }), w: d, h: d, nombre: 'QR ' + qr.texto.slice(0, 20) });
        E.agregar(c, { nombre: 'Añadir código QR' });
      } catch (e) { IM.aviso(e.message, 'error'); }
    }
    cont.appendChild(UI.seccion('Generador de QR', [UI.txt('Texto o enlace', qr.texto, function (v) { qr.texto = v; pinta(); }, { multi: true }), UI.sel('Corrección de errores', [['L', 'L · 7%'], ['M', 'M · 15%'], ['Q', 'Q · 25%'], ['H', 'H · 30%']], qr.ecc, function (v) { qr.ecc = v; pinta(); }),
      UI.color('Color del código', qr.fg, function (v) { qr.fg = v; pinta(); }), UI.color('Color de fondo', qr.bg, function (v) { qr.bg = v; pinta(); }), UI.rango('Margen', 0, 8, 1, qr.borde, function (v) { qr.borde = v; pinta(); }), prev, info,
      h('div', { class: 'botonera' }, UI.btn('Añadir al diseño', 'qr', anadir, { clase: 'primario' }), UI.btn('Descargar SVG', 'exportar', function () { try { IM.descargar(new Blob([window.QR.aSvg(generarQR(), qr.borde, qr.fg, qr.bg)], { type: 'image/svg+xml' }), 'qr.svg'); } catch (e) { IM.aviso(e.message, 'error'); } })),
      h('p', { class: 'ayuda' }, 'Mantén buen contraste (código oscuro sobre fondo claro) y prueba el QR con tu móvil antes de publicar.')]));
    pinta();
    var ls = window.Redes.lista;
    cont.appendChild(UI.seccion('Tamaños de redes sociales', [h('p', { class: 'ayuda' }, 'Cambia el lienzo (escalando el contenido) o empieza un proyecto nuevo. Las zonas seguras se muestran en el lienzo.'),
      h('div', { class: 'redes' }, ls.filter(function (r) { return r.id !== 'libre'; }).map(function (r) {
        return h('div', { class: 'red' }, h('span', null, r.nombre, h('small', null, ' ' + r.w + '×' + r.h)), h('span', { class: 'botonera' },
          UI.btn('Aplicar', null, function () { E.redimensionarLienzo(r.w, r.h, true); if (r.seguro) { E.proy.ajustes.seguro = r.id; IM.Vista.pedirOv(); } }, { titulo: 'Cambiar el lienzo a ' + r.nombre }),
          UI.btn('Nuevo', 'mas', function () { IM.Proy.nuevo(r.w, r.h, r.nombre).then(function () { if (r.seguro) { E.proy.ajustes.seguro = r.id; } }); }, { titulo: 'Proyecto nuevo ' + r.nombre })));
      }))], false));
    cont.appendChild(UI.seccion('Insertar logo en el diseño', [UI.txt('Nombre', estado.marca, function (v) { estado.marca = v || 'Marca'; }), UI.txt('Lema', estado.lema, function (v) { estado.lema = v; }),
      h('div', { class: 'botonera' }, Pl.lista.filter(function (t) { return t.cat === 'logo'; }).map(function (t) { return UI.btn(t.nombre, null, function () { insertarLogo(t); }); }))], false));
  }
  function insertarLogo(t) {
    var pal = Pl.paletas[estado.pal] || Pl.paletas[0], pg = Pl.construir(t, pal, { nombre: estado.marca, lema: estado.lema })[0], p = E.pagina(), k = Math.min(p.w, p.h) * 0.5 / t.w;
    var hijos = pg.capas.map(function (c) { c.x -= t.w / 2; c.y -= t.h / 2; Doc.escalar(c, k, 0, 0); return c; });
    if (pg.fondo && pg.fondo.tipo === 'solido') hijos.unshift(Doc.rect(-t.w * k / 2, -t.h * k / 2, t.w * k, t.h * k, pg.fondo.c1, { nombre: 'Fondo del logo' })); else if (pg.fondo) hijos.unshift(Doc.rect(-t.w * k / 2, -t.h * k / 2, t.w * k, t.h * k, pg.fondo, { nombre: 'Fondo del logo' }));
    E.agregar(Doc.capa('grupo', { nombre: 'Logo ' + estado.marca, hijos: hijos, w: t.w * k, h: t.h * k }), { nombre: 'Insertar logo' });
  }
  A.pestanas = [{ id: 'plantillas', nombre: 'Plantillas', render: plantillas }, { id: 'elementos', nombre: 'Elementos', render: elementos }, { id: 'imagenes', nombre: 'Imágenes', render: imagenes }, { id: 'mas', nombre: 'QR y más', render: herramientas }];
  A.refrescar = function () { UI.tabsIzq && UI.tabsIzq.refrescar(); };
})(window.IM);
