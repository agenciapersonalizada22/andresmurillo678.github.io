/* Panel de propiedades segun la seleccion y la herramienta activa. */
(function (IM) {
  var h = IM.h, E = IM.E, UI = IM.UI, R = IM.Render, Doc = IM.Doc, Redes = window.Redes, P = IM.UIProps = {};
  P.FUENTES = [['Arial', 'Arial, Helvetica, sans-serif'], ['Helvetica', 'Helvetica, Arial, sans-serif'], ['Verdana', 'Verdana, Geneva, sans-serif'], ['Tahoma', 'Tahoma, Geneva, sans-serif'], ['Trebuchet MS', '"Trebuchet MS", Helvetica, sans-serif'], ['Georgia', 'Georgia, "Times New Roman", serif'],
    ['Times New Roman', '"Times New Roman", Times, serif'], ['Courier New', '"Courier New", Courier, monospace'], ['Impact', 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif'], ['Comic Sans MS', '"Comic Sans MS", "Comic Sans", cursive'],
    ['Palatino', 'Palatino, "Palatino Linotype", serif'], ['Garamond', 'Garamond, "Times New Roman", serif'], ['Sistema', 'system-ui, -apple-system, "Segoe UI", sans-serif'], ['Serif', 'serif'], ['Sans-serif', 'sans-serif'], ['Monoespaciada', 'monospace']];
  P.locales = [];
  function ap(fn, nombre, clave, retex) {
    E.capasSel().forEach(function (c) { fn(c); if (retex && c.tipo === 'texto') R.ajustarTexto(c); });
    E.cambio(nombre, clave || nombre); E.emit('mod');
  }
  function hexRgba(hex, a) { var c = window.Color.hexARgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function relleno(etq, rel, set, opts) {
    opts = opts || {}; var tipo = rel ? rel.tipo : 'ninguno', cont = h('div', { class: 'sub' });
    function pintar() {
      cont.textContent = ''; if (tipo === 'ninguno') return;
      var r = rel || { tipo: 'solido', c1: '#4f46e5' };
      cont.appendChild(UI.color('Color', r.c1, function (v) { r.c1 = v; set(r, true); }));
      if (tipo !== 'solido') { cont.appendChild(UI.color('Color final', r.c2 || '#ffffff', function (v) { r.c2 = v; set(r, true); })); if (tipo === 'degradado') cont.appendChild(UI.rango('Ángulo', 0, 360, 1, r.ang || 0, function (v) { r.ang = v; set(r, true); })); }
    }
    var opc = [['solido', 'Sólido'], ['degradado', 'Degradado'], ['radial', 'Radial']]; if (opts.nada) opc.unshift(['ninguno', 'Ninguno']);
    var f = h('div', null, UI.sel(etq, opc, tipo, function (v) {
      tipo = v; if (v === 'ninguno') { rel = null; set(null); } else { rel = Object.assign({ c1: (rel && rel.c1) || '#4f46e5', c2: (rel && rel.c2) || '#ec4899', ang: (rel && rel.ang) || 90 }, { tipo: v }); set(rel); } pintar();
    }), cont); pintar(); return f;
  }
  P.relleno = relleno;
  function sombra(cs) {
    var c = cs[0], s = c.sombra, cont = h('div', { class: 'sub' });
    function pintar() {
      cont.textContent = ''; if (!c.sombra) return; var q = c.sombra;
      function fija() { q.color = hexRgba(q.hex || '#000000', q.a == null ? 0.5 : q.a); }
      cont.appendChild(UI.color('Color', q.hex || '#000000', function (v) { q.hex = v; fija(); ap(function (x) { x.sombra = Object.assign({}, q); }, 'Sombra', 'sombra'); }));
      [['Opacidad', 0, 1, 0.05, 'a'], ['Desenfoque', 0, 100, 1, 'blur'], ['Desplazamiento X', -100, 100, 1, 'dx'], ['Desplazamiento Y', -100, 100, 1, 'dy']].forEach(function (d) {
        cont.appendChild(UI.rango(d[0], d[1], d[2], d[3], q[d[4]] == null ? 0.5 : q[d[4]], function (v) { q[d[4]] = v; fija(); ap(function (x) { x.sombra = Object.assign({}, q); }, 'Sombra', 'sombra'); }));
      });
    }
    var f = h('div', null, UI.sw('Sombra', !!s, function (v) { ap(function (x) { x.sombra = v ? { hex: '#000000', a: 0.45, color: 'rgba(0,0,0,0.45)', blur: 18, dx: 0, dy: 8 } : null; }, v ? 'Activar sombra' : 'Quitar sombra'); c = E.capasSel()[0]; pintar(); }), cont);
    pintar(); return f;
  }
  function transform(cs) {
    var c = cs[0], multi = cs.length > 1, caja = multi ? window.Geometria.unir(cs.map(Doc.caja)) : null, out = [];
    if (!multi) {
      out.push(h('div', { class: 'rejilla2' }, UI.num('X', c.x, function (v) { ap(function (q) { q.x = v; }, 'Posición X'); }), UI.num('Y', c.y, function (v) { ap(function (q) { q.y = v; }, 'Posición Y'); }),
        UI.num('Ancho', c.w, function (v) { ap(function (q) { var k = v / q.w; q.w = Math.max(1, v); if (q.tipo === 'imagen' || q.tipo === 'qr') q.h = q.tipo === 'qr' ? q.w : q.h * k; }, 'Ancho', null, true); }, { min: 1 }),
        UI.num('Alto', c.h, function (v) { ap(function (q) { q.h = Math.max(1, v); if (q.tipo === 'qr') q.w = q.h; }, 'Alto'); }, { min: 1 }), UI.num('Rotación °', c.rot, function (v) { ap(function (q) { q.rot = v; }, 'Rotación'); })));
    }
    out.push(h('div', { class: 'botonera' }, UI.btn('', 'voltearH', function () { E.voltear('h'); }, { titulo: 'Voltear horizontal' }), UI.btn('', 'voltearV', function () { E.voltear('v'); }, { titulo: 'Voltear vertical' }),
      UI.btn('', 'arriba', function () { E.ordenar('arriba'); }, { titulo: 'Subir una capa' }), UI.btn('', 'abajo', function () { E.ordenar('abajo'); }, { titulo: 'Bajar una capa' }),
      UI.btn('', 'duplicar', E.duplicarSel, { titulo: 'Duplicar (Ctrl+D)' }), UI.btn('', 'borrar', E.eliminarSel, { titulo: 'Eliminar (Supr)' }),
      UI.btn('', c.bloqueada ? 'candado' : 'abierto', function () { ap(function (q) { q.bloqueada = !q.bloqueada; }, 'Bloqueo'); E.emit('sel'); }, { titulo: 'Bloquear / desbloquear' }),
      multi ? UI.btn('', 'agrupar', E.agrupar, { titulo: 'Agrupar (Ctrl+G)' }) : (c.tipo === 'grupo' ? UI.btn('', 'agrupar', E.desagrupar, { titulo: 'Desagrupar' }) : null)));
    var al = h('div', { class: 'botonera' });
    [['izq', 'Alinear izquierda'], ['cx', 'Centrar horizontal'], ['der', 'Alinear derecha'], ['arr', 'Alinear arriba'], ['cy', 'Centrar vertical'], ['aba', 'Alinear abajo']].forEach(function (a, i) {
      al.appendChild(h('button', { type: 'button', class: 'btn', title: a[1], 'aria-label': a[1], onclick: function () { E.alinearSel(a[0], false); } }, ['⇤', '⇹', '⇥', '⤒', '⇳', '⤓'][i]));
    });
    if (multi) { al.appendChild(UI.btn('', 'alinear', function () { E.distribuirSel('x'); }, { titulo: 'Distribuir horizontal' })); al.appendChild(h('button', { type: 'button', class: 'btn', title: 'Distribuir vertical', 'aria-label': 'Distribuir vertical', onclick: function () { E.distribuirSel('y'); } }, '≡')); }
    out.push(h('div', { class: 'rotulo' }, multi ? 'Alinear respecto a la selección' : 'Alinear a la página'), al);
    if (!multi) out.push(h('div', { class: 'botonera' }, UI.btn('Centrar en página', null, function () { var p = E.pagina(); ap(function (q) { q.x = p.w / 2; q.y = p.h / 2; }, 'Centrar'); })));
    return out;
  }
  function apariencia(cs) {
    var c = cs[0];
    return [UI.rango('Opacidad %', 0, 100, 1, Math.round(c.opacidad * 100), function (v) { ap(function (q) { q.opacidad = v / 100; }, 'Opacidad', 'opacidad'); }),
      UI.sel('Modo de mezcla', window.Mezcla.modos.map(function (m) { return [m[0], m[1]]; }), c.mezcla, function (v) { ap(function (q) { q.mezcla = v; }, 'Modo de mezcla'); }), sombra(cs)];
  }
  function propsTexto(c) {
    var fuentes = P.FUENTES.concat(P.locales.map(function (n) { return [n, '"' + n + '", sans-serif']; }));
    if (!fuentes.some(function (f) { return f[1] === c.fuente; })) fuentes.unshift(['Personalizada', c.fuente]);
    var combos = window.IM.Plantillas.combinaciones;
    var out = [UI.txt('Texto', c.texto, function (v) { ap(function (q) { q.texto = v; }, 'Editar texto', 'texto-' + c.id, true); }, { multi: true }),
      UI.sel('Fuente', fuentes, c.fuente, function (v) { ap(function (q) { q.fuente = v; }, 'Fuente', null, true); }),
      h('div', { class: 'fila' }, h('label', { class: 'et', for: 'comb' }, 'Combinación'), h('select', { id: 'comb', 'aria-label': 'Combinación de fuentes', onchange: function (e) { var i = e.target.value; if (i === '') return; var cb = combos[i]; ap(function (q) { q.fuente = q.tam >= 48 || q.peso >= 700 ? cb[1] : cb[2]; }, 'Combinación de fuentes', null, true); } }, h('option', { value: '' }, '12 combinaciones…'), combos.map(function (cb, i) { return h('option', { value: i }, cb[0]); }))),
      UI.rango('Tamaño', 6, 600, 1, Math.round(c.tam), function (v) { ap(function (q) { q.tam = v; }, 'Tamaño de texto', 'tam', true); }),
      UI.sel('Grosor', [[300, 'Fino'], [400, 'Normal'], [600, 'Seminegrita'], [700, 'Negrita'], [900, 'Extranegrita']], c.peso, function (v) { ap(function (q) { q.peso = +v; }, 'Grosor', null, true); }),
      h('div', { class: 'botonera' }, UI.btn('', null, function () { ap(function (q) { q.cursiva = !q.cursiva; }, 'Cursiva', null, true); }, { titulo: 'Cursiva' }), UI.btn('', null, function () { ap(function (q) { q.mayus = !q.mayus; }, 'Mayúsculas', null, true); }, { titulo: 'Mayúsculas' }), UI.btn('', null, function () { ap(function (q) { q.subrayado = !q.subrayado; }, 'Subrayado'); }, { titulo: 'Subrayado' })),
      UI.segmento('Alineación', [['left', '⯇', 'Izquierda'], ['center', '≡', 'Centro'], ['right', '⯈', 'Derecha']], c.alin, function (v) { ap(function (q) { q.alin = v; }, 'Alineación de texto'); }),
      UI.rango('Interlineado', 0.6, 3, 0.05, c.interlineado, function (v) { ap(function (q) { q.interlineado = v; }, 'Interlineado', 'inter', true); }),
      UI.rango('Espaciado de letras', -10, 60, 0.5, c.espaciado, function (v) { ap(function (q) { q.espaciado = v; }, 'Espaciado', 'esp', true); }),
      UI.color('Color del texto', c.color, function (v) { ap(function (q) { q.color = v; }, 'Color de texto', 'colortxt'); }),
      relleno('Relleno del texto', c.relleno, function (r) { ap(function (q) { q.relleno = r ? JSON.parse(JSON.stringify(r)) : null; }, 'Relleno de texto', 'reltxt'); }, { nada: true }),
      UI.sw('Contorno', !!c.contorno, function (v) { ap(function (q) { q.contorno = v ? { color: '#000000', ancho: Math.max(2, Math.round(q.tam / 14)) } : null; }, 'Contorno'); E.emit('sel'); })];
    if (c.contorno) out.push(UI.color('Color del contorno', c.contorno.color, function (v) { ap(function (q) { if (q.contorno) q.contorno.color = v; }, 'Color del contorno', 'cc'); }), UI.rango('Grosor del contorno', 0, 80, 0.5, c.contorno.ancho, function (v) { ap(function (q) { if (q.contorno) q.contorno.ancho = v; }, 'Grosor del contorno', 'gc'); }));
    out.push(UI.sel('Trazado del texto', [['arco', 'Arco / curvado'], ['onda', 'Onda'], ['circulo', 'Círculo']], c.trazo, function (v) { ap(function (q) { q.trazo = v; }, 'Trazado del texto'); }),
      UI.rango('Curvatura', -100, 100, 1, c.curva, function (v) { ap(function (q) { q.curva = v; }, 'Curvar texto', 'curva'); }));
    if ('queryLocalFonts' in window) out.push(UI.btn('Cargar fuentes del sistema', null, function () { window.queryLocalFonts().then(function (l) { var s = {}; l.forEach(function (f) { s[f.family] = 1; }); P.locales = Object.keys(s).sort().slice(0, 400); IM.aviso(P.locales.length + ' fuentes cargadas'); E.emit('sel'); }, function () { IM.aviso('Permiso denegado para fuentes locales', 'error'); }); }));
    return out;
  }
  function propsForma(c) {
    var out = [UI.sel('Forma', [['rect', 'Rectángulo'], ['elipse', 'Elipse'], ['poligono', 'Polígono'], ['estrella', 'Estrella'], ['flecha', 'Flecha'], ['burbuja', 'Burbuja de diálogo'], ['linea', 'Línea'], ['icono', 'Icono']], c.forma, function (v) { ap(function (q) { q.forma = v; if (v === 'linea' && !q.trazo) { q.trazo = { color: '#111111', ancho: 8 }; q.relleno = null; } }, 'Cambiar forma'); E.emit('sel'); })];
    if (c.forma !== 'linea') out.push(relleno('Relleno', c.relleno, function (r) { ap(function (q) { q.relleno = r ? JSON.parse(JSON.stringify(r)) : null; }, 'Relleno', 'relleno'); }, { nada: true }));
    if (c.forma === 'rect' || c.forma === 'burbuja') out.push(UI.rango('Esquinas redondeadas', 0, Math.round(Math.min(c.w, c.h) / 2), 1, c.radio || 0, function (v) { ap(function (q) { q.radio = v; }, 'Esquinas', 'radio'); }));
    if (c.forma === 'poligono') out.push(UI.rango('Lados', 3, 12, 1, c.lados, function (v) { ap(function (q) { q.lados = v; }, 'Lados', 'lados'); }));
    if (c.forma === 'estrella') out.push(UI.rango('Puntas', 3, 20, 1, c.puntas, function (v) { ap(function (q) { q.puntas = v; }, 'Puntas', 'puntas'); }), UI.rango('Profundidad', 0.1, 0.95, 0.01, c.interior, function (v) { ap(function (q) { q.interior = v; }, 'Profundidad', 'interior'); }));
    if (c.forma === 'burbuja') out.push(UI.rango('Posición de la cola', -1, 1, 0.05, c.cola, function (v) { ap(function (q) { q.cola = v; }, 'Cola', 'cola'); }));
    if (c.forma === 'linea') out.push(UI.sw('Punta de flecha', c.punta, function (v) { ap(function (q) { q.punta = v; }, 'Punta de flecha'); }));
    if (c.forma === 'icono') out.push(UI.sel('Icono', IM.Iconos.lista.map(function (i) { return [i[0], i[1]]; }), c.icono, function (v) { ap(function (q) { q.icono = v; }, 'Icono'); }));
    out.push(UI.sw('Trazo', !!c.trazo, function (v) { ap(function (q) { q.trazo = v ? { color: '#111111', ancho: 6 } : null; }, 'Trazo'); E.emit('sel'); }));
    if (c.trazo) out.push(UI.color('Color del trazo', c.trazo.color, function (v) { ap(function (q) { if (q.trazo) q.trazo.color = v; }, 'Color del trazo', 'ct'); }), UI.rango('Grosor del trazo', 0, 80, 0.5, c.trazo.ancho, function (v) { ap(function (q) { if (q.trazo) { q.trazo.ancho = v; if (q.forma === 'linea') q.h = Math.max(v, 1); } }, 'Grosor del trazo', 'gt'); }), UI.sw('Punteado', !!c.trazo.punteado, function (v) { ap(function (q) { if (q.trazo) q.trazo.punteado = v; }, 'Punteado'); }));
    return out;
  }
  function propsImagen(c) {
    var out = [h('div', { class: 'rotulo' }, 'Recorte por forma'), UI.sel('Forma de recorte', [['', 'Ninguno']].concat(R.RECORTES), c.recorte || '', function (v) { ap(function (q) { q.recorte = v || null; }, 'Recorte por forma'); })];
    out.push(h('div', { class: 'rotulo' }, 'Máscara de capa'));
    if (!c.mascara) out.push(h('div', { class: 'botonera' }, UI.btn('Añadir máscara', 'mascara', function () { E.nuevaMascara(c, false); E.emit('sel'); }), E.seleccionPx && E.seleccionPx.id === c.id ? UI.btn('Máscara desde selección', null, function () { E.nuevaMascara(c, true); E.emit('sel'); }) : null));
    else out.push(UI.sw('Editar máscara (pincel blanco revela, borrador oculta)', E.editMascara, function (v) { E.editMascara = v; if (v && !/pincel|borrador/.test(E.herr)) UI.elegirHerr('pincel'); E.emit('sel'); }), UI.btn('Quitar máscara', 'borrar', function () { c.mascara = null; E.editMascara = false; E.cambio('Quitar máscara'); E.emit('sel'); }));
    out.push(h('div', { class: 'rotulo' }, 'Recortar a proporción'), h('div', { class: 'botonera' }, [['1:1', 1], ['4:5', 0.8], ['16:9', 16 / 9], ['9:16', 9 / 16], ['3:2', 1.5]].map(function (r) { return UI.btn(r[0], null, function () { E.recortarCapaProporcion(c, r[1]); }); })));
    out.push(UI.sw('Borde', !!c.trazo, function (v) { ap(function (q) { q.trazo = v ? { color: '#ffffff', ancho: 12 } : null; }, 'Borde'); E.emit('sel'); }));
    if (c.trazo) out.push(UI.color('Color del borde', c.trazo.color, function (v) { ap(function (q) { if (q.trazo) q.trazo.color = v; }, 'Color del borde', 'cb'); }), UI.rango('Grosor del borde', 1, 120, 1, c.trazo.ancho, function (v) { ap(function (q) { if (q.trazo) q.trazo.ancho = v; }, 'Grosor del borde', 'gb'); }));
    return out;
  }
  function propsQR(c) {
    return [UI.txt('Contenido', c.texto, function (v) { c._t = v; }), UI.sel('Corrección de errores', [['L', 'L (7%)'], ['M', 'M (15%)'], ['Q', 'Q (25%)'], ['H', 'H (30%)']], c.ecc || 'M', function (v) { c.ecc = v; }),
      UI.color('Color del código', c.fg, function (v) { ap(function (q) { q.fg = v; }, 'Color del QR', 'fgqr'); }), UI.color('Color de fondo', c.bg, function (v) { ap(function (q) { q.bg = v; }, 'Fondo del QR', 'bgqr'); }),
      UI.rango('Margen (módulos)', 0, 8, 1, c.borde, function (v) { ap(function (q) { q.borde = v; }, 'Margen QR', 'bq'); }),
      UI.btn('Regenerar QR', 'qr', function () { try { var qr = window.QR.codificar(c._t != null ? c._t : c.texto, c.ecc || 'M'); ap(function (q) { q.texto = c._t != null ? c._t : q.texto; q.m = qr.modulos.map(function (f) { return f.map(function (b) { return b ? '1' : '0'; }).join(''); }); }, 'Regenerar QR'); delete c._t; } catch (e) { IM.aviso(e.message, 'error'); } })];
  }
  function propsAjuste(c) {
    return [h('p', { class: 'ayuda' }, 'Afecta a todas las capas situadas debajo. Edítala en la pestaña Ajustes.'), UI.btn('Ir a Ajustes', 'ajustes', function () { UI.tabsDer.mostrar('ajustes'); })];
  }
  function opcionesHerr() {
    var o = [], p = E.pincel;
    var colores = h('div', { class: 'fila' }, h('label', { class: 'et', for: 'colorGlobal' }, 'Color activo'), h('input', { type: 'color', id: 'colorGlobal', class: 'color', value: E.color, oninput: function (e) { E.color = e.target.value; E.emit('colorCambia'); UI.pintarHerr(); } }),
      h('input', { type: 'color', class: 'color', 'aria-label': 'Color secundario', value: E.color2, oninput: function (e) { E.color2 = e.target.value; UI.pintarHerr(); } }), UI.btn('', null, function () { var a = E.color; E.color = E.color2; E.color2 = a; E.emit('color'); }, { titulo: 'Intercambiar (X)', aria: 'Intercambiar colores' }));
    o.push(colores);
    var pal = IM.Plantillas.paletas[IM.Almacen.lsGet('paleta', 0)] || IM.Plantillas.paletas[0], sw = h('div', { class: 'muestras', role: 'group', 'aria-label': 'Paleta de colores' });
    [pal.bg, pal.a, pal.b, pal.c, pal.t, '#000000', '#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'].forEach(function (col) {
      sw.appendChild(h('button', { type: 'button', class: 'muestra', style: { background: col }, title: col, 'aria-label': 'Color ' + col, onclick: function () { E.color = col; E.emit('color'); var cs = E.capasSel(); if (cs.length && E.herr === 'seleccionar') { ap(function (q) { if (q.tipo === 'texto') { q.color = col; q.relleno = null; } else if (q.tipo === 'forma') q.relleno = { tipo: 'solido', c1: col }; else if (q.tipo === 'qr') q.fg = col; }, 'Aplicar color'); } } }));
    });
    o.push(sw);
    if (/pincel|borrador|lapiz/.test(E.herr)) {
      o.push(h('div', { class: 'rotulo' }, E.herr === 'pincel' ? 'Pincel' : E.herr === 'borrador' ? 'Borrador' : 'Lápiz'), UI.rango('Tamaño', 1, 600, 1, Math.round(p.tam), function (v) { p.tam = v; }), UI.rango('Dureza', 0, 1, 0.05, p.dureza, function (v) { p.dureza = v; }), UI.rango('Opacidad', 0.05, 1, 0.05, p.opacidad, function (v) { p.opacidad = v; }),
        UI.rango('Flujo', 0.05, 1, 0.05, p.flujo, function (v) { p.flujo = v; }), UI.rango('Suavizado', 0, 1, 0.05, p.suav, function (v) { p.suav = v; }), UI.sw('Sensibilidad a la presión (lápiz/tableta)', p.presion, function (v) { p.presion = v; }));
      var cs = E.unaSel(); if (cs && cs.mascara) o.push(UI.sw('Pintar en la máscara', E.editMascara, function (v) { E.editMascara = v; }));
    } else if (E.herr === 'varita') o.push(h('div', { class: 'rotulo' }, 'Varita mágica'), UI.rango('Tolerancia', 0, 255, 1, E.opciones.tolVarita, function (v) { E.opciones.tolVarita = v; }), UI.sw('Solo píxeles contiguos', E.opciones.contiguo, function (v) { E.opciones.contiguo = v; }), h('p', { class: 'ayuda' }, 'Mayús+clic suma a la selección. Las acciones están en la pestaña Ajustes.'));
    else if (E.herr === 'relleno') o.push(h('div', { class: 'rotulo' }, 'Relleno'), UI.rango('Tolerancia', 0, 255, 1, E.opciones.tolRelleno, function (v) { E.opciones.tolRelleno = v; }), UI.sw('Solo píxeles contiguos', E.opciones.contiguo, function (v) { E.opciones.contiguo = v; }));
    else if (E.herr === 'forma') {
      var b = h('div', { class: 'botonera' });
      [['rect', 'Rectángulo'], ['elipse', 'Elipse'], ['poligono', 'Polígono'], ['estrella', 'Estrella'], ['flecha', 'Flecha'], ['burbuja', 'Burbuja'], ['linea', 'Línea']].forEach(function (f) { b.appendChild(h('button', { type: 'button', class: 'btn', 'aria-pressed': E.opciones.formaActual === f[0] ? 'true' : 'false', onclick: function () { E.opciones.formaActual = f[0]; E.emit('sel'); } }, f[1])); });
      o.push(h('div', { class: 'rotulo' }, 'Forma a dibujar'), b, h('p', { class: 'ayuda' }, 'Arrastra en el lienzo. Mayús mantiene proporción, Alt dibuja desde el centro.'));
    } else if (E.herr === 'cuentagotas') o.push(h('p', { class: 'ayuda' }, 'Clic: color principal. Alt+clic: color secundario.'));
    return o;
  }
  function pagina() {
    var p = E.pagina(), aj = E.proy.ajustes, ls = Redes.lista;
    var tw = p.w, th = p.h, escalar = true;
    var out = [h('div', { class: 'rotulo' }, 'Lienzo (página ' + (E.pi + 1) + ' de ' + E.proy.paginas.length + ')'),
      UI.sel('Tamaño predefinido', ls.map(function (r) { return [r.id, r.nombre + (r.id === 'libre' ? '' : ' · ' + r.w + '×' + r.h)]; }), (ls.filter(function (r) { return r.w === p.w && r.h === p.h; })[0] || { id: 'libre' }).id, function (v) { var r = Redes.buscar(v); if (v !== 'libre') { tw = r.w; th = r.h; E.redimensionarLienzo(tw, th, true); } }),
      h('div', { class: 'rejilla2' }, UI.num('Ancho', p.w, function (v) { tw = v; }, { min: 16, max: 4096 }), UI.num('Alto', p.h, function (v) { th = v; }, { min: 16, max: 4096 })),
      UI.sw('Escalar el contenido al cambiar', true, function (v) { escalar = v; }), UI.btn('Aplicar tamaño', null, function () { E.redimensionarLienzo(tw, th, escalar); }),
      relleno('Fondo de la página', p.fondo, function (r) { p.fondo = r ? JSON.parse(JSON.stringify(r)) : null; E.cambio('Fondo de la página', 'fondo'); }, { nada: true }),
      h('div', { class: 'rotulo' }, 'Ayudas de diseño'),
      UI.sw('Reglas', aj.reglas, function (v) { aj.reglas = v; IM.Vista.cambioTam(); E.sucioDoc = true; }), UI.sw('Cuadrícula', aj.cuadricula, function (v) { aj.cuadricula = v; IM.Vista.pedirOv(); E.sucioDoc = true; }),
      UI.rango('Paso de cuadrícula', 5, 200, 5, aj.paso, function (v) { aj.paso = v; IM.Vista.pedirOv(); }), UI.sw('Ajuste a guías y cuadrícula', aj.ajuste !== false, function (v) { aj.ajuste = v; }),
      UI.sel('Zonas seguras', [['', 'Ninguna']].concat(ls.filter(function (r) { return r.seguro; }).map(function (r) { return [r.id, r.nombre]; })), aj.seguro || '', function (v) { aj.seguro = v || null; IM.Vista.pedirOv(); E.sucioDoc = true; IM.Proy.programar(); }),
      p.guias.length ? UI.btn('Quitar ' + p.guias.length + ' guías', 'borrar', function () { p.guias = []; E.cambio('Quitar guías'); E.emit('sel'); }) : h('p', { class: 'ayuda' }, 'Arrastra desde las reglas para crear guías.')];
    return out;
  }
  P.render = function (cont) {
    var cs = E.capasSel(), t = [];
    cont.appendChild(UI.seccion('Herramienta y color', opcionesHerr(), !cs.length || E.herr !== 'seleccionar'));
    if (!cs.length) { cont.appendChild(h('div', { class: 'vacio' }, h('p', null, 'Nada seleccionado. Haz clic en un elemento del lienzo o añade uno desde la biblioteca.')), UI.seccion('Página', pagina())); return; }
    var c = cs[0], multi = cs.length > 1;
    cont.appendChild(h('div', { class: 'titulo-sel' }, multi ? cs.length + ' capas seleccionadas' : c.nombre + ' · ' + ({ imagen: 'imagen', texto: 'texto', forma: 'forma', grupo: 'grupo', ajuste: 'ajuste', qr: 'código QR' })[c.tipo]));
    cont.appendChild(UI.seccion('Posición y tamaño', transform(cs)));
    if (!multi) {
      if (c.tipo === 'texto') cont.appendChild(UI.seccion('Texto', propsTexto(c)));
      if (c.tipo === 'forma') cont.appendChild(UI.seccion('Forma', propsForma(c)));
      if (c.tipo === 'imagen') { cont.appendChild(UI.seccion('Imagen', propsImagen(c))); cont.appendChild(h('div', { class: 'botonera' }, UI.btn('Ir a ajustes de imagen', 'ajustes', function () { UI.tabsDer.mostrar('ajustes'); }))); }
      if (c.tipo === 'qr') cont.appendChild(UI.seccion('Código QR', propsQR(c)));
      if (c.tipo === 'ajuste') cont.appendChild(UI.seccion('Capa de ajuste', propsAjuste(c)));
      if (c.tipo !== 'imagen' && c.tipo !== 'ajuste' && c.tipo !== 'grupo') cont.appendChild(h('div', { class: 'botonera' }, UI.btn('Convertir en imagen (rasterizar)', 'imagen', function () { E.rasterizar(c); E.emit('sel'); }), UI.btn('Máscara…', 'mascara', function () { E.rasterizar(c); E.nuevaMascara(E.capaPorId(c.id), false); E.emit('sel'); }, { titulo: 'Rasteriza y añade máscara' })));
    }
    if (!multi && c.tipo !== 'ajuste' || multi) cont.appendChild(UI.seccion('Apariencia', apariencia(cs), true));
    if (!multi && c.tipo !== 'imagen' && c.tipo !== 'ajuste' && c.tipo !== 'grupo' && !c.mascara) { /* recorte por forma disponible tras rasterizar */ }
  };
})(window.IM);
