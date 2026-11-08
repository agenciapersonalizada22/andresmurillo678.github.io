/* Vista Telemetria: simulador del plan, telemetria en vivo (puente/serie via TrabajosDispositivos) y reproduccion de logs CSV/JSON. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, A = g.DronApp, Cal = g.DronCalc, Geo = g.DronGeo, Mi = g.DronMision, Tel = g.DronTelem, ui = {};
  const css = (el, n, d) => (getComputedStyle(el).getPropertyValue(n) || '').trim() || d;
  const SER = [['alt', 'Altura (m)', '--g1'], ['vel', 'Velocidad (m/s)', '--g2'], ['bat', 'Batería (%)', '--g3']];
  /* grafica de lineas con cada serie normalizada a su rango; series [{n,c,pts:[[t,v]]}] */
  function grafica(cv, series, dur, cursor) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(3, g.devicePixelRatio || 1), W = Math.max(60, r.width), H = Math.max(60, r.height); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = css(cv, '--mapa-bg', '#eef'); x.fillRect(0, 0, W, H);
    x.strokeStyle = css(cv, '--mapa-lin', '#ccc'); x.lineWidth = 1; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(0, H * i / 4 + .5); x.lineTo(W, H * i / 4 + .5); x.stroke(); }
    const px = t => 6 + (W - 12) * (dur > 0 ? t / dur : 0);
    series.forEach(s => {
      if (!s.pts.length) return; let mn = Infinity, mx = -Infinity; s.pts.forEach(p => { mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); }); if (mx - mn < 1e-9) { mx = mn + 1; }
      x.strokeStyle = css(cv, s.c, '#d9480f'); x.lineWidth = 2; x.lineJoin = 'round'; x.beginPath(); s.pts.forEach((p, i) => { const X = px(p[0]), Y = H - 8 - (H - 16) * (p[1] - mn) / (mx - mn); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke();
    });
    x.fillStyle = css(cv, '--suave', '#555'); x.font = '11px system-ui'; x.textBaseline = 'bottom'; x.textAlign = 'left'; x.fillText('0', 6, H - 1); x.textAlign = 'right'; x.fillText(A.min(dur), W - 4, H - 1);
    if (cursor != null) { x.strokeStyle = css(cv, '--txt', '#000'); x.lineWidth = 1.5; x.beginPath(); x.moveTo(px(cursor), 0); x.lineTo(px(cursor), H); x.stroke(); }
  }
  const leyenda = (series) => series.map(s => { let mn = Infinity, mx = -Infinity; s.pts.forEach(p => { mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); }); return h('li', {}, [h('span', { cls: 'dr-sw', style: 'background:var(' + s.c + ')' }), s.n + (s.pts.length ? ': ' + A.f1(mn) + ' – ' + A.f1(mx) : '')]); });
  /* visor: mapa + grafica + controles; o = {duracion, estado(t), ruta:[{x,y}], plan:[{x,y}], series, origen} */
  function Visor(raiz, pref) {
    const V = { t: 0, play: false, vel: 1, o: null, ult: 0, raf: 0 };
    const cv = h('canvas', { cls: 'dr-canvas', tabindex: '0', role: 'img', 'aria-label': 'Mapa de reproducción' }), gc = h('canvas', { cls: 'dr-grafica', role: 'img', 'aria-label': 'Gráfica de altura, velocidad y batería en el tiempo. Haz clic para mover el cursor.' });
    const lectura = h('div', { cls: 'dr-tiles dr-lect', 'aria-live': 'off' }), tiempo = h('output', { cls: 'dr-tiempo', 'aria-live': 'off' });
    const sl = h('input', { type: 'range', min: '0', max: '100', step: '0.1', value: '0', id: pref + '-sl', 'aria-label': 'Posición en el tiempo' });
    const bPlay = A.boton('Reproducir', () => V.alternar(), 'tr-pri', { id: pref + '-play', 'aria-pressed': 'false' });
    const sv = A.selector('Velocidad', [[1, '×1'], [2, '×2'], [5, '×5'], [10, '×10'], [30, '×30']], 1, v => { V.vel = +v; });
    const ley = h('ul', { cls: 'dr-ley' });
    V.mapa = g.DronMapa(cv, { origen: () => V.o && V.o.origen, capas: (ctx, M) => {
      const o = V.o; if (!o) return; const col = css(cv, '--mapa-ruta', '#d9480f'), suave = css(cv, '--suave', '#888');
      const trazo = (pts, c, w, dash) => { if (pts.length < 2) return; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => { const [a, b] = M.px(p.x, p.y); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke(); ctx.setLineDash([]); };
      if (o.plan) trazo(o.plan, suave, 2, [6, 5]);
      if (o.ruta) { trazo(o.ruta, suave, 2); const e = o.estado(V.t), pas = o.ruta.filter(p => p.t == null || p.t <= V.t); trazo(pas.concat(e && e.x != null ? [{ x: e.x, y: e.y }] : []), col, 3.5); }
      const e = o.estado(V.t); if (e && e.x != null) { const [a, b] = M.px(e.x, e.y); ctx.save(); ctx.translate(a, b); ctx.rotate((e.rumbo || 0) * Math.PI / 180); ctx.fillStyle = '#f08c00'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 10); ctx.lineTo(0, 5); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    } });
    function tiles(e) {
      lectura.textContent = ''; const t = (k, v) => h('div', { cls: 'dr-tile' }, [h('div', { cls: 'dr-t-v', txt: v }), h('div', { cls: 'dr-t-e', txt: k })]);
      lectura.appendChild(t('Altura', e && e.alt != null ? A.f1(e.alt) + ' m' : '—')); lectura.appendChild(t('Velocidad', e && e.vel != null ? A.f1(e.vel) + ' m/s' : '—')); lectura.appendChild(t('Rumbo', e && e.rumbo != null ? Math.round(e.rumbo) + '°' : '—')); lectura.appendChild(t('Batería', e && e.bat != null ? Math.round(e.bat) + ' %' : '—'));
    }
    V.dibujar = () => { const o = V.o; if (!o) return; const e = o.estado(V.t); tiempo.textContent = A.min(V.t) + ' / ' + A.min(o.duracion); sl.value = V.t; tiles(e); V.mapa.dibujar(); grafica(gc, o.series || [], o.duracion, V.t); if (o.alFotograma) o.alFotograma(e); };
    V.ir = t => { V.t = Math.max(0, Math.min(V.o ? V.o.duracion : 0, t)); V.dibujar(); };
    V.alternar = () => { if (!V.o) return; V.play = !V.play; bPlay.textContent = V.play ? 'Pausar' : (V.t >= V.o.duracion ? 'Repetir' : 'Reproducir'); bPlay.setAttribute('aria-pressed', V.play); if (V.play) { if (V.t >= V.o.duracion) V.t = 0; V.ult = performance.now(); V.raf = requestAnimationFrame(paso); } else cancelAnimationFrame(V.raf); };
    function paso(ahora) { if (!V.play) return; const dt = Math.min(0.25, (ahora - V.ult) / 1000); V.ult = ahora; V.t += dt * V.vel; if (V.t >= V.o.duracion) { V.t = V.o.duracion; V.dibujar(); V.play = false; bPlay.textContent = 'Repetir'; bPlay.setAttribute('aria-pressed', 'false'); return; } V.dibujar(); V.raf = requestAnimationFrame(paso); }
    sl.addEventListener('input', () => { V.t = +sl.value; V.dibujar(); });
    gc.addEventListener('pointerdown', e => { const r = gc.getBoundingClientRect(); V.ir((e.clientX - r.left - 6) / (r.width - 12) * V.o.duracion); gc.setPointerCapture(e.pointerId); gc.onpointermove = ev => V.ir((ev.clientX - r.left - 6) / (r.width - 12) * V.o.duracion); gc.onpointerup = () => { gc.onpointermove = null; }; });
    V.cargar = o => { cancelAnimationFrame(V.raf); V.play = false; bPlay.textContent = 'Reproducir'; bPlay.setAttribute('aria-pressed', 'false'); V.o = o; V.t = 0; sl.max = Math.max(1, o.duracion); sl.step = Math.max(0.05, o.duracion / 2000); ley.textContent = ''; leyenda(o.series || []).forEach(l => ley.appendChild(l)); V.mapa.ajustar((o.plan || []).concat(o.ruta || []), 1.2); V.dibujar(); };
    V.raiz = h('div', {}, [h('div', { cls: 'dr-barra' }, [bPlay, A.boton('Inicio', () => V.ir(0), 'tr-chico'), A.boton('+', () => V.mapa.zoom(1 / 1.4), 'tr-chico', { 'aria-label': 'Acercar' }), A.boton('−', () => V.mapa.zoom(1.4), 'tr-chico', { 'aria-label': 'Alejar' }), A.boton('Ajustar', () => V.mapa.ajustar((V.o.plan || []).concat(V.o.ruta || []), 1.2), 'tr-chico'), sv.wrap]), h('div', { cls: 'dr-mapa-caja' }, [cv]), h('div', { cls: 'dr-ctl' }, [sl, tiempo]), lectura, gc, ley]);
    V.enfocar = () => { if (V.o) V.mapa.ajustar((V.o.plan || []).concat(V.o.ruta || []), 1.2); };
    raiz.appendChild(V.raiz); return V;
  }
  /* ---- simulador ---- */
  function datosSim() {
    const m = A.est.proy.mision, tl = Mi.lineaTiempo(m), s = A.estadisticas(); if (!m.wps.length) return null;
    const ruta = [{ x: 0, y: 0, t: 0 }].concat(tl.segs.filter(g => g.tipo !== 'pausa').map(g => ({ x: g.b.x, y: g.b.y, t: g.t1 }))), N = Math.min(300, Math.max(20, Math.round(tl.duracion)));
    const mu = []; for (let i = 0; i <= N; i++) mu.push(Mi.posicion(tl, tl.duracion * i / N));
    return { duracion: tl.duracion, estado: t => Mi.posicion(tl, t), ruta, plan: ruta, origen: m.origen, tl, s, series: SER.map(([k, n, c]) => ({ n, c, pts: mu.map(p => [p.t, p[k]]) })) };
  }
  function pintarSim() {
    const d = datosSim(), c = ui.simAv; c.textContent = '';
    if (!d) { ui.simCont.hidden = true; c.appendChild(h('div', { cls: 'tr-nota tr-av', txt: 'No hay waypoints que simular. Crea una ruta en Misión.' })); return; }
    ui.simCont.hidden = false; ui.simV.cargar({ duracion: d.duracion, estado: d.estado, ruta: d.ruta, origen: d.origen, series: d.series });
    const av = d.s.avisos.slice(); let t20 = null; for (let t = 0; t <= d.duracion; t += 1) { if (d.estado(t).bat <= 20) { t20 = t; break; } } if (t20 != null) av.push({ n: 'av', t: 'La batería baja del 20 % de reserva a los ' + A.min(t20) + ' (' + Math.round(100 * t20 / d.duracion) + ' % de la misión).' });
    const fin = d.estado(d.duracion).bat; c.appendChild(h('div', { cls: 'tr-nota ' + (av.some(a => a.n === 'mal') ? 'tr-mal' : av.length ? 'tr-av' : 'tr-ok'), role: 'status', txt: (av.some(a => a.n === 'mal') ? 'La misión NO es viable tal como está. ' : 'La simulación termina con ' + Math.round(fin) + ' % de batería útil en ' + A.min(d.duracion) + '. ') + 'Duración ' + A.min(d.duracion) + ', ' + Math.round(d.tl.distancia) + ' m.' }));
    av.forEach(a => c.appendChild(h('div', { cls: 'tr-nota tr-' + (a.n === 'mal' ? 'mal' : 'av'), txt: a.t })));
    A.logro('simulo_mision');
  }
  /* ---- en vivo ---- */
  const L = { cx: null, serie: [], ruta: [], graba: [], t0: 0, ult: 0, buf: null, dec: null, n: 0 };
  function recibir(s) {
    if (!s) return; const now = Date.now(); L.ult = now; L.n++; if (!L.t0) L.t0 = now; const t = (now - L.t0) / 1000; s = Object.assign({}, s); L.estado = Object.assign(L.estado || {}, s);
    L.graba.push(Object.assign({ t: Math.round(t * 1000) / 1000 }, s)); if (L.graba.length > 20000) L.graba.shift();
    if (s.lat != null && s.lon != null && (s.lat || s.lon)) { const o = A.est.proy.mision.origen, cerca = Geo.haversine(o.lat, o.lon, s.lat, s.lon) < 30000; if (!L.origen) L.origen = cerca ? o : { lat: s.lat, lon: s.lon }; const p = Geo.aLocal(L.origen, s.lat, s.lon); p.t = t; L.ruta.push(p); if (L.ruta.length > 6000) L.ruta.shift(); }
    L.serie.push({ t, alt: s.alt != null ? s.alt : (L.estado.alt || 0), vel: s.vel != null ? s.vel : (L.estado.vel || 0), bat: s.bat != null ? s.bat : (L.estado.bat || 0) }); if (L.serie.length > 600) L.serie.shift();
    if (!L.pend) L.pend = setTimeout(() => { L.pend = 0; pintarVivo(); }, 150);
  }
  function pintarVivo() {
    const e = L.estado || {}, lec = ui.vLect; lec.textContent = ''; const t = (k, v) => lec.appendChild(h('div', { cls: 'dr-tile' }, [h('div', { cls: 'dr-t-v', txt: v }), h('div', { cls: 'dr-t-e', txt: k })]));
    t('Altura', e.alt != null ? A.f1(e.alt) + ' m' : '—'); t('Velocidad', e.vel != null ? A.f1(e.vel) + ' m/s' : '—'); t('Rumbo', e.rumbo != null ? Math.round(e.rumbo) + '°' : '—'); t('Batería', e.bat != null ? Math.round(e.bat) + ' %' + (e.volt ? ' · ' + A.f1(e.volt, 1) + ' V' : '') : '—'); t('Satélites', e.sats != null ? String(e.sats) : '—'); t('Modo', e.modo || '—');
    ui.vPos.textContent = e.lat != null ? 'Posición: ' + e.lat.toFixed(6) + ', ' + e.lon.toFixed(6) + ' · ' + L.n + ' tramas' : L.n + ' tramas recibidas (sin posición GPS)';
    ui.vMapa.dibujar(); if (L.serie.length > 1) { const ser = SER.map(([k, n, c]) => ({ n, c, pts: L.serie.map(p => [p.t, p[k]]) })); grafica(ui.vGraf, ser, L.serie[L.serie.length - 1].t, null); ui.vLey.textContent = ''; leyenda(ser).forEach(l => ui.vLey.appendChild(l)); }
    ui.vDesc.disabled = !L.graba.length;
  }
  function entrada(ev) {
    const d = ev.datos;
    if (d instanceof Uint8Array) { L.dec = L.dec || new TextDecoder(); L.buf = L.buf || Tel.Lineas(); L.buf.push(L.dec.decode(d, { stream: true })).forEach(l => recibir(Tel.parseLinea(l))); }
    else if (Array.isArray(d)) d.forEach(x => recibir(Tel.normalizar(x)));
    else if (d && typeof d === 'object') { if (d.tipo === 'pong') return; recibir(Tel.normalizar(d.telemetria && typeof d.telemetria === 'object' ? d.telemetria : d)); }
    else if (typeof d === 'string') { (L.buf = L.buf || Tel.Lineas()).push(d.endsWith('\n') ? d : d + '\n').forEach(l => recibir(Tel.parseLinea(l))); }
  }
  function estadoVivo(txt, cls) { ui.vEst.textContent = txt; ui.vEst.className = 'tr-nota ' + (cls || ''); }
  async function conectar() {
    const TD = g.TrabajosDispositivos; if (!TD) return estadoVivo('El módulo de dispositivos no está disponible.', 'tr-mal');
    const tipo = ui.vTipo.el.value; if (!TD.soportado(tipo)) return estadoVivo(tipo === 'serial' ? 'Este navegador no tiene Web Serial (usa Chrome o Edge de escritorio, con HTTPS).' : 'WebSocket no disponible.', 'tr-mal');
    desconectar(); estadoVivo('Conectando…');
    try {
      const op = tipo === 'puente' ? { url: ui.vUrl.value.trim(), reconectar: true } : { baudRate: Cal.num(ui.vBaud.el.value, 115200) };
      L.cx = await TD.conectar(tipo, op); L.buf = null; L.dec = null; L.t0 = 0; L.serie = []; L.ruta = []; L.graba = []; L.n = 0; L.origen = null; L.estado = {};
      L.off = [TD.escuchar({ evento: 'datos', id: L.cx.id }, entrada), TD.escuchar({ evento: 'desconectado', id: L.cx.id }, () => { estadoVivo('Conexión cerrada.', 'tr-av'); ui.vCon.hidden = false; ui.vDis.hidden = true; })];
      estadoVivo('Conectado a ' + L.cx.nombre + '. Esperando tramas…', 'tr-ok'); ui.vCon.hidden = true; ui.vDis.hidden = false; A.logro('telemetria_en_vivo');
    } catch (e) { estadoVivo((e && e.message) || 'No se pudo conectar.', 'tr-mal'); }
  }
  function desconectar() { (L.off || []).forEach(f => f()); L.off = []; if (L.cx) { try { g.TrabajosDispositivos.desconectar(L.cx.id); } catch (e) {} L.cx = null; } if (L.sim) { clearInterval(L.sim); L.sim = 0; } if (ui.vCon) { ui.vCon.hidden = false; ui.vDis.hidden = true; } }
  function simularVivo() {
    desconectar(); L.t0 = 0; L.serie = []; L.ruta = []; L.graba = []; L.n = 0; L.origen = null; L.estado = {};
    const m = A.est.proy.mision, tl = Mi.lineaTiempo(m); if (!tl.segs.length) return A.aviso('Crea una ruta en Misión para simular tramas.', 'error');
    let t = 0; estadoVivo('Enviando tramas de prueba generadas desde el plan (no es un dron real).', 'tr-av'); ui.vDis.hidden = false; ui.vCon.hidden = true;
    L.sim = setInterval(() => { const p = Mi.posicion(tl, t), geo = Geo.aGeo(m.origen, p.x, p.y); recibir(Tel.normalizar({ lat: geo.lat, lon: geo.lon, alt: p.alt, vel: p.vel, rumbo: p.rumbo, bat: p.bat, sats: 14, modo: 'SIM' })); t += 3 * 0.5; if (t > tl.duracion) { clearInterval(L.sim); L.sim = 0; estadoVivo('Simulación terminada.', 'tr-ok'); } }, 100);
  }
  function csvSesion() { const cols = ['t', 'lat', 'lon', 'alt', 'vel', 'rumbo', 'bat', 'volt', 'sats', 'pitch', 'roll', 'modo']; return cols.join(',') + '\n' + L.graba.map(r => cols.map(k => r[k] == null ? '' : r[k]).join(',')).join('\n') + '\n'; }
  function vivo(c) {
    const Tn = g.TrabajosDispositivos;
    ui.vTipo = A.selector('Conexión', [['puente', 'Puente WebSocket (JSON)'], ['serial', 'Puerto serie (una trama JSON por línea)']], 'puente', v => { ui.vUrlW.hidden = v !== 'puente'; ui.vBaud.wrap.hidden = v !== 'serial'; });
    ui.vUrl = h('input', { type: 'text', id: 'dr-v-url', value: 'ws://localhost:8765', autocomplete: 'off', spellcheck: 'false', inputmode: 'url' }); ui.vUrlW = h('div', {}, [h('label', { for: 'dr-v-url', txt: 'Dirección del puente' }), ui.vUrl]);
    ui.vBaud = A.selector('Baudios', [9600, 57600, 115200, 230400, 460800].map(b => [b, String(b)]), 115200, () => {}); ui.vBaud.wrap.hidden = true;
    ui.vEst = h('div', { cls: 'tr-nota', role: 'status', txt: Tn ? 'Sin conexión. Necesitas un puente que publique la telemetría de tu dron como JSON (formato abajo).' : 'El módulo de dispositivos no se cargó.' });
    ui.vCon = A.boton('Conectar', conectar, 'tr-pri'); ui.vDis = A.boton('Desconectar', () => { desconectar(); estadoVivo('Desconectado.'); }, '', { hidden: '' });
    ui.vLect = h('div', { cls: 'dr-tiles dr-lect' }); ui.vPos = h('p', { cls: 'tr-ayuda', role: 'status' }); ui.vLey = h('ul', { cls: 'dr-ley' });
    const cv = h('canvas', { cls: 'dr-canvas', tabindex: '0', role: 'img', 'aria-label': 'Mapa de telemetría en vivo' }); ui.vGraf = h('canvas', { cls: 'dr-grafica', role: 'img', 'aria-label': 'Gráfica en vivo de altura, velocidad y batería' });
    ui.vMapa = g.DronMapa(cv, { origen: () => L.origen || A.est.proy.mision.origen, capas: (ctx, M) => { if (L.ruta.length > 1) { ctx.strokeStyle = css(cv, '--mapa-ruta', '#d9480f'); ctx.lineWidth = 3; ctx.beginPath(); L.ruta.forEach((p, i) => { const [a, b] = M.px(p.x, p.y); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke(); } const e = L.ruta[L.ruta.length - 1]; if (e) { const [a, b] = M.px(e.x, e.y); ctx.fillStyle = '#f08c00'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a, b, 8, 0, 7); ctx.fill(); ctx.stroke(); } } });
    ui.vDesc = A.boton('Descargar CSV de la sesión', () => A.descargar(csvSesion(), 'telemetria_sesion.csv', 'text/csv;charset=utf-8'), 'tr-chico', { disabled: '' });
    c.appendChild(h('div', { cls: 'tr-dos' }, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Telemetría en vivo' }), ui.vTipo.wrap, ui.vUrlW, ui.vBaud.wrap, h('div', { cls: 'tr-acciones' }, [ui.vCon, ui.vDis, A.boton('Probar con tramas simuladas', simularVivo, 'tr-chico'), A.boton('Ajustar mapa', () => ui.vMapa.ajustar(L.ruta), 'tr-chico')]), ui.vEst,
      h('p', { cls: 'tr-ayuda', txt: 'La web no se comunica con drones DJI directamente (no hay API web). Un Tello, un PX4/ArduPilot por MAVLink o un receptor de telemetría necesitan un puente local que traduzca su protocolo a JSON y lo publique por WebSocket (o por un puerto serie de texto). Ver LEEME.md y el puente mínimo de «Panel de dispositivos».' }),
      h('details', { cls: 'dr-det' }, [h('summary', { txt: 'Formato JSON esperado' }), h('pre', { cls: 'dr-pre', txt: Tel.DOC }), h('p', { cls: 'tr-ayuda', txt: 'Una trama por mensaje (o una por línea en serie). Campos (todos opcionales): t (ms o ISO), lat/lon (grados; también enteros ×1e7), alt (m relativos al despegue), vel (m/s), rumbo (°), bat (%), volt (V), sats, pitch, roll, modo. Se aceptan alias habituales: latitude, longitude, speed, heading, battery, groundspeed. El estado del Tello («bat:87;h:30;yaw:10…») también se entiende.' })])]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Instrumentos' }), ui.vLect, ui.vPos, h('div', { cls: 'dr-mapa-caja' }, [cv]), ui.vGraf, ui.vLey, h('div', { cls: 'tr-acciones' }, [ui.vDesc])])]));
    setInterval(() => { if (L.cx && L.ult && Date.now() - L.ult > 4000 && !ui.vEst.dataset.s) { /* sin datos */ } }, 2000); pintarVivo();
  }
  /* ---- logs ---- */
  const LOG = { d: null };
  function logAVisor(r) {
    const mu = r.muestras, orig = A.est.proy.mision.origen, ru = Tel.aRuta(mu), cerca = ru.origen && Geo.haversine(orig.lat, orig.lon, ru.origen.lat, ru.origen.lon) < 20000, rr = Tel.aRuta(mu, cerca ? orig : null), m = A.est.proy.mision;
    const plan = ui.logPlan.checked && cerca && m.wps.length ? [{ x: 0, y: 0 }].concat(m.wps) : null, ser = SER.map(([k, n, c]) => ({ n, c, pts: mu.filter(s => s[k] != null).map(s => [s.t, s[k]]) })).filter(s => s.pts.length);
    ui.logV.cargar({ duracion: Math.max(1, r.info.duracion), origen: rr.origen, ruta: rr.ruta, plan, series: ser, estado: t => { const s = Tel.enT(mu, t) || {}; let p = null; for (let i = rr.ruta.length - 1; i >= 0; i--) if (rr.ruta[i].t <= t) { p = rr.ruta[i]; break; } p = p || rr.ruta[0] || {}; return { x: p.x, y: p.y, alt: s.alt, vel: s.vel, rumbo: s.rumbo, bat: s.bat }; } });
  }
  function cargarLog(txt, nombre) {
    ui.logAv.textContent = '';
    try {
      const r = Tel.parseLog(txt, nombre); LOG.d = r; ui.logCont.hidden = false; const i = r.info;
      ui.logRes.textContent = ''; [['Formato', r.formato], ['Muestras', i.n], ['Duración', A.min(i.duracion)], ['Distancia GPS', Math.round(i.distancia) + ' m'], ['Altura máx.', A.f1(i.altMax) + ' m'], ['Vel. máx.', A.f1(i.velMax) + ' m/s'], ['Batería', i.batIni != null ? Math.round(i.batIni) + ' → ' + Math.round(i.batFin) + ' %' : '—']].forEach(([k, v]) => ui.logRes.appendChild(h('div', { cls: 'dr-tile' }, [h('div', { cls: 'dr-t-v', txt: String(v) }), h('div', { cls: 'dr-t-e', txt: k })])));
      r.avisos.forEach(a => ui.logAv.appendChild(h('div', { cls: 'tr-nota tr-av', txt: a }))); if (!i.conPos) ui.logAv.appendChild(h('div', { cls: 'tr-nota tr-av', txt: 'El log no tiene posición GPS: solo se muestran las gráficas.' }));
      logAVisor(r); A.aviso('Log cargado: ' + i.n + ' muestras.'); A.logro('log_cargado');
    } catch (e) { LOG.d = null; ui.logCont.hidden = true; ui.logAv.appendChild(h('div', { cls: 'tr-nota tr-mal', role: 'alert', txt: e.message })); }
  }
  function logEjemplo() {
    const m = A.est.proy.mision, tl = Mi.lineaTiempo(m); if (!tl.segs.length) return A.aviso('Crea una ruta en Misión para generar un log de ejemplo.', 'error');
    const L2 = ['time(millisecond),latitude,longitude,altitude(feet),speed(mph),battery_percent,heading']; for (let t = 0; t <= tl.duracion; t += 1) { const p = Mi.posicion(tl, t), q = Geo.aGeo(m.origen, p.x + Math.sin(t) * 0.6, p.y + Math.cos(t * 1.3) * 0.6); L2.push([Math.round(t * 1000), q.lat.toFixed(7), q.lon.toFixed(7), (p.alt / 0.3048).toFixed(1), (p.vel / 0.44704).toFixed(1), Math.round(p.bat), Math.round(p.rumbo)].join(',')); }
    cargarLog(L2.join('\n'), 'ejemplo_desde_plan.csv');
  }
  function log(c) {
    ui.logAv = h('div', { 'aria-live': 'polite' }); ui.logRes = h('div', { cls: 'dr-tiles' }); ui.logCont = h('div', { hidden: true });
    ui.logPlan = h('input', { type: 'checkbox', id: 'dr-l-plan' }); ui.logPlan.checked = true; ui.logPlan.addEventListener('change', () => LOG.d && logAVisor(LOG.d));
    const fi = h('input', { type: 'file', id: 'dr-l-f', accept: '.csv,.json,.ndjson,.txt,.log,text/csv,application/json', cls: 'tr-solo-lector' });
    fi.addEventListener('change', () => { const f = fi.files[0]; if (!f) return; if (f.size > 40e6) return A.aviso('Archivo demasiado grande (máx. 40 MB).', 'error'); const fr = new FileReader(); fr.onload = () => cargarLog(fr.result, f.name); fr.onerror = () => A.aviso('No pude leer el archivo.', 'error'); fr.readAsText(f); fi.value = ''; });
    const ta = h('textarea', { id: 'dr-l-txt', rows: '3', placeholder: 'O pega aquí el CSV / JSON del log', spellcheck: 'false' });
    ui.logV = Visor(ui.logCont, 'dr-l');
    ui.logCont.insertBefore(h('div', {}, [ui.logRes, h('label', { cls: 'tr-chk', for: 'dr-l-plan' }, [ui.logPlan, 'Superponer el plan de la misión (si está cerca)'])]), ui.logCont.firstChild);
    c.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Reproducir un log de vuelo' }), h('p', { cls: 'tr-ayuda', txt: 'Admite CSV (p. ej. exportaciones tipo Airdata/DJI con columnas time(millisecond), latitude, longitude, height_above_takeoff(feet), speed(mph), battery_percent), JSON y NDJSON. Las unidades entre paréntesis se convierten a metros y m/s. Todo se procesa en tu dispositivo.' }), h('div', { cls: 'tr-acciones' }, [h('label', { cls: 'tr-btn tr-pri', for: 'dr-l-f', role: 'button', tabindex: '0', txt: 'Abrir archivo de log', on: { keydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } } } }), fi, A.boton('Generar log de ejemplo desde el plan', logEjemplo, 'tr-chico')]), ta, h('div', { cls: 'tr-acciones' }, [A.boton('Analizar texto pegado', () => cargarLog(ta.value, 'pegado'), 'tr-chico')]), ui.logAv, ui.logCont]));
  }
  A.iniciarTelemetria = function () {
    const raiz = document.getElementById('v-telemetria'); ui.simAv = h('div', { 'aria-live': 'polite' }); ui.simCont = h('div');
    A.sub(raiz, [['sim', 'Simulador', c => { c.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Simulador de vuelo del plan' }), h('p', { cls: 'tr-ayuda', txt: 'Anima el plan con tu velocidad, viento y batería para validarlo antes de volar. Es un modelo simplificado: no sustituye un vuelo de prueba.' }), ui.simAv, ui.simCont])); ui.simV = Visor(ui.simCont, 'dr-s'); }], ['vivo', 'En vivo', vivo], ['log', 'Logs', log]], 'tel');
    A.on('sub:tel', v => { if (v === 'sim') pintarSim(); if (v === 'vivo') { ui.vMapa.dibujar(); pintarVivo(); } if (v === 'log' && ui.logV) ui.logV.enfocar(); });
    A.on('proyecto', () => { LOG.d = null; ui.logCont.hidden = true; });
    A.vistas.telemetria = { mostrar: () => { pintarSim(); } };
  };
})(window);
