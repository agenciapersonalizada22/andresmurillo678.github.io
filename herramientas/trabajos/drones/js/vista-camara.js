/* Vista Camara: seleccion de equipo, base de datos editable y calculadoras. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, A = g.DronApp, Cal = g.DronCalc, D = g.DronDatos, Cat = g.DronCatalogo;
  const ui = {}, U = { tipo: 'camara', sel: null };
  const COB = Object.keys(Cal.COBERTURA).map(k => [k, k]);
  const campos = {
    camara: [['nombre', 'Nombre', 't'], ['sw', 'Sensor, ancho (mm)', 'n'], ['sh', 'Sensor, alto (mm)', 'n'], ['pw', 'Píxeles de ancho', 'n'], ['ph', 'Píxeles de alto', 'n'], ['mont', 'Montura', 'mont'], ['focal', 'Focal fija (mm)', 'n'], ['apertura', 'Apertura fija (f/)', 'n'], ['fps', 'FPS máximos', 'n'], ['intervaloMin', 'Intervalo mínimo entre fotos (s)', 'n'], ['isoBase', 'ISO base', 'n'], ['nota', 'Notas', 't']],
    lente: [['nombre', 'Nombre', 't'], ['mont', 'Montura', 'mont2'], ['focal', 'Focal (mm)', 'n'], ['apertura', 'Apertura máxima (f/ o T)', 'n'], ['cobertura', 'Cobertura del círculo de imagen', COB], ['nota', 'Notas', 't']],
    nd: [['nombre', 'Nombre', 't'], ['stops', 'Pasos de luz (stops)', 'n'], ['filtro', 'Tipo', [['ND', 'ND'], ['CPL', 'CPL'], ['ND/PL', 'ND/PL'], ['VND', 'ND variable']]]],
    gimbal: [['nombre', 'Nombre', 't'], ['carga', 'Carga máxima (g)', 'n'], ['ejes', 'Ejes', 'n'], ['nota', 'Notas', 't']],
    montura: [['nombre', 'Nombre', 't'], ['ffd', 'Distancia de registro (mm)', 'n'], ['cobertura', 'Formato nativo', COB]]
  };
  const nuevoDe = tipo => ({ camara: { nombre: 'Mi cámara', sw: 13.2, sh: 8.8, pw: 5472, ph: 3648, mont: 'fija', focal: 8.8, apertura: 2.8, fps: 60, intervaloMin: 2, isoBase: 100, nota: '' }, lente: { nombre: 'Mi lente', mont: 'EF', focal: 35, apertura: 2, cobertura: 'FF', nota: '' }, nd: { nombre: 'ND32', stops: 5, filtro: 'ND' }, gimbal: { nombre: 'Mi gimbal', carga: 1000, ejes: 3, nota: '' }, montura: { nombre: 'Mi montura', ffd: 30, cobertura: 'FF' } }[tipo]);
  const monturas = () => A.est.equipo.filter(x => x.tipo === 'montura');
  const montDe = nombre => monturas().filter(x => x.nombre === nombre)[0] || null;
  /* ---- selector de camara/lente ---- */
  function pintarSel() {
    const c = ui.sel; c.textContent = ''; const s = A.est.proy.camSel, cams = A.est.equipo.filter(x => x.tipo === 'camara'), lens = A.est.equipo.filter(x => x.tipo === 'lente'), cam = A.item(s.cam) || cams[0];
    const sc = A.selector('Cámara', cams.map(x => [x.id, x.nombre]), cam ? cam.id : '', v => { s.cam = v; A.cambio('camara'); pintarSel(); });
    c.appendChild(sc.wrap);
    const fija = !cam || !cam.mont || cam.mont === 'fija';
    if (!fija) {
      const cm = montDe(cam.mont), ops = [['', '— sin lente —']].concat(lens.map(l => { const lm = montDe(l.mont), cp = lm && cm ? Cal.compatMontura(lm, cm) : null; return [l.id, l.nombre + (cp ? cp.tipo === 'directo' ? '' : cp.tipo === 'adaptador' ? ' (adaptador ' + cp.espesor + ' mm)' : ' (no compatible)' : '')]; }));
      c.appendChild(A.selector('Lente', ops, s.len || '', v => { s.len = v; A.cambio('camara'); pintarSel(); }).wrap);
      c.appendChild(A.campo('Factor del reductor de focal (1 = sin él; 0,71 = Speed Booster)', s.factor, v => { s.factor = v; A.cambio('camara'); pintarResumen(); }, { min: 0.3, max: 2 }).wrap);
    } else c.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Cámara de dron con óptica fija: ' + (cam ? cam.focal + ' mm, f/' + cam.apertura : '') + '.' }));
    ui.resumen = h('div', { 'aria-live': 'polite' }); c.appendChild(ui.resumen); pintarResumen();
  }
  function pintarResumen() {
    const r = ui.resumen; if (!r) return; r.textContent = ''; const cam = A.camara(); if (!cam) return;
    if (!cam.f) { r.appendChild(h('div', { cls: 'tr-nota tr-av', txt: 'Elige una lente: sin distancia focal no se pueden calcular el campo de visión ni el GSD.' })); return; }
    const fov = Cal.fovCamara(cam.sw, cam.sh, cam.f), li = (e, v) => h('li', {}, [h('b', { txt: e + ': ' }), v]);
    r.appendChild(h('ul', { cls: 'dr-res' }, [li('Campo de visión', A.f1(fov.h) + '° horizontal · ' + A.f1(fov.v) + '° vertical · ' + A.f1(fov.d) + '° diagonal'), li('Factor de recorte', '×' + A.f1(Cal.recorte(cam.sw, cam.sh) / (cam.fija ? 1 : cam.factor), 2) + ' · focal equivalente full frame ' + A.f1(Cal.focalEquiv(cam.f, cam.sw, cam.sh), 1) + ' mm'), li('Resolución', cam.pw + ' × ' + cam.ph + ' px (' + A.f1(cam.pw * cam.ph / 1e6, 1) + ' MP)'), li('GSD a 100 m', A.f1(Cal.gsd(cam.sw, cam.f, cam.pw, 100), 2) + ' cm/px')]));
    if (!cam.fija && cam.len) { const cm = montDe(cam.cam.mont), lm = montDe(cam.len.mont), cp = cm && lm ? Cal.compatMontura(lm, cm) : null; if (cp) r.appendChild(h('div', { cls: 'tr-nota ' + (cp.ok ? '' : 'tr-mal'), txt: cp.tipo === 'directo' ? 'Montura directa.' : cp.notas.join(' ') })); if (Cal.vineteo(cam.len.cobertura, cam.sw, cam.sh)) r.appendChild(h('div', { cls: 'tr-nota tr-av', txt: 'La lente cubre «' + cam.len.cobertura + '», menos que este sensor: habrá viñeteo o hay que recortar.' })); }
  }
  /* ---- editor de equipo ---- */
  let debE = 0;
  function guardarEq(it) { clearTimeout(debE); debE = setTimeout(async () => { await D.guardarEquipo(Object.assign({}, it)); await A.cargarCatalogos(); pintarLista(); pintarSel(); A.emit('camara'); }, 500); }
  function pintarLista() {
    const l = ui.lista; l.textContent = ''; const items = A.est.equipo.filter(x => x.tipo === U.tipo);
    items.forEach(it => l.appendChild(h('li', {}, [h('button', { type: 'button', cls: 'dr-wp' + (U.sel === it.id ? ' dr-sel' : ''), 'aria-pressed': U.sel === it.id ? 'true' : 'false', on: { click: () => { U.sel = it.id; pintarLista(); pintarForm(); } } }, [h('span', { txt: it.nombre + (it.editado ? ' ✎' : '') + (it.base ? '' : ' ★') })])])));
    if (!items.length) l.appendChild(h('li', { cls: 'tr-vacio', txt: 'Sin elementos.' }));
  }
  function pintarForm() {
    const f = ui.form; f.textContent = ''; const it = A.est.equipo.filter(x => x.id === U.sel)[0]; if (!it) { f.appendChild(h('p', { cls: 'tr-vacio', txt: 'Elige un elemento o crea uno nuevo.' })); return; }
    const fila = h('div', { cls: 'tr-fila' });
    campos[it.tipo].forEach(([k, etq, t]) => {
      let w;
      if (t === 't') w = A.campo(etq, it[k] || '', v => { it[k] = v; guardarEq(it); }, { tipo: 'text', maxlength: 120 }).wrap;
      else if (t === 'n') w = A.campo(etq, it[k], v => { it[k] = v; guardarEq(it); }).wrap;
      else { const ops = t === 'mont' ? [['fija', 'Óptica fija (dron)']].concat(monturas().map(x => [x.nombre, x.nombre])) : t === 'mont2' ? monturas().map(x => [x.nombre, x.nombre]) : t; w = A.selector(etq, ops, it[k] != null ? it[k] : ops[0][0], v => { it[k] = v; guardarEq(it); }).wrap; }
      fila.appendChild(w);
    });
    f.appendChild(h('h3', { txt: it.nombre })); f.appendChild(fila);
    f.appendChild(h('div', { cls: 'tr-acciones' }, [A.boton('Duplicar', async () => { const c = Object.assign({}, it, { id: T.uid(), nombre: it.nombre + ' (copia)' }); delete c.base; delete c.editado; await D.guardarEquipo(c); await A.cargarCatalogos(); U.sel = c.id; pintarLista(); pintarForm(); }, 'tr-chico'),
      it.editado ? A.boton('Restablecer original', async () => { await D.restablecerEquipo(it.id); await A.cargarCatalogos(); pintarLista(); pintarForm(); pintarSel(); }, 'tr-chico') : null,
      A.boton(it.base ? 'Ocultar' : 'Eliminar', async () => { if (!confirm('¿' + (it.base ? 'Ocultar' : 'Eliminar') + ' «' + it.nombre + '»?')) return; await D.borrarEquipo(it); await A.cargarCatalogos(); U.sel = null; pintarLista(); pintarForm(); pintarSel(); }, 'tr-chico tr-peli')]));
  }
  function equipo(c) {
    ui.tipos = h('div', { cls: 'dr-seg', role: 'group', 'aria-label': 'Tipo de equipo' }, Cat.TIPOS.map(([k, n]) => h('button', { type: 'button', cls: 'tr-btn tr-chico', 'aria-pressed': k === U.tipo ? 'true' : 'false', 'data-k': k, txt: n, on: { click: e => { U.tipo = k; U.sel = null; ui.tipos.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-k') === k)); pintarLista(); pintarForm(); } } })));
    ui.lista = h('ul', { cls: 'dr-wps', 'aria-label': 'Equipo' }); ui.form = h('div');
    c.appendChild(h('div', { cls: 'tr-dos' }, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Mi equipo' }), h('p', { cls: 'tr-ayuda', txt: Cat.AVISO_CAT + ' ★ = creado por ti, ✎ = editado.' }), ui.tipos, ui.lista, h('div', { cls: 'tr-acciones' }, [A.boton('Nuevo', async () => { const n = Object.assign({ id: T.uid(), tipo: U.tipo }, nuevoDe(U.tipo)); await D.guardarEquipo(n); await A.cargarCatalogos(); U.sel = n.id; pintarLista(); pintarForm(); }, 'tr-pri tr-chico')])]), h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Detalle' }), ui.form])]));
    pintarLista(); pintarForm();
  }
  /* ---- calculadoras ---- */
  function res(out, filas, nota) { out.appendChild(h('ul', { cls: 'dr-res' }, filas.map(([e, v]) => h('li', {}, [h('b', { txt: e + ': ' }), v])))); if (nota) out.appendChild(h('div', { cls: 'tr-nota ' + (nota[0] || ''), txt: nota[1] })); }
  function calc(c, titulo, defs, fn, usar, abierto) {
    const det = h('details', { cls: 'tr-panel dr-det', open: abierto ? '' : null }, [h('summary', { txt: titulo })]), vals = {}, els = {}, out = h('div', { 'aria-live': 'polite' }), fila = h('div', { cls: 'tr-fila' });
    const run = () => { out.textContent = ''; try { fn(vals, out); } catch (e) { out.appendChild(h('p', { cls: 'tr-nota tr-mal', txt: e.message })); } };
    defs.forEach(([k, etq, ini, ops]) => { vals[k] = ini; const w = ops ? A.selector(etq, ops, ini, v => { vals[k] = v; run(); }) : A.campo(etq, ini, v => { vals[k] = v; run(); }); els[k] = w.el; fila.appendChild(w.wrap); });
    det.appendChild(fila);
    if (usar) det.appendChild(h('div', { cls: 'tr-acciones' }, [A.boton('Usar la cámara actual', () => { const o = usar(); if (!o) return A.aviso('Elige una cámara con focal.', 'error'); Object.keys(o).forEach(k => { vals[k] = o[k]; if (els[k]) els[k].value = o[k]; }); run(); }, 'tr-chico')]));
    det.appendChild(out); c.appendChild(det); run(); return det;
  }
  const usarCam = () => { const k = A.camara(); return k && k.f ? { sw: k.sw, sh: k.sh, f: k.f, pw: k.pw, ph: k.ph, N: k.apertura || 2.8 } : null; };
  const tan = a => Math.tan(a * Math.PI / 360);
  function calculadoras(c) {
    const k = A.camara() || {}, m = A.est.proy.mision, sw0 = k.sw || 13.2, sh0 = k.sh || 8.8, f0 = k.f || 8.8, pw0 = k.pw || 5472, ph0 = k.ph || 3648, N0 = k.apertura || 2.8;
    calc(c, 'Campo de visión y factor de recorte', [['sw', 'Sensor, ancho (mm)', sw0], ['sh', 'Sensor, alto (mm)', sh0], ['f', 'Focal (mm)', f0], ['d', 'Distancia al sujeto (m)', 20]], (v, o) => {
      const fv = Cal.fovCamara(v.sw, v.sh, v.f), cov = 2 * v.d * tan(fv.h), alt = 2 * v.d * tan(fv.v);
      res(o, [['Campo de visión', A.f1(fv.h) + '° H · ' + A.f1(fv.v) + '° V · ' + A.f1(fv.d) + '° diagonal'], ['Factor de recorte', '×' + A.f1(Cal.recorte(v.sw, v.sh), 2)], ['Focal equivalente full frame', A.f1(Cal.focalEquiv(v.f, v.sw, v.sh), 1) + ' mm'], ['Cobertura a ' + v.d + ' m', A.f1(cov) + ' m de ancho × ' + A.f1(alt) + ' m de alto']]);
    }, usarCam, true);
    calc(c, 'GSD y fotogrametría', [['sw', 'Sensor, ancho (mm)', sw0], ['sh', 'Sensor, alto (mm)', sh0], ['f', 'Focal (mm)', f0], ['pw', 'Píxeles de ancho', pw0], ['ph', 'Píxeles de alto', ph0], ['alt', 'Altura de vuelo (m)', 100], ['fr', 'Solape frontal (%)', Math.round(m.foto.frontal * 100)], ['la', 'Solape lateral (%)', Math.round(m.foto.lateral * 100)], ['vel', 'Velocidad (m/s)', m.vel], ['imin', 'Intervalo mín. de la cámara (s)', k.intervaloMin || 2], ['aw', 'Área: ancho (m)', 300], ['ah', 'Área: alto (m)', 200], ['gt', 'GSD deseado (cm/px)', 2]], (v, o) => {
      const r = Cal.fotogrametria({ sw: v.sw, sh: v.sh, f: v.f, pw: v.pw, ph: v.ph, intervaloMin: v.imin }, v.alt, v.fr / 100, v.la / 100, v.vel), a = Cal.areaMapeo(v.aw, v.ah, r.sepFotos, r.sepLineas);
      res(o, [['GSD', A.f1(r.gsd, 2) + ' cm/px'], ['Huella de una foto', A.f1(r.anchoHuella) + ' × ' + A.f1(r.altoHuella) + ' m'], ['Separación entre fotos / líneas', A.f1(r.sepFotos) + ' m / ' + A.f1(r.sepLineas) + ' m'], ['Intervalo de disparo', A.f1(r.intervalo, 1) + ' s a ' + v.vel + ' m/s'], ['Velocidad máxima para ese solape', A.f1(r.velMax, 1) + ' m/s'], ['Fotos por hectárea', Math.round(r.fotosHa)], ['Altura para el GSD deseado', A.f1(Cal.altParaGsd(v.gt, v.sw, v.f, v.pw), 1) + ' m'], ['Área ' + v.aw + '×' + v.ah + ' m', a.lineas + ' líneas, ≈ ' + a.fotos + ' fotos']],
        (r.velMax && v.vel > r.velMax) ? ['tr-av', 'A esa velocidad la cámara no alcanza el intervalo: baja la velocidad, la altura o el solape.'] : null);
    }, usarCam);
    calc(c, 'Regla de 180° y filtros ND', [['fps', 'Cuadros por segundo', 24], ['ang', 'Ángulo de obturador (°)', 180], ['ev', 'Escena', 15, Cal.ESCENAS.map(e => [e[1], e[0]])], ['iso', 'ISO', k.cam && k.cam.isoBase || 100], ['N', 'Apertura (f/)', N0]], (v, o) => {
      const r = Cal.ndPara(+v.ev, v.iso, v.N, v.fps, v.ang), nds = A.est.equipo.filter(x => x.tipo === 'nd' && x.filtro !== 'CPL').sort((a, b) => a.stops - b.stops), mejor = nds.filter(x => x.stops >= r.stops - 0.34)[0];
      res(o, [['Obturador', '1/' + Math.round(1 / r.obturador) + ' s'], ['Luz sobrante (ND necesario)', A.f1(r.stops, 1) + ' pasos'], ['Filtro sugerido', r.stops < 0.34 ? 'ninguno' : (mejor ? mejor.nombre + ' (' + mejor.stops + ' pasos)' : 'ND de ' + r.nd + ' pasos') + (mejor && mejor.stops - r.stops > 1 ? ' (cerrar apertura para compensar)' : '')]], ['', 'Con ' + v.fps + ' fps y 180°, el obturador es 1/' + Math.round(v.fps * 360 / v.ang) + ' s. Ajusta la apertura o el ISO si el filtro disponible no coincide.']);
    }, () => { const q = A.camara(); return q ? { fps: Math.min(24, q.fps), N: q.apertura || 2.8 } : null; });
    calc(c, 'Distancia hiperfocal', [['sw', 'Sensor, ancho (mm)', sw0], ['sh', 'Sensor, alto (mm)', sh0], ['f', 'Focal (mm)', f0], ['N', 'Apertura (f/)', N0], ['d', 'Distancia de enfoque (m)', 10]], (v, o) => {
      const cc = Cal.circuloConfusion(v.sw, v.sh), p = Cal.profundidad(v.f, v.N, cc, v.d * 1000);
      res(o, [['Círculo de confusión', A.f1(cc * 1000, 1) + ' µm (diagonal/1500)'], ['Hiperfocal', A.f1(p.H / 1000, 2) + ' m'], ['Enfocando a ' + v.d + ' m, nítido de', A.f1(p.cerca / 1000, 2) + ' m a ' + (isFinite(p.lejos) && p.lejos > 0 ? A.f1(p.lejos / 1000, 2) + ' m' : '∞')]]);
    }, usarCam);
    calc(c, 'ISO y apertura equivalentes', [['N1', 'Apertura actual (f/)', 2.8], ['t1', 'Obturador actual (1/x s)', 48], ['iso1', 'ISO actual', 100], ['N2', 'Apertura nueva (f/)', 5.6], ['t2', 'Obturador nuevo (1/x s)', 48]], (v, o) => {
      const iso = Cal.isoEquivalente(v.N1, 1 / v.t1, v.iso1, v.N2, 1 / v.t2); res(o, [['ISO para igual exposición', Math.round(iso)], ['Diferencia', A.f1(Math.log2(iso / v.iso1), 1) + ' pasos respecto al ISO actual']], iso > 6400 ? ['tr-av', 'ISO muy alto: más ruido. Considera un ND más débil o más luz.'] : null);
    });
    calc(c, 'Bitrate y almacenamiento', [['preset', 'Perfil', 100, [[50, '1080p 50 Mbps'], [100, '4K 30p 100 Mbps'], [150, '4K 60p 150 Mbps'], [200, '5,1K / 4K 120p 200 Mbps'], [400, 'ProRes / 400 Mbps']]], ['mbps', 'Bitrate (Mbps)', 100], ['gb', 'Tarjeta (GB)', 256], ['n', 'Número de tarjetas', 2]], (v, o) => {
      const mb = v.mbps; res(o, [['Consumo', A.f1(Cal.gbPorMinuto(mb), 2) + ' GB/min · ' + A.f1(Cal.gbPorHora(mb), 1) + ' GB/h'], ['Una tarjeta de ' + v.gb + ' GB', A.f1(Cal.minutosEnTarjeta(v.gb, mb), 0) + ' min'], [v.n + ' tarjeta(s)', A.f1(Cal.minutosEnTarjeta(v.gb * v.n, mb) / 60, 1) + ' h de grabación']], ['', 'Valores teóricos: la tarjeta real tiene ~7 % menos y el bitrate varía con la escena.']);
    });
    calcMonturas(c);
    calc(c, 'Dolly zoom (vértigo)', [['f1', 'Focal inicial (mm)', 24], ['d1', 'Distancia inicial al sujeto (m)', 10], ['d2', 'Distancia final (m)', 25], ['f2', 'Focal máxima disponible (mm)', 70]], (v, o) => {
      const f = Cal.dollyZoom(v.f1, v.d1, v.d2); res(o, [['Focal final para el mismo tamaño del sujeto', A.f1(f, 1) + ' mm'], ['Cambio de campo', A.f1(Cal.fov(36, v.f1)) + '° → ' + A.f1(Cal.fov(36, f)) + '° (full frame)']], f > v.f2 ? ['tr-av', 'Necesitas ' + A.f1(f, 1) + ' mm y solo tienes ' + v.f2 + ' mm: reduce la distancia final o usa recorte digital.'] : ['', 'Mantén la velocidad del dron constante y sube el zoom de forma lineal con la distancia.']);
    });
  }
  function calcMonturas(c) {
    const ms = monturas(), ops = ms.map(x => [x.nombre, x.nombre]), cm = A.item(A.est.proy.camSel.cam), cam0 = cm && cm.mont !== 'fija' ? cm.mont : 'E';
    calc(c, 'Adaptadores de montura y factor de recorte', [['lm', 'Montura de la lente', 'EF', ops], ['cm', 'Montura de la cámara', cam0, ops], ['cob', 'Cobertura de la lente', 'FF', COB], ['sw', 'Sensor, ancho (mm)', cm && cm.sw || 35.6], ['sh', 'Sensor, alto (mm)', cm && cm.sh || 23.8], ['fac', 'Reductor de focal (0,71 = Speed Booster)', 1], ['f', 'Focal (mm)', 50], ['N', 'Apertura (f/)', 1.8]], (v, o) => {
      const L = montDe(v.lm), C = montDe(v.cm), cp = Cal.compatMontura(L, C), eq = Cal.equivalente(v.f, v.N, v.sw, v.sh, v.fac);
      res(o, [['Compatibilidad', cp.tipo === 'directo' ? 'Montura directa' : cp.tipo === 'adaptador' ? 'Adaptador sin óptica de ' + cp.espesor + ' mm' : 'No es posible sin óptica'], ['Foco a infinito', cp.ok ? 'Sí' : 'No'], ['Recorte total', '×' + A.f1(eq.recorte, 2)], ['Focal efectiva', A.f1(eq.focal, 1) + ' mm (equiv. full frame ' + A.f1(eq.equiv35, 1) + ' mm)'], ['Apertura efectiva', 'f/' + A.f1(eq.apertura, 2)], ['Cobertura', Cal.vineteo(v.cob, v.sw, v.sh) ? 'La lente no cubre el sensor: viñeteo' : 'Cubre el sensor']], cp.ok ? ['', cp.notas.join(' ') + ' Comprueba además enfoque, diafragma y control electrónico del adaptador.'] : ['tr-mal', cp.notas.join(' ')]);
      const cuales = A.est.equipo.filter(x => x.tipo === 'lente').map(l => { const lm = montDe(l.mont), r = lm && C ? Cal.compatMontura(lm, C) : null; return [l.nombre, r ? (r.tipo === 'directo' ? 'directa' : r.tipo === 'adaptador' ? 'adaptador ' + r.espesor + ' mm' : 'no compatible') : '—']; });
      o.appendChild(h('h3', { txt: 'Tus lentes en una cámara ' + v.cm })); o.appendChild(h('ul', { cls: 'dr-res' }, cuales.map(([a, b]) => h('li', {}, [h('b', { txt: a + ': ' }), b]))));
    });
  }
  A.iniciarCamara = function () {
    const raiz = document.getElementById('v-camara'); ui.sel = h('div');
    raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Cámara y lente del proyecto' }), ui.sel]));
    A.sub(raiz, [['equipo', 'Mi equipo', equipo], ['calc', 'Calculadoras', c => { ui.calc = c; calculadoras(c); }]], 'cam');
    A.on('sub:cam', v => { if (v === 'calc') { ui.calc.textContent = ''; calculadoras(ui.calc); } });
    A.on('proyecto', () => { pintarSel(); }); A.on('catalogos', () => { pintarSel(); pintarLista(); }); pintarSel();
  };
})(window);
