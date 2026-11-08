/* Componentes de interfaz compartidos: selector de biblioteca, inspector de capa y editor de PNG propios (recorte + transparencia). window.RA.Panel */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, RA = g.RA, B = RA.Biblio, O = RA.Ov, P = RA.Panel = {};
  function rango(etq, min, max, paso, val, fn, fmt) {
    var out = h('output', { txt: fmt ? fmt(val) : String(val) }), i = h('input', { type: 'range', min: min, max: max, step: paso, value: val, 'aria-label': etq });
    i.addEventListener('input', function () { var v = parseFloat(i.value); out.textContent = fmt ? fmt(v) : v; fn(v); });
    return h('label', { cls: 'ra-rango' }, [h('span', { txt: etq }), i, out]);
  }
  P.rango = rango;
  function miniatura(it) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(B.svgTexto(it, it.pant ? {} : {}).replace(/width="\d+" height="\d+"/, 'width="' + it.w + '" height="' + it.h + '"')); }

  /* selector: onElegir({tipo:'lib', clave} | {tipo:'png', ref}) */
  P.biblioteca = function (onElegir, o) {
    o = o || {}; var cont = h('div', { cls: 'ra-bib' }), cat = 'carro', rej = h('div', { cls: 'ra-bib-rej', role: 'list' }), chips = h('div', { cls: 'ra-chips', role: 'group', 'aria-label': 'Categorías' });
    function pintar() {
      chips.innerHTML = ''; B.CATS.concat([['png', 'Mis PNG']]).forEach(function (c) { chips.appendChild(h('button', { type: 'button', cls: 'ra-chip', 'aria-pressed': c[0] === cat, txt: c[1], on: { click: function () { cat = c[0]; pintar(); } } })); });
      rej.innerHTML = '';
      if (cat === 'png') {
        rej.appendChild(h('label', { cls: 'tr-btn ra-subir' }, [h('span', { txt: '+ Subir PNG/JPG…' }), h('input', { type: 'file', accept: 'image/*', hidden: true, on: { change: function (e) { var f = e.target.files[0]; e.target.value = ''; if (f) P.subirPNG(f).then(function (r) { if (r) { pintar(); onElegir({ tipo: 'png', ref: r.ref, w: r.w, h: r.h }); } }); } } })]));
        RA.Datos.pngs().then(function (l) { l.forEach(function (p) { var b = h('button', { type: 'button', cls: 'ra-it', title: p.nombre, 'aria-label': 'Usar ' + p.nombre, on: { click: function () { var im = new Image(); im.onload = function () { O.pngs[p.id] = p.url; onElegir({ tipo: 'png', ref: p.id, w: im.naturalWidth, h: im.naturalHeight }); }; im.src = p.url; } } }, [h('img', { src: p.url, alt: '' }), h('span', { txt: p.nombre })]); rej.appendChild(b); }); if (!l.length) rej.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Aún no hay PNG propios. Sube uno: podrás recortarlo y quitar el fondo.' })); });
        return;
      }
      B.lista.filter(function (i) { return i.cat === cat; }).forEach(function (it) {
        rej.appendChild(h('button', { type: 'button', cls: 'ra-it', 'aria-label': 'Añadir ' + it.nombre, on: { click: function () { onElegir({ tipo: 'lib', clave: it.clave }); } } }, [h('img', { src: miniatura(it), alt: '' }), h('span', { txt: it.nombre })]));
      });
    }
    pintar(); cont.appendChild(chips); cont.appendChild(rej); cont.refrescar = pintar; return cont;
  };
  P.subirPNG = async function (file) {
    try {
      var url = await RA.App.archivoADataURL(file), r = await P.editorPNG(url, file.name.replace(/\.[^.]+$/, '')); if (!r) return null;
      var ref = 'png' + T.uid(); O.pngs[ref] = r.url; await RA.Datos.guardarPNG(ref, r.url, r.nombre); RA.App.logro('ra_png_propio'); return { ref: ref, w: r.w, h: r.h };
    } catch (e) { T.aviso(e.message, 'error'); return null; }
  };

  /* editor de PNG: recorte en %, quitar color por tolerancia, recorte automatico */
  P.editorPNG = function (url, nombre) {
    return RA.App.cargarImagen(url).then(function (img) {
      return new Promise(function (ok) {
        var k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight)), W = Math.round(img.naturalWidth * k), H = Math.round(img.naturalHeight * k);
        var fuente = document.createElement('canvas'); fuente.width = W; fuente.height = H; fuente.getContext('2d').drawImage(img, 0, 0, W, H);
        var st = { l: 0, r: 0, t: 0, b: 0, color: null, tol: 40, suave: 12 }, vista = h('canvas', { cls: 'ra-ed-lienzo', width: W, height: H, 'aria-label': 'Vista previa; toca un color para hacerlo transparente' });
        var dlg = h('dialog', { cls: 'ra-dlg', 'aria-label': 'Editar imagen' }), inf = h('p', { cls: 'tr-ayuda', txt: 'Toca la imagen para elegir el color que será transparente.' });
        function resultado() {
          var x0 = Math.round(W * st.l / 100), y0 = Math.round(H * st.t / 100), w = Math.max(1, W - x0 - Math.round(W * st.r / 100)), hh = Math.max(1, H - y0 - Math.round(H * st.b / 100)), c = document.createElement('canvas'); c.width = w; c.height = hh; var x = c.getContext('2d');
          x.drawImage(fuente, x0, y0, w, hh, 0, 0, w, hh);
          if (st.color) { var d = x.getImageData(0, 0, w, hh); RA.Recorte.quitarColor(d.data, st.color[0], st.color[1], st.color[2], st.tol, st.suave); x.putImageData(d, 0, 0); }
          return c;
        }
        function pintar() {
          var c = resultado(), x = vista.getContext('2d'); vista.width = c.width; vista.height = c.height; x.clearRect(0, 0, c.width, c.height);
          var s = 12; for (var j = 0; j * s < c.height; j++) for (var i = 0; i * s < c.width; i++) { x.fillStyle = (i + j) % 2 ? '#cfd4de' : '#f4f6fb'; x.fillRect(i * s, j * s, s, s); }
          x.drawImage(c, 0, 0);
        }
        vista.addEventListener('click', function (e) { var r = vista.getBoundingClientRect(), px = Math.floor((e.clientX - r.left) * vista.width / r.width), py = Math.floor((e.clientY - r.top) * vista.height / r.height), x0 = Math.round(W * st.l / 100), y0 = Math.round(H * st.t / 100); var d = fuente.getContext('2d').getImageData(Math.min(W - 1, x0 + px), Math.min(H - 1, y0 + py), 1, 1).data; st.color = [d[0], d[1], d[2]]; inf.textContent = 'Color transparente: rgb(' + st.color.join(', ') + '). Ajusta la tolerancia.'; pintar(); });
        var nom = h('input', { type: 'text', value: nombre || 'PNG', 'aria-label': 'Nombre', maxlength: 40 });
        function cerrar(v) { dlg.close(); dlg.remove(); ok(v); }
        dlg.appendChild(h('div', { cls: 'ra-ed' }, [
          h('h2', { txt: 'Recortar y quitar fondo' }), vista, inf,
          rango('Recortar izquierda %', 0, 90, 1, 0, function (v) { st.l = v; pintar(); }), rango('Recortar derecha %', 0, 90, 1, 0, function (v) { st.r = v; pintar(); }),
          rango('Recortar arriba %', 0, 90, 1, 0, function (v) { st.t = v; pintar(); }), rango('Recortar abajo %', 0, 90, 1, 0, function (v) { st.b = v; pintar(); }),
          rango('Tolerancia del color', 0, 160, 1, st.tol, function (v) { st.tol = v; pintar(); }), rango('Suavizado del borde', 1, 60, 1, st.suave, function (v) { st.suave = v; pintar(); }),
          h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Nombre' }), nom]),
          h('div', { cls: 'tr-acciones' }, [
            h('button', { type: 'button', cls: 'tr-btn', txt: 'Quitar color elegido', on: { click: function () { st.color = null; inf.textContent = 'Toca la imagen para elegir el color que será transparente.'; pintar(); } } }),
            h('button', { type: 'button', cls: 'tr-btn', txt: 'Ajustar al contenido', on: { click: function () { var c = resultado(), d = c.getContext('2d').getImageData(0, 0, c.width, c.height), b = RA.Recorte.cajaOpaca(d.data, c.width, c.height); if (!b) return; st.l += b.x * 100 / W; st.t += b.y * 100 / H; st.r += (c.width - b.x - b.w) * 100 / W; st.b += (c.height - b.y - b.h) * 100 / H; pintar(); } } }),
            h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Guardar PNG', on: { click: function () { var c = resultado(); cerrar({ url: c.toDataURL('image/png'), w: c.width, h: c.height, nombre: nom.value.trim() || 'PNG' }); } } }),
            h('button', { type: 'button', cls: 'tr-btn', txt: 'Cancelar', on: { click: function () { cerrar(null); } } })])]));
        dlg.addEventListener('cancel', function () { dlg.remove(); ok(null); }); document.body.appendChild(dlg); pintar(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      });
    });
  };

  /* inspector de la capa seleccionada */
  P.inspector = function (cfg) { // cfg: {capa(), cambio(), borrar(), dup(), orden(+1/-1), rostro:bool, marcador:bool, aviso}
    var raiz = h('div', { cls: 'ra-insp', 'aria-live': 'polite' });
    function pintar() {
      raiz.innerHTML = ''; var ov = cfg.capa();
      if (!ov) { raiz.appendChild(h('p', { cls: 'tr-vacio', txt: 'Toca una capa en el lienzo (o en la lista) para editarla.' })); return; }
      var it = ov.fuente.tipo === 'lib' ? B.porClave(ov.fuente.clave) : null;
      function cam(fn) { return function (v) { fn(v); cfg.cambio(); }; }
      var nom = h('input', { type: 'text', value: ov.nombre, 'aria-label': 'Nombre de la capa', maxlength: 40 }); nom.addEventListener('change', function () { ov.nombre = nom.value; cfg.cambio(true); });
      raiz.appendChild(h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Nombre' }), nom]));
      if (it && it.p.length) {
        var fila = h('div', { cls: 'ra-fila' });
        it.p.forEach(function (q) { var inp = h('input', { type: q.t === 'color' ? 'color' : 'text', value: ov.fuente.p[q.k] != null ? ov.fuente.p[q.k] : q.d, 'aria-label': q.n, maxlength: 24 }); inp.addEventListener('input', function () { ov.fuente.p[q.k] = inp.value; cfg.cambio(); }); fila.appendChild(h('label', { cls: 'ra-campo ra-mini' }, [h('span', { txt: q.n }), inp])); });
        raiz.appendChild(fila);
      }
      if (it && it.pant) {
        var c = ov.fuente.contenido = ov.fuente.contenido || { tipo: 'color', color: '#1c7ed6' }, sel = h('select', { 'aria-label': 'Contenido de la pantalla' }, [['color', 'Color y texto'], ['img', 'Imagen o captura'], ['iframe', 'Página web (iframe)']].map(function (o) { return h('option', { value: o[0], txt: o[1], selected: c.tipo === o[0] }); }));
        var campos = h('div', { cls: 'ra-fila' });
        function pc() {
          campos.innerHTML = '';
          if (c.tipo === 'color') { var col = h('input', { type: 'color', value: c.color || '#1c7ed6', 'aria-label': 'Fondo' }), tx = h('input', { type: 'text', value: c.texto || '', placeholder: 'Texto', maxlength: 40, 'aria-label': 'Texto' }); col.addEventListener('input', function () { c.color = col.value; cfg.cambio(); }); tx.addEventListener('input', function () { c.texto = tx.value; cfg.cambio(); }); campos.appendChild(h('label', { cls: 'ra-campo ra-mini' }, [h('span', { txt: 'Fondo' }), col])); campos.appendChild(h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Texto' }), tx])); }
          else if (c.tipo === 'img') { campos.appendChild(h('label', { cls: 'tr-btn' }, [h('span', { txt: 'Elegir imagen o captura…' }), h('input', { type: 'file', accept: 'image/*', hidden: true, on: { change: function (e) { var f = e.target.files[0]; if (!f) return; RA.App.archivoADataURL(f).then(function (u) { var ref = 'pan' + T.uid(); O.pngs[ref] = u; c.ref = ref; return RA.Datos.guardarPNG(ref, u, 'Pantalla ' + f.name); }).then(function () { cfg.cambio(); }); } } })])); }
          else { var url = h('input', { type: 'url', value: c.url || '', placeholder: 'https://…', 'aria-label': 'Dirección', maxlength: 300 }); url.addEventListener('change', function () { if (url.value && !O.urlPermitida(url.value, RA.App.hostsPermitidos())) { T.aviso('Dirección no permitida. Usa https:// y añade el dominio en Proyectos > Ajustes > Dominios permitidos para iframes.', 'error'); url.value = ''; c.url = ''; } else c.url = url.value; cfg.cambio(true); }); campos.appendChild(h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Dirección (https)' }), url])); campos.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Muchos sitios bloquean ser incrustados. La página se ve en pantalla pero no entra en la foto exportada ni en el clip (los navegadores no permiten copiar su contenido).' })); }
        }
        sel.addEventListener('change', function () { c.tipo = sel.value; pc(); cfg.cambio(true); }); pc(); raiz.appendChild(h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Contenido' }), sel])); raiz.appendChild(campos);
      }
      var anclas = [['imagen', 'Fija en la imagen']]; if (cfg.marcador) anclas.push(['marcador', 'Pegada al marcador']); if (cfg.rostro) anclas.push(['rostro', 'Sigue el rostro']);
      if (anclas.length > 1) { var sa = h('select', { 'aria-label': 'Anclaje' }, anclas.map(function (a) { return h('option', { value: a[0], txt: a[1], selected: ov.ancla === a[0] }); })); sa.addEventListener('change', function () { cfg.anclar(ov, sa.value); pintar(); }); raiz.appendChild(h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Anclaje' }), sa])); }
      if (ov.ancla === 'imagen') { var mal = h('input', { type: 'checkbox', checked: !!ov.malla }); mal.addEventListener('change', function () { if (mal.checked) O.hacerMalla(ov); else ov.malla = null; cfg.cambio(true); }); raiz.appendChild(h('label', { cls: 'tr-chk' }, [mal, 'Malla 3×3 (9 puntos para curvar prendas)'])); }
      if (it && it.anclas && ov.ancla === 'imagen') raiz.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Anclas (arrastra los puntos amarillos): ' + it.anclas.map(function (a, i) { return (i + 1) + ' ' + a; }).join(' · ') }));
      raiz.appendChild(rango('Opacidad', 0, 1, 0.01, ov.op, cam(function (v) { ov.op = v; }), function (v) { return Math.round(v * 100) + ' %'; }));
      var mz = h('select', { 'aria-label': 'Mezcla' }, O.MEZCLAS.map(function (m) { return h('option', { value: m[0], txt: m[1], selected: ov.mez === m[0] }); })); mz.addEventListener('change', function () { ov.mez = mz.value; cfg.cambio(); });
      raiz.appendChild(h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Mezcla' }), mz]));
      var es = h('input', { type: 'checkbox', checked: ov.espejo }); es.addEventListener('change', function () { ov.espejo = es.checked; cfg.cambio(); });
      var sh = h('input', { type: 'checkbox', checked: ov.sombra.on }); sh.addEventListener('change', function () { ov.sombra.on = sh.checked; cfg.cambio(true); pintar(); });
      raiz.appendChild(h('div', { cls: 'ra-fila' }, [h('label', { cls: 'tr-chk' }, [es, 'Espejo']), h('label', { cls: 'tr-chk' }, [sh, 'Sombra'])]));
      if (ov.sombra.on) { raiz.appendChild(rango('Desenfoque', 0, 40, 1, ov.sombra.blur, cam(function (v) { ov.sombra.blur = v; }))); raiz.appendChild(rango('Desplaz. X', -30, 30, 1, ov.sombra.dx, cam(function (v) { ov.sombra.dx = v; }))); raiz.appendChild(rango('Desplaz. Y', -30, 30, 1, ov.sombra.dy, cam(function (v) { ov.sombra.dy = v; }))); raiz.appendChild(rango('Intensidad', 0, 1, 0.05, ov.sombra.op, cam(function (v) { ov.sombra.op = v; }))); }
      raiz.appendChild(h('div', { cls: 'tr-acciones' }, [
        h('button', { type: 'button', cls: 'tr-btn', txt: ov.visible ? 'Ocultar' : 'Mostrar', on: { click: function () { ov.visible = !ov.visible; cfg.cambio(true); pintar(); } } }),
        h('button', { type: 'button', cls: 'tr-btn', txt: ov.bloq ? 'Desbloquear' : 'Bloquear', on: { click: function () { ov.bloq = !ov.bloq; cfg.cambio(true); pintar(); } } }),
        h('button', { type: 'button', cls: 'tr-btn', txt: 'Subir', on: { click: function () { cfg.orden(1); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Bajar', on: { click: function () { cfg.orden(-1); } } }),
        h('button', { type: 'button', cls: 'tr-btn', txt: 'Duplicar', on: { click: cfg.dup } }), h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Borrar', on: { click: cfg.borrar } })]));
    }
    pintar(); return { raiz: raiz, pintar: pintar };
  };
  RA.App.hostsPermitidos = function () { return String(RA.App.aj.hosts || '').split(/[\s,;]+/).filter(Boolean); };

  /* lista de capas (orden de dibujo: la ultima queda arriba) */
  P.listaCapas = function (cfg) { // {capas(), sel(), elegir(id)}
    var ul = h('ul', { cls: 'ra-capas', 'aria-label': 'Capas' });
    function pintar() {
      ul.innerHTML = ''; var l = cfg.capas().slice().reverse();
      if (!l.length) ul.appendChild(h('li', { cls: 'tr-vacio', txt: 'Sin capas. Añade una de la biblioteca.' }));
      l.forEach(function (ov) { ul.appendChild(h('li', {}, [h('button', { type: 'button', cls: 'ra-capa', 'aria-pressed': cfg.sel() === ov.id, on: { click: function () { cfg.elegir(ov.id); } } }, [h('span', { cls: 'ra-pto', txt: ov.ancla === 'marcador' ? '▦' : ov.ancla === 'rostro' ? '☺' : '▢' }), h('span', { txt: ov.nombre + (ov.visible ? '' : ' (oculta)') + (ov.bloq ? ' (bloqueada)' : '') })])])); });
    }
    pintar(); return { raiz: ul, pintar: pintar };
  };
})(window);
