/* Vista «Calidad»: banderas de riesgo, originalidad entre piezas propias y registro de divulgacion de IA. window.CCalidad */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, U = g.CUI, A = g.CApp, D = g.CDatos, S = g.CIA.similitud, PL = g.CIA.plantillas, Q = {}, sub;
  var PARTES = [['guion', 'Guion / texto'], ['voz', 'Voz sintética'], ['rostro', 'Rostro o avatar realista'], ['escenaRealista', 'Escenas realistas'], ['imagenes', 'Imágenes'], ['video', 'Video / clips']];
  function txt(p) { return p.texto != null ? p.texto : D.guion(p); }
  function selPieza(id, fn, etq) { return A.piezas.length ? U.sel(A.piezas.map(function (p) { return [p.id, p.titulo || '(sin título)']; }), id, fn, etq) : U.vacio('Aún no hay piezas.'); }
  var COLOR = { alta: 'tr-mal', media: 'tr-av', baja: '' };
  function bandera(b) { return h('div', { cls: 'tr-nota ' + (COLOR[b.severidad] || ''), role: b.severidad === 'alta' ? 'alert' : null }, [h('b', { txt: b.id.replace('_', ' ') + ' · ' + b.severidad }), b.coincide ? h('span', { txt: ' «' + b.coincide + '»' }) : null, h('div', { txt: b.consejo })]); }

  function riesgos(c) {
    var o = { id: A.piezas[0] ? A.piezas[0].id : '', libre: '' }, res = h('div', {}), todo = h('div', {});
    c.appendChild(U.nota('Estas banderas son heurísticas: detectan frases típicas de riesgo, no sustituyen la revisión humana ni el consejo legal o médico.'));
    c.appendChild(U.panel('Revisar una pieza', [selPieza(o.id, function (v) { o.id = v; rev(); }, 'Pieza'), res]));
    c.appendChild(U.panel('Revisar un texto pegado', [U.txt(o, 'libre', 'Texto', { area: true, filas: 4 }), U.acciones([U.btn('Revisar texto', function () { var l = S.banderas(o.libre); res2.textContent = ''; if (!l.length) res2.appendChild(U.nota('Sin banderas detectadas (no es una garantía).', 'tr-ok')); l.forEach(function (b) { res2.appendChild(bandera(b)); }); })])]));
    var res2 = h('div', { role: 'status' }); c.lastChild.appendChild(res2);
    c.appendChild(U.panel('Todas las piezas', [U.acciones([U.btn('Revisar todo el proyecto', function () { todo.textContent = ''; var f = A.piezas.map(function (p) { var l = S.evaluarPieza(p); return [p.titulo || '(sin título)', l.filter(function (b) { return b.severidad === 'alta'; }).length, l.filter(function (b) { return b.severidad === 'media'; }).length, l.map(function (b) { return b.id; }).join(', ') || '—']; }); todo.appendChild(f.length ? g.CGraf.tabla(['Pieza', 'Altas', 'Medias', 'Banderas'], f) : U.vacio('Sin piezas.')); })]), todo]));
    function rev() { res.textContent = ''; var p = A.pieza(o.id); if (!p) return; var l = S.evaluarPieza(p); if (!l.length) res.appendChild(U.nota('Sin banderas detectadas en título, gancho, descripción y guion (no es una garantía).', 'tr-ok')); l.forEach(function (b) { res.appendChild(bandera(b)); }); }
    rev();
  }
  function originalidad(c) {
    var o = { umbral: 0.2, id: A.piezas[0] ? A.piezas[0].id : '', fuente: '' }, par = h('div', {}), rep = h('div', { role: 'status' }), src = h('div', { role: 'status' });
    c.appendChild(U.nota('Compara solo tus propias piezas y la fuente que tú pegues. No busca en internet ni detecta plagio general; sirve para evitar repetirte y para vigilar copias literales.'));
    var u = h('input', { type: 'range', min: 0.05, max: 0.9, step: 0.05, value: o.umbral, id: 'cia-umbral', 'aria-label': 'Umbral de similitud' }), eu = h('output', { for: 'cia-umbral', txt: '20 %' });
    u.addEventListener('input', function () { o.umbral = +u.value; eu.textContent = Math.round(o.umbral * 100) + ' %'; pintar(); });
    c.appendChild(U.panel('Similitud entre mis piezas', [U.campo('Umbral de aviso', h('div', {}, [u, eu])), par]));
    function pintar() {
      par.textContent = ''; var cand = A.piezas.filter(function (p) { return PL.palabras(txt(p)) >= 20; }).map(function (p) { return { id: p.id, nombre: p.titulo, texto: txt(p) }; }), l = S.parejas(cand, o.umbral);
      if (cand.length < 2) { par.appendChild(U.vacio('Necesitas al menos dos piezas con 20 palabras o más de guion.')); return; } if (!l.length) { par.appendChild(U.nota('Ningún par supera el ' + Math.round(o.umbral * 100) + ' % de similitud entre ' + cand.length + ' piezas.', 'tr-ok')); return; }
      par.appendChild(g.CGraf.tabla(['Pieza A', 'Pieza B', 'Similitud', 'Nivel'], l.map(function (x) { return [x.nombreA, x.nombreB, Math.round(x.similitud * 100) + ' %', S.nivel(x.similitud)]; })));
    }
    c.appendChild(U.panel('Una pieza en detalle', [selPieza(o.id, function (v) { o.id = v; det(); }, 'Pieza'), rep, U.txt(o, 'fuente', 'Pega una fuente para comparar (artículo, guion de otro, letra…)', { area: true, filas: 4 }), U.acciones([U.btn('Comparar con la fuente', function () { var p = A.pieza(o.id); if (!p) return; var r = S.contraFuente(txt(p), o.fuente); src.textContent = ''; src.appendChild(U.nota('Texto compartido (frases de 5 palabras): ' + r.porcentajeCopiado + ' % · tramo literal más largo: ' + r.tramo.palabras + ' palabras' + (r.tramo.palabras ? ' («' + r.tramo.texto.slice(0, 120) + '…»)' : '') + ' · riesgo ' + r.riesgo + '.', r.riesgo === 'alto' ? 'tr-mal' : r.riesgo === 'medio' ? 'tr-av' : 'tr-ok')); })]), src]));
    function det() { rep.textContent = ''; var p = A.pieza(o.id); if (!p) return; var t = txt(p), r = S.repetidas(t, 4), dv = S.diversidad(t); rep.appendChild(U.nota('Diversidad léxica: ' + dv + ' (palabras distintas / totales; bajo ≈ repetitivo)' + (PL.palabras(t) < 20 ? ' · texto corto, poco fiable.' : ''))); if (r.length) rep.appendChild(h('ul', {}, r.map(function (x) { return h('li', { txt: '«' + x.frase + '» ×' + x.veces }); }))); else rep.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Sin frases de 4 palabras repetidas.' })); }
    pintar(); det();
  }
  function divulgacion(c) {
    var o = { id: A.piezas[0] ? A.piezas[0].id : '' }, ed = h('div', {}), tabla = h('div', {});
    c.appendChild(U.nota('Registra qué partes de cada pieza se hicieron con IA. Algunas plataformas y leyes exigen avisar cuando el contenido realista es sintético; este registro te ayuda a cumplirlo y a ser transparente con tu audiencia.'));
    c.appendChild(U.panel('Registro por pieza', [selPieza(o.id, function (v) { o.id = v; pint(); }, 'Pieza'), ed]));
    function pint() {
      ed.textContent = ''; var p = A.pieza(o.id); if (!p) return; var d = p.divulgacion = p.divulgacion || {}, gd = function () { return A.guardarPieza(p); };
      var rad = h('div', { role: 'radiogroup', 'aria-label': '¿Se usó IA?' }, [['true', 'Sí, se usó IA'], ['false', 'No se usó IA']].map(function (x) { var r = h('input', { type: 'radio', name: 'cia-ia', id: 'cia-ia-' + x[0], value: x[0] }); r.checked = String(d.ia !== false) === x[0]; r.addEventListener('change', function () { d.ia = x[0] === 'true'; gd(); pint(); }); return h('label', { cls: 'tr-chk', for: r.id }, [r, x[1]]); }));
      ed.appendChild(rad);
      if (d.ia !== false) { PARTES.forEach(function (x) { ed.appendChild(U.chk(d, x[0], x[1], gd)); }); ed.appendChild(U.chk(d, 'etiquetada', 'Marqué la etiqueta de contenido sintético / IA en la plataforma', gd)); ed.appendChild(U.txt(d, 'herramientas', 'Herramientas usadas', { ph: 'Ej.: modelo de texto, generador de imágenes, voz sintética' }, gd)); }
      ed.appendChild(U.txt(d, 'nota', 'Notas (licencias, consentimientos)', { area: true, filas: 2 }, gd));
      var f = PL.divulgacionTexto(d, p.canal); if (d.ia !== false) ed.appendChild(h('div', {}, [h('p', { cls: 'tr-nota', txt: f }), U.copiarBtn(f, 'Copiar frase de divulgación')]));
      var b = S.evaluarPieza(p).filter(function (x) { return x.id === 'divulgacion'; }); if (b.length) ed.appendChild(bandera(b[0]));
      tab();
    }
    c.appendChild(U.panel('Registro del proyecto', [tabla, U.acciones([U.btn('Descargar registro (CSV)', function () { U.bajar('divulgacion-ia.csv', '﻿' + g.CSV.generar(A.piezas.map(function (p) { var d = p.divulgacion || {}; return { pieza: p.titulo, canal: p.canal, fecha: p.fecha, ia: d.ia === false ? 'no' : 'sí', partes: PARTES.filter(function (x) { return d[x[0]]; }).map(function (x) { return x[1]; }).join(' | '), etiquetada: d.etiquetada ? 'sí' : 'no', herramientas: d.herramientas || '', nota: d.nota || '' }; }), ['pieza', 'canal', 'fecha', 'ia', 'partes', 'etiquetada', 'herramientas', 'nota']), 'text/csv'); })])]));
    function tab() { tabla.textContent = ''; if (!A.piezas.length) { tabla.appendChild(U.vacio('Sin piezas.')); return; } tabla.appendChild(g.CGraf.tabla(['Pieza', 'IA', 'Partes', 'Etiquetada'], A.piezas.map(function (p) { var d = p.divulgacion || {}; return [p.titulo || '(sin título)', d.ia === false ? 'no' : 'sí', PARTES.filter(function (x) { return d[x[0]]; }).map(function (x) { return x[1]; }).join(', ') || '—', d.ia === false ? '—' : d.etiquetada ? 'sí' : 'no']; }))); }
    var pol = A.canales().length ? A.canales() : Object.keys(PL.CANALES);
    c.appendChild(U.panel('Reglas de plataforma (resumen)', [U.nota('Las políticas cambian: confirma siempre en la página oficial de cada plataforma. Esto es un resumen orientativo, no asesoría legal.', 'tr-av')].concat(pol.map(function (id) { var ch = PL.CANALES[id]; return h('div', { cls: 'cia-tarjeta' }, [h('b', { txt: ch.nombre }), h('p', { txt: ch.politica })]); }))));
    pint();
  }
  Q.iniciar = function (cont) {
    sub = Q.sub = U.subpestanas(cont, 'Secciones de calidad', [['riesgos', 'Riesgos', riesgos], ['originalidad', 'Originalidad', originalidad], ['divulgacion', 'Divulgación de IA', divulgacion]]);
    A.on('proyecto', function () { sub.refrescar(); });
  };
  g.CCalidad = Q;
})(window);
