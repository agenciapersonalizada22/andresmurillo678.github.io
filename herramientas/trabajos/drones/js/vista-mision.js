/* Vista Mision: mapa, waypoints, patrones, parametros, plano y exportacion. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, A = g.DronApp, Cal = g.DronCalc, P = g.DronPatrones, Geo = g.DronGeo, X = g.DronExport, D = g.DronDatos;
  const ui = {}, U = { pila: [], sel: -1, modo: 'anadir', snap: null }, m = () => A.est.proy.mision;
  const PAT = {
    orbita: [['radio', 'Radio (m)', 40], ['alt', 'Altura (m)', 30], ['n', 'Puntos por vuelta', 12], ['vueltas', 'Vueltas', 1], ['sentido', 'Sentido', ['horario', 'Horario'], ['anti', 'Antihorario']], ['altObjetivo', 'Altura del sujeto (m)', 0], ['altFin', 'Altura final (m, opcional)', '']],
    espiral: [['radio', 'Radio inicial (m)', 20], ['radioFin', 'Radio final (m)', 70], ['alt', 'Altura inicial (m)', 20], ['altFin', 'Altura final (m)', 60], ['vueltas', 'Vueltas', 2], ['n', 'Puntos por vuelta', 16], ['sentido', 'Sentido', ['horario', 'Horario'], ['anti', 'Antihorario']]],
    cuadricula: [['ancho', 'Ancho este-oeste (m)', 200], ['alto', 'Alto norte-sur (m)', 120], ['angulo', 'Giro del área (°)', 0], ['alt', 'Altura (m)', 60]],
    lineal: [['dist', 'Longitud (m)', 100], ['rumbo', 'Rumbo (°, 0 = norte)', 0], ['alt', 'Altura inicial (m)', 30], ['altFin', 'Altura final (m)', 30], ['n', 'Puntos', 2], ['giro', 'Cámara inicial (°)', -20], ['giroFin', 'Cámara final (°)', -20]],
    revelacion: [['dist', 'Longitud (m)', 80], ['rumbo', 'Rumbo (°, 0 = norte)', 0], ['alt', 'Altura inicial (m)', 5], ['altFin', 'Altura final (m)', 35], ['giro', 'Cámara inicial (°)', -70], ['giroFin', 'Cámara final (°)', -8], ['n', 'Puntos', 5]]
  };
  const pv = {};   // valores de patrones
  function snapshot() { U.pila.push(JSON.stringify(m().wps)); if (U.pila.length > 40) U.pila.shift(); ui.deshacer && (ui.deshacer.disabled = false); }
  function listoCambio(editor) { A.cambio('mision'); if (editor) pintarEditor(); }
  function colorDe(i) { return i === U.sel ? '#f08c00' : '#d9480f'; }
  function capas(ctx, M) {
    const w = m().wps, cs = (getComputedStyle(ui.canvas).getPropertyValue('--mapa-ruta') || '#d9480f').trim() || '#d9480f';
    const [cx, cy] = M.px(M.vista.cx, M.vista.cy); ctx.strokeStyle = 'rgba(120,120,140,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke();
    if (!w.length) return;
    const pts = [{ x: 0, y: 0 }].concat(w); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = cs; ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = M.px(p.x, p.y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    if (m().retorno) { ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); const [x1, y1] = M.px(w[w.length - 1].x, w[w.length - 1].y), [x2, y2] = M.px(0, 0); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); }
    w.forEach((p, i) => {   // flechas de sentido
      if (i === 0) return; const a = w[i - 1], [x1, y1] = M.px(a.x, a.y), [x2, y2] = M.px(p.x, p.y), L = Math.hypot(x2 - x1, y2 - y1); if (L < 40) return;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, an = Math.atan2(y2 - y1, x2 - x1); ctx.fillStyle = cs; ctx.beginPath(); ctx.moveTo(mx + Math.cos(an) * 6, my + Math.sin(an) * 6); ctx.lineTo(mx + Math.cos(an + 2.5) * 6, my + Math.sin(an + 2.5) * 6); ctx.lineTo(mx + Math.cos(an - 2.5) * 6, my + Math.sin(an - 2.5) * 6); ctx.fill();
    });
    const paso = w.length > 80 ? Math.ceil(w.length / 60) : 1;
    w.forEach((p, i) => {
      if (i !== U.sel && i % paso && i !== w.length - 1) return; const [x, y] = M.px(p.x, p.y), r = i === U.sel ? 12 : 10;
      if (i === U.sel && p.rumbo != null) { const a = p.rumbo * Math.PI / 180; ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * 28, y - Math.cos(a) * 28); ctx.stroke(); }
      ctx.fillStyle = colorDe(i); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), x, y + 0.5);
      if (p.accion && p.accion !== 'ninguna' || p.fotoCada > 0) { ctx.fillStyle = '#1864ab'; ctx.beginPath(); ctx.arc(x + r, y - r, 4, 0, 7); ctx.fill(); }
    });
  }
  function golpe(sx, sy, M) { const w = m().wps; let mejor = null, d0 = 18; w.forEach((p, i) => { const [x, y] = M.px(p.x, p.y), d = Math.hypot(x - sx, y - sy); if (d < d0) { d0 = d; mejor = i; } }); if (mejor != null) U.snap = JSON.stringify(w); return mejor; }
  function pintarTodo() { ui.mapa.dibujar(); pintarStats(); pintarLista(); }
  function anadir(x, y) {
    snapshot(); const w = m().wps, ult = w[w.length - 1];
    w.push(P.wp({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, alt: ult ? ult.alt : m().altDef, vel: ult ? ult.vel : m().vel, giro: ult ? ult.giro : -30 }));
    U.sel = w.length - 1; A.cambio('mision'); pintarEditor(); A.logro('primer_waypoint');
  }
  function quitar(i) { if (i < 0) return; snapshot(); m().wps.splice(i, 1); U.sel = Math.min(U.sel, m().wps.length - 1); A.cambio('mision'); pintarEditor(); }
  function mover(i, x, y) { const p = m().wps[i]; if (!p) return; p.x = Math.round(x * 10) / 10; p.y = Math.round(y * 10) / 10; U.sel = i; A.guardar(); pintarTodo(); if (ui.ed) { const a = ui.ed.querySelector('[data-k=x]'), b = ui.ed.querySelector('[data-k=y]'); if (a) a.value = p.x; if (b) b.value = p.y; } }
  function nudge(dx, dy) { const p = m().wps[U.sel]; if (!p) return; snapshot(); const s = Cal.num(ui.paso && ui.paso.value, 5); p.x = Math.round((p.x + dx * s) * 10) / 10; p.y = Math.round((p.y + dy * s) * 10) / 10; A.cambio('mision'); pintarEditor(); }
  /* ---- panel de estadisticas ---- */
  function pintarStats() {
    if (!ui.stats) return; const s = A.estadisticas(), f = A.fotogrametria(), tile = (e, v, sub, cls) => h('div', { cls: 'dr-tile ' + (cls || '') }, [h('div', { cls: 'dr-t-v', txt: v }), h('div', { cls: 'dr-t-e', txt: e }), sub ? h('div', { cls: 'tr-ayuda', txt: sub }) : null]);
    ui.stats.textContent = '';
    ui.stats.appendChild(h('div', { cls: 'dr-tiles' }, [tile('Distancia', s.distancia >= 1000 ? A.f1(s.distancia / 1000, 2) + ' km' : Math.round(s.distancia) + ' m', '3D: ' + Math.round(s.distancia3d) + ' m'), tile('Duración', s.vacia ? '—' : A.min(s.duracion), 'min:seg con retorno'),
      tile('Batería', s.vacia ? '—' : Math.round(s.bateriaPct) + ' %', A.f1(s.energiaWh, 1) + ' Wh', s.bateriaPct > 100 ? 'dr-mal' : s.bateriaPct > 80 ? 'dr-av' : ''), tile('Altura máx.', Math.round(s.altMax) + ' m', 'a ' + Math.round(s.distMaxHome) + ' m máx. del despegue'),
      tile('Fotos', String(s.fotos), s.fotos ? 'estimadas' : 'añade acciones de foto'), tile('GSD', f ? A.f1(f.gsd, 2) + ' cm/px' : '—', f ? 'huella ' + Math.round(f.anchoHuella) + '×' + Math.round(f.altoHuella) + ' m a ' + Math.round(f.alt) + ' m' : 'elige cámara con focal')]));
    const l = h('ul', { cls: 'dr-lista-av' }); s.avisos.forEach(a => l.appendChild(h('li', { cls: 'tr-nota tr-' + (a.n === 'mal' ? 'mal' : 'av'), txt: a.t }))); if (!s.avisos.length) l.appendChild(h('li', { cls: 'tr-nota tr-ok', txt: 'Sin avisos con el perfil «' + ((A.perfil() || {}).nombre || '') + '». Verifica siempre la ley local.' })); ui.stats.appendChild(l);
    if (f) ui.stats.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Fotogrametría (' + f.nombre + '): líneas cada ' + A.f1(f.sepLineas, 1) + ' m, fotos cada ' + A.f1(f.sepFotos, 1) + ' m' + (f.intervalo ? ' (cada ' + A.f1(f.intervalo, 1) + ' s a ' + m().vel + ' m/s)' : '') + ', velocidad máx. ' + A.f1(f.velMax, 1) + ' m/s. Solape frontal ' + Math.round(m().foto.frontal * 100) + ' %, lateral ' + Math.round(m().foto.lateral * 100) + ' %.' }));
  }
  function pintarLista() {
    if (!ui.lista) return; ui.lista.textContent = ''; const w = m().wps;
    if (!w.length) { ui.lista.appendChild(h('li', { cls: 'tr-vacio', txt: 'Sin waypoints.' })); return; }
    w.forEach((p, i) => ui.lista.appendChild(h('li', {}, [h('button', { type: 'button', cls: 'dr-wp' + (i === U.sel ? ' dr-sel' : ''), 'aria-pressed': i === U.sel ? 'true' : 'false', on: { click: () => { U.sel = i; pintarEditor(); ui.mapa.dibujar(); pintarLista(); } } }, [h('b', { txt: String(i + 1) }), h('span', { txt: Math.round(p.alt) + ' m · ' + A.f1(p.vel) + ' m/s · cám. ' + Math.round(p.giro) + '°' + (p.accion !== 'ninguna' ? ' · ' + p.accion.replace('_', ' ') : '') + (p.fotoCada > 0 ? ' · foto/' + A.f1(p.fotoCada) + ' m' : '') })])])));
  }
  function pintarEditor() {
    const e = ui.ed; e.textContent = ''; const w = m().wps, p = w[U.sel];
    ui.mapa && ui.mapa.dibujar(); pintarStats(); pintarLista();
    if (!p) { e.appendChild(h('p', { cls: 'tr-vacio', txt: w.length ? 'Toca un waypoint del mapa o de la lista para editarlo.' : 'Aún no hay waypoints.' })); ui.deshacer && (ui.deshacer.disabled = !U.pila.length); return; }
    const campo = (k, etq, o) => { const c = A.campo(etq, p[k], v => { p[k] = v; A.guardar(); ui.mapa.dibujar(); pintarStats(); pintarLista(); }, o); c.el.setAttribute('data-k', k); return c.wrap; };
    const rumboAuto = h('input', { type: 'checkbox', id: 'dr-rauto' }); rumboAuto.checked = p.rumbo == null;
    const rumbo = A.campo('Rumbo del dron (°)', p.rumbo == null ? '' : p.rumbo, v => { p.rumbo = Geo.norm360(v); A.guardar(); ui.mapa.dibujar(); }, { min: 0, max: 360 }); rumbo.el.disabled = rumboAuto.checked;
    rumboAuto.addEventListener('change', () => { rumbo.el.disabled = rumboAuto.checked; p.rumbo = rumboAuto.checked ? null : Cal.num(rumbo.el.value, 0); A.cambio('mision'); });
    const acc = A.selector('Acción en este punto', P.ACCIONES, p.accion, v => { p.accion = v; A.cambio('mision'); });
    ui.paso = h('select', { id: 'dr-paso', 'aria-label': 'Paso del movimiento en metros' }, [1, 2, 5, 10, 25, 50].map(v => h('option', { value: v, txt: v + ' m', selected: v === 5 })));
    const dp = (txt, dx, dy, etq) => h('button', { type: 'button', cls: 'tr-btn tr-chico', txt, 'aria-label': etq, on: { click: () => nudge(dx, dy) } });
    e.appendChild(h('h3', { txt: 'Waypoint ' + (U.sel + 1) + ' de ' + w.length }));
    e.appendChild(h('div', { cls: 'tr-fila' }, [campo('x', 'Este (m)'), campo('y', 'Norte (m)'), campo('alt', 'Altura (m)', { min: 0 })]));
    e.appendChild(h('div', { cls: 'tr-fila' }, [campo('vel', 'Velocidad (m/s)', { min: 0.5 }), campo('giro', 'Cámara (°, -90 abajo)', { min: -90, max: 30 }), h('div', {}, [h('div', { cls: 'tr-etq', txt: 'Rumbo' }), h('label', { cls: 'tr-chk', for: 'dr-rauto' }, [rumboAuto, 'Automático']), rumbo.wrap])]));
    e.appendChild(h('div', { cls: 'tr-fila' }, [acc.wrap, campo('pausa', 'Pausa (s)', { min: 0 }), campo('fotoCada', 'Foto cada (m) hacia este punto', { min: 0, ayuda: '0 = sin disparo por distancia' })]));
    e.appendChild(h('div', { cls: 'dr-dpad', role: 'group', 'aria-label': 'Mover el waypoint seleccionado' }, [h('label', { for: 'dr-paso', txt: 'Mover' }), ui.paso, dp('↑ N', 0, 1, 'Norte'), dp('← O', -1, 0, 'Oeste'), dp('→ E', 1, 0, 'Este'), dp('↓ S', 0, -1, 'Sur')]));
    e.appendChild(h('div', { cls: 'tr-acciones' }, [A.boton('Duplicar', () => { snapshot(); w.splice(U.sel + 1, 0, Object.assign({}, p, { x: p.x + 5, y: p.y + 5 })); U.sel++; listoCambio(true); }, 'tr-chico'), A.boton('Subir', () => { if (U.sel > 0) { snapshot(); [w[U.sel - 1], w[U.sel]] = [w[U.sel], w[U.sel - 1]]; U.sel--; listoCambio(true); } }, 'tr-chico'), A.boton('Bajar', () => { if (U.sel < w.length - 1) { snapshot(); [w[U.sel + 1], w[U.sel]] = [w[U.sel], w[U.sel + 1]]; U.sel++; listoCambio(true); } }, 'tr-chico'), A.boton('Eliminar', () => quitar(U.sel), 'tr-chico tr-peli')]));
    ui.deshacer && (ui.deshacer.disabled = !U.pila.length);
  }
  /* ---- patrones ---- */
  function formPatron() {
    const cont = ui.patForm; cont.textContent = ''; const t = ui.patTipo.value, defs = PAT[t]; pv[t] = pv[t] || {};
    const fila = h('div', { cls: 'tr-fila' });
    defs.forEach(d => { if (d[2] && typeof d[2] === 'object') { const s = A.selector(d[1], [d[2], d[3]], pv[t][d[0]] || d[2][0], v => { pv[t][d[0]] = v; }); fila.appendChild(s.wrap); pv[t][d[0]] = pv[t][d[0]] || d[2][0]; } else { if (pv[t][d[0]] === undefined) pv[t][d[0]] = d[2]; fila.appendChild(A.campo(d[1], pv[t][d[0]], v => { pv[t][d[0]] = v; }, { ayuda: d[0] === 'altFin' && t === 'orbita' ? 'Vacío = misma altura (para una espiral ascendente)' : null }).wrap); } });
    cont.appendChild(fila);
    if (t === 'cuadricula') cont.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Las líneas y los disparos se calculan con tu cámara (pestaña Cámara) y los solapes frontal/lateral de «Misión y equipo». El área se centra en el centro del mapa (cruz).' }));
    else cont.appendChild(h('p', { cls: 'tr-ayuda', txt: 'El patrón se coloca en el centro del mapa (cruz gris). Usa «Velocidad» de «Misión y equipo».' }));
  }
  function generar() {
    const t = ui.patTipo.value, v = Object.assign({}, pv[t]), M = ui.mapa.vista, mi = m(), o = Object.assign({}, v, { cx: M.cx, cy: M.cy, vel: mi.vel });
    Object.keys(o).forEach(k => { if (o[k] === '' || o[k] == null) delete o[k]; });
    let w;
    try {
      if (t === 'cuadricula') {
        const cam = A.camara(); if (!cam || !cam.f) throw new Error('Elige una cámara con distancia focal en la pestaña Cámara.');
        const fg = Cal.fotogrametria(cam, o.alt, mi.foto.frontal, mi.foto.lateral, mi.vel); o.sepLineas = fg.sepLineas; o.sepFotos = fg.sepFotos; o.giro = -90;
        if (o.ancho * o.alto > 2e6) throw new Error('Área demasiado grande para un solo vuelo; divídela.');
        if (fg.velMax && mi.vel > fg.velMax) A.aviso('A ' + mi.vel + ' m/s la cámara no llega al intervalo; baja la velocidad a ' + A.f1(fg.velMax, 1) + ' m/s.', 'error');
      }
      if (t === 'lineal') { const r = (o.rumbo || 0) * Math.PI / 180; o.x1 = o.cx; o.y1 = o.cy; o.x2 = o.cx + o.dist * Math.sin(r); o.y2 = o.cy + o.dist * Math.cos(r); }
      if (t === 'revelacion') { o.x1 = o.cx; o.y1 = o.cy; }
      w = P.generar(t, o);
    } catch (e) { A.aviso(e.message, 'error'); return; }
    snapshot(); if (ui.reemplazar.checked) mi.wps = w; else mi.wps = mi.wps.concat(w);
    if (w.length && mi.wps.length > 400) A.aviso('Hay más de 400 waypoints: algunos controladores tienen límites.', 'error');
    U.sel = -1; A.cambio('mision'); pintarEditor(); ui.mapa.ajustar(mi.wps); A.aviso(w.length + ' waypoints generados (' + P.NOMBRES[t] + ').'); A.logro('patron_' + t);
  }
  A.generarPatron = (tipo, vals) => { ui.patTipo.value = tipo; formPatron(); Object.assign(pv[tipo], vals || {}); formPatron(); };
  /* ---- plano ---- */
  function cargarPlano(file) {
    if (!file) return; const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); const url = c.toDataURL('image/jpeg', 0.85); A.est.plano = { id: A.est.proy.id, dataUrl: url, nombre: file.name }; D.guardarPlano(A.est.proy.id, url, file.name); m().plano.visible = true; A.cambio('mision'); ui.mapa.dibujar(); pintarPlano(); A.aviso('Plano cargado. Ajusta su ancho real en metros.'); }; im.onerror = () => A.aviso('No pude leer esa imagen.', 'error'); im.src = fr.result; };
    fr.onerror = () => A.aviso('No pude leer el archivo.', 'error'); fr.readAsDataURL(file);
  }
  function pintarPlano() {
    const c = ui.planoCaja; c.textContent = ''; const pl = m().plano, tiene = !!A.est.plano;
    c.appendChild(h('p', { cls: 'tr-ayuda', txt: tiene ? 'Plano: ' + (A.est.plano.nombre || 'imagen') + '. Se guarda solo en este dispositivo.' : 'Carga una imagen (plano, captura de mapa, croquis). Se coloca sobre la rejilla: indica cuántos metros mide de ancho y su centro. No se envía a ningún servidor.' }));
    if (tiene) { const vis = h('input', { type: 'checkbox', id: 'dr-plvis' }); vis.checked = pl.visible !== false; vis.addEventListener('change', () => { pl.visible = vis.checked; A.cambio('mision'); }); c.appendChild(h('label', { cls: 'tr-chk', for: 'dr-plvis' }, [vis, 'Mostrar plano'])); c.appendChild(h('div', { cls: 'tr-fila' }, [A.campo('Ancho real (m)', pl.ancho, v => { pl.ancho = Math.max(1, v); A.cambio('mision'); }, { min: 1 }).wrap, A.campo('Centro este (m)', pl.cx, v => { pl.cx = v; A.cambio('mision'); }).wrap, A.campo('Centro norte (m)', pl.cy, v => { pl.cy = v; A.cambio('mision'); }).wrap])); c.appendChild(A.boton('Quitar plano', () => { A.est.plano = null; D.quitarPlano(A.est.proy.id); pintarPlano(); ui.mapa.dibujar(); }, 'tr-chico tr-peli')); }
  }
  /* ---- exportar ---- */
  function exportar(tipo) {
    const mi = m(), nom = A.est.proy.nombre || 'mision', base = T.nombreArchivo(nom);
    if (!mi.wps.length) return A.aviso('Añade al menos un waypoint antes de exportar.', 'error');
    const fw = ui.fw.value;
    const o = { kml: [() => X.kml(mi, nom), '.kml', 'application/vnd.google-earth.kml+xml'], gpx: [() => X.gpx(mi, nom), '.gpx', 'application/gpx+xml'], json: [() => X.json(mi, nom), '.json', 'application/json'], csv: [() => X.csv(mi), '.csv', 'text/csv'], qgc: [() => X.qgc(mi, { fw }), '.plan', 'application/json'] }[tipo];
    A.descargar(o[0](), base + o[1], o[2] + ';charset=utf-8'); A.aviso('Exportado ' + base + o[1]); A.logro('exporto_' + tipo); if (g.CuentaTrabajos) g.CuentaTrabajos.xp(2);
  }
  function importar(file) {
    if (!file) return; const fr = new FileReader();
    fr.onload = () => { try { const mi = X.importarJSON(fr.result); snapshot(); const b = A.proyectoNuevo().mision; A.est.proy.mision = Object.assign(b, mi, { dron: Object.assign(b.dron, mi.dron), foto: Object.assign(b.foto, mi.foto), viento: Object.assign(b.viento, mi.viento), plano: Object.assign(b.plano, mi.plano) }); U.sel = -1; A.cambio('mision'); construirParams(); pintarEditor(); ui.mapa.ajustar(m().wps); A.aviso('Misión importada: ' + m().wps.length + ' waypoints.'); } catch (e) { A.aviso(e.message, 'error'); } };
    fr.readAsText(file);
  }
  /* ---- parametros ---- */
  function construirParams() {
    const c = ui.params; c.textContent = ''; const mi = m(), ch = (id, etq, v, fn) => { const i = h('input', { type: 'checkbox', id }); i.checked = v; i.addEventListener('change', () => fn(i.checked)); return h('label', { cls: 'tr-chk', for: id }, [i, etq]); };
    const geo = () => A.cambio('mision');
    const lat = A.campo('Latitud del despegue', mi.origen.lat, v => { mi.origen.lat = v; geo(); }, { min: -90, max: 90 }), lon = A.campo('Longitud del despegue', mi.origen.lon, v => { mi.origen.lon = v; geo(); }, { min: -180, max: 180 });
    c.appendChild(h('h3', { txt: 'Despegue y misión' }));
    c.appendChild(h('div', { cls: 'tr-fila' }, [lat.wrap, lon.wrap]));
    c.appendChild(h('div', { cls: 'tr-acciones' }, [A.boton('Usar mi ubicación', () => { if (!navigator.geolocation) return A.aviso('Este navegador no ofrece geolocalización.', 'error'); navigator.geolocation.getCurrentPosition(p => { mi.origen.lat = +p.coords.latitude.toFixed(6); mi.origen.lon = +p.coords.longitude.toFixed(6); lat.el.value = mi.origen.lat; lon.el.value = mi.origen.lon; geo(); A.aviso('Despegue fijado en tu ubicación.'); }, e => A.aviso('No se pudo obtener la ubicación: ' + e.message, 'error'), { timeout: 10000 }); }, 'tr-chico')]));
    c.appendChild(h('p', { cls: 'tr-ayuda', txt: 'La rejilla es local (metros desde el punto de despegue «H»). La latitud/longitud solo sirve para exportar coordenadas reales y se usa con una aproximación válida a escala de misión.' }));
    c.appendChild(h('div', { cls: 'tr-fila' }, [A.campo('Velocidad por defecto (m/s)', mi.vel, v => { mi.vel = Math.max(0.5, v); geo(); }, { min: 0.5 }).wrap, A.campo('Altura por defecto (m)', mi.altDef, v => { mi.altDef = v; geo(); }, { min: 0 }).wrap]));
    c.appendChild(ch('dr-ret', 'Regresar al despegue al terminar (RTL)', mi.retorno, v => { mi.retorno = v; geo(); }));
    c.appendChild(h('h3', { txt: 'Batería y dron' }));
    c.appendChild(h('div', { cls: 'tr-fila' }, [A.campo('Capacidad (Wh)', mi.dron.capWh, v => { mi.dron.capWh = Math.max(1, v); geo(); }, { min: 1, ayuda: 'V × Ah. Ej. 15,4 V × 3,85 Ah ≈ 59 Wh' }).wrap, A.campo('Potencia en hover (W)', mi.dron.pHover, v => { mi.dron.pHover = Math.max(1, v); geo(); }, { min: 1 }).wrap, A.campo('Masa (kg)', mi.dron.masaKg, v => { mi.dron.masaKg = v; geo(); }, { min: 0.05 }).wrap]));
    c.appendChild(h('div', { cls: 'tr-fila' }, [A.campo('Batería utilizable (%)', Math.round(mi.dron.usable * 100), v => { mi.dron.usable = Math.min(1, Math.max(0.3, v / 100)); geo(); }, { min: 30, max: 100, ayuda: 'Deja ~20 % de reserva.' }).wrap, A.campo('Velocidad máx. del dron (m/s)', mi.dron.vMax, v => { mi.dron.vMax = v; geo(); }, { min: 1 }).wrap]));
    c.appendChild(h('p', { cls: 'tr-ayuda', txt: 'El consumo es una estimación: potencia(v) = P·(1 + 0,004·v²) más la energía de subida. Calibra con tus vuelos reales (bitácora).' }));
    c.appendChild(h('h3', { txt: 'Fotogrametría y viento' }));
    c.appendChild(h('div', { cls: 'tr-fila' }, [A.campo('Solape frontal (%)', Math.round(mi.foto.frontal * 100), v => { mi.foto.frontal = Math.min(95, Math.max(10, v)) / 100; geo(); }, { min: 10, max: 95 }).wrap, A.campo('Solape lateral (%)', Math.round(mi.foto.lateral * 100), v => { mi.foto.lateral = Math.min(95, Math.max(10, v)) / 100; geo(); }, { min: 10, max: 95 }).wrap]));
    c.appendChild(h('div', { cls: 'tr-fila' }, [A.campo('Viento (m/s)', mi.viento.vel, v => { mi.viento.vel = Math.max(0, v); geo(); }, { min: 0 }).wrap, A.campo('Viento desde (°)', mi.viento.dir, v => { mi.viento.dir = Geo.norm360(v); geo(); }, { min: 0, max: 360, ayuda: '0 = del norte, 90 = del este' }).wrap]));
    c.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Para fotogrametría 75/65 % es un buen punto de partida (más en vegetación o agua). La cámara se elige en la pestaña Cámara.' }));
  }
  A.iniciarMision = function () {
    const raiz = document.getElementById('v-mision');
    ui.canvas = h('canvas', { id: 'dr-canvas', cls: 'dr-canvas', tabindex: '0', role: 'application', 'aria-label': 'Mapa de la misión. Con un waypoint seleccionado, las flechas lo mueven y Mayús mueve el mapa; la tecla N añade un waypoint en el centro; Suprimir elimina el seleccionado; más y menos hacen zoom.' });
    ui.mapa = g.DronMapa(ui.canvas, { capas, golpe, alMover: mover, alFin: () => { if (U.snap && U.snap !== JSON.stringify(m().wps)) { U.pila.push(U.snap); ui.deshacer.disabled = false; } U.snap = null; A.cambio('mision'); pintarEditor(); }, alSel: i => { U.snap = null; U.sel = i; pintarEditor(); },
      alToque: (x, y) => { if (U.modo === 'anadir') anadir(x, y); else { U.sel = -1; pintarEditor(); } }, origen: () => m().origen,
      plano: () => A.est.plano ? { src: A.est.plano.dataUrl, ancho: m().plano.ancho, cx: m().plano.cx, cy: m().plano.cy, visible: m().plano.visible } : null,
      alTecla: (e, M) => {
        if (e.key === 'n' || e.key === 'N') { anadir(M.vista.cx, M.vista.cy); return true; }
        if ((e.key === 'Delete' || e.key === 'Backspace') && U.sel >= 0) { quitar(U.sel); return true; }
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (d && U.sel >= 0 && !e.shiftKey) { nudge(d[0], d[1]); return true; } return false;
      } });
    const modoBtn = (id, txt, ic) => h('button', { type: 'button', cls: 'tr-btn tr-chico', id, 'aria-pressed': 'false', txt, on: { click: () => { U.modo = id === 'dr-m-add' ? 'anadir' : 'mover'; setModo(); } } });
    ui.bAdd = modoBtn('dr-m-add', 'Añadir'); ui.bSel = modoBtn('dr-m-sel', 'Seleccionar');
    function setModo() { ui.bAdd.setAttribute('aria-pressed', U.modo === 'anadir'); ui.bSel.setAttribute('aria-pressed', U.modo === 'mover'); ui.hint.textContent = U.modo === 'anadir' ? 'Modo Añadir: toca el mapa para crear un waypoint; arrastra uno para moverlo; dos dedos o rueda para el zoom.' : 'Modo Seleccionar: toca un waypoint para editarlo y arrástralo para moverlo.'; }
    ui.hint = h('p', { cls: 'tr-ayuda', role: 'status' });
    ui.deshacer = A.boton('Deshacer', () => { const s = U.pila.pop(); if (s) { m().wps = JSON.parse(s); U.sel = Math.min(U.sel, m().wps.length - 1); A.cambio('mision'); pintarEditor(); } ui.deshacer.disabled = !U.pila.length; }, 'tr-chico', { disabled: true });
    const barra = h('div', { cls: 'dr-barra', role: 'toolbar', 'aria-label': 'Herramientas del mapa' }, [ui.bAdd, ui.bSel, A.boton('Añadir al centro', () => anadir(ui.mapa.vista.cx, ui.mapa.vista.cy), 'tr-chico'), A.boton('Ajustar', () => ui.mapa.ajustar(m().wps), 'tr-chico', { 'aria-label': 'Ajustar la vista a la ruta' }), A.boton('+', () => ui.mapa.zoom(1 / 1.4), 'tr-chico', { 'aria-label': 'Acercar' }), A.boton('−', () => ui.mapa.zoom(1.4), 'tr-chico', { 'aria-label': 'Alejar' }), ui.deshacer, A.boton('Vaciar', () => { if (m().wps.length && confirm('¿Eliminar todos los waypoints?')) { snapshot(); m().wps = []; U.sel = -1; A.cambio('mision'); pintarEditor(); } }, 'tr-chico tr-peli')]);
    ui.stats = h('div', { 'aria-live': 'polite' }); ui.ed = h('div'); ui.lista = h('ul', { cls: 'dr-wps', 'aria-label': 'Lista de waypoints' }); ui.params = h('div'); ui.planoCaja = h('div');
    ui.patTipo = h('select', { id: 'dr-pat' }, Object.keys(P.NOMBRES).map(k => h('option', { value: k, txt: P.NOMBRES[k] }))); ui.patTipo.addEventListener('change', formPatron);
    ui.patForm = h('div'); ui.reemplazar = h('input', { type: 'checkbox', id: 'dr-pat-rep' }); ui.reemplazar.checked = false;
    ui.fw = h('select', { id: 'dr-fw', 'aria-label': 'Firmware para .plan' }, [['px4', 'PX4'], ['ardupilot', 'ArduPilot']].map(o => h('option', { value: o[0], txt: o[1] })));
    const ex = (t, etq) => A.boton(etq, () => exportar(t), 'tr-pri-suave');
    const imp = h('input', { type: 'file', accept: '.json,application/json', id: 'dr-imp', cls: 'tr-solo-lector' }); imp.addEventListener('change', () => { importar(imp.files[0]); imp.value = ''; });
    const plf = h('input', { type: 'file', accept: 'image/*', id: 'dr-plf', cls: 'tr-solo-lector' }); plf.addEventListener('change', () => { cargarPlano(plf.files[0]); plf.value = ''; });
    const izq = h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Mapa de la misión' }), barra, h('div', { cls: 'dr-mapa-caja' }, [ui.canvas]), ui.hint]), h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Resumen y avisos' }), ui.stats])]);
    const der = h('div', {}, [
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Waypoint seleccionado' }), ui.ed, h('h3', { txt: 'Todos los waypoints' }), ui.lista]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Patrones automáticos' }), h('label', { for: 'dr-pat', txt: 'Patrón' }), ui.patTipo, ui.patForm, h('label', { cls: 'tr-chk', for: 'dr-pat-rep' }, [ui.reemplazar, 'Reemplazar los waypoints actuales']), h('div', { cls: 'tr-acciones' }, [A.boton('Generar patrón', generar, 'tr-pri')])]),
      h('details', { cls: 'tr-panel dr-det', open: '' }, [h('summary', { txt: 'Misión y equipo' }), ui.params]),
      h('details', { cls: 'tr-panel dr-det' }, [h('summary', { txt: 'Plano de fondo' }), ui.planoCaja, h('label', { cls: 'tr-btn tr-chico', for: 'dr-plf', role: 'button', tabindex: '0', txt: 'Cargar imagen del plano', on: { keydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); plf.click(); } } } }), plf]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Exportar e importar' }), h('div', { cls: 'tr-acciones' }, [ex('kml', 'KML'), ex('gpx', 'GPX'), ex('json', 'JSON'), ex('csv', 'CSV'), ex('qgc', 'QGC .plan'), h('div', { cls: 'dr-fw' }, [h('label', { cls: 'tr-solo-lector', for: 'dr-fw', txt: 'Firmware' }), ui.fw])]),
        h('p', { cls: 'tr-ayuda', txt: 'El .plan (QGroundControl) usa comandos MAVLink simples: despegue, waypoints, velocidad, cámara (gimbal), foto, video y RTL; sirve para PX4/ArduPilot. KML y GPX los admiten muchas apps y visores; el CSV es un listado genérico. Esta web no controla drones DJI: su app oficial define sus propios formatos y límites.' }),
        h('label', { cls: 'tr-btn tr-chico', for: 'dr-imp', role: 'button', tabindex: '0', txt: 'Importar misión JSON', on: { keydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); imp.click(); } } } }), imp])]);
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [izq, der]));
    setModo(); formPatron(); construirParams(); pintarPlano(); pintarEditor();
    A.on('proyecto', () => { U.sel = -1; U.pila = []; construirParams(); pintarPlano(); pintarEditor(); ui.mapa.ajustar(m().wps); });
    A.on('mision', () => { pintarStats(); ui.mapa.dibujar(); }); A.on('camara', pintarStats); A.on('norma', pintarStats);
    A.vistas.mision = { mapa: () => ui.mapa, mostrar: () => { if (!U.aj) { U.aj = 1; ui.mapa.ajustar(m().wps); } else ui.mapa.dibujar(); } };
  };
})(window);
