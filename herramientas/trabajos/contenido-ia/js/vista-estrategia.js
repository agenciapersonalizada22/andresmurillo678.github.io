/* Vista «Estrategia»: nicho y propuesta de valor, audiencia, pilares, competencia, marca y biblia de estilo. window.CEstrategia */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, U = g.CUI, A = g.CApp, P = g.CIA.prompts, PL = g.CIA.plantillas, Ma = g.CIA.marca, Me = g.CIA.metricas, E = g.CIA.editorial, S = {}, sub;
  function gp() { A.guardarProyecto(); }
  function lista(cont, arr, vacio, fila) { cont.textContent = ''; if (!arr.length) cont.appendChild(U.vacio(vacio)); arr.forEach(function (x, i) { cont.appendChild(fila(x, i)); }); }

  function nicho(c) {
    var pr = A.proyecto, n = pr.nicho, ent = { intereses: '', tiempo: '5 horas por semana' }, res = h('div', {}), q = { publico: '', resultado: '', metodo: '', objecion: '' }, out = h('p', { cls: 'tr-nota', role: 'status', hidden: true });
    c.appendChild(U.panel('Nicho y propuesta de valor', [
      U.txt(n, 'tema', 'Tema o nicho', { ph: 'Ej.: cocina rápida para estudiantes' }, gp), U.txt(n, 'publico', 'Público objetivo', { ph: 'Ej.: universitarios con poco tiempo' }, gp),
      U.txt(n, 'propuesta', 'Propuesta de valor', { area: true, filas: 3, ph: 'Qué ganas el público y por qué contigo' }, gp), U.txt(n, 'diferenciador', 'Qué te diferencia', { ph: 'Ej.: recetas de 3 ingredientes con costo exacto' }, gp),
      U.fila([U.txt(n, 'tono', 'Tono', { ph: 'cercano, con humor' }, gp), U.txt(n, 'idioma', 'Idioma', {}, gp)])]));
    var campos = [['publico', 'Ayudo a… (público)'], ['resultado', 'a lograr… (resultado)'], ['metodo', 'mediante… (método)'], ['objecion', 'sin… (la objeción principal)']];
    c.appendChild(U.panel('Armar la propuesta (sin IA)', [h('p', { cls: 'tr-sub', txt: 'Completa las cuatro frases y se compone una propuesta clara que puedes usar arriba.' })].concat(campos.map(function (k) { return U.txt(q, k[0], k[1], {}); }), [U.acciones([U.btn('Componer propuesta', function () { var t = 'Ayudo a ' + (q.publico || '…') + ' a ' + (q.resultado || '…') + ' mediante ' + (q.metodo || '…') + (q.objecion ? ', sin ' + q.objecion : '') + '.'; out.hidden = false; out.textContent = t; n.propuesta = t; A.guardarProyecto(); T.aviso('Propuesta guardada en el nicho.'); })]), out])));
    c.appendChild(U.panel('Canales del proyecto', [h('p', { cls: 'tr-sub', txt: 'Elige dónde publicarás. Cada canal trae sus reglas de plataforma y su lista de comprobación.' }), h('div', { cls: 'cia-chips' }, Object.keys(PL.CANALES).map(function (id) {
      var ch = h('input', { type: 'checkbox', id: 'can-' + id }); ch.checked = pr.canales.indexOf(id) >= 0; ch.addEventListener('change', function () { pr.canales = Object.keys(PL.CANALES).filter(function (k) { return k === id ? ch.checked : pr.canales.indexOf(k) >= 0; }); gp(); A.emit('canales'); });
      return h('label', { cls: 'tr-chk cia-chip', for: ch.id, style: 'border-left:4px solid ' + PL.CANALES[id].color }, [ch, PL.CANALES[id].nombre]);
    }))]));
    c.appendChild(U.panel('Descubrir nichos con IA', [U.txt(ent, 'intereses', 'Tus intereses y habilidades', { area: true, filas: 3, ph: 'Ej.: cocino, edito video, me gustan los gadgets baratos' }), U.txt(ent, 'tiempo', 'Tiempo disponible', {}),
      U.acciones([U.iaBtn('Proponer 4 nichos', async function () { var r = await A.ia(P.nicho({ intereses: ent.intereses, tiempo: ent.tiempo, canales: pr.canales.join(', ') })), l = P.parsear.nichos(r.json); res.textContent = ''; if (!l.length) { res.appendChild(U.nota('La IA no devolvió un formato utilizable. Reintenta.', 'tr-av')); return; }
        l.forEach(function (x) { res.appendChild(h('div', { cls: 'cia-tarjeta' }, [h('h3', { txt: x.nombre }), h('p', { txt: x.propuesta }), h('p', { cls: 'tr-ayuda', txt: 'Público: ' + x.publico + ' · Diferenciador: ' + x.diferenciador + ' · Riesgo: ' + x.riesgo }), U.btn('Usar este nicho', function () { Object.assign(n, { tema: x.nombre, publico: x.publico, propuesta: x.propuesta, diferenciador: x.diferenciador }); A.guardarProyecto(); sub.refrescar(); T.aviso('Nicho aplicado.'); }, 'tr-chico')])); }); })]), res]));
  }
  function audiencia(c) {
    var pr = A.proyecto, cont = h('div', {});
    function pintar() { lista(cont, pr.personas, 'Aún no hay personas. Añade una o genera tres con IA.', function (p, i) { return h('div', { cls: 'cia-tarjeta' }, [U.fila([U.txt(p, 'nombre', 'Nombre del arquetipo', {}, gp), U.txt(p, 'edad', 'Edad', {}, gp)]), U.txt(p, 'dolores', 'Dolores y frustraciones', { area: true, filas: 2 }, gp), U.txt(p, 'deseos', 'Deseos y metas', { area: true, filas: 2 }, gp), U.txt(p, 'dondePasa', 'Dónde pasa el tiempo', {}, gp), U.btn('Quitar', function () { pr.personas.splice(i, 1); gp(); pintar(); }, 'tr-chico tr-peli')]); }); }
    c.appendChild(U.panel('Personas de audiencia', [h('p', { cls: 'tr-sub', txt: 'Arquetipos inventados a partir de lo que sabes de tu público; no son personas reales. Valídalos con comentarios y encuestas.' }), U.acciones([U.btn('Añadir persona', function () { pr.personas.push({ nombre: 'Persona ' + (pr.personas.length + 1), edad: '', dolores: '', deseos: '', dondePasa: '' }); gp(); pintar(); }), U.iaBtn('Generar 3 con IA', async function () { var r = await A.ia(P.personas(pr.nicho)), l = P.parsear.personas(r.json); if (!l.length) throw new Error('La IA no devolvió personas utilizables.'); pr.personas = pr.personas.concat(l); gp(); pintar(); })]), cont]));
    pintar();
  }
  function pilares(c) {
    var pr = A.proyecto, cont = h('div', {}), bal = h('div', {}), tot = h('p', { cls: 'tr-ayuda', role: 'status' });
    function pintar() {
      lista(cont, pr.pilares, 'Sin pilares. Define 3 a 5 temas que repetirás en tu canal.', function (p, i) { return h('div', { cls: 'cia-tarjeta' }, [U.fila([U.txt(p, 'nombre', 'Pilar', {}, function () { gp(); resumen(); }), U.txt(p, 'peso', 'Peso %', { tipo: 'number', min: 0, maxN: 100 }, function () { gp(); resumen(); })]), U.txt(p, 'desc', 'Descripción', {}, gp), U.btn('Quitar', function () { pr.pilares.splice(i, 1); gp(); pintar(); }, 'tr-chico tr-peli')]); }); resumen();
    }
    function resumen() {
      var s = pr.pilares.reduce(function (a, p) { return a + (+p.peso || 0); }, 0); tot.textContent = 'Suma de pesos: ' + s + ' % ' + (s === 100 ? '(correcto)' : '(idealmente 100)'); bal.textContent = '';
      var b = E.balancePilares(A.piezas, pr.pilares); if (b.length) { bal.appendChild(h('h3', { txt: 'Reparto real de tus piezas frente al objetivo' })); b.forEach(function (x) { bal.appendChild(h('div', { cls: 'cia-barra' }, [h('span', { txt: x.nombre + ': ' + x.real + ' % (objetivo ' + x.objetivo + ' %, ' + x.n + ' piezas)' + (x.alerta ? ' — desbalanceado' : '') }), h('div', { cls: 'cia-bar' }, [h('i', { style: 'width:' + Math.min(100, x.real) + '%' }), h('b', { style: 'left:' + Math.min(100, x.objetivo) + '%' })])])); }); }
    }
    c.appendChild(U.panel('Pilares de contenido', [h('p', { cls: 'tr-sub', txt: 'Los pilares evitan publicar al azar. Asigna un pilar a cada pieza y vigila el equilibrio.' }), U.acciones([U.btn('Añadir pilar', function () { pr.pilares.push({ nombre: 'Pilar ' + (pr.pilares.length + 1), desc: '', peso: 20 }); gp(); pintar(); }), U.iaBtn('Proponer pilares', async function () { var r = await A.ia(P.pilares(pr.nicho, pr.personas)), l = P.parsear.pilares(r.json); if (!l.length) throw new Error('La IA no devolvió pilares utilizables.'); pr.pilares = l; gp(); pintar(); })]), cont, tot, bal]));
    pintar();
  }
  function competencia(c) {
    var pr = A.proyecto, comp = pr.competencia, out = h('div', {}), ia = h('div', {}), mio = { seguidores: '' };
    function mostrar(r) {
      out.textContent = ''; if (!r.ok) { out.appendChild(U.nota(r.motivo, 'tr-av')); return; }
      out.appendChild(h('div', { cls: 'vi-stats' }, [['Mediana seguidores', r.medianaSeguidores], ['Mediana vistas', r.medianaVistas], ['Publican/semana', r.medianaFrecuencia], ['Vistas por seguidor', r.medianaAlcance], ['Mayor alcance relativo', r.mejorAlcance], ['Más grande', r.masGrande]].concat(r.tuPosicion ? [['Tu puesto', r.tuPosicion + ' de ' + r.deTotal]] : []).map(function (x) { return h('div', { cls: 'vi-stat' }, [h('span', { txt: x[0] }), h('b', { txt: String(x[1]) })]); })));
      out.appendChild(g.CGraf.tabla(['Canal', 'Seguidores', 'Vistas', 'Por semana', 'Vistas/seguidor'], r.filas.map(function (f) { return [f.nombre, f.seguidores, f.vistas, f.frecuencia, f.alcance]; }))); if (r.hueco) out.appendChild(U.nota(r.hueco));
    }
    function analizar() {
      var filas = T.csv(comp.texto || ''); if (filas.length < 2) { mostrar({ ok: false, motivo: 'Pega una tabla con encabezados (nombre, seguidores, vistas, frecuencia) separada por comas, punto y coma o tabulaciones.' }); return; }
      var cab = filas[0].map(function (x) { return x.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }), col = function (re) { return cab.findIndex(function (x) { return re.test(x); }); }, ci = { nombre: col(/nombre|canal|cuenta/), seguidores: col(/seguidor|suscriptor|follower/), vistas: col(/vista|view|alcance/), frecuencia: col(/frecuencia|semana|publicaciones/) };
      var datos = filas.slice(1).map(function (f) { var v = function (i) { return i >= 0 ? String(f[i] || '').replace(/[.\s]/g, '').replace(',', '.') : ''; }; return { nombre: ci.nombre >= 0 ? f[ci.nombre] : f[0], seguidores: v(ci.seguidores), vistas: v(ci.vistas), frecuencia: v(ci.frecuencia) }; });
      var r = Me.competencia(datos, mio.seguidores ? { seguidores: +mio.seguidores } : null); comp.analisis = r.ok ? { medianaSeguidores: r.medianaSeguidores, mejorAlcance: r.mejorAlcance } : null; gp(); mostrar(r);
    }
    c.appendChild(U.panel('Análisis de competencia (con tus datos)', [h('p', { cls: 'tr-sub', txt: 'Copia aquí datos que tú mismo recopilaste de canales parecidos (nombre, seguidores, vistas medias, publicaciones por semana). Esta herramienta no extrae datos de las plataformas ni inventa cifras.' }), U.txt(comp, 'texto', 'Datos pegados (tabla o notas)', { area: true, filas: 6, ph: 'nombre,seguidores,vistas,frecuencia\nCanal A,12000,3000,3\nCanal B,50000,9000,5' }, gp), U.txt(mio, 'seguidores', 'Tus seguidores actuales (opcional)', { tipo: 'number', min: 0 }),
      U.acciones([U.btn('Calcular comparativa', analizar), U.iaBtn('Análisis cualitativo con IA', async function () { if (!(comp.texto || '').trim()) throw new Error('Pega primero los datos de la competencia.'); var r = await A.ia(P.competencia(pr.nicho, comp.texto)), j = P.parsear.competencia(r.json); ia.textContent = ''; if (!j) { ia.appendChild(h('pre', { cls: 'cia-pre', txt: r.texto })); return; } [['Patrones', j.patrones], ['Huecos de contenido', j.huecos], ['Ángulos diferenciadores', j.angulos], ['Riesgos', j.riesgos]].forEach(function (s) { if (s[1].length) ia.appendChild(h('div', {}, [h('h3', { txt: s[0] }), h('ul', {}, s[1].map(function (x) { return h('li', { txt: x }); }))])); }); })]), out, ia]));
    if (comp.texto) analizar();
  }
  function marca(c) {
    var pr = A.proyecto, m = pr.marca, nombres = h('div', { cls: 'cia-chips' }), prev = h('div', { cls: 'cia-marca' }), pal = h('div', { cls: 'cia-paleta' }), ex = { palabras: '', estilo: 'mixto' };
    function recalcular() { m.paleta = Ma.paleta(m.color, m.esquema); }
    function pintar() {
      if (!m.paleta) recalcular(); var p = m.paleta; pal.textContent = '';
      [['Primario', p.primario], ['Secundario', p.secundario], ['Acento', p.acento], ['Fondo', p.fondo], ['Oscuro', p.oscuro], ['Texto', p.texto]].forEach(function (x) { pal.appendChild(h('button', { type: 'button', cls: 'cia-sw', style: 'background:' + x[1] + ';color:' + Ma.textoSobre(x[1]), title: 'Copiar ' + x[1], 'aria-label': x[0] + ' ' + x[1] + ', copiar', on: { click: function () { U.copiar(x[1]); } } }, [h('b', { txt: x[0] }), h('span', { txt: x[1].toUpperCase() })])); });
      var tp = Ma.tipografia(m.tipografia), mk = { nombre: m.nombre || 'Tu marca', lema: m.lema, forma: m.forma, tipografia: m.tipografia, paleta: p };
      prev.textContent = ''; var av = h('div', { cls: 'cia-av', role: 'img', 'aria-label': 'Vista previa del avatar' }), bn = h('div', { cls: 'cia-bn', role: 'img', 'aria-label': 'Vista previa del banner' }); av.innerHTML = Ma.avatarSVG(mk, 400); bn.innerHTML = Ma.bannerSVG(mk, 1500, 500); prev.appendChild(av); prev.appendChild(bn);
      prev.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Contraste texto/fondo ' + p.contrasteTexto + ':1 · texto sobre primario ' + p.contrastePrimario + ':1 (AA pide 4,5:1). Tipografías del sistema: sin descargas externas.' }));
      prev.appendChild(h('p', { style: 'font-family:' + tp.titulo + ';font-weight:' + tp.peso + ';font-size:22px;margin:6px 0', txt: m.nombre || 'Tu marca' }));
    }
    function cambio() { recalcular(); gp(); pintar(); }
    var palabras = (pr.nicho.tema || '');
    c.appendChild(U.panel('Nombre e identidad', [h('p', { cls: 'tr-sub', txt: 'Genera ideas de nombre a partir de palabras clave. Comprueba tú mismo que el nombre y el @usuario estén libres en cada plataforma y que no choquen con marcas registradas.' }), ex.palabras = palabras, U.txt(ex, 'palabras', 'Palabras clave (separadas por espacios)', { ph: 'cocina rápida estudiantes' }), U.sel([['mixto', 'Mixto'], ['compuesto', 'Compuesto'], ['corto', 'Corto inventado'], ['descriptivo', 'Descriptivo']], ex.estilo, function (v) { ex.estilo = v; }, 'Estilo de nombre'),
      U.acciones([U.btn('Generar 8 nombres', function () { var l = Ma.nombres(String(ex.palabras).split(/\s+/).filter(Boolean), ex.estilo, 8, String(Date.now())); nombres.textContent = ''; l.forEach(function (x) { nombres.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-chico cia-nombre', on: { click: function () { m.nombre = x.nombre; m.handle = x.handle; sub.refrescar(); gp(); T.aviso('Nombre elegido: ' + x.nombre); } } }, [x.nombre, h('small', { txt: ' ' + x.handle })])); }); })]), nombres,
      U.txt(m, 'nombre', 'Nombre de la marca', {}, cambio), U.fila([U.txt(m, 'handle', 'Usuario', { ph: '@tumarca' }, gp), U.txt(m, 'lema', 'Lema', {}, cambio)])].filter(function (x) { return typeof x !== 'string'; })));
    var color = h('input', { type: 'color', id: 'cia-color', 'aria-label': 'Color base' }); U.enlazar(m, 'color', color, cambio);
    c.appendChild(U.panel('Paleta, tipografía y forma', [U.campo('Color base', color), U.sel(Ma.ESQUEMAS, m.esquema, function (v) { m.esquema = v; cambio(); }, 'Esquema'), U.sel(Ma.TIPOGRAFIAS.map(function (t) { return [t.id, t.nombre]; }), m.tipografia, function (v) { m.tipografia = v; cambio(); }, 'Tipografía'), U.sel(Ma.FORMAS, m.forma, function (v) { m.forma = v; cambio(); }, 'Forma del avatar'), pal]));
    c.appendChild(U.panel('Avatar, banner y manual', [prev, U.acciones([
      U.btn('Avatar PNG', async function () { T.descargar(await U.svgAPng(Ma.avatarSVG(mk(), 800), 800, 800), 'avatar-' + T.nombreArchivo(m.nombre || 'marca') + '.png'); }), U.btn('Avatar SVG', function () { U.bajar('avatar.svg', Ma.avatarSVG(mk(), 800), 'image/svg+xml'); }),
      U.btn('Banner PNG', async function () { T.descargar(await U.svgAPng(Ma.bannerSVG(mk(), 1500, 500), 1500, 500), 'banner-' + T.nombreArchivo(m.nombre || 'marca') + '.png'); }), U.btn('Banner SVG', function () { U.bajar('banner.svg', Ma.bannerSVG(mk(), 1500, 500), 'image/svg+xml'); }),
      U.btn('Imprimir manual de marca', function () { U.imprimirHTML(Ma.manualHTML(mk(), pr.biblia, pr.nicho)); }, 'tr-pri'), U.btn('Descargar manual (HTML)', function () { U.bajar('manual-de-marca.html', Ma.manualHTML(mk(), pr.biblia, pr.nicho), 'text/html'); })])]));
    function mk() { if (!m.paleta) recalcular(); return { nombre: m.nombre || 'Tu marca', lema: m.lema, forma: m.forma, tipografia: m.tipografia, paleta: m.paleta }; }
    pintar();
  }
  function biblia(c) {
    var pr = A.proyecto, b = pr.biblia, prueba = { texto: '' }, res = h('div', { role: 'status' });
    c.appendChild(U.panel('Biblia de estilo (consistencia de personaje y voz)', [h('p', { cls: 'tr-sub', txt: 'Todo lo que escribas aquí se envía como contexto a la IA y a los prompts de imagen, voz y video, para que tu canal suene y se vea siempre igual.' }),
      U.txt(b, 'personaje', 'Personaje o presentador', { area: true, filas: 3, ph: 'Ej.: Zoe, ilustración de cocinera con delantal verde y gafas redondas (personaje ficticio, no una persona real)' }, gp), U.txt(b, 'voz', 'Voz de marca', { area: true, filas: 2, ph: 'cálida, directa, humor suave, frases cortas' }, gp), U.txt(b, 'tono', 'Tono', {}, gp),
      U.txt(b, 'estiloVisual', 'Estilo visual', { area: true, filas: 2, ph: 'ilustración plana, colores cálidos, fondo limpio' }, gp), U.txt(b, 'vocabulario', 'Vocabulario preferido (separado por comas)', { ph: 'fácil, rápido, paso a paso' }, gp), U.txt(b, 'vetos', 'Lo que nunca hacemos (una por línea o con comas)', { area: true, filas: 4 }, gp),
      U.txt(b, 'divulgacion', 'Frase de divulgación de IA', { area: true, filas: 2, ph: 'Este contenido se creó con ayuda de IA y fue revisado por una persona.' }, gp), U.acciones([U.btn('Usar frase sugerida', function () { b.divulgacion = PL.divulgacionTexto({ voz: true, imagenes: true, guion: true }); gp(); sub.refrescar(); })])]));
    c.appendChild(U.panel('Probar consistencia de un texto', [U.txt(prueba, 'texto', 'Pega un texto o guion', { area: true, filas: 4 }), U.acciones([U.btn('Revisar contra la biblia', function () { var r = Ma.consistencia(prueba.texto, b); res.textContent = ''; res.appendChild(U.nota(r.vetos.length ? 'Contiene lo que nunca hacemos: ' + r.vetos.join(', ') : 'No se encontraron vetos.', r.vetos.length ? 'tr-mal' : 'tr-ok')); res.appendChild(U.nota('Vocabulario usado: ' + (r.vocabularioUsado.join(', ') || 'ninguno') + (r.vocabularioFalta.length ? ' · aún no aparece: ' + r.vocabularioFalta.join(', ') : ''))); })]), res]));
  }
  S.iniciar = function (cont) {
    cont.appendChild(U.nota('Honestidad ante todo: estas herramientas organizan y aceleran tu trabajo, pero el contenido con IA debe aportar valor real, revisarse a mano y divulgarse cuando la plataforma o la ley lo pidan. No hay fórmula para garantizar audiencia ni ingresos.'));
    sub = S.sub = U.subpestanas(cont, 'Secciones de estrategia', [['nicho', 'Nicho', nicho], ['audiencia', 'Audiencia', audiencia], ['pilares', 'Pilares', pilares], ['competencia', 'Competencia', competencia], ['marca', 'Marca', marca], ['biblia', 'Biblia de estilo', biblia]]);
    A.on('proyecto', function () { sub.refrescar(); }); A.on('piezas', function () { if (sub.actual() === 'pilares') sub.refrescar(); });
  };
  g.CEstrategia = S;
})(window);
