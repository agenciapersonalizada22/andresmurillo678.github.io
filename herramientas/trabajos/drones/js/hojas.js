/* Hojas imprimibles (puro): devuelven paginas SVG en mm (190 x 277 de area util) para el motor Impresion. window.DronHojas */
(function (g, f) { const m = f(g.DronCatalogo || require('./catalogo.js')); if (typeof module === 'object' && module.exports) module.exports = m; else g.DronHojas = m; })(typeof self !== 'undefined' ? self : this, function (Cat) {
  'use strict';
  const H = {}, W = 190, ALTO = 277, esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = v => (Math.round(v * 10) / 10).toString().replace('.', ','), fe = v => Math.round(v).toString();
  H.AREA = { w: W, h: ALTO };
  function envolver(t, max) {
    const out = []; String(t == null ? '' : t).split('\n').forEach(par => { let cur = ''; par.split(/\s+/).forEach(p => { while (p.length > max) { if (cur) { out.push(cur); cur = ''; } out.push(p.slice(0, max)); p = p.slice(max); } if ((cur + ' ' + p).trim().length <= max) cur = (cur + ' ' + p).trim(); else { out.push(cur); cur = p; } }); out.push(cur); });
    return out.length ? out : [''];
  }
  H.Doc = function (titulo, pie) {
    const pages = []; let s = null, y = 0;
    function nueva() { s = []; pages.push(s); y = 0; }
    function sitio(h) { if (y + h > ALTO - 8) nueva(); }
    nueva();
    const d = {
      titulo(t, sub) { s.push('<text x="0" y="' + (y + 8) + '" font-size="8" font-weight="700">' + esc(t) + '</text>'); y += 11; if (sub) { envolver(sub, 110).forEach(l => { s.push('<text x="0" y="' + (y + 3.5) + '" font-size="3.4" fill="#444">' + esc(l) + '</text>'); y += 4.6; }); } s.push('<line x1="0" y1="' + (y + 1) + '" x2="' + W + '" y2="' + (y + 1) + '" stroke="#000" stroke-width=".5"/>'); y += 4; return d; },
      h2(t) { sitio(14); y += 3; s.push('<text x="0" y="' + (y + 4) + '" font-size="4.6" font-weight="700">' + esc(t) + '</text>'); y += 6.5; return d; },
      p(t, o) { o = o || {}; const fs = o.size || 3.5, max = Math.floor((W - (o.x || 0)) / (fs * 0.5)); envolver(t, max).forEach(l => { sitio(fs * 1.5); s.push('<text x="' + (o.x || 0) + '" y="' + (y + fs) + '" font-size="' + fs + '"' + (o.bold ? ' font-weight="700"' : '') + (o.color ? ' fill="' + o.color + '"' : '') + '>' + esc(l) + '</text>'); y += fs * 1.45; }); y += o.gap == null ? 1 : o.gap; return d; },
      check(t, marcado) { const fs = 3.6, ls = envolver(t, Math.floor((W - 9) / (fs * 0.5))); sitio(ls.length * fs * 1.45 + 2); s.push('<rect x="0.5" y="' + (y + 0.3) + '" width="4" height="4" fill="none" stroke="#000" stroke-width=".4"/>'); if (marcado) s.push('<path d="M1.2 ' + (y + 2.4) + 'l1.3 1.4l2.3-3.2" fill="none" stroke="#000" stroke-width=".6"/>'); ls.forEach((l, i) => { s.push('<text x="8" y="' + (y + fs * 0.95 + i * fs * 1.45) + '" font-size="' + fs + '">' + esc(l) + '</text>'); }); y += ls.length * fs * 1.45 + 1.6; return d; },
      tabla(cols, filas, o) {
        o = o || {}; const fs = o.size || 3.2, tot = cols.reduce((a, c) => a + c.w, 0), esc_ = W / tot, minH = o.minAlto || 0;
        const fila = (celdas, cab) => {
          const ls = celdas.map((t, i) => envolver(t, Math.max(2, Math.floor(cols[i].w * esc_ / (fs * 0.52) - 1)))), n = Math.max.apply(null, ls.map(l => l.length)), h = Math.max(minH, n * fs * 1.35 + 2.2);
          sitio(h); let x = 0;
          cols.forEach((c, i) => { const w = c.w * esc_; s.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (cab ? '#e6e6e6' : 'none') + '" stroke="#000" stroke-width=".25"/>'); ls[i].forEach((l, k) => { s.push('<text x="' + (x + 1) + '" y="' + (y + 1 + fs * 0.95 + k * fs * 1.35) + '" font-size="' + fs + '"' + (cab ? ' font-weight="700"' : '') + '>' + esc(l) + '</text>'); }); x += w; });
          y += h;
        };
        fila(cols.map(c => c.t), true); filas.forEach(r => fila(r.map(v => v == null ? '' : String(v)), false)); y += 2; return d;
      },
      raw(svg, h) { sitio(h); s.push('<g transform="translate(0 ' + y + ')">' + svg + '</g>'); y += h + 2; return d; },
      espacio(h) { y += h; return d; },
      firma(t) { sitio(14); y += 9; s.push('<line x1="0" y1="' + y + '" x2="80" y2="' + y + '" stroke="#000" stroke-width=".3"/><text x="0" y="' + (y + 4) + '" font-size="3.2">' + esc(t) + '</text>'); y += 6; return d; },
      fin() { return pages.map((p, i) => p.join('') + '<text x="0" y="' + (ALTO - 1) + '" font-size="2.8" fill="#555">' + esc(pie || 'Trabajos · Drones y cámaras') + ' · página ' + (i + 1) + ' de ' + pages.length + '</text>'); }
    };
    d.titulo0 = titulo; return d;
  };
  /* mapa esquematico de la ruta en un recuadro de w x h mm */
  H.minimapa = (m, w, h) => {
    const pts = m.wps.concat([{ x: 0, y: 0 }]), xs = pts.map(p => p.x), ys = pts.map(p => p.y), mx = Math.min.apply(null, xs), Mx = Math.max.apply(null, xs), my = Math.min.apply(null, ys), My = Math.max.apply(null, ys);
    const sp = Math.max(Mx - mx, 20), sq = Math.max(My - my, 20), k = Math.min((w - 12) / sp, (h - 12) / sq), cx = (mx + Mx) / 2, cy = (my + My) / 2, X = x => w / 2 + (x - cx) * k, Y = y => h / 2 - (y - cy) * k;
    const paso = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].filter(v => v * k >= 12)[0] || 5000, s = ['<rect width="' + w + '" height="' + h + '" fill="#fff" stroke="#000" stroke-width=".4"/>'];
    for (let gx = Math.ceil((cx - w / 2 / k) / paso) * paso; gx < cx + w / 2 / k; gx += paso) s.push('<line x1="' + X(gx) + '" y1="0" x2="' + X(gx) + '" y2="' + h + '" stroke="#bbb" stroke-width=".15"/>');
    for (let gy = Math.ceil((cy - h / 2 / k) / paso) * paso; gy < cy + h / 2 / k; gy += paso) s.push('<line x1="0" y1="' + Y(gy) + '" x2="' + w + '" y2="' + Y(gy) + '" stroke="#bbb" stroke-width=".15"/>');
    if (m.wps.length) s.push('<polyline fill="none" stroke="#d9480f" stroke-width=".6" points="' + [{ x: 0, y: 0 }].concat(m.wps, m.retorno ? [{ x: 0, y: 0 }] : []).map(p => X(p.x).toFixed(2) + ',' + Y(p.y).toFixed(2)).join(' ') + '"/>');
    m.wps.forEach((p, i) => { if (m.wps.length < 60 || i % Math.ceil(m.wps.length / 40) === 0) s.push('<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="1.1" fill="#d9480f"/><text x="' + (X(p.x) + 1.6) + '" y="' + (Y(p.y) - 1.2) + '" font-size="2.6">' + (i + 1) + '</text>'); });
    s.push('<rect x="' + (X(0) - 1.4) + '" y="' + (Y(0) - 1.4) + '" width="2.8" height="2.8" fill="#1864ab"/><text x="' + (X(0) + 2) + '" y="' + (Y(0) + 4) + '" font-size="2.6">Despegue</text>');
    s.push('<line x1="4" y1="' + (h - 4) + '" x2="' + (4 + paso * k) + '" y2="' + (h - 4) + '" stroke="#000" stroke-width=".5"/><text x="4" y="' + (h - 5.5) + '" font-size="2.6">' + paso + ' m (rejilla)</text><text x="' + (w - 6) + '" y="7" font-size="3.4" font-weight="700">N↑</text>');
    return s.join('');
  };
  H.checklist = (proy, estados, extras) => {
    const d = H.Doc(), est = estados || {};
    d.titulo('Checklist de vuelo', (proy && proy.nombre ? 'Proyecto: ' + proy.nombre + ' · ' : '') + 'Fecha: ____/____/________   Piloto: ______________________   Dron: ______________________');
    Cat.CHECKLIST.forEach(([nom, its]) => { d.h2(nom); its.forEach(([id, t]) => d.check(t, est[id])); });
    if (extras && extras.length) { d.h2('Puntos propios'); extras.forEach(e => d.check(e.texto, est[e.id])); }
    d.espacio(3); d.p('Esta lista es una ayuda general: no sustituye el manual de tu dron ni la normativa local.', { size: 3, color: '#555' }); d.firma('Firma del piloto');
    return d.fin();
  };
  H.plan = (proy, m, st, cam, perfil) => {
    const d = H.Doc(); d.titulo('Plan de vuelo', (proy.nombre || 'Sin nombre') + ' · ' + new Date().toISOString().slice(0, 10));
    d.tabla([{ t: 'Dato', w: 3 }, { t: 'Valor', w: 4 }, { t: 'Dato', w: 3 }, { t: 'Valor', w: 4 }], [
      ['Despegue (lat, lon)', m.origen.lat.toFixed(6) + ', ' + m.origen.lon.toFixed(6), 'Waypoints', m.wps.length],
      ['Distancia', fe(st.distancia) + ' m', 'Duración estimada', f1(st.duracion / 60) + ' min'],
      ['Altura máx.', fe(st.altMax) + ' m', 'Distancia máx. al despegue', fe(st.distMaxHome) + ' m'],
      ['Batería estimada', fe(st.bateriaPct) + ' % de la útil', 'Fotos estimadas', st.fotos || 0],
      ['Viento previsto', m.viento && m.viento.vel ? f1(m.viento.vel) + ' m/s desde ' + fe(m.viento.dir) + '°' : 'sin datos', 'Normativa', perfil ? perfil.nombre + ' (máx. ' + perfil.alturaMax + ' m)' : '—']]);
    if (cam) d.p('Cámara: ' + cam.nombre + ' · GSD ' + f1(cam.gsd) + ' cm/px · huella ' + fe(cam.anchoHuella) + '×' + fe(cam.altoHuella) + ' m · solape frontal ' + fe(m.foto.frontal * 100) + ' % / lateral ' + fe(m.foto.lateral * 100) + ' %', { size: 3.3 });
    d.h2('Ruta (rejilla en metros desde el despegue)'); d.raw(H.minimapa(m, W, 105), 105);
    if (st.avisos.length) { d.h2('Avisos'); st.avisos.forEach(a => d.p('• ' + a.t, { size: 3.3 })); }
    d.h2('Waypoints'); d.tabla([{ t: '#', w: 1 }, { t: 'Este (m)', w: 2 }, { t: 'Norte (m)', w: 2 }, { t: 'Alt. (m)', w: 1.6 }, { t: 'Vel. (m/s)', w: 1.7 }, { t: 'Cámara (°)', w: 1.7 }, { t: 'Rumbo', w: 1.4 }, { t: 'Acción', w: 3 }],
      m.wps.map((w, i) => [i + 1, f1(w.x), f1(w.y), f1(w.alt), f1(w.vel || m.vel), f1(w.giro), w.rumbo == null ? 'auto' : fe(w.rumbo), (w.accion !== 'ninguna' ? w.accion.replace('_', ' ') : '') + (w.fotoCada > 0 ? ' foto/' + f1(w.fotoCada) + ' m' : '') + (w.pausa ? ' pausa ' + w.pausa + ' s' : '')]), { size: 3 });
    d.p('Verifica la normativa local y las condiciones reales antes de volar.', { size: 3, color: '#555' });
    return d.fin();
  };
  H.bitacora = (proy, lista, filasVacias) => {
    const d = H.Doc(); d.titulo('Bitácora de vuelo', (proy && proy.nombre ? 'Proyecto: ' + proy.nombre : 'Registro de vuelos'));
    const rows = (lista || []).map(e => [e.fecha, e.piloto, e.dron, e.lugar, e.despegue + '–' + e.aterrizaje, e.minutos, e.baterias, e.viento, (e.incidencias || '') + (e.notas ? ' ' + e.notas : '')]);
    for (let i = 0; i < (filasVacias == null ? 12 : filasVacias); i++) rows.push(['', '', '', '', '', '', '', '', '']);
    d.tabla([{ t: 'Fecha', w: 2 }, { t: 'Piloto', w: 2.4 }, { t: 'Dron', w: 2.2 }, { t: 'Lugar', w: 2.6 }, { t: 'Desp.–aterr.', w: 2.2 }, { t: 'Min', w: 1 }, { t: 'Bat.', w: 1 }, { t: 'Viento', w: 1.2 }, { t: 'Incidencias / notas', w: 4 }], rows, { size: 2.9, minAlto: 8 });
    return d.fin();
  };
  H.limites = (proy, perfil, st, m) => {
    const d = H.Doc(); d.titulo('Hoja de límites operativos', (proy && proy.nombre || '') + ' · ' + (perfil ? perfil.nombre : ''));
    d.p(Cat.AVISO_LEY, { size: 3.2, bold: true });
    if (perfil) d.tabla([{ t: 'Límite del perfil', w: 4 }, { t: 'Valor', w: 3 }, { t: 'Este plan', w: 3 }, { t: 'Estado', w: 2 }], [
      ['Altura máxima', perfil.alturaMax + ' m', fe(st.altMax) + ' m', st.altMax <= perfil.alturaMax ? 'Dentro' : 'EXCEDE'],
      ['Distancia máxima al piloto', perfil.distMax + ' m', fe(st.distMaxHome) + ' m', st.distMaxHome <= perfil.distMax ? 'Dentro' : 'EXCEDE'],
      ['Línea de vista (VLOS)', perfil.vlos ? 'Obligatoria' : 'No obligatoria', '—', '—'], ['Vuelo nocturno', perfil.noche ? 'Con condiciones' : 'No previsto', '—', '—'], ['Sobre personas', perfil.sobreGente ? 'Con condiciones' : 'No', '—', '—'], ['Peso máximo del perfil', perfil.pesoMax + ' g', '—', '—']]);
    if (perfil && perfil.notas) d.p('Notas del perfil: ' + perfil.notas, { size: 3.3 });
    d.h2('Límites propios del vuelo'); ['Viento máximo aceptable: ______ m/s', 'Batería mínima para regresar: ______ %', 'Altura de retorno (RTH): ______ m', 'Radio máximo de operación: ______ m', 'Lugar de aterrizaje alterno: ________________________'].forEach(t => d.p(t, { size: 3.8, gap: 3 }));
    d.h2('Zonas y permisos'); ['Zona restringida / aeródromo cercano consultado', 'Permiso o autorización obtenida (n.º ______________)', 'Propietario o autoridad del lugar informada'].forEach(t => d.check(t, false)); d.firma('Firma del piloto');
    return d.fin();
  };
  H.guion = (proy, tomas, titulo) => {
    const d = H.Doc(); d.titulo('Guion técnico', proy.nombre || 'Proyecto'); (tomas || []).forEach((t, i) => { d.h2((i + 1) + '. ' + t.titulo); d.p(['Movimiento: ' + (t.mov || '—'), 'Lente: ' + (t.lente || '—'), t.fps + ' fps', 'obturador ' + (t.obt || '—'), 'ND: ' + (t.nd || '—'), 'altura ' + (t.alt || '—') + ' m', 'duración ' + (t.dur || '—') + ' s'].join(' · '), { size: 3.3 }); if (t.notas) d.p(t.notas, { size: 3.3, color: '#333' }); });
    return d.fin();
  };
  return H;
});
