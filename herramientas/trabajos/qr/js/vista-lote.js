/* Vista Lote: lista de contenidos (una linea cada uno, "contenido | etiqueta"), CSV o secuencia numerada; ZIP de PNG/SVG y paso a la hoja de etiquetas. */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.QRApp, R = g.QRRender, MAX = 500, ui = {}, items = [];
  function parsear(txt) {
    return txt.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { var i = l.indexOf(' | '); return i > 0 ? { texto: l.slice(0, i).trim(), etq: l.slice(i + 3).trim() } : { texto: l, etq: '' }; });
  }
  function desdeCSV(txt) {
    var f = T.csv(txt); if (!f.length) return '';
    var cab = f[0].map(function (c) { return c.trim().toLowerCase(); }), ic = -1, ie = -1;
    cab.forEach(function (c, i) { if (/^(contenido|texto|url|enlace|dato|valor|qr|link)$/.test(c)) ic = i; if (/^(etiqueta|nombre|titulo|t\u00edtulo|label|descripcion|descripci\u00f3n)$/.test(c)) ie = i; });
    var cabecera = ic >= 0 || ie >= 0; if (ic < 0) ic = ie === 0 ? 1 : 0; if (!cabecera && f[0].length > 1) ie = 1;
    return f.slice(cabecera ? 1 : 0).map(function (r) { var c = (r[ic] || '').trim(), e = ie >= 0 ? (r[ie] || '').trim() : ''; return c ? (e ? c + ' | ' + e : c) : ''; }).filter(Boolean).join('\n');
  }
  A.itemsLote = function () { return items; };
  function generar() {
    var E = A.est; items = parsear(ui.txt.value).slice(0, MAX); E.lote = items; E.loteTexto = ui.txt.value;
    ui.rej.textContent = ''; var malos = 0, bytes = 0;
    items.forEach(function (it, i) {
      var r = A.codificar(it.texto, E.ecc, E.modo); it.qr = r.qr || null; it.error = r.error || null; if (r.error) malos++; else bytes += it.texto.length;
    });
    items.slice(0, 48).forEach(function (it, i) {
      var f = h('figure', {}, []);
      if (it.qr) { var d = h('div', { cls: 'qr-mini' }); d.innerHTML = R.svg(it.qr, Object.assign({}, A.estiloPara(it.qr), { logo: null }), null); f.appendChild(d); }
      else f.appendChild(h('div', { cls: 'qr-err', title: it.error, txt: 'Error' }));
      f.appendChild(h('figcaption', { title: it.etq || it.texto, txt: (i + 1) + '. ' + (it.etq || it.texto) })); ui.rej.appendChild(f);
    });
    var ok = items.length - malos;
    ui.res.textContent = items.length ? ok + ' códigos listos' + (malos ? ', ' + malos + ' con error (no se exportarán)' : '') + (items.length >= MAX ? ' · límite de ' + MAX + ' por lote' : '') + (items.length > 48 ? ' · vista previa de los primeros 48' : '') : 'Escribe o carga contenidos para generar el lote.';
    [ui.zipPng, ui.zipSvg, ui.hoja].forEach(function (b) { b.disabled = !ok; });
    A.emitir('lote');
  }
  function limpiarNombre(it, i) { return String(i + 1).padStart(3, '0') + '_' + T.nombreArchivo(it.etq || it.texto, 28); }
  async function exportar(formato) {
    var buenos = items.filter(function (i) { return i.qr; }), arch = [], px = +ui.px.value;
    ui.prog.hidden = false; ui.zipPng.disabled = ui.zipSvg.disabled = true;
    try {
      for (var k = 0; k < buenos.length; k++) {
        var it = buenos[k], est = A.estiloPara(it.qr), nom = limpiarNombre(it, items.indexOf(it));
        if (formato === 'png') { var b = await R.png(it.qr, est, px); arch.push({ nombre: nom + '.png', datos: new Uint8Array(await b.arrayBuffer()) }); }
        else arch.push({ nombre: nom + '.svg', datos: T.bytes(R.svg(it.qr, est, 1024)) });
        ui.prog.firstChild.style.width = Math.round((k + 1) / buenos.length * 100) + '%'; if (k % 5 === 4) await new Promise(function (r) { setTimeout(r, 0); });
      }
      arch.push({ nombre: 'contenidos.csv', datos: T.bytes('﻿numero,contenido,etiqueta\r\n' + buenos.map(function (it) { return [items.indexOf(it) + 1, it.texto, it.etq].map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n')) });
      T.descargar(T.zip(arch), 'qr_lote_' + formato + '.zip'); A.aviso('ZIP listo: ' + buenos.length + ' ' + formato.toUpperCase() + '.');
      A.logro('primer_qr'); if (buenos.length >= 10) A.logro('lote_10'); if (g.CuentaTrabajos) g.CuentaTrabajos.xp(5);
      A.registrar({ tipo: 'lote', texto: ui.txt.value.slice(0, 2000), titulo: 'Lote de ' + buenos.length + ' códigos', origen: 'lote' });
    } catch (e) { A.aviso('No se pudo exportar: ' + e.message, 'error'); }
    ui.prog.hidden = true; ui.prog.firstChild.style.width = '0'; generar();
  }
  A.iniciarLote = function () {
    var raiz = document.getElementById('v-lote');
    ui.txt = h('textarea', { id: 'lo-txt', rows: 8, placeholder: 'https://ejemplo.com/a | Mesa 1\nhttps://ejemplo.com/b | Mesa 2\nOtro texto cualquiera', spellcheck: 'false', 'aria-describedby': 'lo-ayuda' });
    ui.txt.addEventListener('input', function () { clearTimeout(ui.t); ui.t = setTimeout(generar, 250); });
    ui.csv = h('input', { type: 'file', id: 'lo-csv', accept: '.csv,.tsv,.txt,text/csv,text/plain' });
    ui.csv.addEventListener('change', function () { var f = ui.csv.files[0]; if (!f) return; f.text().then(function (t) { ui.txt.value = /\.(csv|tsv)$/i.test(f.name) ? desdeCSV(t) : t.trim(); generar(); A.aviso('Archivo cargado.'); }, function () { A.aviso('No se pudo leer el archivo.', 'error'); }); });
    var plan = h('input', { type: 'text', id: 'lo-plantilla', value: 'https://ejemplo.com/p/{n}', autocomplete: 'off' }), desde = h('input', { type: 'number', id: 'lo-desde', value: 1, min: 0, inputmode: 'numeric' }), cant = h('input', { type: 'number', id: 'lo-cant', value: 20, min: 1, max: MAX, inputmode: 'numeric' }), cer = h('input', { type: 'number', id: 'lo-ceros', value: 3, min: 0, max: 8, inputmode: 'numeric' });
    var seq = h('details', { cls: 'qr-det' }, [h('summary', { txt: 'Generar una secuencia numerada' }), h('label', { for: 'lo-plantilla', txt: 'Plantilla (usa {n} donde va el número)' }), plan,
      h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'lo-desde', txt: 'Desde' }), desde]), h('div', {}, [h('label', { for: 'lo-cant', txt: 'Cantidad' }), cant]), h('div', {}, [h('label', { for: 'lo-ceros', txt: 'Dígitos (ceros)' }), cer])]),
      h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', id: 'lo-seq', txt: 'Rellenar la lista', on: { click: function () {
        var n0 = parseInt(desde.value, 10) || 0, c = Math.max(1, Math.min(MAX, parseInt(cant.value, 10) || 1)), z = parseInt(cer.value, 10) || 0, p = plan.value || '{n}', l = [];
        for (var i = 0; i < c; i++) { var n = String(n0 + i); while (n.length < z) n = '0' + n; l.push(p.indexOf('{n}') >= 0 ? p.split('{n}').join(n) : p + n); }
        ui.txt.value = l.join('\n'); generar(); } } })])]);
    ui.px = h('select', { id: 'lo-px' }, [['512', '512 px'], ['1024', '1024 px'], ['2048', '2048 px']].map(function (o) { return h('option', { value: o[0], txt: o[1], selected: o[0] === '1024' }); }));
    ui.res = h('p', { id: 'lo-res', role: 'status', 'aria-live': 'polite' }); ui.rej = h('div', { cls: 'qr-rejilla', id: 'lo-rej' });
    ui.prog = h('div', { cls: 'qr-barra-prog', hidden: true }, [h('i')]);
    ui.zipPng = h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'lo-zip-png', txt: 'ZIP de PNG', disabled: true, on: { click: function () { exportar('png'); } } });
    ui.zipSvg = h('button', { type: 'button', cls: 'tr-btn', id: 'lo-zip-svg', txt: 'ZIP de SVG', disabled: true, on: { click: function () { exportar('svg'); } } });
    ui.hoja = h('button', { type: 'button', cls: 'tr-btn', id: 'lo-hoja', txt: 'Hoja de etiquetas…', disabled: true, on: { click: function () { A.est.fuenteImpresion = 'lote'; A.ir('imprimir'); } } });
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Contenidos del lote' }), h('label', { for: 'lo-txt', txt: 'Una línea por código' }), ui.txt,
        h('p', { cls: 'tr-ayuda', id: 'lo-ayuda', txt: 'Formato: «contenido» o «contenido | etiqueta». Máximo ' + MAX + '. Se usan el estilo y la corrección de la pestaña Crear (el logo no se aplica en lotes).' }),
        h('label', { for: 'lo-csv', txt: 'Cargar CSV o TXT' }), ui.csv, h('p', { cls: 'tr-ayuda', txt: 'CSV con columnas «contenido» y opcionalmente «etiqueta» (con o sin cabecera; separador , ; o tabulador).' }), seq]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Resultado' }), ui.res, ui.rej, h('label', { for: 'lo-px', txt: 'Tamaño de los PNG' }), ui.px, ui.prog, h('div', { cls: 'tr-acciones' }, [ui.zipPng, ui.zipSvg, ui.hoja])])]));
    ui.txt.value = A.est.loteTexto || ''; generar();
    A.on('estilo', generar);
  };
  A.regenerarLote = generar;
})(window);
